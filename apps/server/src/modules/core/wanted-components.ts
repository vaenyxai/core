// WHAT THE INSTALLER WAS ASKED TO FETCH, fetched here rather than there.
//
// The installer's component page is five tick boxes and a running total. It
// does not download any of them. It writes what was ticked into
// userdata/config/wanted-components.json, and this runs through the list on
// the first boot afterwards.
//
// That split is deliberate, and it is worth stating because the obvious
// arrangement is the other one:
//
//   • EVERY ONE of these downloads already exists here, written once and
//     tested — the ChatGPT component, the Claude component, Tailscale, the
//     speech engine and its voices. Doing them in the installer would mean a
//     second implementation of each, in Pascal, that nothing else exercises.
//   • "A component that will not install must never fail the install" becomes
//     structural instead of careful: the installer never touches the network,
//     so there is nothing there to fail.
//   • The person watches real progress in Vaenyx's own first-run screen,
//     in their own language, instead of a frozen progress bar in a window
//     that cannot say what it is doing.
//
// Nothing here throws. A component that will not arrive leaves a line saying
// so and the rest of Vaenyx is untouched — which is the whole promise the
// component page makes when it says a tick is optional.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const COMPONENT_IDS = [
  "claude",
  "codex",
  "tailscale",
  "voice-en",
  "voice-zh",
] as const;

export type ComponentId = (typeof COMPONENT_IDS)[number];

export type ComponentOutcome = "installed" | "failed" | "skipped";

export interface ComponentProgress {
  /** What is happening right now, for the first-run screen. */
  current: ComponentId | null;
  done: { id: ComponentId; outcome: ComponentOutcome }[];
  wanted: ComponentId[];
}

const progress: ComponentProgress = { current: null, done: [], wanted: [] };

export function wantedComponentsFile(dataDirectory: string): string {
  return resolve(dataDirectory, "..", "config", "wanted-components.json");
}

export function componentProgress(): ComponentProgress {
  return {
    current: progress.current,
    done: [...progress.done],
    wanted: [...progress.wanted],
  };
}

/** Only names we know. Anything else in the file is ignored rather than
 *  trusted — the file is written by the installer, but it is still a file on
 *  disk that something else could have edited. */
export function parseWantedComponents(text: string): ComponentId[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  const list = Array.isArray(parsed)
    ? parsed
    : ((parsed as { components?: unknown })?.components ?? []);
  if (!Array.isArray(list)) return [];
  const wanted: ComponentId[] = [];
  for (const entry of list) {
    const id = String(entry).trim().toLowerCase();
    if (
      (COMPONENT_IDS as readonly string[]).includes(id) &&
      !wanted.includes(id as ComponentId)
    ) {
      wanted.push(id as ComponentId);
    }
  }
  return wanted;
}

export function writeWantedComponents(
  dataDirectory: string,
  components: ComponentId[],
): void {
  const file = wantedComponentsFile(dataDirectory);
  mkdirSync(resolve(file, ".."), { recursive: true });
  writeFileSync(file, JSON.stringify({ components }, null, 2), "utf8");
}

/**
 * Read the request and start on it. Returns the list it will work through, so
 * the caller can log what a fresh install was asked for.
 *
 * The file is renamed aside BEFORE anything is downloaded, not after: a
 * component that crashes the process on one boot must not be retried for ever
 * on every boot after it. Whatever did not finish is still reachable the
 * ordinary way — every one of these has a button in Settings.
 */
export function startWantedComponents(options: {
  dataDirectory: string;
  install: (id: ComponentId) => Promise<ComponentOutcome>;
  onDone?: (results: ComponentProgress) => void;
}): ComponentId[] {
  const file = wantedComponentsFile(options.dataDirectory);
  if (!existsSync(file)) return [];
  let wanted: ComponentId[] = [];
  try {
    wanted = parseWantedComponents(readFileSync(file, "utf8"));
  } catch {
    wanted = [];
  }
  try {
    renameSync(file, `${file}.done`);
  } catch {
    // Could not set it aside — do nothing rather than risk a boot loop.
    return [];
  }
  if (wanted.length === 0) return [];

  progress.wanted = [...wanted];
  progress.done = [];
  void (async () => {
    for (const id of wanted) {
      progress.current = id;
      let outcome: ComponentOutcome;
      try {
        outcome = await options.install(id);
      } catch {
        // A component that throws is a component that did not arrive, and
        // that is all the rest of the list needs to know.
        outcome = "failed";
      }
      progress.done.push({ id, outcome });
    }
    progress.current = null;
    options.onDone?.(componentProgress());
  })();
  return wanted;
}
