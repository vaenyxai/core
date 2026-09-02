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
//   * One valid key gets every safe capability that this code implements and a
//     real probe verifies. There is no second list of per-key switches.
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

import { capabilityOff } from "./capabilities.js";
import { recordEngineUsage } from "./relay-usage.js";
import {
  normalizeSearchRunEvidence,
  RELAY_CAPABILITY_PROBE_REVISION,
  RELAY_CONTRACT_VERSION,
  relaySearchPrompt,
  type RelaySearchResult,
} from "./relay-search.js";

export const RELAY_ENGINES = ["openai-cli", "claude-cli"] as const;
export type RelayEngine = (typeof RELAY_ENGINES)[number];

// Contract v2 uses task-shaped names. The old names remain wire aliases only,
// so existing text/vision/reading/web clients keep working.
export const RELAY_CAPABILITIES = [
  "text_analysis",
  "structured_output",
  "vision_analysis",
  "document_analysis",
  "web_search",
  // v1 aliases remain accepted on /v1/ai/run.
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

export const RELAY_SAFE_CAPABILITIES = [
  "text_analysis",
  "structured_output",
  "vision_analysis",
  "document_analysis",
  "web_search",
] as const;
export type RelaySafeCapability = (typeof RELAY_SAFE_CAPABILITIES)[number];

// Split now that the vocabulary distinguishes them: Claude reads a PDF itself,
// Codex takes pictures only — so a caller sending a PDF to Codex must turn its
// pages into images first, which is what the hand-off prompt already says.
// `web_search` is enabled only when its live tool returns structured URLs.
const ENGINE_CAPABILITIES: Record<RelayEngine, RelaySafeCapability[]> = {
  "openai-cli": [
    "text_analysis",
    "structured_output",
    "vision_analysis",
    "web_search",
  ],
  "claude-cli": [...RELAY_SAFE_CAPABILITIES],
};

function canonicalCapability(capability: RelayCapability): RelaySafeCapability | null {
  const aliases: Partial<Record<RelayCapability, RelaySafeCapability>> = {
    text: "text_analysis",
    text_analysis: "text_analysis",
    structured_output: "structured_output",
    vision: "vision_analysis",
    vision_analysis: "vision_analysis",
    reading: "document_analysis",
    document_analysis: "document_analysis",
    web: "web_search",
    web_search: "web_search",
  };
  return aliases[capability] ?? null;
}

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

interface StoredProbe {
  available: boolean;
  unavailableReason: string | null;
  provider: string | null;
  model: string | null;
  probedAt: string;
  revision: string;
}

type StoredProbes = Partial<Record<RelayEngine, Partial<Record<RelaySafeCapability, StoredProbe>>>>;

function probeKey(profileId: string): string {
  return `relay.probes.${profileId}`;
}

function readStoredProbes(database: DatabaseHandle, profileId: string): StoredProbes {
  const row = database.sqlite
    .prepare("SELECT value FROM instance_settings WHERE key = ?")
    .get(probeKey(profileId)) as { value?: string } | undefined;
  try {
    return row?.value ? (JSON.parse(row.value) as StoredProbes) : {};
  } catch {
    return {};
  }
}

export function recordRelayCapabilityProbe(
  database: DatabaseHandle,
  profileId: string,
  engine: RelayEngine,
  capability: RelaySafeCapability,
  probe: Omit<StoredProbe, "probedAt" | "revision"> & { probedAt?: string },
): void {
  const current = readStoredProbes(database, profileId);
  const next: StoredProbes = {
    ...current,
    [engine]: {
      ...current[engine],
      [capability]: {
        ...probe,
        probedAt: probe.probedAt ?? new Date().toISOString(),
        revision: RELAY_CAPABILITY_PROBE_REVISION,
      },
    },
  };
  database.sqlite
    .prepare(
      `INSERT INTO instance_settings (key, value, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value,
                                      updated_at = CURRENT_TIMESTAMP`,
    )
    .run(probeKey(profileId), JSON.stringify(next));
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
  maxCallsPerMinute: number;
}

export const DEFAULT_RELAY_CONFIG: RelayConfig = {
  enabled: false,
  fileHosts: [],
  maxFiles: 5,
  maxFileBytes: 25 * 1024 * 1024,
  maxTotalBytes: 60 * 1024 * 1024,
  timeoutSeconds: 180,
  maxCallsPerMinute: 30,
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
  next.maxCallsPerMinute = Math.min(
    600,
    Math.max(1, Math.round(next.maxCallsPerMinute)),
  );
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
  contract_version: number;
  capability_probe_revision: string;
  on: boolean;
  engines: {
    id: RelayEngine;
    signedIn: boolean;
    capabilities: RelaySafeCapability[];
    capability_status: RelayCapabilityStatus[];
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
    maxCallsPerMinute: number;
  };
}

export interface RelayCapabilityStatus {
  engine: RelayEngine;
  login_status: "connected" | "not_connected";
  capability: RelaySafeCapability;
  supported: boolean;
  available: boolean;
  unavailable_reason: string | null;
  provider: string | null;
  model: string | null;
  last_probe_at: string | null;
}

function engineSignedIn(engine: RelayEngine, profileId: string): boolean {
  return engine === "openai-cli"
    ? codexProfileSignedIn(profileId)
    : claudeMachineLogin(profileId);
}

function capabilityStatuses(
  database: DatabaseHandle,
  profileId: string,
  engine: RelayEngine,
): RelayCapabilityStatus[] {
  const signedIn = engineSignedIn(engine, profileId);
  const probes = readStoredProbes(database, profileId)[engine] ?? {};
  return RELAY_SAFE_CAPABILITIES.map((capability) => {
    const supported = ENGINE_CAPABILITIES[engine].includes(capability);
    const probe = probes[capability];
    const globalOff =
      (capability === "web_search" && capabilityOff(database, "web")) ||
      (capability === "vision_analysis" && capabilityOff(database, "vision")) ||
      (capability === "document_analysis" && capabilityOff(database, "reading"));
    const currentProbe = probe?.revision === RELAY_CAPABILITY_PROBE_REVISION;
    const available = Boolean(
      supported && signedIn && !globalOff && currentProbe && probe?.available,
    );
    return {
      engine,
      login_status: signedIn ? "connected" : "not_connected",
      capability,
      supported,
      available,
      unavailable_reason: available
        ? null
        : !supported
          ? capability === "document_analysis" && engine === "openai-cli"
            ? "FILE_TRANSPORT_NOT_IMPLEMENTED"
            : "NOT_IMPLEMENTED"
          : !signedIn
            ? "NOT_CONNECTED"
            : globalOff
              ? "DISABLED_BY_OWNER_SAFETY_CEILING"
              : !currentProbe
                ? "NOT_PROBED"
                : probe?.unavailableReason ?? "PROBE_FAILED",
      provider: currentProbe ? (probe?.provider ?? null) : null,
      model: currentProbe ? (probe?.model ?? null) : null,
      last_probe_at: currentProbe ? (probe?.probedAt ?? null) : null,
    };
  });
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
  const openaiStatus = capabilityStatuses(database, profileId, "openai-cli");
  const claudeStatus = capabilityStatuses(database, profileId, "claude-cli");
  return {
    contract_version: RELAY_CONTRACT_VERSION,
    capability_probe_revision: RELAY_CAPABILITY_PROBE_REVISION,
    on: config.enabled,
    engines: [
      {
        id: "openai-cli",
        signedIn: codexProfileSignedIn(profileId),
        capabilities: [...ENGINE_CAPABILITIES["openai-cli"]],
        capability_status: openaiStatus,
        efforts: engineEfforts("openai-cli"),
        models: engineModels("openai-cli"),
      },
      {
        id: "claude-cli",
        signedIn: claudeMachineLogin(profileId),
        capabilities: [...ENGINE_CAPABILITIES["claude-cli"]],
        capability_status: claudeStatus,
        efforts: engineEfforts("claude-cli"),
        models: engineModels("claude-cli"),
      },
    ],
    limits: {
      maxFiles: config.maxFiles,
      maxFileBytes: config.maxFileBytes,
      maxTotalBytes: config.maxTotalBytes,
      timeoutSeconds: config.timeoutSeconds,
      maxCallsPerMinute: config.maxCallsPerMinute,
    },
  };
}

export interface RelayFileRequest {
  name: string;
  url: string;
}

export interface RelayRunRequest {
  task: string;
  prompt?: string;
  engine: RelayEngine;
  capability: RelayCapability;
  query?: string;
  allowedDomains?: string[];
  maxResults?: number;
  language?: string;
  region?: string;
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
  provider: string;
  model: string;
  ms: number;
  searched_at: string | null;
  query: string | null;
  results: RelaySearchResult[];
  citations: string[];
  fallback_occurred: false;
  fallback_disclosure: string;
  capability_probe_revision: string;
  structured?: unknown;
}

const recentRelayCalls = new Map<string, number[]>();

export function assertRelayRateLimit(
  profileId: string,
  maxCallsPerMinute: number,
  now: number = Date.now(),
): void {
  const cutoff = now - 60_000;
  const recent = (recentRelayCalls.get(profileId) ?? []).filter(
    (timestamp) => timestamp > cutoff,
  );
  if (recent.length >= maxCallsPerMinute) {
    recentRelayCalls.set(profileId, recent);
    throw new Error("RELAY_RATE_LIMITED");
  }
  recent.push(now);
  recentRelayCalls.set(profileId, recent);
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
  capabilities: RelaySafeCapability[];
  capability_status: RelayCapabilityStatus[];
  efforts: string[];
  models: string[];
}

export function relayProfileEngineStatus(
  database: DatabaseHandle,
  profileId: string,
): {
  contract_version: number;
  capability_probe_revision: string;
  mode: "dedicated";
  engines: RelayProfileEngineStatus[];
} {
  return {
    contract_version: RELAY_CONTRACT_VERSION,
    capability_probe_revision: RELAY_CAPABILITY_PROBE_REVISION,
    mode: "dedicated",
    engines: [
      {
        id: "openai-cli",
        connected: codexProfileSignedIn(profileId),
        connectedAt: codexLoginConnectedAt(profileId),
        capabilities: [...ENGINE_CAPABILITIES["openai-cli"]],
        capability_status: capabilityStatuses(database, profileId, "openai-cli"),
        efforts: engineEfforts("openai-cli"),
        models: engineModels("openai-cli"),
      },
      {
        id: "claude-cli",
        connected: claudeMachineLogin(profileId),
        connectedAt: claudeLoginConnectedAt(profileId),
        capabilities: [...ENGINE_CAPABILITIES["claude-cli"]],
        capability_status: capabilityStatuses(database, profileId, "claude-cli"),
        efforts: engineEfforts("claude-cli"),
        models: engineModels("claude-cli"),
      },
    ],
  };
}

const PROBE_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZK9sAAAAASUVORK5CYII=";

function probePdfBase64(): string {
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 100] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    "5 0 obj\n<< /Length 49 >>\nstream\nBT /F1 18 Tf 20 50 Td (VAENYX PDF PROBE) Tj ET\nendstream\nendobj\n",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += object;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n `)
    .join("\n")}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf).toString("base64");
}

export async function probeRelayCapabilities(
  database: DatabaseHandle,
  secretsDirectory: string,
  profileId: string,
): Promise<ReturnType<typeof relayProfileEngineStatus>> {
  assertRelayRateLimit(profileId, readRelayConfig(database).maxCallsPerMinute);
  const scratch = resolve(tmpdir(), "vaenyx-relay-probe", randomUUID());
  mkdirSync(scratch, { recursive: true });
  const imagePath = resolve(scratch, "probe.png");
  writeFileSync(imagePath, Buffer.from(PROBE_IMAGE_BASE64, "base64"));

  const call = async (
    engine: RelayEngine,
    prompt: string,
    options: { web?: boolean; image?: boolean; pdf?: boolean } = {},
  ) => {
    recordEngineUsage(database, profileId, engine);
    return engine === "openai-cli"
      ? runCodexRelay(
          prompt,
          options.image ? imagePath : undefined,
          profileId,
          options.web === true,
        )
      : claudeSubscriptionRelay(
          secretsDirectory,
          prompt,
          options.pdf
            ? { base64: probePdfBase64(), mediaType: "application/pdf" }
            : options.image
              ? { base64: PROBE_IMAGE_BASE64, mediaType: "image/png" }
              : undefined,
          profileId,
          options.web === true,
        );
  };

  const note = (
    engine: RelayEngine,
    capability: RelaySafeCapability,
    available: boolean,
    detail: { provider?: string; model?: string; reason?: string } = {},
  ) =>
    recordRelayCapabilityProbe(database, profileId, engine, capability, {
      available,
      unavailableReason: available ? null : detail.reason ?? "PROBE_FAILED",
      provider: detail.provider ?? null,
      model: detail.model ?? null,
    });

  const probeEngine = async (engine: RelayEngine) => {
    if (!engineSignedIn(engine, profileId)) return;
    try {
      const output = await call(
        engine,
        'Return exactly this JSON and nothing else: {"vaenyx_probe":"ok"}',
      );
      const parsed = JSON.parse(output.text) as { vaenyx_probe?: unknown };
      const ok = parsed.vaenyx_probe === "ok";
      for (const capability of ["text_analysis", "structured_output"] as const) {
        note(engine, capability, ok, {
          provider: output.provider,
          model: output.model,
          reason: "STRUCTURED_PROBE_FAILED",
        });
      }
    } catch (error) {
      for (const capability of ["text_analysis", "structured_output"] as const) {
        note(engine, capability, false, {
          reason: publicRelayError(error, engine),
        });
      }
    }

    try {
      const output = await call(
        engine,
        "Reply exactly VAENYX_VISION_OK if an image is attached and visible.",
        { image: true },
      );
      note(engine, "vision_analysis", output.text.includes("VAENYX_VISION_OK"), {
        provider: output.provider,
        model: output.model,
        reason: "VISION_PROBE_FAILED",
      });
    } catch (error) {
      note(engine, "vision_analysis", false, {
        reason: publicRelayError(error, engine),
      });
    }

    if (engine === "claude-cli") {
      try {
        const output = await call(
          engine,
          "Read the attached PDF. Reply exactly VAENYX_DOCUMENT_OK if it contains VAENYX PDF PROBE.",
          { pdf: true },
        );
        note(
          engine,
          "document_analysis",
          output.text.includes("VAENYX_DOCUMENT_OK"),
          {
            provider: output.provider,
            model: output.model,
            reason: "DOCUMENT_PROBE_FAILED",
          },
        );
      } catch (error) {
        note(engine, "document_analysis", false, {
          reason: publicRelayError(error, engine),
        });
      }
    }

    if (!capabilityOff(database, "web")) {
      try {
        const output = await call(
          engine,
          relaySearchPrompt({
            query: "OpenAI Codex CLI official documentation",
            allowedDomains: ["openai.com", "chatgpt.com"],
            maxResults: 3,
          }),
          { web: true },
        );
        const evidence = normalizeSearchRunEvidence(
          output.searchEvidence,
          output.text,
          {
          allowedDomains: ["openai.com", "chatgpt.com"],
          maxResults: 3,
          },
        );
        note(engine, "web_search", evidence.length > 0, {
          provider: output.provider,
          model: output.model,
          reason: "VERIFIABLE_SOURCES_NOT_RETURNED",
        });
      } catch (error) {
        note(engine, "web_search", false, {
          reason: publicRelayError(error, engine),
        });
      }
    }
  };

  try {
    await Promise.all(RELAY_ENGINES.map((engine) => probeEngine(engine)));
    return relayProfileEngineStatus(database, profileId);
  } finally {
    rmSync(scratch, { force: true, recursive: true });
  }
}

export async function runRelay(
  database: DatabaseHandle,
  secretsDirectory: string,
  request: RelayRunRequest,
): Promise<RelayRunResult> {
  const config = readRelayConfig(database);
  if (!config.enabled) throw new Error("RELAY_OFF");
  assertRelayRateLimit(request.appProfileId, config.maxCallsPerMinute);
  const capability = canonicalCapability(request.capability);
  if (!capability || !ENGINE_CAPABILITIES[request.engine].includes(capability)) {
    throw new Error(
      `RELAY_CAPABILITY_UNSUPPORTED:${request.engine}:${request.capability}`,
    );
  }
  const safetyCeiling =
    capability === "web_search"
      ? "web"
      : capability === "vision_analysis"
        ? "vision"
        : capability === "document_analysis"
          ? "reading"
          : null;
  if (safetyCeiling && capabilityOff(database, safetyCeiling)) {
    throw new Error(`RELAY_CAPABILITY_OFF:${capability}`);
  }

  // One valid relay key gets every implemented safe capability. There is no
  // per-key capability grant here; the key, Tailnet boundary, engine login and
  // machine-wide safety ceiling are the complete authorization chain.
  const prompt = request.prompt?.trim();
  const query = request.query?.trim() || (capability === "web_search" ? prompt : "");
  if (capability === "web_search" && !query) throw new Error("RELAY_QUERY_REQUIRED");
  if (capability !== "web_search" && !prompt) throw new Error("RELAY_PROMPT_REQUIRED");

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
      (capability === "vision_analysis" || capability === "document_analysis") &&
      !attachment
    ) {
      throw new Error("RELAY_NO_FILE");
    }
    if (capability === "vision_analysis" && !attachment?.mediaType.startsWith("image/")) {
      throw new Error("RELAY_IMAGE_REQUIRED");
    }
    if (capability === "document_analysis" && attachment?.mediaType !== "application/pdf") {
      throw new Error("RELAY_PDF_REQUIRED");
    }

    // Counted before the engine answers: a failed call still hit the
    // subscription, and "which app spent this" must include the failures.
    recordEngineUsage(database, request.appProfileId, request.engine);

    // A web-search call is a text call whose engine child is allowed the ONE extra
    // tool, live web search — decided here, enforced inside each engine
    // (separate session lane / tool allow-list), never by prompt alone.
    const allowWeb = capability === "web_search";
    const enginePrompt = allowWeb
      ? relaySearchPrompt({
          query: query!,
          allowedDomains: request.allowedDomains,
          maxResults: request.maxResults,
          language: request.language,
          region: request.region,
        })
      : prompt!;
    const engineResult =
      request.engine === "claude-cli"
        ? await claudeSubscriptionRelay(
            secretsDirectory,
            enginePrompt,
            attachment
              ? { base64: attachment.base64, mediaType: attachment.mediaType }
              : undefined,
            profileKey,
            allowWeb,
          )
        : await runCodexRelay(
            enginePrompt,
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

    const results = allowWeb
      ? normalizeSearchRunEvidence(engineResult.searchEvidence, engineResult.text, {
          allowedDomains: request.allowedDomains,
          maxResults: request.maxResults,
        })
      : [];
    if (allowWeb && results.length === 0) {
      recordRelayCapabilityProbe(
        database,
        request.appProfileId,
        request.engine,
        capability,
        {
          available: false,
          unavailableReason: "VERIFIABLE_SOURCES_NOT_RETURNED",
          provider: engineResult.provider,
          model: engineResult.model,
        },
      );
      throw new Error(
        `RELAY_CAPABILITY_UNSUPPORTED:${request.engine}:web_search:VERIFIABLE_SOURCES_NOT_RETURNED`,
      );
    }

    let structured: unknown;
    if (capability === "structured_output") {
      try {
        structured = JSON.parse(engineResult.text);
      } catch {
        throw new Error("RELAY_STRUCTURED_OUTPUT_INVALID");
      }
    }

    recordRelayCapabilityProbe(
      database,
      request.appProfileId,
      request.engine,
      capability,
      {
        available: true,
        unavailableReason: null,
        provider: engineResult.provider,
        model: engineResult.model,
      },
    );

    return {
      text: engineResult.text,
      engine: request.engine,
      provider: engineResult.provider,
      model: engineResult.model,
      ms: Date.now() - started,
      searched_at: allowWeb ? new Date().toISOString() : null,
      query: allowWeb ? query! : null,
      results,
      citations: results.map((result) => result.url),
      fallback_occurred: false,
      fallback_disclosure:
        "No fallback. This request used only the selected subscription engine.",
      capability_probe_revision: RELAY_CAPABILITY_PROBE_REVISION,
      ...(structured === undefined ? {} : { structured }),
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

export function publicRelayError(error: unknown, engine: RelayEngine): string {
  const raw = error instanceof Error ? error.message : "";
  const exact = new Set([
    "RELAY_OFF",
    "RELAY_TOO_MANY_FILES",
    "RELAY_FILE_TOO_LARGE",
    "RELAY_TOTAL_TOO_LARGE",
    "RELAY_NO_FILE",
    "RELAY_IMAGE_REQUIRED",
    "RELAY_PDF_REQUIRED",
    "RELAY_QUERY_REQUIRED",
    "RELAY_PROMPT_REQUIRED",
    "RELAY_STRUCTURED_OUTPUT_INVALID",
    "RELAY_RATE_LIMITED",
  ]);
  if (exact.has(raw)) return raw;
  const safePrefixes = [
    "RELAY_CAPABILITY_OFF:",
    "RELAY_CAPABILITY_UNSUPPORTED:",
    "RELAY_EFFORT_INVALID:",
    "RELAY_MODEL_INVALID:",
    "RELAY_PROFILE_NOT_CONNECTED:",
    "RELAY_NOT_SIGNED_IN:",
    "RELAY_HOST_NOT_ALLOWED:",
    "RELAY_FETCH_FAILED:",
  ];
  if (safePrefixes.some((prefix) => raw.startsWith(prefix))) {
    return raw.slice(0, 240);
  }
  return `RELAY_ENGINE_FAILED:${engine}`;
}
