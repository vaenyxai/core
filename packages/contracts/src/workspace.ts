import { type Static, Type } from "@sinclair/typebox";

export const OwnerSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    // Custom Mode M2: the mode this session is switched into (null = User
    // Mode). Carried on the owner because it is per-session state.
    modeId: Type.Union([Type.String(), Type.Null()]),
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
    // Six, not eight (Oskar, 2026-08-12): this is a LOCAL password on the
    // household's own machine, not an internet-facing account.
    password: Type.String({ minLength: 6, maxLength: 200 }),
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
    newPassword: Type.String({ minLength: 6, maxLength: 200 }),
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
    // What this backend can be used for: "chat" | "voice-in" | "voice-out" |
    // "vision" | "image". The engine pickers offer the connected backends that
    // can do the job, rather than a fixed menu of everything that exists.
    capabilities: Type.Array(Type.String()),
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
    model: Type.Union([
      Type.String({ minLength: 1, maxLength: 200 }),
      Type.Null(),
    ]),
  },
  { additionalProperties: false },
);

// One marked object on a photo: a dot at (x, y) — percent of the image — with
// a short name. Produced by the vision engine, drawn by the client.
export const ImageAnnotationItemSchema = Type.Object(
  {
    name: Type.String(),
    x: Type.Number(),
    y: Type.Number(),
  },
  { additionalProperties: false },
);

export const AnnotateImageRequestSchema = Type.Object(
  {
    imageId: Type.String({ minLength: 1, maxLength: 100 }),
    // Names come back in the Owner's UI language.
    language: Type.Optional(Type.String({ maxLength: 8 })),
  },
  { additionalProperties: false },
);

export const AnnotateImageResponseSchema = Type.Object(
  {
    items: Type.Array(ImageAnnotationItemSchema),
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
    // Phase B: a photo attached to the message (shown as a thumbnail; a
    // vision-capable main model sees the original directly).
    imageId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    // Generated pictures only: the exact English prompt that was sent to the
    // image provider, shown beside the picture (F5's promise — the main model
    // writes the prompt, so it can word things the Owner never typed).
    imagePrompt: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    // Marked photo: dots + names the vision engine placed on this message's
    // photo (x/y in percent of the image), drawn as an overlay by the client.
    imageAnnotations: Type.Optional(
      Type.Union([Type.Array(ImageAnnotationItemSchema), Type.Null()]),
    ),
    // A document (PDF) fed with this message: shown as a file chip with its
    // name and page count, the way a photo is shown as a photo.
    documentId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    documentName: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    documentPages: Type.Optional(Type.Union([Type.Integer(), Type.Null()])),
  },
  { additionalProperties: false },
);

// What the app learns about an uploaded document before anything is spent —
// the page count is what the M1 cost gate names.
export const DocumentUploadResponseSchema = Type.Object(
  {
    documentId: Type.String(),
    name: Type.String(),
    pages: Type.Integer(),
    // True when the page count is at or above the gate threshold, so the
    // client must show the M1 gate and send its acknowledgement.
    needsCostGate: Type.Boolean(),
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
    // minLength 0: a photo may be the whole message — the server refuses
    // empty-and-no-photo itself, with a clearer answer than a schema 400.
    content: Type.String({ minLength: 0, maxLength: 10_000 }),
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
    // Phase B: an uploaded photo's id — attached to the Owner message and
    // handed to the main model directly when it reads images.
    imageId: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    // draw verdict: the classifier already judged this message as asking for a
    // picture and produced the English prompt — the turn generates with it
    // instead of judging again (one judgment per message).
    imagePrompt: Type.Optional(Type.String({ minLength: 1, maxLength: 800 })),
    // annotate verdict: the classifier judged this message as asking for the
    // conversation's photo to be marked — the turn marks it before replying.
    annotate: Type.Optional(Type.Boolean()),
    // A document fed with this message. documentAcknowledged is the Owner's
    // answer to the M1 cost gate; the server refuses a gated document without
    // it, so a modified client cannot spend their money silently.
    documentId: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    documentName: Type.Optional(Type.String({ maxLength: 200 })),
    documentAcknowledged: Type.Optional(Type.Boolean()),
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
      // The Owner wants an installed Method to behave differently ("make the
      // quote one include GST"). The chat proposes the edit and shows what
      // changed; nothing is written until they approve it (copy pack B4).
      Type.Literal("edit-method"),
      // The Owner wants an installed self Routine to WORK differently — its
      // steps, result or look ("让晚餐规划给三个选择"). The chat jumps to that
      // Routine's own conversation and shows the same proposal card there;
      // routineId + editRequest carry the target and the ask. Community
      // Routines never match (not editable in place).
      Type.Literal("edit-routine"),
      // The Owner wants a picture GENERATED. Only offered while an image
      // engine is connected; imagePrompt carries the English prompt, so the
      // one classification answers routine/task/create/draw in a single call
      // (Oskar, 2026-07-27).
      Type.Literal("draw"),
      // The Owner wants the things in a photo already in this conversation
      // MARKED on the picture (dots + names). Understood by the model, never
      // by keywords (Oskar, 2026-07-28); offered only when a vision engine is
      // connected and the conversation has a photo.
      Type.Literal("annotate"),
      // The Owner asked to GO somewhere — open a screen, change a setting that
      // lives on one ("改一下 Agent 名字", "打开手机访问"). The chat offers a
      // button that jumps; it NEVER changes the setting itself, and goTarget
      // must be one of the fixed ids in GO_TARGETS or the verdict degrades to
      // none. A button rather than an auto-jump on purpose (Oskar,
      // 2026-08-09): a settings page has no confirm-diff layer under it, so a
      // wrong guess that navigates is a yank — a wrong button is just ignored.
      Type.Literal("go-to"),
    ]),
    routineId: Type.Union([Type.String(), Type.Null()]),
    // For edit-method: which installed Method. editRequest carries what to
    // change for BOTH edit-method and edit-routine.
    methodId: Type.Union([Type.String(), Type.Null()]),
    editRequest: Type.Union([Type.String(), Type.Null()]),
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
    // For go-to: the fixed destination id (see GO_TARGETS), else null.
    goTarget: Type.Union([Type.String(), Type.Null()]),
    // For clarify-create: the one question to ask, in the Owner's language.
    clarifyQuestion: Type.Union([Type.String(), Type.Null()]),
    // For draw: the English image prompt, ready for the picture engine.
    imagePrompt: Type.Union([Type.String(), Type.Null()]),
    // For use-task: a few-word title in the Owner's language, for the task
    // header and thread list ("墨尔本建筑新闻早报", not the whole request).
    taskTitle: Type.Union([Type.String(), Type.Null()]),
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

// THE PERMANENT CONVERSATION, AS THE SIDEBAR NEEDS IT.
//
// One per Mode. `waiting` is the number of things that need the Owner, counted
// in SQL from candidate status — never stored, never incremented, never asked
// of the model. A stored counter drifts the first time an approve fails half
// way; a derived one cannot.
export const InboxSummarySchema = Type.Object(
  {
    conversationId: Type.String(),
    threadId: Type.String(),
    title: Type.String(),
    // Zero is a real answer and means the row shows with no number on it. An
    // empty badge is a badge nobody learns to read.
    waiting: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);

export type InboxSummary = Static<typeof InboxSummarySchema>;

export const VaenyxThreadKindSchema = Type.Union([
  Type.Literal("chat"),
  Type.Literal("task"),
  // The one permanent conversation per Mode that Vaenyx speaks from. Protected
  // against delete, archive and duplication ON THE SERVER, from this kind —
  // never inferred from a title or a hardcoded id, because both of those are
  // things an Owner can change.
  Type.Literal("inbox"),
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
    // The thread's updatedAt as it was when the Owner last had this thread
    // open — on ANY device (read state is the Owner's, not the browser's).
    // Unread is updatedAt > seenAt; null = never opened since it appeared.
    seenAt: Type.Optional(Type.Union([Type.String(), Type.Null()])),
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

// A fact: one slot, one value, two times. `validUntil` null means this is what
// is true now — the Owner's screen shows current facts and, on request, what
// each of them replaced.
export const FactSchema = Type.Object(
  {
    id: Type.String(),
    slot: Type.String(),
    value: Type.String(),
    // When it was true in the world. Legitimately partial: "2025-03".
    eventTime: Type.Union([Type.String(), Type.Null()]),
    // When Vaenyx learned it.
    recordedAt: Type.String(),
    validUntil: Type.Union([Type.String(), Type.Null()]),
    supersedesId: Type.Union([Type.String(), Type.Null()]),
    // Where it came from, so every memory on the screen can be traced back to
    // the conversation that produced it.
    sourceConversationId: Type.Union([Type.String(), Type.Null()]),
    sourceMessageId: Type.Union([Type.String(), Type.Null()]),
    sourceKind: Type.Union([
      Type.Literal("external"),
      Type.Literal("manual"),
      Type.Literal("owner"),
    ]),
    sourceDetail: Type.Union([Type.String(), Type.Null()]),
    confidence: Type.Number(),
    modeId: Type.Union([Type.String(), Type.Null()]),
  },
  { additionalProperties: false },
);

export const FactsResponseSchema = Type.Object(
  { facts: Type.Array(FactSchema) },
  { additionalProperties: false },
);

export const RecordFactRequestSchema = Type.Object(
  {
    slot: Type.String({ minLength: 1, maxLength: 60 }),
    value: Type.String({ minLength: 1, maxLength: 2000 }),
    eventTime: Type.Optional(
      Type.Union([Type.String({ maxLength: 40 }), Type.Null()]),
    ),
    // The Owner adding something they read somewhere marks it as such, and it
    // carries the URL from then on.
    sourceKind: Type.Optional(
      Type.Union([Type.Literal("external"), Type.Literal("manual")]),
    ),
    sourceDetail: Type.Optional(
      Type.Union([Type.String({ maxLength: 500 }), Type.Null()]),
    ),
  },
  { additionalProperties: false },
);

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
    // Set when this candidate is a proposed FACT rather than a trait. The
    // review screen shows them differently and they are approved by a
    // different path, because the trait path collapses a whole category onto
    // one row and an address must never be overwritten without a trace.
    proposedSlot: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    proposedValue: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    proposedEventTime: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    // Every place this proposal was seen (Oskar, 2026-08-12): one line of
    // grounds per source, each with the conversation it came from, so a
    // merged card cites all of its origins and each line can open its own
    // source. Rows from before the column synthesize one entry at read time.
    sources: Type.Optional(
      Type.Array(
        Type.Object(
          {
            quote: Type.String(),
            conversationId: Type.Union([Type.String(), Type.Null()]),
          },
          { additionalProperties: false },
        ),
      ),
    ),
    // Present on a pending FACT whose slot already holds a DIFFERENT approved
    // value: the proposal is a CHANGE, and the card reads old → new with
    // "change it / keep the old one" instead of "keep / wrong".
    currentValue: Type.Optional(Type.Union([Type.String(), Type.Null()])),
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
    // Which Mode the proposal belongs to. NULL is User Mode and is a real
    // value, not "unknown" — items and counts must never cross this line.
    modeId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
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
    // True when Archive, rather than the Owner, switched an enabled schedule
    // off. Restore keeps it true and paused until the Owner explicitly resumes.
    schedulePausedByArchive: Type.Boolean(),
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

// Custom Mode (spec §6): a neutral restricted sandbox definition. PINs are
// write-only (requests carry them, responses only say whether one is set).
const DigestCadenceSchema = Type.Union([
  Type.Literal("off"),
  Type.Literal("daily"),
  Type.Literal("weekly"),
  // Monthly is for a Mode that ticks along quietly — a household member's own
  // Vaenyx that nobody needs a weekly readout on, but which should not go
  // unwatched for a year either (Oskar, 2026-08-09).
  Type.Literal("monthly"),
]);

export const ModeSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    rules: Type.String(),
    lockSettings: Type.Boolean(),
    localOnly: Type.Boolean(),
    hasEnterPin: Type.Boolean(),
    hasExitPin: Type.Boolean(),
    // Empty = this mode uses the instance-wide Agent Name.
    agentName: Type.String(),
    digestCadence: DigestCadenceSchema,
    createdAt: Type.String(),
    updatedAt: Type.String(),
  },
  { additionalProperties: false },
);

export const CreateModeRequestSchema = Type.Object(
  {
    name: Type.String({ minLength: 1, maxLength: 60 }),
    rules: Type.Optional(Type.String({ maxLength: 2000 })),
    lockSettings: Type.Optional(Type.Boolean()),
    localOnly: Type.Optional(Type.Boolean()),
    enterPin: Type.Optional(Type.String({ maxLength: 20 })),
    exitPin: Type.Optional(Type.String({ maxLength: 20 })),
    agentName: Type.Optional(Type.String({ maxLength: 100 })),
    digestCadence: Type.Optional(DigestCadenceSchema),
  },
  { additionalProperties: false },
);

// PIN fields: absent = keep as is, empty string = clear, value = set anew.
export const UpdateModeRequestSchema = Type.Object(
  {
    name: Type.Optional(Type.String({ minLength: 1, maxLength: 60 })),
    rules: Type.Optional(Type.String({ maxLength: 2000 })),
    lockSettings: Type.Optional(Type.Boolean()),
    localOnly: Type.Optional(Type.Boolean()),
    enterPin: Type.Optional(Type.String({ maxLength: 20 })),
    exitPin: Type.Optional(Type.String({ maxLength: 20 })),
    agentName: Type.Optional(Type.String({ maxLength: 100 })),
    digestCadence: Type.Optional(DigestCadenceSchema),
  },
  { additionalProperties: false },
);

// WHAT A MODE MAY DO — the middle of the three capability layers
// (global ∩ mode ∩ what the Method declared). `global` and `implemented` ride
// along with the mode's own list because the screen has to show a capability
// the INSTANCE has switched off as unavailable rather than as a switch that
// would do nothing: a mode can only ever narrow, so its rows are meaningless
// without the ceiling they are measured against.
export const ModeCapabilitiesSchema = Type.Object(
  {
    modeId: Type.String(),
    modeName: Type.String(),
    /** One entry per capability: what this mode allows, before the ceiling. */
    capabilities: Type.Record(Type.String(), Type.Boolean()),
    /** False until the Owner narrows this mode at all (the stored column is NULL). */
    narrowed: Type.Boolean(),
    global: Type.Record(Type.String(), Type.Boolean()),
    implemented: Type.Record(Type.String(), Type.Boolean()),
  },
  { additionalProperties: false },
);

// A paired device and the mode it opens into (null = User Mode).
export const DeviceModeSchema = Type.Object(
  {
    deviceId: Type.String(),
    label: Type.String(),
    modeId: Type.Union([Type.String(), Type.Null()]),
    modeName: Type.Union([Type.String(), Type.Null()]),
    // Where the device actually IS right now, reported by the device on every
    // open and mode change — as opposed to modeId, where it is set to START.
    // currentKnown false = an old build that never reported.
    currentModeId: Type.Union([Type.String(), Type.Null()]),
    currentModeName: Type.Union([Type.String(), Type.Null()]),
    currentKnown: Type.Boolean(),
    // Hardware model where the browser will say it (Android Chrome does;
    // Apple's browsers do not) — beside the name, never instead of it.
    model: Type.Union([Type.String(), Type.Null()]),
    updatedAt: Type.String(),
  },
  { additionalProperties: false },
);

export const SetDeviceModeRequestSchema = Type.Object(
  {
    modeId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    label: Type.Optional(Type.String({ maxLength: 80 })),
    // true = the automatic registration a device does on every open: it
    // must never overwrite a name the Owner typed.
    register: Type.Optional(Type.Boolean()),
    // The mode this device's session is in right now (null = User Mode).
    // Sent on every open and every mode change; omitted = no report.
    currentModeId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    // Hardware model as the browser reports it; omitted/empty = unknown.
    model: Type.Optional(Type.String({ maxLength: 120 })),
  },
  { additionalProperties: false },
);

// Applying a device default on app open: the session lands in that mode
// (the Enter PIN gate, if any, still runs in the UI afterwards).
export const ApplyDeviceModeResponseSchema = Type.Object(
  {
    modeId: Type.Union([Type.String(), Type.Null()]),
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
    // Custom Mode M2: the mode this session is currently in (null = User
    // Mode) — drives the persistent badge and in-mode UI.
    mode: Type.Union([ModeSchema, Type.Null()]),
  },
  { additionalProperties: false },
);

export const CreateTaskRequestSchema = Type.Object(
  {
    request: Type.String({ minLength: 1, maxLength: 10_000 }),
    // A short human title (a few words). Absent = derived from the request,
    // which for a long instruction makes an unreadable header — the intent
    // classifier supplies one in the Owner's language.
    title: Type.Optional(Type.String({ minLength: 1, maxLength: 80 })),
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
// composes itself), a Routine Token (one Routine the app calls as a black box,
// Vaenyx runs it), or a Relay key (2026-08-02) — the Subscription Door's own
// kind: it binds NO Method and NO Routine, because its whole job is the door.
// The two products separated at Oskar's decision: the Door panel manages relay
// keys, the Tokens screen manages Method/Routine Tokens, and neither shows the
// other's. One key pipeline underneath (hashing, cipher, audit, capability
// grants) — that split would have been two systems to keep honest.
export const AppProfileKindSchema = Type.Union([
  Type.Literal("method"),
  Type.Literal("routine"),
  Type.Literal("relay"),
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
    // THE THIRD LAYER (global ∩ what this key was granted ∩ what the Method
    // declared). What this key may DO, as opposed to which Methods it may
    // call: this key may look at pictures, that one may not draw. Empty is the
    // starting point and the honest answer for every key issued before the
    // Owner had a screen to tick one — a key never gains reach by itself.
    capabilities: Type.Array(Type.String()),
    // Type B: may this app fetch a method's recipe (instructions + schemas +
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

// What one app key may DO. A CHANGE SET, like the other two capability layers:
// the screen sends the tick that was just made, so a screen that went stale
// cannot silently undo a grant it never showed.
//
// 🔴 `approve` is not decoration. Anything the code says needs its own approval
// — `web` today, because a key that may reach the internet can turn this
// machine into somebody else's way onto it — has to be named here as well as
// ticked in `changes`. That makes granting it a separate deliberate act at the
// wire, not only in the screen that happens to be in front of the Owner.
export const UpdateAppProfileCapabilitiesRequestSchema = Type.Object(
  {
    changes: Type.Record(Type.String(), Type.Boolean()),
    approve: Type.Optional(Type.Array(Type.String())),
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
    // The Modes screen's device id: binds this subscription to a device so
    // pushes can be scoped to the mode that device is currently in. Optional —
    // an old client's subscription counts as a User Mode device.
    deviceId: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
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

// Settings → Notifications: how many devices are subscribed + the outcome of
// the last send (including the Send Test button's), for diagnosing pushes.
export const PushDiagnosticsSchema = Type.Object(
  {
    subscriptions: Type.Integer({ minimum: 0 }),
    lastResult: Type.Union([Type.String(), Type.Null()]),
    /** Newest first; the last dozen, so a Test cannot erase a morning. */
    recentResults: Type.Array(Type.String()),
  },
  { additionalProperties: false },
);

// Voice input (speech-to-text): a pointer at a connected Whisper-capable
// provider. Keys live only in the Models connections; "none" = mic off.
export const VoiceStatusSchema = Type.Object(
  {
    connected: Type.Boolean(),
    provider: Type.Union([Type.String(), Type.Null()]),
    model: Type.Union([Type.String(), Type.Null()]),
  },
  { additionalProperties: false },
);

export const ConnectVoiceRequestSchema = Type.Object(
  {
    provider: Type.Union([
      Type.Literal("none"),
      Type.Literal("groq"),
      Type.Literal("openai"),
    ]),
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

// Voice output (TTS): which engine reads replies aloud. "browser" = on-device
// TTS (basic, keyless); "gemini" = server-generated natural voice.
export const VoiceOutputStatusSchema = Type.Object(
  {
    engine: Type.Union([
      Type.Literal("none"),
      Type.Literal("browser"),
      Type.Literal("gemini"),
      Type.Literal("local"),
    ]),
    connected: Type.Boolean(),
    voice: Type.Union([Type.String(), Type.Null()]),
    // Local engine: the per-language voice picks (absent = defaults).
    zhVoice: Type.Optional(Type.String()),
    enVoice: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

// No apiKey here — the Gemini engine uses the Models → Gemini connection.
export const ConnectVoiceOutputRequestSchema = Type.Object(
  {
    engine: Type.Union([
      Type.Literal("none"),
      Type.Literal("browser"),
      Type.Literal("gemini"),
      Type.Literal("local"),
    ]),
    voice: Type.Optional(Type.String({ maxLength: 100 })),
  },
  { additionalProperties: false },
);

// Local voice (offline Piper TTS, v2b): one ~150 MB download into
// userdata/tts, then replies speak with zero cloud round-trips. `installed`
// is re-checked from disk; the rest reports the in-flight download.
export const LocalTtsStatusSchema = Type.Object(
  {
    installed: Type.Boolean(),
    status: Type.Union([
      Type.Literal("idle"),
      Type.Literal("downloading"),
      Type.Literal("ready"),
      Type.Literal("error"),
    ]),
    progress: Type.Number(),
    detail: Type.Union([Type.String(), Type.Null()]),
    // The voice catalogue with per-voice download state — drives the
    // English / Chinese voice dropdowns.
    voices: Type.Array(
      Type.Object(
        {
          id: Type.String(),
          lang: Type.Union([Type.Literal("zh"), Type.Literal("en")]),
          label: Type.String(),
          downloaded: Type.Boolean(),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export const SetLocalVoiceRequestSchema = Type.Object(
  {
    id: Type.String({ minLength: 1, maxLength: 64 }),
  },
  { additionalProperties: false },
);

export const SpeakRequestSchema = Type.Object(
  {
    text: Type.String({ minLength: 1, maxLength: 4000 }),
  },
  { additionalProperties: false },
);

export const SpeakResponseSchema = Type.Object(
  {
    audioId: Type.String(),
  },
  { additionalProperties: false },
);

// Explicitly stop an in-flight reply turn. key = the chat conversation id, or
// "task:<taskId>" for a task-conversation turn. (A dropped connection no
// longer stops a turn — a locked phone still gets its reply.)
export const StopTurnRequestSchema = Type.Object(
  {
    key: Type.String({ minLength: 1, maxLength: 120 }),
  },
  { additionalProperties: false },
);

// Vision: a photo in, useful text out (fridge shot → ingredient list). The
// engine is auto-picked from the Owner's connected vision-capable models.
// Update Now (onboarding spec section 5 v2): a zip-installed instance has no
// git, so the app fetches, verifies and stages the newest published release
// itself. `phase` drives the button's wording.
export const UpdateStatusSchema = Type.Object(
  {
    currentVersion: Type.String(),
    availableVersion: Type.Union([Type.String(), Type.Null()]),
    updateAvailable: Type.Boolean(),
    phase: Type.Union([
      Type.Literal("idle"),
      Type.Literal("checking"),
      Type.Literal("downloading"),
      Type.Literal("staged"),
      Type.Literal("error"),
    ]),
    detail: Type.Union([Type.String(), Type.Null()]),
    notes: Type.Union([Type.String(), Type.Null()]),
    // A copy managed with git updates by pulling, not by unpacking a release
    // over itself. Surfaced so the panel can say so BEFORE it tries anything.
    developerInstall: Type.Boolean(),
  },
  { additionalProperties: false },
);

// App-level notification categories (Oskar, dev.170): which kinds of
// events push. Per-device on/off is just the system permission.
export const PushPrefsSchema = Type.Object(
  {
    chat: Type.Boolean(),
    scheduled: Type.Boolean(),
    mode: Type.Boolean(),
  },
  { additionalProperties: false },
);

// Switching (M2): enter a mode / return to User Mode. `secret` is the
// mode's PIN — or the account password, which always overrides (spec: the
// main login is the master key so a forgotten PIN can never lock you out).
export const SwitchModeRequestSchema = Type.Object(
  {
    modeId: Type.String({ minLength: 1 }),
    secret: Type.Optional(Type.String({ maxLength: 200 })),
  },
  { additionalProperties: false },
);

export const ExitModeRequestSchema = Type.Object(
  {
    secret: Type.Optional(Type.String({ maxLength: 200 })),
  },
  { additionalProperties: false },
);

// Vision: a pointer at a connected vision-capable provider ("none" = camera
// off). Keys live only in the Models connections.
export const VisionStatusSchema = Type.Object(
  {
    connected: Type.Boolean(),
    provider: Type.Union([Type.String(), Type.Null()]),
  },
  { additionalProperties: false },
);

// A capability's pair: which backend + exact model does this job, and which
// stand-in the OWNER picked for when it cannot answer at all. Model empty =
// that backend's own pinned default. Backup null = no stand-in; the app
// never invents one (owner rule, 2026-08-16).
export const EngineChoiceSchema = Type.Object(
  {
    provider: Type.String({ minLength: 1, maxLength: 60 }),
    model: Type.Optional(Type.String({ maxLength: 120 })),
  },
  { additionalProperties: false },
);

export const EnginePairSchema = Type.Object(
  {
    slot: Type.String({ minLength: 1, maxLength: 40 }),
    primary: Type.Union([EngineChoiceSchema, Type.Null()]),
    backup: Type.Union([EngineChoiceSchema, Type.Null()]),
  },
  { additionalProperties: false },
);

export const SetEngineChoiceRequestSchema = Type.Object(
  {
    which: Type.Union([Type.Literal("primary"), Type.Literal("backup")]),
    choice: Type.Union([EngineChoiceSchema, Type.Null()]),
  },
  { additionalProperties: false },
);

export const ConnectVisionRequestSchema = Type.Object(
  {
    provider: Type.Union([
      Type.Literal("none"),
      Type.Literal("gemini"),
      Type.Literal("zhipu"),
      Type.Literal("openai"),
      // Pixtral, on a key the Owner may already have for chat — a second
      // free tier that throttles independently of Google's.
      Type.Literal("mistral"),
      Type.Literal("groq"),
      // The Owner's Claude subscription can power the vision engine too
      // (reads photos through the locked-down Agent SDK path).
      Type.Literal("claude-sub"),
    ]),
  },
  { additionalProperties: false },
);

export const VisionDescribeResponseSchema = Type.Object(
  {
    text: Type.String(),
  },
  { additionalProperties: false },
);

export const VisionUploadResponseSchema = Type.Object(
  {
    imageId: Type.String(),
  },
  { additionalProperties: false },
);

// Edit an existing App Profile's capability scope. The token (identity) never
// changes; only the Methods it may use and its Type B / memory permissions do.
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

// WHERE A CHANGED COPY CAME FROM. Written by the server the moment somebody
// edits a community Method, never by a form, and never removable. Community
// content is CC BY 4.0: a derivative is allowed WITH credit, so this field is
// the thing that makes an edited copy legitimate to keep and to publish.
export const DerivedFromSchema = Type.Object(
  {
    // The original author's Vaenyx identity. Empty if it was never published.
    author: Type.String(),
    id: Type.String(),
    version: Type.String(),
  },
  { additionalProperties: false },
);

export type DerivedFrom = Static<typeof DerivedFromSchema>;

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
    // Present only on a copy made by editing somebody else's Method.
    derivedFrom: Type.Optional(DerivedFromSchema),
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
    derivedFrom: Type.Optional(DerivedFromSchema),
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
    // Which Methods this Routine is built out of, de-duplicated and in the
    // order they first appear. Two screens need it and neither should have to
    // load every Routine in full just to draw a card: the Routine card says
    // how many parts it has, and a Method card says which Routines use it —
    // the question "can I delete this?" has no other answer.
    methodIds: Type.Array(Type.String()),
    view: Type.Optional(Type.Unknown()),
    origin: ItemOriginSchema,
    // What this Routine plugs into beyond text (step 4, Oskar 2026-07-28):
    // "vision" (reads photos), "voice-out" (speaks its results), "draw"
    // (makes pictures). Additive UI/behaviour hints — never hashed, so
    // declaring one never breaks a version lock; unknown values are dropped
    // at load so future capabilities stay forward-compatible.
    capabilities: Type.Optional(Type.Array(Type.String())),
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
    // The two-hash split (Edit Routine v1). executionHash is what a Routine
    // Token locks: flow, deps, mode, storage, manifest, annotateFocus and
    // each dependency Method's content hash — never the version label, so a
    // display-only save (which auto-bumps version) cannot break a token.
    // packageHash covers everything publishable including display fields.
    executionHash: Type.Optional(Type.String()),
    packageHash: Type.Optional(Type.String()),
    annotateFocus: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    // Plain words describing the PICTURE of this Routine's outcome ("the
    // finished dish, plated"). The run generates one after the steps and
    // the result card leads with it. Null/absent = no picture.
    resultImage: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    resolved: Type.Boolean(),
    missingDeps: Type.Array(Type.String()),
    capabilities: Type.Optional(Type.Array(Type.String())),
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
    // The photo this entry was fed with, shown as a photo in the chat/journal
    // ("visual first", Oskar 2026-07-28) — plus any stored marks on it.
    imageId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    imageAnnotations: Type.Optional(
      Type.Union([Type.Array(ImageAnnotationItemSchema), Type.Null()]),
    ),
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
    // Edit Routine v1: the view this result was made under. Absent = made
    // before any view change — the renderer may use the current view. A
    // present snapshot (including null = "the automatic template") is what
    // this result renders with, whatever the routine's view says today.
    viewSnapshot: Type.Optional(Type.Unknown()),
    routineHash: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    // Visual-first (owner rule, 2026-08-16): the photo this run was fed and
    // its stored marks — the result card leads with it.
    imageId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    imageAnnotations: Type.Optional(
      Type.Union([Type.Array(ImageAnnotationItemSchema), Type.Null()]),
    ),
    // The GENERATED picture of this result (visual-first part two). Absent
    // when the Routine asked for none, drawing is off, or the engine failed
    // — the card then falls back to the fed photo.
    resultImageId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
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

// ── Edit Routine v1 — upgrade an origin:self Routine in place ─────────────────
// The Owner opens a full editable draft, optionally asks Vaenyx for a
// proposal, reviews, try-runs the draft (nothing written), then saves. The
// folder id never changes; the server bumps the version; behaviour changes
// move executionHash (Routine Tokens 409 until the Owner re-grants), display
// changes only mark a published Routine stale.

// One step of the edited flow. stepId null = a NEW step (the server assigns a
// never-reused id); an existing stepId keeps its identity. methodEdit present
// = revise the step's Method: the server creates a NEW private Method
// revision from `methodId` and rewires only this Routine to it.
export const RoutineEditStepSchema = Type.Object(
  {
    stepId: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
    methodId: Type.String({ minLength: 1 }),
    from: Type.Union([
      Type.Literal("journal"),
      Type.Literal("previous"),
      Type.Literal("static"),
    ]),
    value: Type.Optional(Type.Unknown()),
    methodEdit: Type.Optional(
      Type.Object(
        {
          recipe: Type.String({ minLength: 1 }),
          inputSchema: Type.Unknown(),
          outputSchema: Type.Unknown(),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export const RoutineEditSaveRequestSchema = Type.Object(
  {
    // The contentHash the editor loaded — a mismatch means someone saved in
    // between, and the server refuses rather than overwrite the newer state.
    expectedContentHash: Type.String({ minLength: 1 }),
    name: Type.String({ minLength: 1, maxLength: 120 }),
    description: Type.String({ maxLength: 2_000 }),
    tags: Type.Array(Type.String({ maxLength: 40 }), { maxItems: 20 }),
    // null clears the custom view (back to the automatic template).
    view: Type.Union([Type.Unknown(), Type.Null()]),
    annotateFocus: Type.Union([Type.String({ maxLength: 120 }), Type.Null()]),
    resultImage: Type.Union([Type.String({ maxLength: 200 }), Type.Null()]),
    flow: Type.Array(RoutineEditStepSchema, { minItems: 1, maxItems: 12 }),
  },
  { additionalProperties: false },
);

export const ProposeRoutineEditRequestSchema = Type.Object(
  {
    request: Type.String({ minLength: 1, maxLength: 2_000 }),
  },
  { additionalProperties: false },
);

export const RoutineEditTestRequestSchema = Type.Object(
  {
    // The same draft shape a save would carry, run in memory: nothing is
    // written to the Routine, its Methods, Journal, Gallery or examples.
    draft: RoutineEditSaveRequestSchema,
    input: Type.Unknown(),
    // A photo to try with (the annotate tool runs with the DRAFT's
    // annotateFocus, so Photo Marks changes are testable before saving).
    imageId: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  },
  { additionalProperties: false },
);

// Inside a Routine's own chat, every message is normally CONTENT fed to the
// routine. This one judgment tells feeding apart from "change how the routine
// itself works" — and "unsure" is a first-class answer: the client shows a
// large chooser instead of guessing (owner rule: never decide silently).
export const RoutineChatIntentRequestSchema = Type.Object(
  { content: Type.String({ minLength: 1, maxLength: 8000 }) },
  { additionalProperties: false },
);

export const RoutineChatIntentResponseSchema = Type.Object(
  {
    decision: Type.Union([
      Type.Literal("feed"),
      Type.Literal("edit"),
      Type.Literal("unsure"),
    ]),
  },
  { additionalProperties: false },
);

export type RoutineEditStep = Static<typeof RoutineEditStepSchema>;
export type RoutineEditSaveRequest = Static<
  typeof RoutineEditSaveRequestSchema
>;
export type ProposeRoutineEditRequest = Static<
  typeof ProposeRoutineEditRequestSchema
>;
export type RoutineEditTestRequest = Static<
  typeof RoutineEditTestRequestSchema
>;
export type RoutineChatIntentRequest = Static<
  typeof RoutineChatIntentRequestSchema
>;
export type RoutineChatIntentResponse = Static<
  typeof RoutineChatIntentResponseSchema
>;

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
// Agent Skill interoperability (copy pack Part L). NEVER describe this as
// "Skill compatible" or "runs Skills": we import the INSTRUCTIONS from a Skill
// and we list what was dropped (L4, ToS 11.5).
export const SkillDroppedItemSchema = Type.Object(
  {
    kind: Type.Union([Type.Literal("script"), Type.Literal("step")]),
    detail: Type.String(),
    reason: Type.Union([
      Type.Literal("executable"),
      Type.Literal("runs-a-script"),
      Type.Literal("local-file"),
      Type.Literal("external-tool"),
    ]),
  },
  { additionalProperties: false },
);

export const SkillImportPreviewSchema = Type.Object(
  {
    name: Type.String(),
    description: Type.String(),
    recipe: Type.String(),
    // Listed one by one on the import notice: "some features may not work" is
    // not this notice.
    dropped: Type.Array(SkillDroppedItemSchema),
    license: Type.Union([Type.String(), Type.Null()]),
    source: Type.Union([Type.String(), Type.Null()]),
  },
  { additionalProperties: false },
);

export const PreviewSkillRequestSchema = Type.Object(
  {
    markdown: Type.String({ minLength: 1, maxLength: 200_000 }),
    files: Type.Optional(Type.Array(Type.String({ maxLength: 512 }))),
    source: Type.Optional(Type.String({ maxLength: 512 })),
  },
  { additionalProperties: false },
);

export const ImportSkillRequestSchema = Type.Object(
  {
    markdown: Type.String({ minLength: 1, maxLength: 200_000 }),
    files: Type.Optional(Type.Array(Type.String({ maxLength: 512 }))),
    source: Type.Optional(Type.String({ maxLength: 512 })),
    // The licence as it arrived; recorded with the Method so the publish gate
    // can fire on provenance rather than on someone's memory.
    license: Type.Optional(Type.String({ maxLength: 512 })),
  },
  { additionalProperties: false },
);

export const ImportSkillResponseSchema = Type.Object(
  { methodId: Type.String(), dropped: Type.Array(SkillDroppedItemSchema) },
  { additionalProperties: false },
);

export const ExportSkillResponseSchema = Type.Object(
  { fileName: Type.String(), markdown: Type.String() },
  { additionalProperties: false },
);

export type SkillDroppedItem = Static<typeof SkillDroppedItemSchema>;
export type SkillImportPreviewResponse = Static<
  typeof SkillImportPreviewSchema
>;
export type PreviewSkillRequest = Static<typeof PreviewSkillRequestSchema>;
export type ImportSkillRequest = Static<typeof ImportSkillRequestSchema>;
export type ImportSkillResponse = Static<typeof ImportSkillResponseSchema>;
export type ExportSkillResponse = Static<typeof ExportSkillResponseSchema>;

// An example this Method has learnt from. `source` says where the pair came
// from and `contributor` who from — the hook a credit system would need later.
export const MethodExampleEntrySchema = Type.Object(
  {
    file: Type.String(),
    input: Type.Unknown(),
    output: Type.Unknown(),
    note: Type.Union([Type.String(), Type.Null()]),
    source: Type.String(),
    contributor: Type.Union([Type.String(), Type.Null()]),
    time: Type.Union([Type.String(), Type.Null()]),
  },
  { additionalProperties: false },
);

export const MethodExamplesResponseSchema = Type.Object(
  {
    examples: Type.Array(MethodExampleEntrySchema),
    // Corrections become examples on their own while this is true.
    autoExamples: Type.Boolean(),
  },
  { additionalProperties: false },
);

export type MethodExampleEntry = Static<typeof MethodExampleEntrySchema>;
export type MethodExamplesResponse = Static<
  typeof MethodExamplesResponseSchema
>;

// A stored correction the Owner can turn into an example (the local flywheel).
// The payloads are shown in full before anything is kept: a correction carries
// whatever was typed that day, so the Owner decides, not a detector.
export const StoredCorrectionSchema = Type.Object(
  {
    id: Type.String(),
    appProfileName: Type.String(),
    input: Type.Unknown(),
    aiOutput: Type.Unknown(),
    correctedOutput: Type.Unknown(),
    note: Type.Union([Type.String(), Type.Null()]),
    createdAt: Type.String(),
  },
  { additionalProperties: false },
);

export const CorrectionsResponseSchema = Type.Object(
  { corrections: Type.Array(StoredCorrectionSchema) },
  { additionalProperties: false },
);

export const AdoptCorrectionRequestSchema = Type.Object(
  {
    correctionId: Type.String({ minLength: 1 }),
    // Who the example is credited to. Empty = the Owner's own instance.
    contributor: Type.Optional(Type.String({ maxLength: 120 })),
  },
  { additionalProperties: false },
);

export const AdoptCorrectionResponseSchema = Type.Object(
  { file: Type.String(), exampleCount: Type.Integer() },
  { additionalProperties: false },
);

export type StoredCorrection = Static<typeof StoredCorrectionSchema>;
export type CorrectionsResponse = Static<typeof CorrectionsResponseSchema>;
export type AdoptCorrectionRequest = Static<
  typeof AdoptCorrectionRequestSchema
>;
export type AdoptCorrectionResponse = Static<
  typeof AdoptCorrectionResponseSchema
>;

// The operator's emergency stop on community publishing. `available` is false
// for everyone who is not the operator, so the switch is simply absent rather
// than present-and-refusing.
export const PublishPauseStateSchema = Type.Object(
  {
    available: Type.Boolean(),
    paused: Type.Boolean(),
    // Pinned by service configuration; the in-app switch cannot override it.
    envOverride: Type.Boolean(),
  },
  { additionalProperties: false },
);

export type PublishPauseState = Static<typeof PublishPauseStateSchema>;

// Editing a Method's recipe from the conversation (copy pack B4). Two steps on
// purpose: the first only proposes and returns the difference, the second
// writes what the Owner approved. Nothing here can publish - a publication is a
// separate, deliberate acceptance of the Contributor Agreement.
export const DraftRecipeEditRequestSchema = Type.Object(
  {
    request: Type.String({ minLength: 1, maxLength: 2000 }),
  },
  { additionalProperties: false },
);

export const RecipeDiffLineSchema = Type.Object(
  {
    kind: Type.Union([
      Type.Literal("same"),
      Type.Literal("added"),
      Type.Literal("removed"),
    ]),
    text: Type.String(),
  },
  { additionalProperties: false },
);

export const RecipeEditDraftSchema = Type.Object(
  {
    methodId: Type.String(),
    methodName: Type.String(),
    // Whose Method this is. A community one is not edited in place - approving
    // the change makes this household's own copy - so the approval screen has
    // to be able to say so, and to name the author being credited.
    methodOrigin: ItemOriginSchema,
    methodOwner: Type.String(),
    current: Type.String(),
    proposed: Type.String(),
    diff: Type.Array(RecipeDiffLineSchema),
    // No line differs: the model returned the recipe unchanged.
    unchanged: Type.Boolean(),
  },
  { additionalProperties: false },
);

// A9 — how many corrections are waiting for the Owner, per Method. The badge
// on the Methods tab. Until this existed, finding one meant opening every
// Method in turn, so the flywheel's local half ran on somebody remembering.
export const PendingCorrectionsResponseSchema = Type.Object(
  {
    pending: Type.Array(
      Type.Object(
        { methodId: Type.String(), count: Type.Integer() },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export type PendingCorrectionsResponse = Static<
  typeof PendingCorrectionsResponseSchema
>;

// DID THE NEW VERSION BREAK WHAT THIS HOUSEHOLD USES IT FOR? (C7)
//
// An update keeps the Owner's examples. Keeping them is not the same as still
// getting them right, and the author cannot check that for anybody — they
// tested their recipe against their own cases, not against the correction
// somebody here made about a local convention. So the examples are re-run and
// compared, and the answer turns on a light. It never moves anything: undo is
// already one button away, and which way to go is the Owner's call.
export const RegressionCaseSchema = Type.Object(
  {
    file: Type.String(),
    matched: Type.Boolean(),
    // Both answers, so the Owner sees WHICH number moved rather than being
    // told that something vague went wrong.
    expected: Type.Unknown(),
    got: Type.Unknown(),
  },
  { additionalProperties: false },
);

export const RegressionResultSchema = Type.Object(
  {
    // 'error' is not a verdict about the recipe - the model could not answer.
    // Shown differently on purpose: reporting it as a failure would talk
    // somebody into rolling back a version that was fine.
    state: Type.Union([
      Type.Literal("pass"),
      Type.Literal("fail"),
      Type.Literal("error"),
    ]),
    // How many actually ran. Each one is a real model call, so there is a cap -
    // and a cap must never be able to read as a clean bill of health.
    checkedCount: Type.Integer(),
    failedCount: Type.Integer(),
    version: Type.String(),
    checkedAt: Type.String(),
    cases: Type.Array(RegressionCaseSchema),
  },
  { additionalProperties: false },
);

export const RegressionCheckSchema = Type.Object(
  {
    id: Type.String(),
    kind: Type.Union([Type.Literal("method"), Type.Literal("routine")]),
    state: Type.Union([
      Type.Literal("pass"),
      Type.Literal("fail"),
      Type.Literal("error"),
    ]),
    version: Type.String(),
    checkedAt: Type.String(),
    checkedCount: Type.Integer(),
    failedCount: Type.Integer(),
    // The checked version is no longer the installed one, so this verdict
    // describes something that is not running. A stale red light is a lie that
    // costs more than silence, so the UI shows nothing rather than this.
    stale: Type.Boolean(),
  },
  { additionalProperties: false },
);

export const RegressionListResponseSchema = Type.Object(
  { checks: Type.Array(RegressionCheckSchema) },
  { additionalProperties: false },
);

export type RegressionCase = Static<typeof RegressionCaseSchema>;
export type RegressionResult = Static<typeof RegressionResultSchema>;
export type RegressionCheck = Static<typeof RegressionCheckSchema>;
export type RegressionListResponse = Static<
  typeof RegressionListResponseSchema
>;

export const UpdateRecipeRequestSchema = Type.Object(
  {
    recipe: Type.String({ minLength: 1 }),
    // Editing a COMMUNITY Method never changes it - it makes this household's
    // own copy, and this is what that copy is called. Absent (or editing a
    // Method that is already yours) writes the edit in place.
    forkName: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
  },
  { additionalProperties: false },
);

export const UpdateRecipeResponseSchema = Type.Object(
  {
    methodId: Type.String(),
    contentHash: Type.String(),
    // App Profiles whose grant no longer matches, and must grant again.
    staleGrants: Type.Integer(),
    // Set when the edit went into a new copy instead: the id of the community
    // Method it came from, which is still installed and still the author's.
    forkedFrom: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export type DraftRecipeEditRequest = Static<
  typeof DraftRecipeEditRequestSchema
>;
export type RecipeEditDraft = Static<typeof RecipeEditDraftSchema>;
export type UpdateRecipeRequest = Static<typeof UpdateRecipeRequestSchema>;
export type UpdateRecipeResponse = Static<typeof UpdateRecipeResponseSchema>;

export const LegalAcknowledgeRequestSchema = Type.Object(
  {
    keyName: Type.String({ minLength: 1 }),
    copyVersion: Type.String({ minLength: 1 }),
    language: Type.String({ minLength: 1 }),
    choice: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

// The A3 sharing card records interest in a capability that does not exist. It
// is a local preference, deliberately kept out of the acknowledgement record so
// it can never be read as consent or as evidence of an authorisation.
export const SetSharingPreferenceRequestSchema = Type.Object(
  {
    choice: Type.Union([
      Type.Literal("interested"),
      Type.Literal("not-interested"),
    ]),
  },
  { additionalProperties: false },
);

export type SetSharingPreferenceRequest = Static<
  typeof SetSharingPreferenceRequestSchema
>;

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
    // K9: does this publisher want to receive corrections from households that
    // install the item? Absent means no — publishing is not, by itself, an
    // invitation to hear from strangers.
    receiveExamples: Type.Optional(Type.Boolean()),
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
    // What the Method declared and the run was NOT allowed to reach for, and
    // which of the three layers said no. A run that quietly came back without
    // having looked at the picture is the worst outcome there is: the caller
    // cannot tell a refusal from a bad answer, and neither can the person
    // reading it. Absent means nothing was refused.
    capabilityRefusals: Type.Optional(
      Type.Array(
        Type.Object(
          {
            capability: Type.String(),
            reason: Type.String(),
            message: Type.String(),
          },
          { additionalProperties: false },
        ),
      ),
    ),
  },
  { additionalProperties: false },
);

// Type B (GET /v1/library/methods/:id/recipe): the recipe + schemas + a few
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
    // 🔴 WHICH STEP THIS IS ABOUT. A one-step Routine is unambiguous; a
    // multi-step one is not, and a correction that does not say which step it
    // came from gets filed against the wrong part — silently, and the wrong
    // part then learns the wrong lesson. The recipe chain handed to an app
    // carries these ids for exactly this return trip.
    routineId: Type.Optional(Type.String({ maxLength: 200 })),
    stepId: Type.Optional(Type.String({ maxLength: 200 })),
  },
  { additionalProperties: false },
);

export const SendMethodFeedbackResponseSchema = Type.Object(
  {
    id: Type.String(),
    // 🔴 The app clears its queue only when it has THIS. An app that empties
    // its outbox on "the request did not throw" loses corrections whenever a
    // connection drops mid-reply, and loses them silently.
    accepted: Type.Optional(Type.Boolean()),
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
    // Published, but changed locally since (copy pack G5). Shown as a fact
    // beside the publish control; nothing republishes on its own.
    staleMethodIds: Type.Array(Type.String()),
    staleRoutineIds: Type.Array(Type.String()),
    // Methods carrying import provenance (copy pack L2). The publish gate fires
    // on this, not on the publisher remembering where a Method came from.
    importedMethodIds: Type.Array(Type.String()),
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
    // A photo fed to the Routine ("visual first", Oskar 2026-07-28): it shows
    // as a photo in the journal, and the server extracts its contents into the
    // run's input behind the scenes — no text dump in the composer.
    imageId: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    // The Owner's UI language — extraction lines and photo marks come back in it.
    language: Type.Optional(Type.String({ maxLength: 8 })),
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
    // What the parser actually read (typed words + a photo's extracted lines).
    // The confirm round sends THIS back so the learn example pairs the parse
    // with the text it really saw.
    content: Type.Optional(Type.String()),
    // The fed photo's marks, so the confirm card can show — and let the Owner
    // edit — the annotated picture itself (visual first).
    annotations: Type.Optional(Type.Array(ImageAnnotationItemSchema)),
    // A photo read that FAILED says so here (provider's own words) instead of
    // silently looking like "it recognises nothing" (owner, 2026-08-16).
    photoError: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

// Save the Owner's corrected marks for a photo (edited on the confirm card).
export const SaveAnnotationsRequestSchema = Type.Object(
  {
    imageId: Type.String({ minLength: 1, maxLength: 100 }),
    items: Type.Array(ImageAnnotationItemSchema, { maxItems: 20 }),
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
export type ConnectVoiceOutputRequest = Static<
  typeof ConnectVoiceOutputRequestSchema
>;
export type SpeakRequest = Static<typeof SpeakRequestSchema>;
export type LocalTtsStatus = Static<typeof LocalTtsStatusSchema>;
export type SetLocalVoiceRequest = Static<typeof SetLocalVoiceRequestSchema>;
export type Mode = Static<typeof ModeSchema>;
export type CreateModeRequest = Static<typeof CreateModeRequestSchema>;
export type UpdateModeRequest = Static<typeof UpdateModeRequestSchema>;
export type ModeCapabilities = Static<typeof ModeCapabilitiesSchema>;
export type DeviceMode = Static<typeof DeviceModeSchema>;
export type SetDeviceModeRequest = Static<typeof SetDeviceModeRequestSchema>;
export type SwitchModeRequest = Static<typeof SwitchModeRequestSchema>;
export type ExitModeRequest = Static<typeof ExitModeRequestSchema>;
export type PushPrefs = Static<typeof PushPrefsSchema>;
export type UpdateStatus = Static<typeof UpdateStatusSchema>;
export type ConnectVisionRequest = Static<typeof ConnectVisionRequestSchema>;
export type EngineChoice = Static<typeof EngineChoiceSchema>;
export type EnginePair = Static<typeof EnginePairSchema>;
export type SetEngineChoiceRequest = Static<
  typeof SetEngineChoiceRequestSchema
>;
export type StopTurnRequest = Static<typeof StopTurnRequestSchema>;
export type AskVaenyxMessage = Static<typeof AskVaenyxMessageSchema>;
export type ImageAnnotationItem = Static<typeof ImageAnnotationItemSchema>;
export type AnnotateImageRequest = Static<typeof AnnotateImageRequestSchema>;
export type AnnotateImageResponse = Static<typeof AnnotateImageResponseSchema>;
export type SaveAnnotationsRequest = Static<
  typeof SaveAnnotationsRequestSchema
>;
export type DocumentUploadResponse = Static<
  typeof DocumentUploadResponseSchema
>;
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
export type MethodFeedbackReaction = Static<
  typeof MethodFeedbackReactionSchema
>;
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
export type UpdateAppProfileCapabilitiesRequest = Static<
  typeof UpdateAppProfileCapabilitiesRequestSchema
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
export type SetTaskScheduleRequest = Static<
  typeof SetTaskScheduleRequestSchema
>;
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
export type Fact = Static<typeof FactSchema>;
export type FactsResponse = Static<typeof FactsResponseSchema>;
export type RecordFactRequest = Static<typeof RecordFactRequestSchema>;
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

// THE SUBSCRIPTION DOOR (Oskar, 2026-07-29). Two logins lent to his own apps:
// they name the one they want, and Vaenyx either does the work on it or says
// plainly why it could not. Text, web, vision, reading and ocr are on offer;
// the voice-and-drawing three are reported unsupported rather than left for
// an app to discover the hard way.
export const RelayEngineSchema = Type.Union([
  Type.Literal("openai-cli"),
  Type.Literal("claude-cli"),
]);

export const RelayCapabilitySchema = Type.Union([
  Type.Literal("text"),
  // Text that may search the live internet. Off for every key until the Owner
  // grants it per app, with its own approval step — see NEEDS_OWN_TOKEN_APPROVAL.
  Type.Literal("web"),
  Type.Literal("hearing"),
  Type.Literal("speaking"),
  Type.Literal("vision"),
  Type.Literal("reading"),
  Type.Literal("ocr"),
  Type.Literal("drawing"),
]);

export const RelayRunRequestSchema = Type.Object(
  {
    // What kind of job this is. Shows up in the door's log so the Owner can see
    // what his apps have been asking for, without any of the content.
    task: Type.String({ minLength: 1, maxLength: 60 }),
    prompt: Type.String({ minLength: 1, maxLength: 200_000 }),
    engine: RelayEngineSchema,
    capability: RelayCapabilitySchema,
    // The signed-in user of the calling app. Checked against the Owner list —
    // the personal subscriptions are his alone to use.
    // Ignored since phase two (the key is the identity); accepted so a v1
    // client keeps working unchanged.
    caller: Type.Optional(Type.String({ maxLength: 200 })),
    // Short-lived download links, never the file itself: the file is usually
    // already in the cloud, and a phone uploading it again is the slow way
    // round. Vaenyx fetches, uses, and deletes.
    files: Type.Optional(
      Type.Array(
        Type.Object(
          {
            name: Type.String({ minLength: 1, maxLength: 200 }),
            url: Type.String({ minLength: 8, maxLength: 4000 }),
          },
          { additionalProperties: false },
        ),
        { maxItems: 20 },
      ),
    ),
    // Per-call knobs (2026-08-30): reasoning-effort tier and model override,
    // valid for this one call. Loose strings on the wire on purpose — the
    // server checks them against each engine's whitelist and refuses an
    // illegal value echoing the caller's own word, which a schema enum's
    // generic 400 could not.
    effort: Type.Optional(Type.String({ minLength: 1, maxLength: 20 })),
    model: Type.Optional(Type.String({ minLength: 1, maxLength: 60 })),
  },
  { additionalProperties: false },
);

export const RelayRunResponseSchema = Type.Object(
  {
    text: Type.String(),
    engine: RelayEngineSchema,
    model: Type.String(),
    ms: Type.Integer(),
  },
  { additionalProperties: false },
);

export const RelayHealthSchema = Type.Object(
  {
    on: Type.Boolean(),
    engines: Type.Array(
      Type.Object(
        {
          id: RelayEngineSchema,
          signedIn: Type.Boolean(),
          capabilities: Type.Array(RelayCapabilitySchema),
          // What a call may ask for on this engine (dropdown material).
          // Empty = not selectable here.
          efforts: Type.Array(Type.String()),
          models: Type.Array(Type.String()),
        },
        { additionalProperties: false },
      ),
    ),
    limits: Type.Object(
      {
        maxFiles: Type.Integer(),
        maxFileBytes: Type.Integer(),
        maxTotalBytes: Type.Integer(),
        timeoutSeconds: Type.Integer(),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export const RelaySettingsSchema = Type.Object(
  {
    enabled: Type.Boolean(),
    fileHosts: Type.Array(Type.String({ maxLength: 200 }), { maxItems: 20 }),
    maxFiles: Type.Integer({ minimum: 0, maximum: 20 }),
    maxFileBytes: Type.Integer({ minimum: 0 }),
    maxTotalBytes: Type.Integer({ minimum: 0 }),
    timeoutSeconds: Type.Integer({ minimum: 10, maximum: 600 }),
  },
  { additionalProperties: false },
);

export const UpdateRelaySettingsRequestSchema =
  Type.Partial(RelaySettingsSchema);

export const RelayCallSchema = Type.Object(
  {
    task: Type.String(),
    engine: Type.String(),
    capability: Type.String(),
    ms: Type.Integer(),
    ok: Type.Boolean(),
    failure: Type.Union([Type.String(), Type.Null()]),
    createdAt: Type.String(),
  },
  { additionalProperties: false },
);

export const RelayPanelSchema = Type.Object(
  {
    settings: RelaySettingsSchema,
    calls: Type.Array(RelayCallSchema),
  },
  { additionalProperties: false },
);

// ── Relay Profiles v1: a per-app subscription identity, spoken to by the app
// itself with its own key. The key IS the identity: no request carries an
// appId, so no client can name a profile that is not its own. Status never
// carries a credential of any kind — connected or not, timestamps, the key's
// version and prefix, nothing a thief could sign in with.
export const RelayProfileStatusSchema = Type.Object(
  {
    // Always "dedicated" since 2026-08-02: a profile rides its own login,
    // never the door's. The field survives so a v1 client's parser does not
    // break; it goes away in v2.
    mode: Type.Literal("dedicated"),
    engines: Type.Array(
      Type.Object(
        {
          id: RelayEngineSchema,
          connected: Type.Boolean(),
          connectedAt: Type.Union([Type.String(), Type.Null()]),
          capabilities: Type.Array(RelayCapabilitySchema),
          efforts: Type.Array(Type.String()),
          models: Type.Array(Type.String()),
        },
        { additionalProperties: false },
      ),
    ),
    key: Type.Object(
      {
        version: Type.Integer(),
        createdAt: Type.String(),
        rotatedAt: Type.Union([Type.String(), Type.Null()]),
        hint: Type.String(),
      },
      { additionalProperties: false },
    ),
    capabilities: Type.Array(Type.String()),
  },
  { additionalProperties: false },
);

export const RelayProfileLoginStartRequestSchema = Type.Object(
  { engine: RelayEngineSchema },
  { additionalProperties: false },
);

export const RelayProfileLoginStartResponseSchema = Type.Object(
  {
    // claude-cli always returns a URL; openai-cli may finish without one (its
    // browser flow hosts its own callback) and may return a detail line when
    // the CLI could not start.
    url: Type.Union([Type.String(), Type.Null()]),
    detail: Type.Union([Type.String(), Type.Null()]),
  },
  { additionalProperties: false },
);

export const RelayProfileLoginCompleteRequestSchema = Type.Object(
  {
    engine: RelayEngineSchema,
    // claude-cli: the code claude.com showed after sign-in. openai-cli has no
    // code — complete just confirms whether the browser flow landed.
    code: Type.Optional(Type.String({ minLength: 1, maxLength: 400 })),
  },
  { additionalProperties: false },
);

export const RelayProfileLoginCompleteResponseSchema = Type.Object(
  { connected: Type.Boolean() },
  { additionalProperties: false },
);

export const RelayProfileDisconnectRequestSchema = Type.Object(
  { engine: RelayEngineSchema },
  { additionalProperties: false },
);

// Rotation, from the app itself: the new key is returned this once and never
// again, the old key stopped working before this response was written.
export const RelayRotateKeyResponseSchema = Type.Object(
  {
    token: Type.String(),
    keyVersion: Type.Integer(),
  },
  { additionalProperties: false },
);

export const RelayUsageResponseSchema = Type.Object(
  {
    month: Type.String(),
    rows: Type.Array(
      Type.Object(
        {
          appId: Type.String(),
          appName: Type.String(),
          engine: Type.String(),
          calls: Type.Integer(),
          // NULL when the engine never reported token counts — shown as
          // absent, never estimated.
          inputTokens: Type.Union([Type.Integer(), Type.Null()]),
          outputTokens: Type.Union([Type.Integer(), Type.Null()]),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

// A Test result keeps the three outcomes apart on purpose: it worked, it failed
// (with the other side's own words), or this path is not built yet. A green
// tick that means "probably" and a red cross for something we never wrote are
// both lies.
export const RelayTestResultSchema = Type.Object(
  {
    status: Type.Union([
      Type.Literal("ok"),
      Type.Literal("failed"),
      Type.Literal("not-implemented"),
    ]),
    detail: Type.String(),
  },
  { additionalProperties: false },
);

// The same three outcomes for a capability row's own Test, plus the one fact a
// relay test never needs: WHICH engine was exercised. "Vision failed" sends the
// Owner looking through four connected models; "Gemini (gemini-flash-latest)
// refused the test picture" is something they can act on. Empty when nothing was
// reached at all — nothing connected, no folder named — and the detail then
// stands on its own.
export const CapabilityTestResultSchema = Type.Object(
  {
    status: Type.Union([
      Type.Literal("ok"),
      Type.Literal("failed"),
      Type.Literal("not-implemented"),
    ]),
    engine: Type.String(),
    detail: Type.String(),
  },
  { additionalProperties: false },
);

export type RelayEngine = Static<typeof RelayEngineSchema>;
export type RelayCapability = Static<typeof RelayCapabilitySchema>;
export type RelayRunRequest = Static<typeof RelayRunRequestSchema>;
export type RelayRunResponse = Static<typeof RelayRunResponseSchema>;
export type RelayHealth = Static<typeof RelayHealthSchema>;
export type RelaySettings = Static<typeof RelaySettingsSchema>;
export type UpdateRelaySettingsRequest = Static<
  typeof UpdateRelaySettingsRequestSchema
>;
export type RelayCall = Static<typeof RelayCallSchema>;
export type RelayPanel = Static<typeof RelayPanelSchema>;
export type RelayTestResult = Static<typeof RelayTestResultSchema>;
export type CapabilityTestResult = Static<typeof CapabilityTestResultSchema>;
export type RelayProfileStatus = Static<typeof RelayProfileStatusSchema>;
export type RelayProfileLoginStartRequest = Static<
  typeof RelayProfileLoginStartRequestSchema
>;
export type RelayProfileLoginStartResponse = Static<
  typeof RelayProfileLoginStartResponseSchema
>;
export type RelayProfileLoginCompleteRequest = Static<
  typeof RelayProfileLoginCompleteRequestSchema
>;
export type RelayProfileLoginCompleteResponse = Static<
  typeof RelayProfileLoginCompleteResponseSchema
>;
export type RelayProfileDisconnectRequest = Static<
  typeof RelayProfileDisconnectRequestSchema
>;
export type RelayRotateKeyResponse = Static<
  typeof RelayRotateKeyResponseSchema
>;
export type RelayUsageResponse = Static<typeof RelayUsageResponseSchema>;
