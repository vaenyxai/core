// Local voice (v2b, Owner decision 2026-07-23): fully offline TTS through
// Piper — a small neural engine that runs on the CPU, no key, no cloud, no
// per-use cost. One ~150 MB download (engine + one Chinese + one English
// voice) into userdata/tts; the voice is picked per utterance by the text's
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

interface LocalVoice {
  id: string;
  files: { url: string; name: string }[];
}

const VOICES: LocalVoice[] = [
  {
    id: "zh_CN-huayan-medium",
    files: [
      {
        url: `${VOICES_BASE_URL}/zh/zh_CN/huayan/medium/zh_CN-huayan-medium.onnx`,
        name: "zh_CN-huayan-medium.onnx",
      },
      {
        url: `${VOICES_BASE_URL}/zh/zh_CN/huayan/medium/zh_CN-huayan-medium.onnx.json`,
        name: "zh_CN-huayan-medium.onnx.json",
      },
    ],
  },
  {
    id: "en_US-amy-medium",
    files: [
      {
        url: `${VOICES_BASE_URL}/en/en_US/amy/medium/en_US-amy-medium.onnx`,
        name: "en_US-amy-medium.onnx",
      },
      {
        url: `${VOICES_BASE_URL}/en/en_US/amy/medium/en_US-amy-medium.onnx.json`,
        name: "en_US-amy-medium.onnx.json",
      },
    ],
  },
];

// userdata/tts — a sibling of userdata/db, so database backups (which copy
// the db + library only) never swallow the 150 MB of model files.
export function localTtsRoot(dataDirectory: string): string {
  return resolve(dataDirectory, "..", "tts");
}

function piperExecutable(dataDirectory: string): string {
  return resolve(localTtsRoot(dataDirectory), "piper", "piper.exe");
}

function voicePath(dataDirectory: string, voiceId: string): string {
  return resolve(localTtsRoot(dataDirectory), "voices", `${voiceId}.onnx`);
}

export function isLocalTtsInstalled(dataDirectory: string): boolean {
  return (
    existsSync(piperExecutable(dataDirectory)) &&
    VOICES.every((voice) => existsSync(voicePath(dataDirectory, voice.id)))
  );
}

// One in-memory download at a time; `installed` is always re-checked from
// disk so the status survives a server restart mid-way or after completion.
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
} {
  const installed = isLocalTtsInstalled(dataDirectory);
  return {
    installed,
    status: installed && installState.status !== "downloading"
      ? "ready"
      : installState.status,
    progress: installed ? 100 : installState.progress,
    detail: installState.detail,
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

// Kick off (or ignore, if already running/finished) the ~150 MB background
// install: engine zip + 2 voices, sequentially, with byte-level progress.
export function startLocalTtsInstall(dataDirectory: string): void {
  if (installState.status === "downloading") return;
  if (isLocalTtsInstalled(dataDirectory)) {
    installState.status = "ready";
    installState.progress = 100;
    installState.detail = null;
    return;
  }
  installState.status = "downloading";
  installState.progress = 0;
  installState.detail = "Starting download…";

  void (async () => {
    const root = localTtsRoot(dataDirectory);
    const voicesDirectory = resolve(root, "voices");
    mkdirSync(voicesDirectory, { recursive: true });

    // Rough byte weights for overall progress: engine ~21 MB, each voice
    // ~63 MB (the .json sidecars are tiny).
    const steps: {
      label: string;
      weight: number;
      run: (onFraction: (fraction: number) => void) => Promise<void>;
    }[] = [
      {
        label: "Speech engine",
        weight: 21,
        run: async (onFraction) => {
          const zipPath = resolve(root, "piper.zip");
          await downloadFile(PIPER_ZIP_URL, zipPath, (received, total) =>
            onFraction(total ? received / total : 0),
          );
          await extractZip(zipPath, root);
          await rm(zipPath, { force: true });
          if (!existsSync(piperExecutable(dataDirectory))) {
            throw new Error("Engine archive did not contain piper.exe.");
          }
        },
      },
      ...VOICES.map((voice) => ({
        label: `Voice ${voice.id}`,
        weight: 63,
        run: async (onFraction: (fraction: number) => void) => {
          for (const file of voice.files) {
            const isModel = file.name.endsWith(".onnx");
            await downloadFile(
              file.url,
              resolve(voicesDirectory, file.name),
              (received, total) => {
                if (isModel) onFraction(total ? received / total : 0);
              },
            );
          }
        },
      })),
    ];

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

// Reclaim the disk: delete userdata/tts entirely. The caller resets the
// voice-output engine if it pointed here.
export function removeLocalTts(dataDirectory: string): void {
  rmSync(localTtsRoot(dataDirectory), { recursive: true, force: true });
  installState.status = "idle";
  installState.progress = 0;
  installState.detail = null;
}

function pickVoiceForText(text: string): string {
  // Any CJK character → the Chinese voice; otherwise English.
  return /[一-鿿]/.test(text)
    ? "zh_CN-huayan-medium"
    : "en_US-amy-medium";
}

// Text → WAV through the local engine, cached exactly like the Gemini path
// (same tts-<hash>.wav id shape, same voice/ directory, same replay-free
// semantics). The engine-prefixed hash keeps local and cloud caches apart.
export async function synthesizeLocalSpeech(
  dataDirectory: string,
  text: string,
): Promise<string> {
  if (!isLocalTtsInstalled(dataDirectory)) {
    throw new Error("LOCAL_TTS_NOT_INSTALLED");
  }
  const voiceId = pickVoiceForText(text);
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
