// Independent paid/API transport. Keys come from the App's approved secure backend.
import { API_PROVIDERS } from "./provider-definitions.mjs";
import {
  apiModels,
  apiCapabilities,
  invokeApi,
  apiModelHonoured,
} from "./providers.mjs";
import { problem } from "./protocol.mjs";
import { normalizeSearchEvidence } from "./search.mjs";
const aliases = {
  text: "text_analysis",
  vision: "vision_analysis",
  reading: "document_analysis",
  web: "web_search",
};
export const providers = () =>
  API_PROVIDERS.map(({ id, name }) => ({
    id,
    name,
    engine: "api-" + id,
    capabilities: apiCapabilities(id).filter(
      (capability) => capability !== "research",
    ),
  }));
export function createDirectClient({
  provider,
  apiKey,
  fetcher = globalThis.fetch,
  timeoutMs = 125000,
}) {
  if (
    !API_PROVIDERS.some((p) => p.id === provider) ||
    typeof apiKey !== "string" ||
    !apiKey
  )
    throw problem("unconfigured");
  const connection = { apiKey, revision: "direct", connectedAt: "" };
  async function bounded(action, run = false) {
    const abort = new globalThis.AbortController();
    let timer;
    const deadline = new Promise((_, reject) => {
      timer = globalThis.setTimeout(() => {
        abort.abort();
        reject(
          problem(run ? "outcome_unknown" : "unreachable", { unknown: run }),
        );
      }, timeoutMs);
    });
    try {
      return await Promise.race([deadline, action(abort.signal)]);
    } catch (error) {
      if (error?.code) throw error;
      const code = /^RELAY_[A-Z0-9_]+$/.test(error?.message || "")
        ? error.message
        : "outcome_unknown";
      throw problem(code, {
        unknown: run && error?.started !== false,
        status: error?.status,
      });
    } finally {
      globalThis.clearTimeout(timer);
    }
  }
  return {
    models: () =>
      bounded((signal) => apiModels(provider, connection, signal, fetcher)),
    run: (request, { attachments = [], messages } = {}) =>
      bounded(async (signal) => {
        const started = Date.now(),
          capability = aliases[request.capability] || request.capability;
        if (capability === "research")
          throw problem("RELAY_RESEARCH_ORCHESTRATION_REQUIRED", {
            unknown: false,
          });
        if (
          !request.model ||
          !capability ||
          (request.engine && request.engine !== "api-" + provider)
        )
          throw problem("invalid_request", { unknown: false });
        const reply = await invokeApi(
          provider,
          connection,
          {
            model: request.model,
            capability,
            prompt: request.prompt || request.query || "",
            files: attachments,
            messages,
            effort: request.effort,
            requirements: request.requirements,
            allowedDomains: request.allowed_domains,
            maxResults: request.max_results,
          },
          signal,
          fetcher,
        );
        if (!apiModelHonoured(provider, request.model, reply.model))
          throw problem("response_binding_mismatch", { unknown: true });
        if (!reply.text.trim())
          throw problem("invalid_response", { unknown: true });
        let structured;
        if (capability === "structured_output") {
          try {
            structured = JSON.parse(reply.text);
          } catch {
            throw problem("invalid_response", { unknown: true });
          }
        }
        const sources =
          capability === "web_search"
            ? normalizeSearchEvidence(reply.searchEvidence, {
                allowedDomains: request.allowed_domains,
                maxResults: request.max_results,
              })
            : [];
        if (capability === "web_search" && !sources.length)
          throw problem("RELAY_VERIFIABLE_SOURCES_REQUIRED", { unknown: true });
        const u = reply.usage || {},
          number = (v) =>
            typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
        return {
          contract_revision: "2.3",
          capability_probe_revision: "2026-11-03.api.1",
          ms: Date.now() - started,
          effort: request.effort ?? null,
          effort_reported_by_engine: false,
          results: sources,
          citations: sources.map((s) => s.url),
          tool_calls: reply.tools ?? 0,
          searched_at:
            capability === "web_search" ? new Date().toISOString() : null,
          text: reply.text,
          structured,
          provider,
          engine: "api-" + provider,
          model: reply.model || request.model,
          requested_model: request.model,
          model_reported_by_engine: !!reply.model,
          model_evidence: reply.model
            ? "engine_report"
            : "provider_request_and_response_completed",
          fallback_occurred: false,
          usage: {
            input_tokens: number(
              u.input_tokens ?? u.prompt_tokens ?? u.promptTokenCount,
            ),
            output_tokens: number(
              u.output_tokens ?? u.completion_tokens ?? u.candidatesTokenCount,
            ),
            reasoning_tokens: number(
              u.output_tokens_details?.reasoning_tokens ?? u.thoughtsTokenCount,
            ),
            cached_tokens: number(
              u.cache_read_input_tokens ??
                u.prompt_tokens_details?.cached_tokens ??
                u.input_tokens_details?.cached_tokens ??
                u.cachedContentTokenCount,
            ),
          },
          search_evidence: reply.searchEvidence,
        };
      }, true),
  };
}
