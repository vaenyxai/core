import {
  decodeRelayInlineFile,
  MAX_INLINE_TOTAL_BYTES,
} from "./relay-inline-files.js";
import { redSquarePng, namesRed } from "./capability-probe.js";
import type {
  RelayRunRequest,
  RelayRunResponse,
  RelayModelCatalogue,
  RelayModelTestRequest,
  RelayModelTestResult,
} from "@vaenyx/contracts";
import { readFileSync } from "node:fs";
import type { DatabaseHandle } from "../../db/database.js";
import {
  API_PROVIDERS,
  apiProvider,
  readApiConnection,
  type ApiProvider,
  type ApiEngine,
  type ApiConnection,
} from "./relay-api-config.js";
import {
  apiCapabilities,
  apiModels,
  invokeApi,
  apiModelHonoured,
  type ApiAttachment,
  type ApiReply,
} from "./relay-api-provider.js";
import { ApiRelayError, refuse, object, type Json } from "./relay-api-wire.js";
import { readRelayConfig, assertRelayRateLimit } from "./relay.js";
import { recordEngineUsage } from "./relay-usage.js";
import { capabilityOff } from "./capabilities.js";
import {
  downloadResearchSource,
  type ResearchDownloader,
} from "./research-fetch.js";
import { runResearch } from "./relay-research.js";
import { normalizeSearchEvidence } from "./relay-search.js";

export const API_REVISION = "2.4",
  API_PROBE_REVISION = "2026-11-03.api.1";
type Models = Awaited<ReturnType<typeof apiModels>>;
type CatalogueEngine = RelayModelCatalogue["engines"][number];
const catalogues = new Map<
  string,
  { models: Models; at: string; expires: number }
>();
function profileAllowed(db: DatabaseHandle, profile: string): boolean {
  return !!db.sqlite
    .prepare(
      "SELECT 1 FROM app_profiles WHERE id=? AND kind='relay' AND enabled=1",
    )
    .get(profile);
}
function connection(
  db: DatabaseHandle,
  secrets: string,
  profile: string,
  provider: ApiProvider,
): ApiConnection {
  if (!profileAllowed(db, profile)) refuse("RELAY_PROFILE_REQUIRED");
  const value = readApiConnection(db, secrets, profile, provider);
  if (!value) refuse("RELAY_PROFILE_NOT_CONNECTED");
  return value!;
}
const cacheId = (profile: string, provider: ApiProvider, c: ApiConnection) =>
  profile + "|" + provider + "|" + c.revision;
async function modelsFor(
  db: DatabaseHandle,
  secrets: string,
  profile: string,
  provider: ApiProvider,
  signal: AbortSignal,
  force = false,
  fetcher = fetch,
) {
  const c = connection(db, secrets, profile, provider),
    id = cacheId(profile, provider, c),
    cached = catalogues.get(id);
  if (!force && cached && cached.expires > Date.now()) return cached;
  const models = await apiModels(provider, c, signal, fetcher);
  if (
    readApiConnection(db, secrets, profile, provider)?.revision !==
      c.revision ||
    !profileAllowed(db, profile)
  )
    refuse("RELAY_CONNECTION_CHANGED");
  const value = {
    models,
    at: new Date().toISOString(),
    expires: Date.now() + 600000,
  };
  catalogues.set(id, value);
  return value;
}
interface Probe {
  probeRevision?: string;
  ok?: boolean;
  reason?: string | null;
  path?: "run" | "test";
  model: string;
  capability: string;
  effort: string | null;
  revision: string;
  at: string;
  actualModel: string | null;
}
const probeKey = (profile: string, provider: ApiProvider) =>
  "relay.api.probes." + profile + "." + provider;
export function apiModelProofs(
  db: DatabaseHandle,
  secrets: string,
  profile: string,
) {
  return API_PROVIDERS.flatMap((p) => {
    const c = readApiConnection(db, secrets, profile, p.id);
    return c
      ? probes(db, profile, p.id)
          .filter(
            (x) =>
              x.revision === c.revision &&
              x.probeRevision === API_PROBE_REVISION,
          )
          .map((x) => ({
            engine: "api-" + p.id,
            model: x.model,
            capability: x.capability,
            effort: x.effort,
            ok: x.ok !== false,
            reason: x.reason ?? null,
            at: x.at,
          }))
      : [];
  });
}
function probes(
  db: DatabaseHandle,
  profile: string,
  provider: ApiProvider,
): Probe[] {
  try {
    const row = db.sqlite
      .prepare("SELECT value FROM instance_settings WHERE key=?")
      .get(probeKey(profile, provider)) as { value: string } | undefined;
    const data = JSON.parse(row?.value ?? "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
function note(
  db: DatabaseHandle,
  profile: string,
  provider: ApiProvider,
  p: Probe,
): void {
  const next = probes(db, profile, provider).filter(
    (x) =>
      !(
        x.model === p.model &&
        x.capability === p.capability &&
        x.effort === p.effort
      ),
  );
  next.push({ ...p, probeRevision: API_PROBE_REVISION });
  db.sqlite
    .prepare(
      "INSERT INTO instance_settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    )
    .run(probeKey(profile, provider), JSON.stringify(next.slice(-1000)));
}
export function apiProfileStatus(
  db: DatabaseHandle,
  secrets: string,
  profile: string,
) {
  return API_PROVIDERS.map((p) => {
    const c = readApiConnection(db, secrets, profile, p.id),
      caps = apiCapabilities(p.id);
    const known = c ? catalogues.get(cacheId(profile, p.id, c)) : undefined;
    return {
      id: ("api-" + p.id) as ApiEngine,
      connected: !!c,
      connectedAt: c?.connectedAt ?? null,
      capabilities: caps,
      capability_status: [
        "text_analysis",
        "structured_output",
        "vision_analysis",
        "document_analysis",
        "web_search",
      ].map((capability) => ({
        engine: "api-" + p.id,
        capability,
        login_status: c ? "connected" : "not_connected",
        supported: caps.includes(capability),
        available: false,
        unavailable_reason: !caps.includes(capability)
          ? "NOT_IMPLEMENTED"
          : c
            ? "SELECT_AND_TEST_MODEL"
            : "NOT_CONNECTED",
        provider: p.id,
        model: null,
        last_probe_at: null,
      })),
      efforts: [],
      models: known?.models.map((m) => m.id) ?? [],
      model_catalogue_verified_at: known?.at ?? null,
    };
  });
}
export async function apiCatalogue(
  db: DatabaseHandle,
  secrets: string,
  profile: string,
  force = false,
  fetcher = fetch,
): Promise<CatalogueEngine[]> {
  const signal = AbortSignal.timeout(20000);
  return Promise.all(
    API_PROVIDERS.map(async (p) => {
      const c = readApiConnection(db, secrets, profile, p.id);
      const base = {
        engine: ("api-" + p.id) as ApiEngine,
        login_status: c ? ("connected" as const) : ("not_connected" as const),
        default_model: null,
        efforts: [],
        verified_at: null,
        models: [],
      };
      if (!c)
        return {
          ...base,
          catalogue_status: "not_connected" as const,
          unavailable_reason: "NOT_CONNECTED",
        };
      try {
        const cat = await modelsFor(
          db,
          secrets,
          profile,
          p.id,
          signal,
          force,
          fetcher,
        );
        const evidence = probes(db, profile, p.id).filter(
          (x) =>
            x.revision === c.revision && x.probeRevision === API_PROBE_REVISION,
        );
        return {
          ...base,
          catalogue_status: "ok" as const,
          unavailable_reason: null,
          verified_at: cat.at,
          models: cat.models.map((m) => ({
            ...m,
            verified: evidence
              .filter((e) => e.model === m.id)
              .map((e) => ({
                capability: e.capability,
                effort: e.effort,
                ok: e.ok !== false,
                reason: e.reason ?? null,
                actual_model: e.actualModel,
                model_reported_by_engine: e.actualModel !== null,
                path: e.path ?? "run",
                at: e.at,
              })),
          })),
        } as CatalogueEngine;
      } catch (error) {
        return {
          ...base,
          catalogue_status: "unavailable" as const,
          unavailable_reason:
            error instanceof ApiRelayError
              ? error.message
              : "RELAY_MODEL_CATALOGUE_UNAVAILABLE",
        };
      }
    }),
  );
}
export interface ApiRunOptions {
  localRead?: import("./local-file-types.js").LocalFileRead;
  fetcher?: typeof fetch;
  download?: ResearchDownloader;
  attachments?: ApiAttachment[];
}
export async function runApiRelay(
  db: DatabaseHandle,
  secrets: string,
  profile: string,
  request: RelayRunRequest,
  options: ApiRunOptions = {},
): Promise<RelayRunResponse> {
  let dispatched = false;
  const upstream = options.fetcher ?? fetch;
  const fetcher: typeof fetch = (input, init) => {
    if (init?.method === "POST") dispatched = true;
    return upstream(input, init);
  };
  try {
    return await runApiRelayInner(db, secrets, profile, request, {
      ...options,
      fetcher,
    });
  } catch (error) {
    if (dispatched && error instanceof ApiRelayError && !error.started)
      throw new ApiRelayError(error.message, true, error.status);
    if (dispatched && !(error instanceof ApiRelayError))
      throw new ApiRelayError("RELAY_PROVIDER_OUTCOME_UNKNOWN", true, 502);
    throw error;
  }
}
async function runApiRelayInner(
  db: DatabaseHandle,
  secrets: string,
  profile: string,
  request: RelayRunRequest,
  options: ApiRunOptions = {},
): Promise<RelayRunResponse> {
  const p = apiProvider(request.engine!.slice(4));
  if (!p) refuse("RELAY_ENGINE_INVALID");
  const provider = p!.id,
    config = readRelayConfig(db),
    started = Date.now();
  if (!config.enabled) refuse("RELAY_OFF");
  const c = connection(db, secrets, profile, provider),
    fetcher = options.fetcher ?? fetch;
  const signal = AbortSignal.timeout(config.timeoutSeconds * 1000);
  const aliases: Record<string, string> = {
    text: "text_analysis",
    vision: "vision_analysis",
    reading: "document_analysis",
    web: "web_search",
  };
  const capability = aliases[request.capability] ?? request.capability;
  if (!apiCapabilities(provider).includes(capability))
    refuse("RELAY_CAPABILITY_UNSUPPORTED");
  if (!request.model) refuse("RELAY_MODEL_REQUIRED");
  const cat = await modelsFor(
    db,
    secrets,
    profile,
    provider,
    signal,
    false,
    fetcher,
  );
  if (!cat.models.some((m) => m.id === request.model && m.selectable))
    refuse("RELAY_MODEL_NOT_AVAILABLE");
  const ceiling: Record<string, string> = {
    web_search: "web",
    vision_analysis: "vision",
    document_analysis: "reading",
  };
  if (ceiling[capability] && capabilityOff(db, ceiling[capability] as "web"))
    refuse("RELAY_CAPABILITY_OFF");
  const assertCurrent = () => {
    if (
      !profileAllowed(db, profile) ||
      readApiConnection(db, secrets, profile, provider)?.revision !== c.revision
    )
      throw new ApiRelayError("RELAY_CONNECTION_CHANGED", true, 409);
  };
  const call = async (
    prompt: string,
    files: ApiAttachment[],
    web = false,
    turnSignal = signal,
  ): Promise<ApiReply> => {
    assertCurrent();
    assertRelayRateLimit(profile, config.maxCallsPerMinute);
    recordEngineUsage(db, profile, request.engine!);
    const result = await invokeApi(
      provider,
      c,
      {
        model: request.model!,
        capability: web
          ? "web_search"
          : capability === "research"
            ? "text_analysis"
            : capability,
        prompt,
        files,
        effort: request.effort,
        allowedDomains: request.allowed_domains,
        maxResults: request.max_results,
        requirements: request.requirements as Json | undefined,
      },
      turnSignal,
      fetcher,
    );
    assertCurrent();
    return result;
  };
  const envelope = (result: ApiReply): RelayRunResponse => {
    if (!apiModelHonoured(provider, request.model!, result.model))
      throw new ApiRelayError("RELAY_MODEL_NOT_HONOURED", true, 409);
    const sources =
      capability === "web_search"
        ? normalizeSearchEvidence(result.searchEvidence, {
            allowedDomains: request.allowed_domains,
            maxResults: request.max_results,
          })
        : [];
    if (capability === "web_search" && !sources.length)
      throw new ApiRelayError("RELAY_VERIFIABLE_SOURCES_REQUIRED", true, 502);
    if (!result.text.trim())
      throw new ApiRelayError("RELAY_PROVIDER_EMPTY", true, 502);
    let structured: unknown;
    if (capability === "structured_output") {
      try {
        structured = JSON.parse(result.text);
      } catch {
        throw new ApiRelayError("RELAY_STRUCTURED_OUTPUT_INVALID", true, 502);
      }
    }
    note(db, profile, provider, {
      model: request.model!,
      capability,
      effort: request.effort ?? null,
      revision: c.revision,
      at: new Date().toISOString(),
      actualModel: result.model,
    });
    return {
      engine: request.engine!,
      provider,
      text: result.text,
      model: result.model ?? request.model!,
      requested_model: request.model!,
      model_reported_by_engine: result.model !== null,
      model_evidence: result.model
        ? "engine_report"
        : "provider_request_and_response_completed",
      effort: request.effort ?? null,
      effort_reported_by_engine: false,
      contract_revision: API_REVISION,
      capability_probe_revision: API_PROBE_REVISION,
      fallback_occurred: false,
      fallback_disclosure:
        "No fallback. Only the selected App API connection and model were used.",
      ms: Date.now() - started,
      searched_at:
        capability === "web_search" ? new Date().toISOString() : null,
      query: request.query ?? null,
      results: sources,
      citations: sources.map((s) => s.url),
      ...(structured === undefined ? {} : { structured }),
    };
  };
  if (capability === "research") {
    const research = request.research;
    if (!research) refuse("invalid_research_input");
    if (
      research!.budget.max_elapsed_ms > config.timeoutSeconds * 1000 ||
      research!.budget.max_download_bytes > config.maxTotalBytes
    )
      refuse("RELAY_RESEARCH_LIMIT_EXCEEDED");
    if (
      research!.allowed_tools.some((t) => ["search", "read_url"].includes(t)) &&
      capabilityOff(db, "web")
    )
      refuse("RELAY_CAPABILITY_OFF");
    if (
      research!.allowed_tools.some((t) =>
        ["read_file", "read_url"].includes(t),
      ) &&
      capabilityOff(db, "reading")
    )
      refuse("RELAY_CAPABILITY_OFF");
    const answer = await runResearch({
      research: research!,
      files: (request.files ?? []).map((f) => ({
        ...f,
        id: f.id ?? refuse("invalid_research_input"),
      })),
      prompt: request.prompt ?? "",
      query: request.query,
      model: request.model!,
      fileHosts: config.fileHosts,
      allowedDomains: request.allowed_domains ?? [],
      maxFileBytes: config.maxFileBytes,
      maxFiles: config.maxFiles,
      visionEnabled: !capabilityOff(db, "vision"),
      signal,
      download: options.download,
      localRead: options.localRead,
      modelCall: async (prompt, images, web, turnSignal) => {
        const files = images.map((path) => ({
          name: "research.png",
          mime: "image/png",
          base64: readFileSync(path).toString("base64"),
        }));
        const result = await call(prompt, files, web, turnSignal);
        return {
          text: result.text,
          model: result.model ?? request.model!,
          modelReportedByEngine: result.model !== null,
          searchEvidence: result.searchEvidence,
        };
      },
    });
    assertCurrent();
    return {
      ...envelope({
        text: JSON.stringify(answer.result),
        model: answer.model.actual,
        usage: {},
        searchEvidence: [],
      }),
      research: answer,
      citations: answer.sources.flatMap((s) => (s.url ? [s.url] : [])),
    };
  }
  if (request.research) refuse("invalid_research_input");
  if (!request.prompt?.trim() && !request.query?.trim())
    refuse("RELAY_PROMPT_REQUIRED");
  const files: ApiAttachment[] = [...(options.attachments ?? [])];
  let consumed = 0,
    inlineTotal = 0;
  if ((request.files?.length ?? 0) > config.maxFiles)
    refuse("RELAY_TOO_MANY_FILES");
  for (const file of request.files ?? []) {
    let inline;
    try {
      inline = decodeRelayInlineFile(file, config.maxFileBytes);
    } catch (error) {
      refuse(
        error instanceof Error ? error.message : "RELAY_INLINE_FILE_INVALID",
      );
    }
    if (inline) {
      inlineTotal += inline.body.length;
      consumed += inline.body.length;
      if (
        inlineTotal > MAX_INLINE_TOTAL_BYTES ||
        consumed > config.maxTotalBytes
      )
        refuse("RELAY_TOTAL_TOO_LARGE");
      files.push({
        name: file.name,
        mime: inline.mime,
        base64: inline.body.toString("base64"),
      });
      continue;
    }
    if (!file.url || file.file_ref)
      refuse("RELAY_LOCAL_FILE_RESEARCH_REQUIRED");
    const source = await (options.download ?? downloadResearchSource)(
      file.url!,
      config.fileHosts,
      config.maxFileBytes,
      signal,
      (bytes) => {
        consumed += bytes;
        if (consumed > config.maxTotalBytes) refuse("RELAY_TOTAL_TOO_LARGE");
      },
    );
    if (file.sha256) {
      const { createHash } = await import("node:crypto");
      if (
        createHash("sha256").update(source.body).digest("hex") !== file.sha256
      )
        refuse("RELAY_FILE_HASH_MISMATCH");
    }
    if (!source.mime.startsWith("image/") && source.mime !== "application/pdf")
      refuse("RELAY_FILE_TYPE_UNSUPPORTED");
    files.push({
      name: file.name,
      mime: source.mime,
      base64: source.body.toString("base64"),
    });
  }
  if (
    ["vision_analysis", "document_analysis"].includes(capability) &&
    !files.length
  )
    refuse("RELAY_NO_FILE");
  if (
    capability === "vision_analysis" &&
    files.some((f) => !f.mime.startsWith("image/"))
  )
    refuse("RELAY_IMAGE_REQUIRED");
  if (
    capability === "document_analysis" &&
    files.some((f) => f.mime !== "application/pdf")
  )
    refuse("RELAY_PDF_REQUIRED");
  if (
    files.some((f) => f.mime.startsWith("image/")) &&
    capabilityOff(db, "vision")
  )
    refuse("RELAY_CAPABILITY_OFF:vision_analysis");
  if (
    files.some((f) => f.mime === "application/pdf") &&
    capabilityOff(db, "reading")
  )
    refuse("RELAY_CAPABILITY_OFF:document_analysis");
  return envelope(
    await call(
      request.query ?? request.prompt ?? "",
      files,
      capability === "web_search",
    ),
  );
}

export async function testApiModel(
  db: DatabaseHandle,
  secrets: string,
  profile: string,
  request: RelayModelTestRequest,
): Promise<RelayModelTestResult> {
  const capability = request.capability ?? "text_analysis",
    started = Date.now();
  const provider = apiProvider(request.engine.slice(4));
  if (!provider) refuse("RELAY_ENGINE_INVALID");
  const c = connection(db, secrets, profile, provider!.id);
  let actual: string | null = null,
    reported = false,
    ok = false,
    reason: string | null;
  try {
    const result = await runApiRelay(
      db,
      secrets,
      profile,
      {
        task: "api-model-test",
        engine: request.engine,
        model: request.model,
        effort: request.effort,
        capability,
        prompt:
          capability === "vision_analysis"
            ? "What color is this square? Reply with the color only."
            : capability === "structured_output"
              ? 'Return exactly this JSON: {"vaenyx_probe":"ok"}'
              : "Reply with exactly PONG.",
      },
      capability === "vision_analysis"
        ? {
            attachments: [
              {
                name: "probe.png",
                mime: "image/png",
                base64: redSquarePng().toString("base64"),
              },
            ],
          }
        : {},
    );
    actual = result.model;
    reported = result.model_reported_by_engine;
    ok =
      capability === "vision_analysis"
        ? namesRed(result.text)
        : capability === "structured_output"
          ? object(result.structured).vaenyx_probe === "ok"
          : result.text.trim() === "PONG";
    reason = ok ? null : "RELAY_MODEL_PROBE_FAILED";
  } catch (error) {
    reason =
      error instanceof ApiRelayError ? error.message : "RELAY_PROVIDER_FAILED";
  }
  note(db, profile, provider!.id, {
    ok,
    reason,
    path: "test",
    model: request.model,
    capability,
    effort: request.effort ?? null,
    revision: c.revision,
    at: new Date().toISOString(),
    actualModel: actual,
  });
  return {
    engine: request.engine,
    capability,
    requested_model: request.model,
    model: actual,
    model_reported_by_engine: reported,
    model_evidence: reported ? "engine_report" : "unknown",
    effort: request.effort ?? null,
    effort_reported_by_engine: false,
    status: ok ? "ok" : "failed",
    unavailable_reason: reason,
    ms: Date.now() - started,
    verified_at: new Date().toISOString(),
    contract_revision: API_REVISION,
    capability_probe_revision: API_PROBE_REVISION,
  };
}
