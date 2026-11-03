// The only layer that knows vendor schemas. No App names or implicit model choices.
import {
  API_PROVIDERS,
  type ApiProvider,
  type ApiConnection,
} from "./relay-api-config.js";
import {
  array,
  object,
  string,
  providerJSON,
  refuse,
  ApiRelayError,
  type Json,
} from "./relay-api-wire.js";
export interface ApiAttachment {
  name: string;
  mime: string;
  base64: string;
}
export interface ApiInvocation {
  model: string;
  capability: string;
  prompt: string;
  files: ApiAttachment[];
  effort?: string;
  allowedDomains?: string[];
  maxResults?: number;
  requirements?: Json;
}
export interface ApiReply {
  text: string;
  model: string | null;
  searchEvidence: unknown[];
  usage: Json;
  tools?: number;
}
const preset = (id: ApiProvider) => API_PROVIDERS.find((p) => p.id === id)!;
export function apiModelHonoured(
  id: string,
  requested: string,
  actual: string | null,
): boolean {
  if (!actual || actual === requested) return true;
  // Native providers report a dated snapshot when a documented alias was requested.
  if (
    !["openai", "anthropic"].includes(id) ||
    !actual.startsWith(requested + "-")
  )
    return false;
  return /^(?:\d{4}-\d{2}-\d{2}|\d{8})$/.test(
    actual.slice(requested.length + 1),
  );
}
export function apiCapabilities(id: ApiProvider): string[] {
  const caps = [
    "text_analysis",
    "structured_output",
    "vision_analysis",
    "research",
  ];
  if (["responses", "anthropic", "gemini"].includes(preset(id).wire))
    caps.push("document_analysis");
  if (["openai", "anthropic", "gemini", "grok"].includes(id))
    caps.push("web_search");
  return caps;
}
export async function apiModels(
  id: ApiProvider,
  c: ApiConnection,
  signal: AbortSignal,
  fetcher = globalThis.fetch,
) {
  const p = preset(id),
    models: {
      id: string;
      display_name: string;
      input: string[];
      efforts: string[];
      selectable: boolean;
      unavailable_reason: null;
      resolved_id: string;
      default: boolean;
      default_effort: null;
      upgrade_to: null;
      model_reported_by_engine: boolean;
      verified: unknown[];
    }[] = [];
  let next = "",
    pages = 0;
  do {
    const suffix =
      id === "gemini"
        ? "?pageSize=1000" +
          (next ? "&pageToken=" + encodeURIComponent(next) : "")
        : id === "anthropic"
          ? "?limit=1000" +
            (next ? "&after_id=" + encodeURIComponent(next) : "")
          : "";
    const response = await providerJSON(
      p.base + "/models" + suffix,
      c.apiKey,
      p.wire,
      undefined,
      signal,
      fetcher,
    );
    for (const raw of array(response.models ?? response.data)) {
      const row = object(raw),
        model = string(row.id) || string(row.name).replace(/^models\//, "");
      if (!model || models.some((m) => m.id === model)) continue;
      if (
        id === "gemini" &&
        !array(row.supportedGenerationMethods).includes("generateContent")
      )
        continue;
      models.push({
        id: model,
        resolved_id: model,
        display_name:
          string(row.display_name) ||
          string(row.displayName) ||
          string(row.name) ||
          model,
        input: [],
        efforts: [],
        selectable: true,
        unavailable_reason: null,
        default: false,
        default_effort: null,
        upgrade_to: null,
        model_reported_by_engine: true,
        verified: [],
      });
    }
    next =
      id === "gemini"
        ? string(response.nextPageToken)
        : id === "anthropic" && response.has_more === true
          ? string(response.last_id)
          : "";
    if (++pages >= 20 && next) refuse("RELAY_MODEL_CATALOGUE_LIMIT");
  } while (next);
  return models;
}
function parameters(r: ApiInvocation, wire: string): Json {
  const req = r.requirements ?? {},
    out: Json = {};
  if (
    Object.keys(req).some(
      (k) => !["max_output_tokens", "temperature", "schema"].includes(k),
    )
  )
    refuse("RELAY_REQUIREMENT_UNSUPPORTED");
  if (req.max_output_tokens !== undefined) {
    if (
      !Number.isInteger(req.max_output_tokens) ||
      Number(req.max_output_tokens) < 1 ||
      Number(req.max_output_tokens) > 128000
    )
      refuse("RELAY_REQUIREMENT_INVALID");
    out[
      wire === "responses"
        ? "max_output_tokens"
        : wire === "gemini"
          ? "maxOutputTokens"
          : "max_tokens"
    ] = req.max_output_tokens;
  }
  if (req.temperature !== undefined) {
    if (
      typeof req.temperature !== "number" ||
      req.temperature < 0 ||
      req.temperature > 2
    )
      refuse("RELAY_REQUIREMENT_INVALID");
    out.temperature = req.temperature;
  }
  return out;
}
async function dispatchApi(
  id: ApiProvider,
  c: ApiConnection,
  r: ApiInvocation,
  signal: AbortSignal,
  fetcher = globalThis.fetch,
): Promise<ApiReply> {
  const p = preset(id),
    web = r.capability === "web_search";
  if (!apiCapabilities(id).includes(r.capability))
    refuse("RELAY_CAPABILITY_UNSUPPORTED");
  const opts = parameters(r, p.wire),
    schema = r.requirements?.schema,
    json = r.capability === "structured_output" || !!schema;
  if (
    schema &&
    (!Object.keys(object(schema)).length || (web && p.wire !== "responses"))
  )
    refuse("RELAY_REQUIREMENT_UNSUPPORTED");
  if (
    r.files.length > 20 ||
    r.files.reduce((sum, f) => sum + f.base64.length, 0) > 44000000
  )
    refuse("RELAY_TOTAL_TOO_LARGE");
  for (const f of r.files) {
    if (
      !/^[A-Za-z0-9+/]+={0,2}$/.test(f.base64) ||
      !f.mime ||
      (!f.mime.startsWith("image/") &&
        f.mime !== "application/pdf" &&
        !(p.wire === "gemini" && f.mime.startsWith("audio/")))
    )
      refuse("RELAY_FILE_TYPE_UNSUPPORTED");
    if (p.wire !== "gemini" && f.mime.startsWith("audio/"))
      refuse("RELAY_CAPABILITY_UNSUPPORTED");
  }
  if (r.effort && p.wire !== "responses") refuse("RELAY_EFFORT_INVALID");
  let response: Json;
  if (p.wire === "responses") {
    const content: Json[] = [{ type: "input_text", text: r.prompt }];
    for (const f of r.files)
      content.push(
        f.mime === "application/pdf"
          ? {
              type: "input_file",
              filename: f.name,
              file_data: "data:" + f.mime + ";base64," + f.base64,
            }
          : {
              type: "input_image",
              image_url: "data:" + f.mime + ";base64," + f.base64,
            },
      );
    const body: Json = {
      model: r.model,
      input: [{ role: "user", content }],
      store: false,
      ...opts,
    };
    if (r.effort) body.reasoning = { effort: r.effort };
    if (json)
      body.text = {
        format: schema
          ? { type: "json_schema", name: "result", strict: true, schema }
          : { type: "json_object" },
      };
    if (web) {
      body.tools = [
        {
          type: "web_search",
          ...(r.allowedDomains?.length
            ? { filters: { allowed_domains: r.allowedDomains } }
            : {}),
        },
      ];
      body.include = ["web_search_call.action.sources"];
    }
    response = await providerJSON(
      p.base + "/responses",
      c.apiKey,
      p.wire,
      body,
      signal,
      fetcher,
    );
    if (response.status === "incomplete") refuse("RELAY_PROVIDER_TRUNCATED");
    if (response.status !== undefined && response.status !== "completed")
      refuse("RELAY_PROVIDER_INCOMPLETE");
    const output = array(response.output);
    const parts = output.flatMap((x) => array(object(x).content));
    if (parts.some((x) => object(x).type === "refusal"))
      refuse("RELAY_PROVIDER_REFUSED");
    return {
      text: output
        .flatMap((x) => array(object(x).content))
        .filter((x) => object(x).type === "output_text")
        .map((x) => string(object(x).text))
        .join(""),
      model: string(response.model) || null,
      searchEvidence: output.some((x) => object(x).type === "web_search_call")
        ? [
            ...output
              .filter((x) => object(x).type === "web_search_call")
              .flatMap((x) => array(object(object(x).action).sources)),
            ...parts.flatMap((x) => array(object(x).annotations)),
          ]
        : [],
      tools: output.filter((x) => object(x).type === "web_search_call").length,
      usage: object(response.usage),
    };
  }
  if (p.wire === "anthropic") {
    const content: Json[] = r.files.map((f) => ({
      type: f.mime === "application/pdf" ? "document" : "image",
      source: { type: "base64", media_type: f.mime, data: f.base64 },
    }));
    content.push({ type: "text", text: r.prompt });
    const body: Json = {
      model: r.model,
      max_tokens: 4096,
      messages: [{ role: "user", content }],
      ...opts,
    };
    if (json && schema)
      body.output_config = { format: { type: "json_schema", schema } };
    if (web)
      body.tools = [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: r.maxResults ?? 5,
          ...(r.allowedDomains?.length
            ? { allowed_domains: r.allowedDomains }
            : {}),
        },
      ];
    response = await providerJSON(
      p.base + "/messages",
      c.apiKey,
      p.wire,
      body,
      signal,
      fetcher,
    );
    if (response.stop_reason === "max_tokens")
      refuse("RELAY_PROVIDER_TRUNCATED");
    if (response.stop_reason === "refusal") refuse("RELAY_PROVIDER_REFUSED");
    if (response.stop_reason !== "end_turn")
      refuse("RELAY_PROVIDER_INCOMPLETE");
    return {
      text: array(response.content)
        .filter((x) => object(x).type === "text")
        .map((x) => string(object(x).text))
        .join(""),
      model: string(response.model) || null,
      searchEvidence: array(response.content)
        .filter((x) => object(x).type === "web_search_tool_result")
        .flatMap((x) => array(object(x).content)),
      tools: Number(
        object(response.usage).server_tool_use
          ? object(object(response.usage).server_tool_use).web_search_requests
          : 0,
      ),
      usage: object(response.usage),
    };
  }
  if (p.wire === "gemini") {
    if (web && r.allowedDomains?.length)
      refuse("RELAY_REQUIREMENT_UNSUPPORTED");
    const parts: Json[] = [
      { text: r.prompt },
      ...r.files.map((f) => ({
        inlineData: { mimeType: f.mime, data: f.base64 },
      })),
    ];
    const body: Json = {
      contents: [{ role: "user", parts }],
      generationConfig: {
        ...opts,
        ...(json
          ? {
              responseMimeType: "application/json",
              ...(schema ? { responseJsonSchema: schema } : {}),
            }
          : {}),
      },
    };
    if (web) body.tools = [{ googleSearch: {} }];
    response = await providerJSON(
      p.base + "/models/" + encodeURIComponent(r.model) + ":generateContent",
      c.apiKey,
      p.wire,
      body,
      signal,
      fetcher,
    );
    const candidate = object(array(response.candidates)[0]);
    if (candidate.finishReason === "MAX_TOKENS")
      refuse("RELAY_PROVIDER_TRUNCATED");
    if (
      object(response.promptFeedback).blockReason ||
      [
        "SAFETY",
        "RECITATION",
        "BLOCKLIST",
        "PROHIBITED_CONTENT",
        "SPII",
      ].includes(string(candidate.finishReason))
    )
      refuse("RELAY_PROVIDER_REFUSED");
    if (candidate.finishReason !== "STOP") refuse("RELAY_PROVIDER_INCOMPLETE");
    return {
      text: array(object(candidate.content).parts)
        .filter((x) => object(x).thought !== true)
        .map((x) => string(object(x).text))
        .join(""),
      model: string(response.modelVersion) || null,
      searchEvidence: array(
        object(candidate.groundingMetadata).groundingChunks,
      ).map((x) => object(x).web),
      usage: object(response.usageMetadata),
    };
  }
  if (r.files.some((f) => f.mime === "application/pdf"))
    refuse("RELAY_CAPABILITY_UNSUPPORTED");
  if (schema && !["groq", "openrouter", "mistral"].includes(id))
    refuse("RELAY_REQUIREMENT_UNSUPPORTED");
  const content: unknown = r.files.length
    ? [
        { type: "text", text: r.prompt },
        ...r.files.map((f) => ({
          type: "image_url",
          image_url: { url: "data:" + f.mime + ";base64," + f.base64 },
        })),
      ]
    : r.prompt;
  const body: Json = {
    model: r.model,
    messages: [{ role: "user", content }],
    ...opts,
  };
  if (json)
    body.response_format = schema
      ? {
          type: "json_schema",
          json_schema: { name: "result", strict: true, schema },
        }
      : { type: "json_object" };
  response = await providerJSON(
    p.base + "/chat/completions",
    c.apiKey,
    p.wire,
    body,
    signal,
    fetcher,
  );
  const choice = object(array(response.choices)[0]);
  if (choice.finish_reason === "length") refuse("RELAY_PROVIDER_TRUNCATED");
  if (choice.finish_reason === "content_filter")
    refuse("RELAY_PROVIDER_REFUSED");
  if (choice.finish_reason !== "stop") refuse("RELAY_PROVIDER_INCOMPLETE");
  return {
    text: string(object(choice.message).content),
    model: string(response.model) || null,
    searchEvidence: [],
    usage: object(response.usage),
  };
}

export async function invokeApi(
  id: ApiProvider,
  c: ApiConnection,
  r: ApiInvocation,
  signal: AbortSignal,
  fetcher = globalThis.fetch,
): Promise<ApiReply> {
  let started = false;
  const transport: typeof fetch = (input, init) => {
    if (init?.method === "POST") started = true;
    return fetcher(input, init);
  };
  try {
    return await dispatchApi(id, c, r, signal, transport);
  } catch (error) {
    if (error instanceof ApiRelayError && started && !error.started)
      throw new ApiRelayError(error.message, true, 502);
    throw error;
  }
}
