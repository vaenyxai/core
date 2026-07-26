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

export type ImageEngineChoice = "none" | "gemini" | "openai" | "zhipu";

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

export function getImageEngineStatus(secretsDirectory: string): {
  connected: boolean;
  provider: string | null;
} {
  const candidate = pickCandidate(readProviderConnections(secretsDirectory));
  return candidate
    ? { connected: true, provider: candidate.id }
    : { connected: false, provider: null };
}

export function setImageEngine(
  secretsDirectory: string,
  choice: ImageEngineChoice,
): ReturnType<typeof getImageEngineStatus> {
  const connections = readProviderConnections(secretsDirectory);
  if (choice === "none") {
    if ("imageOutput" in connections) {
      delete connections.imageOutput;
      writeConnections(secretsDirectory, connections);
    }
    return getImageEngineStatus(secretsDirectory);
  }
  if (!connections[choice]?.apiKey) {
    throw new Error("IMAGE_NO_KEY");
  }
  connections.imageOutput = { provider: choice };
  writeConnections(secretsDirectory, connections);
  return getImageEngineStatus(secretsDirectory);
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

// Ask the configured engine for a picture and store it like any other photo,
// so it renders in the conversation and rides the local backup.
export async function generateImage(
  secretsDirectory: string,
  dataDirectory: string,
  prompt: string,
): Promise<string> {
  const connections = readProviderConnections(secretsDirectory);
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
