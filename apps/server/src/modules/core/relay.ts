// THE SUBSCRIPTION DOOR (Oskar, 2026-07-29). His apps live on Cloudflare and
// can only reach free models; his paid ChatGPT and Claude subscriptions can
// only be used by a machine that runs their CLIs. Vaenyx is that machine, so it
// opens a door: an app hands in a request, Vaenyx does the work on one of the
// two subscriptions and hands back the answer.
//
// What this door IS, exactly — the boundary Oskar drew and the reason the code
// stays small:
//   * It exposes TWO LOGINS, nothing else: openai-cli (Codex) and claude-cli.
//     The caller names the one it wants. It has no bearing on which model
//     Vaenyx itself is using, so changing that setting cannot surprise an app.
//   * It offers TWO of the five capabilities — text and image-in (a picture or
//     a PDF). Neither subscription does voice or image generation; health says
//     so plainly rather than letting an app light up a button that will fail.
//   * It NEVER falls back to another model. The failure that matters most is
//     the whole machine being off, and a machine that is off cannot fall back
//     to anything — so falling back is the caller's job, and this door's job is
//     to be honest about why it could not help.
//   * Files arrive as short-lived links and are fetched here, used, and deleted.
//     Nothing a customer sent is left on this machine, and the log keeps only
//     what happened, never what was in it.
import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import type { DatabaseHandle } from "../../db/database.js";
import {
  codexLoginConnectedAt,
  codexProfileSignedIn,
  runCodexRelay,
} from "../harness/codex.js";
import {
  claudeLoginConnectedAt,
  claudeMachineLogin,
} from "../models/claude-login.js";
import { claudeSubscriptionRelay } from "../models/claude-subscription-provider.js";

import {
  capabilityOff,
  decideTokenCapabilities,
  readProfileCapabilities,
} from "./capabilities.js";
import { runOcr } from "./ocr.js";
import { recordEngineUsage } from "./relay-usage.js";

export const RELAY_ENGINES = ["openai-cli", "claude-cli"] as const;
export type RelayEngine = (typeof RELAY_ENGINES)[number];

// The names the whole system uses for what a model can do. The door serves
// text, web, vision, reading and ocr; the rest belong to engines that are not
// these two subscriptions (voice runs on Groq or a local Whisper, pictures
// come out of Cloudflare), so they are reported unsupported rather than
// quietly missing.
export const RELAY_CAPABILITIES = [
  "text",
  "web",
  "hearing",
  "speaking",
  "vision",
  "reading",
  "ocr",
  "drawing",
] as const;
export type RelayCapability = (typeof RELAY_CAPABILITIES)[number];

// Split now that the vocabulary distinguishes them: Claude reads a PDF itself,
// Codex takes pictures only — so a caller sending a PDF to Codex must turn its
// pages into images first, which is what the hand-off prompt already says.
// `web` is a text call that may search the live internet; both subscriptions
// can do it, and whether a given KEY may is a per-key grant, not this table.
const ENGINE_CAPABILITIES: Record<RelayEngine, RelayCapability[]> = {
  "openai-cli": ["text", "vision", "web"],
  "claude-cli": ["text", "vision", "reading", "web"],
};

// What a call may ASK FOR, per engine (Oskar, 2026-08-30): a reasoning-effort
// tier, valid for that one call, enforced at the codex lane's spawn flags.
// Claude's single-turn relay has no equivalent knob, so its list is empty and
// health says so rather than accepting a field that would do nothing.
//
// The model list is EMPTY on purpose (2026-08-31, live-verified): spawning the
// relay's app-server with any --config model="…" — including the working
// default's own id — made every turn come back with no answer, so until that
// is understood no model override is offered. The field and its whitelist
// check stay wired; filling this list is the whole change when a variant
// verifies.
export const RELAY_EFFORTS = ["low", "medium", "high"] as const;
export const RELAY_CODEX_MODELS = [] as const;

function engineEfforts(engine: RelayEngine): string[] {
  return engine === "openai-cli" ? [...RELAY_EFFORTS] : [];
}

function engineModels(engine: RelayEngine): string[] {
  return engine === "openai-cli" ? [...RELAY_CODEX_MODELS] : [];
}

// The one capability whose presence in health depends on WHO is asking: an
// engine "supports" web for every key, but a caller reads health to light its
// own buttons, and a lit button the run would refuse is worse than none — the
// same reasoning that made `signedIn` per-profile. Same two layers as the run
// itself: the machine's ceiling, then the key's own grant list.
function webGranted(database: DatabaseHandle, profileId: string): boolean {
  return (
    !capabilityOff(database, "web") &&
    decideTokenCapabilities(
      database,
      ["web"],
      readProfileCapabilities(database, profileId),
    ).allowed.includes("web")
  );
}

function engineCapabilitiesFor(
  engine: RelayEngine,
  webAllowed: boolean,
): RelayCapability[] {
  return webAllowed
    ? ENGINE_CAPABILITIES[engine]
    : ENGINE_CAPABILITIES[engine].filter((capability) => capability !== "web");
}

export interface RelayConfig {
  enabled: boolean;
  // Hosts a download link may point at. Without this, anyone holding a token
  // could make this machine fetch any address it can reach.
  fileHosts: string[];
  maxFiles: number;
  maxFileBytes: number;
  maxTotalBytes: number;
  timeoutSeconds: number;
}

export const DEFAULT_RELAY_CONFIG: RelayConfig = {
  enabled: false,
  fileHosts: [],
  maxFiles: 5,
  maxFileBytes: 25 * 1024 * 1024,
  maxTotalBytes: 60 * 1024 * 1024,
  timeoutSeconds: 180,
};

const CONFIG_KEY = "relay.config";

export function readRelayConfig(database: DatabaseHandle): RelayConfig {
  const row = database.sqlite
    .prepare("SELECT value FROM instance_settings WHERE key = ?")
    .get(CONFIG_KEY) as { value?: string } | undefined;
  if (!row?.value) return { ...DEFAULT_RELAY_CONFIG };
  try {
    const stored = JSON.parse(row.value) as Partial<RelayConfig>;
    return { ...DEFAULT_RELAY_CONFIG, ...stored };
  } catch {
    return { ...DEFAULT_RELAY_CONFIG };
  }
}

export function writeRelayConfig(
  database: DatabaseHandle,
  changes: Partial<RelayConfig>,
): RelayConfig {
  const next: RelayConfig = { ...readRelayConfig(database), ...changes };
  next.fileHosts = [
    ...new Set(
      next.fileHosts.map((host) => host.trim().toLowerCase()).filter(Boolean),
    ),
  ];
  next.maxFiles = Math.min(20, Math.max(0, Math.round(next.maxFiles)));
  next.maxFileBytes = Math.min(
    200 * 1024 * 1024,
    Math.max(0, Math.round(next.maxFileBytes)),
  );
  next.maxTotalBytes = Math.min(
    400 * 1024 * 1024,
    Math.max(0, Math.round(next.maxTotalBytes)),
  );
  next.timeoutSeconds = Math.min(600, Math.max(10, Math.round(next.timeoutSeconds)));
  database.sqlite
    .prepare(
      `INSERT INTO instance_settings (key, value, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value,
                                      updated_at = CURRENT_TIMESTAMP`,
    )
    .run(CONFIG_KEY, JSON.stringify(next));
  return next;
}

export interface RelayHealth {
  on: boolean;
  engines: {
    id: RelayEngine;
    signedIn: boolean;
    capabilities: RelayCapability[];
    // What a call may ask for on this engine, so a caller can build its
    // dropdowns from the door's own answer. Empty = not selectable here.
    efforts: string[];
    models: string[];
  }[];
  limits: {
    maxFiles: number;
    maxFileBytes: number;
    maxTotalBytes: number;
    timeoutSeconds: number;
  };
}

// Health answers for the CALLING key's own profile (phase two, 2026-08-06):
// "signed in" used to mean Vaenyx's machine logins, which since the fallback
// was removed have no bearing on any app's calls — a health check that lights
// a button the run would refuse is worse than none. Cheap by construction:
// both checks are a file-stat in the profile's own directory.
export function relayHealth(
  database: DatabaseHandle,
  profileId: string,
): RelayHealth {
  const config = readRelayConfig(database);
  const webAllowed = webGranted(database, profileId);
  return {
    on: config.enabled,
    engines: [
      {
        id: "openai-cli",
        signedIn: codexProfileSignedIn(profileId),
        capabilities: engineCapabilitiesFor("openai-cli", webAllowed),
        efforts: engineEfforts("openai-cli"),
        models: engineModels("openai-cli"),
      },
      {
        id: "claude-cli",
        signedIn: claudeMachineLogin(profileId),
        capabilities: engineCapabilitiesFor("claude-cli", webAllowed),
        efforts: engineEfforts("claude-cli"),
        models: engineModels("claude-cli"),
      },
    ],
    limits: {
      maxFiles: config.maxFiles,
      maxFileBytes: config.maxFileBytes,
      maxTotalBytes: config.maxTotalBytes,
      timeoutSeconds: config.timeoutSeconds,
    },
  };
}

export interface RelayFileRequest {
  name: string;
  url: string;
}

export interface RelayRunRequest {
  task: string;
  prompt: string;
  engine: RelayEngine;
  capability: RelayCapability;
  // Self-declared and IGNORED since phase two: the key is the identity, and a
  // field anyone can type is not. Still accepted on the wire so a v1 client
  // keeps working unchanged.
  caller?: string;
  files: RelayFileRequest[];
  // Which app key knocked. Always set — the shared door key retired in phase
  // two, so there is no callerless path left.
  appProfileId: string;
  // Per-call knobs (2026-08-30): a reasoning-effort tier and a model
  // override, valid for this one call only. Checked against the engine's own
  // whitelist — an illegal value is refused echoing the caller's word.
  effort?: string;
  model?: string;
}

export interface RelayRunResult {
  text: string;
  engine: RelayEngine;
  model: string;
  ms: number;
}

function mediaTypeFor(name: string, headerType: string | null): string {
  const clean = (headerType ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  if (clean.startsWith("image/") || clean === "application/pdf") return clean;
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

// Fetch the linked files into a scratch folder. Everything about this is
// bounded: which hosts, how many, how big each, how big in total, how long.
// Over any limit is an error the caller can read, never a silent truncation.
async function fetchLinkedFiles(
  files: RelayFileRequest[],
  config: RelayConfig,
  directory: string,
): Promise<{ path: string; base64: string; mediaType: string }[]> {
  if (files.length > config.maxFiles) throw new Error("RELAY_TOO_MANY_FILES");
  const fetched: { path: string; base64: string; mediaType: string }[] = [];
  let total = 0;

  for (const file of files) {
    let host: string;
    try {
      const parsed = new URL(file.url);
      if (parsed.protocol !== "https:") throw new Error("insecure");
      host = parsed.hostname.toLowerCase();
    } catch {
      throw new Error("RELAY_HOST_NOT_ALLOWED:unparseable");
    }
    const allowed = config.fileHosts.some(
      (entry) => host === entry || host.endsWith(`.${entry}`),
    );
    if (!allowed) throw new Error(`RELAY_HOST_NOT_ALLOWED:${host}`);

    let response: Response;
    try {
      response = await fetch(file.url, {
        redirect: "follow",
        signal: AbortSignal.timeout(config.timeoutSeconds * 1000),
      });
    } catch (error) {
      throw new Error(`RELAY_FETCH_FAILED:${host}`, { cause: error });
    }
    if (!response.ok) {
      throw new Error(`RELAY_FETCH_FAILED:${response.status}`);
    }
    const declared = Number(response.headers.get("content-length") ?? "0");
    if (declared > config.maxFileBytes) throw new Error("RELAY_FILE_TOO_LARGE");

    const body = Buffer.from(await response.arrayBuffer());
    if (body.byteLength > config.maxFileBytes) {
      throw new Error("RELAY_FILE_TOO_LARGE");
    }
    total += body.byteLength;
    if (total > config.maxTotalBytes) throw new Error("RELAY_TOTAL_TOO_LARGE");

    const path = resolve(directory, `${randomUUID()}-${file.name.slice(-60)}`);
    writeFileSync(path, body);
    fetched.push({
      path,
      base64: body.toString("base64"),
      mediaType: mediaTypeFor(file.name, response.headers.get("content-type")),
    });
  }
  return fetched;
}

// What one profile's door looks like from the app's side. No credential, no
// token, no export of any kind — connected or not, and the account file's own
// timestamp. A leaked app key must not be exchangeable for anything that signs
// in somewhere else.
//
// There is no shared-door mode any more (Oskar, 2026-08-02): a profile's calls
// ride the profile's own login, full stop. An engine the app has not connected
// is a clear "not connected" — never Vaenyx's own account by proxy. The `mode`
// field survives on the wire, always "dedicated", so a client written against
// v1 does not break parsing; it says one true thing and will go in v2.
export interface RelayProfileEngineStatus {
  id: RelayEngine;
  connected: boolean;
  connectedAt: string | null;
  capabilities: RelayCapability[];
  efforts: string[];
  models: string[];
}

export function relayProfileEngineStatus(
  database: DatabaseHandle,
  profileId: string,
): {
  mode: "dedicated";
  engines: RelayProfileEngineStatus[];
} {
  // Same per-key rule as relayHealth: `web` appears only for a key that was
  // granted it, so the two answers a calling app might read cannot disagree.
  const webAllowed = webGranted(database, profileId);
  return {
    mode: "dedicated",
    engines: [
      {
        id: "openai-cli",
        connected: codexProfileSignedIn(profileId),
        connectedAt: codexLoginConnectedAt(profileId),
        capabilities: engineCapabilitiesFor("openai-cli", webAllowed),
        efforts: engineEfforts("openai-cli"),
        models: engineModels("openai-cli"),
      },
      {
        id: "claude-cli",
        connected: claudeMachineLogin(profileId),
        connectedAt: claudeLoginConnectedAt(profileId),
        capabilities: engineCapabilitiesFor("claude-cli", webAllowed),
        efforts: engineEfforts("claude-cli"),
        models: engineModels("claude-cli"),
      },
    ],
  };
}

export async function runRelay(
  database: DatabaseHandle,
  secretsDirectory: string,
  request: RelayRunRequest,
): Promise<RelayRunResult> {
  const config = readRelayConfig(database);
  if (!config.enabled) throw new Error("RELAY_OFF");

  // OCR does not ride either subscription: it runs on Vaenyx's dedicated OCR
  // engine whatever `engine` the caller named, because a chat model used as
  // OCR invents characters — the engine field still authenticates the caller's
  // intent, it just is not consulted for this capability.
  if (
    request.capability !== "ocr" &&
    !ENGINE_CAPABILITIES[request.engine].includes(request.capability)
  ) {
    throw new Error(
      `RELAY_CAPABILITY_UNSUPPORTED:${request.engine}:${request.capability}`,
    );
  }
  // "Out of reach of every app key" is what the Capabilities card promises,
  // and an outside app asking this machine to look at a picture is an app key
  // asking. Refused before the linked file is fetched: a capability that is
  // switched off should not pull the customer's file onto this disk at all.
  // `text` is not one of the eight — it is the door itself. `web` IS one of
  // the eight, and the sternest of them: it can turn this machine into
  // somebody else's proxy, so it rides the same two-layer check and its grant
  // additionally required the Owner's own separate approval when it was made.
  //
  // Two layers here: the machine's ceiling, then the key's own grant list. No
  // mode layer, deliberately — a relay call arrives from another program over
  // the network, not from a browser session, so there is no mode it could be
  // inside.
  if (request.capability !== "text") {
    if (capabilityOff(database, request.capability)) {
      throw new Error(`RELAY_CAPABILITY_OFF:${request.capability}`);
    }
    if (
      !decideTokenCapabilities(
        database,
        [request.capability],
        readProfileCapabilities(database, request.appProfileId),
      ).allowed.includes(request.capability)
    ) {
      throw new Error(`RELAY_CAPABILITY_NOT_GRANTED:${request.capability}`);
    }
  }

  // Per-call effort/model, validated against the ENGINE's own whitelist and
  // refused echoing the caller's word — never accepted-and-ignored. Claude's
  // lists are empty on purpose (no equivalent knob), so any value sent for
  // it is refused the same way.
  if (
    request.effort !== undefined &&
    !engineEfforts(request.engine).includes(request.effort)
  ) {
    throw new Error(
      `RELAY_EFFORT_INVALID:${request.engine}:${request.effort}`,
    );
  }
  if (
    request.model !== undefined &&
    !engineModels(request.engine).includes(request.model)
  ) {
    throw new Error(`RELAY_MODEL_INVALID:${request.engine}:${request.model}`);
  }

  // The call rides the profile's own login, nothing else. The shared door
  // key — the last path that used Vaenyx's own credentials here — retired in
  // phase two.
  const profileKey = request.appProfileId;

  const started = Date.now();
  const scratch = resolve(tmpdir(), "vaenyx-relay", randomUUID());
  mkdirSync(scratch, { recursive: true });
  try {
    const files = await fetchLinkedFiles(request.files, config, scratch);
    const attachment = files[0];
    if (
      (request.capability === "vision" ||
        request.capability === "reading" ||
        request.capability === "ocr") &&
      !attachment
    ) {
      throw new Error("RELAY_NO_FILE");
    }

    // The OCR lane: the linked picture or scan goes to the dedicated engine
    // and the words come back — no subscription is touched. Granted per key
    // like everything else (an app sending a scanned quote to be read is a
    // legitimate ask, unlike fetching, which no key ever gets).
    if (request.capability === "ocr" && attachment) {
      const ocr = await runOcr(secretsDirectory, {
        base64: attachment.base64,
        mediaType: attachment.mediaType,
      });
      recordEngineUsage(database, request.appProfileId, "mistral-ocr");
      return {
        text: ocr.text,
        engine: request.engine,
        model: "mistral-ocr",
        ms: Date.now() - started,
      };
    }

    // Counted before the engine answers: a failed call still hit the
    // subscription, and "which app spent this" must include the failures.
    recordEngineUsage(database, request.appProfileId, request.engine);

    // A `web` call is a text call whose engine child is allowed the ONE extra
    // tool, live web search — decided here, enforced inside each engine
    // (separate session lane / tool allow-list), never by prompt alone.
    const allowWeb = request.capability === "web";
    const text =
      request.engine === "claude-cli"
        ? await claudeSubscriptionRelay(
            secretsDirectory,
            request.prompt,
            attachment
              ? { base64: attachment.base64, mediaType: attachment.mediaType }
              : undefined,
            profileKey,
            allowWeb,
          )
        : await runCodexRelay(
            request.prompt,
            // Codex reads a picture from a path. It has no document channel, so
            // a PDF has to arrive as pictures of its pages — which is exactly
            // what the calling app is asked to send.
            attachment && attachment.mediaType.startsWith("image/")
              ? attachment.path
              : undefined,
            profileKey,
            allowWeb,
            request.effort,
            request.model,
          );

    return {
      text,
      engine: request.engine,
      model:
        request.engine === "claude-cli"
          ? "claude-subscription"
          : (request.model ?? "codex"),
      ms: Date.now() - started,
    };
  } finally {
    // Whatever happened, the customer's file does not stay on this machine.
    rmSync(scratch, { force: true, recursive: true });
  }
}

// The log is deliberately thin: when, what kind of job, which engine, how long,
// and whether it worked. Never the prompt, never the file, never the answer.
export function recordRelayCall(
  database: DatabaseHandle,
  entry: {
    task: string;
    engine: string;
    capability: string;
    ms: number;
    ok: boolean;
    failure: string | null;
    // Which app made the call: an app_profiles.id, or "door" for the shared
    // key. WHO belongs in the log; what was said still never does.
    appId?: string | null;
  },
): void {
  database.sqlite
    .prepare(
      `INSERT INTO relay_calls (id, task, engine, capability, ms, ok, failure, app_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      randomUUID(),
      entry.task.slice(0, 60),
      entry.engine,
      entry.capability,
      entry.ms,
      entry.ok ? 1 : 0,
      entry.failure?.slice(0, 200) ?? null,
      entry.appId ?? "door",
    );
  database.sqlite
    .prepare(
      `DELETE FROM relay_calls WHERE id NOT IN (
         SELECT id FROM relay_calls ORDER BY created_at DESC, rowid DESC LIMIT 50
       )`,
    )
    .run();
}

export function listRelayCalls(database: DatabaseHandle): {
  task: string;
  engine: string;
  capability: string;
  ms: number;
  ok: boolean;
  failure: string | null;
  createdAt: string;
}[] {
  const rows = database.sqlite
    .prepare(
      `SELECT task, engine, capability, ms, ok, failure, created_at AS createdAt
       FROM relay_calls ORDER BY created_at DESC, rowid DESC LIMIT 20`,
    )
    .all() as {
    task: string;
    engine: string;
    capability: string;
    ms: number;
    ok: number;
    failure: string | null;
    createdAt: string;
  }[];
  return rows.map((row) => ({ ...row, ok: row.ok === 1 }));
}

