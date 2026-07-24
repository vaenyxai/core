// Voice (Owner decision 2026-07-22): speech-to-text through Groq's Whisper —
// the accuracy-benchmark model on the fastest chips, with transcription inside
// the free tier. The voice connection is SEPARATE from the chat models (it
// never appears in the chat model picker); its key lives in the same local
// model-providers.json under "voice", and connecting can simply reuse an
// already-connected Groq chat key. Audio flows browser → this local server →
// Groq (the key never reaches the browser).
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { readProviderConnections } from "../models/connections.js";
import { writeConnections } from "../models/provider-settings.js";
import { initModelRegistry } from "../models/registry.js";
import {
  isLocalTtsInstalled,
  synthesizeLocalSpeech,
} from "./voice-local.js";

// Voice keys double as chat keys (registry borrows them), so any voice
// connection change must re-register the model backends immediately.
function refreshRegistry(secretsDirectory: string): void {
  initModelRegistry({ secretsDirectory });
}

const VOICE_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_VOICE_MODEL = "whisper-large-v3-turbo";

// The dedicated voice entry wins; without one, a main-model connection that
// CAN do speech powers it automatically (Oskar's rule, dev.153/154): Groq →
// Whisper large, OpenAI → whisper-1. Manual connect still overrides.
function resolveVoiceConnection(secretsDirectory: string): {
  apiKey: string;
  model: string;
  baseUrl: string;
} | null {
  const connections = readProviderConnections(secretsDirectory);
  if (connections.voice?.apiKey) {
    return {
      apiKey: connections.voice.apiKey,
      model: connections.voice.model ?? DEFAULT_VOICE_MODEL,
      baseUrl: VOICE_BASE_URL,
    };
  }
  if (connections.groq?.apiKey) {
    return {
      apiKey: connections.groq.apiKey,
      model: DEFAULT_VOICE_MODEL,
      baseUrl: VOICE_BASE_URL,
    };
  }
  if (connections.openai?.apiKey) {
    return {
      apiKey: connections.openai.apiKey,
      model: "whisper-1",
      baseUrl: "https://api.openai.com/v1",
    };
  }
  return null;
}

export function getVoiceStatus(secretsDirectory: string): {
  connected: boolean;
  model: string | null;
} {
  const voice = resolveVoiceConnection(secretsDirectory);
  if (!voice) return { connected: false, model: null };
  return { connected: true, model: voice.model };
}

// ── Voice output (TTS engine) ────────────────────────────────────────────────
// "browser" = the device's own TTS (basic, free, no key). "gemini" = Gemini
// TTS generated server-side into real audio files (natural voice; a Google AI
// Studio key, reusable from the Models → Gemini connection). "local" = Piper
// running fully offline on this machine (v2b; one 150 MB download, no key).
const GEMINI_TTS_MODEL = "gemini-2.5-flash-preview-tts";
const DEFAULT_GEMINI_VOICE = "Kore";

export type VoiceOutputEngine = "browser" | "gemini" | "local";

// Resolution order (Oskar's rule, dev.154): an explicit choice sticks (local
// once installed, gemini with a key, or browser chosen on purpose); with no
// choice at all, a connected Gemini main model powers speech automatically.
function resolveVoiceOutput(
  secretsDirectory: string,
  dataDirectory: string,
): {
  engine: VoiceOutputEngine;
  apiKey: string | null;
  voice: string;
} {
  const connections = readProviderConnections(secretsDirectory);
  const output = connections.voiceOutput;
  if (output?.engine === "local" && isLocalTtsInstalled(dataDirectory)) {
    return { engine: "local", apiKey: null, voice: "auto" };
  }
  if (output?.engine === "gemini" && output.apiKey) {
    return {
      engine: "gemini",
      apiKey: output.apiKey,
      voice: output.voice ?? DEFAULT_GEMINI_VOICE,
    };
  }
  if (output?.engine === "browser") {
    return { engine: "browser", apiKey: null, voice: DEFAULT_GEMINI_VOICE };
  }
  const geminiKey = connections.gemini?.apiKey;
  if (geminiKey) {
    return { engine: "gemini", apiKey: geminiKey, voice: DEFAULT_GEMINI_VOICE };
  }
  return { engine: "browser", apiKey: null, voice: DEFAULT_GEMINI_VOICE };
}

export function getVoiceOutput(
  secretsDirectory: string,
  dataDirectory: string,
): {
  engine: VoiceOutputEngine;
  connected: boolean;
  voice: string | null;
} {
  const resolved = resolveVoiceOutput(secretsDirectory, dataDirectory);
  if (resolved.engine === "local") {
    return { engine: "local", connected: true, voice: "auto" };
  }
  if (resolved.engine === "gemini") {
    return { engine: "gemini", connected: true, voice: resolved.voice };
  }
  return { engine: "browser", connected: true, voice: null };
}

export function connectVoiceOutput(
  secretsDirectory: string,
  dataDirectory: string,
  input: { engine: VoiceOutputEngine; apiKey?: string; voice?: string },
): ReturnType<typeof getVoiceOutput> {
  const connections = readProviderConnections(secretsDirectory);
  if (input.engine === "local") {
    if (!isLocalTtsInstalled(dataDirectory)) {
      throw new Error("LOCAL_TTS_NOT_INSTALLED");
    }
    connections.voiceOutput = { engine: "local" };
    writeConnections(secretsDirectory, connections);
    refreshRegistry(secretsDirectory);
    return getVoiceOutput(secretsDirectory, dataDirectory);
  }
  if (input.engine === "browser") {
    // Explicit browser choice sticks — it must beat the Gemini auto-follow.
    connections.voiceOutput = { engine: "browser" };
    writeConnections(secretsDirectory, connections);
    refreshRegistry(secretsDirectory);
    return getVoiceOutput(secretsDirectory, dataDirectory);
  }
  // Gemini: bring a key, keep the one already stored (e.g. a voice change),
  // or reuse the Models → Gemini connection's key.
  const apiKey =
    input.apiKey?.trim() ||
    connections.voiceOutput?.apiKey ||
    connections.gemini?.apiKey;
  if (!apiKey) {
    throw new Error("VOICE_NO_KEY");
  }
  connections.voiceOutput = {
    engine: "gemini",
    apiKey,
    voice: input.voice?.trim() || DEFAULT_GEMINI_VOICE,
  };
  writeConnections(secretsDirectory, connections);
  refreshRegistry(secretsDirectory);
  return getVoiceOutput(secretsDirectory, dataDirectory);
}

// After a Remove-download, an engine pointing at "local" would silently fall
// back anyway — reset it explicitly so the stored choice matches reality.
export function resetVoiceOutputIfLocal(secretsDirectory: string): void {
  const connections = readProviderConnections(secretsDirectory);
  if (connections.voiceOutput?.engine === "local") {
    delete connections.voiceOutput;
    writeConnections(secretsDirectory, connections);
    refreshRegistry(secretsDirectory);
  }
}

// Gemini TTS returns raw 16-bit mono PCM at 24 kHz; wrap it into a WAV file so
// a plain <audio> element can play it.
function wavFromPcm(pcm: Buffer, sampleRate = 24_000): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

// Text → saved WAV via the picked engine (Gemini TTS or the local Piper).
// Cached by (engine, voice, text) hash so replaying a bubble never pays for a
// second generation.
export async function synthesizeSpeech(
  secretsDirectory: string,
  dataDirectory: string,
  text: string,
): Promise<string> {
  const resolved = resolveVoiceOutput(secretsDirectory, dataDirectory);
  if (resolved.engine === "local") {
    return synthesizeLocalSpeech(dataDirectory, text);
  }
  if (resolved.engine !== "gemini" || !resolved.apiKey) {
    throw new Error("VOICE_OUTPUT_NOT_CONNECTED");
  }
  const voice = resolved.voice;
  const hash = createHash("sha256")
    .update(`${voice}\n${text}`)
    .digest("hex")
    .slice(0, 16);
  const audioId = `tts-${hash}.wav`;
  const directory = resolve(dataDirectory, "voice");
  const path = resolve(directory, audioId);
  if (existsSync(path)) return audioId;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent?key=${resolved.apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
          },
        },
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`VOICE_TTS_FAILED:${response.status}`);
  }
  const parsed = (await response.json()) as {
    candidates?: {
      content?: { parts?: { inlineData?: { data?: string } }[] };
    }[];
  };
  const base64 =
    parsed.candidates?.[0]?.content?.parts?.find(
      (part) => part.inlineData?.data,
    )?.inlineData?.data ?? null;
  if (!base64) {
    throw new Error("VOICE_TTS_EMPTY");
  }
  mkdirSync(directory, { recursive: true });
  writeFileSync(path, wavFromPcm(Buffer.from(base64, "base64")));
  return audioId;
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
  refreshRegistry(secretsDirectory);
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
    refreshRegistry(secretsDirectory);
  }
  return { connected: false, model: null };
}

// The Owner's original recordings, kept so a voice bubble can replay them
// (WeChat-style). Files live under <dataDirectory>/voice; the id embeds the
// extension and is strictly validated before any read.
const AUDIO_ID_PATTERN = /^(tts-[0-9a-f]{16}|[0-9a-f-]{36})\.(webm|m4a|ogg|wav)$/;

function audioExtension(mimeType: string): "webm" | "m4a" | "ogg" {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

export function saveVoiceAudio(
  dataDirectory: string,
  audio: Buffer,
  mimeType: string,
): string {
  const id = `${randomUUID()}.${audioExtension(mimeType)}`;
  const directory = resolve(dataDirectory, "voice");
  mkdirSync(directory, { recursive: true });
  writeFileSync(resolve(directory, id), audio);
  return id;
}

export function readVoiceAudio(
  dataDirectory: string,
  audioId: string,
): { audio: Buffer; mimeType: string } | null {
  if (!AUDIO_ID_PATTERN.test(audioId)) return null;
  try {
    const audio = readFileSync(resolve(dataDirectory, "voice", audioId));
    const mimeType = audioId.endsWith(".m4a")
      ? "audio/mp4"
      : audioId.endsWith(".ogg")
        ? "audio/ogg"
        : audioId.endsWith(".wav")
          ? "audio/wav"
          : "audio/webm";
    return { audio, mimeType };
  } catch {
    return null;
  }
}

// Forward one recorded utterance to Groq's transcription endpoint and return
// the text. Language is auto-detected (Chinese and English both fine).
export async function transcribeVoice(
  secretsDirectory: string,
  audio: Buffer,
  mimeType: string,
): Promise<string> {
  const voice = resolveVoiceConnection(secretsDirectory);
  if (!voice) {
    throw new Error("VOICE_NOT_CONNECTED");
  }
  const transcribeBaseUrl = voice.baseUrl;
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
  form.append("model", voice.model);
  form.append("response_format", "json");

  const response = await fetch(`${transcribeBaseUrl}/audio/transcriptions`, {
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
