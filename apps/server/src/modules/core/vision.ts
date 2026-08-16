// Vision (Owner request 2026-07-24): a photo becomes useful TEXT — the fridge
// shot turns into an ingredient list that flows into chat and Routines like
// any typed message. Mirrors the voice pipeline: attachment in, text out.
// The image goes browser → this local server → a vision-capable connected
// provider (auto-picked); the key never reaches the browser.
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { claudeMachineLogin } from "../models/claude-login.js";
import { claudeSubscriptionVision } from "../models/claude-subscription-provider.js";
import { readProviderConnections } from "../models/connections.js";
import { writeConnections } from "../models/provider-settings.js";

// Stored conversation photos (Phase B): originals kept under
// <dataDirectory>/images so a vision-capable main model can keep seeing them
// on follow-up turns. Ids embed the extension and are strictly validated.
const IMAGE_ID_PATTERN = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

function imageExtension(mimeType: string): "jpg" | "png" | "webp" {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
}

export function imageMimeType(imageId: string): string {
  if (imageId.endsWith(".png")) return "image/png";
  if (imageId.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export function saveImage(
  dataDirectory: string,
  image: Buffer,
  mimeType: string,
): string {
  const id = `${randomUUID()}.${imageExtension(mimeType)}`;
  const directory = resolve(dataDirectory, "images");
  mkdirSync(directory, { recursive: true });
  writeFileSync(resolve(directory, id), image);
  return id;
}

export function readImage(
  dataDirectory: string,
  imageId: string,
): { image: Buffer; mimeType: string } | null {
  if (!IMAGE_ID_PATTERN.test(imageId)) return null;
  try {
    return {
      image: readFileSync(resolve(dataDirectory, "images", imageId)),
      mimeType: imageMimeType(imageId),
    };
  } catch {
    return null;
  }
}

export function imageDataUrl(
  dataDirectory: string,
  imageId: string,
): string | null {
  const found = readImage(dataDirectory, imageId);
  if (!found) return null;
  return `data:${found.mimeType};base64,${found.image.toString("base64")}`;
}

// The stored photo's path on disk, for backends that take a file path instead
// of a data URL (Codex app-server's localImage input item). Same strict id
// validation as readImage — an id is never joined into a path unchecked.
export function imageFilePath(
  dataDirectory: string,
  imageId: string,
): string | null {
  if (!IMAGE_ID_PATTERN.test(imageId)) return null;
  const path = resolve(dataDirectory, "images", imageId);
  return existsSync(path) ? path : null;
}

// Backends whose chat endpoint accepts image parts directly — the Phase B
// "first-hand" path. Everything else falls back to the describe layer.
// "codex" reads the photo via a localImage file path (probe-verified
// 2026-07-28); "anthropic" via native base64 image blocks; the OpenAI-style
// providers take a data URL.
export const VISION_DIRECT_PROVIDER_IDS = [
  "gemini",
  "zhipu",
  "openai",
  "codex",
  "anthropic",
  "claude-sub",
];

// Order of preference among the Owner's existing Models connections — all
// free-tier friendly, no separate vision setup needed. "claude-sub" has no
// baseUrl/model: it reads photos through the locked-down Agent SDK path
// (claudeSubscriptionVision) instead of an OpenAI-style endpoint.
export const VISION_CANDIDATES = [
  {
    id: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    // An alias, not a pinned version, on purpose. Google retires a specific
    // model for NEW keys while existing users keep working, so a pinned name
    // fails only for people setting Vaenyx up for the first time — the users
    // least able to diagnose it. gemini-2.5-flash did exactly that
    // (404 "no longer available to new users", found 2026-07-26).
    model: "gemini-flash-latest",
  },
  {
    id: "zhipu",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-4.6v-flash",
  },
  {
    id: "openai",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o",
  },
  {
    id: "claude-sub",
    baseUrl: "",
    model: "",
  },
] as const;

// The vision slot is a plain pointer at a connected provider (Oskar's
// unified model, dev.162): empty = camera off, auto-filled once when a
// capable model connects (fillEngineDefaults), repointable here. Keys live
// only in the Models connections.
export type VisionEngineChoice =
  | "none"
  | "gemini"
  | "zhipu"
  | "openai"
  | "claude-sub";

function pickCandidate(
  connections: ReturnType<typeof readProviderConnections>,
): (typeof VISION_CANDIDATES)[number] | null {
  const chosen = connections.vision?.provider;
  if (!chosen) return null;
  const pinned = VISION_CANDIDATES.find((entry) => entry.id === chosen);
  if (!pinned) return null;
  // claude-sub authenticates via setup token OR a machine sign-in; the
  // key-based candidates need their stored key.
  if (pinned.id === "claude-sub") {
    const auth = claudeSubAuthProbe();
    return connections["claude-sub"]?.apiKey || auth ? pinned : null;
  }
  if (!connections[pinned.id]?.apiKey) return null;
  return pinned;
}

// Machine-login presence (in-app sign-in credentials in the Vaenyx
// claude-home, or a personal Claude Code login) — same rule as the provider.
function claudeSubAuthProbe(): boolean {
  return claudeMachineLogin();
}

export function getVisionStatus(secretsDirectory: string): {
  connected: boolean;
  provider: string | null;
} {
  const connections = readProviderConnections(secretsDirectory);
  const candidate = pickCandidate(connections);
  return candidate
    ? { connected: true, provider: candidate.id }
    : { connected: false, provider: null };
}

export function setVisionEngine(
  secretsDirectory: string,
  choice: VisionEngineChoice,
): ReturnType<typeof getVisionStatus> {
  const connections = readProviderConnections(secretsDirectory);
  if (choice === "none") {
    if ("vision" in connections) {
      delete connections.vision;
      writeConnections(secretsDirectory, connections);
    }
    return getVisionStatus(secretsDirectory);
  }
  if (
    !connections[choice]?.apiKey &&
    !(choice === "claude-sub" && claudeSubAuthProbe())
  ) {
    throw new Error("VISION_NO_KEY");
  }
  connections.vision = { provider: choice };
  writeConnections(secretsDirectory, connections);
  return getVisionStatus(secretsDirectory);
}

/** What one question to the vision engine came back with, and who answered it.
 *  The model id is carried out because a failure that only says "Gemini"
 *  cannot tell the Owner that the model name itself is what has been retired —
 *  the exact bug the candidate table above documents. */
export interface VisionAnswer {
  engine: string;
  model: string;
  text: string;
}

// One question about one picture — the shared body of describeImage,
// annotateImage and the Capabilities row's own Test. Each caller brings its own
// prompt and its own failure code, because the routes above split those codes
// back apart to word the refusal.
export async function askVisionModel(
  secretsDirectory: string,
  prompt: string,
  image: Buffer,
  mimeType: string,
  options: { failureCode: string; temperature?: number },
): Promise<VisionAnswer> {
  // Vision providers flake (measured 2026-08-16: intermittent 503s on a real
  // instance turned into "it recognises nothing"). One retry after a short
  // breath absorbs the blip; a second failure is a real answer and surfaces.
  try {
    return await askVisionModelOnce(
      secretsDirectory,
      prompt,
      image,
      mimeType,
      options,
    );
  } catch (error) {
    const transient =
      error instanceof Error &&
      (/:5\d\d(?::|$)/.test(error.message) ||
        error.message.includes("fetch failed"));
    if (!transient) throw error;
    await new Promise((resolve) => setTimeout(resolve, 800));
    return askVisionModelOnce(
      secretsDirectory,
      prompt,
      image,
      mimeType,
      options,
    );
  }
}

async function askVisionModelOnce(
  secretsDirectory: string,
  prompt: string,
  image: Buffer,
  mimeType: string,
  options: { failureCode: string; temperature?: number },
): Promise<VisionAnswer> {
  const connections = readProviderConnections(secretsDirectory);
  const candidate = pickCandidate(connections);
  if (!candidate) {
    throw new Error("VISION_NOT_CONNECTED");
  }
  const connection = connections[candidate.id];
  const apiKey = connection?.apiKey ?? "";
  const dataUrl = `data:${mimeType};base64,${image.toString("base64")}`;

  if (candidate.id === "claude-sub") {
    const text = await claudeSubscriptionVision(
      secretsDirectory,
      prompt,
      image.toString("base64"),
      mimeType,
    );
    return { engine: candidate.id, model: candidate.model, text: text.trim() };
  }

  // The Owner's chosen model for this backend drives its capabilities too
  // (owner decision 2026-08-16: 上面 capability 直接调用下面 Models 里选的
  // 型号). On these providers the flagship chat models read pictures, and
  // the pinned candidate model — an alias Google routes wherever it likes —
  // was the thing 503ing. No chosen model = the pinned default; a chosen
  // model that cannot see fails with the provider's own words, said out
  // loud, never silently.
  const model = connection?.model?.trim() || candidate.model;
  const response = await fetch(
    `${connection?.baseUrl ?? candidate.baseUrl}/chat/completions`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        ...(options.temperature === undefined
          ? {}
          : { temperature: options.temperature }),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    },
  );
  if (!response.ok) {
    // Carry the provider's own words. "Photo analysis failed" tells the Owner
    // nothing they can act on, and this is their own instance talking to their
    // own account — an expired key, a model that is not enabled, a quota, are
    // all things only the message itself can distinguish.
    let detail = "";
    try {
      const body = (await response.json()) as {
        error?: { message?: unknown } | string;
      };
      const raw =
        typeof body.error === "string" ? body.error : body.error?.message;
      if (typeof raw === "string") detail = raw.slice(0, 300);
    } catch {
      // Non-JSON body: the status code is all there is.
    }
    throw new Error(
      `${options.failureCode}:${response.status}${detail ? `:${detail}` : ""}`,
    );
  }
  const parsed = (await response.json()) as {
    choices?: { message?: { content?: unknown } }[];
  };
  const text = parsed.choices?.[0]?.message?.content;
  return {
    engine: candidate.id,
    model,
    text: typeof text === "string" ? text.trim() : "",
  };
}

export async function describeImage(
  secretsDirectory: string,
  image: Buffer,
  mimeType: string,
  lang: string,
): Promise<string> {
  // Dot points, never prose (app-wide rule, Oskar 2026-07-28): this text lands
  // in front of the Owner (routine confirm cards, composer surfaces), so it
  // must read as short scannable lines, not a markdown essay.
  const prompt =
    lang === "zh"
      ? "把这张照片的内容写成清单:一行一项,格式如「牛肉 ×1」。食材/冰箱/购物照片就逐项列出能辨认的食物和数量;文档或票据就一行一条列关键信息;其它内容一行一个要点。禁止 markdown、星号、标题、分区、段落——只要干净的行。只输出清单本身,不要客套话。"
      : "Write this photo's contents as a list: one item per line, like 'beef steak x1'. For food/fridge/grocery photos list every identifiable item with a rough quantity; for documents or receipts one key fact per line; otherwise one short point per line. NO markdown, NO asterisks, NO headings, NO sections, NO paragraphs — clean lines only. Output the list itself, no preamble.";

  return (
    await askVisionModel(secretsDirectory, prompt, image, mimeType, {
      failureCode: "VISION_DESCRIBE_FAILED",
    })
  ).text;
}

// One marked item on a photo: a dot at (x, y) — percent of the image, 0-100 —
// with a short name beside it. Produced by annotateImage, drawn by the web.
export interface ImageAnnotationItem {
  name: string;
  x: number;
  y: number;
}

// Mark the distinct objects in a photo ("在照片上把不同的东西mark出来", Oskar
// 2026-07-28): the vision engine returns each item's bounding box; the box
// centre becomes the dot. Probe-verified on a real fridge photo — the same
// model+prompt landed 8/8 dots on real objects.
export async function annotateImage(
  secretsDirectory: string,
  image: Buffer,
  mimeType: string,
  lang: string,
  focus?: string | null,
): Promise<ImageAnnotationItem[]> {
  const prompt = [
    "Detect the most prominent distinct objects in this photo (at most 10).",
    // A Routine's declared focus ("food and drink items"): the tool narrows
    // itself instead of every Routine re-explaining the world.
    ...(focus ? [`ONLY mark ${focus}; skip everything else.`] : []),
    lang === "zh"
      ? 'Return ONLY a JSON array, each entry {"name": string (short Chinese name, 2-6 characters), "box_2d": [ymin, xmin, ymax, xmax], "point_2d": [y, x]}.'
      : 'Return ONLY a JSON array, each entry {"name": string (short English name, 1-3 words), "box_2d": [ymin, xmin, ymax, xmax], "point_2d": [y, x]}.',
    "All coordinates normalized to 0-1000.",
    // The dot is what the Owner reads as "this thing here", so it must sit ON
    // the object. A box centre lands on whatever happens to overlap the middle
    // — a notebook's dot ended up on the hand writing in it (Oskar,
    // 2026-07-29), so the model is asked for the point itself.
    "point_2d must be a spot clearly ON the object's own surface — visible, not covered by anything else, and never merely the middle of its bounding box.",
    "No markdown fences, no commentary.",
  ].join(" ");

  // Temperature 0: the same photo has to produce the same marks twice, or the
  // Owner cannot tell a moved dot from a changed picture.
  const { text } = await askVisionModel(
    secretsDirectory,
    prompt,
    image,
    mimeType,
    { failureCode: "VISION_ANNOTATE_FAILED", temperature: 0 },
  );
  if (!text) throw new Error("VISION_ANNOTATE_EMPTY");
  return parseAnnotations(text);
}

// Turn the model's answer into marks. Exported so the rule below can be tested
// against real answers without a network call.
//
// The prompt asks for 0-1000 and the model does not always oblige: the same
// build that placed dots perfectly one hour answered in 0-100 the next, and
// every dot collapsed into the top-left tenth of the photo (Oskar, 2026-07-29
// — the marks were right, the ruler was wrong). So the scale is read off the
// numbers themselves: the largest coordinate anywhere in the answer decides
// whether they are fractions, percents or thousandths. The prompt's request is
// a hint, never a promise.
export function parseAnnotations(text: string): ImageAnnotationItem[] {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  let raw: unknown;
  try {
    raw = JSON.parse(cleaned);
  } catch {
    throw new Error("VISION_ANNOTATE_UNPARSEABLE");
  }
  if (!Array.isArray(raw)) throw new Error("VISION_ANNOTATE_UNPARSEABLE");

  interface Candidate {
    name: string;
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
    pointY: number;
    pointX: number;
  }
  const candidates: Candidate[] = [];
  for (const entry of raw.slice(0, 10)) {
    if (typeof entry !== "object" || entry === null) continue;
    const record = entry as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    // The live model answers box_2d or box interchangeably — accept both.
    const box = Array.isArray(record.box_2d)
      ? record.box_2d
      : Array.isArray(record.box)
        ? record.box
        : null;
    if (!name || !box || box.length !== 4) continue;
    const bounds = box.map((value) =>
      typeof value === "number" ? Math.max(0, value) : NaN,
    );
    const ymin = bounds[0] ?? NaN;
    const xmin = bounds[1] ?? NaN;
    const ymax = bounds[2] ?? NaN;
    const xmax = bounds[3] ?? NaN;
    if ([ymin, xmin, ymax, xmax].some(Number.isNaN)) continue;
    const point = Array.isArray(record.point_2d) ? record.point_2d : null;
    candidates.push({
      name: name.slice(0, 40),
      ymin,
      xmin,
      ymax,
      xmax,
      pointY: typeof point?.[0] === "number" ? point[0] : NaN,
      pointX: typeof point?.[1] === "number" ? point[1] : NaN,
    });
  }
  if (candidates.length === 0) throw new Error("VISION_ANNOTATE_EMPTY");

  let largest = 0;
  for (const candidate of candidates) {
    for (const value of [
      candidate.ymin,
      candidate.xmin,
      candidate.ymax,
      candidate.xmax,
      candidate.pointY,
      candidate.pointX,
    ]) {
      if (Number.isFinite(value)) largest = Math.max(largest, value);
    }
  }
  // What one unit of the answer is worth as a percentage of the photo.
  const perUnit = largest <= 1.5 ? 100 : largest <= 100 ? 1 : 0.1;

  return candidates.map((candidate) => {
    // Prefer the model's own point (a spot on the object) over the box centre,
    // which lands on whatever overlaps the middle. Anything outside the box is
    // a bad point and falls back to the centre.
    const usePoint =
      Number.isFinite(candidate.pointY) &&
      Number.isFinite(candidate.pointX) &&
      candidate.pointY >= candidate.ymin &&
      candidate.pointY <= candidate.ymax &&
      candidate.pointX >= candidate.xmin &&
      candidate.pointX <= candidate.xmax;
    const x = usePoint
      ? candidate.pointX
      : (candidate.xmin + candidate.xmax) / 2;
    const y = usePoint
      ? candidate.pointY
      : (candidate.ymin + candidate.ymax) / 2;
    const clamp = (value: number): number =>
      Math.round(Math.min(100, Math.max(0, value * perUnit)) * 10) / 10;
    return { name: candidate.name, x: clamp(x), y: clamp(y) };
  });
}
