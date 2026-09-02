import { Value } from "@sinclair/typebox/value";
import { describe, expect, it } from "vitest";

import {
  AppAskRequestSchema,
  AskVaenyxConversationSchema,
  AskVaenyxMessageSchema,
  ApproveVaenyxMeCandidateRequestSchema,
  ChatConnectionTestRequestSchema,
  ClientMessageStatusSchema,
  CreateAskVaenyxConversationRequestSchema,
  CreateAskVaenyxMessageRequestSchema,
  CreateProjectMemoryRequestSchema,
  CreateProjectRequestSchema,
  CreateAppProfileRequestSchema,
  CreateTaskRequestSchema,
  CreateVaenyxMeCandidateRequestSchema,
  CatalogueInstallPreviewSchema,
  ConversationSearchResponseSchema,
  ConversationForgetPreviewSchema,
  DeleteConversationRequestSchema,
  MemoryProvenanceResponseSchema,
  ResolveStructuredQuestionRequestSchema,
  RoutineViewSchema,
  RejectVaenyxMeCandidateRequestSchema,
  TaskRunProgressSchema,
  UpdateVaenyxThreadProjectRequestSchema,
  UpdateVaenyxThreadStatusRequestSchema,
  UpdateVaenyxThreadTitleRequestSchema,
  UpdateVaenyxThreadDetailsRequestSchema,
  VaenyxThreadSchema,
  WorkspaceSchema,
} from "./workspace.js";

describe("M1 contracts", () => {
  it("accepts the bounded Routine View v1 presentation contract", () => {
    expect(
      Value.Check(RoutineViewSchema, {
        version: 1,
        fields: [
          {
            key: "total",
            as: "amount",
            label: "Total",
            labelZh: "总额",
            format: "currency",
            currencyKey: "currency",
            evidenceKey: "totalEvidence",
            certaintyKey: "totalCertainty",
            showWhenMissing: true,
          },
          {
            key: "facts",
            as: "table",
            columns: [
              { key: "value", label: "Value", labelZh: "内容" },
              { key: "certainty", format: "certainty" },
            ],
          },
        ],
      }),
    ).toBe(true);
    expect(Value.Check(RoutineViewSchema, { version: 2, fields: [] })).toBe(
      false,
    );
  });

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

  it("accepts bounded, versioned task progress without hidden workings", () => {
    expect(
      Value.Check(TaskRunProgressSchema, {
        version: 1,
        runId: "run-1",
        taskId: "task-1",
        conversationId: "conversation-1",
        revision: 7,
        state: "waiting_for_owner",
        currentStep: "Waiting for your choice",
        completedSteps: ["Started", "Checked the available options"],
        statusText: "Choose one option below to continue.",
        startedAt: "2026-09-02T00:00:00.000Z",
        updatedAt: "2026-09-02T00:01:00.000Z",
        finishedAt: null,
        outcomeMessageId: null,
      }),
    ).toBe(true);
  });

  it("requires the workspace to expose the current owner and boundaries", () => {
    expect(
      Value.Check(WorkspaceSchema, {
        owner: {
          id: "owner-id",
          name: "Oskar",
          modeId: null,
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
        mode: null,
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
    expect(Value.Check(CreateAskVaenyxConversationRequestSchema, {})).toBe(
      true,
    );
    expect(
      Value.Check(CreateAskVaenyxMessageRequestSchema, {
        content: "What is the weather today?",
        clientMessageId: "device-draft-1",
      }),
    ).toBe(true);
    expect(
      Value.Check(ClientMessageStatusSchema, {
        accepted: true,
        conversationId: "conversation-id",
        messageId: "message-id",
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
        modelName: null,
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
    expect(
      Value.Check(AskVaenyxMessageSchema, {
        id: "question-message",
        conversationId: "conversation-id",
        role: "assistant",
        content: "Which route?\n- Scenic\n- Fast",
        status: "completed",
        webSearchUsed: false,
        createdAt: "2026-06-08T00:00:02.000Z",
        parts: [
          {
            type: "structured-question",
            version: 1,
            questionId: "question-id",
            prompt: "Which route?",
            helpText: null,
            options: [
              { id: "option-1", label: "Scenic" },
              { id: "option-2", label: "Fast" },
            ],
            allowFreeText: true,
            allowSkip: true,
            plainTextFallback: "Which route?\n- Scenic\n- Fast",
            state: { status: "open" },
          },
        ],
      }),
    ).toBe(true);
    expect(
      Value.Check(ResolveStructuredQuestionRequestSchema, {
        kind: "free_text",
        text: "Take the train",
      }),
    ).toBe(true);
    expect(
      Value.Check(ResolveStructuredQuestionRequestSchema, {
        kind: "free_text",
        text: "",
      }),
    ).toBe(false);
  });

  it("accepts safe local Conversation search results", () => {
    expect(
      Value.Check(ConversationSearchResponseSchema, {
        results: [
          {
            messageId: "message-id",
            conversationId: "conversation-id",
            threadId: "thread-id",
            threadKind: "chat",
            taskId: null,
            title: "Groceries",
            purpose: null,
            matchField: "message",
            role: "owner",
            messageCreatedAt: "2026-08-01T00:00:00.000Z",
            excerpt: "Bought fresh milk",
            highlights: [{ start: 13, end: 17 }],
            before: null,
            after: {
              id: "next-message",
              role: "assistant",
              content: "Added it to the list.",
              createdAt: "2026-08-01T00:00:01.000Z",
            },
            archived: false,
            modeId: null,
            modeName: null,
          },
        ],
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
        purpose: null,
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
    expect(
      Value.Check(UpdateVaenyxThreadDetailsRequestSchema, {
        title: "Renamed conversation",
        purpose: "Keep the renovation decisions easy to find.",
      }),
    ).toBe(true);
    expect(
      Value.Check(UpdateVaenyxThreadDetailsRequestSchema, {
        title: "Renamed conversation",
        purpose: "",
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
        proposedEvidence:
          "The Owner explicitly requested clear and simple answers.",
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

  it("requires explicit Conversation deletion Memory choices", () => {
    const revision = "a".repeat(64);
    expect(
      Value.Check(DeleteConversationRequestSchema, {
        memoryAction: "forget",
        previewRevision: revision,
      }),
    ).toBe(true);
    expect(Value.Check(DeleteConversationRequestSchema, {})).toBe(false);
    expect(
      Value.Check(MemoryProvenanceResponseSchema, {
        memoryKind: "fact",
        memoryId: "fact-1",
        sources: [
          {
            id: "source-1",
            sourceKind: "conversation",
            sourceId: "conversation-1",
            sourceMessageId: "message-1",
            sourceTitle: "Kitchen decisions",
            modeId: null,
            projectId: null,
            admissionEventId: "candidate-1",
            admittedAt: "2026-09-02T00:00:00.000Z",
            available: true,
            excluded: false,
          },
        ],
      }),
    ).toBe(true);
    expect(
      Value.Check(ConversationForgetPreviewSchema, {
        conversationId: "conversation-1",
        conversationTitle: "Kitchen decisions",
        items: [],
        forgettableCount: 0,
        retainedCount: 0,
        legacyUnknownCount: 0,
        revision,
      }),
    ).toBe(true);
  });
});

describe("Community install disclosure contracts", () => {
  it("accepts known, disabled and unknown capability disclosures", () => {
    expect(
      Value.Check(CatalogueInstallPreviewSchema, {
        id: "photo-notes",
        kind: "routine",
        name: "Photo Notes",
        creator: "Ava",
        version: "2.1.0",
        source: {
          label: "Vaenyx Community",
          url: "https://community.test/routines/photo-notes",
        },
        isUpdate: true,
        currentVersion: "2.0.0",
        capabilities: [
          { id: "vision", state: "available", newlyRequested: false },
          { id: "fetching", state: "disabled", newlyRequested: true },
          { id: "future-sense", state: "unsupported", newlyRequested: true },
        ],
        declarative: true,
      }),
    ).toBe(true);
  });
});
