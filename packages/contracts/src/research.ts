import { Type, type Static, type TSchema } from "@sinclair/typebox";

// A single type union preserves null under Fastify/Ajv coercion. An anyOf
// branch may otherwise turn an unknown number into zero or text into "".
const nullable = <T extends TSchema>(schema: T) =>
  Type.Unsafe<Static<T> | null>({ ...schema, type: [schema.type, "null"] });
const object = <T extends Record<string, TSchema>>(properties: T) =>
  Type.Object(properties, { additionalProperties: false });
const id = Type.String({ minLength: 1, maxLength: 160 });
const text = Type.String();
const enumeration = <T extends string>(values: T[]) =>
  Type.Union(values.map((value) => Type.Literal(value)));
export const ResearchToolSchema = enumeration([
  "search",
  "read_url",
  "read_file",
]);
export const ResearchRangeSchema = object({
  unit: enumeration(["page", "section", "character"]),
  from: Type.Integer({ minimum: 1 }),
  to: Type.Integer({ minimum: 1 }),
});
export const ResearchLocatorSchema = object({
  page: nullable(Type.Integer({ minimum: 1 })),
  section: nullable(text),
  region: nullable(Type.Array(Type.Number(), { minItems: 4, maxItems: 4 })),
  range: nullable(ResearchRangeSchema),
});
export const ResearchFileSchema = object({
  id,
  name: Type.String({ minLength: 1, maxLength: 200 }),
  url: Type.Optional(Type.String({ minLength: 8, maxLength: 4000 })),
  file_ref: Type.Optional(
    object({
      version: Type.Literal(1),
      token: Type.String({ pattern: "^[A-Za-z0-9_-]{43}$" }),
    }),
  ),
  sha256: Type.Optional(
    nullable(Type.String({ pattern: "^[a-fA-F0-9]{64}$" })),
  ),
  mime: Type.Optional(nullable(Type.String({ maxLength: 200 }))),
});
export const ResearchBudgetSchema = object({
  max_elapsed_ms: Type.Integer({ minimum: 1000, maximum: 600000 }),
  max_tool_actions: Type.Integer({ minimum: 0, maximum: 80 }),
  max_download_bytes: Type.Integer({ minimum: 0, maximum: 62914560 }),
  max_tokens: nullable(Type.Integer({ minimum: 1 })),
  max_cost: nullable(Type.Number({ minimum: 0 })),
});
export const ResearchRequestSchema = object({
  version: Type.Literal(1),
  request_id: id,
  task_id: id,
  constraints_hash: id,
  constraints: Type.Array(Type.String({ maxLength: 20000 }), { maxItems: 100 }),
  required_fields: Type.Array(id, { maxItems: 100 }),
  urls: Type.Array(Type.String({ maxLength: 4000 }), { maxItems: 40 }),
  allowed_tools: Type.Array(ResearchToolSchema, {
    uniqueItems: true,
    maxItems: 3,
  }),
  budget: ResearchBudgetSchema,
  context: object({
    subject: Type.Unknown(),
    prior_evidence: Type.Array(Type.Unknown(), { maxItems: 200 }),
    feedback: Type.Array(Type.Unknown(), { maxItems: 200 }),
  }),
});
export const ResearchErrorSchema = object({
  code: text,
  stage: text,
  message: text,
  execution_state: enumeration(["not_started", "started", "unknown"]),
  retryable: Type.Boolean(),
  partial_result_available: Type.Boolean(),
});
export const ResearchSourceSchema = object({
  id,
  input_file_id: nullable(id),
  url: nullable(text),
  content_hash: nullable(text),
  fetched_at: nullable(text),
  document_date: nullable(text),
  page_count: nullable(Type.Integer({ minimum: 0 })),
  read_ranges: nullable(Type.Array(ResearchRangeSchema)),
  delivered_ranges: nullable(Type.Array(ResearchRangeSchema)),
  unread_ranges: nullable(Type.Array(ResearchRangeSchema)),
  coverage: enumeration([
    "discovered",
    "excerpt_only",
    "partial",
    "complete",
    "failed",
    "unknown",
  ]),
  representation: enumeration([
    "extracted_text",
    "rendered_page",
    "html_text",
    "tool_excerpt",
    "unknown",
  ]),
  truncated: nullable(Type.Boolean()),
  reason: nullable(text),
});
export const ResearchEvidenceSchema = object({
  id,
  source_id: nullable(id),
  operation_id: nullable(id),
  kind: enumeration([
    "quote",
    "visual_observation",
    "inference",
    "human_provided",
    "historical_summary",
  ]),
  quote: nullable(text),
  observation: nullable(text),
  locator: nullable(ResearchLocatorSchema),
  quote_verified: nullable(Type.Boolean()),
  premise_evidence_ids: Type.Array(id),
});
export const ResearchOperationSchema = object({
  id,
  action: enumeration(["search", "read_url", "read_file", "analyze"]),
  source_id: nullable(id),
  query: nullable(text),
  requested_ranges: nullable(Type.Array(ResearchRangeSchema)),
  returned_ranges: nullable(Type.Array(ResearchRangeSchema)),
  status: enumeration(["succeeded", "failed", "cancelled", "unknown"]),
  recorded_by: enumeration(["host", "engine"]),
  observability: enumeration(["complete", "partial", "unknown"]),
  started_at: nullable(text),
  duration_ms: nullable(Type.Number({ minimum: 0 })),
  error: nullable(ResearchErrorSchema),
});
export const ResearchResponseSchema = object({
  version: Type.Literal(1),
  request_id: id,
  task_id: id,
  constraints_hash: id,
  status: enumeration(["complete", "partial", "failed"]),
  stop_reason: text,
  result: Type.Unknown(),
  sources: Type.Array(ResearchSourceSchema),
  evidence: Type.Array(ResearchEvidenceSchema),
  missing: Type.Array(
    object({
      field: text,
      reason: text,
      attempted_operation_ids: Type.Array(id),
    }),
  ),
  conflicts: Type.Array(
    object({
      field: text,
      candidates: Type.Array(
        object({ value: Type.Unknown(), evidence_ids: Type.Array(id) }),
      ),
      resolution: nullable(text),
    }),
  ),
  operations: Type.Array(ResearchOperationSchema),
  model: object({
    requested: text,
    actual: nullable(text),
    evidence: nullable(text),
  }),
  usage: object({
    elapsed_ms: Type.Number({ minimum: 0 }),
    tool_actions: Type.Integer({ minimum: 0 }),
    downloaded_bytes: Type.Integer({ minimum: 0 }),
    tokens: nullable(Type.Integer({ minimum: 0 })),
    cost: nullable(Type.Number({ minimum: 0 })),
  }),
  error: nullable(ResearchErrorSchema),
});
export type ResearchRequest = Static<typeof ResearchRequestSchema>;
export type ResearchResponse = Static<typeof ResearchResponseSchema>;
export type ResearchFile = Static<typeof ResearchFileSchema>;
export type ResearchSource = Static<typeof ResearchSourceSchema>;
export type ResearchEvidence = Static<typeof ResearchEvidenceSchema>;
export type ResearchOperation = Static<typeof ResearchOperationSchema>;
export type ResearchError = Static<typeof ResearchErrorSchema>;
export type ResearchRange = Static<typeof ResearchRangeSchema>;
