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
import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import type { DatabaseHandle } from "../../db/database.js";
import {
  codexLoginConnectedAt,
  codexProfileSignedIn,
  getCodexStatus,
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
import { recordEngineUsage } from "./relay-usage.js";

export const RELAY_ENGINES = ["openai-cli", "claude-cli"] as const;
export type RelayEngine = (typeof RELAY_ENGINES)[number];

// The five names the whole system uses for what a model can do. The door offers
// the first and the fourth; the rest belong to engines that are not these two
// subscriptions (voice runs on Groq or a local Whisper, pictures come out of
// Cloudflare), so they are reported unsupported rather than quietly missing.
export const RELAY_CAPABILITIES = [
  "text",
  "hearing",
  "speaking",
  "vision",
  "reading",
  "drawing",
] as const;
export type RelayCapability = (typeof RELAY_CAPABILITIES)[number];

// Split now that the vocabulary distinguishes them: Claude reads a PDF itself,
// Codex takes pictures only — so a caller sending a PDF to Codex must turn its
// pages into images first, which is what the hand-off prompt already says.
const ENGINE_CAPABILITIES: Record<RelayEngine, RelayCapability[]> = {
  "openai-cli": ["text", "vision"],
  "claude-cli": ["text", "vision", "reading"],
};

export interface RelayConfig {
  enabled: boolean;
  // The door's own key. ONE key, not one per subscription: a key says which app
  // is knocking, and which subscription to use is named in each request. Stored
  // as a hash — the plain text is shown once, when it is made, and never again.
  // `tokenHint` is the last four characters, enough to recognise which key is
  // in an app's settings without being enough to use it.
  tokenHash: string | null;
  tokenHint: string | null;
  tokenCreatedAt: string | null;
  // Who counts as Oskar. A list, never one address: he has several work
  // mailboxes and all of them are him. Empty = nobody, which is the safe start.
  ownerEmails: string[];
  // Web pages allowed to call in. The door is only ever reachable from inside
  // the private network, and this narrows it further to his own apps.
  allowedOrigins: string[];
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
  tokenHash: null,
  tokenHint: null,
  tokenCreatedAt: null,
  ownerEmails: [],
  allowedOrigins: [],
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
  next.ownerEmails = [
    ...new Set(
      next.ownerEmails.map((email) => email.trim().toLowerCase()).filter(Boolean),
    ),
  ];
  next.allowedOrigins = [
    ...new Set(
      next.allowedOrigins
        .map((origin) => origin.trim().replace(/\/+$/, ""))
        .filter(Boolean),
    ),
  ];
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

const DOOR_TOKEN_PREFIX = "vaenyx_door_";

function hashDoorToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Make a new key and forget the old one in the same breath. Regenerating is how
// an app is cut off: the previous key stops working the instant this returns.
// The plain text is returned ONCE — nothing stores it, here or anywhere.
export function newRelayToken(database: DatabaseHandle): string {
  const token = `${DOOR_TOKEN_PREFIX}${randomBytes(24).toString("hex")}`;
  writeRelayConfig(database, {
    tokenHash: hashDoorToken(token),
    tokenHint: token.slice(-4),
    tokenCreatedAt: new Date().toISOString(),
  });
  return token;
}

export function revokeRelayToken(database: DatabaseHandle): void {
  writeRelayConfig(database, {
    tokenHash: null,
    tokenHint: null,
    tokenCreatedAt: null,
  });
}

// Does this Authorization header carry the door's key? A missing key means the
// door is shut to apps whatever the switch says — there is nothing to guess.
export function relayTokenAccepted(
  database: DatabaseHandle,
  authorization: string | undefined,
): boolean {
  const config = readRelayConfig(database);
  if (!config.tokenHash) return false;
  if (!authorization?.startsWith("Bearer ")) return false;
  const token = authorization.slice("Bearer ".length).trim();
  if (!token.startsWith(DOOR_TOKEN_PREFIX)) return false;
  const offered = Buffer.from(hashDoorToken(token));
  const stored = Buffer.from(config.tokenHash);
  return offered.length === stored.length && timingSafeEqual(offered, stored);
}

// Asking the Codex CLI whether it is signed in costs two child processes, which
// is far too slow for a health check a caller times out in three seconds. The
// answer is kept and refreshed in the background: callers get the last known
// state immediately, and only the very first call after a restart waits.
let codexSignedIn: { at: number; value: boolean } | null = null;
let codexRefreshing = false;
const CODEX_STATUS_TTL_MS = 60_000;

function readCodexSignedIn(): boolean {
  const status = getCodexStatus();
  return status.installed && status.loggedIn && status.authMethod === "chatgpt";
}

function codexSignedInCached(now: number): boolean {
  if (!codexSignedIn) {
    codexSignedIn = { at: now, value: readCodexSignedIn() };
    return codexSignedIn.value;
  }
  if (now - codexSignedIn.at > CODEX_STATUS_TTL_MS && !codexRefreshing) {
    codexRefreshing = true;
    setTimeout(() => {
      try {
        codexSignedIn = { at: Date.now(), value: readCodexSignedIn() };
      } finally {
        codexRefreshing = false;
      }
    }, 0).unref?.();
  }
  return codexSignedIn.value;
}

// Only for tests and for the settings page's own refresh: forget the cache so
// the next read asks the CLI again.
export function forgetRelayEngineStatus(): void {
  codexSignedIn = null;
}

export interface RelayHealth {
  on: boolean;
  engines: {
    id: RelayEngine;
    signedIn: boolean;
    capabilities: RelayCapability[];
  }[];
  limits: {
    maxFiles: number;
    maxFileBytes: number;
    maxTotalBytes: number;
    timeoutSeconds: number;
  };
}

export function relayHealth(
  database: DatabaseHandle,
  now = Date.now(),
): RelayHealth {
  const config = readRelayConfig(database);
  return {
    on: config.enabled,
    engines: [
      {
        id: "openai-cli",
        signedIn: codexSignedInCached(now),
        capabilities: ENGINE_CAPABILITIES["openai-cli"],
      },
      {
        id: "claude-cli",
        signedIn: claudeMachineLogin(),
        capabilities: ENGINE_CAPABILITIES["claude-cli"],
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
  caller: string;
  files: RelayFileRequest[];
  // Which app key knocked, when the caller used one instead of the door's own
  // key. REQUIRED, and null is a real answer rather than a shortcut: null means
  // "the door key, which has no list of its own", never "skip the check".
  appProfileId: string | null;
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
}

export function relayProfileEngineStatus(profileId: string): {
  mode: "dedicated";
  engines: RelayProfileEngineStatus[];
} {
  return {
    mode: "dedicated",
    engines: [
      {
        id: "openai-cli",
        connected: codexProfileSignedIn(profileId),
        connectedAt: codexLoginConnectedAt(profileId),
        capabilities: ENGINE_CAPABILITIES["openai-cli"],
      },
      {
        id: "claude-cli",
        connected: claudeMachineLogin(profileId),
        connectedAt: claudeLoginConnectedAt(profileId),
        capabilities: ENGINE_CAPABILITIES["claude-cli"],
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

  const caller = request.caller.trim().toLowerCase();
  if (!caller || !config.ownerEmails.includes(caller)) {
    throw new Error("RELAY_NOT_OWNER");
  }
  if (!ENGINE_CAPABILITIES[request.engine].includes(request.capability)) {
    throw new Error(
      `RELAY_CAPABILITY_UNSUPPORTED:${request.engine}:${request.capability}`,
    );
  }
  // "Out of reach of every app key" is what the Capabilities card promises,
  // and an outside app asking this machine to look at a picture is an app key
  // asking. Refused before the linked file is fetched: a capability that is
  // switched off should not pull the customer's file onto this disk at all.
  // `text` is not one of the seven — it is the door itself.
  //
  // The global switch is the ONLY layer here, and deliberately, on both
  // counts. A relay call arrives from another program over the network with an
  // owner email on it, not from a browser session, so there is no mode it
  // could be inside. And this door has ONE key for every app rather than a key
  // per app — the per-key lists on the Token screen belong to app_profiles,
  // and nothing in this file has a profile to read. Anything that wants a list
  // of its own has to become a per-app key first; until then, honouring the
  // ceiling is the whole of what this door can honour.
  if (request.capability !== "text") {
    if (capabilityOff(database, request.capability)) {
      throw new Error(`RELAY_CAPABILITY_OFF:${request.capability}`);
    }
    // The third layer, where it applies: this door also accepts an app key,
    // and a key that was never granted `vision` must not be able to get it by
    // knocking here instead of running a Method. A key's list would be worth
    // nothing if another endpoint handed out the same capability.
    if (
      request.appProfileId &&
      !decideTokenCapabilities(
        database,
        [request.capability],
        readProfileCapabilities(database, request.appProfileId),
      ).allowed.includes(request.capability)
    ) {
      throw new Error(`RELAY_CAPABILITY_NOT_GRANTED:${request.capability}`);
    }
  }

  // Which identity this call rides: an app key rides ITS profile's login,
  // always — there is no fallback onto Vaenyx's own credentials. Only the
  // door's shared key (appProfileId null) still uses the door's own login,
  // and that key retires in phase two.
  const profileKey = request.appProfileId ?? "core";

  const started = Date.now();
  const scratch = resolve(tmpdir(), "vaenyx-relay", randomUUID());
  mkdirSync(scratch, { recursive: true });
  try {
    const files = await fetchLinkedFiles(request.files, config, scratch);
    const attachment = files[0];
    if (
      (request.capability === "vision" || request.capability === "reading") &&
      !attachment
    ) {
      throw new Error("RELAY_NO_FILE");
    }

    // Counted before the engine answers: a failed call still hit the
    // subscription, and "which app spent this" must include the failures.
    recordEngineUsage(
      database,
      request.appProfileId ?? "door",
      request.engine,
    );

    const text =
      request.engine === "claude-cli"
        ? await claudeSubscriptionRelay(
            secretsDirectory,
            request.prompt,
            attachment
              ? { base64: attachment.base64, mediaType: attachment.mediaType }
              : undefined,
            profileKey,
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
          );

    return {
      text,
      engine: request.engine,
      model: request.engine === "claude-cli" ? "claude-subscription" : "codex",
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

// Used by the settings page's Test button: the smallest real call there is, on
// the engine the Owner is actually looking at. Reads nothing, assumes nothing.
export async function testRelayEngine(
  secretsDirectory: string,
  engine: RelayEngine,
): Promise<string> {
  const prompt = "Reply with the single word: ready";
  return engine === "claude-cli"
    ? await claudeSubscriptionRelay(secretsDirectory, prompt)
    : await runCodexRelay(prompt);
}
