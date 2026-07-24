// Local voice (v2b, Owner decision 2026-07-23): fully offline TTS through
// Piper — a small neural engine that runs on the CPU, no key, no cloud, no
// per-use cost. One ~150 MB base download (engine + one Chinese + one English
// voice) into userdata/tts; extra English voices download individually on
// pick (~60 MB each). The voice is chosen per utterance by the text's
// language. Deliberately OUTSIDE the database folder so backups stay small.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream, existsSync, mkdirSync, rmSync } from "node:fs";
import { rename, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

// Pinned versions: the 2023.11.14-2 engine release and the v1.0.0 voice pack
// are the long-stable artifacts everyone ships.
const PIPER_ZIP_URL =
  "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip";
const VOICES_BASE_URL =
  "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0";

export interface LocalVoiceInfo {
  id: string;
  lang: "zh" | "en";
  label: string;
}

interface LocalVoice extends LocalVoiceInfo {
  // Repo path fragment under the voice pack (…/<path>/<id>.onnx[.json]).
  path: string;
}

// The catalogue the settings dropdowns show. Chinese has a single finished
// Piper voice today (the dropdown exists so a future voice slots straight
// in); English offers a real choice. Defaults ship with the base install.
const VOICE_CATALOG: LocalVoice[] = [
  {
    id: "zh_CN-huayan-medium",
    lang: "zh",
    label: "Huayan (Female)",
    path: "zh/zh_CN/huayan/medium",
  },
  {
    id: "en_US-amy-medium",
    lang: "en",
    label: "Amy (Female)",
    path: "en/en_US/amy/medium",
  },
  {
    id: "en_US-ryan-medium",
    lang: "en",
    label: "Ryan (Male)",
    path: "en/en_US/ryan/medium",
  },
  {
    id: "en_US-lessac-medium",
    lang: "en",
    label: "Lessac (Female)",
    path: "en/en_US/lessac/medium",
  },
  {
    id: "en_US-joe-medium",
    lang: "en",
    label: "Joe (Male)",
    path: "en/en_US/joe/medium",
  },
];

export const DEFAULT_ZH_VOICE = "zh_CN-huayan-medium";
export const DEFAULT_EN_VOICE = "en_US-amy-medium";

export function localVoiceCatalogEntry(id: string): LocalVoice | null {
  return VOICE_CATALOG.find((voice) => voice.id === id) ?? null;
}

// userdata/tts — a sibling of userdata/db, so database backups (which copy
// the db + library only) never swallow the model files.
export function localTtsRoot(dataDirectory: string): string {
  return resolve(dataDirectory, "..", "tts");
}

function piperExecutable(dataDirectory: string): string {
  return resolve(localTtsRoot(dataDirectory), "piper", "piper.exe");
}

function voicePath(dataDirectory: string, voiceId: string): string {
  return resolve(localTtsRoot(dataDirectory), "voices", `${voiceId}.onnx`);
}

export function isVoiceDownloaded(
  dataDirectory: string,
  voiceId: string,
): boolean {
  return existsSync(voicePath(dataDirectory, voiceId));
}

export function isLocalTtsInstalled(dataDirectory: string): boolean {
  return (
    existsSync(piperExecutable(dataDirectory)) &&
    isVoiceDownloaded(dataDirectory, DEFAULT_ZH_VOICE) &&
    isVoiceDownloaded(dataDirectory, DEFAULT_EN_VOICE)
  );
}

// One in-memory download at a time; `installed`/`downloaded` are always
// re-checked from disk so status survives a server restart mid-way.
type InstallPhase = "idle" | "downloading" | "ready" | "error";

const installState: {
  status: InstallPhase;
  progress: number;
  detail: string | null;
} = { status: "idle", progress: 0, detail: null };

export function getLocalTtsStatus(dataDirectory: string): {
  installed: boolean;
  status: InstallPhase;
  progress: number;
  detail: string | null;
  voices: (LocalVoiceInfo & { downloaded: boolean })[];
} {
  const installed = isLocalTtsInstalled(dataDirectory);
  return {
    installed,
    status:
      installed && installState.status !== "downloading"
        ? "ready"
        : installState.status,
    progress: installed && installState.status !== "downloading"
      ? 100
      : installState.progress,
    detail: installState.detail,
    voices: VOICE_CATALOG.map(({ id, lang, label }) => ({
      id,
      lang,
      label,
      downloaded: isVoiceDownloaded(dataDirectory, id),
    })),
  };
}

async function downloadFile(
  url: string,
  destination: string,
  onBytes: (received: number, total: number | null) => void,
): Promise<void> {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok || !response.body) {
    throw new Error(`Download failed (${response.status}) for ${url}`);
  }
  const total = Number.parseInt(
    response.headers.get("content-length") ?? "",
    10,
  );
  let received = 0;
  const counter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      received += chunk.length;
      onBytes(received, Number.isFinite(total) ? total : null);
      callback(null, chunk);
    },
  });
  // Write to a .part file first; only a fully-downloaded file gets its real
  // name, so a crash mid-download never leaves a plausible-looking model.
  const partial = `${destination}.part`;
  await pipeline(
    Readable.fromWeb(
      response.body as import("node:stream/web").ReadableStream,
    ),
    counter,
    createWriteStream(partial),
  );
  await rename(partial, destination);
}

function extractZip(zipPath: string, into: string): Promise<void> {
  // Windows 10+ ships bsdtar as tar.exe, which extracts zip archives; no
  // extra dependency needed for the one archive we ever touch.
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("tar", ["-xf", zipPath, "-C", into], {
      stdio: "ignore",
    });
    child.on("error", rejectPromise);
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(`Archive extraction failed (${code}).`));
    });
  });
}

interface InstallStep {
  label: string;
  weight: number;
  run: (onFraction: (fraction: number) => void) => Promise<void>;
}

function voiceDownloadStep(
  dataDirectory: string,
  voice: LocalVoice,
): InstallStep {
  const voicesDirectory = resolve(localTtsRoot(dataDirectory), "voices");
  return {
    label: `Voice ${voice.label}`,
    weight: 63,
    run: async (onFraction) => {
      mkdirSync(voicesDirectory, { recursive: true });
      for (const extension of [".onnx", ".onnx.json"]) {
        const isModel = extension === ".onnx";
        await downloadFile(
          `${VOICES_BASE_URL}/${voice.path}/${voice.id}${extension}`,
          resolve(voicesDirectory, `${voice.id}${extension}`),
          (received, total) => {
            if (isModel) onFraction(total ? received / total : 0);
          },
        );
      }
    },
  };
}

function runInstall(steps: InstallStep[]): void {
  installState.status = "downloading";
  installState.progress = 0;
  installState.detail = "Starting download…";
  void (async () => {
    const totalWeight = steps.reduce((sum, step) => sum + step.weight, 0);
    let doneWeight = 0;
    try {
      for (const step of steps) {
        installState.detail = `Downloading: ${step.label}`;
        await step.run((fraction) => {
          const bounded = Math.max(0, Math.min(1, fraction));
          installState.progress = Math.round(
            ((doneWeight + step.weight * bounded) / totalWeight) * 100,
          );
        });
        doneWeight += step.weight;
        installState.progress = Math.round((doneWeight / totalWeight) * 100);
      }
      installState.status = "ready";
      installState.progress = 100;
      installState.detail = null;
    } catch (error) {
      installState.status = "error";
      installState.detail =
        error instanceof Error ? error.message : "Download failed.";
    }
  })();
}

// Kick off (or ignore, if already running/finished) the ~150 MB base
// install: engine zip + the two default voices, with byte-level progress.
export function startLocalTtsInstall(dataDirectory: string): void {
  if (installState.status === "downloading") return;
  if (isLocalTtsInstalled(dataDirectory)) {
    installState.status = "ready";
    installState.progress = 100;
    installState.detail = null;
    return;
  }
  const root = localTtsRoot(dataDirectory);
  mkdirSync(root, { recursive: true });
  const steps: InstallStep[] = [];
  if (!existsSync(piperExecutable(dataDirectory))) {
    steps.push({
      label: "Speech engine",
      weight: 21,
      run: async () => {
        const zipPath = resolve(root, "piper.zip");
        await downloadFile(PIPER_ZIP_URL, zipPath, () => undefined);
        await extractZip(zipPath, root);
        await rm(zipPath, { force: true });
        if (!existsSync(piperExecutable(dataDirectory))) {
          throw new Error("Engine archive did not contain piper.exe.");
        }
      },
    });
  }
  for (const id of [DEFAULT_ZH_VOICE, DEFAULT_EN_VOICE]) {
    const voice = localVoiceCatalogEntry(id);
    if (voice && !isVoiceDownloaded(dataDirectory, id)) {
      steps.push(voiceDownloadStep(dataDirectory, voice));
    }
  }
  runInstall(steps);
}

// Download ONE extra voice from the catalogue (~60 MB). No-op if already
// present or another download is running.
export function startLocalVoiceInstall(
  dataDirectory: string,
  voiceId: string,
): void {
  if (installState.status === "downloading") return;
  const voice = localVoiceCatalogEntry(voiceId);
  if (!voice || isVoiceDownloaded(dataDirectory, voiceId)) return;
  runInstall([voiceDownloadStep(dataDirectory, voice)]);
}

// Reclaim the disk: delete userdata/tts entirely. The caller resets the
// voice-output engine if it pointed here.
export function removeLocalTts(dataDirectory: string): void {
  rmSync(localTtsRoot(dataDirectory), { recursive: true, force: true });
  installState.status = "idle";
  installState.progress = 0;
  installState.detail = null;
}

// Text → WAV through the local engine, cached exactly like the Gemini path
// (same tts-<hash>.wav id shape, same voice/ directory). The engine-prefixed
// hash keeps local and cloud caches apart. The Owner's per-language voice
// picks arrive from the caller; a picked voice that is not on disk (download
// still running) falls back to the shipped default.
export async function synthesizeLocalSpeech(
  dataDirectory: string,
  text: string,
  preferences?: { zhVoice?: string; enVoice?: string },
): Promise<string> {
  if (!isLocalTtsInstalled(dataDirectory)) {
    throw new Error("LOCAL_TTS_NOT_INSTALLED");
  }
  const wantsChinese = /[一-鿿]/.test(text);
  const preferred = wantsChinese
    ? preferences?.zhVoice ?? DEFAULT_ZH_VOICE
    : preferences?.enVoice ?? DEFAULT_EN_VOICE;
  const fallback = wantsChinese ? DEFAULT_ZH_VOICE : DEFAULT_EN_VOICE;
  const voiceId =
    localVoiceCatalogEntry(preferred) &&
    isVoiceDownloaded(dataDirectory, preferred)
      ? preferred
      : fallback;
  const hash = createHash("sha256")
    .update(`local:${voiceId}\n${text}`)
    .digest("hex")
    .slice(0, 16);
  const audioId = `tts-${hash}.wav`;
  const directory = resolve(dataDirectory, "voice");
  const outputPath = resolve(directory, audioId);
  if (existsSync(outputPath)) return audioId;
  mkdirSync(directory, { recursive: true });

  const executable = piperExecutable(dataDirectory);
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn(
      executable,
      [
        "--model",
        voicePath(dataDirectory, voiceId),
        "--output_file",
        outputPath,
      ],
      {
        // espeak-ng-data sits next to piper.exe; run from there so the
        // engine finds it without extra flags.
        cwd: resolve(localTtsRoot(dataDirectory), "piper"),
        stdio: ["pipe", "ignore", "ignore"],
      },
    );
    const timer = setTimeout(() => {
      child.kill();
      rejectPromise(new Error("LOCAL_TTS_TIMEOUT"));
    }, 60_000);
    child.on("error", (error) => {
      clearTimeout(timer);
      rejectPromise(error);
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      if (code === 0 && existsSync(outputPath)) resolvePromise();
      else rejectPromise(new Error(`LOCAL_TTS_FAILED:${code}`));
    });
    child.stdin.write(`${text.replaceAll(/\s*\n\s*/g, " ")}\n`, "utf8");
    child.stdin.end();
  });
  return audioId;
}
