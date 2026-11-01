import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RelayRunRequestSchema,
  ResearchResponseSchema,
  type RelayRunRequest,
  type ResearchRequest,
} from "@vaenyx/contracts";
import { runResearch } from "../src/modules/core/relay-research.js";
import { assertResearchRequest } from "../src/modules/core/research-validation.js";

const request = (): RelayRunRequest => ({
  task: "research-http-test",
  capability: "research",
  engine: "openai-cli",
  model: "test-model",
  prompt: "Read only the supplied task",
  files: [],
  research: {
    version: 1,
    request_id: "attempt",
    task_id: "task",
    constraints_hash: "rules",
    constraints: [],
    required_fields: [],
    urls: [],
    allowed_tools: [],
    budget: {
      max_elapsed_ms: 1000,
      max_tool_actions: 0,
      max_download_bytes: 0,
      max_tokens: null,
      max_cost: null,
    },
    context: { subject: null, prior_evidence: [], feedback: [] },
  },
});
const apps: ReturnType<typeof Fastify>[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});
function setup() {
  // Use the real HTTP schemas and Fastify defaults: direct runResearch tests
  // do not cover request coercion or response serialization.
  const app = Fastify({ logger: false });
  apps.push(app);
  const modelCall = vi.fn(async () => ({
    text: JSON.stringify({
      action: "finish",
      result: { summary: "done" },
      evidence: [],
      missing: [],
      conflicts: [],
      stop_reason: "completed",
    }),
    model: "unknown",
    modelReportedByEngine: false,
    searchEvidence: [],
  }));
  app.post<{ Body: RelayRunRequest }>(
    "/run",
    {
      preValidation: async (req) => {
        assertResearchRequest(
          req.body.research,
          req.body.files ?? [],
          req.body.model,
        );
      },
      schema: {
        body: RelayRunRequestSchema,
        response: { 200: ResearchResponseSchema },
      },
    },
    async (req) =>
      runResearch({
        research: req.body.research as ResearchRequest,
        files: [],
        prompt: req.body.prompt!,
        model: req.body.model!,
        fileHosts: [],
        allowedDomains: [],
        maxFileBytes: 10000,
        maxFiles: 1,
        modelCall,
      }),
  );
  app.post(
    "/echo",
    { schema: { body: RelayRunRequestSchema } },
    async (req) => req.body,
  );
  return { app, modelCall };
}
describe("research HTTP null semantics", () => {
  it("dispatches unknown budgets and serializes unknown usage/model as null", async () => {
    const { app, modelCall } = setup();
    const response = await app.inject({
      method: "POST",
      url: "/run",
      payload: request(),
    });
    const result = response.json();
    expect(response.statusCode).toBe(200);
    expect(result.status).toBe("complete");
    expect(modelCall).toHaveBeenCalledTimes(1);
    expect(result.usage.tokens).toBeNull();
    expect(result.usage.cost).toBeNull();
    expect(result.model.actual).toBeNull();
    expect(result.model.evidence).toBeNull();
    expect(result.error).toBeNull();
  });
  it.each([0, 1])(
    "refuses an explicit cost cap %s before model dispatch",
    async (cost) => {
      const { app, modelCall } = setup();
      const payload = request();
      payload.research!.budget.max_cost = cost;
      const response = await app.inject({
        method: "POST",
        url: "/run",
        payload,
      });
      expect(response.json().error).toMatchObject({
        code: "budget_not_enforceable",
        execution_state: "not_started",
      });
      expect(modelCall).not.toHaveBeenCalled();
    },
  );
  it("rejects invalid raw budget types before coercion", async () => {
    const { app, modelCall } = setup();
    const payload = request();
    Object.assign(payload.research!.budget, { max_cost: "0" });
    const response = await app.inject({ method: "POST", url: "/run", payload });
    expect(response.statusCode).not.toBe(200);
    expect(modelCall).not.toHaveBeenCalled();
  });
  it("preserves null attachment metadata and arbitrary caller context", async () => {
    const { app } = setup();
    const payload = request();
    payload.files = [
      {
        id: "a",
        name: "sample.pdf",
        url: "https://files.example.org/a",
        mime: null,
        sha256: null,
      },
    ];
    payload.research!.context.subject = {
      unknown: null,
      zero: 0,
      empty: "",
      flag: false,
    };
    const response = await app.inject({
      method: "POST",
      url: "/echo",
      payload,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(payload);
  });
  it("keeps the existing non-research request coercion unchanged", async () => {
    const { app } = setup();
    const payload = {
      task: "legacy",
      engine: "openai-cli",
      capability: "web_search",
      query: "test",
      max_results: "3",
    };
    const response = await app.inject({
      method: "POST",
      url: "/echo",
      payload,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ...payload, max_results: 3 });
  });
});
