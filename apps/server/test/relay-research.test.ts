import { afterEach, describe, expect, it, vi } from "vitest";
import type { ResearchRequest } from "@vaenyx/contracts";
import {
  runResearch,
  type ResearchRunInput,
  type ResearchModelReply,
} from "../src/modules/core/relay-research.js";
import {
  assertResearchRequest,
  verifyResearchEvidence,
} from "../src/modules/core/research-validation.js";
import {
  publicResearchAddress,
  researchUrl,
} from "../src/modules/core/research-fetch.js";
const request = (): ResearchRequest => ({
  version: 1,
  request_id: "attempt-1",
  task_id: "task-1",
  constraints_hash: "rules-1",
  constraints: [],
  required_fields: [],
  urls: [],
  allowed_tools: ["read_file", "search", "read_url"],
  budget: {
    max_elapsed_ms: 1000,
    max_tool_actions: 4,
    max_download_bytes: 10000,
    max_tokens: null,
    max_cost: null,
  },
  context: { subject: null, prior_evidence: [], feedback: [] },
});
const finish = (extra = {}) => ({
  action: "finish",
  result: { summary: "done" },
  evidence: [],
  missing: [],
  conflicts: [],
  stop_reason: "completed",
  ...extra,
});
function setup(steps: unknown[]): ResearchRunInput {
  return {
    research: request(),
    files: [],
    prompt: "Find the requested facts",
    query: "additional query",
    model: "test-model",
    fileHosts: ["files.example.org"],
    allowedDomains: [],
    maxFileBytes: 10000,
    maxFiles: 5,
    modelCall: vi.fn(async () => ({
      text: JSON.stringify(steps.shift()),
      model: "test-model",
      modelReportedByEngine: true,
      searchEvidence: [],
    })),
    download: vi.fn(async (url, _hosts, _limit, _signal, consume) => {
      const body = Buffer.from(url.endsWith("a") ? "Alpha" : "Bravo");
      consume(body.length);
      return {
        body,
        mime: "text/plain",
        url,
        fetchedAt: "2026-01-01T00:00:00Z",
      };
    }),
  };
}
const quote = {
  id: "e1",
  source_id: "src-1",
  operation_id: "op-2",
  kind: "quote",
  quote: "Alpha",
  observation: null,
  locator: {
    page: null,
    section: null,
    region: null,
    range: { unit: "character", from: 1, to: 5 },
  },
  quote_verified: null,
  premise_evidence_ids: [],
};
afterEach(() => vi.useRealTimers());
describe("request-scoped research", () => {
  it("finishes grounded search results without reading unused discoveries", async () => {
    const input = setup([
      { action: "search", query: "sample" },
      {
        results: [
          { url: "https://example.org/a", snippet: "Alpha" },
          { url: "https://example.org/b", snippet: "Bravo" },
        ],
      },
      { action: "read_url", url: "https://example.org/a", from: 1, to: 5 },
      finish({
        result: { label: { value: "Alpha", evidence_ids: ["e1"] } },
        evidence: [{ ...quote, operation_id: "op-4" }],
      }),
    ]);
    input.research.required_fields = ["label"];
    const base = input.modelCall;
    input.modelCall = async (...args) => ({
      ...(await base(...args)),
      searchEvidence: args[2] ? [{ type: "search" }] : [],
    });
    const out = await runResearch(input);
    expect(out.status).toBe("complete");
    expect(out.stop_reason).toBe("completed");
    expect(out.sources.map((s) => s.coverage)).toEqual([
      "complete",
      "discovered",
    ]);
    expect(out.sources[1]?.read_ranges).toEqual([]);
    expect(out.sources[1]?.fetched_at).toBeNull();
    expect(out.evidence[0]?.quote_verified).toBe(true);
    expect(out.usage.tool_actions).toBe(2);
    expect(input.download).toHaveBeenCalledTimes(1);
  });
  it("does not promote an explicitly unmet task scope even when a field is grounded", async () => {
    const input = setup([
      { action: "read_url", url: "https://example.org/a", from: 1, to: 5 },
      finish({ evidence: [quote], stop_reason: "unresolved_requirements" }),
      finish({ evidence: [quote], stop_reason: "unresolved_requirements" }),
    ]);
    input.research.urls = ["https://example.org/a"];
    const out = await runResearch(input);
    expect(out.status).toBe("partial");
    expect(out.stop_reason).toBe("unresolved_requirements");
    expect(out.evidence[0]?.quote_verified).toBe(true);
  });
  it("keeps missing full-review requirements partial despite valid page evidence", async () => {
    const incomplete = finish({
      evidence: [quote],
      missing: [
        {
          field: "full_review",
          reason: "Required document review remains unfinished",
          attempted_operation_ids: ["op-2"],
        },
      ],
    });
    const input = setup([
      { action: "read_url", url: "https://example.org/a", from: 1, to: 5 },
      incomplete,
      incomplete,
    ]);
    input.research.urls = ["https://example.org/a"];
    input.research.constraints = ["Review the complete document"];
    const out = await runResearch(input);
    expect(out.status).toBe("partial");
    expect(out.missing[0]?.field).toBe("full_review");
    expect(out.stop_reason).toBe("unresolved_requirements");
  });
  it("keeps unresolved conflicts partial even after a successful read", async () => {
    const incomplete = finish({
      evidence: [quote],
      conflicts: [
        {
          field: "label",
          candidates: [{ value: "Alpha", evidence_ids: ["e1"] }],
          resolution: null,
        },
      ],
    });
    const input = setup([
      { action: "read_url", url: "https://example.org/a", from: 1, to: 5 },
      incomplete,
      incomplete,
    ]);
    input.research.urls = ["https://example.org/a"];
    const out = await runResearch(input);
    expect(out.status).toBe("partial");
    expect(out.conflicts[0]?.resolution).toBeNull();
  });
  it("corrects a false caller-evidence label without accepting invented provenance", async () => {
    const fakePrior = {
      ...quote,
      kind: "human_provided",
      quote: null,
      observation: "Source URL from caller",
      locator: null,
    };
    const input = setup([
      { action: "read_url", url: "https://example.org/a", from: 1, to: null },
      finish({ evidence: [fakePrior] }),
      finish({ evidence: [quote] }),
    ]);
    input.research.urls = ["https://example.org/a"];
    const out = await runResearch(input);
    expect(out.status).toBe("complete");
    expect(out.evidence[0]?.kind).toBe("quote");
    expect(out.evidence[0]?.quote_verified).toBe(true);
    expect(out.operations[2]?.error?.message).toContain(
      "context.prior_evidence",
    );
    expect(input.modelCall).toHaveBeenCalledTimes(3);
  });
  it("rejects repeated invented history while retaining successful reads", async () => {
    const bad = finish({
      evidence: [{ ...quote, kind: "historical_summary" }],
    });
    const input = setup([
      { action: "read_url", url: "https://example.org/a", from: 1, to: null },
      bad,
      bad,
    ]);
    input.research.urls = ["https://example.org/a"];
    const out = await runResearch(input);
    expect(out.status).toBe("partial");
    expect(out.error?.code).toBe("invalid_evidence");
    expect(out.error?.message).toContain("evidence[0].kind");
    expect(out.evidence).toEqual([]);
    expect(out.result).toBeNull();
    expect(out.sources[0]?.coverage).toBe("complete");
    expect(input.modelCall).toHaveBeenCalledTimes(3);
  });
  it("reads an unknown-length page without guessing its upper bound", async () => {
    const input = setup([
      { action: "read_url", url: "https://example.org/a", from: 1, to: null },
      finish({
        evidence: [quote],
        result: { label: { value: "Alpha", evidence_ids: ["e1"] } },
      }),
    ]);
    input.research.urls = ["https://example.org/a"];
    input.research.required_fields = ["label"];
    const out = await runResearch(input);
    expect(out.status).toBe("complete");
    expect(out.operations[1]?.returned_ranges).toEqual([
      { unit: "character", from: 1, to: 5 },
    ]);
    expect(out.evidence[0]?.quote_verified).toBe(true);
  });
  it("reports exact range failures and reuses the downloaded source for a corrected read", async () => {
    const input = setup([
      { action: "read_url", url: "https://example.org/a", from: 1, to: 1000 },
      { action: "read_url", url: "https://example.org/a", from: 1, to: 5 },
      finish({ evidence: [{ ...quote, operation_id: "op-4" }] }),
    ]);
    input.research.urls = ["https://example.org/a"];
    const out = await runResearch(input);
    expect(out.status).toBe("complete");
    expect(out.operations[1]?.source_id).toBe("src-1");
    expect(out.operations[1]?.requested_ranges).toEqual([
      { unit: "character", from: 1, to: 1000 },
    ]);
    expect(out.operations[1]?.error?.message).toContain(
      "Available character units: 5",
    );
    expect(input.download).toHaveBeenCalledTimes(1);
    expect(input.modelCall).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('"total_units":5'),
      [],
      false,
      expect.any(AbortSignal),
    );
  });
  it("corrects an invalid locator once without more downloads or a larger tool budget", async () => {
    const input = setup([
      { action: "read_url", url: "https://example.org/a", from: 1, to: null },
      finish({
        evidence: [{ ...quote, locator: { ...quote.locator, range: null } }],
      }),
      finish({ evidence: [quote] }),
    ]);
    input.research.urls = ["https://example.org/a"];
    input.research.budget.max_tool_actions = 1;
    const out = await runResearch(input);
    expect(out.status).toBe("complete");
    expect(out.usage.tool_actions).toBe(1);
    expect(out.operations[2]?.error?.message).toContain("locator.range");
    expect(out.evidence[0]?.quote_verified).toBe(true);
    expect(input.download).toHaveBeenCalledTimes(1);
    expect(input.modelCall).toHaveBeenCalledTimes(3);
  });
  it("rejects repeated invalid evidence after the single correction and keeps read records", async () => {
    const bad = finish({ evidence: [{ ...quote, quote: "Invented" }] });
    const input = setup([
      { action: "read_url", url: "https://example.org/a", from: 1, to: null },
      bad,
      bad,
    ]);
    input.research.urls = ["https://example.org/a"];
    const out = await runResearch(input);
    expect(out.error?.code).toBe("invalid_evidence");
    expect(out.error?.message).toContain("evidence[0].quote");
    expect(out.evidence).toEqual([]);
    expect(out.result).toBeNull();
    expect(out.sources[0]?.coverage).toBe("complete");
    expect(out.operations[1]?.status).toBe("succeeded");
    expect(input.modelCall).toHaveBeenCalledTimes(3);
  });
  it("never spends an extra tool action when correcting evidence at the tool cap", async () => {
    const input = setup([
      { action: "read_url", url: "https://example.org/a", from: 1, to: null },
      finish({ evidence: [{ ...quote, quote: "Invented" }] }),
      { action: "read_url", url: "https://example.org/a", from: 1, to: null },
    ]);
    input.research.urls = ["https://example.org/a"];
    input.research.budget.max_tool_actions = 1;
    const out = await runResearch(input);
    expect(out.stop_reason).toBe("tool_budget_exhausted");
    expect(out.usage.tool_actions).toBe(1);
    expect(out.result).toBeNull();
    expect(input.download).toHaveBeenCalledTimes(1);
  });
  it("completes an evidenced field without claiming full coverage of its long source", async () => {
    const input = setup([
      { action: "read_url", url: "https://example.org/a", from: 1, to: null },
      finish({
        result: { label: { value: "Alpha", evidence_ids: ["e1"] } },
        evidence: [quote],
      }),
    ]);
    input.research.required_fields = ["label"];
    input.research.urls = ["https://example.org/a"];
    input.research.budget.max_tool_actions = 1;
    input.research.budget.max_download_bytes = input.maxFileBytes = 40000;
    input.download = async (url, _hosts, _limit, _signal, consume) => {
      const body = Buffer.from("Alpha" + "A".repeat(34995));
      consume(body.length);
      return {
        body,
        mime: "text/plain",
        url,
        fetchedAt: "2026-01-01T00:00:00Z",
      };
    };
    const out = await runResearch(input);
    expect(out.status).toBe("complete");
    expect(out.stop_reason).toBe("completed");
    expect(out.evidence[0]?.quote_verified).toBe(true);
    expect(out.sources[0]?.delivered_ranges).toEqual([
      { unit: "character", from: 1, to: 32000 },
    ]);
    expect(out.sources[0]?.coverage).toBe("partial");
    expect(out.sources[0]?.truncated).toBe(false);
    expect(out.sources[0]?.unread_ranges).toBeNull();
  });
  it("retains task constraints, query and context without saved memory", async () => {
    const input = setup([finish()]);
    input.research.constraints = ["Only supplied sources"];
    const out = await runResearch(input);
    expect(out.status).toBe("complete");
    expect(input.modelCall).toHaveBeenCalledWith(
      expect.stringContaining("additional query"),
      [],
      false,
      expect.any(AbortSignal),
    );
    expect(out.model.actual).toBe("test-model");
    expect(out.usage.cost).toBeNull();
  });
  it("reads both attachments, verifies an exact quote and never returns signed file URLs", async () => {
    const input = setup([
      { action: "read_file", file_id: "a", from: 1, to: 5 },
      { action: "read_file", file_id: "b", from: 1, to: 5 },
      finish({
        evidence: [quote],
        result: { fact: { value: "Alpha", evidence_ids: ["e1"] } },
      }),
    ]);
    input.files = [
      { id: "a", name: "a.txt", url: "https://files.example.org/a" },
      { id: "b", name: "b.txt", url: "https://files.example.org/b" },
    ];
    const out = await runResearch(input);
    expect(out.status).toBe("complete");
    expect(out.sources).toHaveLength(2);
    expect(
      out.sources.every((s) => s.url === null && s.content_hash?.length === 64),
    ).toBe(true);
    expect(out.evidence[0]?.quote_verified).toBe(true);
    expect(out.usage.tool_actions).toBe(2);
  });
  it("rejects fabricated citations rather than returning model text as evidence", async () => {
    const input = setup([
      { action: "read_file", file_id: "a", from: 1, to: 5 },
      finish({ evidence: [{ ...quote, quote: "Invented" }] }),
      finish({ evidence: [{ ...quote, quote: "Invented" }] }),
    ]);
    input.files = [
      { id: "a", name: "a.txt", url: "https://files.example.org/a" },
    ];
    const out = await runResearch(input);
    expect(out.error?.code).toBe("invalid_evidence");
    expect(out.evidence).toEqual([]);
    expect(out.result).toBeNull();
  });
  it("executes a follow-up read after search and counts host actions, not hidden native calls", async () => {
    const input = setup([
      { action: "search", query: "sample" },
      { results: [{ url: "https://example.org/a", snippet: "Alpha" }] },
      { action: "read_url", url: "https://example.org/a", from: 1, to: 5 },
      finish(),
    ]);
    const base = input.modelCall;
    input.modelCall = async (...args) => {
      const reply = await base(...args);
      return args[2]
        ? { ...reply, searchEvidence: [{ type: "search" }] }
        : reply;
    };
    const out = await runResearch(input);
    expect(out.usage.tool_actions).toBe(2);
    expect(
      out.operations
        .filter((op) => op.action !== "analyze")
        .map((op) => op.action),
    ).toEqual(["search", "read_url"]);
    expect(out.sources[0]?.coverage).toBe("complete");
  });
  it("does not dispatch another action after the host budget", async () => {
    const input = setup([{ action: "search", query: "sample" }]);
    input.research.budget.max_tool_actions = 0;
    const out = await runResearch(input);
    expect(out.stop_reason).toBe("tool_budget_exhausted");
    expect(out.usage.tool_actions).toBe(0);
  });
  it("rejects unenforceable monetary caps before any model or download", async () => {
    const input = setup([]);
    input.research.budget.max_cost = 0;
    const out = await runResearch(input);
    expect(out.error?.code).toBe("budget_not_enforceable");
    expect(out.error?.execution_state).toBe("not_started");
    expect(input.modelCall).not.toHaveBeenCalled();
  });
  it("does not claim complete when a required field is unknown", async () => {
    const input = setup([
      finish({ result: { price: null } }),
      finish({ result: { price: null } }),
    ]);
    input.research.required_fields = ["price"];
    const out = await runResearch(input);
    expect(out.status).toBe("partial");
    expect(out.missing[0]?.field).toBe("price");
  });
  it("retains unread supplied source coverage independently of task completion", async () => {
    const input = setup([finish(), finish()]);
    input.research.urls = ["https://example.org/a"];
    const out = await runResearch(input);
    expect(out.status).toBe("complete");
    expect(out.sources[0]?.coverage).toBe("discovered");
    expect(out.sources[0]?.read_ranges).toEqual([]);
  });
  it("reports unknown execution on timeout and does not continue or retry", async () => {
    vi.useFakeTimers();
    const input = setup([]);
    input.modelCall = vi.fn(() => new Promise<ResearchModelReply>(() => {}));
    const pending = runResearch(input);
    await vi.advanceTimersByTimeAsync(1001);
    const out = await pending;
    expect(out.error?.execution_state).toBe("unknown");
    expect(out.error?.retryable).toBe(false);
    expect(input.modelCall).toHaveBeenCalledTimes(1);
  });
  it("requires an actual follow-up when a finish still has an unresolved field", async () => {
    const input = setup([
      finish({ result: { label: null } }),
      { action: "read_file", file_id: "a", from: 1, to: 5 },
      finish({
        result: { label: { value: "Alpha", evidence_ids: ["e1"] } },
        evidence: [{ ...quote, operation_id: "op-3" }],
      }),
    ]);
    input.files = [
      { id: "a", name: "a.txt", url: "https://files.example.org/a" },
    ];
    input.research.required_fields = ["label"];
    const out = await runResearch(input);
    expect(out.status).toBe("complete");
    expect(out.usage.tool_actions).toBe(1);
    expect(out.operations[2]?.action).toBe("read_file");
  });
  it("does not promote a filled required field without evidence", async () => {
    const input = setup([
      finish({ result: { label: "guessed" } }),
      finish({ result: { label: "guessed" } }),
    ]);
    input.research.required_fields = ["label"];
    const out = await runResearch(input);
    expect(out.status).toBe("partial");
    expect(out.missing[0]?.reason).toBe("required_field_without_evidence");
  });
  it("rejects a true quote with a false character locator", async () => {
    const input = setup([
      { action: "read_file", file_id: "a", from: 1, to: 5 },
      finish({
        evidence: [
          {
            ...quote,
            locator: {
              ...quote.locator,
              range: { unit: "character", from: 100, to: 104 },
            },
          },
        ],
      }),
    ]);
    input.files = [
      { id: "a", name: "a.txt", url: "https://files.example.org/a" },
    ];
    const originalModel = input.modelCall;
    let last: ResearchModelReply;
    input.modelCall = async (...args) => {
      const reply = await originalModel(...args);
      if (reply.text !== undefined) last = reply;
      return last;
    };
    expect((await runResearch(input)).error?.code).toBe("invalid_evidence");
  });

  it("refuses unknown request keys and duplicate file ids", () => {
    expect(() =>
      assertResearchRequest({ ...request(), hidden: true }, [], "test-model"),
    ).toThrow();
    const file = { id: "same", name: "a", url: "https://files.example.org/a" };
    expect(() =>
      assertResearchRequest(request(), [file, file], "test-model"),
    ).toThrow("duplicate_file_id");
  });
  it("refuses private, local, credentialed and non-HTTPS URLs", () => {
    for (const url of [
      "http://example.org",
      "https://127.0.0.1",
      "https://[::1]",
      "https://user:pass@example.org",
      "https://example.org:3000",
    ])
      expect(() => researchUrl(url, null)).toThrow();
    for (const ip of [
      "10.0.0.1",
      "169.254.169.254",
      "100.100.100.100",
      "::ffff:127.0.0.1",
    ])
      expect(publicResearchAddress(ip)).toBe(false);
    expect(publicResearchAddress("8.8.8.8")).toBe(true);
  });
  it("does not silently accept a file hash mismatch", async () => {
    const input = setup([
      { action: "read_file", file_id: "a", from: 1, to: 5 },
      finish(),
      finish(),
    ]);
    input.files = [
      {
        id: "a",
        name: "a.txt",
        url: "https://files.example.org/a",
        sha256: "0".repeat(64),
      },
    ];
    const out = await runResearch(input);
    expect(out.status).toBe("partial");
    expect(out.operations[1]?.error?.code).toBe("source_hash_mismatch");
  });
});

describe("research read permissions", () => {
  it("does not let read_url impersonate the disabled read_file action", async () => {
    const input = setup([
      { action: "read_url", file_id: "a", from: 1, to: 5 },
      finish(),
      finish(),
    ]);
    input.research.allowed_tools = ["read_url"];
    input.files = [
      { id: "a", name: "a.txt", url: "https://files.example.org/a" },
    ];
    const out = await runResearch(input);
    expect(input.download).not.toHaveBeenCalled();
    expect(
      out.operations.find((op) => op.action === "read_url")?.error?.code,
    ).toBe("invalid_output");
  });
  it("allows text with vision disabled but refuses URL images before rendering", async () => {
    const text = setup([
      { action: "read_file", file_id: "a", from: 1, to: 5 },
      finish(),
    ]);
    text.visionEnabled = false;
    text.files = [
      { id: "a", name: "a.txt", url: "https://files.example.org/a" },
    ];
    expect((await runResearch(text)).status).toBe("complete");
    const image = setup([
      {
        action: "read_url",
        url: "https://files.example.org/image",
        from: 1,
        to: 1,
      },
      finish(),
      finish(),
    ]);
    image.visionEnabled = false;
    image.research.urls = ["https://files.example.org/image"];
    image.download = vi.fn(async (url, _hosts, _limit, _signal, consume) => {
      const body = Buffer.from("synthetic image");
      consume(body.length);
      return {
        body,
        mime: "image/png",
        url,
        fetchedAt: "2026-01-01T00:00:00Z",
      };
    });
    const out = await runResearch(image);
    expect(
      out.operations.find((op) => op.action === "read_url")?.error?.code,
    ).toBe("vision_capability_off");
    expect(out.sources[0]?.delivered_ranges).toEqual([]);
  });
});

it("binds PDF quotes to physical pages, not page labels injected into document text", () => {
  const delivered = new Map([
    [
      "op-2",
      {
        sourceId: "src-1",
        range: { unit: "page" as const, from: 1, to: 2 },
        pages: { from: 1, to: 2 },
        visual: false,
        text: "[page 1]\nFirst page\n\n[page 2]\nAlpha\n\n[page 2]\nActual second page",
        pageTexts: new Map([
          [1, "First page\n\n[page 2]\nAlpha"],
          [2, "Actual second page"],
        ]),
      },
    ],
  ]);
  const item = {
    ...quote,
    kind: "quote" as const,
    locator: { ...quote.locator, page: 2, range: null },
  };
  expect(() => verifyResearchEvidence([item], delivered)).toThrow(
    "invalid_evidence",
  );
  item.locator.page = 1;
  expect(verifyResearchEvidence([item], delivered)[0]?.quote_verified).toBe(
    true,
  );
});
