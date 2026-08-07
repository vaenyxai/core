// Voice engines, unified model (Oskar, dev.162): API keys live ONLY in the
// Models connections; the voice slots here are plain POINTERS at a provider.
// Empty slot = feature off. A slot fills automatically when a capable model
// connects (fillEngineDefaults) and can be repointed by hand any time — no
// hidden "auto" resolution, no keys stored per engine.
//
// Speech-to-text runs on Whisper (Groq's fast chips or OpenAI); audio flows
// browser → this local server → the provider (keys never reach the browser).
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { readProviderConnections } from "../models/connections.js";
import { writeConnections } from "../models/provider-settings.js";
import {
  getLocalTtsStatus,
  isLocalTtsInstalled,
  isVoiceDownloaded,
  localVoiceCatalogEntry,
  startLocalVoiceInstall,
  synthesizeLocalSpeech,
} from "./voice-local.js";

// The STT-capable backends and how to call them.
export const STT_ENGINES: Record<string, { baseUrl: string; model: string }> = {
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    model: "whisper-large-v3-turbo",
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "whisper-1",
  },
};

function resolveVoiceConnection(secretsDirectory: string): {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl: string;
} | null {
  const connections = readProviderConnections(secretsDirectory);
  const provider = connections.voice?.provider;
  if (!provider) return null;
  const engine = STT_ENGINES[provider];
  const apiKey = connections[provider]?.apiKey;
  if (!engine || !apiKey) return null;
  return { provider, apiKey, model: engine.model, baseUrl: engine.baseUrl };
}

export function getVoiceStatus(secretsDirectory: string): {
  connected: boolean;
  provider: string | null;
  model: string | null;
} {
  const voice = resolveVoiceConnection(secretsDirectory);
  if (!voice) return { connected: false, provider: null, model: null };
  return { connected: true, provider: voice.provider, model: voice.model };
}

// Point the voice-input slot at a connected provider ("none" empties it).
export function setVoiceInput(
  secretsDirectory: string,
  provider: "none" | "groq" | "openai",
): ReturnType<typeof getVoiceStatus> {
  const connections = readProviderConnections(secretsDirectory);
  if (provider === "none") {
    delete connections.voice;
    writeConnections(secretsDirectory, connections);
    return getVoiceStatus(secretsDirectory);
  }
  if (!connections[provider]?.apiKey) {
    throw new Error("VOICE_NO_KEY");
  }
  connections.voice = { provider };
  writeConnections(secretsDirectory, connections);
  return getVoiceStatus(secretsDirectory);
}

// ── Voice output (TTS engine) ────────────────────────────────────────────────
// "browser" = the device's own TTS (basic, free). "gemini" = Gemini TTS with
// the key from the Models → Gemini connection. "local" = Piper running fully
// offline (150 MB download). "none" = replies are not read aloud.
const GEMINI_TTS_MODEL = "gemini-2.5-flash-preview-tts";
const DEFAULT_GEMINI_VOICE = "Kore";

export type VoiceOutputEngine =
  | "none"
  | "browser"
  | "gemini"
  | "workersai"
  | "local";

// The PROVIDER connections speech can be asked of. "browser" and "local"
// are engines rather than connections, so they are not here; the models
// layer compares its own list against this one in a test.
//
// Workers AI joined on 2026-08-07, and only after being asked: Deepgram's
// aura-1 answers with an MP3 for an English line (verified with the Owner's
// own key), which makes Speaking survive losing Gemini. Two neighbours were
// checked at the same time and are NOT here, because they do not work:
//   * @cf/myshell-ai/melotts — fine in English, HTTP 500 on Chinese, twice.
//   * Groq's Orpheus models  — 400 "requires terms acceptance", which only
//     the account's owner can do in Groq's console.
// aura-1 is an ENGLISH voice. Chinese is refused by name below rather than
// mispronounced, and the row says so.
export const TTS_PROVIDER_ENGINES = ["gemini", "workersai"] as const;
const WORKERS_TTS_MODEL = "@cf/deepgram/aura-1";

/** How long the provider itself said to wait, in whole seconds. Google puts
 *  it in a RetryInfo detail and in the message; either will do, and neither
 *  being there is not an error — the caller just says less. */
async function retryAfterSeconds(response: Response): Promise<number | null> {
  try {
    const body = (await response.json()) as {
      error?: {
        message?: string;
        details?: { "@type"?: string; retryDelay?: string }[];
      };
    };
    const detail = body.error?.details?.find((entry) =>
      entry["@type"]?.endsWith("RetryInfo"),
    )?.retryDelay;
    const fromDetail = detail ? Number.parseFloat(detail) : Number.NaN;
    if (Number.isFinite(fromDetail)) return Math.max(1, Math.ceil(fromDetail));
    const fromMessage = body.error?.message?.match(
      /retry in ([\d.]+)s/i,
    )?.[1];
    if (fromMessage) return Math.max(1, Math.ceil(Number.parseFloat(fromMessage)));
    return null;
  } catch {
    return null;
  }
}

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
  if (output?.engine === "gemini" && connections.gemini?.apiKey) {
    return {
      engine: "gemini",
      apiKey: connections.gemini.apiKey,
      voice: output.voice ?? DEFAULT_GEMINI_VOICE,
    };
  }
  if (output?.engine === "workersai" && connections.workersai?.apiKey) {
    return {
      engine: "workersai",
      apiKey: connections.workersai.apiKey,
      voice: "aura",
    };
  }
  if (output?.engine === "browser") {
    return { engine: "browser", apiKey: null, voice: DEFAULT_GEMINI_VOICE };
  }
  return { engine: "none", apiKey: null, voice: DEFAULT_GEMINI_VOICE };
}

export function getVoiceOutput(
  secretsDirectory: string,
  dataDirectory: string,
): {
  engine: VoiceOutputEngine;
  connected: boolean;
  voice: string | null;
  zhVoice?: string;
  enVoice?: string;
} {
  const resolved = resolveVoiceOutput(secretsDirectory, dataDirectory);
  const stored = readProviderConnections(secretsDirectory).voiceOutput;
  return {
    engine: resolved.engine,
    connected: resolved.engine !== "none",
    voice:
      resolved.engine === "gemini"
        ? resolved.voice
        : resolved.engine === "local"
          ? "auto"
          : null,
    ...(stored?.zhVoice ? { zhVoice: stored.zhVoice } : {}),
    ...(stored?.enVoice ? { enVoice: stored.enVoice } : {}),
  };
}

export function connectVoiceOutput(
  secretsDirectory: string,
  dataDirectory: string,
  input: { engine: VoiceOutputEngine; voice?: string },
): ReturnType<typeof getVoiceOutput> {
  const connections = readProviderConnections(secretsDirectory);
  if (input.engine === "none") {
    delete connections.voiceOutput;
  } else if (input.engine === "local") {
    if (!isLocalTtsInstalled(dataDirectory)) {
      throw new Error("LOCAL_TTS_NOT_INSTALLED");
    }
    // Keep the per-language voice picks across engine switches.
    connections.voiceOutput = {
      ...(connections.voiceOutput?.zhVoice
        ? { zhVoice: connections.voiceOutput.zhVoice }
        : {}),
      ...(connections.voiceOutput?.enVoice
        ? { enVoice: connections.voiceOutput.enVoice }
        : {}),
      engine: "local",
    };
  } else if (input.engine === "browser") {
    connections.voiceOutput = { engine: "browser" };
  } else {
    // gemini: the key must already sit in the Models → Gemini connection.
    if (!connections.gemini?.apiKey) {
      throw new Error("VOICE_NO_KEY");
    }
    connections.voiceOutput = {
      engine: "gemini",
      voice: input.voice?.trim() || DEFAULT_GEMINI_VOICE,
    };
  }
  writeConnections(secretsDirectory, connections);
  return getVoiceOutput(secretsDirectory, dataDirectory);
}

// Pick a local voice for its language slot (Chinese or English, from the
// catalogue). A voice not on disk yet starts its ~60 MB download; synthesis
// falls back to the shipped default until it lands.
export function setLocalVoice(
  secretsDirectory: string,
  dataDirectory: string,
  voiceId: string,
): ReturnType<typeof getLocalTtsStatus> {
  const entry = localVoiceCatalogEntry(voiceId);
  if (!entry) {
    throw new Error("LOCAL_VOICE_UNKNOWN");
  }
  const connections = readProviderConnections(secretsDirectory);
  const output = connections.voiceOutput ?? { engine: "local" };
  if (entry.lang === "zh") output.zhVoice = voiceId;
  else output.enVoice = voiceId;
  connections.voiceOutput = output;
  writeConnections(secretsDirectory, connections);
  if (!isVoiceDownloaded(dataDirectory, voiceId)) {
    startLocalVoiceInstall(dataDirectory, voiceId);
  }
  return getLocalTtsStatus(dataDirectory);
}

// After a Remove-download, an engine pointing at "local" would resolve to
// none anyway — reset the stored choice so the setting matches reality.
export function resetVoiceOutputIfLocal(secretsDirectory: string): void {
  const connections = readProviderConnections(secretsDirectory);
  if (connections.voiceOutput?.engine === "local") {
    delete connections.voiceOutput;
    writeConnections(secretsDirectory, connections);
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
    const output = readProviderConnections(secretsDirectory).voiceOutput;
    return synthesizeLocalSpeech(dataDirectory, text, {
      zhVoice: output?.zhVoice,
      enVoice: output?.enVoice,
    });
  }
  if (resolved.engine === "workersai" && resolved.apiKey) {
    return await synthesizeWorkersSpeech(
      secretsDirectory,
      dataDirectory,
      text,
      resolved.apiKey,
    );
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
    // A 429 here is almost never "you have used up today". Google's free tier
    // allows THREE speech requests a minute per model, and its own refusal
    // carries the seconds to wait — measured against the live API on
    // 2026-08-07: quotaId GenerateRequestsPerMinutePerProjectPerModel-FreeTier,
    // quotaValue 3, retryDelay 8s. Telling the Owner to "wait a while" when
    // the answer is "eight seconds" sends them off to change engines over
    // nothing, so the number is carried out to them.
    if (response.status === 429) {
      const seconds = await retryAfterSeconds(response);
      throw new Error(`VOICE_TTS_RATE_LIMITED:${seconds ?? ""}`);
    }
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

// Cloudflare's Deepgram voice. Answers with an MP3 straight away — no base64,
// no PCM header to build — and the account id comes from the same base URL
// the chat connection already stores.
//
// English only, and that is enforced rather than hoped: Aura reads Chinese
// characters as though they were English, which sounds like nonsense and
// would look like a Vaenyx fault. Chinese says so and names the two engines
// that can do it.
async function synthesizeWorkersSpeech(
  secretsDirectory: string,
  dataDirectory: string,
  text: string,
  apiKey: string,
): Promise<string> {
  if (/[一-鿿]/.test(text)) {
    throw new Error("VOICE_TTS_ENGLISH_ONLY");
  }
  const baseUrl = readProviderConnections(secretsDirectory).workersai?.baseUrl;
  const account = baseUrl?.match(/accounts\/([^/]+)/)?.[1];
  if (!account) throw new Error("VOICE_OUTPUT_NOT_CONNECTED");

  const hash = createHash("sha256")
    .update(`workersai:${text}`)
    .digest("hex")
    .slice(0, 16);
  const audioId = `tts-${hash}.mp3`;
  const directory = resolve(dataDirectory, "voice");
  const path = resolve(directory, audioId);
  if (existsSync(path)) return audioId;

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${WORKERS_TTS_MODEL}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(60_000),
    },
  );
  if (!response.ok) {
    throw new Error(`VOICE_TTS_FAILED:${response.status}`);
  }
  const audio = Buffer.from(await response.arrayBuffer());
  if (audio.length === 0) throw new Error("VOICE_TTS_EMPTY");
  mkdirSync(directory, { recursive: true });
  writeFileSync(path, audio);
  return audioId;
}

// The Owner's original recordings, kept so a voice bubble can replay them
// (WeChat-style). Files live under <dataDirectory>/voice; the id embeds the
// extension and is strictly validated before any read.
const AUDIO_ID_PATTERN =
  /^(tts-[0-9a-f]{16}|[0-9a-f-]{36})\.(webm|m4a|ogg|wav|mp3)$/;

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

// Forward one recorded utterance to the picked Whisper backend and return the
// text. Language is auto-detected (Chinese and English both fine).
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
