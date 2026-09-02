// Update Now (onboarding spec section 5 v2). A user who installed from the
// zip has no git, so the old pull-based updater cannot help them.
//
// The safety model matters more than the feature:
//   * while Vaenyx runs, we only LOOK and DOWNLOAD - nothing on disk that the
//     running server needs is touched;
//   * the download is verified against the SHA-256 published beside it, and
//     sanity-checked for the files an install cannot boot without;
//   * the actual swap happens after the server has exited, from the watchdog,
//     with a rollback snapshot taken first (scripts/Vaenyx-Apply-Update.ps1).
// So a failed or interrupted update can never leave a half-written install
// behind the user's back.
import { createHash } from "node:crypto";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { rename } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import type { UpdateStatus } from "@vaenyx/contracts";
import { ownerSafeErrorText } from "../../runtime/owner-safe-errors.js";
import { pushLanguage } from "./push.js";

// Overridable so the whole update path (check, download, checksum, unpack,
// stage) can be rehearsed against a local stand-in release before a real one
// exists. Unset in normal use.
const RELEASE_API =
  process.env.VAENYX_UPDATE_API ??
  "https://api.github.com/repos/vaenyxai/core/releases/latest";
const ASSET_NAME = "vaenyx-setup.zip";
const HASH_ASSET_NAME = "vaenyx-setup.zip.sha256";

// Files a package must contain before we are willing to swap it in.
const REQUIRED_ENTRIES = [
  "package.json",
  "package-lock.json",
  "apps/server/migrations",
  "Vaenyx-Service-Run.cmd",
];

interface UpdateState {
  phase: UpdateStatus["phase"];
  detail: string | null;
  availableVersion: string | null;
  notes: string | null;
}

const state: UpdateState = {
  phase: "idle",
  detail: null,
  availableVersion: null,
  notes: null,
};

// "0.2.0-dev.174" / "v0.2.0" -> comparable parts. A release tag is always
// newer than the same numbers with a -dev suffix.
export function compareVersions(left: string, right: string): number {
  const parse = (value: string) => {
    const cleaned = value.trim().replace(/^v/i, "");
    const [core, ...rest] = cleaned.split("-");
    const numbers = (core ?? "")
      .split(".")
      .map((part) => Number.parseInt(part, 10) || 0);
    const preRelease = rest.join("-");
    return { numbers, preRelease };
  };
  const a = parse(left);
  const b = parse(right);
  // FOUR segments, not three (Oskar, 2026-08-09). The build number is the
  // fourth: 0.4.0.8 is the eighth build of 0.4.0, and a release bumps the
  // third and resets it (0.4.1.0). Comparing only three would have made every
  // build of the same release compare EQUAL, so "there is a newer version"
  // would have answered no to all of them.
  for (let index = 0; index < 4; index += 1) {
    const difference = (a.numbers[index] ?? 0) - (b.numbers[index] ?? 0);
    if (difference !== 0) return difference > 0 ? 1 : -1;
  }
  if (a.preRelease === b.preRelease) return 0;
  // No suffix (a real release) beats any -dev/-rc suffix.
  if (!a.preRelease) return 1;
  if (!b.preRelease) return -1;
  return a.preRelease > b.preRelease ? 1 : -1;
}

export function isDeveloperInstall(repositoryRoot: string): boolean {
  return existsSync(resolve(repositoryRoot, ".git"));
}

export function getUpdateStatus(
  currentVersion: string,
  repositoryRoot: string,
  dataDirectory?: string,
): UpdateStatus {
  const developerInstall = isDeveloperInstall(repositoryRoot);
  let persistedResult: { message?: unknown; phase?: unknown } | null = null;
  if (dataDirectory) {
    try {
      persistedResult = JSON.parse(
        readFileSync(
          resolve(dataDirectory, "..", "config", "update-result.json"),
          "utf8",
        ),
      ) as { message?: unknown; phase?: unknown };
    } catch {
      persistedResult = null;
    }
  }
  const persistedMessage =
    typeof persistedResult?.message === "string"
      ? persistedResult.message
      : null;
  const persistedFailure =
    persistedResult?.phase === "rolled-back" ||
    persistedResult?.phase === "error";
  const updateAvailable = Boolean(
    !developerInstall &&
    state.availableVersion &&
    compareVersions(state.availableVersion, currentVersion) > 0,
  );
  return {
    currentVersion,
    availableVersion: state.availableVersion,
    updateAvailable,
    phase: state.phase === "idle" && persistedFailure ? "error" : state.phase,
    detail: state.detail ?? persistedMessage,
    notes: state.notes,
    developerInstall,
  };
}

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface ReleaseInfo {
  tag_name: string;
  body?: string;
  assets?: ReleaseAsset[];
}

async function fetchLatestRelease(): Promise<ReleaseInfo> {
  const response = await fetch(RELEASE_API, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "vaenyx-updater",
    },
  });
  if (response.status === 404) {
    throw new Error("UPDATE_NO_RELEASE");
  }
  if (!response.ok) {
    throw new Error(`UPDATE_CHECK_FAILED:${response.status}`);
  }
  return (await response.json()) as ReleaseInfo;
}

export async function checkForUpdate(
  currentVersion: string,
  repositoryRoot: string,
  dataDirectory?: string,
): Promise<UpdateStatus> {
  // Do not even ask GitHub on a git checkout: this copy cannot take a release
  // package, so a "new version available" would be a lie with a broken button
  // attached.
  if (isDeveloperInstall(repositoryRoot)) {
    state.phase = "idle";
    state.detail =
      "This copy of Vaenyx is managed with git, so it updates with git pull.";
    return getUpdateStatus(currentVersion, repositoryRoot, dataDirectory);
  }
  state.phase = "checking";
  state.detail = null;
  try {
    const release = await fetchLatestRelease();
    state.availableVersion = release.tag_name.replace(/^v/i, "");
    state.notes = release.body?.slice(0, 2000) ?? null;
    state.phase = "idle";
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "UPDATE_NO_RELEASE") {
      // Not an error: there is simply nothing published yet.
      state.phase = "idle";
      state.detail = "No published release to update to yet.";
    } else {
      state.phase = "error";
      state.detail = ownerSafeErrorText(
        error,
        "update-launch",
        pushLanguage(),
      ).text;
    }
  }
  return getUpdateStatus(currentVersion, repositoryRoot, dataDirectory);
}

async function downloadTo(url: string, destination: string): Promise<void> {
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": "vaenyx-updater" },
  });
  if (!response.ok || !response.body) {
    throw new Error(`UPDATE_DOWNLOAD_FAILED:${response.status}`);
  }
  const partial = `${destination}.part`;
  await pipeline(
    Readable.fromWeb(response.body as import("node:stream/web").ReadableStream),
    createWriteStream(partial),
  );
  await rename(partial, destination);
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

// Unzip with the tar.exe that ships with Windows 10+ (also present on the
// Linux CI image), so there is no new dependency for one archive.
function extract(zipPath: string, into: string): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    mkdirSync(into, { recursive: true });
    const child = spawn("tar", ["-xf", zipPath, "-C", into], {
      stdio: "ignore",
    });
    child.on("error", rejectPromise);
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(`UPDATE_EXTRACT_FAILED:${code}`));
    });
  });
}

// Download, verify and stage the newest release. Returns once the package is
// ready to be applied; the caller restarts, and the watchdog applies it.
export async function stageUpdate(config: {
  dataDirectory: string;
  version: string;
  repositoryRoot: string;
}): Promise<UpdateStatus> {
  if (state.phase === "downloading" || state.phase === "staged") {
    return getUpdateStatus(
      config.version,
      config.repositoryRoot,
      config.dataDirectory,
    );
  }
  // A developer install is managed by git, and a zip update would fight with
  // it - overwriting tracked files and quietly burying uncommitted work. Say
  // so instead of doing damage.
  if (existsSync(resolve(config.repositoryRoot, ".git"))) {
    state.phase = "error";
    state.detail =
      "This copy of Vaenyx is managed with git, so it updates with git pull instead. Downloading a release over it would overwrite your working copy.";
    return getUpdateStatus(
      config.version,
      config.repositoryRoot,
      config.dataDirectory,
    );
  }
  state.phase = "downloading";
  state.detail = "Downloading the update...";
  rmSync(resolve(config.dataDirectory, "..", "config", "update-result.json"), {
    force: true,
  });

  const updatesRoot = resolve(config.dataDirectory, "..", "updates");
  const stagedRoot = resolve(updatesRoot, "staged");
  const zipPath = resolve(updatesRoot, ASSET_NAME);
  try {
    const release = await fetchLatestRelease();
    state.availableVersion = release.tag_name.replace(/^v/i, "");
    if (compareVersions(state.availableVersion, config.version) <= 0) {
      state.phase = "idle";
      state.detail = "Already up to date.";
      return getUpdateStatus(
        config.version,
        config.repositoryRoot,
        config.dataDirectory,
      );
    }
    const asset = release.assets?.find((item) => item.name === ASSET_NAME);
    if (!asset) {
      throw new Error("UPDATE_NO_ASSET");
    }

    rmSync(updatesRoot, { recursive: true, force: true });
    mkdirSync(updatesRoot, { recursive: true });
    await downloadTo(asset.browser_download_url, zipPath);

    // Verify against the hash published beside the package. A release
    // without one is refused rather than trusted.
    const hashAsset = release.assets?.find(
      (item) => item.name === HASH_ASSET_NAME,
    );
    if (!hashAsset) {
      throw new Error("UPDATE_NO_HASH");
    }
    const hashPath = resolve(updatesRoot, HASH_ASSET_NAME);
    await downloadTo(hashAsset.browser_download_url, hashPath);
    const expected =
      readFileSync(hashPath, "utf8").trim().split(/\s+/)[0] ?? "";
    const actual = sha256(zipPath);
    if (!expected || expected.toLowerCase() !== actual.toLowerCase()) {
      throw new Error("UPDATE_HASH_MISMATCH");
    }

    state.detail = "Checking the download...";
    await extract(zipPath, stagedRoot);
    // The package wraps everything in a single "Vaenyx" folder.
    const payload = resolve(stagedRoot, "Vaenyx");
    const base = existsSync(payload) ? payload : stagedRoot;
    for (const entry of REQUIRED_ENTRIES) {
      if (!existsSync(resolve(base, ...entry.split("/")))) {
        throw new Error(`UPDATE_INCOMPLETE:${entry}`);
      }
    }

    // The apply step runs from the watchdog, after this server has exited.
    const configDirectory = resolve(config.dataDirectory, "..", "config");
    mkdirSync(configDirectory, { recursive: true });
    writeFileSync(
      resolve(configDirectory, "update-pending.json"),
      `${JSON.stringify(
        { version: state.availableVersion, source: base },
        null,
        2,
      )}\n`,
    );
    rmSync(zipPath, { force: true });

    state.phase = "staged";
    state.detail =
      "Ready to install. Vaenyx will restart and finish the update.";
  } catch (error) {
    rmSync(updatesRoot, { recursive: true, force: true });
    state.phase = "error";
    state.detail = ownerSafeErrorText(
      error,
      "update-launch",
      pushLanguage(),
    ).text;
  }
  return getUpdateStatus(
    config.version,
    config.repositoryRoot,
    config.dataDirectory,
  );
}
