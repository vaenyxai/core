import { Value } from "@sinclair/typebox/value";
import { describe, expect, it } from "vitest";

import {
  AppAskRequestSchema,
  AskVaenyxConversationSchema,
  AskVaenyxMessageSchema,
  ApproveVaenyxMeCandidateRequestSchema,
  ChatConnectionTestRequestSchema,
  CreateAskVaenyxConversationRequestSchema,
  CreateAskVaenyxMessageRequestSchema,
  CreateProjectMemoryRequestSchema,
  CreateProjectRequestSchema,
  CreateAppProfileRequestSchema,
  CreateTaskRequestSchema,
  CreateVaenyxMeCandidateRequestSchema,
  RejectVaenyxMeCandidateRequestSchema,
  UpdateVaenyxThreadProjectRequestSchema,
  UpdateVaenyxThreadStatusRequestSchema,
  UpdateVaenyxThreadTitleRequestSchema,
  VaenyxThreadSchema,
  WorkspaceSchema,
} from "./workspace.js";

describe("M1 contracts", () => {
  it("accepts a simple owner task request", () => {
    expect(
      Value.Check(CreateTaskRequestSchema, {
        request: "Explain Vaenyx.",
        projectId: "vaenyx",
        skillId: "general-ask",
      }),
    ).toBe(true);
    expect(
      Value.Check(CreateTaskRequestSchema, {
        request: "Review Vaenyx without changing it.",
        projectId: "vaenyx",
        executionMode: "forge-readonly",
      }),
    ).toBe(true);
    expect(
      Value.Check(CreateTaskRequestSchema, {
        request: "Turn this chat into a task.",
        projectId: "vaenyx",
        sourceChatId: "conversation-id",
      }),
    ).toBe(true);
  });

  it("requires the workspace to expose the current owner and boundaries", () => {
    expect(
      Value.Check(WorkspaceSchema, {
        owner: {
          id: "owner-id",
          name: "Oskar",
        },
        projects: [],
        skills: [],
        agents: [],
        vaenyxMe: {
          ownerModel: "digital-self",
          items: [],
        },
        tasks: [],
        threads: [],
      }),
    ).toBe(true);
  });

  it("accepts an App Profile scoped to Methods instead of Skills", () => {
    // Capability can come from Skills, Methods, or both; the "at least one"
    // rule is enforced at runtime, not by the schema.
    expect(
      Value.Check(CreateAppProfileRequestSchema, {
        name: "Estimating PWA",
        allowedMethodIds: ["estimating"],
      }),
    ).toBe(true);
  });

  it("accepts a small App Bridge request without project or autonomy overrides", () => {
    expect(
      Value.Check(AppAskRequestSchema, {
        request: "Ask Vaenyx from an approved App.",
      }),
    ).toBe(true);
  });

  it("accepts explicit project memory and bounded autonomy requests", () => {
    expect(
      Value.Check(CreateProjectMemoryRequestSchema, {
        projectId: "vaenyx",
        title: "Response style",
        content: "Use concise answers.",
      }),
    ).toBe(true);
    expect(
      Value.Check(AppAskRequestSchema, {
        request: "Try a bounded autonomy request.",
        autonomyLevel: 1,
      }),
    ).toBe(true);
  });

  it("accepts a bounded ChatGPT quick chat test request", () => {
    expect(
      Value.Check(ChatConnectionTestRequestSchema, {
        prompt: "用一句中文确认 Vaenyx 可以聊天。",
      }),
    ).toBe(true);
    expect(
      Value.Check(ChatConnectionTestRequestSchema, {
        prompt: "",
      }),
    ).toBe(false);
  });

  it("accepts local Vaenyx Chat contracts", () => {
    expect(
      Value.Check(CreateAskVaenyxConversationRequestSchema, {
        title: "First live chat",
      }),
    ).toBe(true);
    expect(Value.Check(CreateAskVaenyxConversationRequestSchema, {})).toBe(true);
    expect(
      Value.Check(CreateAskVaenyxMessageRequestSchema, {
        content: "What is the weather today?",
      }),
    ).toBe(true);
    expect(
      Value.Check(AskVaenyxConversationSchema, {
        id: "conversation-id",
        title: "First live chat",
        messageCount: 2,
        createdAt: "2026-06-08T00:00:00.000Z",
        updatedAt: "2026-06-08T00:00:01.000Z",
        reasoningEffort: "medium",
        modelProviderId: null,
      }),
    ).toBe(true);
    expect(
      Value.Check(AskVaenyxMessageSchema, {
        id: "message-id",
        conversationId: "conversation-id",
        role: "assistant",
        content: "It is sunny.",
        status: "completed",
        webSearchUsed: true,
        createdAt: "2026-06-08T00:00:01.000Z",
      }),
    ).toBe(true);
  });

  it("accepts Vaenyx Thread organizer contracts", () => {
    expect(
      Value.Check(VaenyxThreadSchema, {
        id: "thread-id",
        kind: "chat",
        title: "Plan the next build",
        projectId: null,
        projectName: null,
        status: "active",
        sourceChatId: null,
        conversationId: "conversation-id",
        taskId: null,
        routineId: null,
        summary: null,
        messageCount: 2,
        createdAt: "2026-06-09T00:00:00.000Z",
        updatedAt: "2026-06-09T00:00:01.000Z",
      }),
    ).toBe(true);
    expect(
      Value.Check(UpdateVaenyxThreadProjectRequestSchema, {
        projectId: "vaenyx",
      }),
    ).toBe(true);
    expect(
      Value.Check(UpdateVaenyxThreadProjectRequestSchema, {
        projectId: null,
      }),
    ).toBe(true);
    expect(
      Value.Check(UpdateVaenyxThreadStatusRequestSchema, {
        status: "pinned",
      }),
    ).toBe(true);
    expect(
      Value.Check(UpdateVaenyxThreadTitleRequestSchema, {
        title: "Renamed thread",
      }),
    ).toBe(true);
  });

  it("requires a clear Project profile", () => {
    expect(
      Value.Check(CreateProjectRequestSchema, {
        name: "Auzzie Homes",
        description: "Property and business workspace.",
      }),
    ).toBe(true);
  });

  it("accepts Owner-reviewed Vaenyx Me candidate actions", () => {
    expect(
      Value.Check(CreateVaenyxMeCandidateRequestSchema, {
        category: "communication",
        title: "Communication style",
        proposedSummary: "The Owner prefers concise explanations.",
        proposedEvidence: "The Owner explicitly requested clear and simple answers.",
        confidence: 80,
      }),
    ).toBe(true);
    expect(
      Value.Check(ApproveVaenyxMeCandidateRequestSchema, {
        title: "Communication style",
        summary: "The Owner prefers concise explanations.",
        evidence: "Approved by the Owner from visible review evidence.",
        confidence: 80,
      }),
    ).toBe(true);
    expect(Value.Check(RejectVaenyxMeCandidateRequestSchema, {})).toBe(true);
  });
});
