import { PROTOCOL } from "./research-protocol.js";
import { finishResearch } from "./research-output.js";
import { researchDeadline } from "./research-deadline.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  ResearchRequest,
  ResearchResponse,
  ResearchFile,
  ResearchError,
  ResearchOperation,
} from "@vaenyx/contracts";
import { ResearchSources } from "./research-sources.js";
import type { ResearchDownloader } from "./research-fetch.js";
import {
  normalizeSearchRunEvidence,
  relaySearchPrompt,
} from "./relay-search.js";
import {
  assertResearchRequest,
  assertResearchResponse,
  type DeliveredEvidence,
} from "./research-validation.js";

export interface ResearchModelReply {
  text: string;
  model: string;
  modelReportedByEngine: boolean;
  searchEvidence: unknown[];
}
export type ResearchModel = (
  prompt: string,
  images: string[],
  web: boolean,
  signal: AbortSignal,
) => Promise<ResearchModelReply>;
export interface ResearchRunInput {
  research: ResearchRequest;
  files: ResearchFile[];
  prompt: string;
  query?: string;
  model: string;
  fileHosts: string[];
  allowedDomains: string[];
  maxFileBytes: number;
  maxFiles: number;
  visionEnabled?: boolean;
  modelCall: ResearchModel;
  download?: ResearchDownloader;
  signal?: AbortSignal;
}
function safeError(
  error: unknown,
  stage: string,
  started: boolean,
  partial: boolean,
  aborted: boolean,
): ResearchError {
  const raw = error instanceof Error ? error.message : "";
  const code = aborted
    ? "timeout"
    : /^[a-z_0-9]+$/.test(raw)
      ? raw
      : "research_engine_failed";
  return {
    code,
    stage,
    message: code.replace(/_/g, " "),
    execution_state: started
      ? aborted
        ? "unknown"
        : "started"
      : "not_started",
    retryable: !started,
    partial_result_available: partial,
  };
}
export async function runResearch(
  input: ResearchRunInput,
): Promise<ResearchResponse> {
  const startedAt = Date.now();
  const request = input.research;
  const response: ResearchResponse = {
    version: 1,
    request_id: request.request_id,
    task_id: request.task_id,
    constraints_hash: request.constraints_hash,
    status: "failed",
    stop_reason: "not_started",
    result: null,
    sources: [],
    evidence: [],
    missing: [],
    conflicts: [],
    operations: [],
    model: { requested: input.model, actual: null, evidence: null },
    usage: {
      elapsed_ms: 0,
      tool_actions: 0,
      downloaded_bytes: 0,
      tokens: null,
      cost: null,
    },
    error: null,
  };
  let modelStarted = false;
  let stage = "validation";
  let scratch: string | undefined;
  let sources: ResearchSources | undefined;
  const controller = new AbortController();
  const externalAbort = () => controller.abort();
  input.signal?.addEventListener("abort", externalAbort, { once: true });
  if (input.signal?.aborted) controller.abort();
  const timer = setTimeout(
    () => controller.abort(),
    request.budget.max_elapsed_ms,
  );
  const delivered = new Map<string, DeliveredEvidence>();
  const history: unknown[] = [];
  const images: string[] = [];
  let requestedFollowup = false;
  const allowed = new Set(request.allowed_tools);
  const operation = (
    action: ResearchOperation["action"],
    query: string | null = null,
  ): ResearchOperation => ({
    id: `op-${response.operations.length + 1}`,
    action,
    source_id: null,
    query,
    requested_ranges: null,
    returned_ranges: null,
    status: "unknown",
    recorded_by: "host",
    observability:
      action === "search" || action === "analyze" ? "partial" : "complete",
    started_at: new Date().toISOString(),
    duration_ms: null,
    error: null,
  });
  const invokeModel = async (
    prompt: string,
    web: boolean,
  ): Promise<ResearchModelReply> => {
    controller.signal.throwIfAborted();
    modelStarted = true;
    const reply = await researchDeadline(
      input.modelCall(prompt, web ? [] : images, web, controller.signal),
      controller.signal,
    );
    controller.signal.throwIfAborted();
    if (reply.modelReportedByEngine) {
      response.model.actual = reply.model;
      response.model.evidence = "engine_report";
    } else if (reply.model !== "unknown")
      response.model.evidence = "thread_config_echo_and_turn_completed";
    return reply;
  };
  try {
    assertResearchRequest(request, input.files, input.model);
    if (request.budget.max_tokens !== null || request.budget.max_cost !== null)
      throw new Error("budget_not_enforceable");
    if (input.files.length > input.maxFiles) throw new Error("input_too_large");
    scratch = mkdtempSync(join(tmpdir(), "vaenyx-research-"));
    sources = new ResearchSources({
      files: input.files,
      urls: request.urls,
      fileHosts: input.fileHosts,
      allowedDomains: input.allowedDomains,
      maxBytes: request.budget.max_download_bytes,
      maxFileBytes: input.maxFileBytes,
      scratch,
      signal: controller.signal,
      download: input.download,
      visionEnabled: input.visionEnabled,
    });
    // One final analysis is allowed after the last dispatched tool. No persistent session state.
    for (let turn = 0; turn <= request.budget.max_tool_actions + 1; turn++) {
      controller.signal.throwIfAborted();
      stage = "analysis";
      const envelope = {
        task: input.prompt,
        query: input.query ?? null,
        constraints: request.constraints,
        required_fields: request.required_fields,
        context: request.context,
        files: input.files.map(({ id, name, mime }) => ({
          id,
          name,
          mime: mime ?? null,
        })),
        sources: sources.list(),
        allowed_tools: request.allowed_tools,
        remaining_tool_actions:
          request.budget.max_tool_actions - response.usage.tool_actions,
        history,
      };
      const prompt = PROTOCOL + "\nINPUT DATA:\n" + JSON.stringify(envelope);
      if (prompt.length > 500000 || images.length > 40)
        throw new Error("input_too_large");
      const analysis = operation("analyze");
      response.operations.push(analysis);
      const analysisAt = Date.now();
      const reply = await invokeModel(prompt, false);
      analysis.duration_ms = Date.now() - analysisAt;
      analysis.status = "succeeded";
      let decision: Record<string, unknown>;
      try {
        decision = JSON.parse(reply.text) as Record<string, unknown>;
      } catch {
        throw new Error("invalid_output");
      }
      if (!decision || typeof decision !== "object" || Array.isArray(decision))
        throw new Error("invalid_output");
      if (decision.action === "finish") {
        finishResearch(decision, response, request, sources.list(), delivered);
        if (
          response.status === "partial" &&
          !requestedFollowup &&
          allowed.size > 0 &&
          response.usage.tool_actions < request.budget.max_tool_actions
        ) {
          requestedFollowup = true;
          history.push({
            host_feedback:
              "Requirements or reading coverage remain unresolved. Execute a useful permitted follow-up tool action now. If there is no permitted useful action, finish explicitly partial and state why. Do not simply promise more research.",
            missing: response.missing,
            conflicts: response.conflicts,
          });
          response.status = "failed";
          response.stop_reason = "not_started";
          response.result = null;
          response.evidence = [];
          response.missing = [];
          response.conflicts = [];
          continue;
        }
        break;
      }
      if (response.usage.tool_actions >= request.budget.max_tool_actions) {
        response.status = "partial";
        response.stop_reason = "tool_budget_exhausted";
        break;
      }
      const action = decision.action;
      if (
        action !== "search" &&
        action !== "read_url" &&
        action !== "read_file"
      )
        throw new Error("invalid_output");
      if (!allowed.has(action)) throw new Error("unsupported_capability");
      stage = action;
      response.usage.tool_actions++;
      const op = operation(
        action,
        typeof decision.query === "string" ? decision.query : null,
      );
      response.operations.push(op);
      const operationAt = Date.now();
      try {
        if (action === "search") {
          if (!op.query || op.query.length > 20000)
            throw new Error("invalid_output");
          const found = await invokeModel(
            relaySearchPrompt({
              query: op.query,
              allowedDomains: input.allowedDomains,
              maxResults: 20,
            }),
            true,
          );
          const results = normalizeSearchRunEvidence(
            found.searchEvidence,
            found.text,
            { allowedDomains: input.allowedDomains, maxResults: 20 },
          );
          // Discovery only: final-model URLs are never converted to quote evidence.
          history.push({
            operation_id: op.id,
            action,
            results: results.map((result) => ({
              ...result,
              source_id: sources!.add(result.url).id,
            })),
            warning:
              "Search excerpts are unverified discovery, not proof of full-page reading. Native internal actions are not counted by the host budget.",
          });
        } else {
          if (
            (action === "read_file" &&
              (typeof decision.file_id !== "string" ||
                decision.url !== undefined)) ||
            (action === "read_url" &&
              (typeof decision.url !== "string" ||
                decision.file_id !== undefined))
          )
            throw new Error("invalid_output");
          const read = await researchDeadline(
            sources.read({
              file_id:
                typeof decision.file_id === "string"
                  ? decision.file_id
                  : undefined,
              url: typeof decision.url === "string" ? decision.url : undefined,
              from: Number(decision.from),
              to: Number(decision.to),
              visual: decision.visual === true,
            }),
            controller.signal,
          );
          op.source_id = read.source.id;
          op.requested_ranges = [read.range];
          op.returned_ranges = [read.range];
          delivered.set(op.id, {
            sourceId: read.source.id,
            range: read.range,
            text: read.text,
            pageTexts: read.pageTexts,
            pages:
              read.range.unit === "page"
                ? { from: read.range.from, to: read.range.to }
                : null,
            visual: read.images.length > 0,
          });
          images.push(...read.images);
          history.push({
            operation_id: op.id,
            source_id: read.source.id,
            range: read.range,
            total_units: read.totalUnits,
            text: read.text,
            images: read.images.length,
            warning: read.source.reason,
          });
        }
        op.status = "succeeded";
      } catch (error) {
        if (controller.signal.aborted) throw error;
        op.status = "failed";
        op.error = safeError(
          error,
          stage,
          modelStarted,
          sources.list().length > 0,
          false,
        );
        history.push({ operation_id: op.id, error: op.error.code });
      } finally {
        op.duration_ms = Date.now() - operationAt;
      }
    }
  } catch (error) {
    response.error = safeError(
      error,
      stage,
      modelStarted,
      delivered.size > 0,
      controller.signal.aborted,
    );
    response.status = delivered.size ? "partial" : "failed";
    response.stop_reason = response.error.code;
    // Unvalidated model content must not escape through a partial response.
    response.result = null;
    response.evidence = [];
    response.conflicts = [];
    response.missing = [];
    const pending = response.operations.at(-1);
    if (pending?.status === "unknown") {
      pending.status = controller.signal.aborted ? "unknown" : "failed";
      pending.error = response.error;
    }
  } finally {
    clearTimeout(timer);
    input.signal?.removeEventListener("abort", externalAbort);
    response.sources = structuredClone(sources?.list() ?? []);
    response.usage.downloaded_bytes = sources?.downloadedBytes ?? 0;
    response.usage.elapsed_ms = Date.now() - startedAt;
    if (scratch) rmSync(scratch, { force: true, recursive: true });
  }
  if (response.stop_reason === "not_started" && response.operations.length) {
    response.status = "partial";
    response.stop_reason = "analysis_budget_exhausted";
  }
  if (response.status !== "complete" && response.result === null)
    for (const field of request.required_fields)
      if (!response.missing.some((item) => item.field === field))
        response.missing.push({
          field,
          reason: response.stop_reason,
          attempted_operation_ids: response.operations
            .filter((op) => op.action !== "analyze")
            .map((op) => op.id),
        });
  assertResearchResponse(response);
  return response;
}
