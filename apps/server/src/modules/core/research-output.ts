import type {
  ResearchRequest,
  ResearchResponse,
  ResearchSource,
} from "@vaenyx/contracts";
import {
  assertResearchResponse,
  verifyResearchEvidence,
  validateEvidenceReferences,
  type DeliveredEvidence,
} from "./research-validation.js";
import { ResearchValidationError } from "./research-errors.js";
export function finishResearch(
  decision: Record<string, unknown>,
  response: ResearchResponse,
  request: ResearchRequest,
  sources: ResearchSource[],
  delivered: Map<string, DeliveredEvidence>,
): void {
  response.result = decision.result ?? null;
  response.evidence = decision.evidence as ResearchResponse["evidence"];
  response.missing = decision.missing as ResearchResponse["missing"];
  response.conflicts = decision.conflicts as ResearchResponse["conflicts"];
  response.stop_reason =
    typeof decision.stop_reason === "string"
      ? decision.stop_reason
      : "completed";
  response.sources = sources;
  assertResearchResponse(response);
  response.evidence = verifyResearchEvidence(response.evidence, delivered);
  const ids = new Set(response.evidence.map((item) => item.id));
  validateEvidenceReferences(response.result, ids);
  validateEvidenceReferences(response.conflicts, ids);
  for (const [index, evidence] of response.evidence.entries()) {
    if (
      ["human_provided", "historical_summary"].includes(evidence.kind) &&
      !request.context.prior_evidence.some(
        (prior) =>
          prior &&
          typeof prior === "object" &&
          (prior as Record<string, unknown>).id === evidence.id &&
          (prior as Record<string, unknown>).kind === evidence.kind &&
          (prior as Record<string, unknown>).quote === evidence.quote &&
          (prior as Record<string, unknown>).observation ===
            evidence.observation,
      )
    )
      throw new ResearchValidationError(
        "invalid_evidence",
        `evidence[${index}].kind claims caller-provided or historical evidence that is absent from context.prior_evidence. Use evidence from a successful read; do not invent caller material.`,
      );
  }
  const result =
    response.result &&
    typeof response.result === "object" &&
    !Array.isArray(response.result)
      ? (response.result as Record<string, unknown>)
      : {};
  const grounded = (value: unknown): boolean => {
    if (!value || typeof value !== "object") return false;
    if (Array.isArray(value)) return value.some(grounded);
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.evidence_ids) && record.evidence_ids.length > 0)
      return true;
    return Object.values(record).some(grounded);
  };
  for (const field of request.required_fields) {
    const value = result[field];
    const unknown =
      value === undefined ||
      value === null ||
      (typeof value === "object" &&
        value !== null &&
        "value" in value &&
        (value as { value: unknown }).value === null);
    if (
      (unknown || !grounded(value)) &&
      !response.missing.some((item) => item.field === field)
    )
      response.missing.push({
        field,
        reason: unknown
          ? "required_field_unknown"
          : "required_field_without_evidence",
        attempted_operation_ids: [],
      });
  }
  response.status =
    response.missing.length ||
    response.conflicts.some((conflict) => conflict.resolution === null) ||
    response.result === null ||
    response.sources.some(
      (source) => source.coverage !== "complete" || source.truncated !== false,
    )
      ? "partial"
      : "complete";
  if (response.status === "partial" && response.stop_reason === "completed")
    response.stop_reason = "unresolved_requirements";
}
