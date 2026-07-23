// Vision (Owner request 2026-07-24): a photo becomes useful TEXT — the fridge
// shot turns into an ingredient list that flows into chat and Routines like
// any typed message. Mirrors the voice pipeline: attachment in, text out.
// The image goes browser → this local server → a vision-capable connected
// provider (auto-picked); the key never reaches the browser.
import { readProviderConnections } from "../models/connections.js";

// Order of preference among the Owner's existing Models connections — all
// free-tier friendly, no separate vision setup needed.
const VISION_CANDIDATES = [
  {
    id: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.5-flash",
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

// A Google key stored only for Voice Output (Gemini TTS) works for Gemini
// vision too — reuse it so the camera lights up without a second setup.
function candidateKey(
  connections: ReturnType<typeof readProviderConnections>,
  candidateId: string,
): string | undefined {
  const direct = connections[candidateId]?.apiKey;
  if (direct) return direct;
  if (candidateId === "gemini" && connections.voiceOutput?.engine === "gemini") {
    return connections.voiceOutput.apiKey;
  }
  return undefined;
}

export function getVisionStatus(secretsDirectory: string): {
  connected: boolean;
  provider: string | null;
} {
  const connections = readProviderConnections(secretsDirectory);
  for (const candidate of VISION_CANDIDATES) {
    if (candidateKey(connections, candidate.id)) {
      return { connected: true, provider: candidate.id };
    }
  }
  return { connected: false, provider: null };
}

export async function describeImage(
  secretsDirectory: string,
  image: Buffer,
  mimeType: string,
  lang: string,
): Promise<string> {
  const connections = readProviderConnections(secretsDirectory);
  const candidate = VISION_CANDIDATES.find((entry) =>
    candidateKey(connections, entry.id),
  );
  if (!candidate) {
    throw new Error("VISION_NOT_CONNECTED");
  }
  const apiKey = candidateKey(connections, candidate.id) ?? "";
  const connection = connections[candidate.id];
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
    throw new Error(`VISION_DESCRIBE_FAILED:${response.status}`);
  }
  const parsed = (await response.json()) as {
    choices?: { message?: { content?: unknown } }[];
  };
  const text = parsed.choices?.[0]?.message?.content;
  return typeof text === "string" ? text.trim() : "";
}
