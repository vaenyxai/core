// Making a picture (Oskar, 2026-07-27). A separate engine slot from the one
// that READS pictures: a model that can look at a photo usually cannot draw
// one, and the Owner should be able to point each at whatever they have.
//
// The slot is a pointer, exactly like the voice and vision slots — the keys
// live once, in Models, and never here.
//
// Reality worth writing down: Google's free tier gives image models a quota of
// ZERO (verified 2026-07-27: "limit: 0, model: gemini-2.5-flash-preview-image").
// So "use free Gemini for pictures" does not work today no matter how the code
// is written, and the failure has to say so rather than looking like a bug.
import type { Buffer } from "node:buffer";

import { readProviderConnections } from "../models/connections.js";
import { writeConnections } from "../models/provider-settings.js";

import { saveImage } from "./vision.js";

export type ImageEngineChoice =
  | "none"
  | "workersai"
  | "gemini"
  | "openai"
  | "zhipu";

// Cloudflare is the free way to make pictures (Oskar, 2026-07-27) and it is the
// only provider here that is NOT OpenAI-shaped: its URL carries the account id
// and it answers with its own envelope. It also asks the household for two
// values where every other provider asks for one — so we ask for the token and
// look the account id up ourselves, because "paste this one thing" is the whole
// difference between a setting a family can use and one they cannot.
const CLOUDFLARE_MODEL = "@cf/black-forest-labs/flux-1-schnell";
const CLOUDFLARE_API = "https://api.cloudflare.com/client/v4";

interface CloudflareConnection {
  apiKey?: string;
  accountId?: string;
  baseUrl?: string;
  model?: string;
  /** The picture model, which is NOT the chat model on the same connection —
   *  `model` there is what chat uses, so drawing keeps its own. */
  imageModel?: string;
}

/** Which account does this token belong to? Asked once, when the token is
 *  saved. Works for broadly-scoped tokens; a token made from the Workers AI
 *  template CANNOT answer (listing accounts needs a permission it does not
 *  have — the /accounts list comes back empty, which is also why wrangler
 *  makes people type their account id). Verified against a real such token,
 *  2026-07-27. The caller then asks the Owner for the id instead. */
export async function discoverCloudflareAccount(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const response = await fetchImpl(`${CLOUDFLARE_API}/accounts`, {
    headers: { authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    throw new Error(`IMAGE_CF_TOKEN_REJECTED:${response.status}`);
  }
  const body = (await response.json()) as {
    result?: { id?: unknown }[];
  };
  const first = body.result?.[0]?.id;
  if (typeof first !== "string" || !first) {
    throw new Error("IMAGE_CF_NEED_ACCOUNT");
  }
  return first;
}

/** Can this token actually use Workers AI on this account? Asked at save time
 *  so a wrong pairing errors while the Owner is still looking at the field.
 *  The models catalogue is the cheapest authenticated Workers AI call: 200 =
 *  good, 401/403 = wrong token or wrong account. Anything else (the endpoint
 *  moved, Cloudflare is down) is INCONCLUSIVE and does not block the save —
 *  drawing will surface the real error with the provider's own words. */
async function verifyWorkersAiAccess(
  apiKey: string,
  accountId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  let response: Response;
  try {
    response = await fetchImpl(
      `${CLOUDFLARE_API}/accounts/${accountId}/ai/models/search?per_page=1`,
      { headers: { authorization: `Bearer ${apiKey}` } },
    );
  } catch {
    return;
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error(`IMAGE_CF_PAIR_REJECTED:${response.status}`);
  }
}

async function generateWithCloudflare(
  connection: CloudflareConnection,
  dataDirectory: string,
  prompt: string,
): Promise<string> {
  const response = await fetch(
    `${CLOUDFLARE_API}/accounts/${connection.accountId}/ai/run/${connection.imageModel ?? CLOUDFLARE_MODEL}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${connection.apiKey ?? ""}`,
      },
      body: JSON.stringify({ prompt }),
    },
  );
  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as {
        errors?: { message?: unknown }[];
      };
      const first = body.errors?.[0]?.message;
      if (typeof first === "string") detail = first.slice(0, 300);
    } catch {
      // Non-JSON body: the status is all there is.
    }
    throw new Error(
      `IMAGE_GENERATE_FAILED:${response.status}${detail ? `:${detail}` : ""}`,
    );
  }
  // Two shapes in the wild: the newer models answer with base64 inside their
  // own envelope, the older ones hand back the PNG bytes directly.
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.startsWith("image/")) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    return saveImage(dataDirectory, bytes as unknown as Buffer, "image/png");
  }
  const parsed = (await response.json()) as {
    result?: { image?: unknown };
  };
  const image = parsed.result?.image;
  if (typeof image !== "string" || !image) {
    throw new Error("IMAGE_EMPTY_RESPONSE");
  }
  const bytes = Uint8Array.from(globalThis.atob(image), (char) =>
    char.charCodeAt(0),
  );
  return saveImage(dataDirectory, bytes as unknown as Buffer, "image/png");
}

// Provider defaults for the OpenAI-compatible /images/generations endpoint.
const IMAGE_CANDIDATES = [
  {
    id: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.5-flash-image",
  },
  {
    id: "openai",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-image-1",
  },
  {
    id: "zhipu",
    // CogView-3-Flash rather than the paid CogView-4: this is the default for
    // someone who picked Zhipu and typed nothing else, and the default should be
    // the one that costs a household nothing. A paid model is one field away.
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    model: "cogview-3-flash",
  },
] as const;

function pickCandidate(
  connections: ReturnType<typeof readProviderConnections>,
): (typeof IMAGE_CANDIDATES)[number] | null {
  const chosen = connections.imageOutput?.provider;
  if (!chosen) return null;
  const pinned = IMAGE_CANDIDATES.find((entry) => entry.id === chosen);
  if (!pinned || !connections[pinned.id]?.apiKey) return null;
  return pinned;
}

function cloudflareReady(
  connections: ReturnType<typeof readProviderConnections>,
): boolean {
  const connection = connections.workersai as CloudflareConnection | undefined;
  return Boolean(connection?.apiKey && connection?.accountId);
}

export function getImageEngineStatus(secretsDirectory: string): {
  connected: boolean;
  provider: string | null;
} {
  const connections = readProviderConnections(secretsDirectory);
  if (connections.imageOutput?.provider === "workersai") {
    return {
      connected: cloudflareReady(connections),
      provider: "workersai",
    };
  }
  const candidate = pickCandidate(connections);
  return candidate
    ? { connected: true, provider: candidate.id }
    : { connected: false, provider: null };
}

export async function setImageEngine(
  secretsDirectory: string,
  choice: ImageEngineChoice,
  apiKey?: string,
  accountIdInput?: string,
): Promise<ReturnType<typeof getImageEngineStatus>> {
  const connections = readProviderConnections(secretsDirectory);
  if (choice === "none") {
    if ("imageOutput" in connections) {
      delete connections.imageOutput;
      writeConnections(secretsDirectory, connections);
    }
    return getImageEngineStatus(secretsDirectory);
  }

  if (choice === "workersai") {
    const key = apiKey?.trim() || (connections.workersai as CloudflareConnection | undefined)?.apiKey;
    if (!key) throw new Error("IMAGE_NO_KEY");
    // The account id: typed by the Owner (a template token cannot name it),
    // already stored, or discovered from a broad token — in that order. Then
    // the pair is verified with a real Workers AI call, so a wrong id says so
    // while the Owner is still looking at the field.
    const accountId =
      accountIdInput?.trim().toLowerCase() ||
      (connections.workersai as CloudflareConnection | undefined)?.accountId ||
      (await discoverCloudflareAccount(key));
    if (!/^[0-9a-f]{32}$/.test(accountId)) {
      throw new Error("IMAGE_CF_BAD_ACCOUNT_ID");
    }
    await verifyWorkersAiAccess(key, accountId);
    connections.workersai = {
      ...(connections.workersai as CloudflareConnection | undefined),
      apiKey: key,
      accountId,
      // Signing in ADDS a backend rather than dedicating one (Oskar,
      // 2026-07-27). The same token can drive chat through Cloudflare's
      // OpenAI-compatible endpoint, so fill that in too and the registry picks
      // it up — one login, available to whichever slot wants it.
      baseUrl: `${CLOUDFLARE_API}/accounts/${accountId}/ai/v1`,
    };
    connections.imageOutput = { provider: "workersai" };
    writeConnections(secretsDirectory, connections);
    return getImageEngineStatus(secretsDirectory);
  }

  if (!connections[choice]?.apiKey) {
    throw new Error("IMAGE_NO_KEY");
  }
  connections.imageOutput = { provider: choice };
  writeConnections(secretsDirectory, connections);
  return getImageEngineStatus(secretsDirectory);
}

// Image models are not chat models: flux-schnell in particular does not read
// Chinese, and handed "再生成一张猫咪的照片" it produced a moonlit landscape
// with pseudo-calligraphy (Oskar, 2026-07-27) — it pattern-matched the SCRIPT
// and ignored the words. So the Owner's request is first turned into a short
// English prompt by the same model that answered the chat. Any failure falls
// back to the raw text: a worse picture beats no picture.
export async function buildImagePrompt(
  provider: {
    sendChat: (
      messages: { role: "owner" | "assistant"; content: string }[],
    ) => Promise<{ answer: string }>;
  },
  content: string,
): Promise<string> {
  try {
    const result = await provider.sendChat([
      {
        role: "owner",
        content: `Turn this request into ONE short English image-generation prompt: subject first, then style and details. No preamble, no quotes — output only the prompt itself.\n\nRequest: ${content}`,
      },
    ]);
    const prompt = (result.answer ?? "")
      .trim()
      .replace(/^["'“”]+|["'“”]+$/g, "");
    // A real prompt is one line and reasonably short; a chatty answer that
    // ignored the instruction would poison the image worse than raw text.
    if (prompt && prompt.length <= 600 && !prompt.includes("\n\n")) {
      return prompt;
    }
  } catch {
    // The chat model being unavailable is not a reason to lose the picture.
  }
  return content;
}

// Does this message read like a request for a picture? Deliberately narrow:
// generating an image nobody asked for wastes the Owner's quota, so an unclear
// message gets an ordinary reply.
const DRAW_EN =
  /\b(draw|generate|create|make|paint|render|design)\b[^.?!]{0,40}\b(image|picture|photo|illustration|logo|icon|poster|drawing|artwork)\b/i;
const DRAW_ZH = /(生成|画|做|设计|渲染)[^。?!]{0,20}(图|照片|图片|插画|海报|logo|图标)/;

export function looksLikeImageRequest(text: string): boolean {
  return DRAW_EN.test(text) || DRAW_ZH.test(text);
}

// A redo, said the way people actually say it: "刚才那张不喜欢你再来一张"
// names no drawing verb and no picture noun, so the request gate above cannot
// see it (Oskar, 2026-07-27 — the reply claimed a regeneration that never
// happened). These phrases only count as an image request when the
// conversation has already produced a generated picture; the caller checks
// that, because this module cannot see the conversation.
const REDO_EN =
  /\b(another one|one more|try again|redo|regenerate|new one|do it again)\b/i;
const REDO_ZH = /再来一?[张幅个]?|再画|再生成|重画|重新画|重新生成|换一?[张幅个]/;

export function isImageFollowUp(text: string): boolean {
  return REDO_EN.test(text) || REDO_ZH.test(text);
}

// Ask the configured engine for a picture and store it like any other photo,
// so it renders in the conversation and rides the local backup.
export async function generateImage(
  secretsDirectory: string,
  dataDirectory: string,
  prompt: string,
): Promise<string> {
  const connections = readProviderConnections(secretsDirectory);

  if (connections.imageOutput?.provider === "workersai") {
    if (!cloudflareReady(connections)) throw new Error("IMAGE_NOT_CONNECTED");
    return generateWithCloudflare(
      connections.workersai as CloudflareConnection,
      dataDirectory,
      prompt,
    );
  }

  const candidate = pickCandidate(connections);
  if (!candidate) throw new Error("IMAGE_NOT_CONNECTED");
  const connection = connections[candidate.id];

  const response = await fetch(
    `${connection?.baseUrl ?? candidate.baseUrl}/images/generations`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${connection?.apiKey ?? ""}`,
      },
      body: JSON.stringify({
        model: connection?.model ?? candidate.model,
        prompt,
        n: 1,
      }),
    },
  );

  if (!response.ok) {
    // Carry the provider's own words: "quota 0 on the free tier" and "that
    // model does not exist" are different problems with different fixes, and
    // only the message can tell them apart.
    let detail = "";
    try {
      const body = (await response.json()) as {
        error?: { message?: unknown } | string;
      };
      const raw =
        typeof body.error === "string" ? body.error : body.error?.message;
      if (typeof raw === "string") detail = raw.slice(0, 300);
    } catch {
      // Non-JSON body: the status is all there is.
    }
    throw new Error(
      `IMAGE_GENERATE_FAILED:${response.status}${detail ? `:${detail}` : ""}`,
    );
  }

  const parsed = (await response.json()) as {
    data?: { b64_json?: string; url?: string }[];
  };
  const first = parsed.data?.[0];
  if (first?.b64_json) {
    const bytes = Uint8Array.from(globalThis.atob(first.b64_json), (char) =>
      char.charCodeAt(0),
    );
    return saveImage(dataDirectory, bytes as unknown as Buffer, "image/png");
  }
  if (first?.url) {
    const image = await fetch(first.url);
    if (!image.ok) throw new Error("IMAGE_FETCH_FAILED");
    const bytes = new Uint8Array(await image.arrayBuffer());
    return saveImage(dataDirectory, bytes as unknown as Buffer, "image/png");
  }
  throw new Error("IMAGE_EMPTY_RESPONSE");
}
