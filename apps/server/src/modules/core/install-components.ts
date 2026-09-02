// One installer per component name, and nothing else. Kept apart from
// wanted-components.ts so that file stays about the LIST — read it, work
// through it, never let it stop a boot — while this one is only about which
// existing function does which job.
//
// Every one of these already existed before the component page did. That is
// the point: the page chooses, it does not implement.
import { ensureCodexInstalled } from "../harness/codex.js";
import { ensureClaudeSdkInstalled } from "../models/claude-sdk.js";
import { findTailscaleCommand, installTailscale } from "./phone-access.js";
import { getLocalTtsStatus, startLocalTtsInstall } from "./voice-local.js";
import type {
  ComponentId,
  ComponentInstallReport,
  ComponentOutcome,
} from "./wanted-components.js";

/**
 * Two of these start the work and report it through a state object rather than
 * a promise. Waiting on the state is the honest way to know they finished —
 * and the cap matters: a download that never settles must not leave the list
 * stuck on it for ever, because the components after it would never be tried.
 */
async function waitUntilSettled(options: {
  finished: () => ComponentOutcome | null;
  timeoutMs: number;
}): Promise<ComponentOutcome> {
  const deadline = Date.now() + options.timeoutMs;
  for (;;) {
    const outcome = options.finished();
    if (outcome) return outcome;
    if (Date.now() > deadline) return "failed";
    await new Promise((done) => {
      const timer = setTimeout(done, 2000);
      timer.unref?.();
    });
  }
}

const HALF_AN_HOUR = 30 * 60_000;

export async function installWantedComponent(
  id: ComponentId,
  dataDirectory: string,
): Promise<ComponentInstallReport> {
  if (id === "codex") {
    const result = await ensureCodexInstalled();
    if (result.status === "ready") return "skipped";
    return result.status === "installed"
      ? "installed"
      : { outcome: "failed", ownerError: result.ownerError };
  }

  if (id === "claude") {
    const result = await ensureClaudeSdkInstalled(dataDirectory);
    if (result.status === "ready") return "skipped";
    return result.status === "installed"
      ? "installed"
      : { outcome: "failed", ownerError: result.ownerError };
  }

  if (id === "tailscale") {
    // Already there (a reinstall, or the household had it anyway).
    if (findTailscaleCommand()) return "skipped";
    installTailscale();
    return waitUntilSettled({
      finished: () => {
        // The command appearing is the only proof that counts: winget can
        // report all sorts of things and still not have put it on the disk.
        if (findTailscaleCommand()) return "installed";
        return null;
      },
      timeoutMs: HALF_AN_HOUR,
    });
  }

  // A voice. The engine is shared, so asking for the second language after
  // the first only fetches the 60 MB voice.
  const language = id === "voice-zh" ? "zh" : "en";
  const before = getLocalTtsStatus(dataDirectory);
  const already = before.voices.some(
    (voice) => voice.lang === language && voice.downloaded,
  );
  if (already && before.installed) return "skipped";
  startLocalTtsInstall(dataDirectory, [language]);
  return waitUntilSettled({
    finished: () => {
      const status = getLocalTtsStatus(dataDirectory);
      if (status.status === "downloading") return null;
      const arrived = status.voices.some(
        (voice) => voice.lang === language && voice.downloaded,
      );
      return arrived && status.installed ? "installed" : "failed";
    },
    timeoutMs: HALF_AN_HOUR,
  });
}
