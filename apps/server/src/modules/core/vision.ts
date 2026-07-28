// Vision (Owner request 2026-07-24): a photo becomes useful TEXT — the fridge
// shot turns into an ingredient list that flows into chat and Routines like
// any typed message. Mirrors the voice pipeline: attachment in, text out.
// The image goes browser → this local server → a vision-capable connected
// provider (auto-picked); the key never reaches the browser.
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

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
// 2026-07-28); the key-based providers take a data URL.
export const VISION_DIRECT_PROVIDER_IDS = ["gemini", "zhipu", "openai", "codex"];

// Order of preference among the Owner's existing Models connections — all
// free-tier friendly, no separate vision setup needed.
const VISION_CANDIDATES = [
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
] as const;

// The vision slot is a plain pointer at a connected provider (Oskar's
// unified model, dev.162): empty = camera off, auto-filled once when a
// capable model connects (fillEngineDefaults), repointable here. Keys live
// only in the Models connections.
export type VisionEngineChoice = "none" | "gemini" | "zhipu" | "openai";

function pickCandidate(
  connections: ReturnType<typeof readProviderConnections>,
): (typeof VISION_CANDIDATES)[number] | null {
  const chosen = connections.vision?.provider;
  if (!chosen) return null;
  const pinned = VISION_CANDIDATES.find((entry) => entry.id === chosen);
  if (!pinned || !connections[pinned.id]?.apiKey) return null;
  return pinned;
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
  if (!connections[choice]?.apiKey) {
    throw new Error("VISION_NO_KEY");
  }
  connections.vision = { provider: choice };
  writeConnections(secretsDirectory, connections);
  return getVisionStatus(secretsDirectory);
}

export async function describeImage(
  secretsDirectory: string,
  image: Buffer,
  mimeType: string,
  lang: string,
): Promise<string> {
  const connections = readProviderConnections(secretsDirectory);
  const candidate = pickCandidate(connections);
  if (!candidate) {
    throw new Error("VISION_NOT_CONNECTED");
  }
  const connection = connections[candidate.id];
  const apiKey = connection?.apiKey ?? "";
  const dataUrl = `data:${mimeType};base64,${image.toString("base64")}`;
  const prompt =
    lang === "zh"
      ? "精确、实用地描述这张照片的内容。如果是食材/冰箱/购物照片,逐项列出所有能辨认的食物和大致数量。如果是文档或票据,提取关键文字信息。其它内容就简洁描述要点。只输出内容本身,不要客套话。"
      : "Describe this photo's contents precisely and usefully. If it shows food, groceries or a fridge, list every identifiable item with a rough quantity. If it is a document or receipt, extract the key text. Otherwise describe the key contents concisely. Output the content only, no preamble.";

  const response = await fetch(
    `${connection?.baseUrl ?? candidate.baseUrl}/chat/completions`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: candidate.model,
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
      `VISION_DESCRIBE_FAILED:${response.status}${detail ? `:${detail}` : ""}`,
    );
  }
  const parsed = (await response.json()) as {
    choices?: { message?: { content?: unknown } }[];
  };
  const text = parsed.choices?.[0]?.message?.content;
  return typeof text === "string" ? text.trim() : "";
}
