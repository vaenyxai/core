import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import {
  DEFAULT_EN_VOICE,
  DEFAULT_ZH_VOICE,
  firstDownloadedVoice,
  isLocalTtsInstalled,
} from "../src/modules/core/voice-local.js";

// "Installed" used to mean "the two ids that happen to be the defaults are on
// disk". Moving the Chinese default from huayan to chaowen therefore told
// every existing install that it had no local voice at all, and the option
// vanished from the Speaking row (found 2026-08-07). A default is a
// preference; a download is a fact, and these hold them apart.

const directories: string[] = [];

afterAll(() => {
  for (const directory of directories) {
    rmSync(directory, { force: true, recursive: true });
  }
});

/** A userdata/db-shaped folder with the engine present and the named voices
 *  downloaded beside it. */
function machineWith(voiceIds: string[], engine = true): string {
  const root = mkdtempSync(resolve(tmpdir(), "vaenyx-localtts-"));
  directories.push(root);
  const data = join(root, "db");
  mkdirSync(data, { recursive: true });
  const tts = join(root, "tts");
  if (engine) {
    mkdirSync(join(tts, "piper"), { recursive: true });
    writeFileSync(join(tts, "piper", "piper.exe"), "");
  }
  mkdirSync(join(tts, "voices"), { recursive: true });
  for (const id of voiceIds) {
    writeFileSync(join(tts, "voices", `${id}.onnx`), "");
  }
  return data;
}

describe("the local voice knows what is really on disk", () => {
  it("counts as installed with the engine and any one voice", () => {
    expect(isLocalTtsInstalled(machineWith([DEFAULT_EN_VOICE]))).toBe(true);
  });

  it("stays installed when the default Chinese voice is NOT the one downloaded", () => {
    // Exactly the state that broke: huayan on disk, chaowen the default.
    const data = machineWith(["zh_CN-huayan-medium", DEFAULT_EN_VOICE]);
    expect(isLocalTtsInstalled(data)).toBe(true);
    expect(firstDownloadedVoice(data, "zh")).toBe("zh_CN-huayan-medium");
  });

  it("is not installed without the engine, whatever is downloaded", () => {
    expect(isLocalTtsInstalled(machineWith([DEFAULT_ZH_VOICE], false))).toBe(
      false,
    );
  });

  it("is not installed with the engine and no voices at all", () => {
    expect(isLocalTtsInstalled(machineWith([]))).toBe(false);
  });

  it("prefers the asked-for voice, but only if it is downloaded", () => {
    const data = machineWith(["zh_CN-huayan-medium", DEFAULT_ZH_VOICE]);
    expect(firstDownloadedVoice(data, "zh", DEFAULT_ZH_VOICE)).toBe(
      DEFAULT_ZH_VOICE,
    );
    expect(firstDownloadedVoice(data, "zh", "zh_CN-not-downloaded")).toBe(
      DEFAULT_ZH_VOICE,
    );
  });

  it("will not answer with a voice of the wrong language", () => {
    const data = machineWith([DEFAULT_EN_VOICE]);
    expect(firstDownloadedVoice(data, "zh")).toBeNull();
    expect(firstDownloadedVoice(data, "zh", DEFAULT_EN_VOICE)).toBeNull();
  });
});
