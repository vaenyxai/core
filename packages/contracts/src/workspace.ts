import { type Static, Type } from "@sinclair/typebox";

export const OwnerSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
  },
  { additionalProperties: false },
);

export const BootstrapStatusSchema = Type.Object(
  {
    setupRequired: Type.Boolean(),
    authenticated: Type.Boolean(),
    owner: Type.Union([OwnerSchema, Type.Null()]),
  },
  { additionalProperties: false },
);

export const SetupOwnerRequestSchema = Type.Object(
  {
    name: Type.String({ minLength: 1, maxLength: 80 }),
    password: Type.String({ minLength: 8, maxLength: 200 }),
  },
  { additionalProperties: false },
);

export const LoginRequestSchema = Type.Object(
  {
    password: Type.String({ minLength: 1, maxLength: 200 }),
  },
  { additionalProperties: false },
);

export const ChangePasswordRequestSchema = Type.Object(
  {
    currentPassword: Type.String({ minLength: 1, maxLength: 200 }),
    newPassword: Type.String({ minLength: 8, maxLength: 200 }),
  },
  { additionalProperties: false },
);

export const ProjectSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    description: Type.String(),
    taskCount: Type.Integer({ minimum: 0 }),
    memoryCount: Type.Integer({ minimum: 0 }),
    threadCount: Type.Integer({ minimum: 0 }),
    chatThreadCount: Type.Integer({ minimum: 0 }),
    taskThreadCount: Type.Integer({ minimum: 0 }),
    instructionsManual: Type.String(),
    instructionsAuto: Type.String(),
    instructionsAutoUpdatedAt: Type.Union([Type.String(), Type.Null()]),
  },
  { additionalProperties: false },
);

export const CreateProjectRequestSchema = Type.Object(
  {
    name: Type.String({ minLength: 1, maxLength: 100 }),
    description: Type.String({ minLength: 1, maxLength: 500 }),
  },
  { additionalProperties: false },
);

export const UpdateProjectRequestSchema = CreateProjectRequestSchema;

// Dual instruction windows (spec §7): either window may be updated on its own.
// Setting a window to "" clears it — that is how the Owner deletes the
// automatic summary Document.
export const UpdateProjectInstructionsRequestSchema = Type.Object(
  {
    manual: Type.Optional(Type.String({ maxLength: 4000 })),
    auto: Type.Optional(Type.String({ maxLength: 8000 })),
  },
  { additionalProperties: false },
);

export const InstanceSettingsSchema = Type.Object(
  {
    instanceName: Type.String(),
    // What the assistant is called in conversations (default "Vaenyx").
    agentName: Type.String(),
    version: Type.String(),
    mode: Type.Union([
      Type.Literal("development"),
      Type.Literal("test"),
      Type.Literal("production"),
    ]),
    bindAddress: Type.String(),
    dataStorage: Type.String(),
    providerConnection: Type.Union([
      Type.Literal("not-connected"),
      Type.Literal("chatgpt-connected"),
      Type.Literal("unsupported-auth"),
    ]),
    harness: Type.Union([
      Type.Literal("mock-harness"),
      Type.Literal("codex-harness"),
    ]),
    codex: Type.Object(
      {
        installed: Type.Boolean(),
        loggedIn: Type.Boolean(),
        authMethod: Type.Union([
          Type.Literal("chatgpt"),
          Type.Literal("api-key"),
          Type.Literal("unknown"),
          Type.Literal("none"),
        ]),
        version: Type.Union([Type.String(), Type.Null()]),
        repositoryAccess: Type.Literal("vaenyx-read-only"),
      },
      { additionalProperties: false },
    ),
    autonomyLevel: Type.Literal(0),
  },
  { additionalProperties: false },
);

export const UpdateInstanceSettingsRequestSchema = Type.Object(
  {
    instanceName: Type.String({ minLength: 1, maxLength: 100 }),
    agentName: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  },
  { additionalProperties: false },
);

// Multi-model: a backend the Owner can connect + its live status, for the
// Settings "Models" section. `connected` = a stored connection exists (Codex is
// always connected, via its own CLI login).
export const ModelProviderInfoSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    kind: Type.Union([
      Type.Literal("cli-login"),
      Type.Literal("api-key"),
      Type.Literal("openai-compatible"),
      Type.Literal("anthropic"),
    ]),
    needsKey: Type.Boolean(),
    needsBaseUrl: Type.Boolean(),
    connected: Type.Boolean(),
    healthy: Type.Boolean(),
    detail: Type.String(),
    isDefault: Type.Boolean(),
    model: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export const ModelProvidersResponseSchema = Type.Object(
  { providers: Type.Array(ModelProviderInfoSchema) },
  { additionalProperties: false },
);

// Connect (or update) an API-key / local provider. Codex is not connected this
// way — it uses its own CLI login.
export const ConnectModelProviderRequestSchema = Type.Object(
  {
    apiKey: Type.Optional(Type.String({ maxLength: 400 })),
    baseUrl: Type.Optional(Type.String({ maxLength: 400 })),
    model: Type.Optional(Type.String({ maxLength: 200 })),
  },
  { additionalProperties: false },
);

export const ForgeConnectionTestResultSchema = Type.Object(
  {
    status: Type.Union([Type.Literal("passed"), Type.Literal("failed")]),
    check: Type.String(),
    durationMs: Type.Integer({ minimum: 0 }),
    message: Type.String(),
    output: Type.Union([Type.String(), Type.Null()]),
    timestamp: Type.String(),
  },
  { additionalProperties: false },
);

export const ChatConnectionTestRequestSchema = Type.Object(
  {
    prompt: Type.String({ minLength: 1, maxLength: 1_000 }),
  },
  { additionalProperties: false },
);

export const ChatConnectionTestResultSchema = Type.Object(
  {
    status: Type.Union([
      Type.Literal("passed"),
      Type.Literal("failed"),
      Type.Literal("blocked"),
    ]),
    check: Type.String(),
    durationMs: Type.Integer({ minimum: 0 }),
    message: Type.String(),
    output: Type.Union([Type.String(), Type.Null()]),
    timestamp: Type.String(),
  },
  { additionalProperties: false },
);

export const ReasoningEffortSchema = Type.Union([
  Type.Literal("low"),
  Type.Literal("medium"),
  Type.Literal("high"),
]);

export const AskVaenyxConversationSchema = Type.Object(
  {
    id: Type.String(),
    title: Type.String(),
    messageCount: Type.Integer({ minimum: 0 }),
    createdAt: Type.String(),
    updatedAt: Type.String(),
    reasoningEffort: ReasoningEffortSchema,
    // NULL = use the Owner's default provider; a string pins a provider by id.
    modelProviderId: Type.Union([Type.String(), Type.Null()]),
    // NULL = the provider's configured model; a string picks a specific model
    // of that provider for this conversation ("model within the model").
    modelName: Type.Union([Type.String(), Type.Null()]),
  },
  { additionalProperties: false },
);

export const SetReasoningEffortRequestSchema = Type.Object(
  {
    effort: ReasoningEffortSchema,
  },
  { additionalProperties: false },
);

export const SetChatProviderRequestSchema = Type.Object(
  {
    providerId: Type.Union([Type.String(), Type.Null()]),
  },
  { additionalProperties: false },
);

export const SetChatModelRequestSchema = Type.Object(
  {
    model: Type.Union([Type.String({ minLength: 1, maxLength: 200 }), Type.Null()]),
  },
  { additionalProperties: false },
);

export const AskVaenyxMessageSchema = Type.Object(
  {
    id: Type.String(),
    conversationId: Type.String(),
    role: Type.Union([Type.Literal("owner"), Type.Literal("assistant")]),
    content: Type.String(),
    status: Type.Union([Type.Literal("completed"), Type.Literal("failed")]),
    webSearchUsed: Type.Boolean(),
    createdAt: Type.String(),
    // Voice turn (WeChat-style bubble): true on a spoken Owner message and on
    // the assistant's short spoken-style reply. audioId names the Owner's
    // original recording (assistant bubbles replay via on-device TTS).
    voice: Type.Optional(Type.Boolean()),
    audioId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  },
  { additionalProperties: false },
);

export const CreateAskVaenyxConversationRequestSchema = Type.Object(
  {
    title: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
    projectId: Type.Optional(
      Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
    ),
    // Library v2: open this chat already bound to a Routine (the "Use" entry from
    // the Routine list). Omitted = an ordinary chat.
    routineId: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

export const CreateAskVaenyxMessageRequestSchema = Type.Object(
  {
    content: Type.String({ minLength: 1, maxLength: 10_000 }),
    // Library v2 (AI-driven): when the intent classifier returned "suggest",
    // the reply may briefly offer this Routine. Omitted = a plain reply.
    suggestRoutineId: Type.Optional(Type.String({ minLength: 1 })),
    // suggest-task: the reply may briefly offer to run it as a background task.
    suggestTask: Type.Optional(Type.Boolean()),
    // create-*: the Owner asked Vaenyx to BUILD a new Method/Routine. The reply
    // must point at the creation flow (an offer card appears under it) and must
    // never claim to have created anything itself.
    suggestCreate: Type.Optional(
      Type.Union([Type.Literal("method"), Type.Literal("routine")]),
    ),
    // clarify-create (spec §2a phase 2): the Owner wants something built but the
    // description is not enough to build from yet. The reply must only ask this
    // clarifying question — nothing is built on this turn.
    clarifyCreate: Type.Optional(Type.String({ minLength: 1, maxLength: 500 })),
    // Voice turn: the saved recording's id. Marks both sides as voice bubbles
    // and asks the model for a short spoken-style reply.
    voiceAudioId: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  },
  { additionalProperties: false },
);

// Library v2 (AI-driven Routine in Chat): the classifier's verdict for the
// Owner's latest message. "use" = clearly wants a Routine (auto-attach + run);
// "suggest" = a Routine may help (offer it in the reply); "none" = plain chat.
export const ClassifyRoutineResponseSchema = Type.Object(
  {
    decision: Type.Union([
      Type.Literal("none"),
      Type.Literal("use-routine"),
      Type.Literal("suggest-routine"),
      Type.Literal("suggest-task"),
      Type.Literal("use-task"),
      // The Owner asked Vaenyx to BUILD something new: a single capability
      // (Method) or a multi-step helper (Routine). The chat offers to open the
      // creation flow with the description pre-filled — it never builds inline.
      Type.Literal("create-method"),
      Type.Literal("create-routine"),
      // The Owner wants something built, but the description is too vague to
      // build from. The reply asks ONE clarifying question first; the answered
      // follow-up classifies as create-* and builds (spec §2a phase 2).
      Type.Literal("clarify-create"),
    ]),
    routineId: Type.Union([Type.String(), Type.Null()]),
    // For use-task: the thing to do, extracted from the conversation.
    taskRequest: Type.Union([Type.String(), Type.Null()]),
    // The recurring schedule the Owner asked for ("every morning at 7"), when
    // the message implies one. The task is created AND scheduled in one step,
    // so "daily AI news at 7am" needs no second trip to the Scheduled screen.
    taskSchedule: Type.Union([
      Type.Object(
        {
          cadence: Type.Union([
            Type.Literal("hourly"),
            Type.Literal("daily"),
            Type.Literal("weekly"),
            Type.Literal("monthly"),
          ]),
          // "HH:MM", local time.
          time: Type.Union([Type.String(), Type.Null()]),
          dayOfWeek: Type.Union([Type.Integer(), Type.Null()]),
          dayOfMonth: Type.Union([Type.Integer(), Type.Null()]),
        },
        { additionalProperties: false },
      ),
      Type.Null(),
    ]),
    // For create-*: a clean one-paragraph description of what to build,
    // distilled from the conversation, used to pre-fill the creation flow.
    createDescription: Type.Union([Type.String(), Type.Null()]),
    // For clarify-create: the one question to ask, in the Owner's language.
    clarifyQuestion: Type.Union([Type.String(), Type.Null()]),
    note: Type.String(),
  },
  { additionalProperties: false },
);

export const CreateAskVaenyxMessageResponseSchema = Type.Object(
  {
    conversation: AskVaenyxConversationSchema,
    messages: Type.Array(AskVaenyxMessageSchema),
  },
  { additionalProperties: false },
);

export const VaenyxThreadKindSchema = Type.Union([
  Type.Literal("chat"),
  Type.Literal("task"),
]);

export const VaenyxThreadStatusSchema = Type.Union([
  Type.Literal("active"),
  Type.Literal("pinned"),
  Type.Literal("archived"),
]);

export const VaenyxThreadSchema = Type.Object(
  {
    id: Type.String(),
    kind: VaenyxThreadKindSchema,
    title: Type.String(),
    projectId: Type.Union([Type.String(), Type.Null()]),
    projectName: Type.Union([Type.String(), Type.Null()]),
    status: VaenyxThreadStatusSchema,
    sourceChatId: Type.Union([Type.String(), Type.Null()]),
    conversationId: Type.Union([Type.String(), Type.Null()]),
    taskId: Type.Union([Type.String(), Type.Null()]),
    // Library v2: when set, this chat is a routine chat (capability bar +
    // Journal/Gallery; messages run the Routine). Null = an ordinary chat.
    routineId: Type.Union([Type.String(), Type.Null()]),
    summary: Type.Union([Type.String(), Type.Null()]),
    messageCount: Type.Integer({ minimum: 0 }),
    createdAt: Type.String(),
    updatedAt: Type.String(),
  },
  { additionalProperties: false },
);

export const UpdateVaenyxThreadProjectRequestSchema = Type.Object(
  {
    projectId: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  },
  { additionalProperties: false },
);

export const UpdateVaenyxThreadStatusRequestSchema = Type.Object(
  {
    status: VaenyxThreadStatusSchema,
  },
  { additionalProperties: false },
);

export const UpdateVaenyxThreadTitleRequestSchema = Type.Object(
  {
    title: Type.String({ minLength: 1, maxLength: 120 }),
  },
  { additionalProperties: false },
);

export const SkillSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    description: Type.String(),
  },
  { additionalProperties: false },
);

export const AgentProfileSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    role: Type.String(),
    personality: Type.String(),
    voice: Type.String(),
    boundaries: Type.String(),
    providerRoute: Type.String(),
    editable: Type.Boolean(),
    createdAt: Type.String(),
    updatedAt: Type.String(),
  },
  { additionalProperties: false },
);

export const UpdateAgentProfileNameRequestSchema = Type.Object(
  {
    name: Type.String({ minLength: 1, maxLength: 80 }),
  },
  { additionalProperties: false },
);

export const VaenyxMeItemSchema = Type.Object(
  {
    id: Type.String(),
    category: Type.String(),
    title: Type.String(),
    summary: Type.String(),
    status: Type.Union([
      Type.Literal("not_learned"),
      Type.Literal("pending_review"),
      Type.Literal("approved"),
      Type.Literal("rejected"),
    ]),
    evidence: Type.Union([Type.String(), Type.Null()]),
    confidence: Type.Integer({ minimum: 0, maximum: 100 }),
    updatedAt: Type.String(),
  },
  { additionalProperties: false },
);

export const VaenyxMeProfileSchema = Type.Object(
  {
    ownerModel: Type.Literal("digital-self"),
    items: Type.Array(VaenyxMeItemSchema),
  },
  { additionalProperties: false },
);

export const VaenyxMeCandidateStatusSchema = Type.Union([
  Type.Literal("pending_review"),
  Type.Literal("approved"),
  Type.Literal("rejected"),
  Type.Literal("deleted"),
]);

export const VaenyxMeCandidateSourceTypeSchema = Type.Union([
  Type.Literal("owner_manual"),
  Type.Literal("project_memory"),
  Type.Literal("task_result"),
  Type.Literal("forge_suggestion"),
  Type.Literal("system_seed"),
  Type.Literal("chat_history"),
]);

export const VaenyxMeCandidateSchema = Type.Object(
  {
    id: Type.String(),
    category: Type.String(),
    title: Type.String(),
    proposedSummary: Type.String(),
    proposedEvidence: Type.String(),
    sourceType: VaenyxMeCandidateSourceTypeSchema,
    sourceId: Type.Union([Type.String(), Type.Null()]),
    confidence: Type.Integer({ minimum: 0, maximum: 100 }),
    status: VaenyxMeCandidateStatusSchema,
    reviewNote: Type.Union([Type.String(), Type.Null()]),
    createdBy: Type.String(),
    reviewedBy: Type.Union([Type.String(), Type.Null()]),
    reviewedAt: Type.Union([Type.String(), Type.Null()]),
    createdAt: Type.String(),
    updatedAt: Type.String(),
  },
  { additionalProperties: false },
);

export const CreateVaenyxMeCandidateRequestSchema = Type.Object(
  {
    category: Type.String({ minLength: 1, maxLength: 80 }),
    title: Type.String({ minLength: 1, maxLength: 120 }),
    proposedSummary: Type.String({ minLength: 1, maxLength: 2_000 }),
    proposedEvidence: Type.String({ minLength: 1, maxLength: 2_000 }),
    sourceType: Type.Optional(VaenyxMeCandidateSourceTypeSchema),
    sourceId: Type.Optional(
      Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
    ),
    confidence: Type.Integer({ minimum: 0, maximum: 100 }),
  },
  { additionalProperties: false },
);

export const ApproveVaenyxMeCandidateRequestSchema = Type.Object(
  {
    title: Type.String({ minLength: 1, maxLength: 120 }),
    summary: Type.String({ minLength: 1, maxLength: 2_000 }),
    evidence: Type.String({ minLength: 1, maxLength: 2_000 }),
    confidence: Type.Integer({ minimum: 0, maximum: 100 }),
    reviewNote: Type.Optional(Type.String({ maxLength: 2_000 })),
  },
  { additionalProperties: false },
);

export const RejectVaenyxMeCandidateRequestSchema = Type.Object(
  {
    reviewNote: Type.Optional(Type.String({ maxLength: 2_000 })),
  },
  { additionalProperties: false },
);

export const TaskSchema = Type.Object(
  {
    id: Type.String(),
    title: Type.String(),
    request: Type.String(),
    result: Type.String(),
    status: Type.Union([
      Type.Literal("waiting"),
      Type.Literal("running"),
      Type.Literal("completed"),
      Type.Literal("failed"),
    ]),
    source: Type.Union([Type.Literal("owner"), Type.Literal("app")]),
    sourceAppId: Type.Union([Type.String(), Type.Null()]),
    sourceAppName: Type.Union([Type.String(), Type.Null()]),
    projectId: Type.String(),
    projectName: Type.String(),
    threadId: Type.Union([Type.String(), Type.Null()]),
    threadStatus: Type.Union([VaenyxThreadStatusSchema, Type.Null()]),
    threadProjectId: Type.Union([Type.String(), Type.Null()]),
    threadProjectName: Type.Union([Type.String(), Type.Null()]),
    sourceChatId: Type.Union([Type.String(), Type.Null()]),
    sourceChatTitle: Type.Union([Type.String(), Type.Null()]),
    skillId: Type.Union([Type.String(), Type.Null()]),
    skillName: Type.Union([Type.String(), Type.Null()]),
    provider: Type.Union([
      Type.Literal("mock-provider"),
      Type.Literal("openai-subscription-auth"),
    ]),
    harness: Type.Union([
      Type.Literal("mock-harness"),
      Type.Literal("codex-harness"),
    ]),
    agent: Type.Union([Type.Literal("Vaenyx"), Type.Literal("Forge")]),
    autonomyLevel: Type.Literal(0),
    memoryUsedCount: Type.Integer({ minimum: 0 }),
    createdAt: Type.String(),
    completedAt: Type.Union([Type.String(), Type.Null()]),
    scheduleCadence: Type.Union([
      Type.Literal("hourly"),
      Type.Literal("daily"),
      Type.Literal("weekly"),
      Type.Literal("monthly"),
      Type.Null(),
    ]),
    // Scheduled tasks: precise schedule. time = "HH:MM" (local); dayOfWeek 0-6
    // (Sun-Sat) for weekly; dayOfMonth 1-31 for monthly. Null when not applicable.
    scheduleTime: Type.Union([Type.String(), Type.Null()]),
    scheduleDayOfWeek: Type.Union([Type.Integer(), Type.Null()]),
    scheduleDayOfMonth: Type.Union([Type.Integer(), Type.Null()]),
    nextRunAt: Type.Union([Type.String(), Type.Null()]),
    scheduleEnabled: Type.Boolean(),
  },
  { additionalProperties: false },
);

export const TaskRunSchema = Type.Object(
  {
    id: Type.String(),
    taskId: Type.String(),
    status: Type.Union([
      Type.Literal("running"),
      Type.Literal("completed"),
      Type.Literal("failed"),
    ]),
    result: Type.String(),
    trigger: Type.Union([Type.Literal("manual"), Type.Literal("schedule")]),
    startedAt: Type.String(),
    finishedAt: Type.Union([Type.String(), Type.Null()]),
  },
  { additionalProperties: false },
);

export const WorkspaceSchema = Type.Object(
  {
    owner: OwnerSchema,
    projects: Type.Array(ProjectSchema),
    skills: Type.Array(SkillSchema),
    agents: Type.Array(AgentProfileSchema),
    vaenyxMe: VaenyxMeProfileSchema,
    tasks: Type.Array(TaskSchema),
    threads: Type.Array(VaenyxThreadSchema),
  },
  { additionalProperties: false },
);

export const CreateTaskRequestSchema = Type.Object(
  {
    request: Type.String({ minLength: 1, maxLength: 10_000 }),
    projectId: Type.String({ minLength: 1 }),
    skillId: Type.Optional(Type.String({ minLength: 1 })),
    sourceChatId: Type.Optional(
      Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
    ),
    autonomyLevel: Type.Optional(Type.Integer({ minimum: 0, maximum: 5 })),
    executionMode: Type.Optional(
      Type.Union([
        Type.Literal("mock"),
        Type.Literal("forge-readonly"),
        Type.Literal("research"),
      ]),
    ),
  },
  { additionalProperties: false },
);

export const SetTaskScheduleRequestSchema = Type.Object(
  {
    cadence: Type.Union([
      Type.Literal("hourly"),
      Type.Literal("daily"),
      Type.Literal("weekly"),
      Type.Literal("monthly"),
      Type.Null(),
    ]),
    enabled: Type.Boolean(),
    // Precise schedule (optional; sensible defaults applied if omitted):
    // time "HH:MM" local; dayOfWeek 0-6 for weekly; dayOfMonth 1-31 for monthly.
    time: Type.Optional(Type.String({ minLength: 4, maxLength: 5 })),
    dayOfWeek: Type.Optional(Type.Integer({ minimum: 0, maximum: 6 })),
    dayOfMonth: Type.Optional(Type.Integer({ minimum: 1, maximum: 31 })),
  },
  { additionalProperties: false },
);

// A Token (App Profile) is one of two kinds: a Method Token (1+ Methods the app
// composes itself) or a Routine Token (one Routine the app calls as a black box,
// Vaenyx runs it).
export const AppProfileKindSchema = Type.Union([
  Type.Literal("method"),
  Type.Literal("routine"),
]);

export const AppProfileSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    tokenPrefix: Type.String(),
    // An App Profile has NO project binding: it is scoped only by what it may use
    // (Methods or one Routine) + fetchRecipe, and has no project / chat / memory.
    kind: AppProfileKindSchema,
    // For a Routine Token: the single Routine this token may run (else null).
    allowedRoutineId: Type.Union([Type.String(), Type.Null()]),
    allowedSkillIds: Type.Array(Type.String()),
    allowedMethodIds: Type.Array(Type.String()),
    // Mode B: may this app fetch a method's recipe (instructions + schemas +
    // examples) to run on its own model, instead of only Vaenyx running it?
    fetchRecipe: Type.Boolean(),
    // Flywheel return (§10): may this app send users' corrections back to feed
    // the method's flywheel? Default off; Owner must enable it in Settings.
    sendFeedback: Type.Boolean(),
    outputFormat: Type.Literal("json"),
    maxAutonomyLevel: Type.Literal(0),
    memoryWritePolicy: Type.Literal("none"),
    enabled: Type.Boolean(),
    createdAt: Type.String(),
  },
  { additionalProperties: false },
);

export const CreateAppProfileRequestSchema = Type.Object(
  {
    name: Type.String({ minLength: 1, maxLength: 80 }),
    // Token kind (defaults to a Method Token for back-compat). A Routine Token
    // uses allowedRoutineId; a Method Token uses allowedMethodIds + fetchRecipe.
    kind: Type.Optional(AppProfileKindSchema),
    allowedRoutineId: Type.Optional(Type.String({ minLength: 1 })),
    // A method token may be scoped to Skills, Methods, or both. The "at least one
    // capability" rule is enforced at runtime (it spans fields a single-field
    // schema cannot express).
    allowedSkillIds: Type.Optional(
      Type.Array(Type.String({ minLength: 1 }), {
        uniqueItems: true,
        default: [],
      }),
    ),
    allowedMethodIds: Type.Optional(
      Type.Array(Type.String({ minLength: 1 }), {
        uniqueItems: true,
        default: [],
      }),
    ),
    fetchRecipe: Type.Optional(Type.Boolean()),
    sendFeedback: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

export const CreateAppProfileResponseSchema = Type.Object(
  {
    profile: AppProfileSchema,
    token: Type.String(),
  },
  { additionalProperties: false },
);

// Re-viewing an existing token (Owner-only; decrypted from the at-rest cipher).
export const RevealAppTokenResponseSchema = Type.Object(
  {
    token: Type.String(),
  },
  { additionalProperties: false },
);

// Web Push: the server's VAPID public key (null only if the secrets directory
// is unusable) + subscribe/unsubscribe bodies, mirroring PushSubscription.
export const PushPublicKeyResponseSchema = Type.Object(
  {
    key: Type.Union([Type.String(), Type.Null()]),
  },
  { additionalProperties: false },
);

export const SubscribePushRequestSchema = Type.Object(
  {
    endpoint: Type.String({ minLength: 1, maxLength: 2000 }),
    keys: Type.Object(
      {
        p256dh: Type.String({ minLength: 1, maxLength: 500 }),
        auth: Type.String({ minLength: 1, maxLength: 500 }),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export const UnsubscribePushRequestSchema = Type.Object(
  {
    endpoint: Type.String({ minLength: 1, maxLength: 2000 }),
  },
  { additionalProperties: false },
);

export const PushAckResponseSchema = Type.Object(
  {
    ok: Type.Boolean(),
  },
  { additionalProperties: false },
);

// Voice (speech-to-text) connection: separate from the chat models. Connect
// with a key, or with none to reuse an already-connected Groq chat key.
export const VoiceStatusSchema = Type.Object(
  {
    connected: Type.Boolean(),
    model: Type.Union([Type.String(), Type.Null()]),
  },
  { additionalProperties: false },
);

export const ConnectVoiceRequestSchema = Type.Object(
  {
    apiKey: Type.Optional(Type.String({ maxLength: 500 })),
    model: Type.Optional(Type.String({ maxLength: 200 })),
  },
  { additionalProperties: false },
);

export const TranscribeVoiceResponseSchema = Type.Object(
  {
    text: Type.String(),
    // The saved recording's id — sent along with the message so the voice
    // bubble can replay the original audio later.
    audioId: Type.String(),
  },
  { additionalProperties: false },
);

// Edit an existing App Profile's capability scope. The token (identity) never
// changes; only the Methods it may use and its Mode B / memory permissions do.
// Re-granting Methods re-pins each one's current content hash.
// Edit a Token. The kind is fixed at creation; only the grant changes — a Method
// Token edits its Methods + fetchRecipe, a Routine Token edits which Routine.
export const UpdateAppProfileRequestSchema = Type.Object(
  {
    allowedRoutineId: Type.Optional(Type.String({ minLength: 1 })),
    allowedMethodIds: Type.Optional(
      Type.Array(Type.String({ minLength: 1 }), { uniqueItems: true }),
    ),
    fetchRecipe: Type.Optional(Type.Boolean()),
    sendFeedback: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

export const UpdateAppProfileResponseSchema = Type.Object(
  {
    profile: AppProfileSchema,
  },
  { additionalProperties: false },
);

export const AppAskRequestSchema = Type.Object(
  {
    request: Type.String({ minLength: 1, maxLength: 10_000 }),
    skillId: Type.Optional(Type.String({ minLength: 1 })),
    autonomyLevel: Type.Optional(Type.Integer({ minimum: 0, maximum: 5 })),
  },
  { additionalProperties: false },
);

// A Library Method as the Owner browses the catalogue (progressive disclosure:
// just identity + one-line description, the cheap part loaded for every method).
// Item provenance: "self" (made on this device) vs "community" (installed from
// the Library). Optional — legacy items carry no marker (the loader defaults to
// "self"). Never part of a content hash, so it never breaks a version lock.
export const ItemOriginSchema = Type.Optional(
  Type.Union([Type.Literal("self"), Type.Literal("community")]),
);

export const LibraryMethodSummarySchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    description: Type.String(),
    version: Type.String(),
    // Authorship; empty for local content until published to a Vaenyx identity.
    owner: Type.String(),
    // Free-form labels (hashtags). A method can carry zero, one, or many; the
    // Owner browses by tag and a method shows under every tag it has.
    tags: Type.Array(Type.String()),
    origin: ItemOriginSchema,
  },
  { additionalProperties: false },
);

// A fully loaded Method: summary + the recipe text, the input/output JSON
// Schemas and the manifest (all author-defined arbitrary JSON, so Unknown), and
// the content hash an App Profile pins to lock the version.
export const LibraryMethodSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    description: Type.String(),
    version: Type.String(),
    owner: Type.String(),
    tags: Type.Array(Type.String()),
    origin: ItemOriginSchema,
    recipe: Type.String(),
    inputSchema: Type.Unknown(),
    outputSchema: Type.Unknown(),
    manifest: Type.Unknown(),
    exampleCount: Type.Integer(),
    contentHash: Type.String(),
  },
  { additionalProperties: false },
);

// Rename a Library Method's display name (Owner only). The id (= folder name)
// and the content hash are unaffected, so existing App Profile grants and tokens
// keep working — the name is not part of the hash.
export const RenameMethodRequestSchema = Type.Object(
  {
    name: Type.String({ minLength: 1, maxLength: 120 }),
  },
  { additionalProperties: false },
);

// Set the full tag list on one method (Owner only). Replaces whatever tags it
// had. tags are not part of the content hash, so retagging never breaks an App
// Profile's version lock.
export const SetMethodTagsRequestSchema = Type.Object(
  {
    tags: Type.Array(Type.String({ minLength: 1, maxLength: 120 }), {
      uniqueItems: true,
    }),
  },
  { additionalProperties: false },
);

// Rename a tag across every method that carries it (Owner only). Renaming to an
// existing tag merges them — the way to fix a typo'd label and fold it into the
// right one. tags are not part of the content hash, so grants keep working.
export const RenameMethodTagRequestSchema = Type.Object(
  {
    from: Type.String({ minLength: 1, maxLength: 120 }),
    to: Type.String({ minLength: 1, maxLength: 120 }),
  },
  { additionalProperties: false },
);

export const RenameMethodTagResponseSchema = Type.Object(
  {
    methods: Type.Array(LibraryMethodSummarySchema),
    moved: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);

// ── Library v2: Method creation (③) — draft from plain language ──────────────
// The Owner describes a job in plain language; Vaenyx drafts a Method spec (recipe
// + I/O schemas + tags). The Owner reviews/edits, demo-tests, then saves. A draft
// is just data until saved — inputSchema/outputSchema are arbitrary author JSON.

export const DraftMethodRequestSchema = Type.Object(
  {
    description: Type.String({ minLength: 1, maxLength: 4_000 }),
  },
  { additionalProperties: false },
);

// A drafted (or edited) Method spec — also the body for saving a new Method.
export const MethodDraftSchema = Type.Object(
  {
    name: Type.String({ minLength: 1, maxLength: 120 }),
    description: Type.String({ maxLength: 2_000 }),
    recipe: Type.String({ minLength: 1 }),
    inputSchema: Type.Unknown(),
    outputSchema: Type.Unknown(),
    tags: Type.Array(Type.String({ minLength: 1, maxLength: 120 }), {
      uniqueItems: true,
    }),
  },
  { additionalProperties: false },
);

// Demo-test an unsaved draft: run it on one input before committing it to disk.
export const DraftMethodRunRequestSchema = Type.Object(
  {
    draft: MethodDraftSchema,
    input: Type.Unknown(),
  },
  { additionalProperties: false },
);

// ── Library v2: Routine (the user-facing product) — data model only ──────────
// A Routine is 1+ Method + declarative orchestration + storage. See
// docs/library-architecture.md §14. v1 orchestration is a straight linear chain;
// no foreign code ever runs on the user's machine.

export const RoutineModeSchema = Type.Union([
  Type.Literal("one-shot"),
  Type.Literal("accumulate"),
]);

// One declared Method dependency, pinned to a version (the install-time lock).
export const RoutineDepSchema = Type.Object(
  {
    methodId: Type.String({ minLength: 1 }),
    version: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

// One step in the linear flow: run `methodId`, taking its input from the Journal
// entry, the previous step's output, or a static value baked into the Routine.
export const RoutineStepSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    methodId: Type.String({ minLength: 1 }),
    from: Type.Union([
      Type.Literal("journal"),
      Type.Literal("previous"),
      Type.Literal("static"),
    ]),
    value: Type.Optional(Type.Unknown()),
  },
  { additionalProperties: false },
);

// Which on-device private stores this Routine keeps (Journal = raw inputs fed in,
// Gallery = generated results to revisit). Both are local-only, never uploaded.
export const RoutineStorageSchema = Type.Object(
  {
    journal: Type.Boolean(),
    gallery: Type.Boolean(),
  },
  { additionalProperties: false },
);

// Declarative View (Library v2 ④): the shape a routine.json author writes into
// the `view` slot to say how this Routine's result renders. Ordered field hints:
// "title" = headline, "text" = labelled line, "bullets" = list, "table" = rows.
// Fields not listed are simply not shown. The wire type stays Unknown (below) so
// an unrecognised/older shape never breaks loading — the client validates at
// render time and falls back to the automatic view ("A") when it doesn't parse.
export const RoutineViewFieldSchema = Type.Object(
  {
    key: Type.String(),
    as: Type.Union([
      Type.Literal("title"),
      Type.Literal("text"),
      Type.Literal("bullets"),
      Type.Literal("table"),
      Type.Literal("amount"),
      Type.Literal("note"),
    ]),
    label: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export const RoutineViewSchema = Type.Object(
  {
    fields: Type.Array(RoutineViewFieldSchema),
  },
  { additionalProperties: false },
);

// A Routine as the Owner browses the catalogue (progressive disclosure). `view`
// rides along (it lives in routine.json, which summaries already read) so the
// chat/Gallery can render results without a full load.
export const LibraryRoutineSummarySchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    description: Type.String(),
    version: Type.String(),
    owner: Type.String(),
    tags: Type.Array(Type.String()),
    mode: RoutineModeSchema,
    stepCount: Type.Integer({ minimum: 0 }),
    view: Type.Optional(Type.Unknown()),
    origin: ItemOriginSchema,
  },
  { additionalProperties: false },
);

// A fully loaded Routine. `view` is the reserved, optional presentation slot
// (absent/null = auto-generate a default view from the output schema, "A"; a
// saved object = the custom override, "B"). `manifest` is arbitrary author JSON.
// `resolved` is false when any declared Method dep is missing or version-mismatched
// (listed in `missingDeps`). contentHash covers flow + deps + mode + storage +
// manifest + version (not name/description/owner/tags/view) — the version lock.
export const LibraryRoutineSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    description: Type.String(),
    version: Type.String(),
    owner: Type.String(),
    tags: Type.Array(Type.String()),
    origin: ItemOriginSchema,
    mode: RoutineModeSchema,
    storage: RoutineStorageSchema,
    deps: Type.Array(RoutineDepSchema),
    flow: Type.Array(RoutineStepSchema),
    view: Type.Optional(Type.Unknown()),
    manifest: Type.Unknown(),
    exampleCount: Type.Integer(),
    contentHash: Type.String(),
    resolved: Type.Boolean(),
    missingDeps: Type.Array(Type.String()),
  },
  { additionalProperties: false },
);

// One raw entry the family fed into a Routine's Journal (local, private).
export const RoutineJournalEntrySchema = Type.Object(
  {
    id: Type.String(),
    routineId: Type.String(),
    chatId: Type.Union([Type.String(), Type.Null()]),
    content: Type.Unknown(),
    createdAt: Type.String(),
  },
  { additionalProperties: false },
);

// One generated result kept in a Routine's Gallery. `output` is the structured
// result (NOT rendered text), so the view layer can render — and re-render — it.
export const RoutineGalleryItemSchema = Type.Object(
  {
    id: Type.String(),
    routineId: Type.String(),
    chatId: Type.Union([Type.String(), Type.Null()]),
    stepId: Type.Union([Type.String(), Type.Null()]),
    output: Type.Unknown(),
    outputValid: Type.Boolean(),
    createdAt: Type.String(),
  },
  { additionalProperties: false },
);

// ── Library v2: Routine creation (③ slice 2) — plan from plain language ───────
// The Owner describes what they want; Vaenyx plans a Routine = ordered steps,
// each either reusing an existing Method (by id) or a freshly drafted one. The
// Owner reviews the plan, then saves (which creates the new Methods + the Routine).

export const PlanRoutineRequestSchema = Type.Object(
  {
    description: Type.String({ minLength: 1, maxLength: 4_000 }),
  },
  { additionalProperties: false },
);

// One planned step: either reuse an existing Method (`reuse` = its id) or create
// a new one (`method` = a drafted spec). Exactly one is set (enforced at runtime).
export const RoutinePlanStepSchema = Type.Object(
  {
    title: Type.String(),
    reuse: Type.Optional(Type.String()),
    method: Type.Optional(MethodDraftSchema),
  },
  { additionalProperties: false },
);

// A drafted (or edited) Routine plan — also the body for saving a new Routine.
export const RoutinePlanSchema = Type.Object(
  {
    name: Type.String({ minLength: 1, maxLength: 120 }),
    description: Type.String({ maxLength: 2_000 }),
    mode: RoutineModeSchema,
    steps: Type.Array(RoutinePlanStepSchema),
  },
  { additionalProperties: false },
);

// ── Library v2: distribution (④) — the shared catalogue served from the CDN ───
// The Vaenyx app reads a single index.json from Cloudflare (never GitHub directly),
// searches it locally, and installs one Routine + its Methods on demand. The
// catalogue summaries reuse the same shapes as the local browse summaries.

export const CatalogueIndexSchema = Type.Object(
  {
    schemaVersion: Type.Integer(),
    methods: Type.Array(LibraryMethodSummarySchema),
    routines: Type.Array(LibraryRoutineSummarySchema),
  },
  { additionalProperties: false },
);

// Install one catalogue Routine (with its Method dependencies) into the local
// library, by id — the app already holds the summary from the index.
export const InstallRoutineRequestSchema = Type.Object(
  {
    routineId: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

// Install one catalogue Method on its own (as a reusable building block), by id.
export const InstallMethodRequestSchema = Type.Object(
  {
    methodId: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

// Legal acknowledgement / consent record (in-app disclaimers copy pack, clause
// 2.3). language = the rendered UI language; copyVersion = the legal.copyVersion
// in force; choice = an optional recorded choice (e.g. flywheel accept/decline).
export const LegalAcknowledgeRequestSchema = Type.Object(
  {
    keyName: Type.String({ minLength: 1 }),
    copyVersion: Type.String({ minLength: 1 }),
    language: Type.String({ minLength: 1 }),
    choice: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export const LegalAcknowledgementSchema = Type.Object(
  {
    keyName: Type.String(),
    copyVersion: Type.String(),
    language: Type.String(),
    choice: Type.Union([Type.String(), Type.Null()]),
    createdAt: Type.String(),
  },
  { additionalProperties: false },
);

export const LegalAcknowledgementsResponseSchema = Type.Object(
  {
    acknowledgements: Type.Array(LegalAcknowledgementSchema),
  },
  { additionalProperties: false },
);

// The G2/G2a acceptance every publish request carries (copy pack clause 2.3):
// the warranty is actively confirmed on each publish (never pre-selected), and
// the acceptance is recorded locally + server-side by the publish service.
export const PublishAcceptanceRequestSchema = Type.Object(
  {
    acceptance: Type.Object(
      {
        copyVersion: Type.String({ minLength: 1, maxLength: 20 }),
        language: Type.String({ minLength: 1, maxLength: 10 }),
        warrantyConfirmed: Type.Literal(true),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

// Result of an install: the freshly loaded local Routine, plus which dependency
// Methods were newly downloaded vs already present (reused) on this machine.
export const InstallRoutineResponseSchema = Type.Object(
  {
    routine: LibraryRoutineSchema,
    installedMethods: Type.Array(Type.String()),
    skippedMethods: Type.Array(Type.String()),
  },
  { additionalProperties: false },
);

// Body for POST /v1/library/methods/:id/run. `input` is validated at runtime
// against the method's own inputSchema, so the contract only requires its
// presence as an object.
export const RunMethodRequestSchema = Type.Object(
  {
    input: Type.Unknown(),
  },
  { additionalProperties: false },
);

// Result of a Method run. `output` is the model's structured answer, validated
// against the method's outputSchema (outputValid reports the verdict); `raw` is
// the unparsed model text, kept so a caller can recover on a parse miss.
export const RunMethodResponseSchema = Type.Object(
  {
    methodId: Type.String(),
    methodVersion: Type.String(),
    output: Type.Unknown(),
    outputValid: Type.Boolean(),
    raw: Type.String(),
    webSearchUsed: Type.Boolean(),
  },
  { additionalProperties: false },
);

// Mode B (GET /v1/library/methods/:id/recipe): the recipe + schemas + a few
// examples for a permitted app to run on its own model. inputSchema/outputSchema
// and example entries are arbitrary author JSON.
export const FetchMethodRecipeResponseSchema = Type.Object(
  {
    id: Type.String(),
    version: Type.String(),
    contentHash: Type.String(),
    recipe: Type.String(),
    inputSchema: Type.Unknown(),
    outputSchema: Type.Unknown(),
    examples: Type.Array(Type.Unknown()),
  },
  { additionalProperties: false },
);

// Body for POST /v1/library/methods/:id/feedback (flywheel return, §10): an
// external app sends a user's correction back to feed the method's flywheel.
// `version` binds the content-hash of the version that produced the output;
// `correctedOutput` is validated against that version's output schema when the
// version still matches (a mismatch is stored anyway, the version recorded).
// input/aiOutput/correctedOutput are arbitrary author/runtime JSON.
export const MethodFeedbackReactionSchema = Type.Union([
  Type.Literal("confirmed"),
  Type.Literal("edited"),
  Type.Literal("rejected"),
]);

export const SendMethodFeedbackRequestSchema = Type.Object(
  {
    version: Type.String({ minLength: 1 }),
    input: Type.Optional(Type.Unknown()),
    aiOutput: Type.Optional(Type.Unknown()),
    correctedOutput: Type.Optional(Type.Unknown()),
    reaction: MethodFeedbackReactionSchema,
    occurredAt: Type.Optional(Type.String()),
    note: Type.Optional(Type.String({ maxLength: 2000 })),
  },
  { additionalProperties: false },
);

export const SendMethodFeedbackResponseSchema = Type.Object(
  {
    id: Type.String(),
  },
  { additionalProperties: false },
);

// Publishing (library-architecture §16). The Owner signs in with Google once to
// get a publisher identity; published Methods/Routines are committed to the
// community warehouse and attributed to it.
export const PublisherIdentitySchema = Type.Object(
  {
    email: Type.String(),
    name: Type.String(),
    linkedAt: Type.String(),
  },
  { additionalProperties: false },
);

// GET /v1/publish/state — what the Library needs to render publish UI: whether
// publishing is configured at all, the linked identity (or null), and which local
// items are already published (for the badge).
export const PublishStateSchema = Type.Object(
  {
    // "operator" = the direct GitHub path (Google sign-in); "service" = the
    // operator-hosted core-cloud service (Google/GitHub sign-in there).
    mode: Type.Union([Type.Literal("operator"), Type.Literal("service")]),
    configured: Type.Boolean(),
    identity: Type.Union([PublisherIdentitySchema, Type.Null()]),
    // The display name the user is signed in as (either mode), or null.
    signedInAs: Type.Union([Type.String(), Type.Null()]),
    publishedMethodIds: Type.Array(Type.String()),
    publishedRoutineIds: Type.Array(Type.String()),
  },
  { additionalProperties: false },
);

// Result of POST /v1/library/methods/:id/publish.
export const PublishMethodResponseSchema = Type.Object(
  {
    kind: Type.Literal("method"),
    itemId: Type.String(),
    version: Type.String(),
    contentHash: Type.String(),
    commitSha: Type.String(),
    url: Type.String(),
  },
  { additionalProperties: false },
);

// Result of POST /v1/library/routines/:id/publish (the routine + its dep methods).
export const PublishRoutineResponseSchema = Type.Object(
  {
    kind: Type.Literal("routine"),
    itemId: Type.String(),
    version: Type.String(),
    contentHash: Type.String(),
    commitSha: Type.String(),
    url: Type.String(),
  },
  { additionalProperties: false },
);

export const ProjectMemorySchema = Type.Object(
  {
    id: Type.String(),
    projectId: Type.String(),
    projectName: Type.String(),
    kind: Type.Literal("project"),
    title: Type.String(),
    content: Type.String(),
    createdAt: Type.String(),
    updatedAt: Type.String(),
  },
  { additionalProperties: false },
);

export const CreateProjectMemoryRequestSchema = Type.Object(
  {
    projectId: Type.String({ minLength: 1 }),
    title: Type.String({ minLength: 1, maxLength: 120 }),
    content: Type.String({ minLength: 1, maxLength: 20_000 }),
  },
  { additionalProperties: false },
);

export const UpdateProjectMemoryRequestSchema = Type.Object(
  {
    title: Type.String({ minLength: 1, maxLength: 120 }),
    content: Type.String({ minLength: 1, maxLength: 20_000 }),
  },
  { additionalProperties: false },
);

export const AuditEventSchema = Type.Object(
  {
    id: Type.String(),
    actorType: Type.Union([
      Type.Literal("owner"),
      Type.Literal("app"),
      Type.Literal("system"),
    ]),
    actorName: Type.String(),
    action: Type.String(),
    decision: Type.Union([Type.Literal("allowed"), Type.Literal("denied")]),
    reason: Type.String(),
    projectId: Type.Union([Type.String(), Type.Null()]),
    projectName: Type.Union([Type.String(), Type.Null()]),
    resourceType: Type.String(),
    resourceId: Type.Union([Type.String(), Type.Null()]),
    createdAt: Type.String(),
  },
  { additionalProperties: false },
);

export const MessageResponseSchema = Type.Object(
  {
    message: Type.String(),
  },
  { additionalProperties: false },
);

// Backup & Restore (in-app data protection). A backup is a timestamped folder
// under private/backups holding the SQLite database plus the whole local
// library (Methods/Routines). "safety" entries are the automatic before-restore
// snapshots. Restore points are listed newest-first.
export const BackupEntrySchema = Type.Object(
  {
    id: Type.String(),
    createdAt: Type.String(),
    kind: Type.Union([Type.Literal("backup"), Type.Literal("safety")]),
    sizeBytes: Type.Number(),
    migrations: Type.Number(),
    library: Type.Object(
      {
        included: Type.Boolean(),
        methods: Type.Number(),
        routines: Type.Number(),
      },
      { additionalProperties: false },
    ),
    encrypted: Type.Boolean(),
  },
  { additionalProperties: false },
);

export const BackupListResponseSchema = Type.Object(
  {
    backups: Type.Array(BackupEntrySchema),
  },
  { additionalProperties: false },
);

// Owner-set backup preferences: optional destination folder (another disk,
// USB, NAS or a cloud-synced folder — snapshots are write-once, so unlike the
// live database they may be synced), optional keep-most-recent-N retention,
// and optional encryption. The backup password itself is NEVER returned — the
// view exposes only whether encryption is on.
// Automatic backup schedule: daily at HH:00, or weekly (Sundays) at HH:00.
export const BackupScheduleSchema = Type.Union([
  Type.Object(
    {
      cadence: Type.Union([Type.Literal("daily"), Type.Literal("weekly")]),
      hour: Type.Integer({ minimum: 0, maximum: 23 }),
    },
    { additionalProperties: false },
  ),
  Type.Null(),
]);

export const BackupConfigViewSchema = Type.Object(
  {
    destination: Type.Union([Type.String({ maxLength: 500 }), Type.Null()]),
    keep: Type.Union([Type.Integer({ minimum: 1, maximum: 500 }), Type.Null()]),
    encrypted: Type.Boolean(),
    schedule: BackupScheduleSchema,
    lastAutoAt: Type.Union([Type.String(), Type.Null()]),
    lastAutoOk: Type.Union([Type.Boolean(), Type.Null()]),
  },
  { additionalProperties: false },
);

// PUT body: passphrase absent = keep the current password; "" or null = turn
// encryption off; a non-empty string = set/replace the password.
export const BackupConfigUpdateSchema = Type.Object(
  {
    destination: Type.Union([Type.String({ maxLength: 500 }), Type.Null()]),
    keep: Type.Union([Type.Integer({ minimum: 1, maximum: 500 }), Type.Null()]),
    passphrase: Type.Optional(
      Type.Union([Type.String({ maxLength: 200 }), Type.Null()]),
    ),
    schedule: BackupScheduleSchema,
  },
  { additionalProperties: false },
);

export type BackupEntry = Static<typeof BackupEntrySchema>;
export type BackupListResponse = Static<typeof BackupListResponseSchema>;
export type BackupConfigView = Static<typeof BackupConfigViewSchema>;
export type BackupConfigUpdate = Static<typeof BackupConfigUpdateSchema>;

// Friendly routine input (Library v2 ③). When a routine's first Method needs
// several fields, the chat message is AI-parsed into them and the Owner confirms
// before the run. These shapes carry that round trip: the field descriptors the
// confirm card renders, and the run request that can carry either a plain
// message or the confirmed structured input.
export const RoutineInputFieldSchema = Type.Object(
  {
    key: Type.String(),
    // JSON-schema type name ("string" | "number" | "boolean" | "array" | ...).
    type: Type.String(),
    description: Type.String(),
    required: Type.Boolean(),
  },
  { additionalProperties: false },
);

export const RoutineRunChatRequestSchema = Type.Object(
  {
    content: Type.String({ minLength: 1 }),
    // Present = the Owner confirmed these parsed fields; run with them as-is.
    input: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
    // With `input`: the Owner edited the parsed fields, so save this
    // message -> confirmed input as a local, private few-shot parse example.
    learn: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

export const RoutineRunNeedsInputSchema = Type.Object(
  {
    needsInput: Type.Literal(true),
    fields: Type.Array(RoutineInputFieldSchema),
    // Best-effort AI parse of the message, keyed by field; the card prefills it.
    parsed: Type.Record(Type.String(), Type.Unknown()),
    missingRequired: Type.Array(Type.String()),
  },
  { additionalProperties: false },
);

export type RoutineInputField = Static<typeof RoutineInputFieldSchema>;
export type RoutineRunChatRequest = Static<typeof RoutineRunChatRequestSchema>;
export type RoutineRunNeedsInput = Static<typeof RoutineRunNeedsInputSchema>;

export type BootstrapStatus = Static<typeof BootstrapStatusSchema>;
export type AskVaenyxConversation = Static<typeof AskVaenyxConversationSchema>;
export type ReasoningEffort = Static<typeof ReasoningEffortSchema>;
export type SetReasoningEffortRequest = Static<
  typeof SetReasoningEffortRequestSchema
>;
export type SetChatProviderRequest = Static<
  typeof SetChatProviderRequestSchema
>;
export type SetChatModelRequest = Static<typeof SetChatModelRequestSchema>;
export type SubscribePushRequest = Static<typeof SubscribePushRequestSchema>;
export type UnsubscribePushRequest = Static<
  typeof UnsubscribePushRequestSchema
>;
export type ConnectVoiceRequest = Static<typeof ConnectVoiceRequestSchema>;
export type AskVaenyxMessage = Static<typeof AskVaenyxMessageSchema>;
export type AuditEvent = Static<typeof AuditEventSchema>;
export type AgentProfile = Static<typeof AgentProfileSchema>;
export type AppAskRequest = Static<typeof AppAskRequestSchema>;
export type ApproveVaenyxMeCandidateRequest = Static<
  typeof ApproveVaenyxMeCandidateRequestSchema
>;
export type AppProfile = Static<typeof AppProfileSchema>;
export type AppProfileKind = Static<typeof AppProfileKindSchema>;
export type LibraryMethodSummary = Static<typeof LibraryMethodSummarySchema>;
export type LibraryMethod = Static<typeof LibraryMethodSchema>;
export type RunMethodRequest = Static<typeof RunMethodRequestSchema>;
export type RunMethodResponse = Static<typeof RunMethodResponseSchema>;
export type FetchMethodRecipeResponse = Static<
  typeof FetchMethodRecipeResponseSchema
>;
export type MethodFeedbackReaction = Static<typeof MethodFeedbackReactionSchema>;
export type SendMethodFeedbackRequest = Static<
  typeof SendMethodFeedbackRequestSchema
>;
export type SendMethodFeedbackResponse = Static<
  typeof SendMethodFeedbackResponseSchema
>;
export type PublisherIdentity = Static<typeof PublisherIdentitySchema>;
export type PublishState = Static<typeof PublishStateSchema>;
export type PublishMethodResponse = Static<typeof PublishMethodResponseSchema>;
export type PublishRoutineResponse = Static<
  typeof PublishRoutineResponseSchema
>;
export type CreateProjectMemoryRequest = Static<
  typeof CreateProjectMemoryRequestSchema
>;
export type CreateProjectRequest = Static<typeof CreateProjectRequestSchema>;
export type CreateAskVaenyxConversationRequest = Static<
  typeof CreateAskVaenyxConversationRequestSchema
>;
export type CreateAskVaenyxMessageRequest = Static<
  typeof CreateAskVaenyxMessageRequestSchema
>;
export type CreateAskVaenyxMessageResponse = Static<
  typeof CreateAskVaenyxMessageResponseSchema
>;
export type ClassifyRoutineResponse = Static<
  typeof ClassifyRoutineResponseSchema
>;
export type CreateAppProfileRequest = Static<
  typeof CreateAppProfileRequestSchema
>;
export type CreateAppProfileResponse = Static<
  typeof CreateAppProfileResponseSchema
>;
export type UpdateAppProfileRequest = Static<
  typeof UpdateAppProfileRequestSchema
>;
export type UpdateAppProfileResponse = Static<
  typeof UpdateAppProfileResponseSchema
>;
export type RenameMethodRequest = Static<typeof RenameMethodRequestSchema>;
export type DraftMethodRequest = Static<typeof DraftMethodRequestSchema>;
export type MethodDraft = Static<typeof MethodDraftSchema>;
export type DraftMethodRunRequest = Static<typeof DraftMethodRunRequestSchema>;
export type RoutineMode = Static<typeof RoutineModeSchema>;
export type RoutineDep = Static<typeof RoutineDepSchema>;
export type RoutineStep = Static<typeof RoutineStepSchema>;
export type RoutineStorage = Static<typeof RoutineStorageSchema>;
export type RoutineViewField = Static<typeof RoutineViewFieldSchema>;
export type RoutineView = Static<typeof RoutineViewSchema>;
export type LibraryRoutineSummary = Static<typeof LibraryRoutineSummarySchema>;
export type LibraryRoutine = Static<typeof LibraryRoutineSchema>;
export type RoutineJournalEntry = Static<typeof RoutineJournalEntrySchema>;
export type RoutineGalleryItem = Static<typeof RoutineGalleryItemSchema>;
export type PlanRoutineRequest = Static<typeof PlanRoutineRequestSchema>;
export type RoutinePlanStep = Static<typeof RoutinePlanStepSchema>;
export type RoutinePlan = Static<typeof RoutinePlanSchema>;
export type CatalogueIndex = Static<typeof CatalogueIndexSchema>;
export type InstallRoutineRequest = Static<typeof InstallRoutineRequestSchema>;
export type InstallMethodRequest = Static<typeof InstallMethodRequestSchema>;
export type LegalAcknowledgeRequest = Static<
  typeof LegalAcknowledgeRequestSchema
>;
export type LegalAcknowledgement = Static<typeof LegalAcknowledgementSchema>;
export type LegalAcknowledgementsResponse = Static<
  typeof LegalAcknowledgementsResponseSchema
>;
export type PublishAcceptanceRequest = Static<
  typeof PublishAcceptanceRequestSchema
>;
export type InstallRoutineResponse = Static<
  typeof InstallRoutineResponseSchema
>;
export type SetMethodTagsRequest = Static<typeof SetMethodTagsRequestSchema>;
export type RenameMethodTagRequest = Static<
  typeof RenameMethodTagRequestSchema
>;
export type RenameMethodTagResponse = Static<
  typeof RenameMethodTagResponseSchema
>;
export type ChatConnectionTestRequest = Static<
  typeof ChatConnectionTestRequestSchema
>;
export type ChatConnectionTestResult = Static<
  typeof ChatConnectionTestResultSchema
>;
export type CreateTaskRequest = Static<typeof CreateTaskRequestSchema>;
export type SetTaskScheduleRequest = Static<typeof SetTaskScheduleRequestSchema>;
export type CreateVaenyxMeCandidateRequest = Static<
  typeof CreateVaenyxMeCandidateRequestSchema
>;
export type ForgeConnectionTestResult = Static<
  typeof ForgeConnectionTestResultSchema
>;
export type LoginRequest = Static<typeof LoginRequestSchema>;
export type ChangePasswordRequest = Static<typeof ChangePasswordRequestSchema>;
export type InstanceSettings = Static<typeof InstanceSettingsSchema>;
export type Owner = Static<typeof OwnerSchema>;
export type Project = Static<typeof ProjectSchema>;
export type ProjectMemory = Static<typeof ProjectMemorySchema>;
export type RejectVaenyxMeCandidateRequest = Static<
  typeof RejectVaenyxMeCandidateRequestSchema
>;
export type SetupOwnerRequest = Static<typeof SetupOwnerRequestSchema>;
export type Skill = Static<typeof SkillSchema>;
export type Task = Static<typeof TaskSchema>;
export type TaskRun = Static<typeof TaskRunSchema>;
export type UpdateVaenyxThreadProjectRequest = Static<
  typeof UpdateVaenyxThreadProjectRequestSchema
>;
export type UpdateVaenyxThreadStatusRequest = Static<
  typeof UpdateVaenyxThreadStatusRequestSchema
>;
export type UpdateVaenyxThreadTitleRequest = Static<
  typeof UpdateVaenyxThreadTitleRequestSchema
>;
export type UpdateAgentProfileNameRequest = Static<
  typeof UpdateAgentProfileNameRequestSchema
>;
export type VaenyxThread = Static<typeof VaenyxThreadSchema>;
export type VaenyxMeItem = Static<typeof VaenyxMeItemSchema>;
export type VaenyxMeCandidate = Static<typeof VaenyxMeCandidateSchema>;
export type VaenyxMeProfile = Static<typeof VaenyxMeProfileSchema>;
export type UpdateProjectMemoryRequest = Static<
  typeof UpdateProjectMemoryRequestSchema
>;
export type UpdateInstanceSettingsRequest = Static<
  typeof UpdateInstanceSettingsRequestSchema
>;
export type UpdateProjectRequest = Static<typeof UpdateProjectRequestSchema>;
export type UpdateProjectInstructionsRequest = Static<
  typeof UpdateProjectInstructionsRequestSchema
>;
export type Workspace = Static<typeof WorkspaceSchema>;
export type ModelProviderInfo = Static<typeof ModelProviderInfoSchema>;
export type ConnectModelProviderRequest = Static<
  typeof ConnectModelProviderRequestSchema
>;
