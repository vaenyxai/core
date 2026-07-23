// Voice (Owner decision 2026-07-22): speech-to-text through Groq's Whisper —
// the accuracy-benchmark model on the fastest chips, with transcription inside
// the free tier. The voice connection is SEPARATE from the chat models (it
// never appears in the chat model picker); its key lives in the same local
// model-providers.json under "voice", and connecting can simply reuse an
// already-connected Groq chat key. Audio flows browser → this local server →
// Groq (the key never reaches the browser).
import { readProviderConnections } from "../models/connections.js";
import { writeConnections } from "../models/provider-settings.js";

const VOICE_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_VOICE_MODEL = "whisper-large-v3-turbo";

export function getVoiceStatus(secretsDirectory: string): {
  connected: boolean;
  model: string | null;
} {
  const voice = readProviderConnections(secretsDirectory).voice;
  if (!voice?.apiKey) return { connected: false, model: null };
  return { connected: true, model: voice.model ?? DEFAULT_VOICE_MODEL };
}

export function connectVoice(
  secretsDirectory: string,
  input: { apiKey?: string; model?: string },
): { connected: boolean; model: string | null } {
  const connections = readProviderConnections(secretsDirectory);
  // No key supplied = reuse the Groq chat connection's key (one key, two uses).
  const apiKey = input.apiKey?.trim() || connections.groq?.apiKey;
  if (!apiKey) {
    throw new Error("VOICE_NO_KEY");
  }
  connections.voice = {
    apiKey,
    ...(input.model?.trim() ? { model: input.model.trim() } : {}),
  };
  writeConnections(secretsDirectory, connections);
  return getVoiceStatus(secretsDirectory);
}

export function disconnectVoice(secretsDirectory: string): {
  connected: boolean;
  model: string | null;
} {
  const connections = readProviderConnections(secretsDirectory);
  if ("voice" in connections) {
    delete connections.voice;
    writeConnections(secretsDirectory, connections);
  }
  return { connected: false, model: null };
}

// Forward one recorded utterance to Groq's transcription endpoint and return
// the text. Language is auto-detected (Chinese and English both fine).
export async function transcribeVoice(
  secretsDirectory: string,
  audio: Buffer,
  mimeType: string,
): Promise<string> {
  const voice = readProviderConnections(secretsDirectory).voice;
  if (!voice?.apiKey) {
    throw new Error("VOICE_NOT_CONNECTED");
  }
  const form = new FormData();
  const extension = mimeType.includes("mp4")
    ? "m4a"
    : mimeType.includes("ogg")
      ? "ogg"
      : "webm";
  form.append(
    "file",
    new Blob([new Uint8Array(audio)], { type: mimeType }),
    `voice.${extension}`,
  );
  form.append("model", voice.model ?? DEFAULT_VOICE_MODEL);
  form.append("response_format", "json");

  const response = await fetch(`${VOICE_BASE_URL}/audio/transcriptions`, {
    method: "POST",
    headers: { authorization: `Bearer ${voice.apiKey}` },
    body: form,
  });
  if (!response.ok) {
    throw new Error(`VOICE_TRANSCRIBE_FAILED:${response.status}`);
  }
  const parsed = (await response.json()) as { text?: unknown };
  return typeof parsed.text === "string" ? parsed.text.trim() : "";
}
