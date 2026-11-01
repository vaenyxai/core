import { Ajv } from "ajv";
import {
  ResearchRequestSchema,
  ResearchResponseSchema,
  ResearchFileSchema,
  type ResearchRequest,
  type ResearchResponse,
  type ResearchFile,
  type ResearchEvidence,
  type ResearchRange,
} from "@vaenyx/contracts";
const ajv = new Ajv({
  strict: false,
  allErrors: true,
  removeAdditional: false,
  coerceTypes: false,
});
const validateRequest = ajv.compile(ResearchRequestSchema);
const validateResponse = ajv.compile(ResearchResponseSchema);
const validateFile = ajv.compile(ResearchFileSchema);
export function assertResearchRequest(
  value: unknown,
  files: unknown[],
  model: string | undefined,
): asserts value is ResearchRequest {
  if (
    !validateRequest(value) ||
    files.some((file) => !validateFile(file)) ||
    !model
  )
    throw new Error("invalid_research_input");
  const ids = files.map((file) => (file as ResearchFile).id);
  if (new Set(ids).size !== ids.length) throw new Error("duplicate_file_id");
  if (Buffer.byteLength(JSON.stringify({ value, files })) > 500000)
    throw new Error("input_too_large");
}
export function assertResearchResponse(
  value: unknown,
): asserts value is ResearchResponse {
  if (!validateResponse(value)) throw new Error("invalid_output");
  const result = value as ResearchResponse;
  const unique = (items: { id: string }[]) =>
    new Set(items.map((item) => item.id)).size === items.length;
  if (
    !unique(result.sources) ||
    !unique(result.evidence) ||
    !unique(result.operations)
  )
    throw new Error("invalid_output");
  const sources = new Set(result.sources.map((item) => item.id));
  const operations = new Map(result.operations.map((item) => [item.id, item]));
  const rangeValid = (ranges: { from: number; to: number }[] | null) =>
    ranges === null || ranges.every((range) => range.to >= range.from);
  for (const source of result.sources)
    if (
      ![
        source.read_ranges,
        source.delivered_ranges,
        source.unread_ranges,
      ].every(rangeValid)
    )
      throw new Error("invalid_output");
  for (const operation of result.operations)
    if (
      (operation.source_id && !sources.has(operation.source_id)) ||
      !rangeValid(operation.requested_ranges) ||
      !rangeValid(operation.returned_ranges)
    )
      throw new Error("invalid_output");
  for (const evidence of result.evidence) {
    if (
      evidence.locator?.range &&
      evidence.locator.range.to < evidence.locator.range.from
    )
      throw new Error("invalid_evidence");
    if (evidence.source_id && !sources.has(evidence.source_id))
      throw new Error("invalid_evidence");
    if (evidence.operation_id && !operations.has(evidence.operation_id))
      throw new Error("invalid_evidence");
    if (evidence.kind === "quote" || evidence.kind === "visual_observation") {
      const op = evidence.operation_id
        ? operations.get(evidence.operation_id)
        : null;
      if (
        !op ||
        op.source_id !== evidence.source_id ||
        op.status !== "succeeded" ||
        !["read_file", "read_url"].includes(op.action)
      )
        throw new Error("invalid_evidence");
    }
  }
  for (const missing of result.missing)
    if (missing.attempted_operation_ids.some((id) => !operations.has(id)))
      throw new Error("invalid_evidence");
}
export interface DeliveredEvidence {
  sourceId: string;
  text: string;
  pages: { from: number; to: number } | null;
  pageTexts: Map<number, string>;
  visual: boolean;
  range: ResearchRange;
}
export function verifyResearchEvidence(
  evidence: ResearchEvidence[],
  delivered: Map<string, DeliveredEvidence>,
): ResearchEvidence[] {
  const ids = new Set(evidence.map((item) => item.id));
  if (ids.size !== evidence.length) throw new Error("invalid_output");
  const byId = new Map(evidence.map((item) => [item.id, item]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const check = (id: string): void => {
    if (visiting.has(id)) throw new Error("invalid_evidence");
    if (visited.has(id)) return;
    visiting.add(id);
    for (const premise of byId.get(id)?.premise_evidence_ids ?? []) {
      if (!byId.has(premise)) throw new Error("invalid_evidence");
      check(premise);
    }
    visiting.delete(id);
    visited.add(id);
  };
  evidence.forEach((item) => check(item.id));
  return evidence.map((item) => {
    const read = item.operation_id
      ? delivered.get(item.operation_id)
      : undefined;
    if (item.kind === "quote") {
      const page = item.locator?.page;
      if (
        !read ||
        read.sourceId !== item.source_id ||
        !item.quote ||
        !read.text.includes(item.quote)
      )
        throw new Error("invalid_evidence");
      if (!read.pages) {
        const range = item.locator?.range;
        const offset = read.range.from + read.text.indexOf(item.quote);
        if (
          !range ||
          range.unit !== read.range.unit ||
          range.from < read.range.from ||
          range.to > read.range.to ||
          range.from > offset ||
          range.to < offset + item.quote.length - 1
        )
          throw new Error("invalid_evidence");
      }
      if (
        read.pages &&
        (!page || page < read.pages.from || page > read.pages.to)
      )
        throw new Error("invalid_evidence");
      if (page) {
        const part = read.pageTexts.get(page);
        if (!part?.includes(item.quote)) throw new Error("invalid_evidence");
      }
      return { ...item, quote_verified: true };
    }
    if (
      item.kind === "visual_observation" &&
      (!read?.visual ||
        read.sourceId !== item.source_id ||
        !item.locator?.page ||
        !read.pages ||
        item.locator.page < read.pages.from ||
        item.locator.page > read.pages.to)
    )
      throw new Error("invalid_evidence");
    if (
      item.kind === "inference" &&
      (item.premise_evidence_ids.length === 0 ||
        item.premise_evidence_ids.some((id) => !ids.has(id) || id === item.id))
    )
      throw new Error("invalid_evidence");
    return { ...item, quote_verified: null };
  });
}
export function validateEvidenceReferences(
  value: unknown,
  ids: Set<string>,
): void {
  if (Array.isArray(value)) {
    value.forEach((item) => validateEvidenceReferences(item, ids));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (
      key === "evidence_ids" &&
      (!Array.isArray(child) ||
        child.some((id) => typeof id !== "string" || !ids.has(id)))
    )
      throw new Error("invalid_evidence");
    validateEvidenceReferences(child, ids);
  }
}
