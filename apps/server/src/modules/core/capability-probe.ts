// THE ROW'S OWN TEST — one press really does the job once and reports what
// happened (Oskar: a switch you cannot try is a switch you do not trust).
//
// 🔴 THE THREE RULES THIS FILE EXISTS TO KEEP:
//
//  1. THE ANSWER IS KNOWN IN ADVANCE. Every probe carries something we can
//     check — a red square, a code printed inside a one-page PDF, today's date.
//     An open question proves nothing: a model answers it plausibly whether or
//     not the capability worked, and a tick earned that way is a lie.
//  2. THREE OUTCOMES, NEVER MERGED. It worked / it failed, in the failing
//     side's own words / it is not built. "Not built" is not a failure and must
//     never be painted as one, and a green tick that means "probably" is worse
//     than no button.
//  3. NAME WHO ANSWERED. "Vision failed" sends the Owner through four connected
//     models; "Gemini (gemini-flash-latest) refused the picture" is something
//     they can act on.
//
// What is deliberately NOT here, and why (each one would have to pretend):
//  • HEARING — it needs a real recording of a real voice, and this repository
//    has no audio fixture and no way to make one. Synthesising a clip with
//    Speaking and transcribing that would couple two engines, so a failure
//    could not be pinned on either. The row says how to check it by hand.
//  • SPEAKING — nothing on this machine can listen. The strongest true claim a
//    server-side probe could make is "some bytes came back", which is not the
//    question ("does it sound right?"). The Owner's own ear is the test, and
//    the row's setup already has the buttons for it — a second control that
//    tests the same thing differently is the mistake this app has made before.
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { crc32, deflateSync } from "node:zlib";

import type { CapabilityTestResult } from "@vaenyx/contracts";

import type { DatabaseHandle } from "../../db/database.js";
import type { ModelProvider } from "../models/provider.js";
import { providerDisplayName } from "../models/provider-settings.js";
import {
  type Capability,
  type CapabilityLanguage,
  backendCannotMessage,
} from "./capabilities.js";
import {
  DOCUMENT_NATIVE_PROVIDER_IDS,
  extractDocumentText,
} from "./documents.js";
import {
  FetchRefusedError,
  MAX_FETCH_BYTES,
  grantFetchAccess,
} from "./fetching.js";
import { generateImage, getImageEngineStatus } from "./image-gen.js";
import { askVisionModel, getVisionStatus } from "./vision.js";

// Only these two backends implement `allowWeb` for real: Codex spawns its
// session with web_search="live" and Claude's SDK path is handed WebSearch and
// WebFetch. Every other backend returns `webSearchUsed: false` unconditionally
// and registers no search tool — so for those the honest answer is "not built",
// never "failed". Keep this beside the probe that uses it: it is a fact about
// two provider files, and a copy of it somewhere general would drift from them.
const WEB_CAPABLE_PROVIDER_IDS = ["codex", "claude-sub"];

// Long enough for a slow search round (Claude allows ten turns) and short
// enough that the button cannot sit on "Testing…" forever, which the Owner
// reads as a hang and which is its own kind of lie.
const PROBE_DEADLINE_MS = 90_000;

// How many files the Fetching probe may try before giving up. Small on purpose:
// every refusal is audited, and a Test that walked a folder of holiday photos
// would bury the Guard page's other events under its own.
const MAX_PROBE_OPENS = 10;

class ProbeTimeout extends Error {}

function withDeadline<T>(work: Promise<T>, lang: CapabilityLanguage): Promise<T> {
  return Promise.race([
    work,
    new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(
          new ProbeTimeout(
            lang === "zh"
              ? `${PROBE_DEADLINE_MS / 1000} 秒内没有回应。`
              : `nothing came back within ${PROBE_DEADLINE_MS / 1000} seconds.`,
          ),
        );
      }, PROBE_DEADLINE_MS);
      // The reply is what matters, not this timer: an unref'd timer never keeps
      // the process (or a test run) alive on its own.
      timer.unref?.();
    }),
  ]);
}

// The handful of failures that arrive as a bare internal code rather than as a
// sentence from the other side. CODEX_NOT_INSTALLED is not something a
// household can act on; "the Codex CLI is not installed on this machine" is.
// Anything not in here keeps its own words, which is the point of the rest of
// the function below.
const CODE_WORDS: Record<string, Record<CapabilityLanguage, string>> = {
  CODEX_CHATGPT_REQUIRED: {
    en: "Codex is signed in with an API key, and this needs the ChatGPT subscription sign-in.",
    zh: "Codex 现在用的是 API key 登录,而这里需要的是 ChatGPT 订阅登录。",
  },
  CODEX_NOT_INSTALLED: {
    en: "the Codex CLI is not installed on this machine.",
    zh: "这台机器上没有装 Codex CLI。",
  },
  CODEX_NOT_LOGGED_IN: {
    en: "Codex is not signed in.",
    zh: "Codex 还没有登录。",
  },
  IMAGE_EMPTY_RESPONSE: {
    en: "the engine answered, but there was no picture in the answer.",
    zh: "引擎回了话,但里面没有图。",
  },
  IMAGE_FETCH_FAILED: {
    en: "the engine gave back a link to the picture, and the picture could not be downloaded.",
    zh: "引擎给的是一条图片链接,那张图下载不下来。",
  },
  IMAGE_NOT_CONNECTED: {
    en: "the picture engine is not fully set up — check its token on this row.",
    zh: "画图引擎还没有设置完 —— 到这一行里检查一下它的令牌。",
  },
  VISION_NOT_CONNECTED: {
    en: "no model is connected for looking at pictures.",
    zh: "还没有连上能看图的模型。",
  },
};

/** The failing side's own words, whatever shape they arrived in. The engine
 *  modules pack a status and the provider's message into one CODE:status:detail
 *  string, and the useful half is the part after the code. */
function failureWords(error: unknown, lang: CapabilityLanguage): string {
  const raw = error instanceof Error ? error.message : String(error);
  const known = CODE_WORDS[raw];
  if (known) return known[lang];
  const parts = raw.split(":");
  if (parts.length > 2 && /^[A-Z_]+$/.test(parts[0] ?? "")) {
    return `${parts[1]} — ${parts.slice(2).join(":").trim()}`.slice(0, 300);
  }
  return raw.slice(0, 300);
}

function quoted(text: string, limit = 140): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > limit ? `${flat.slice(0, limit)}…` : flat;
}

// ── The fixtures, built in code ──────────────────────────────────────────────
//
// Nothing on disk: a binary fixture would have to be tracked, shipped and kept
// in step with the code that reads it, and `tsc` copies no assets into dist —
// so a file under src/ would simply not be there in a release.

function pngChunk(type: string, body: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(type, 4, "ascii");
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
  return Buffer.concat([head, body, tail]);
}

/** A red square on a white field — the picture whose answer we already know.
 *  Colour rather than printed text on purpose: reading small letters off an
 *  image is the one thing vision models genuinely differ at, so a text nonce
 *  would fail working engines. Every engine that can see at all can name a
 *  colour. */
export function redSquarePng(size = 256): Buffer {
  const stride = size * 3 + 1;
  const raw = Buffer.alloc(size * stride, 0xff);
  const from = Math.round(size * 0.2);
  const to = Math.round(size * 0.8);
  for (let y = 0; y < size; y += 1) {
    raw[y * stride] = 0; // per-scanline filter: none
    if (y < from || y >= to) continue;
    for (let x = from; x < to; x += 1) {
      const pixel = y * stride + 1 + x * 3;
      raw[pixel] = 0xff;
      raw[pixel + 1] = 0x00;
      raw[pixel + 2] = 0x00;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bits per channel
  header[9] = 2; // truecolour, no alpha
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/** One page, one line, one code. The code is fresh every time so that neither a
 *  cache nor a lucky guess can pass this. */
export function probePdf(code: string): Buffer {
  const stream = `BT /F1 24 Tf 40 120 Td (${code}) Tj ET`;
  return Buffer.from(
    [
      "%PDF-1.4",
      "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
      "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
      "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]/Contents 4 0 R/Resources<</Font<</F1 999 0 R>>>>>>endobj",
      `4 0 obj<</Length ${stream.length}>>stream\n${stream}\nendstream endobj`,
      "999 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj",
      "trailer<</Root 1 0 R>>",
    ].join("\n"),
    "latin1",
  );
}

/** Did the engine really name the colour it was shown? Whole words only, and
 *  that is the whole point: "blurred", "covered" and "hundred" all contain
 *  "red", so a loose match would hand a green tick to an engine that answered
 *  it could not see the picture at all. Any real word for red counts — the
 *  question is whether it SAW the square, and "crimson" is a seeing answer. */
export function namesRed(text: string): boolean {
  return /\b(red|crimson|scarlet)\b/i.test(text) || text.includes("红");
}

/** A code a model cannot produce by accident, and that reads back cleanly out
 *  of a PDF: capitals and digits only, no characters PDF would escape. */
function probeCode(): string {
  return `VAENYX-${randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

/** Is this really a picture, and how big? Never trust a byte count alone — an
 *  error page is also "some bytes". */
export function pictureSize(
  bytes: Buffer,
): { width: number; height: number } | null {
  if (
    bytes.length > 24 &&
    bytes.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ) &&
    bytes.subarray(12, 16).toString("ascii") === "IHDR"
  ) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    // Walk the JPEG segments to the frame header — the only place the size is
    // written, and it is not at a fixed offset.
    let at = 2;
    while (at + 9 <= bytes.length) {
      if (bytes[at] !== 0xff) break;
      const marker = bytes[at + 1] ?? 0;
      const length = bytes.readUInt16BE(at + 2);
      const isFrame =
        marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
      if (isFrame) {
        return {
          width: bytes.readUInt16BE(at + 7),
          height: bytes.readUInt16BE(at + 5),
        };
      }
      at += 2 + length;
    }
  }
  return null;
}

// ── The probes ───────────────────────────────────────────────────────────────

export interface CapabilityProbeContext {
  database: DatabaseHandle;
  /** Vaenyx's own data, passed for the same reason the chat turn passes it:
   *  it is never readable, however the folder list was saved. */
  dataDirectory: string;
  secretsDirectory: string;
  lang: CapabilityLanguage;
  owner: { id: string; name: string };
  /** The main model, resolved by the caller rather than looked up here, so a
   *  probe can be driven by a test without a registry, a key or a network. */
  provider: ModelProvider | null;
}

function noMainModel(lang: CapabilityLanguage): CapabilityTestResult {
  return {
    status: "failed",
    engine: "",
    detail:
      lang === "zh"
        ? "还没有主模型 —— 先在下面连一个。"
        : "There is no main model yet — connect one below first.",
  };
}

type Probe = (context: CapabilityProbeContext) => Promise<CapabilityTestResult>;

async function probeVision(
  context: CapabilityProbeContext,
): Promise<CapabilityTestResult> {
  const { lang } = context;
  const status = getVisionStatus(context.secretsDirectory);
  if (!status.connected) {
    return {
      status: "failed",
      engine: "",
      detail:
        lang === "zh"
          ? "这一行还没有连上模型 —— 先在这里加一个 key。"
          : "No model is connected for this row yet — add a key here first.",
    };
  }
  const prompt =
    "This picture is a plain white background with one solid coloured square in the middle. Answer with ONE English word: the colour of that square.";
  let answer;
  try {
    answer = await withDeadline(
      askVisionModel(
        context.secretsDirectory,
        prompt,
        redSquarePng(),
        "image/png",
        { failureCode: "VISION_DESCRIBE_FAILED" },
      ),
      lang,
    );
  } catch (error) {
    return {
      status: "failed",
      engine: providerDisplayName(status.provider ?? ""),
      detail:
        lang === "zh"
          ? `拒绝了测试图:${failureWords(error, lang)}`
          : `refused the test picture: ${failureWords(error, lang)}`,
    };
  }
  const engine = answer.model
    ? `${providerDisplayName(answer.engine)} (${answer.model})`
    : providerDisplayName(answer.engine);
  if (!namesRed(answer.text)) {
    return {
      status: "failed",
      engine,
      detail:
        lang === "zh"
          ? `回答「${quoted(answer.text)}」,但测试图里是一个红色方块。`
          : `answered "${quoted(answer.text)}", but the test picture is a red square.`,
    };
  }
  return {
    status: "ok",
    engine,
    detail:
      lang === "zh"
        ? `看了测试图,认出了里面的红色方块(回答「${quoted(answer.text, 40)}」)。`
        : `looked at the test picture and named the red square in it (it answered "${quoted(answer.text, 40)}").`,
  };
}

async function probeDrawing(
  context: CapabilityProbeContext,
): Promise<CapabilityTestResult> {
  const { lang } = context;
  const status = getImageEngineStatus(context.secretsDirectory);
  if (!status.connected) {
    return {
      status: "failed",
      engine: "",
      detail:
        lang === "zh"
          ? "这一行还没有连上画图的引擎 —— 先在这里加一个。"
          : "No picture engine is connected for this row yet — add one here first.",
    };
  }
  const engine = providerDisplayName(status.provider ?? "");
  // A scratch directory, not the Owner's own images folder: a Test pressed
  // twenty times must not leave twenty test pictures inside their backups.
  const scratch = mkdtempSync(resolve(tmpdir(), "vaenyx-drawing-test-"));
  try {
    const id = await withDeadline(
      generateImage(
        context.database,
        context.secretsDirectory,
        scratch,
        "A plain red square on a white background. Flat colour, no text, no shading.",
        // No mode: /v1/capability-test refuses any session that is in one, so
        // a Test only ever runs as the Owner in User Mode.
        null,
      ),
      lang,
    );
    const path = resolve(scratch, "images", id);
    const bytes = readFileSync(path);
    const size = pictureSize(bytes);
    if (!size) {
      return {
        status: "failed",
        engine,
        detail:
          lang === "zh"
            ? `有回应,但回来的不是一张图(${bytes.length} 字节)。`
            : `answered, but what came back was not a picture (${bytes.length} bytes).`,
      };
    }
    return {
      status: "ok",
      engine,
      detail:
        lang === "zh"
          ? `真的画出了一张图:${size.width}×${size.height},${Math.round(bytes.length / 1000)} KB。画的内容没有检查 —— 这台机器上没有东西能替你看图。`
          : `really made a picture: ${size.width}×${size.height}, ${Math.round(bytes.length / 1000)} KB. What it drew is not checked — nothing on this machine can look at a picture for you.`,
    };
  } catch (error) {
    return {
      status: "failed",
      engine,
      detail:
        lang === "zh"
          ? `画不出来:${failureWords(error, lang)}`
          : `could not make the picture: ${failureWords(error, lang)}`,
    };
  } finally {
    rmSync(scratch, { force: true, recursive: true });
  }
}

async function probeReading(
  context: CapabilityProbeContext,
): Promise<CapabilityTestResult> {
  const { lang, provider } = context;
  if (!provider) return noMainModel(lang);
  const code = probeCode();
  const pdf = probePdf(code);

  // The fork the real chat turn takes, and the two halves are different enough
  // that one pass for both would be a false claim about what this machine does:
  // a native backend is handed the FILE (every page as picture and text), while
  // everything else gets words pulled out of the PDF here.
  if (DOCUMENT_NATIVE_PROVIDER_IDS.includes(provider.id)) {
    try {
      const result = await withDeadline(
        provider.sendChat(
          [
            {
              role: "owner",
              content:
                "This document has one line on it: a code. Reply with that code and nothing else.",
            },
          ],
          undefined,
          {
            allowWeb: false,
            documentBase64: pdf.toString("base64"),
            documentName: "vaenyx-test.pdf",
            signal: AbortSignal.timeout(PROBE_DEADLINE_MS),
          },
        ),
        lang,
      );
      // Case-folded: a model that answers in lower case has still read the
      // document, and failing it for that would be a red cross for nothing.
      if (!result.answer.toUpperCase().includes(code)) {
        return {
          status: "failed",
          engine: provider.name,
          detail:
            lang === "zh"
              ? `回答「${quoted(result.answer)}」,但测试文档上写的是 ${code}。`
              : `answered "${quoted(result.answer)}", but the test document says ${code}.`,
        };
      }
      return {
        status: "ok",
        engine: provider.name,
        detail:
          lang === "zh"
            ? "读了那份一页的测试文档,把上面的编号原样念了回来 —— 整页是当作图片和文字一起读的。"
            : "read the one-page test document and gave back the code printed on it — the page went across as picture and text, the way a person reads it.",
      };
    } catch (error) {
      return {
        status: "failed",
        engine: provider.name,
        detail:
          lang === "zh"
            ? `读不了测试文档:${failureWords(error, lang)}`
            : `could not read the test document: ${failureWords(error, lang)}`,
      };
    }
  }

  // The other half of the fork: the words are pulled out here and handed on as
  // text, so what is being tested is this machine, not the model — and the
  // result says so rather than letting the Owner believe their model opened a
  // PDF it never saw.
  const engine = lang === "zh" ? "本机 (pdf.js)" : "This machine (pdf.js)";
  try {
    const text = await withDeadline(extractDocumentText(pdf), lang);
    if (!text.includes(code)) {
      return {
        status: "failed",
        engine,
        detail:
          lang === "zh"
            ? "打得开测试文档,却没能把上面的字读出来 —— 这台机器上的 PDF 文字提取坏了。"
            : "opened the test document but could not read the words off it — reading PDFs on this machine is broken.",
      };
    }
    // A green tick that did not say WHO read it would be the quiet substitution
    // this sentence exists to prevent: the test passed, and the model the Owner
    // is talking to never opened the file.
    return {
      status: "ok",
      engine,
      detail: `${
        lang === "zh"
          ? "读出了那份一页测试文档上的编号。"
          : "read the code off the one-page test document. "
      }${backendCannotMessage(
        provider.name,
        "reading",
        lang === "zh"
          ? { by: "这台机器 (pdf.js)", cost: "图、表格和排版到不了模型那里" }
          : {
              by: "this machine (pdf.js)",
              cost: "drawings, tables and layout do not reach the model",
            },
        lang,
      )}`,
    };
  } catch (error) {
    return {
      status: "failed",
      engine,
      detail:
        lang === "zh"
          ? `读不了测试文档:${failureWords(error, lang)}`
          : `could not read the test document: ${failureWords(error, lang)}`,
    };
  }
}

async function probeWeb(
  context: CapabilityProbeContext,
): Promise<CapabilityTestResult> {
  const { lang, provider } = context;
  if (!provider) return noMainModel(lang);
  if (!WEB_CAPABLE_PROVIDER_IDS.includes(provider.id)) {
    return {
      status: "not-implemented",
      engine: provider.name,
      // The standing sentence, then who CAN. Nothing stands in for a search, so
      // the honest half is that the answer came out of the model's memory —
      // which is the thing an Owner reading a confident reply cannot see.
      detail: `${backendCannotMessage(provider.name, "web", null, lang)} ${
        lang === "zh"
          ? "今天能搜的是 Codex CLI (ChatGPT) 和 Claude(订阅)这两个。"
          : "Codex CLI (ChatGPT) and Claude (Subscription) are the two that can search today."
      }`,
    };
  }
  // Today's date, which this machine already knows: an answer we can check
  // without asking anything of the internet ourselves. On its own it would
  // prove little — a model is often told the date — which is why the tool
  // transcript below has to agree.
  const today = new Date();
  const expected = today.toISOString().slice(0, 10);
  const neighbours = [-1, 0, 1].map((offset) =>
    new Date(today.getTime() + offset * 86_400_000).toISOString().slice(0, 10),
  );
  let result;
  try {
    result = await withDeadline(
      provider.sendChat(
        [
          {
            role: "owner",
            content:
              "Search the web right now and reply with today's date in UTC, written as YYYY-MM-DD, and nothing else.",
          },
        ],
        undefined,
        { allowWeb: true, signal: AbortSignal.timeout(PROBE_DEADLINE_MS) },
      ),
      lang,
    );
  } catch (error) {
    return {
      status: "failed",
      engine: provider.name,
      detail:
        lang === "zh"
          ? `搜不了:${failureWords(error, lang)}`
          : `could not search: ${failureWords(error, lang)}`,
    };
  }
  // 🔴 The flag comes from the backend's own transcript — a real search item in
  // Codex, a real tool_use block in Claude — never from the model claiming it
  // looked. A model saying "I searched" is not evidence of anything.
  if (!result.webSearchUsed) {
    return {
      status: "failed",
      engine: provider.name,
      detail:
        lang === "zh"
          ? `没有去搜就回答了「${quoted(result.answer)}」—— 网到不了它那里。`
          : `answered "${quoted(result.answer)}" without ever searching — the web is not reaching it.`,
    };
  }
  if (!neighbours.some((date) => result.answer.includes(date))) {
    return {
      status: "failed",
      engine: provider.name,
      detail:
        lang === "zh"
          ? `真的去搜了,但回答是「${quoted(result.answer)}」,而今天是 ${expected}。`
          : `really did search, but answered "${quoted(result.answer)}" when today is ${expected}.`,
    };
  }
  return {
    status: "ok",
    engine: provider.name,
    detail:
      lang === "zh"
        ? `真的去网上搜了一次,拿回来的日期是对的(${expected})。`
        : `really ran a web search and came back with the right date (${expected}).`,
  };
}

// The one probe that asks NOTHING of a model, and it is not an omission. Vaenyx
// opens the file itself, against the folders the Owner named, and hands over the
// words (ask-vaenyx.ts) — so what there is to test is the whitelist, the size
// cap and the real open, none of which a backend takes part in. This used to
// refuse outright unless the main model was Claude, which was true of an older
// design and stopped being true the day the open moved to this side; the row's
// own drawer, its tooltip and both manuals all said so while the button did not.
// A backend check here would only be a green tick in front of somebody else's
// work, and a missing-main-model check would fail a test that would have passed.
async function probeFetching(
  context: CapabilityProbeContext,
): Promise<CapabilityTestResult> {
  const { lang } = context;
  const access = grantFetchAccess(context.database, {
    actorId: context.owner.id,
    actorName: context.owner.name,
    // The same grant a chat turn builds, down to the protected paths: a probe
    // that skipped them would be the one way into Vaenyx's own data. The mode
    // layer is absent because the route refuses inside a mode altogether.
    protectedPaths: [context.dataDirectory, context.secretsDirectory],
  });
  if (!access) {
    return {
      status: "failed",
      engine: "",
      detail:
        lang === "zh"
          ? "还没有点名任何文件夹,所以没有东西可以打开 —— 在上面加一个。"
          : "No folder has been named yet, so there is nothing to open — add one above.",
    };
  }
  const entries = access.list();
  // The real open, through the real gate — containment on the realpath, the
  // size cap, the is-it-text check and the audit row, exactly as a model's own
  // request would go. Only the NAME comes back: this is the Owner's own file
  // and its contents are none of a test result's business.
  const engine = lang === "zh" ? "本机" : "This machine";
  let attempts = 0;
  let lastRefusal = "";
  for (const entry of entries) {
    if (entry.kind !== "file" || entry.bytes > MAX_FETCH_BYTES) continue;
    // Every refused open is written down, which is right — but a Test that
    // walked a whole Downloads folder would push the Guard page's other 200
    // events off it in one press. A handful of tries answers the question.
    if (attempts >= MAX_PROBE_OPENS) break;
    attempts += 1;
    try {
      const file = access.open(entry.name);
      return {
        status: "ok",
        engine,
        detail:
          lang === "zh"
            ? `从你点名的文件夹里真的打开了 ${entry.name}(${Math.max(1, Math.round(file.bytes / 1000))} KB)。内容没有离开这台机器。`
            : `really opened ${entry.name} (${Math.max(1, Math.round(file.bytes / 1000))} KB) from the folders you named. Nothing left this machine.`,
      };
    } catch (error) {
      // A picture or a spreadsheet in the folder is not a failure of the
      // capability — try the next thing before giving up.
      lastRefusal =
        error instanceof FetchRefusedError ? error.message : failureWords(error, lang);
    }
  }
  // Three different disappointments with three different fixes, so three
  // sentences. "It did not work" would leave the Owner guessing between an
  // empty folder, a folder of photos, and a gate that is refusing everything.
  if (entries.length === 0) {
    return {
      status: "failed",
      engine,
      detail:
        lang === "zh"
          ? "你点名的文件夹是空的。"
          : "The folders you named are empty.",
    };
  }
  if (attempts === 0) {
    return {
      status: "failed",
      engine,
      detail:
        lang === "zh"
          ? `在你点名的文件夹里看到 ${entries.length} 样东西,但没有一个是打得开的文件(上限 ${Math.round(MAX_FETCH_BYTES / 1000)} KB)。`
          : `found ${entries.length} item(s) in the folders you named, but not one file it could even try (the limit is ${Math.round(MAX_FETCH_BYTES / 1000)} KB).`,
    };
  }
  return {
    status: "failed",
    engine,
    detail:
      lang === "zh"
        ? `在你点名的文件夹里看到 ${entries.length} 样东西,试了前 ${attempts} 个文件,一个都打不开。${lastRefusal}`
        : `found ${entries.length} item(s) in the folders you named and could not open any of the first ${attempts} it tried. ${lastRefusal}`,
  };
}

// Hearing and Speaking answer honestly rather than not answering: the route
// stays total over the seven capabilities, so a client that grows a button
// before this file grows a probe gets "not built", never a red cross.
const PROBES: Record<Capability, Probe | null> = {
  hearing: null,
  speaking: null,
  vision: probeVision,
  drawing: probeDrawing,
  reading: probeReading,
  fetching: probeFetching,
  web: probeWeb,
};

const NO_PROBE_REASON: Record<
  "hearing" | "speaking",
  Record<CapabilityLanguage, string>
> = {
  hearing: {
    en: "Vaenyx cannot test this one by itself — it needs a real recording of a real voice. Press the microphone in a chat and say a few words: what you said should come back as text.",
    zh: "这一项 Vaenyx 自己测不了 —— 它需要一段真人说话的录音。到聊天里按一下麦克风说几句:你说的话应该变成文字出现。",
  },
  speaking: {
    en: "This one is tested by ear, not by machine — nothing here can listen. The Test buttons on this row play the voice that is live right now.",
    zh: "这一项要用耳朵测,机器测不了 —— 这里没有东西能听。这一行上的试听按钮放的就是现在正在用的声音。",
  },
};

export async function runCapabilityProbe(
  capability: Capability,
  context: CapabilityProbeContext,
): Promise<CapabilityTestResult> {
  const probe = PROBES[capability];
  if (!probe) {
    return {
      status: "not-implemented",
      engine: "",
      detail:
        NO_PROBE_REASON[capability as "hearing" | "speaking"][context.lang],
    };
  }
  try {
    return await probe(context);
  } catch (error) {
    // A probe that throws is itself a failure of the test, not of the
    // capability — say so in those words rather than blaming the engine.
    return {
      status: "failed",
      engine: "",
      detail:
        context.lang === "zh"
          ? `测试本身出错了:${failureWords(error, context.lang)}`
          : `the test itself went wrong: ${failureWords(error, context.lang)}`,
    };
  }
}
