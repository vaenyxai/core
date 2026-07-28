import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { Type } from "@sinclair/typebox";
import {
  AppAskRequestSchema,
  ApproveVaenyxMeCandidateRequestSchema,
  AgentProfileSchema,
  AppProfileSchema,
  AuditEventSchema,
  BootstrapStatusSchema,
  ChatConnectionTestRequestSchema,
  ChatConnectionTestResultSchema,
  AskVaenyxConversationSchema,
  SetReasoningEffortRequestSchema,
  type SetReasoningEffortRequest,
  SetChatProviderRequestSchema,
  type SetChatProviderRequest,
  SetChatModelRequestSchema,
  type SetChatModelRequest,
  AskVaenyxMessageSchema,
  CreateAppProfileRequestSchema,
  CreateAppProfileResponseSchema,
  RevealAppTokenResponseSchema,
  PushPublicKeyResponseSchema,
  SubscribePushRequestSchema,
  UnsubscribePushRequestSchema,
  PushAckResponseSchema,
  PushDiagnosticsSchema,
  VoiceStatusSchema,
  ConnectVoiceRequestSchema,
  TranscribeVoiceResponseSchema,
  VoiceOutputStatusSchema,
  ConnectVoiceOutputRequestSchema,
  SpeakRequestSchema,
  SpeakResponseSchema,
  LocalTtsStatusSchema,
  SetLocalVoiceRequestSchema,
  type SetLocalVoiceRequest,
  ModeSchema,
  CreateModeRequestSchema,
  type CreateModeRequest,
  UpdateModeRequestSchema,
  type UpdateModeRequest,
  SwitchModeRequestSchema,
  type SwitchModeRequest,
  ExitModeRequestSchema,
  type ExitModeRequest,
  PushPrefsSchema,
  UpdateStatusSchema,
  DeviceModeSchema,
  SetDeviceModeRequestSchema,
  type SetDeviceModeRequest,
  ApplyDeviceModeResponseSchema,
  StopTurnRequestSchema,
  VisionStatusSchema,
  ConnectVisionRequestSchema,
  type ConnectVisionRequest,
  VisionDescribeResponseSchema,
  VisionUploadResponseSchema,
  type SubscribePushRequest,
  type UnsubscribePushRequest,
  type ConnectVoiceRequest,
  type ConnectVoiceOutputRequest,
  type SpeakRequest,
  type StopTurnRequest,
  CreateAskVaenyxConversationRequestSchema,
  CreateAskVaenyxMessageRequestSchema,
  CreateAskVaenyxMessageResponseSchema,
  CreateProjectMemoryRequestSchema,
  CreateProjectRequestSchema,
  CreateTaskRequestSchema,
  CreateVaenyxMeCandidateRequestSchema,
  ChangePasswordRequestSchema,
  ForgeConnectionTestResultSchema,
  ConnectModelProviderRequestSchema,
  InstanceSettingsSchema,
  ModelProvidersResponseSchema,
  LibraryMethodSummarySchema,
  LibraryRoutineSummarySchema,
  RoutineRunChatRequestSchema,
  type RoutineRunChatRequest,
  PlanRoutineRequestSchema,
  RoutinePlanSchema,
  CatalogueIndexSchema,
  InstallRoutineRequestSchema,
  InstallMethodRequestSchema,
  LegalAcknowledgeRequestSchema,
  LegalAcknowledgementsResponseSchema,
  SetSharingPreferenceRequestSchema,
  PublishPauseStateSchema,
  CorrectionsResponseSchema,
  MethodExamplesResponseSchema,
  SkillImportPreviewSchema,
  PreviewSkillRequestSchema,
  ImportSkillRequestSchema,
  ImportSkillResponseSchema,
  ExportSkillResponseSchema,
  AdoptCorrectionRequestSchema,
  AdoptCorrectionResponseSchema,
  DraftRecipeEditRequestSchema,
  RecipeEditDraftSchema,
  UpdateRecipeRequestSchema,
  UpdateRecipeResponseSchema,
  PublishAcceptanceRequestSchema,
  ClassifyRoutineResponseSchema,
  LoginRequestSchema,
  MessageResponseSchema,
  BackupListResponseSchema,
  BackupConfigViewSchema,
  BackupConfigUpdateSchema,
  type BackupConfigUpdate,
  ProjectMemorySchema,
  ProjectSchema,
  RejectVaenyxMeCandidateRequestSchema,
  RenameMethodRequestSchema,
  DraftMethodRequestSchema,
  MethodDraftSchema,
  DraftMethodRunRequestSchema,
  SetMethodTagsRequestSchema,
  RenameMethodTagRequestSchema,
  RenameMethodTagResponseSchema,
  RunMethodRequestSchema,
  SendMethodFeedbackRequestSchema,
  SendMethodFeedbackResponseSchema,
  PublishStateSchema,
  PublishMethodResponseSchema,
  PublishRoutineResponseSchema,
  UpdateAppProfileRequestSchema,
  UpdateAppProfileResponseSchema,
  SetTaskScheduleRequestSchema,
  SetupOwnerRequestSchema,
  SystemStatusSchema,
  TaskSchema,
  TaskRunSchema,
  UpdateProjectMemoryRequestSchema,
  UpdateAgentProfileNameRequestSchema,
  UpdateInstanceSettingsRequestSchema,
  UpdateProjectInstructionsRequestSchema,
  UpdateProjectRequestSchema,
  UpdateVaenyxThreadProjectRequestSchema,
  UpdateVaenyxThreadStatusRequestSchema,
  UpdateVaenyxThreadTitleRequestSchema,
  VaenyxMeCandidateSchema,
  VaenyxThreadSchema,
  WorkspaceSchema,
  type AppAskRequest,
  type ApproveVaenyxMeCandidateRequest,
  type ChatConnectionTestRequest,
  type CreateAskVaenyxConversationRequest,
  type CreateAskVaenyxMessageRequest,
  type CreateAppProfileRequest,
  type CreateProjectMemoryRequest,
  type CreateProjectRequest,
  type CreateTaskRequest,
  type CreateVaenyxMeCandidateRequest,
  type ChangePasswordRequest,
  type FetchMethodRecipeResponse,
  type LoginRequest,
  type RejectVaenyxMeCandidateRequest,
  type RenameMethodRequest,
  type DraftMethodRequest,
  type MethodDraft,
  type DraftMethodRunRequest,
  type PlanRoutineRequest,
  type RoutinePlan,
  type InstallRoutineRequest,
  type InstallMethodRequest,
  type LegalAcknowledgeRequest,
  type SetSharingPreferenceRequest,
  type DraftRecipeEditRequest,
  type AdoptCorrectionRequest,
  type PreviewSkillRequest,
  type ImportSkillRequest,
  type UpdateRecipeRequest,
  type PublishAcceptanceRequest,
  type SetMethodTagsRequest,
  type RenameMethodTagRequest,
  type RunMethodRequest,
  type RunMethodResponse,
  type SendMethodFeedbackRequest,
  type SendMethodFeedbackResponse,
  type PublishState,
  type PublishMethodResponse,
  type PublishRoutineResponse,
  type UpdateAppProfileRequest,
  type SetTaskScheduleRequest,
  type SetupOwnerRequest,
  type UpdateProjectMemoryRequest,
  type UpdateAgentProfileNameRequest,
  type ConnectModelProviderRequest,
  type UpdateInstanceSettingsRequest,
  type UpdateProjectInstructionsRequest,
  type UpdateProjectRequest,
  type UpdateVaenyxThreadProjectRequest,
  type UpdateVaenyxThreadStatusRequest,
  type UpdateVaenyxThreadTitleRequest,
} from "@vaenyx/contracts";
import type { FastifyInstance, FastifyReply } from "fastify";

import type { AppConfig } from "../../config.js";
import type { DatabaseHandle } from "../../db/database.js";
import { listAgentProfiles, updateAgentProfileName } from "../core/agents.js";
import { getSystemStatus } from "../core/system-status.js";
import {
  readBackupAutoState,
  readBackupConfig as readBackupConfigForOwner,
  writeBackupConfig,
} from "../core/backup-config.js";
import {
  listBackups,
  createBackupNow,
  requestRestore,
  backupExists,
} from "../core/backups.js";
import {
  authenticateAppProfile,
  countStaleMethodGrants,
  createAppProfile,
  deleteAppProfile,
  disableAppProfile,
  enableAppProfile,
  getAppProfileMethodLock,
  getAppProfileRoutineLock,
  listAppProfiles,
  regenerateAppProfileToken,
  revealAppProfileToken,
  updateAppProfile,
} from "../core/app-profiles.js";
import {
  getPushDiagnostics,
  getPushPublicKey,
  notePresence,
  readPushPrefs,
  removePushSubscription,
  savePushSubscription,
  sendPushToAllDevices,
  writePushPrefs,
  type PushPrefs,
} from "../core/push.js";
import {
  connectVoiceOutput,
  getVoiceOutput,
  getVoiceStatus,
  readVoiceAudio,
  resetVoiceOutputIfLocal,
  saveVoiceAudio,
  setLocalVoice,
  setVoiceInput,
  synthesizeSpeech,
  transcribeVoice,
} from "../core/voice.js";
import {
  getLocalTtsStatus,
  removeLocalTts,
  startLocalTtsInstall,
} from "../core/voice-local.js";
import {
  checkForUpdate,
  getUpdateStatus,
  stageUpdate,
} from "../core/updates.js";
import {
  describeImage,
  getVisionStatus,
  readImage,
  saveImage,
  setVisionEngine,
} from "../core/vision.js";
import {
  createMode,
  deleteMode,
  findMode,
  forgetDevice,
  getDeviceDefaultMode,
  getModeRowById,
  listDeviceModes,
  listModes,
  modePinMatches,
  setDeviceMode,
  updateMode,
} from "../core/modes.js";
import {
  createMethod,
  addMethodExample,
  deleteMethodExample,
  listMethodExamples,
  setMethodProvenance,
  getMethodProvenance,
  diffRecipeLines,
  draftMethodSpec,
  draftRecipeEdit,
  executeMethod,
  listMethodSummaries,
  loadMethod,
  loadMethodExamples,
  renameMethod,
  renameMethodTag,
  runDraftMethod,
  setMethodTags,
  toLibraryMethod,
  updateMethodRecipe,
  validateAgainstSchema,
} from "../core/methods.js";
import { getFeedbackById, listAdoptableFeedback, recordMethodFeedback } from "../core/method-feedback.js";
import {
  buildGoogleAuthUrl,
  createOAuthState,
  exchangeCodeForProfile,
  getPublisherIdentity,
  linkPublisherIdentity,
  pickRedirectUri,
  takeOAuthState,
} from "../core/google-auth.js";
import {
  collectMethodFiles,
  collectRoutineFiles,
  listPublishedIds,
  listStalePublishedIds,
  publishMethod,
  publishRoutine,
  recordServicePublish,
} from "../core/publish.js";
import {
  clearServiceSession,
  fetchServiceAcceptances,
  fetchPublishingPause,
  setPublishingPause,
  fetchServiceIdentity,
  getServiceSession,
  publishViaService,
  setServiceReceiving,
  recordServiceAcceptance,
  saveServiceSession,
  updateServiceDisplayName,
} from "../core/publish-service.js";
import {
  createRoutineFromPlan,
  listRoutineSummaries,
  loadRoutine,
  planRoutineSpec,
  toLibraryRoutine,
} from "../core/routines.js";
import {
  runRoutine,
  buildChatRoutineInput,
  parseChatRoutineInput,
} from "../core/routine-run.js";
import {
  buildProvenance,
  exportMethodAsSkill,
  previewSkillImport,
} from "../core/skills-interop.js";
import {
  getImageEngineStatus,
  setImageEngine,
  type ImageEngineChoice,
} from "../core/image-gen.js";
import { classifyRoutineIntent } from "../core/routine-intent.js";
import { getFreePicks, refreshFreePicks } from "../core/free-picks.js";
import { getDefaultProvider } from "../models/registry.js";
import { fetchCatalogue, installRoutine, installMethod } from "../core/catalogue.js";
import {
  recordLegalAcknowledgement,
  listLegalAcknowledgements,
} from "../core/legal-records.js";
import {
  WINDOW_HOURS,
  getContributorId,
  listQueue,
  queueExample,
  withdrawQueued,
} from "../core/flywheel.js";
import {
  communityItemIdFor,
  readOwnerAcks,
  readSharingChoice,
  sweepFlywheel,
} from "../core/flywheel-send.js";
import {
  listGalleryItems,
  listJournalEntries,
  addParseExample,
  listParseExamples,
} from "../core/routine-storage.js";
import {
  connectModelProvider,
  disconnectModelProvider,
  listModelProviders,
  setDefaultModelProvider,
} from "../models/provider-settings.js";
import {
  createProjectMemory,
  deleteProjectMemory,
  listProjectMemories,
  updateProjectMemory,
} from "../core/memory.js";
import {
  appendAssistantNote,
  summarizeConversationForSpeech,
  createAskVaenyxConversation,
  createAskVaenyxMessage,
  deleteAskVaenyxConversation,
  listAskVaenyxConversations,
  listAskVaenyxMessages,
  setAskVaenyxReasoningEffort,
  setAskVaenyxChatProvider,
  setAskVaenyxChatModel,
  type CreateAskVaenyxMessageOptions,
} from "../core/ask-vaenyx.js";
import {
  cancelTask,
  createForgeTask,
  createMockTask,
  createResearchTask,
  createTaskMessage,
  listSkills,
  listTaskMessages,
  listTaskRuns,
  listTasks,
  retryTask,
  getRunThinking,
  setTaskSchedule,
  stampTaskMode,
} from "../core/tasks.js";
import {
  listVaenyxThreads,
  setThreadRoutine,
  touchChatThread,
  updateVaenyxThreadProject,
  updateVaenyxThreadStatus,
  updateVaenyxThreadTitle,
} from "../core/threads.js";
import {
  createProject,
  listProjects,
  updateProject,
  updateProjectInstructions,
} from "../core/projects.js";
import {
  approveVaenyxMeCandidate,
  createVaenyxMeCandidate,
  deleteVaenyxMeCandidate,
  getVaenyxMeProfile,
  listVaenyxMeCandidates,
  rejectVaenyxMeCandidate,
  scanVaenyxMe,
} from "../core/vaenyx-me.js";
import {
  autoExamplesEnabled,
  getInstanceSettings,
  setSharingPreference,
  updateInstanceSettings,
} from "../core/settings.js";
import {
  runCodexChatTest,
  runForgeReadOnly,
  startCodexLogin,
} from "../harness/codex.js";
import {
  authenticateOwner,
  clearSession,
  createOwner,
  createSession,
  deleteAllSessions,
  findOwnerByPassword,
  getOwner,
  isLocalDirectRequest,
  ownerExists,
  setOwnerPassword,
  setSessionMode,
} from "../guard/auth.js";
import {
  loginBlockedSeconds,
  loginClientKey,
  recordLoginFailure,
  recordLoginSuccess,
} from "../guard/rate-limit.js";
import { listAuditEvents, recordAudit } from "../guard/audit.js";

interface GatewayContext {
  config: AppConfig;
  database: DatabaseHandle;
}

// App Profiles have no project binding, so the legacy /v1/app/ask path files
// their tasks under the General project at runtime.
const GENERAL_PROJECT_ID = "general";

const HealthSchema = Type.Object(
  {
    status: Type.Literal("ok"),
  },
  {
    additionalProperties: false,
  },
);

const ErrorResponseSchema = Type.Object(
  {
    error: Type.String(),
  },
  {
    additionalProperties: false,
  },
);

// Friendly copy for the model-backend failures a Method run can surface to a
// calling app (the backend is the same Codex CLI the rest of Vaenyx uses).
const METHOD_RUN_ERROR_COPY: Record<string, string> = {
  CODEX_NOT_INSTALLED: "The model backend (Codex CLI) is not installed.",
  CODEX_NOT_LOGGED_IN: "The model backend is not signed in.",
  CODEX_CHATGPT_REQUIRED:
    "The model backend must be signed in with ChatGPT Subscription Auth.",
  CODEX_TURN_CANCELLED: "The method run was cancelled.",
};

// How many examples to hand an app in a Mode B recipe fetch (few-shot for its
// own model). Bounded so a method with many flywheel examples stays reasonable.
const FETCH_RECIPE_EXAMPLE_LIMIT = 10;

function getMethodRunErrorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  return (
    METHOD_RUN_ERROR_COPY[code] ??
    "Vaenyx could not complete that method run. Check the local logs."
  );
}

function getForgeTestFailureMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : "CODEX_UNKNOWN_ERROR";

  if (code === "CODEX_NOT_INSTALLED") {
    return "Forge could not start because the independent Codex CLI is not installed.";
  }

  if (code === "CODEX_NOT_LOGGED_IN") {
    return "Forge could not start because Codex is not signed in.";
  }

  if (code === "CODEX_CHATGPT_REQUIRED") {
    return "Forge requires Codex to be signed in with ChatGPT Subscription Auth.";
  }

  if (code === "CODEX_DID_NOT_INSPECT_REPOSITORY") {
    return "Forge started, but Vaenyx rejected the result because it did not inspect the repository.";
  }

  if (code === "CODEX_READ_ONLY_BOUNDARY_VIOLATION") {
    return "Forge attempted an action outside its read-only safety boundary.";
  }

  if (code === "CODEX_REPOSITORY_BOUNDARY_VIOLATION") {
    return "Forge attempted to inspect outside the Vaenyx repository.";
  }

  return `Forge connection test failed locally: ${code}`;
}

function getChatTestFailureMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : "CODEX_UNKNOWN_ERROR";

  if (code === "CODEX_NOT_INSTALLED") {
    return "Chat test could not start because the independent Codex CLI is not installed.";
  }

  if (code === "CODEX_NOT_LOGGED_IN") {
    return "Chat test could not start because Codex is not signed in.";
  }

  if (code === "CODEX_CHATGPT_REQUIRED") {
    return "Chat test requires Codex to be signed in with ChatGPT Subscription Auth.";
  }

  if (code === "CODEX_CHAT_BOUNDARY_VIOLATION") {
    return "This quick chat test is connected, but it does not browse or use tools. Live prices, weather, news, and other current-data questions are blocked here.";
  }

  return `Chat test failed locally: ${code}`;
}

function isLiveDataPrompt(prompt: string): boolean {
  const normalized = prompt.toLowerCase();
  const liveWords = [
    "current",
    "latest",
    "live",
    "now",
    "price",
    "weather",
    "news",
    "stock",
    "btc",
    "bitcoin",
    "today",
    "tomorrow",
    "现在",
    "当前",
    "最新",
    "实时",
    "价格",
    "天气",
    "新闻",
    "股价",
    "比特币",
    "今天",
    "明天",
  ];

  return liveWords.some((word) => normalized.includes(word));
}

export async function registerGatewayRoutes(
  app: FastifyInstance,
  context: GatewayContext,
): Promise<void> {
  const requireOwner = (request: Parameters<typeof authenticateOwner>[1]) =>
    authenticateOwner(context.database, request);

  // Custom Mode M3 (spec §6, "lock settings"): with the flag on, a session
  // inside that mode cannot reach ANY settings mutation — enforced here in
  // one place, the kernel floor, regardless of what the UI shows. Reads
  // stay open (the composer needs the provider list); App-Profile token
  // reveals are blocked explicitly even though they are GETs. Logging out
  // of the OWN session stays allowed; mode management routes have their own
  // stricter any-mode guard.
  // "/v1/settings" is deliberately NOT here: Agent Name (and the client-side
  // personal preferences) stay available inside a locked mode (Oskar,
  // dev.170) — everything structural below remains blocked.
  const LOCKED_MUTATION_PREFIXES = [
    "/v1/models/",
    "/v1/voice/connect",
    "/v1/voice/output",
    "/v1/voice/local",
    "/v1/vision/engine",
    "/v1/app-profiles",
    "/v1/system/backup",
    "/v1/system/restart",
    "/v1/system/shutdown",
    "/v1/auth/change-password",
    "/v1/auth/logout-all",
  ];
  app.addHook("preHandler", async (request, reply) => {
    const path = request.url.split("?")[0] ?? "";
    const candidateMutation =
      request.method !== "GET" &&
      LOCKED_MUTATION_PREFIXES.some((prefix) => path.startsWith(prefix));
    const candidateReveal =
      path.startsWith("/v1/app-profiles/") && path.endsWith("/token");
    if (!candidateMutation && !candidateReveal) return;
    const owner = requireOwner(request);
    if (!owner?.modeId) return;
    const mode = findMode(context.database, owner.modeId);
    if (!mode?.lockSettings) return;
    notifyModeBlocked(
      mode.name,
      `A settings change was blocked in mode "${mode.name}" (${request.method} ${path}).`,
    );
    recordAudit(context.database, {
      actorType: "owner",
      actorId: owner.id,
      actorName: owner.name,
      action: "mode.settings.blocked",
      decision: "denied",
      reason: `Settings mutation blocked inside locked mode "${mode.name}": ${request.method} ${path}`,
      resourceType: "mode",
      resourceId: owner.modeId,
    });
    return reply.code(403).send({
      error: "Settings are locked in this mode.",
    });
  });

  // Custom Mode supervision events (spec §6, "must push"): a blocked action
  // inside a mode notifies every device immediately — deliberately NOT
  // presence-aware (the blocked device is the one actively viewing), and
  // throttled so a hammering finger cannot flood the Owner's phone.
  let lastModeBlockPushAt = 0;
  const notifyModeBlocked = (modeName: string, body: string): void => {
    const nowMs = Date.now();
    if (nowMs - lastModeBlockPushAt < 60_000) return;
    lastModeBlockPushAt = nowMs;
    void sendPushToAllDevices(
      context.database,
      {
        title: `Mode "${modeName}" hit a restriction`,
        body,
        url: "/",
      },
      "mode",
    ).catch(() => undefined);
  };

  // Custom Mode sandbox hardening: direct-id access respects the mode
  // boundary — a conversation, thread or task belonging to ANOTHER mode is
  // simply not found (404) for a session inside a mode. User Mode (null)
  // passes everything: it is the god view the supervision window uses.
  app.addHook("preHandler", async (request, reply) => {
    const path = request.url.split("?")[0] ?? "";
    const conversationMatch = path.match(
      /^\/v1\/ask-vaenyx\/conversations\/([^/]+)/,
    );
    const threadMatch = path.match(/^\/v1\/threads\/([^/]+)/);
    const taskMatch = path.match(/^\/v1\/tasks\/([^/]+)/);
    if (!conversationMatch && !threadMatch && !taskMatch) return;
    const owner = requireOwner(request);
    if (!owner) return; // the handler's own 401 handling runs
    if (!owner.modeId) return; // User Mode sees into every sandbox
    const sessionMode = owner.modeId;
    const check = (
      table: string,
      id: string,
      label: string,
    ): { error: string } | null => {
      const row = context.database.sqlite
        .prepare(`SELECT mode_id FROM ${table} WHERE id = ?`)
        .get(decodeURIComponent(id)) as
        | { mode_id: string | null }
        | undefined;
      if (row && (row.mode_id ?? null) !== sessionMode) {
        return { error: `${label} not found.` };
      }
      return null;
    };
    const denied =
      (conversationMatch &&
        check(
          "ask_vaenyx_conversations",
          conversationMatch[1] ?? "",
          "Conversation",
        )) ||
      (threadMatch &&
        check("vaenyx_threads", threadMatch[1] ?? "", "Thread")) ||
      (taskMatch && check("tasks", taskMatch[1] ?? "", "Task"));
    if (denied) {
      const mode = findMode(context.database, sessionMode);
      notifyModeBlocked(
        mode?.name ?? sessionMode,
        `Mode "${mode?.name ?? sessionMode}" tried to open content outside its sandbox and was blocked.`,
      );
      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "mode.sandbox.blocked",
        decision: "denied",
        reason: `Cross-sandbox access blocked in mode "${mode?.name ?? sessionMode}": ${request.method} ${path}`,
        resourceType: "mode",
        resourceId: sessionMode,
      });
      return reply.code(404).send(denied);
    }
  });

  // Stream an Ask Vaenyx / Task reply as Server-Sent Events. Owner auth + body
  // validation run before this (normal Fastify); here we hijack the raw socket
  // because Fastify's serializer/onSend cannot describe an event stream. That
  // means we must write the security headers and the rolling-session cookie
  // (set by the onRequest hook) onto the raw response ourselves.
  // In-flight turns by key (chat conversation id / task:<id>): the Stop button
  // aborts through here. A dropped socket must NOT kill a turn — a locked
  // phone still gets its reply generated, stored and presence-pushed.
  const inFlightTurns = new Map<string, AbortController>();

  async function streamAskVaenyxReply(
    reply: FastifyReply,
    turnKey: string,
    run: (
      options: CreateAskVaenyxMessageOptions,
    ) => ReturnType<typeof createAskVaenyxMessage>,
    audit: (response: Awaited<ReturnType<typeof createAskVaenyxMessage>>) => void,
  ): Promise<void> {
    reply.hijack();
    const raw = reply.raw;

    const headers: Record<string, string | string[] | number> = {
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "content-type": "text/event-stream; charset=utf-8",
      "referrer-policy": "no-referrer",
      "x-accel-buffering": "no",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
    };
    const setCookie = reply.getHeader("set-cookie");
    if (setCookie) {
      headers["set-cookie"] = setCookie as string | string[];
    }
    raw.writeHead(200, headers);

    const send = (event: string, data: unknown): void => {
      if (!raw.writable) return;
      try {
        raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      } catch {
        // Client went away mid-write; generation continues regardless.
      }
    };

    const controller = new AbortController();
    // One live turn per conversation: a resend after a dropped socket takes
    // over from the orphaned turn instead of racing it.
    inFlightTurns.get(turnKey)?.abort();
    inFlightTurns.set(turnKey, controller);

    try {
      const response = await run({
        onOwnerMessage: (message) => send("owner", message),
        onDelta: (text) => send("delta", { text }),
        // Live progress: what the turn is doing before anything streams, and
        // the model's own thinking where the backend exposes it. Both are
        // transient — the web shows them while working and drops them when
        // the reply lands.
        onStatus: (code) => send("status", { code }),
        onThinking: (text) => send("thinking", { text }),
        signal: controller.signal,
      });
      audit(response);
      send("done", response);
    } catch (error) {
      const message =
        error instanceof Error &&
        error.message === "ASK_VAENYX_CONVERSATION_NOT_FOUND"
          ? "Vaenyx Chat conversation not found."
          : error instanceof Error && error.message === "TASK_NOT_FOUND"
            ? "Task not found."
            : "Vaenyx could not complete this reply.";
      send("error", { error: message });
    } finally {
      if (inFlightTurns.get(turnKey) === controller) {
        inFlightTurns.delete(turnKey);
      }
      try {
        raw.end();
      } catch {
        // Already closed.
      }
    }
  }

  app.get(
    "/health",
    {
      schema: {
        response: {
          200: HealthSchema,
        },
      },
    },
    async () => ({ status: "ok" as const }),
  );

  app.get(
    "/v1/system/status",
    {
      schema: {
        response: {
          200: SystemStatusSchema,
        },
      },
    },
    async () => getSystemStatus(context.config, context.database),
  );

  app.post(
    "/v1/system/shutdown",
    {
      schema: {
        response: {
          200: MessageResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "system.shutdown",
        decision: "allowed",
        reason: "Owner requested local Vaenyx shutdown from Settings.",
        resourceType: "system",
      });

      if (context.config.mode !== "test") {
        // Owner stop wins over the autostart watchdog: leave a sentinel so it
        // stays stopped instead of being restarted. Vaenyx-Start clears it.
        try {
          writeFileSync(
            resolve(context.config.dataDirectory, "autostart-paused.flag"),
            "stopped by owner",
          );
        } catch {
          // Best-effort only; shutdown proceeds even if the flag write fails.
        }

        setTimeout(() => {
          void app.close().finally(() => {
            process.exit(0);
          });
        }, 250).unref();
      }

      return {
        message: "Vaenyx is stopping. You can close this browser tab.",
      };
    },
  );

  // Restart: exit WITHOUT the autostart-paused sentinel so the watchdog brings
  // Vaenyx straight back — on whatever build is on disk. This is how a new
  // build goes live without an elevated kill or a manual stop/start.
  app.post(
    "/v1/system/restart",
    {
      schema: {
        response: {
          200: MessageResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "system.restart",
        decision: "allowed",
        reason: "Owner requested a Vaenyx restart from Settings.",
        resourceType: "system",
      });

      if (context.config.mode !== "test") {
        setTimeout(() => {
          void app.close().finally(() => {
            process.exit(0);
          });
        }, 250).unref();
      }

      return {
        message: "Vaenyx is restarting — back in a few seconds.",
      };
    },
  );

  // ── Update Now (onboarding spec section 5 v2) ──────────────────────────
  // A zip-installed instance has no git remote, so the app updates itself:
  // check GitHub for the newest release, download + verify it here, and let
  // the watchdog swap it in after this process exits.
  app.get(
    "/v1/system/update",
    {
      schema: {
        response: { 200: UpdateStatusSchema, 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      return getUpdateStatus(
        context.config.version,
        context.config.repositoryRoot,
      );
    },
  );

  app.post(
    "/v1/system/update/check",
    {
      schema: {
        response: { 200: UpdateStatusSchema, 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      return checkForUpdate(
        context.config.version,
        context.config.repositoryRoot,
      );
    },
  );

  // Downloads, verifies and stages. Deliberately does NOT restart: the Owner
  // presses Restart when it suits them, and the watchdog applies it then.
  app.post(
    "/v1/system/update/download",
    {
      schema: {
        response: { 200: UpdateStatusSchema, 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "system.update.download",
        decision: "allowed",
        reason: "Owner asked Vaenyx to download the latest release.",
        resourceType: "system",
      });
      return stageUpdate({
        dataDirectory: context.config.dataDirectory,
        version: context.config.version,
        repositoryRoot: context.config.repositoryRoot,
      });
    },
  );

  app.get(
    "/v1/system/backups",
    {
      schema: {
        response: {
          200: BackupListResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      return { backups: listBackups(context.config) };
    },
  );

  // Owner-set backup preferences: destination folder + keep-most-recent-N +
  // optional encryption. The password is write-only: the view exposes only
  // `encrypted`, never the passphrase.
  app.get(
    "/v1/system/backup-config",
    {
      schema: {
        response: { 200: BackupConfigViewSchema, 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      const current = readBackupConfigForOwner(context.config);
      const auto = readBackupAutoState(context.config);
      return {
        destination: current.destination,
        keep: current.keep,
        encrypted: current.passphrase !== null,
        schedule: current.schedule,
        lastAutoAt: auto.lastRunAt,
        lastAutoOk: auto.lastOk,
      };
    },
  );

  app.put<{ Body: BackupConfigUpdate }>(
    "/v1/system/backup-config",
    {
      schema: {
        body: BackupConfigUpdateSchema,
        response: {
          200: BackupConfigViewSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      const current = readBackupConfigForOwner(context.config);
      // passphrase absent = keep current; "" or null = turn encryption off;
      // a non-empty string = set/replace.
      const passphrase =
        request.body.passphrase === undefined
          ? current.passphrase
          : request.body.passphrase === null ||
              request.body.passphrase.trim() === ""
            ? null
            : request.body.passphrase;
      const next = {
        destination:
          typeof request.body.destination === "string" &&
          request.body.destination.trim() !== ""
            ? request.body.destination.trim()
            : null,
        keep: request.body.keep,
        passphrase,
        schedule: request.body.schedule,
      };
      const saved = writeBackupConfig(context.config, next);
      if (!saved.ok) {
        return reply.code(400).send({ error: saved.error });
      }
      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "system.backup.configure",
        decision: "allowed",
        reason: `Backup config set: destination=${next.destination ?? "(default)"} keep=${next.keep ?? "(all)"} encryption=${passphrase ? "on" : "off"}.`,
        resourceType: "system",
      });
      const autoNow = readBackupAutoState(context.config);
      return {
        destination: next.destination,
        keep: next.keep,
        encrypted: passphrase !== null,
        schedule: next.schedule,
        lastAutoAt: autoNow.lastRunAt,
        lastAutoOk: autoNow.lastOk,
      };
    },
  );

  app.post(
    "/v1/system/backups",
    {
      schema: {
        response: {
          200: MessageResponseSchema,
          401: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      const result = createBackupNow(context.config);
      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "system.backup.create",
        decision: result.ok ? "allowed" : "denied",
        reason: result.ok
          ? "Owner created a local backup from Settings."
          : `Backup failed: ${result.output.slice(0, 300)}`,
        resourceType: "system",
      });

      if (!result.ok) {
        return reply
          .code(500)
          .send({ error: "Backup failed. Check the server logs." });
      }
      return { message: "Backup created." };
    },
  );

  app.get(
    "/v1/models/providers",
    {
      schema: {
        response: {
          200: ModelProvidersResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      return { providers: listModelProviders(context.config.secretsDirectory) };
    },
  );

  // One-click Codex sign-in: spawns the official `codex login` flow on the
  // machine Vaenyx runs on and returns the sign-in URL (null when the CLI is
  // already signed in, opened the browser itself, or printed nothing in time).
  app.post(
    "/v1/models/codex/login",
    {
      schema: {
        response: {
          200: Type.Object(
            {
              url: Type.Union([Type.String(), Type.Null()]),
              detail: Type.Union([Type.String(), Type.Null()]),
            },
            { additionalProperties: false },
          ),
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "model.codex.login",
        decision: "allowed",
        reason: "Owner started the official Codex ChatGPT sign-in flow.",
        resourceType: "system",
      });
      return startCodexLogin();
    },
  );

  app.post<{ Params: { id: string }; Body: ConnectModelProviderRequest }>(
    "/v1/models/providers/:id",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: ConnectModelProviderRequestSchema,
        response: {
          200: ModelProvidersResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      try {
        connectModelProvider(context.config, request.params.id, request.body);
      } catch {
        return reply
          .code(400)
          .send({ error: "This provider cannot be connected here." });
      }
      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "model.provider.connect",
        decision: "allowed",
        reason: `Owner connected model provider "${request.params.id}".`,
        resourceType: "system",
      });
      return { providers: listModelProviders(context.config.secretsDirectory) };
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/v1/models/providers/:id",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        response: {
          200: ModelProvidersResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      disconnectModelProvider(context.config, request.params.id);
      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "model.provider.disconnect",
        decision: "allowed",
        reason: `Owner disconnected model provider "${request.params.id}".`,
        resourceType: "system",
      });
      return { providers: listModelProviders(context.config.secretsDirectory) };
    },
  );

  app.post<{ Params: { id: string } }>(
    "/v1/models/default/:id",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        response: {
          200: ModelProvidersResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      try {
        setDefaultModelProvider(context.config, request.params.id);
      } catch {
        return reply
          .code(400)
          .send({ error: "That model provider is not connected." });
      }
      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "model.provider.default",
        decision: "allowed",
        reason: `Owner set default model provider to "${request.params.id}".`,
        resourceType: "system",
      });
      return { providers: listModelProviders(context.config.secretsDirectory) };
    },
  );

  app.post<{ Params: { id: string } }>(
    "/v1/system/backups/:id/restore",
    {
      schema: {
        response: {
          200: MessageResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      const { id } = request.params;
      if (!backupExists(context.config, id)) {
        return reply.code(400).send({ error: "That backup could not be found." });
      }

      requestRestore(context.config, id);
      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "system.backup.restore",
        decision: "allowed",
        reason: `Owner requested restore from backup ${id}; Vaenyx will restart to apply it.`,
        resourceType: "system",
        resourceId: id,
      });

      if (context.config.mode !== "test") {
        // Restart (do NOT write the autostart-paused sentinel) so the watchdog
        // brings Vaenyx back and the restore is applied before the DB opens.
        setTimeout(() => {
          void app.close().finally(() => {
            process.exit(0);
          });
        }, 250).unref();
      }

      return {
        message: "Restoring. Vaenyx is restarting to apply the backup.",
      };
    },
  );

  app.get(
    "/v1/bootstrap/status",
    {
      schema: {
        response: {
          200: BootstrapStatusSchema,
          400: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request) => {
      const owner = getOwner(context.database);
      const authenticatedOwner = authenticateOwner(context.database, request);

      return {
        setupRequired: owner === null,
        authenticated: authenticatedOwner !== null,
        owner: authenticatedOwner,
      };
    },
  );

  app.post<{ Body: SetupOwnerRequest }>(
    "/v1/setup",
    {
      schema: {
        body: SetupOwnerRequestSchema,
        response: {
          200: BootstrapStatusSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      if (ownerExists(context.database)) {
        return reply.code(409).send({
          error: "Vaenyx already has an owner.",
        });
      }

      // Owner creation must happen from the local machine only. Otherwise the
      // first person to reach a fresh, internet-exposed Vaenyx could claim it.
      if (!isLocalDirectRequest(request)) {
        recordAudit(context.database, {
          actorType: "system",
          actorName: "Vaenyx",
          action: "owner.setup",
          decision: "denied",
          reason: `Blocked remote owner setup from ${loginClientKey(request)}.`,
          resourceType: "owner",
        });
        return reply.code(403).send({
          error:
            "Owner setup is only allowed from the local machine. Open Vaenyx at http://localhost:3000 on the machine running it.",
        });
      }

      if (!request.body.name.trim()) {
        return reply.code(400).send({
          error: "Owner name is required.",
        });
      }

      const owner = createOwner(
        context.database,
        request.body.name,
        request.body.password,
      );
      createSession(context.database, owner.id, request, reply);

      return {
        setupRequired: false,
        authenticated: true,
        owner,
      };
    },
  );

  app.post<{ Body: LoginRequest }>(
    "/v1/auth/login",
    {
      schema: {
        body: LoginRequestSchema,
        response: {
          200: BootstrapStatusSchema,
          401: ErrorResponseSchema,
          429: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const clientKey = loginClientKey(request);
      const blockedFor = loginBlockedSeconds(clientKey);

      if (blockedFor > 0) {
        recordAudit(context.database, {
          actorType: "system",
          actorName: "Vaenyx",
          action: "owner.login",
          decision: "denied",
          reason: `Login rate limited for ${clientKey} (${blockedFor}s remaining).`,
          resourceType: "owner",
        });
        reply.header("retry-after", String(blockedFor));
        return reply.code(429).send({
          error: "Too many login attempts. Please wait and try again.",
        });
      }

      const owner = findOwnerByPassword(
        context.database,
        request.body.password,
      );

      if (!owner) {
        recordLoginFailure(clientKey);
        recordAudit(context.database, {
          actorType: "system",
          actorName: "Vaenyx",
          action: "owner.login",
          decision: "denied",
          reason: `Incorrect owner password from ${clientKey}.`,
          resourceType: "owner",
        });
        return reply.code(401).send({
          error: "Incorrect password.",
        });
      }

      recordLoginSuccess(clientKey);
      createSession(context.database, owner.id, request, reply);

      return {
        setupRequired: false,
        authenticated: true,
        owner,
      };
    },
  );

  app.post<{ Body: ChangePasswordRequest }>(
    "/v1/auth/change-password",
    {
      schema: {
        body: ChangePasswordRequestSchema,
        response: {
          200: MessageResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      const confirmed = findOwnerByPassword(
        context.database,
        request.body.currentPassword,
      );

      if (!confirmed || confirmed.id !== owner.id) {
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "owner.password.change",
          decision: "denied",
          reason: "Current password did not match.",
          resourceType: "owner",
        });
        return reply.code(401).send({
          error: "Current password is incorrect.",
        });
      }

      setOwnerPassword(context.database, owner.id, request.body.newPassword);
      // Changing the password kills every existing session, then re-issues one
      // for this device so the owner stays logged in here but is signed out
      // everywhere else.
      deleteAllSessions(context.database, owner.id);
      createSession(context.database, owner.id, request, reply);

      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "owner.password.change",
        decision: "allowed",
        reason: "Owner changed the password and signed out other devices.",
        resourceType: "owner",
      });

      return {
        message: "Password changed. Other devices have been signed out.",
      };
    },
  );

  app.post(
    "/v1/auth/logout-all",
    {
      schema: {
        response: {
          200: MessageResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      deleteAllSessions(context.database, owner.id);
      clearSession(context.database, request, reply);

      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "owner.logout_all",
        decision: "allowed",
        reason: "Owner signed out all devices.",
        resourceType: "owner",
      });

      return { message: "Signed out on all devices." };
    },
  );

  app.post(
    "/v1/auth/logout",
    {
      schema: {
        response: {
          200: MessageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      clearSession(context.database, request, reply);
      return { message: "Logged out." };
    },
  );

  app.get(
    "/v1/workspace",
    {
      schema: {
        response: {
          200: WorkspaceSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({
          error: "Owner login required.",
        });
      }

      // Custom Mode M2: the whole workspace is served through the session's
      // mode lens — a Custom Mode session sees only its own sandbox.
      return {
        owner,
        projects: listProjects(context.database, owner.modeId),
        skills: listSkills(context.database),
        agents: listAgentProfiles(context.database),
        vaenyxMe: getVaenyxMeProfile(context.database),
        tasks: listTasks(context.database, owner.modeId),
        threads: listVaenyxThreads(context.database, owner.id, owner.modeId),
        mode: owner.modeId ? findMode(context.database, owner.modeId) : null,
      };
    },
  );

  app.put<{
    Body: UpdateVaenyxThreadProjectRequest;
    Params: { id: string };
  }>(
    "/v1/threads/:id/project",
    {
      schema: {
        params: Type.Object({ id: Type.String({ minLength: 1 }) }),
        body: UpdateVaenyxThreadProjectRequestSchema,
        response: {
          200: VaenyxThreadSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      if (
        request.body.projectId !== null &&
        !request.body.projectId.trim()
      ) {
        return reply.code(400).send({
          error: "Project is required, or choose Inbox.",
        });
      }

      try {
        const thread = updateVaenyxThreadProject(
          context.database,
          request.params.id,
          owner.id,
          request.body,
        );
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "thread.project.update",
          decision: "allowed",
          reason:
            thread.projectId === null
              ? "Owner moved a Vaenyx Thread to Inbox."
              : "Owner moved a Vaenyx Thread into a Project.",
          projectId: thread.projectId,
          resourceType: "vaenyx_thread",
          resourceId: thread.id,
        });
        return thread;
      } catch (error) {
        if (error instanceof Error && error.message === "PROJECT_NOT_FOUND") {
          return reply.code(400).send({ error: "Project not found." });
        }

        if (
          error instanceof Error &&
          error.message === "VAENYX_THREAD_NOT_FOUND"
        ) {
          return reply.code(404).send({ error: "Vaenyx Thread not found." });
        }

        throw error;
      }
    },
  );

  app.put<{
    Body: UpdateVaenyxThreadStatusRequest;
    Params: { id: string };
  }>(
    "/v1/threads/:id/status",
    {
      schema: {
        params: Type.Object({ id: Type.String({ minLength: 1 }) }),
        body: UpdateVaenyxThreadStatusRequestSchema,
        response: {
          200: VaenyxThreadSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      try {
        const thread = updateVaenyxThreadStatus(
          context.database,
          request.params.id,
          owner.id,
          request.body,
        );
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "thread.status.update",
          decision: "allowed",
          reason: `Owner set Vaenyx Thread status to ${thread.status}.`,
          projectId: thread.projectId,
          resourceType: "vaenyx_thread",
          resourceId: thread.id,
        });
        return thread;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "VAENYX_THREAD_NOT_FOUND"
        ) {
          return reply.code(404).send({ error: "Vaenyx Thread not found." });
        }

        throw error;
      }
    },
  );

  app.put<{
    Body: UpdateVaenyxThreadTitleRequest;
    Params: { id: string };
  }>(
    "/v1/threads/:id/title",
    {
      schema: {
        params: Type.Object({ id: Type.String({ minLength: 1 }) }),
        body: UpdateVaenyxThreadTitleRequestSchema,
        response: {
          200: VaenyxThreadSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      if (!request.body.title.trim()) {
        return reply.code(400).send({ error: "Thread title is required." });
      }

      try {
        const thread = updateVaenyxThreadTitle(
          context.database,
          request.params.id,
          owner.id,
          request.body,
        );
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "thread.title.update",
          decision: "allowed",
          reason: "Owner renamed a Vaenyx Thread.",
          projectId: thread.projectId,
          resourceType: "vaenyx_thread",
          resourceId: thread.id,
        });
        return thread;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "VAENYX_THREAD_TITLE_REQUIRED"
        ) {
          return reply.code(400).send({ error: "Thread title is required." });
        }

        if (
          error instanceof Error &&
          error.message === "VAENYX_THREAD_NOT_FOUND"
        ) {
          return reply.code(404).send({ error: "Vaenyx Thread not found." });
        }

        throw error;
      }
    },
  );

  app.put<{
    Body: UpdateAgentProfileNameRequest;
    Params: { id: string };
  }>(
    "/v1/agent-profiles/:id/name",
    {
      schema: {
        params: Type.Object({ id: Type.String({ minLength: 1 }) }),
        body: UpdateAgentProfileNameRequestSchema,
        response: {
          200: AgentProfileSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      try {
        const profile = updateAgentProfileName(
          context.database,
          request.params.id,
          request.body,
        );
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "agent_profile.name.update",
          decision: "allowed",
          reason: "Owner updated a Vaenyx Agent display name.",
          resourceType: "agent_profile",
          resourceId: profile.id,
        });
        return profile;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "AGENT_PROFILE_NAME_REQUIRED"
        ) {
          return reply.code(400).send({
            error: "Agent display name is required.",
          });
        }

        if (
          error instanceof Error &&
          error.message === "AGENT_PROFILE_NOT_EDITABLE"
        ) {
          return reply.code(403).send({
            error: "This Vaenyx Agent profile is not editable.",
          });
        }

        if (
          error instanceof Error &&
          error.message === "AGENT_PROFILE_NOT_FOUND"
        ) {
          return reply.code(404).send({ error: "Vaenyx Agent not found." });
        }

        throw error;
      }
    },
  );

  app.get(
    "/v1/ask-vaenyx/conversations",
    {
      schema: {
        response: {
          200: Type.Array(AskVaenyxConversationSchema),
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      return listAskVaenyxConversations(
        context.database,
        owner.id,
        owner.modeId,
      );
    },
  );

  app.post<{ Body: CreateAskVaenyxConversationRequest }>(
    "/v1/ask-vaenyx/conversations",
    {
      schema: {
        body: CreateAskVaenyxConversationRequestSchema,
        response: {
          200: AskVaenyxConversationSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      if (request.body.title !== undefined && !request.body.title.trim()) {
        return reply
          .code(400)
          .send({ error: "Conversation title is required." });
      }

      try {
        const conversation = createAskVaenyxConversation(
          context.database,
          owner.id,
          request.body,
          owner.modeId,
        );
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "ask_vaenyx.conversation.create",
          decision: "allowed",
          reason: "Owner created a local Vaenyx Chat conversation.",
          resourceType: "ask_vaenyx_conversation",
          resourceId: conversation.id,
        });

        return conversation;
      } catch (error) {
        if (error instanceof Error && error.message === "PROJECT_NOT_FOUND") {
          return reply.code(400).send({ error: "Project not found." });
        }

        throw error;
      }
    },
  );

  // Library v2 (Routine in Chat): this routine chat's Journal + Gallery, scoped to
  // the chat. No 200 schema: entries hold arbitrary structured JSON. An ordinary
  // chat (no routine) returns empty lists rather than a 404.
  app.get<{ Params: { id: string } }>(
    "/v1/ask-vaenyx/conversations/:id/routine-data",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        response: { 401: ErrorResponseSchema, 404: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      const thread = listVaenyxThreads(context.database, owner.id).find(
        (candidate) => candidate.conversationId === request.params.id,
      );
      if (!thread) {
        return reply.code(404).send({ error: "Chat not found." });
      }
      if (!thread.routineId) {
        return { journal: [], gallery: [] };
      }
      return {
        journal: listJournalEntries(
          context.database,
          thread.routineId,
          request.params.id,
        ),
        gallery: listGalleryItems(
          context.database,
          thread.routineId,
          request.params.id,
        ),
      };
    },
  );

  // Library v2 (Routine in Chat): run this routine chat's Routine on a plain
  // message. A single-field first step takes the message directly; a multi-field
  // first step gets AI-parsed and returned as a needs-confirmation payload — the
  // Owner confirms and the client re-posts with `input`. The run writes to this
  // chat's Journal + Gallery. No 200 schema: the output is arbitrary structured
  // JSON (run result or RoutineRunNeedsInput).
  app.post<{ Params: { id: string }; Body: RoutineRunChatRequest }>(
    "/v1/ask-vaenyx/conversations/:id/routine-run",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: RoutineRunChatRequestSchema,
        response: {
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
          502: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      const thread = listVaenyxThreads(context.database, owner.id).find(
        (candidate) => candidate.conversationId === request.params.id,
      );
      if (!thread) {
        return reply.code(404).send({ error: "Chat not found." });
      }
      if (!thread.routineId) {
        return reply
          .code(400)
          .send({ error: "This chat is not linked to a routine." });
      }

      const controller = new AbortController();
      reply.raw.on("close", () => {
        if (!reply.raw.writableEnded) controller.abort();
      });

      // Confirmed structured input runs as-is (the run's own step validation
      // still applies). A plain message is wrapped (single field) or AI-parsed
      // into a confirm payload (multi-field).
      let journalInput: unknown;
      if (request.body.input) {
        journalInput = request.body.input;
        // The Owner edited the parsed fields before running — save this as a
        // local, private few-shot example so future parses of similar messages
        // improve. Never uploaded; rides the local backup.
        if (request.body.learn) {
          addParseExample(context.database, {
            routineId: thread.routineId,
            message: request.body.content,
            input: request.body.input,
          });
        }
      } else {
        const wrapped = buildChatRoutineInput(
          context.config.routinesDirectory,
          context.config.libraryDirectory,
          thread.routineId,
          request.body.content,
        );
        if (wrapped.ok) {
          journalInput = wrapped.input;
        } else {
          try {
            const parsed = await parseChatRoutineInput(
              context.config.routinesDirectory,
              context.config.libraryDirectory,
              thread.routineId,
              request.body.content,
              controller.signal,
              undefined,
              listParseExamples(context.database, thread.routineId, 3),
            );
            if (!parsed) {
              return reply.code(400).send({
                error:
                  "Vaenyx could not work out this routine's input from a chat message.",
              });
            }
            return { needsInput: true as const, ...parsed };
          } catch (error) {
            return reply
              .code(502)
              .send({ error: getMethodRunErrorMessage(error) });
          }
        }
      }

      try {
        const result = await runRoutine(
          context.database,
          context.config.routinesDirectory,
          context.config.libraryDirectory,
          thread.routineId,
          journalInput,
          controller.signal,
          { chatId: request.params.id },
        );
        touchChatThread(
          context.database,
          request.params.id,
          new Date().toISOString(),
        );
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "library.routine.run",
          decision: "allowed",
          reason: result.outputValid
            ? "Owner ran a routine chat; output matched its schema."
            : "Owner ran a routine chat; output did not match its schema.",
          resourceType: "routine",
          resourceId: thread.routineId,
        });
        return result;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.startsWith("ROUTINE_UNRESOLVED")
        ) {
          return reply.code(400).send({
            error:
              "This routine depends on a Method that is missing or a different version.",
          });
        }
        if (
          error instanceof Error &&
          error.message.startsWith("STEP_INPUT_INVALID")
        ) {
          return reply.code(400).send({
            error: "Vaenyx could not turn that into the routine's input.",
          });
        }
        return reply.code(502).send({ error: getMethodRunErrorMessage(error) });
      }
    },
  );

  // Attach (or change) the Routine on an existing chat — the "+" entry that turns
  // an ongoing chat into a routine chat at any moment.
  app.post<{ Params: { id: string }; Body: { routineId: string } }>(
    "/v1/ask-vaenyx/conversations/:id/routine",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: Type.Object(
          { routineId: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        response: {
          200: VaenyxThreadSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      const routine = loadRoutine(
        context.config.routinesDirectory,
        context.config.libraryDirectory,
        request.body.routineId,
      );
      if (!routine) {
        return reply.code(404).send({ error: "Routine not found." });
      }

      const thread = listVaenyxThreads(context.database, owner.id).find(
        (candidate) => candidate.conversationId === request.params.id,
      );
      if (!thread) {
        return reply.code(404).send({ error: "Chat not found." });
      }

      setThreadRoutine(
        context.database,
        request.params.id,
        request.body.routineId,
        new Date().toISOString(),
      );
      const updated = listVaenyxThreads(context.database, owner.id).find(
        (candidate) => candidate.conversationId === request.params.id,
      );
      return updated ?? thread;
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/v1/ask-vaenyx/conversations/:id",
    {
      schema: {
        params: Type.Object(
          {
            id: Type.String({ minLength: 1 }),
          },
          { additionalProperties: false },
        ),
        response: {
          200: MessageResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      try {
        const conversation = deleteAskVaenyxConversation(
          context.database,
          request.params.id,
          owner.id,
        );
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "ask_vaenyx.conversation.delete",
          decision: "allowed",
          reason: "Owner deleted a local Vaenyx Chat conversation.",
          resourceType: "ask_vaenyx_conversation",
          resourceId: conversation.id,
        });

        return { message: "Vaenyx Chat conversation deleted." };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "ASK_VAENYX_CONVERSATION_NOT_FOUND"
        ) {
          return reply.code(404).send({
            error: "Vaenyx Chat conversation not found.",
          });
        }

        throw error;
      }
    },
  );

  app.put<{
    Body: SetReasoningEffortRequest;
    Params: { id: string };
  }>(
    "/v1/ask-vaenyx/conversations/:id/reasoning-effort",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: SetReasoningEffortRequestSchema,
        response: {
          200: AskVaenyxConversationSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      try {
        return setAskVaenyxReasoningEffort(
          context.database,
          request.params.id,
          owner.id,
          request.body.effort,
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "ASK_VAENYX_CONVERSATION_NOT_FOUND"
        ) {
          return reply.code(404).send({
            error: "Vaenyx Chat conversation not found.",
          });
        }
        throw error;
      }
    },
  );

  app.put<{
    Body: SetChatProviderRequest;
    Params: { id: string };
  }>(
    "/v1/ask-vaenyx/conversations/:id/model-provider",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: SetChatProviderRequestSchema,
        response: {
          200: AskVaenyxConversationSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      try {
        return setAskVaenyxChatProvider(
          context.database,
          request.params.id,
          owner.id,
          request.body.providerId,
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "ASK_VAENYX_CONVERSATION_NOT_FOUND"
        ) {
          return reply.code(404).send({
            error: "Vaenyx Chat conversation not found.",
          });
        }
        throw error;
      }
    },
  );

  app.put<{
    Body: SetChatModelRequest;
    Params: { id: string };
  }>(
    "/v1/ask-vaenyx/conversations/:id/model",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: SetChatModelRequestSchema,
        response: {
          200: AskVaenyxConversationSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      try {
        return setAskVaenyxChatModel(
          context.database,
          request.params.id,
          owner.id,
          request.body.model,
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "ASK_VAENYX_CONVERSATION_NOT_FOUND"
        ) {
          return reply.code(404).send({
            error: "Vaenyx Chat conversation not found.",
          });
        }
        throw error;
      }
    },
  );

  app.get<{ Params: { id: string } }>(
    "/v1/ask-vaenyx/conversations/:id/messages",
    {
      schema: {
        params: Type.Object(
          {
            id: Type.String({ minLength: 1 }),
          },
          { additionalProperties: false },
        ),
        response: {
          200: Type.Array(AskVaenyxMessageSchema),
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      try {
        return listAskVaenyxMessages(
          context.database,
          request.params.id,
          owner.id,
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "ASK_VAENYX_CONVERSATION_NOT_FOUND"
        ) {
          return reply.code(404).send({
            error: "Vaenyx Chat conversation not found.",
          });
        }

        throw error;
      }
    },
  );

  // One tap reads a spoken digest of the conversation aloud; this produces the
  // words, the client's existing sentence-first TTS does the speaking.
  app.post<{ Params: { id: string }; Body: { language?: string } }>(
    "/v1/ask-vaenyx/conversations/:id/spoken-summary",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: Type.Object(
          { language: Type.Optional(Type.String({ maxLength: 8 })) },
          { additionalProperties: false },
        ),
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      try {
        const summary = await summarizeConversationForSpeech(
          context.database,
          request.params.id,
          owner.id,
          request.body.language === "zh" ? "zh" : "en",
        );
        return { summary };
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        if (code === "NOTHING_TO_SUMMARIZE") {
          return reply
            .code(400)
            .send({ error: "There is nothing to summarize yet." });
        }
        if (code === "ASK_VAENYX_CONVERSATION_NOT_FOUND") {
          return reply
            .code(404)
            .send({ error: "Vaenyx Chat conversation not found." });
        }
        return reply
          .code(502)
          .send({ error: "The summary could not be made. Try again." });
      }
    },
  );

  // Library v2 (AI-driven): classify the Owner's message before replying — does it
  // call for one of their Routines? Best-effort; any failure returns "none".
  app.post<{ Params: { id: string }; Body: CreateAskVaenyxMessageRequest }>(
    "/v1/ask-vaenyx/conversations/:id/classify",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: CreateAskVaenyxMessageRequestSchema,
        response: {
          200: ClassifyRoutineResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      if (!request.body.content.trim()) {
        return reply.code(400).send({ error: "A message is required." });
      }

      const controller = new AbortController();
      reply.raw.on("close", () => {
        if (!reply.raw.writableEnded) controller.abort();
      });

      try {
        return await classifyRoutineIntent(
          context.database,
          request.params.id,
          owner.id,
          request.body.content,
          context.config.routinesDirectory,
          controller.signal,
          context.config.libraryDirectory,
          // With a picture engine connected, the same single judgment also
          // decides draw / not-draw — no second classifier anywhere.
          getImageEngineStatus(context.config.secretsDirectory).connected,
        );
      } catch {
        return {
          decision: "none",
          routineId: null,
          methodId: null,
          editRequest: null,
          taskRequest: null,
          taskSchedule: null,
          createDescription: null,
          clarifyQuestion: null,
          imagePrompt: null,
          taskTitle: null,
          note: "",
        };
      }
    },
  );

  // Non-streaming send (used by tests and as the plain REST counterpart to the
  // streaming route below). The web app uses the streaming route.
  app.post<{
    Body: CreateAskVaenyxMessageRequest;
    Params: { id: string };
  }>(
    "/v1/ask-vaenyx/conversations/:id/messages",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: CreateAskVaenyxMessageRequestSchema,
        response: {
          200: CreateAskVaenyxMessageResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      if (!request.body.content.trim()) {
        return reply
          .code(400)
          .send({ error: "Vaenyx Chat message is required." });
      }
      try {
        const response = await createAskVaenyxMessage(
          context.database,
          request.params.id,
          owner.id,
          request.body.content,
        );
        const assistantMessage = response.messages.find(
          (message) => message.role === "assistant",
        );
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "ask_vaenyx.message.create",
          decision:
            assistantMessage?.status === "completed" ? "allowed" : "denied",
          reason:
            assistantMessage?.status === "completed"
              ? "Vaenyx Chat returned a chat reply through ChatGPT / Codex Auth."
              : "Vaenyx Chat stored the Owner message, but the assistant reply failed.",
          resourceType: "ask_vaenyx_conversation",
          resourceId: response.conversation.id,
        });
        return response;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "ASK_VAENYX_CONVERSATION_NOT_FOUND"
        ) {
          return reply.code(404).send({
            error: "Vaenyx Chat conversation not found.",
          });
        }
        throw error;
      }
    },
  );

  app.post<{
    Body: CreateAskVaenyxMessageRequest;
    Params: { id: string };
  }>(
    "/v1/ask-vaenyx/conversations/:id/messages/stream",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: CreateAskVaenyxMessageRequestSchema,
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      if (!request.body.content.trim()) {
        return reply
          .code(400)
          .send({ error: "Vaenyx Chat message is required." });
      }

      const streamSuggest = request.body.suggestRoutineId
        ? loadRoutine(
            context.config.routinesDirectory,
            context.config.libraryDirectory,
            request.body.suggestRoutineId,
          )
        : null;

      await streamAskVaenyxReply(
        reply,
        request.params.id,
        (options) =>
          createAskVaenyxMessage(
            context.database,
            request.params.id,
            owner.id,
            request.body.content,
            {
              ...options,
              ...(streamSuggest
                ? {
                    suggestRoutine: {
                      name: streamSuggest.name,
                      description: streamSuggest.description,
                    },
                  }
                : {}),
              ...(request.body.suggestTask ? { suggestTask: true } : {}),
              ...(request.body.suggestCreate
                ? { suggestCreate: request.body.suggestCreate }
                : {}),
              ...(request.body.clarifyCreate
                ? { clarifyCreate: request.body.clarifyCreate }
                : {}),
              ...(request.body.voiceAudioId
                ? { voiceAudioId: request.body.voiceAudioId }
                : {}),
              ...(request.body.imageId
                ? { imageId: request.body.imageId }
                : {}),
              ...(request.body.imagePrompt
                ? { imagePrompt: request.body.imagePrompt }
                : {}),
              dataDirectory: context.config.dataDirectory,
              secretsDirectory: context.config.secretsDirectory,
            },
          ),
        (response) => {
          const assistantMessage = response.messages.find(
            (message) => message.role === "assistant",
          );
          recordAudit(context.database, {
            actorType: "owner",
            actorId: owner.id,
            actorName: owner.name,
            action: "ask_vaenyx.message.create",
            decision:
              assistantMessage?.status === "completed" ? "allowed" : "denied",
            reason:
              assistantMessage?.status === "completed"
                ? "Vaenyx Chat streamed a reply through ChatGPT / Codex Auth."
                : "Vaenyx Chat stored the Owner message, but the streamed reply failed.",
            resourceType: "ask_vaenyx_conversation",
            resourceId: response.conversation.id,
          });
        },
      );
    },
  );

  // In-chat background creation (spec §2a): after the client finishes building
  // a Method/Routine, it posts the confirmation note here. The note is a normal
  // assistant message, so the Owner sees it in place and the model knows about
  // the creation on every later turn.
  app.post<{ Body: { content: string }; Params: { id: string } }>(
    "/v1/ask-vaenyx/conversations/:id/notes",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: Type.Object(
          { content: Type.String({ minLength: 1, maxLength: 4000 }) },
          { additionalProperties: false },
        ),
        response: {
          200: AskVaenyxMessageSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      try {
        return appendAssistantNote(
          context.database,
          request.params.id,
          owner.id,
          request.body.content,
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "ASK_VAENYX_CONVERSATION_NOT_FOUND"
        ) {
          return reply
            .code(404)
            .send({ error: "Vaenyx Chat conversation not found." });
        }
        throw error;
      }
    },
  );

  app.get(
    "/v1/vaenyx-me/candidates",
    {
      schema: {
        response: {
          200: Type.Array(VaenyxMeCandidateSchema),
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      if (!requireOwner(request)) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      return listVaenyxMeCandidates(context.database);
    },
  );

  app.post(
    "/v1/vaenyx-me/scan",
    {
      schema: {
        response: {
          200: Type.Array(VaenyxMeCandidateSchema),
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      await scanVaenyxMe(context.database, owner.id);
      return listVaenyxMeCandidates(context.database);
    },
  );

  app.post<{ Body: CreateVaenyxMeCandidateRequest }>(
    "/v1/vaenyx-me/candidates",
    {
      schema: {
        body: CreateVaenyxMeCandidateRequestSchema,
        response: {
          200: VaenyxMeCandidateSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      if (
        !request.body.category.trim() ||
        !request.body.title.trim() ||
        !request.body.proposedSummary.trim() ||
        !request.body.proposedEvidence.trim()
      ) {
        return reply.code(400).send({
          error: "Vaenyx Me candidate fields are required.",
        });
      }

      const candidate = createVaenyxMeCandidate(
        context.database,
        request.body,
        owner.id,
      );
      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "vaenyx_me.candidate.create",
        decision: "allowed",
        reason: "Owner created a Vaenyx Me candidate for manual review.",
        resourceType: "vaenyx_me_candidate",
        resourceId: candidate.id,
      });

      return candidate;
    },
  );

  app.post<{
    Body: ApproveVaenyxMeCandidateRequest;
    Params: { id: string };
  }>(
    "/v1/vaenyx-me/candidates/:id/approve",
    {
      schema: {
        params: Type.Object({ id: Type.String({ minLength: 1 }) }),
        body: ApproveVaenyxMeCandidateRequestSchema,
        response: {
          200: VaenyxMeCandidateSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      if (
        !request.body.title.trim() ||
        !request.body.summary.trim() ||
        !request.body.evidence.trim()
      ) {
        return reply.code(400).send({
          error: "Approved Vaenyx Me fields are required.",
        });
      }

      try {
        const result = approveVaenyxMeCandidate(
          context.database,
          request.params.id,
          request.body,
          owner.id,
        );
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "vaenyx_me.candidate.approve",
          decision: "allowed",
          reason: "Owner approved a Vaenyx Me candidate.",
          resourceType: "vaenyx_me_candidate",
          resourceId: result.candidate.id,
        });
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "vaenyx_me.item.update",
          decision: "allowed",
          reason:
            "Approved candidate updated the inspectable Vaenyx Me profile.",
          resourceType: "vaenyx_me_item",
          resourceId: result.itemId,
        });

        return result.candidate;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "VAENYX_ME_CANDIDATE_NOT_FOUND"
        ) {
          return reply
            .code(404)
            .send({ error: "Vaenyx Me candidate not found." });
        }

        if (
          error instanceof Error &&
          error.message === "VAENYX_ME_CANDIDATE_NOT_PENDING"
        ) {
          return reply.code(400).send({
            error: "Only pending Vaenyx Me candidates can be approved.",
          });
        }

        throw error;
      }
    },
  );

  app.post<{
    Body: RejectVaenyxMeCandidateRequest;
    Params: { id: string };
  }>(
    "/v1/vaenyx-me/candidates/:id/reject",
    {
      schema: {
        params: Type.Object({ id: Type.String({ minLength: 1 }) }),
        body: RejectVaenyxMeCandidateRequestSchema,
        response: {
          200: VaenyxMeCandidateSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      try {
        const candidate = rejectVaenyxMeCandidate(
          context.database,
          request.params.id,
          request.body,
          owner.id,
        );
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "vaenyx_me.candidate.reject",
          decision: "allowed",
          reason: "Owner rejected a Vaenyx Me candidate.",
          resourceType: "vaenyx_me_candidate",
          resourceId: candidate.id,
        });

        return candidate;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "VAENYX_ME_CANDIDATE_NOT_FOUND"
        ) {
          return reply
            .code(404)
            .send({ error: "Vaenyx Me candidate not found." });
        }

        if (
          error instanceof Error &&
          error.message === "VAENYX_ME_CANDIDATE_NOT_PENDING"
        ) {
          return reply.code(400).send({
            error: "Only pending Vaenyx Me candidates can be rejected.",
          });
        }

        throw error;
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/v1/vaenyx-me/candidates/:id",
    {
      schema: {
        params: Type.Object({ id: Type.String({ minLength: 1 }) }),
        response: {
          200: MessageResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      try {
        const candidate = deleteVaenyxMeCandidate(
          context.database,
          request.params.id,
          owner.id,
        );
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "vaenyx_me.candidate.delete",
          decision: "allowed",
          reason: "Owner deleted a Vaenyx Me candidate from the review queue.",
          resourceType: "vaenyx_me_candidate",
          resourceId: candidate.id,
        });

        return { message: "Vaenyx Me candidate deleted." };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "VAENYX_ME_CANDIDATE_NOT_FOUND"
        ) {
          return reply
            .code(404)
            .send({ error: "Vaenyx Me candidate not found." });
        }

        throw error;
      }
    },
  );

  app.get<{ Params: { id: string } }>(
    "/v1/tasks/:id/messages",
    {
      schema: {
        params: Type.Object(
          {
            id: Type.String({ minLength: 1 }),
          },
          { additionalProperties: false },
        ),
        response: {
          200: Type.Array(AskVaenyxMessageSchema),
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      try {
        return listTaskMessages(context.database, request.params.id, owner.id);
      } catch (error) {
        if (error instanceof Error && error.message === "TASK_NOT_FOUND") {
          return reply.code(404).send({ error: "Task not found." });
        }

        throw error;
      }
    },
  );

  app.post<{
    Body: CreateAskVaenyxMessageRequest;
    Params: { id: string };
  }>(
    "/v1/tasks/:id/messages",
    {
      schema: {
        params: Type.Object(
          {
            id: Type.String({ minLength: 1 }),
          },
          { additionalProperties: false },
        ),
        body: CreateAskVaenyxMessageRequestSchema,
        response: {
          200: CreateAskVaenyxMessageResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      if (!request.body.content.trim()) {
        return reply.code(400).send({ error: "Task message is required." });
      }

      try {
        const response = await createTaskMessage(
          context.database,
          request.params.id,
          owner.id,
          request.body.content,
        );
        const assistantMessage = response.messages.find(
          (message) => message.role === "assistant",
        );

        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "task.message.create",
          decision:
            assistantMessage?.status === "completed" ? "allowed" : "denied",
          reason:
            assistantMessage?.status === "completed"
              ? "Vaenyx Task returned a follow-up reply through ChatGPT / Codex Auth."
              : "Vaenyx Task stored the Owner message, but the assistant reply failed.",
          resourceType: "task",
          resourceId: request.params.id,
        });

        return response;
      } catch (error) {
        if (error instanceof Error && error.message === "TASK_NOT_FOUND") {
          return reply.code(404).send({ error: "Task not found." });
        }

        throw error;
      }
    },
  );

  app.post<{
    Body: CreateAskVaenyxMessageRequest;
    Params: { id: string };
  }>(
    "/v1/tasks/:id/messages/stream",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: CreateAskVaenyxMessageRequestSchema,
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      if (!request.body.content.trim()) {
        return reply.code(400).send({ error: "Task message is required." });
      }

      await streamAskVaenyxReply(
        reply,
        `task:${request.params.id}`,
        (options) =>
          createTaskMessage(
            context.database,
            request.params.id,
            owner.id,
            request.body.content,
            options,
          ),
        (response) => {
          const assistantMessage = response.messages.find(
            (message) => message.role === "assistant",
          );
          recordAudit(context.database, {
            actorType: "owner",
            actorId: owner.id,
            actorName: owner.name,
            action: "task.message.create",
            decision:
              assistantMessage?.status === "completed" ? "allowed" : "denied",
            reason:
              assistantMessage?.status === "completed"
                ? "Vaenyx Task streamed a follow-up reply through ChatGPT / Codex Auth."
                : "Vaenyx Task stored the Owner message, but the streamed reply failed.",
            resourceType: "task",
            resourceId: request.params.id,
          });
        },
      );
    },
  );

  app.get<{ Params: { id: string } }>(
    "/v1/tasks/:id/runs",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        response: {
          200: Type.Array(TaskRunSchema),
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      return listTaskRuns(context.database, request.params.id);
    },
  );

  app.post<{ Params: { id: string } }>(
    "/v1/tasks/:id/cancel",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        response: {
          200: TaskSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      try {
        const task = cancelTask(context.database, request.params.id);
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "task.cancel",
          decision: "allowed",
          reason: "Owner cancelled a running task.",
          projectId: task.projectId,
          resourceType: "task",
          resourceId: task.id,
        });
        return task;
      } catch (error) {
        if (error instanceof Error && error.message === "TASK_NOT_FOUND") {
          return reply.code(404).send({ error: "Task not found." });
        }
        throw error;
      }
    },
  );

  app.get<{ Params: { id: string } }>(
    "/v1/tasks/:id/live",
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      // The in-flight run's thinking, for the open task view to watch. Empty
      // when nothing is running (or the backend has no reasoning channel).
      return { thinking: getRunThinking(request.params.id) };
    },
  );

  app.post<{ Params: { id: string } }>(
    "/v1/tasks/:id/retry",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        response: {
          200: TaskSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      try {
        const task = retryTask(context.database, request.params.id);
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "task.retry",
          decision: "allowed",
          reason: "Owner re-ran a task.",
          projectId: task.projectId,
          resourceType: "task",
          resourceId: task.id,
        });
        return task;
      } catch (error) {
        if (error instanceof Error && error.message === "TASK_NOT_FOUND") {
          return reply.code(404).send({ error: "Task not found." });
        }
        if (
          error instanceof Error &&
          (error.message === "TASK_NOT_RETRIABLE" ||
            error.message === "TASK_ALREADY_RUNNING")
        ) {
          return reply.code(400).send({
            error:
              error.message === "TASK_ALREADY_RUNNING"
                ? "This task is already running."
                : "This task can't be retried.",
          });
        }
        throw error;
      }
    },
  );

  app.put<{ Params: { id: string }; Body: SetTaskScheduleRequest }>(
    "/v1/tasks/:id/schedule",
    {
      schema: {
        body: SetTaskScheduleRequestSchema,
        response: {
          200: TaskSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      try {
        const task = setTaskSchedule(
          context.database,
          request.params.id,
          request.body,
        );
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "task.schedule",
          decision: "allowed",
          reason: request.body.enabled
            ? `Owner scheduled this task (${request.body.cadence ?? "off"}).`
            : "Owner cleared this task's schedule.",
          projectId: task.projectId,
          resourceType: "task",
          resourceId: task.id,
        });
        return task;
      } catch (error) {
        if (error instanceof Error && error.message === "TASK_NOT_FOUND") {
          return reply.code(404).send({ error: "Task not found." });
        }
        throw error;
      }
    },
  );

  app.post<{ Body: CreateTaskRequest }>(
    "/v1/tasks",
    {
      schema: {
        body: CreateTaskRequestSchema,
        response: {
          200: TaskSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({
          error: "Owner login required.",
        });
      }

      if ((request.body.autonomyLevel ?? 0) !== 0) {
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "task.execute",
          decision: "denied",
          reason: "MVP autonomy policy permits Level 0 only.",
          projectId: null,
          resourceType: "task",
        });

        return reply.code(403).send({
          error: "Vaenyx currently permits Level 0 tasks only.",
        });
      }

      if (!request.body.request.trim()) {
        return reply.code(400).send({
          error: "Please enter a request.",
        });
      }

      try {
        const task =
          request.body.executionMode === "forge-readonly"
            ? await createForgeTask(context.database, request.body, owner.id)
            : request.body.executionMode === "research"
              ? createResearchTask(context.database, request.body, owner.id)
              : createMockTask(context.database, request.body, null, owner.id);
        // Custom Mode M2: the task (and its thread) belongs to the mode the
        // session created it in.
        stampTaskMode(context.database, task.id, owner.modeId);
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "task.execute",
          decision: "allowed",
          reason:
            request.body.executionMode === "forge-readonly"
              ? "Owner started Forge with Vaenyx-repository read-only access."
              : "Owner task passed project, skill, and Level 0 policy checks.",
          projectId: task.projectId,
          resourceType: "task",
          resourceId: task.id,
        });
        return task;
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message === "PROJECT_NOT_FOUND" ||
            error.message === "SKILL_NOT_FOUND" ||
            error.message === "SOURCE_CHAT_NOT_FOUND")
        ) {
          return reply.code(400).send({
            error: "The selected project, skill, or source chat is unavailable.",
          });
        }

        if (
          error instanceof Error &&
          error.message === "FORGE_PROJECT_NOT_ALLOWED"
        ) {
          recordAudit(context.database, {
            actorType: "owner",
            actorId: owner.id,
            actorName: owner.name,
            action: "task.execute",
            decision: "denied",
            reason: "Forge v0.1 is restricted to the Vaenyx project.",
            projectId: request.body.projectId,
            resourceType: "task",
          });
          return reply.code(403).send({
            error:
              "Forge currently has read-only access to the Vaenyx project only.",
          });
        }

        throw error;
      }
    },
  );

  app.post<{ Body: CreateProjectRequest }>(
    "/v1/projects",
    {
      schema: {
        body: CreateProjectRequestSchema,
        response: {
          200: ProjectSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      if (!request.body.name.trim() || !request.body.description.trim()) {
        return reply.code(400).send({
          error: "Project name and description are required.",
        });
      }

      const project = createProject(
        context.database,
        request.body,
        owner.modeId,
      );
      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "project.create",
        decision: "allowed",
        reason: "Owner created a new project context boundary.",
        projectId: project.id,
        resourceType: "project",
        resourceId: project.id,
      });
      return project;
    },
  );

  app.put<{ Body: UpdateProjectRequest; Params: { id: string } }>(
    "/v1/projects/:id",
    {
      schema: {
        params: Type.Object({ id: Type.String({ minLength: 1 }) }),
        body: UpdateProjectRequestSchema,
        response: {
          200: ProjectSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      if (!request.body.name.trim() || !request.body.description.trim()) {
        return reply.code(400).send({
          error: "Project name and description are required.",
        });
      }

      try {
        const project = updateProject(
          context.database,
          request.params.id,
          request.body,
        );
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "project.update",
          decision: "allowed",
          reason: "Owner updated a project profile.",
          projectId: project.id,
          resourceType: "project",
          resourceId: project.id,
        });
        return project;
      } catch (error) {
        if (error instanceof Error && error.message === "PROJECT_NOT_FOUND") {
          return reply.code(404).send({ error: "Project not found." });
        }
        throw error;
      }
    },
  );

  // Dual instruction windows (spec §7): the Owner saves the manual window, or
  // edits / deletes ("" clears) the automatic summary Document.
  app.put<{ Body: UpdateProjectInstructionsRequest; Params: { id: string } }>(
    "/v1/projects/:id/instructions",
    {
      schema: {
        params: Type.Object({ id: Type.String({ minLength: 1 }) }),
        body: UpdateProjectInstructionsRequestSchema,
        response: {
          200: ProjectSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      try {
        const project = updateProjectInstructions(
          context.database,
          request.params.id,
          request.body,
        );
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "project.instructions.update",
          decision: "allowed",
          reason: "Owner updated the project's instruction windows.",
          projectId: project.id,
          resourceType: "project",
          resourceId: project.id,
        });
        return project;
      } catch (error) {
        if (error instanceof Error && error.message === "PROJECT_NOT_FOUND") {
          return reply.code(404).send({ error: "Project not found." });
        }
        if (
          error instanceof Error &&
          error.message === "PROJECT_INSTRUCTIONS_NOT_SUPPORTED"
        ) {
          return reply
            .code(400)
            .send({ error: "Unsorted does not take project instructions." });
        }
        throw error;
      }
    },
  );

  app.get(
    "/v1/app-profiles",
    {
      schema: {
        response: {
          200: Type.Array(AppProfileSchema),
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({
          error: "Owner login required.",
        });
      }

      return listAppProfiles(context.database);
    },
  );

  app.post<{ Body: CreateAppProfileRequest }>(
    "/v1/app-profiles",
    {
      schema: {
        body: CreateAppProfileRequestSchema,
        response: {
          200: CreateAppProfileResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({
          error: "Owner login required.",
        });
      }

      if (!request.body.name.trim()) {
        return reply.code(400).send({
          error: "App name is required.",
        });
      }

      try {
        const created = createAppProfile(
          context.database,
          request.body,
          {
            libraryDirectory: context.config.libraryDirectory,
            routinesDirectory: context.config.routinesDirectory,
          },
          context.config.secretsDirectory,
        );
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "app_profile.create",
          decision: "allowed",
          reason: `Owner created a ${created.profile.kind} Token.`,
          resourceType: "app_profile",
          resourceId: created.profile.id,
        });
        return created;
      } catch (error) {
        if (error instanceof Error && error.message === "NO_CAPABILITY") {
          return reply.code(400).send({
            error:
              "A Method Token needs at least one method; a Routine Token needs a routine.",
          });
        }

        if (
          error instanceof Error &&
          (error.message === "SKILL_NOT_FOUND" ||
            error.message === "METHOD_NOT_FOUND" ||
            error.message === "ROUTINE_NOT_FOUND" ||
            error.message.startsWith("ROUTINE_UNRESOLVED"))
        ) {
          return reply.code(400).send({
            error: "The selected method or routine is unavailable.",
          });
        }

        throw error;
      }
    },
  );

  app.post<{ Body: AppAskRequest }>(
    "/v1/app/ask",
    {
      schema: {
        body: AppAskRequestSchema,
        response: {
          200: TaskSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const profile = authenticateAppProfile(context.database, request);

      if (!profile) {
        recordAudit(context.database, {
          actorType: "system",
          actorName: "Vaenyx Guard",
          action: "app.task.execute",
          decision: "denied",
          reason: "Invalid or disabled App Token.",
          resourceType: "app_request",
        });

        return reply.code(401).send({
          error: "A valid App Token is required.",
        });
      }

      if (!request.body.request.trim()) {
        return reply.code(400).send({
          error: "Please enter a request.",
        });
      }

      const skillId = request.body.skillId ?? profile.allowedSkillIds[0];

      if (!skillId || !profile.allowedSkillIds.includes(skillId)) {
        recordAudit(context.database, {
          actorType: "app",
          actorId: profile.id,
          actorName: profile.name,
          action: "app.task.execute",
          decision: "denied",
          reason: "Requested Skill is outside the App Profile allowlist.",
          resourceType: "app_request",
        });

        return reply.code(403).send({
          error: "This App Profile is not allowed to use that skill.",
        });
      }

      if ((request.body.autonomyLevel ?? 0) > profile.maxAutonomyLevel) {
        recordAudit(context.database, {
          actorType: "app",
          actorId: profile.id,
          actorName: profile.name,
          action: "app.task.execute",
          decision: "denied",
          reason: "Requested autonomy exceeds the App Profile limit.",
          resourceType: "app_request",
        });

        return reply.code(403).send({
          error: "Requested autonomy exceeds this App Profile's limit.",
        });
      }

      // An App Profile has no project binding, so its tasks land in the General
      // project; they never read project memory (enforced in createMockTask).
      const task = createMockTask(
        context.database,
        {
          request: request.body.request,
          projectId: GENERAL_PROJECT_ID,
          skillId,
        },
        profile,
      );
      recordAudit(context.database, {
        actorType: "app",
        actorId: profile.id,
        actorName: profile.name,
        action: "app.task.execute",
        decision: "allowed",
        reason: "App request passed policy checks (no memory access).",
        projectId: task.projectId,
        resourceType: "task",
        resourceId: task.id,
      });
      return task;
    },
  );

  app.post<{ Params: { id: string } }>(
    "/v1/app-profiles/:id/disable",
    {
      schema: {
        params: Type.Object(
          {
            id: Type.String({ minLength: 1 }),
          },
          { additionalProperties: false },
        ),
        response: {
          200: AppProfileSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({
          error: "Owner login required.",
        });
      }

      try {
        const profile = disableAppProfile(context.database, request.params.id);
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "app_profile.disable",
          decision: "allowed",
          reason: "Owner revoked this App Profile's Token access.",
          resourceType: "app_profile",
          resourceId: profile.id,
        });
        return profile;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "APP_PROFILE_NOT_FOUND"
        ) {
          return reply.code(404).send({
            error: "App Profile not found.",
          });
        }

        throw error;
      }
    },
  );

  // Re-enable a disabled Token; the same token authenticates again.
  app.post<{ Params: { id: string } }>(
    "/v1/app-profiles/:id/enable",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        response: {
          200: AppProfileSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      try {
        const profile = enableAppProfile(context.database, request.params.id);
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "app_profile.enable",
          decision: "allowed",
          reason: "Owner re-enabled this App Profile's Token access.",
          resourceType: "app_profile",
          resourceId: profile.id,
        });
        return profile;
      } catch (error) {
        if (error instanceof Error && error.message === "APP_PROFILE_NOT_FOUND") {
          return reply.code(404).send({ error: "App Profile not found." });
        }
        throw error;
      }
    },
  );

  // Permanently delete a Token (App Profile). Its Skill/Method grants cascade.
  app.delete<{ Params: { id: string } }>(
    "/v1/app-profiles/:id",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        response: {
          200: MessageResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      try {
        deleteAppProfile(context.database, request.params.id);
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "app_profile.delete",
          decision: "allowed",
          reason: "Owner permanently deleted an App Profile and its token.",
          resourceType: "app_profile",
          resourceId: request.params.id,
        });
        return { message: "App Profile deleted." };
      } catch (error) {
        if (error instanceof Error && error.message === "APP_PROFILE_NOT_FOUND") {
          return reply.code(404).send({ error: "App Profile not found." });
        }
        throw error;
      }
    },
  );

  // ── Voice (speech-to-text via the separate voice connection) ──────────────
  // Recorded audio/photos arrive as raw binary bodies (no multipart dependency).
  app.addContentTypeParser(
    [
      "audio/webm",
      "audio/mp4",
      "audio/ogg",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/octet-stream",
    ],
    { parseAs: "buffer" },
    (_request, body, done) => done(null, body),
  );

  // ── Vision: photo → useful text (mirrors the voice transcribe flow) ───────
  app.get(
    "/v1/vision/status",
    {
      schema: {
        response: { 200: VisionStatusSchema, 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      return getVisionStatus(context.config.secretsDirectory);
    },
  );

  // ── Custom Modes: CRUD over mode definitions, Owner/User-Mode only ──
  // Spec §6: all mode settings live in User Mode — a session inside a
  // Custom Mode cannot see or change mode definitions (the exit gate is
  // what guards the configuration).
  const MODE_SETTINGS_LOCKED =
    "Mode settings live in User Mode — exit this mode first.";

  app.get(
    "/v1/modes",
    {
      schema: {
        response: {
          200: Type.Array(ModeSchema),
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      if (owner.modeId) {
        return reply.code(403).send({ error: MODE_SETTINGS_LOCKED });
      }
      return listModes(context.database);
    },
  );

  // ── Device default mode (spec §6) ──────────────────────────────────────
  // Every device keeps its own id; the Owner sets which mode it opens into.
  // Listing/setting is User-Mode-only; applying is not, so a device that is
  // meant to stay in a mode lands there on every open.
  app.get(
    "/v1/mode/devices",
    {
      schema: {
        response: {
          200: Type.Array(DeviceModeSchema),
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      if (owner.modeId) {
        return reply.code(403).send({ error: MODE_SETTINGS_LOCKED });
      }
      return listDeviceModes(context.database);
    },
  );

  app.put<{ Body: SetDeviceModeRequest; Params: { id: string } }>(
    "/v1/mode/devices/:id",
    {
      schema: {
        params: Type.Object({ id: Type.String({ minLength: 1 }) }),
        body: SetDeviceModeRequestSchema,
        response: {
          200: Type.Array(DeviceModeSchema),
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      // Registering this device (label only, no mode change) is allowed from
      // anywhere; choosing a device's default mode is a User-Mode setting.
      if (owner.modeId && request.body.modeId !== undefined) {
        return reply.code(403).send({ error: MODE_SETTINGS_LOCKED });
      }
      try {
        return setDeviceMode(context.database, request.params.id, request.body);
      } catch (error) {
        if (error instanceof Error && error.message === "MODE_NOT_FOUND") {
          return reply.code(404).send({ error: "Mode not found." });
        }
        throw error;
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/v1/mode/devices/:id",
    {
      schema: {
        params: Type.Object({ id: Type.String({ minLength: 1 }) }),
        response: {
          200: Type.Array(DeviceModeSchema),
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      if (owner.modeId) {
        return reply.code(403).send({ error: MODE_SETTINGS_LOCKED });
      }
      return forgetDevice(context.database, request.params.id);
    },
  );

  // Apply this device's default on app open. No PIN here — entering a
  // restricted mode only ever REMOVES privileges; the Enter PIN gate still
  // runs in the UI, and leaving is what the exit PIN guards.
  app.post<{ Params: { id: string } }>(
    "/v1/mode/devices/:id/apply",
    {
      schema: {
        params: Type.Object({ id: Type.String({ minLength: 1 }) }),
        response: {
          200: ApplyDeviceModeResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      if (owner.modeId) {
        return { modeId: owner.modeId };
      }
      const modeId = getDeviceDefaultMode(context.database, request.params.id);
      if (!modeId || !findMode(context.database, modeId)) {
        return { modeId: null };
      }
      setSessionMode(context.database, request, modeId);
      return { modeId };
    },
  );

  // App-level notification preferences: which event categories push.
  app.get(
    "/v1/push/prefs",
    {
      schema: {
        response: { 200: PushPrefsSchema, 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      return readPushPrefs();
    },
  );

  app.put<{ Body: PushPrefs }>(
    "/v1/push/prefs",
    {
      schema: {
        body: PushPrefsSchema,
        response: { 200: PushPrefsSchema, 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      return writePushPrefs(request.body);
    },
  );

  // Supervision view window (spec §6, M4): from User Mode, list any mode's
  // threads — the god view. PIN-free by design: the main account login IS
  // the authority here.
  app.get<{ Params: { id: string } }>(
    "/v1/modes/:id/threads",
    {
      schema: {
        params: Type.Object({ id: Type.String({ minLength: 1 }) }),
        response: {
          200: Type.Array(VaenyxThreadSchema),
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      if (owner.modeId) {
        return reply.code(403).send({ error: MODE_SETTINGS_LOCKED });
      }
      if (!findMode(context.database, request.params.id)) {
        return reply.code(404).send({ error: "Mode not found." });
      }
      return listVaenyxThreads(context.database, owner.id, request.params.id);
    },
  );

  // Switch this session into a mode. The secret is the mode's enter PIN —
  // or the account password, which always overrides (master key).
  app.post<{ Body: SwitchModeRequest }>(
    "/v1/mode/switch",
    {
      schema: {
        body: SwitchModeRequestSchema,
        response: {
          200: Type.Object({ ok: Type.Boolean() }),
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      const mode = getModeRowById(context.database, request.body.modeId);
      if (!mode) {
        return reply.code(404).send({ error: "Mode not found." });
      }
      if (mode.enterPinHash) {
        const secret = request.body.secret?.trim() ?? "";
        const allowed =
          (secret && modePinMatches(mode.id, secret, mode.enterPinHash)) ||
          (secret && findOwnerByPassword(context.database, secret) !== null);
        if (!allowed) {
          return reply.code(403).send({
            error: "Wrong PIN. Your account password also works here.",
          });
        }
      }
      setSessionMode(context.database, request, mode.id);
      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "mode.switch",
        decision: "allowed",
        reason: `Session switched into mode "${mode.name}".`,
        resourceType: "mode",
        resourceId: mode.id,
      });
      return { ok: true };
    },
  );

  // Return this session to User Mode. The secret is the mode's exit PIN —
  // or the account password (master key), so a forgotten PIN never locks
  // anyone out.
  app.post<{ Body: ExitModeRequest }>(
    "/v1/mode/exit",
    {
      schema: {
        body: ExitModeRequestSchema,
        response: {
          200: Type.Object({ ok: Type.Boolean() }),
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      if (!owner.modeId) {
        return { ok: true };
      }
      const mode = getModeRowById(context.database, owner.modeId);
      if (mode?.exitPinHash) {
        const secret = request.body.secret?.trim() ?? "";
        const allowed =
          (secret && modePinMatches(mode.id, secret, mode.exitPinHash)) ||
          (secret && findOwnerByPassword(context.database, secret) !== null);
        if (!allowed) {
          return reply.code(403).send({
            error: "Wrong PIN. Your account password also works here.",
          });
        }
      }
      setSessionMode(context.database, request, null);
      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "mode.exit",
        decision: "allowed",
        reason: `Session returned to User Mode from "${mode?.name ?? owner.modeId}".`,
        resourceType: "mode",
        resourceId: owner.modeId,
      });
      return { ok: true };
    },
  );

  app.post<{ Body: CreateModeRequest }>(
    "/v1/modes",
    {
      schema: {
        body: CreateModeRequestSchema,
        response: {
          200: ModeSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      if (owner.modeId) {
        return reply.code(403).send({ error: MODE_SETTINGS_LOCKED });
      }
      try {
        return createMode(context.database, request.body);
      } catch (error) {
        if (error instanceof Error && error.message === "MODE_NAME_REQUIRED") {
          return reply.code(400).send({ error: "A mode needs a name." });
        }
        throw error;
      }
    },
  );

  app.put<{ Body: UpdateModeRequest; Params: { id: string } }>(
    "/v1/modes/:id",
    {
      schema: {
        params: Type.Object({ id: Type.String({ minLength: 1 }) }),
        body: UpdateModeRequestSchema,
        response: {
          200: ModeSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      if (owner.modeId) {
        return reply.code(403).send({ error: MODE_SETTINGS_LOCKED });
      }
      try {
        return updateMode(context.database, request.params.id, request.body);
      } catch (error) {
        if (error instanceof Error && error.message === "MODE_NOT_FOUND") {
          return reply.code(404).send({ error: "Mode not found." });
        }
        if (error instanceof Error && error.message === "MODE_NAME_REQUIRED") {
          return reply.code(400).send({ error: "A mode needs a name." });
        }
        throw error;
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/v1/modes/:id",
    {
      schema: {
        params: Type.Object({ id: Type.String({ minLength: 1 }) }),
        response: {
          200: ModeSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      if (owner.modeId) {
        return reply.code(403).send({ error: MODE_SETTINGS_LOCKED });
      }
      try {
        // Content created inside the mode returns to User Mode first —
        // nothing is lost or stranded (spec's fallback rule).
        return deleteMode(context.database, request.params.id);
      } catch (error) {
        if (error instanceof Error && error.message === "MODE_NOT_FOUND") {
          return reply.code(404).send({ error: "Mode not found." });
        }
        throw error;
      }
    },
  );

  // Pin the vision engine (or "auto") — same sticky-override pattern as the
  // voice engines. A pin needs a usable key under Models (or the borrowed
  // Gemini voice key); otherwise the Owner is pointed there.
  app.post<{ Body: ConnectVisionRequest }>(
    "/v1/vision/engine",
    {
      schema: {
        body: ConnectVisionRequestSchema,
        response: {
          200: VisionStatusSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      try {
        return setVisionEngine(
          context.config.secretsDirectory,
          request.body.provider,
        );
      } catch (error) {
        if (error instanceof Error && error.message === "VISION_NO_KEY") {
          return reply.code(400).send({
            error:
              "That model has no key yet — connect it under Models first, then pick it here.",
          });
        }
        throw error;
      }
    },
  );

  // The picture-making engine. A separate slot from the one that reads
  // pictures: a model that can look at a photo usually cannot draw one.
  app.get(
    "/v1/images/engine",
    {
      schema: {
        response: { 200: VisionStatusSchema, 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      return getImageEngineStatus(context.config.secretsDirectory);
    },
  );

  // The Free-option refresh: ask the Owner's main model what is free NOW and
  // store its dated, attributed answer. See free-picks.ts for the honesty rule.
  app.get("/v1/free-picks", async (request, reply) => {
    const owner = requireOwner(request);
    if (!owner) {
      return reply.code(401).send({ error: "Owner login required." });
    }
    return getFreePicks(context.database) ?? { items: {} };
  });

  app.post("/v1/free-picks/refresh", async (request, reply) => {
    const owner = requireOwner(request);
    if (!owner) {
      return reply.code(401).send({ error: "Owner login required." });
    }
    const provider = getDefaultProvider();
    if (!provider.healthCheck().ok) {
      return reply
        .code(503)
        .send({ error: "Connect a main model first — it does the checking." });
    }
    try {
      return await refreshFreePicks(context.database, provider);
    } catch {
      return reply.code(502).send({
        error: "The model did not give a usable answer. Try again.",
      });
    }
  });

  app.post<{ Body: { provider: string; apiKey?: string; accountId?: string } }>(
    "/v1/images/engine",
    {
      schema: {
        body: Type.Object(
          {
            provider: Type.String({ minLength: 1 }),
            // Only Cloudflare uses these: its token is typed into the Pictures
            // setting itself rather than under Models, because it is the one
            // engine a household adds solely to make pictures. The account id
            // is asked for only when the token cannot name it (a Workers AI
            // template token cannot).
            apiKey: Type.Optional(Type.String({ maxLength: 500 })),
            accountId: Type.Optional(Type.String({ maxLength: 64 })),
          },
          { additionalProperties: false },
        ),
        response: {
          200: VisionStatusSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      try {
        return await setImageEngine(
          context.config.secretsDirectory,
          request.body.provider as ImageEngineChoice,
          request.body.apiKey,
          request.body.accountId,
        );
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        if (code === "IMAGE_NO_KEY") {
          return reply.code(400).send({
            error:
              "That model has no key yet — connect it under Models first, then pick it here.",
          });
        }
        // Cloudflare is the one engine whose key is entered right here, so its
        // key problems have to be answered right here too.
        if (code.startsWith("IMAGE_CF_TOKEN_REJECTED")) {
          return reply.code(400).send({
            error:
              "Cloudflare would not accept that token. Check it was copied whole, and that it has the Workers AI permission.",
          });
        }
        if (code === "IMAGE_CF_NEED_ACCOUNT") {
          // Not a dead end: the UI opens an Account ID field on this message.
          return reply.code(400).send({
            error:
              "That token works, but it is not allowed to name its own account — normal for a Workers AI token. Paste your Account ID as well.",
          });
        }
        if (code === "IMAGE_CF_BAD_ACCOUNT_ID") {
          return reply.code(400).send({
            error:
              "An Account ID is 32 letters and digits. Copy it from the address bar after you sign in to Cloudflare — dash.cloudflare.com/<that code>.",
          });
        }
        if (code.startsWith("IMAGE_CF_PAIR_REJECTED")) {
          return reply.code(400).send({
            error:
              "Cloudflare refused that token for that account — one of the two is wrong, or the token is missing the Workers AI permission.",
          });
        }
        throw error;
      }
    },
  );

  app.post<{ Querystring: { lang?: string } }>(
    "/v1/vision/describe",
    {
      bodyLimit: 12_000_000,
      schema: {
        response: {
          200: VisionDescribeResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          502: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      const image = request.body as Buffer | undefined;
      if (!image || !Buffer.isBuffer(image) || image.length === 0) {
        return reply.code(400).send({ error: "No image received." });
      }
      try {
        const text = await describeImage(
          context.config.secretsDirectory,
          image,
          request.headers["content-type"] ?? "image/jpeg",
          request.query.lang === "zh" ? "zh" : "en",
        );
        return { text };
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message === "VISION_NOT_CONNECTED") {
          return reply.code(400).send({
            error:
              "No vision-capable model connected — connect Gemini or Zhipu BigModel under Models first.",
          });
        }
        if (message === "VISION_NO_KEY") {
          return reply.code(400).send({
            error:
              "That vision model has no API key saved — open Settings → AI Setting → Models and connect it again.",
          });
        }
        // Pass the provider's own reason through. A generic failure leaves the
        // Owner with nothing to fix; this is their instance and their account,
        // so the actual message ("model not found", "quota exceeded", "invalid
        // API key") is exactly what they need.
        const parts = message.split(":");
        if (parts[0] === "VISION_DESCRIBE_FAILED") {
          const status = parts[1] ?? "";
          const detail = parts.slice(2).join(":").trim();
          request.log.warn(
            { status, detail },
            "vision describe failed at the provider",
          );
          return reply.code(502).send({
            error: detail
              ? `The vision model refused the photo (${status}): ${detail}`
              : `The vision model refused the photo (HTTP ${status}).`,
          });
        }
        request.log.warn({ message }, "vision describe failed");
        return reply
          .code(502)
          .send({ error: `Photo analysis failed: ${message || "unknown error"}` });
      }
    },
  );

  app.get(
    "/v1/voice/status",
    {
      schema: {
        response: { 200: VoiceStatusSchema, 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      return getVoiceStatus(context.config.secretsDirectory);
    },
  );

  app.post<{ Body: ConnectVoiceRequest }>(
    "/v1/voice/connect",
    {
      schema: {
        body: ConnectVoiceRequestSchema,
        response: {
          200: VoiceStatusSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      try {
        return setVoiceInput(
          context.config.secretsDirectory,
          request.body.provider,
        );
      } catch (error) {
        if (error instanceof Error && error.message === "VOICE_NO_KEY") {
          return reply.code(400).send({
            error:
              "That model has no key yet — connect it under Models first, then pick it here.",
          });
        }
        throw error;
      }
    },
  );

  app.delete(
    "/v1/voice/connect",
    {
      schema: {
        response: { 200: VoiceStatusSchema, 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      return setVoiceInput(context.config.secretsDirectory, "none");
    },
  );

  app.post(
    "/v1/voice/transcribe",
    {
      bodyLimit: 15_000_000,
      schema: {
        response: {
          200: TranscribeVoiceResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          502: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      const audio = request.body as Buffer | undefined;
      if (!audio || !Buffer.isBuffer(audio) || audio.length === 0) {
        return reply.code(400).send({ error: "No audio received." });
      }
      try {
        const mimeType = request.headers["content-type"] ?? "audio/webm";
        const text = await transcribeVoice(
          context.config.secretsDirectory,
          audio,
          mimeType,
        );
        // Keep the original recording so the voice bubble can replay it.
        const audioId = saveVoiceAudio(
          context.config.dataDirectory,
          audio,
          mimeType,
        );
        return { text, audioId };
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message === "VOICE_NOT_CONNECTED") {
          return reply.code(400).send({
            error: "Voice is not connected — set it up in AI Settings first.",
          });
        }
        return reply.code(502).send({
          error: "Transcription failed — try again.",
        });
      }
    },
  );

  app.get(
    "/v1/voice/output",
    {
      schema: {
        response: { 200: VoiceOutputStatusSchema, 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      return getVoiceOutput(
        context.config.secretsDirectory,
        context.config.dataDirectory,
      );
    },
  );

  app.post<{ Body: ConnectVoiceOutputRequest }>(
    "/v1/voice/output",
    {
      schema: {
        body: ConnectVoiceOutputRequestSchema,
        response: {
          200: VoiceOutputStatusSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      try {
        return connectVoiceOutput(
          context.config.secretsDirectory,
          context.config.dataDirectory,
          request.body,
        );
      } catch (error) {
        if (error instanceof Error && error.message === "VOICE_NO_KEY") {
          return reply.code(400).send({
            error:
              "Gemini has no key yet — connect it under Models first, then pick it here.",
          });
        }
        if (
          error instanceof Error &&
          error.message === "LOCAL_TTS_NOT_INSTALLED"
        ) {
          return reply.code(400).send({
            error: "Local voice is not installed yet — download it first.",
          });
        }
        throw error;
      }
    },
  );

  // Local voice (offline Piper TTS): status / start the ~150 MB download /
  // remove it again. The download runs in the background; the client polls.
  app.get(
    "/v1/voice/local",
    {
      schema: {
        response: { 200: LocalTtsStatusSchema, 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      return getLocalTtsStatus(context.config.dataDirectory);
    },
  );

  app.post(
    "/v1/voice/local/install",
    {
      schema: {
        response: { 200: LocalTtsStatusSchema, 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      startLocalTtsInstall(context.config.dataDirectory);
      return getLocalTtsStatus(context.config.dataDirectory);
    },
  );

  app.delete(
    "/v1/voice/local",
    {
      schema: {
        response: { 200: LocalTtsStatusSchema, 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      removeLocalTts(context.config.dataDirectory);
      resetVoiceOutputIfLocal(context.config.secretsDirectory);
      return getLocalTtsStatus(context.config.dataDirectory);
    },
  );

  // Pick a local voice for its language slot; an absent voice starts its
  // ~60 MB download (progress shows in the same status poll).
  app.post<{ Body: SetLocalVoiceRequest }>(
    "/v1/voice/local/voice",
    {
      schema: {
        body: SetLocalVoiceRequestSchema,
        response: {
          200: LocalTtsStatusSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      try {
        return setLocalVoice(
          context.config.secretsDirectory,
          context.config.dataDirectory,
          request.body.id,
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "LOCAL_VOICE_UNKNOWN"
        ) {
          return reply.code(400).send({ error: "Unknown local voice." });
        }
        throw error;
      }
    },
  );

  // Text → generated speech (Gemini TTS), cached by content so replays are
  // free. Returns the saved audio id for /v1/voice/audio/:id.
  app.post<{ Body: SpeakRequest }>(
    "/v1/voice/speak",
    {
      schema: {
        body: SpeakRequestSchema,
        response: {
          200: SpeakResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          502: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      try {
        const audioId = await synthesizeSpeech(
          context.config.secretsDirectory,
          context.config.dataDirectory,
          request.body.text,
        );
        return { audioId };
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message === "VOICE_OUTPUT_NOT_CONNECTED") {
          return reply.code(400).send({
            error:
              "Voice output has no speech engine — pick Gemini or Local Voice in AI Settings.",
          });
        }
        // Say what actually happened — a Gemini free-tier limit reads very
        // differently from "not connected" (Oskar hit exactly this).
        if (message.startsWith("VOICE_TTS_FAILED:")) {
          const status = message.split(":")[1];
          if (status === "429") {
            return reply.code(502).send({
              error:
                "Gemini's free voice quota is used up right now — wait a while, or switch Voice Output to Local Voice (offline, unlimited).",
            });
          }
          return reply.code(502).send({
            error: `Speech generation failed (Gemini ${status}).`,
          });
        }
        return reply.code(502).send({ error: "Speech generation failed." });
      }
    },
  );

  // Replay a stored voice recording (Owner-only). The id is validated against
  // a strict pattern before any filesystem access.
  app.get<{ Params: { id: string } }>(
    "/v1/voice/audio/:id",
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      const found = readVoiceAudio(
        context.config.dataDirectory,
        request.params.id,
      );
      if (!found) {
        return reply.code(404).send({ error: "Recording not found." });
      }
      return reply.type(found.mimeType).send(found.audio);
    },
  );

  // Stop an in-flight reply turn (the Stop button). Explicit because a mere
  // connection drop no longer cancels generation.
  app.post<{ Body: StopTurnRequest }>(
    "/v1/turns/stop",
    {
      schema: {
        body: StopTurnRequestSchema,
        response: { 200: PushAckResponseSchema, 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      inFlightTurns.get(request.body.key)?.abort();
      return { ok: true };
    },
  );

  // Presence heartbeat: a visible page pings every ~30s. A scheduled run
  // skips the phone push while any device is actively viewing the app.
  app.post(
    "/v1/presence",
    {
      schema: {
        response: { 200: PushAckResponseSchema, 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      notePresence();
      return { ok: true };
    },
  );

  // Notifications diagnostics: device count + last send outcome.
  app.get(
    "/v1/push/status",
    {
      schema: {
        response: { 200: PushDiagnosticsSchema, 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      return getPushDiagnostics(context.database);
    },
  );

  // Send a test notification to every subscribed device, immediately and
  // without the presence gate — the definitive "does push work" button.
  app.post(
    "/v1/push/test",
    {
      schema: {
        response: { 200: PushDiagnosticsSchema, 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      await sendPushToAllDevices(context.database, {
        title: "Vaenyx",
        body: "Test notification — pushes are working.",
        url: "/",
      });
      return getPushDiagnostics(context.database);
    },
  );

  // Phase B: store a conversation photo; the id rides on the next message.
  app.post(
    "/v1/vision/upload",
    {
      bodyLimit: 12_000_000,
      schema: {
        response: {
          200: VisionUploadResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      const image = request.body as Buffer | undefined;
      if (!image || !Buffer.isBuffer(image) || image.length === 0) {
        return reply.code(400).send({ error: "No image received." });
      }
      const imageId = saveImage(
        context.config.dataDirectory,
        image,
        request.headers["content-type"] ?? "image/jpeg",
      );
      return { imageId };
    },
  );

  // Serve a stored conversation photo (Owner-only; id strictly validated).
  app.get<{ Params: { id: string } }>(
    "/v1/vision/image/:id",
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      const found = readImage(context.config.dataDirectory, request.params.id);
      if (!found) {
        return reply.code(404).send({ error: "Image not found." });
      }
      return reply.type(found.mimeType).send(found.image);
    },
  );

  // ── Web Push (scheduled-run notifications) ────────────────────────────────
  app.get(
    "/v1/push/public-key",
    {
      schema: {
        response: {
          200: PushPublicKeyResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      return { key: getPushPublicKey() };
    },
  );

  app.post<{ Body: SubscribePushRequest }>(
    "/v1/push/subscriptions",
    {
      schema: {
        body: SubscribePushRequestSchema,
        response: {
          200: PushAckResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      savePushSubscription(context.database, request.body);
      return { ok: true };
    },
  );

  app.delete<{ Body: UnsubscribePushRequest }>(
    "/v1/push/subscriptions",
    {
      schema: {
        body: UnsubscribePushRequestSchema,
        response: {
          200: PushAckResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      removePushSubscription(context.database, request.body.endpoint);
      return { ok: true };
    },
  );

  // Re-view an existing token (Owner-only): decrypted from the at-rest cipher
  // whose key lives in the secrets directory (outside every backup). Profiles
  // created before the cipher existed return 404 — a reset issues a fresh,
  // recoverable token.
  app.get<{ Params: { id: string } }>(
    "/v1/app-profiles/:id/token",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        response: {
          200: RevealAppTokenResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      try {
        const token = revealAppProfileToken(
          context.database,
          request.params.id,
          context.config.secretsDirectory,
        );
        if (!token) {
          return reply.code(404).send({
            error:
              "This token predates re-viewing and cannot be recovered. Reset it to get one you can view again.",
          });
        }
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "app_profile.reveal_token",
          decision: "allowed",
          reason: "Owner viewed an App Profile token in Settings.",
          resourceType: "app_profile",
          resourceId: request.params.id,
        });
        return { token };
      } catch (error) {
        if (error instanceof Error && error.message === "APP_PROFILE_NOT_FOUND") {
          return reply.code(404).send({ error: "App Profile not found." });
        }
        throw error;
      }
    },
  );

  // Issue a fresh token for an existing profile. The original is stored only as a
  // hash and can never be shown again, so this is how the Owner recovers access:
  // it rotates to a new token (returned once) and the old one stops working.
  app.post<{ Params: { id: string } }>(
    "/v1/app-profiles/:id/regenerate-token",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        response: {
          200: CreateAppProfileResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      try {
        const result = regenerateAppProfileToken(
          context.database,
          request.params.id,
          context.config.secretsDirectory,
        );
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "app_profile.regenerate_token",
          decision: "allowed",
          reason: "Owner reset an App Profile token; the previous token is void.",
          resourceType: "app_profile",
          resourceId: result.profile.id,
        });
        return result;
      } catch (error) {
        if (error instanceof Error && error.message === "APP_PROFILE_NOT_FOUND") {
          return reply.code(404).send({ error: "App Profile not found." });
        }
        throw error;
      }
    },
  );

  // Edit an existing App Profile's Method scope + Mode B / memory permissions.
  // The token (identity) is never reissued; only the capability grant changes,
  // re-pinning each Method's current content hash.
  app.put<{ Params: { id: string }; Body: UpdateAppProfileRequest }>(
    "/v1/app-profiles/:id",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: UpdateAppProfileRequestSchema,
        response: {
          200: UpdateAppProfileResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      try {
        const profile = updateAppProfile(
          context.database,
          request.params.id,
          request.body,
          {
            libraryDirectory: context.config.libraryDirectory,
            routinesDirectory: context.config.routinesDirectory,
          },
        );
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "app_profile.update",
          decision: "allowed",
          reason: "Owner edited an App Profile's Method scope and permissions.",
          resourceType: "app_profile",
          resourceId: profile.id,
        });
        return { profile };
      } catch (error) {
        if (error instanceof Error && error.message === "APP_PROFILE_NOT_FOUND") {
          return reply.code(404).send({ error: "App Profile not found." });
        }

        if (error instanceof Error && error.message === "NO_CAPABILITY") {
          return reply.code(400).send({
            error: "An App Profile must allow at least one skill or method.",
          });
        }

        if (
          error instanceof Error &&
          (error.message === "METHOD_NOT_FOUND" ||
            error.message === "ROUTINE_NOT_FOUND" ||
            error.message.startsWith("ROUTINE_UNRESOLVED"))
        ) {
          return reply.code(400).send({
            error: "The selected method or routine is unavailable.",
          });
        }

        throw error;
      }
    },
  );

  // Help / Glossary: render the spec-maintained bilingual markdown. The page is
  // single-source = docs/glossary.md (en) + docs/glossary.zh.md (zh); this reads
  // the file at request time, so a docs update shows up with no rebuild. The
  // filename is fixed by lang (no caller-supplied path), so there is no traversal.
  app.get<{ Querystring: { lang?: string } }>(
    "/v1/help/glossary",
    {
      schema: {
        querystring: Type.Object(
          { lang: Type.Optional(Type.String()) },
          { additionalProperties: false },
        ),
        response: {
          200: Type.Object(
            { markdown: Type.String() },
            { additionalProperties: false },
          ),
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      if (!requireOwner(request)) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      const file = request.query.lang === "zh" ? "glossary.zh.md" : "glossary.md";
      const path = join(context.config.docsDirectory, file);
      const markdown = existsSync(path) ? readFileSync(path, "utf8") : "";
      return { markdown };
    },
  );

  // Serve an A-class legal document as operative text only. The Notes-for-Operator
  // section is stripped per the publication gate: we cut at the EARLIEST operator
  // marker (EN "Notes for Operator" / ZH "…备注" heading, or a "PUBLICATION GATE" /
  // "发布关卡" banner), so nothing internal can leak even if a heading differs
  // between docs. Read at request time (docs edit shows with no rebuild); the name
  // is a fixed allow-list so there is no path traversal.
  const legalDocFiles: Record<
    string,
    { en: string; zh?: string; root?: boolean }
  > = {
    "terms-of-service": {
      en: "terms-of-service.md",
      zh: "terms-of-service.zh.md",
    },
    "privacy-policy": { en: "privacy-policy.md", zh: "privacy-policy.zh.md" },
    // The dated Schedule. Part A is incorporated into the Privacy Policy as the
    // current factual description of information handling, so it must be readable
    // from inside the app alongside the Policy. Generated from
    // implementation-status.json by docs/legal/generate-status.mjs; English only.
    "implementation-status": {
      en: "implementation-status.md",
      zh: "implementation-status.zh.md",
    },
    "contributor-agreement": {
      en: "contributor-agreement.md",
      zh: "contributor-agreement.zh.md",
    },
    "trademark-policy": {
      en: "trademark-policy.md",
      zh: "trademark-policy.zh.md",
    },
    "third-party-notices": {
      en: "THIRD_PARTY_NOTICES.md",
      zh: "THIRD_PARTY_NOTICES.zh.md",
    },
    // The machine-generated per-release dependency manifest (TPN §3.4 requires
    // it accessible from within the application). Lives at the repo root,
    // regenerated by `npm run licenses` at every release.
    "third-party-licenses": { en: "THIRD_PARTY_LICENSES.md", root: true },
  };

  function stripOperatorNotes(markdown: string): string {
    // ZH docs vary: the notes heading is "…备注" (ToS/Privacy/Contributor) or
    // "…备忘" (Trademark), and the strip banner reads "发布关卡" or "发布门槛".
    // Match every variant so no operator notes can leak in either language.
    const markers = [
      /^#{1,6}[^\n]*Notes for Operator/m,
      /^#{1,6}[^\n]*(备注|备忘)/m,
      /PUBLICATION GATE/,
      /发布关卡/,
      /发布门槛/,
    ];
    let cut = markdown.length;
    for (const re of markers) {
      const at = markdown.search(re);
      if (at >= 0 && at < cut) cut = at;
    }
    return markdown.slice(0, cut).trimEnd();
  }

  app.get<{ Params: { name: string }; Querystring: { lang?: string } }>(
    "/v1/legal/documents/:name",
    {
      schema: {
        params: Type.Object(
          { name: Type.String() },
          { additionalProperties: false },
        ),
        querystring: Type.Object(
          { lang: Type.Optional(Type.String()) },
          { additionalProperties: false },
        ),
        response: {
          200: Type.Object(
            { markdown: Type.String() },
            { additionalProperties: false },
          ),
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      if (!requireOwner(request)) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      const doc = legalDocFiles[request.params.name];
      if (!doc) {
        return reply.code(404).send({ error: "Unknown document." });
      }
      const file = request.query.lang === "zh" && doc.zh ? doc.zh : doc.en;
      const path = doc.root
        ? join(context.config.repositoryRoot, file)
        : join(context.config.docsDirectory, "legal", file);
      if (!existsSync(path)) {
        return reply.code(404).send({ error: "Document not found." });
      }
      return { markdown: stripOperatorNotes(readFileSync(path, "utf8")) };
    },
  );

  // Owner-only Method creation (③). Draft a Method spec from a plain-language
  // description (the model writes recipe + I/O schemas + tags). No 200 schema:
  // the returned schemas are arbitrary author JSON a strict serializer would strip.
  app.post<{ Body: DraftMethodRequest }>(
    "/v1/methods/draft",
    {
      schema: {
        body: DraftMethodRequestSchema,
        response: {
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          502: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      if (!request.body.description.trim()) {
        return reply.code(400).send({ error: "A description is required." });
      }

      const controller = new AbortController();
      reply.raw.on("close", () => {
        if (!reply.raw.writableEnded) controller.abort();
      });

      try {
        return await draftMethodSpec(request.body.description, controller.signal);
      } catch (error) {
        return reply.code(502).send({ error: getMethodRunErrorMessage(error) });
      }
    },
  );

  // Owner-only: demo-test an unsaved draft on one input before saving it.
  app.post<{ Body: DraftMethodRunRequest }>(
    "/v1/methods/draft/test",
    {
      schema: {
        body: DraftMethodRunRequestSchema,
        response: {
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          502: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      const inputCheck = validateAgainstSchema(
        request.body.draft.inputSchema,
        request.body.input,
      );
      if (!inputCheck.valid) {
        return reply.code(400).send({
          error: `Input does not match the draft: ${inputCheck.errors.join("; ")}`,
        });
      }

      const controller = new AbortController();
      reply.raw.on("close", () => {
        if (!reply.raw.writableEnded) controller.abort();
      });

      try {
        return await runDraftMethod(
          request.body.draft,
          request.body.input,
          controller.signal,
        );
      } catch (error) {
        return reply.code(502).send({ error: getMethodRunErrorMessage(error) });
      }
    },
  );

  // Owner-only: save a (reviewed) draft as a new Method on disk. No 200 schema:
  // the returned method carries arbitrary author JSON.
  app.post<{ Body: MethodDraft }>(
    "/v1/methods",
    {
      schema: {
        body: MethodDraftSchema,
        response: {
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      if (!request.body.name.trim() || !request.body.recipe.trim()) {
        return reply.code(400).send({
          error: "A method needs a name and a recipe.",
        });
      }

      const method = createMethod(context.config.libraryDirectory, request.body);
      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "library.method.create",
        decision: "allowed",
        reason: "Owner created a new Library Method.",
        resourceType: "method",
        resourceId: method.id,
      });
      return toLibraryMethod(method);
    },
  );

  // Owner-facing Method catalogue (progressive disclosure: summaries only).
  // Kept off the /v1/library/* namespace, which is reserved for token-forced
  // app calls.
  app.get(
    "/v1/methods",
    {
      schema: {
        response: {
          200: Type.Array(LibraryMethodSummarySchema),
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      if (!requireOwner(request)) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      return listMethodSummaries(context.config.libraryDirectory);
    },
  );

  // Owner-facing Routine catalogue (Library v2). Summaries only, like Methods.
  app.get(
    "/v1/routines",
    {
      schema: {
        response: {
          200: Type.Array(LibraryRoutineSummarySchema),
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      if (!requireOwner(request)) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      return listRoutineSummaries(context.config.routinesDirectory);
    },
  );

  // Owner-only Routine creation (③ slice 2). Plan a Routine from a plain-language
  // description: the model decomposes it into steps, reusing installed Methods or
  // drafting new ones. No 200 schema: drafted schemas are arbitrary author JSON.
  app.post<{ Body: PlanRoutineRequest }>(
    "/v1/routines/plan",
    {
      schema: {
        body: PlanRoutineRequestSchema,
        response: {
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          502: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      if (!request.body.description.trim()) {
        return reply.code(400).send({ error: "A description is required." });
      }

      const controller = new AbortController();
      reply.raw.on("close", () => {
        if (!reply.raw.writableEnded) controller.abort();
      });

      try {
        return await planRoutineSpec(
          request.body.description,
          context.config.libraryDirectory,
          controller.signal,
        );
      } catch (error) {
        return reply.code(502).send({ error: getMethodRunErrorMessage(error) });
      }
    },
  );

  // Owner-only: save a (reviewed) plan as a new Routine — creates any new Methods
  // and writes the routine folder wiring them as a linear chain. No 200 schema.
  app.post<{ Body: RoutinePlan }>(
    "/v1/routines",
    {
      schema: {
        body: RoutinePlanSchema,
        response: {
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      if (request.body.steps.length === 0) {
        return reply.code(400).send({ error: "A routine needs at least one step." });
      }

      try {
        const routine = createRoutineFromPlan(
          context.config.routinesDirectory,
          context.config.libraryDirectory,
          request.body,
        );
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "library.routine.create",
          decision: "allowed",
          reason: "Owner created a new Routine from a plan.",
          resourceType: "routine",
          resourceId: routine.id,
        });
        return toLibraryRoutine(routine);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.startsWith("PLAN_METHOD_NOT_FOUND")
        ) {
          return reply.code(400).send({
            error: "A step reuses a method that no longer exists.",
          });
        }
        throw error;
      }
    },
  );

  // Owner-facing full Routine (declarative model + manifest + dep resolution).
  // No 200 response schema: manifest/view are arbitrary author JSON a strict
  // serializer would strip.
  app.get<{ Params: { id: string } }>(
    "/v1/routines/:id",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        response: {
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      if (!requireOwner(request)) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      const routine = loadRoutine(
        context.config.routinesDirectory,
        context.config.libraryDirectory,
        request.params.id,
      );
      if (!routine) {
        return reply.code(404).send({ error: "Routine not found." });
      }

      return toLibraryRoutine(routine);
    },
  );

  // ── Library v2 distribution (④): the community catalogue (read from Cloudflare) ─
  // The browser never calls the CDN directly: the server proxies the read, so the
  // "app reads CF only" rule lives in one place (and there is no CORS surface).
  app.get(
    "/v1/library/catalogue",
    {
      schema: {
        response: {
          200: CatalogueIndexSchema,
          401: ErrorResponseSchema,
          502: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      if (!requireOwner(request)) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      const controller = new AbortController();
      reply.raw.on("close", () => {
        if (!reply.raw.writableEnded) controller.abort();
      });

      try {
        return await fetchCatalogue(
          context.config.catalogueBaseUrl,
          controller.signal,
        );
      } catch {
        return reply
          .code(502)
          .send({ error: "Could not reach the community catalogue." });
      }
    },
  );

  // Install one catalogue Routine + its Method deps into the local library. No 200
  // schema: the returned Routine's manifest/view are arbitrary author JSON.
  app.post<{ Body: InstallRoutineRequest }>(
    "/v1/library/catalogue/install",
    {
      schema: {
        body: InstallRoutineRequestSchema,
        response: {
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          409: ErrorResponseSchema,
          502: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      const controller = new AbortController();
      reply.raw.on("close", () => {
        if (!reply.raw.writableEnded) controller.abort();
      });

      try {
        const result = await installRoutine(
          context.config.catalogueBaseUrl,
          context.config.routinesDirectory,
          context.config.libraryDirectory,
          request.body.routineId,
          controller.signal,
        );
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "library.routine.install",
          decision: "allowed",
          reason: `Owner installed Routine "${request.body.routineId}" from the community catalogue.`,
          resourceType: "routine",
          resourceId: request.body.routineId,
        });
        return result;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.startsWith("BAD_ID")) {
            return reply.code(400).send({ error: "Invalid item id." });
          }
          if (error.message.startsWith("ROUTINE_EXISTS")) {
            return reply
              .code(409)
              .send({ error: "That Routine is already installed." });
          }
          if (
            error.message.startsWith("MISSING_FILE") ||
            error.message.startsWith("ROUTINE_PARSE_FAILED")
          ) {
            return reply.code(502).send({
              error: "The catalogue item is incomplete or malformed.",
            });
          }
        }
        return reply
          .code(502)
          .send({ error: "Could not install from the community catalogue." });
      }
    },
  );

  // Install one catalogue Method on its own (a reusable building block). No 200
  // schema: the returned Method's schemas/manifest are arbitrary author JSON.
  app.post<{ Body: InstallMethodRequest }>(
    "/v1/library/catalogue/install-method",
    {
      schema: {
        body: InstallMethodRequestSchema,
        response: {
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          409: ErrorResponseSchema,
          502: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      const controller = new AbortController();
      reply.raw.on("close", () => {
        if (!reply.raw.writableEnded) controller.abort();
      });

      try {
        const method = await installMethod(
          context.config.catalogueBaseUrl,
          context.config.libraryDirectory,
          request.body.methodId,
          controller.signal,
        );
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "library.method.install",
          decision: "allowed",
          reason: `Owner installed Method "${request.body.methodId}" from the community catalogue.`,
          resourceType: "method",
          resourceId: request.body.methodId,
        });
        return method;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.startsWith("BAD_ID")) {
            return reply.code(400).send({ error: "Invalid item id." });
          }
          if (error.message.startsWith("METHOD_EXISTS")) {
            return reply
              .code(409)
              .send({ error: "That Method is already installed." });
          }
          if (error.message.startsWith("MISSING_FILE")) {
            return reply.code(502).send({
              error: "The catalogue item is incomplete or malformed.",
            });
          }
        }
        return reply
          .code(502)
          .send({ error: "Could not install from the community catalogue." });
      }
    },
  );

  // Record a legal acknowledgement / consent choice (copy pack clause 2.3). The
  // profile is the signed-in Owner; the app supplies the key, copy version,
  // rendered language and optional choice.
  app.post<{ Body: LegalAcknowledgeRequest }>(
    "/v1/legal/acknowledge",
    {
      schema: {
        body: LegalAcknowledgeRequestSchema,
        response: {
          200: Type.Object(
            { ok: Type.Boolean() },
            { additionalProperties: false },
          ),
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      recordLegalAcknowledgement(context.database, {
        keyName: request.body.keyName,
        copyVersion: request.body.copyVersion,
        language: request.body.language,
        profileId: owner.id,
        choice: request.body.choice ?? null,
      });
      return { ok: true };
    },
  );

  // The operator's publishing pause, proxied to the publish service. The
  // service decides who counts as an operator (it holds the allow-list); this
  // instance only forwards the signed-in session, so a non-operator gets the
  // service's own 403 rather than a check that could be edited locally.
  app.get(
    "/v1/publish/pause",
    {
      schema: {
        response: {
          200: PublishPauseStateSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      const serviceUrl = context.config.publishServiceUrl;
      const session = serviceUrl
        ? getServiceSession(context.database, owner.id)
        : null;
      if (!serviceUrl || !session) {
        return { available: false, paused: false, envOverride: false };
      }
      const state = await fetchPublishingPause(serviceUrl, session.token);
      // No state = not an operator (403) or the service is unreachable. Either
      // way the switch simply does not appear.
      return state
        ? { available: true, paused: state.paused, envOverride: state.envOverride }
        : { available: false, paused: false, envOverride: false };
    },
  );

  app.post<{ Body: { paused: boolean } }>(
    "/v1/publish/pause",
    {
      schema: {
        body: Type.Object(
          { paused: Type.Boolean() },
          { additionalProperties: false },
        ),
        response: {
          200: PublishPauseStateSchema,
          401: ErrorResponseSchema,
          503: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      const serviceUrl = context.config.publishServiceUrl;
      const session = serviceUrl
        ? getServiceSession(context.database, owner.id)
        : null;
      if (!serviceUrl || !session) {
        return reply
          .code(503)
          .send({ error: "The publish service is not connected." });
      }
      try {
        await setPublishingPause(serviceUrl, session.token, request.body.paused);
      } catch {
        return reply
          .code(503)
          .send({ error: "The publish service refused that change." });
      }
      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "publish.pause",
        decision: "allowed",
        reason: request.body.paused
          ? "Operator paused community publishing for everyone."
          : "Operator resumed community publishing.",
        resourceType: "publish_service",
        resourceId: "publishing",
      });
      const state = await fetchPublishingPause(serviceUrl, session.token);
      return {
        available: true,
        paused: state?.paused ?? request.body.paused,
        envOverride: state?.envOverride ?? false,
      };
    },
  );

  // The install wizard's sharing card (copy pack A3). Deliberately NOT a legal
  // acknowledgement: sharing does not exist in this release, so this records
  // interest as an ordinary local setting and nothing else.
  app.post<{ Body: SetSharingPreferenceRequest }>(
    "/v1/legal/sharing-preference",
    {
      schema: {
        body: SetSharingPreferenceRequestSchema,
        response: {
          200: Type.Object(
            { ok: Type.Boolean() },
            { additionalProperties: false },
          ),
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      setSharingPreference(context.database, request.body.choice);
      return { ok: true };
    },
  );

  // The current legal acknowledgements for the signed-in Owner (latest row per
  // key). The app compares copy versions to decide whether a gate re-fires.
  app.get(
    "/v1/legal/acknowledgements",
    {
      schema: {
        response: {
          200: LegalAcknowledgementsResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      return {
        acknowledgements: listLegalAcknowledgements(context.database, owner.id),
      };
    },
  );

  // Owner-facing full Method (recipe + schemas + manifest). No 200 response
  // schema: the schemas/manifest are arbitrary author JSON a strict serializer
  // would strip.
  app.get<{ Params: { id: string } }>(
    "/v1/methods/:id",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        response: {
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      if (!requireOwner(request)) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      const method = loadMethod(
        context.config.libraryDirectory,
        request.params.id,
      );
      if (!method) {
        return reply.code(404).send({ error: "Method not found." });
      }

      return toLibraryMethod(method);
    },
  );

  // Owner-only rename of a Method's display name. The id (= folder name) and the
  // content hash are untouched, so existing App Profile grants / tokens keep
  // working (the name is not part of the hash). No 200 response schema: the
  // returned method carries arbitrary author JSON a strict serializer would strip.
  app.post<{ Params: { id: string }; Body: RenameMethodRequest }>(
    "/v1/methods/:id/rename",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: RenameMethodRequestSchema,
        response: {
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      const name = request.body.name.trim();
      if (!name) {
        return reply.code(400).send({ error: "A method name is required." });
      }

      const method = renameMethod(
        context.config.libraryDirectory,
        request.params.id,
        name,
      );
      if (!method) {
        return reply.code(404).send({ error: "Method not found." });
      }

      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "library.method.rename",
        decision: "allowed",
        reason: "Owner renamed a Library Method (hash + token lock unchanged).",
        resourceType: "method",
        resourceId: request.params.id,
      });

      return toLibraryMethod(method);
    },
  );

  // One Routine in full, so the Library can explain what it does before the
  // Owner starts a chat with it. No 200 response schema: view/manifest are
  // arbitrary author JSON that a strict serializer would quietly strip.
  app.get<{ Params: { id: string } }>(
    "/v1/library/routines/:id",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        response: { 401: ErrorResponseSchema, 404: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      const routine = loadRoutine(
        context.config.routinesDirectory,
        context.config.libraryDirectory,
        request.params.id,
      );
      if (!routine) {
        return reply.code(404).send({ error: "Routine not found." });
      }
      return routine;
    },
  );

  // Agent Skill import/export (copy pack Part L). The wording rule is binding
  // on this code and on anything written about it: Vaenyx IMPORTS THE
  // INSTRUCTIONS FROM A SKILL. Never "Skill compatible", never "runs Skills" —
  // ToS 11.5 makes our interoperability statements descriptive only, and that
  // protects us only while we do not overstate them.
  //
  // Preview first, always: the Owner is shown exactly which scripts and which
  // steps cannot come across before anything is created.
  app.post<{ Body: PreviewSkillRequest }>(
    "/v1/skills/preview",
    {
      schema: {
        body: PreviewSkillRequestSchema,
        response: { 200: SkillImportPreviewSchema, 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      return previewSkillImport(
        request.body.markdown,
        (request.body.files ?? []).map((path) => ({ path })),
        request.body.source ?? null,
      );
    },
  );

  app.post<{ Body: ImportSkillRequest }>(
    "/v1/skills/import",
    {
      schema: {
        body: ImportSkillRequestSchema,
        response: {
          200: ImportSkillResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      const preview = previewSkillImport(
        request.body.markdown,
        (request.body.files ?? []).map((path) => ({ path })),
        request.body.source ?? null,
      );
      if (!preview.recipe.trim()) {
        return reply
          .code(400)
          .send({ error: "Nothing was left to import once the code was dropped." });
      }
      const created = createMethod(context.config.libraryDirectory, {
        name: preview.name,
        description: preview.description,
        recipe: preview.recipe,
        inputSchema: { type: "object", properties: {} },
        outputSchema: { type: "object", properties: {} },
        tags: [],
      });
      // Provenance rides in method.json, which is outside the content hash: a
      // recorded source must not force every granted app to re-authorise.
      setMethodProvenance(
        context.config.libraryDirectory,
        created.id,
        buildProvenance(
          request.body.markdown,
          request.body.source ?? null,
          request.body.license ?? preview.license,
        ) as unknown as Record<string, unknown>,
      );
      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "library.skill.import",
        decision: "allowed",
        reason: `Imported the instructions from a Skill; ${preview.dropped.length} item(s) could not come across.`,
        resourceType: "method",
        resourceId: created.id,
      });
      return { methodId: created.id, dropped: preview.dropped };
    },
  );

  app.get<{ Params: { id: string } }>(
    "/v1/methods/:id/skill-export",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        response: {
          200: ExportSkillResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      const method = loadMethod(
        context.config.libraryDirectory,
        request.params.id,
      );
      if (!method) {
        return reply.code(404).send({ error: "Method not found." });
      }
      return {
        fileName: `${method.id}.SKILL.md`,
        markdown: exportMethodAsSkill(method),
      };
    },
  );

  // ------------------------------------------------------------------
  // The flywheel's outbound half (copy pack Part K). Local half above:
  // a correction becomes an example on this machine. This half is about
  // one example travelling to the person who published the Method, and
  // every gate it has to pass first.
  // ------------------------------------------------------------------

  /** The household's live sharing choice, from its own consent records. */
  function sharingChoice() {
    return readSharingChoice(readOwnerAcks(context.database));
  }

  /** Put one example in the outbound window — or don't, which is the usual
   *  answer. Called from both places a correction becomes an example, so the
   *  gates live in one place rather than two. */
  function queueForSharing(
    methodId: string,
    example: { input: unknown; output: unknown; note: string | null },
  ): void {
    try {
      if (sharingChoice().mode === "off") return;
      if (!communityItemIdFor(context.config.libraryDirectory, methodId)) return;
      queueExample(context.database, {
        methodId,
        input: example.input,
        output: example.output,
        note: example.note,
      });
    } catch {
      // Queueing is a courtesy to the publisher; failing at it must never cost
      // the Owner the correction itself, which is already stored.
    }
  }

  // What is waiting, who it will be credited to, and how long the window is.
  app.get("/v1/flywheel", async (request, reply) => {
    const owner = requireOwner(request);
    if (!owner) {
      return reply.code(401).send({ error: "Owner login required." });
    }
    const choice = sharingChoice();
    return {
      mode: choice.mode,
      activated: choice.activated,
      windowHours: WINDOW_HOURS,
      contributorId: getContributorId(context.database),
      configured: context.config.publishServiceUrl !== null,
      items: listQueue(context.database).map((item) => ({
        id: item.id,
        methodId: item.methodId,
        input: item.input,
        output: item.output,
        note: item.note,
        redactions: item.redactions.length,
        sensitive: item.sensitive,
        createdAt: item.createdAt,
        sendAfter: item.sendAfter,
      })),
    };
  });

  // Pulling one out. This is what the window is FOR, so it never asks why.
  app.post<{ Params: { id: string } }>(
    "/v1/flywheel/:id/withdraw",
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      if (!withdrawQueued(context.database, request.params.id)) {
        return reply.code(404).send({ error: "That item is no longer waiting." });
      }
      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "flywheel.withdraw",
        decision: "allowed",
        reason: "Owner withdrew a queued example before it was sent.",
        resourceType: "flywheel",
        resourceId: request.params.id,
      });
      return { ok: true };
    },
  );

  // Send whatever is due, now. The tick does this on its own; the button exists
  // so "waiting to send" is never a thing the Owner has to take on faith.
  app.post("/v1/flywheel/send-now", async (request, reply) => {
    const owner = requireOwner(request);
    if (!owner) {
      return reply.code(401).send({ error: "Owner login required." });
    }
    return sweepFlywheel(context.database, context.config);
  });

  // The corrections waiting to become examples, and the act of keeping one.
  // This is the flywheel's local half: a correction only becomes an example
  // because the Owner looked at it and said so. Nothing here uploads anything.
  app.get<{ Params: { id: string } }>(
    "/v1/library/methods/:id/corrections",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        response: {
          200: CorrectionsResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      return {
        corrections: listAdoptableFeedback(
          context.database,
          request.params.id,
        ).map((row) => ({
          id: row.id,
          appProfileName: row.appProfileName,
          input: row.input,
          aiOutput: row.aiOutput,
          correctedOutput: row.correctedOutput,
          note: row.note,
          createdAt: row.createdAt,
        })),
      };
    },
  );

  // The examples this Method has learnt from, newest first, and removing one.
  app.get<{ Params: { id: string } }>(
    "/v1/library/methods/:id/examples",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        response: { 200: MethodExamplesResponseSchema, 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      return {
        examples: listMethodExamples(
          context.config.libraryDirectory,
          request.params.id,
        ),
        autoExamples: autoExamplesEnabled(context.database),
      };
    },
  );

  app.delete<{ Params: { id: string; file: string } }>(
    "/v1/library/methods/:id/examples/:file",
    {
      schema: {
        params: Type.Object(
          {
            id: Type.String({ minLength: 1 }),
            file: Type.String({ minLength: 1 }),
          },
          { additionalProperties: false },
        ),
        response: {
          200: Type.Object(
            { exampleCount: Type.Integer() },
            { additionalProperties: false },
          ),
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      try {
        return {
          exampleCount: deleteMethodExample(
            context.config.libraryDirectory,
            request.params.id,
            request.params.file,
          ),
        };
      } catch {
        return reply.code(404).send({ error: "That example is already gone." });
      }
    },
  );

  app.post<{ Params: { id: string }; Body: AdoptCorrectionRequest }>(
    "/v1/library/methods/:id/examples",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: AdoptCorrectionRequestSchema,
        response: {
          200: AdoptCorrectionResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      const correction = getFeedbackById(
        context.database,
        request.params.id,
        request.body.correctionId,
      );
      if (!correction) {
        return reply.code(404).send({ error: "That correction is gone." });
      }
      const contributor = request.body.contributor?.trim() ?? "";
      let result;
      try {
        result = addMethodExample(
          context.config.libraryDirectory,
          request.params.id,
          {
            input: correction.input,
            output: correction.correctedOutput,
            note: correction.note,
            // Someone else's correction only counts as contributed when it is
            // credited to them; unattributed stays the Owner's own.
            source: contributor ? "contributed" : "owner",
            contributor: contributor || null,
          },
        );
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        if (code === "METHOD_NOT_FOUND") {
          return reply.code(404).send({ error: "Method not found." });
        }
        return reply.code(400).send({ error: "That example could not be saved." });
      }

      queueForSharing(request.params.id, {
        input: correction.input,
        output: correction.correctedOutput,
        note: correction.note,
      });

      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "library.method.example.adopt",
        decision: "allowed",
        reason:
          "Owner kept a correction as an example; examples are outside the content hash, so app grants are unaffected.",
        resourceType: "method",
        resourceId: request.params.id,
      });
      return result;
    },
  );

  // Propose a recipe edit (copy pack B4). Reads the current recipe, asks the
  // model for the revision the Owner described, and returns BOTH texts plus the
  // line difference. Writes nothing: the Owner approves the change first.
  app.post<{ Params: { id: string }; Body: DraftRecipeEditRequest }>(
    "/v1/methods/:id/recipe/draft",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: DraftRecipeEditRequestSchema,
        response: {
          200: RecipeEditDraftSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      const method = loadMethod(
        context.config.libraryDirectory,
        request.params.id,
      );
      if (!method) {
        return reply.code(404).send({ error: "Method not found." });
      }

      const controller = new AbortController();
      reply.raw.on("close", () => {
        if (!reply.raw.writableEnded) controller.abort();
      });

      let proposed: string;
      try {
        proposed = await draftRecipeEdit(
          method,
          request.body.request,
          controller.signal,
        );
      } catch {
        return reply
          .code(400)
          .send({ error: "Vaenyx could not draft that change." });
      }

      const current = method.recipe.trim();
      const diff = diffRecipeLines(current, proposed);
      return {
        methodId: method.id,
        methodName: method.name,
        current,
        proposed,
        diff,
        unchanged: !diff.some((line) => line.kind !== "same"),
      };
    },
  );

  // Apply an approved recipe edit. ONLY recipe.md is written: schema.json and
  // manifest.json (the permission declaration) are deliberately out of reach of
  // a conversation. This never publishes - publishing is a separate, deliberate
  // acceptance of the Contributor Agreement (ToS 7.2(d)), and an edit that
  // published itself would make those warranties for the Owner without asking.
  app.put<{ Params: { id: string }; Body: UpdateRecipeRequest }>(
    "/v1/methods/:id/recipe",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: UpdateRecipeRequestSchema,
        response: {
          200: UpdateRecipeResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      let updated;
      try {
        updated = updateMethodRecipe(
          context.config.libraryDirectory,
          request.params.id,
          request.body.recipe,
        );
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        if (code === "METHOD_NOT_FOUND") {
          return reply.code(404).send({ error: "Method not found." });
        }
        return reply.code(400).send({ error: "That recipe could not be saved." });
      }

      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "library.method.recipe.edit",
        decision: "allowed",
        reason:
          "Owner approved a recipe edit from chat; the content hash moved, so granted App Profiles must grant again.",
        resourceType: "method",
        resourceId: request.params.id,
      });

      return {
        methodId: updated.id,
        contentHash: updated.contentHash,
        staleGrants: countStaleMethodGrants(
          context.database,
          updated.id,
          updated.contentHash,
        ),
      };
    },
  );

  // Owner-only: set the full tag list on one method. No 200 response schema: the
  // returned method carries arbitrary author JSON a strict serializer would strip.
  app.post<{ Params: { id: string }; Body: SetMethodTagsRequest }>(
    "/v1/methods/:id/tags",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: SetMethodTagsRequestSchema,
        response: {
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      const method = setMethodTags(
        context.config.libraryDirectory,
        request.params.id,
        request.body.tags,
      );
      if (!method) {
        return reply.code(404).send({ error: "Method not found." });
      }

      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "library.method.tags",
        decision: "allowed",
        reason: "Owner set a Library Method's tags (hash + token lock unchanged).",
        resourceType: "method",
        resourceId: request.params.id,
      });

      return toLibraryMethod(method);
    },
  );

  // Owner-only bulk tag rename: relabels the tag on every method that carries it,
  // merging a typo'd tag into the right one. tags are not part of the content
  // hash, so this never breaks an App Profile's version lock.
  app.post<{ Body: RenameMethodTagRequest }>(
    "/v1/methods/tags/rename",
    {
      schema: {
        body: RenameMethodTagRequestSchema,
        response: {
          200: RenameMethodTagResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      const from = request.body.from.trim();
      const to = request.body.to.trim();
      if (!from || !to) {
        return reply.code(400).send({ error: "Both tag names are required." });
      }

      const result = renameMethodTag(context.config.libraryDirectory, from, to);
      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "library.tag.rename",
        decision: "allowed",
        reason: `Owner renamed method tag "${from}" to "${to}" (${result.moved} changed).`,
        resourceType: "method_tag",
        resourceId: to,
      });

      return result;
    },
  );

  // Owner-only test-run: lets the Owner try a method from the Library UI. Mirrors
  // the app run path (validate input -> executeMethod -> validate output) but
  // uses the Owner session instead of an app token, and skips the allowlist /
  // version lock (those gate apps, not the Owner). No 200 response schema:
  // `output` is the method's arbitrary structured JSON.
  app.post<{ Params: { id: string }; Body: RunMethodRequest }>(
    "/v1/methods/:id/test-run",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: RunMethodRequestSchema,
        response: {
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
          502: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      const method = loadMethod(
        context.config.libraryDirectory,
        request.params.id,
      );
      if (!method) {
        return reply.code(404).send({ error: "Method not found." });
      }

      const inputCheck = validateAgainstSchema(
        method.inputSchema,
        request.body.input,
      );
      if (!inputCheck.valid) {
        return reply.code(400).send({
          error: `Input does not match this method: ${inputCheck.errors.join("; ")}`,
        });
      }

      const controller = new AbortController();
      reply.raw.on("close", () => {
        if (!reply.raw.writableEnded) controller.abort();
      });

      try {
        const examples = loadMethodExamples(
          context.config.libraryDirectory,
          request.params.id,
        );
        const result = await executeMethod(
          method,
          examples,
          request.body.input,
          controller.signal,
        );
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "library.method.test_run",
          decision: "allowed",
          reason: result.outputValid
            ? "Owner test-ran a method; output matched its schema."
            : "Owner test-ran a method; output did not match its schema.",
          resourceType: "method",
          resourceId: request.params.id,
        });

        const response: RunMethodResponse = {
          methodId: request.params.id,
          methodVersion: method.version,
          output: result.output,
          outputValid: result.outputValid,
          raw: result.raw,
          webSearchUsed: result.webSearchUsed,
        };
        return response;
      } catch (error) {
        return reply.code(502).send({ error: getMethodRunErrorMessage(error) });
      }
    },
  );

  // App-facing Method execution. FORCED token: /v1/library/* never falls back to
  // the local-direct bypass, so an off-machine relay can reach it safely. No 200
  // response schema: `output` is the method's arbitrary structured JSON.
  app.post<{ Params: { id: string }; Body: RunMethodRequest }>(
    "/v1/library/methods/:id/run",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: RunMethodRequestSchema,
        response: {
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
          502: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const profile = authenticateAppProfile(context.database, request);
      if (!profile) {
        recordAudit(context.database, {
          actorType: "system",
          actorName: "Vaenyx Guard",
          action: "library.method.run",
          decision: "denied",
          reason: "Invalid or disabled App Token.",
          resourceType: "method_request",
        });
        return reply.code(401).send({ error: "A valid App Token is required." });
      }

      const methodId = request.params.id;

      // Allowlist + version lock: the method must be granted to this profile,
      // and unchanged since it was granted.
      const lockedHash = getAppProfileMethodLock(
        context.database,
        profile.id,
        methodId,
      );
      if (!lockedHash) {
        recordAudit(context.database, {
          actorType: "app",
          actorId: profile.id,
          actorName: profile.name,
          action: "library.method.run",
          decision: "denied",
          reason: "Requested Method is outside the App Profile allowlist.",
          resourceType: "method_request",
          resourceId: methodId,
        });
        return reply.code(403).send({
          error: "This App Profile is not allowed to use that method.",
        });
      }

      const method = loadMethod(context.config.libraryDirectory, methodId);
      if (!method) {
        return reply.code(404).send({
          error: "That method is no longer available.",
        });
      }

      if (method.contentHash !== lockedHash) {
        recordAudit(context.database, {
          actorType: "app",
          actorId: profile.id,
          actorName: profile.name,
          action: "library.method.run",
          decision: "denied",
          reason: "Method version changed since it was granted to this app.",
          resourceType: "method",
          resourceId: methodId,
        });
        return reply.code(409).send({
          error:
            "This method changed since it was granted. Ask the Owner to re-grant it.",
        });
      }

      const inputCheck = validateAgainstSchema(
        method.inputSchema,
        request.body.input,
      );
      if (!inputCheck.valid) {
        recordAudit(context.database, {
          actorType: "app",
          actorId: profile.id,
          actorName: profile.name,
          action: "library.method.run",
          decision: "denied",
          reason: "Input did not match the method's input schema.",
          resourceType: "method",
          resourceId: methodId,
        });
        return reply.code(400).send({
          error: `Input does not match this method: ${inputCheck.errors.join("; ")}`,
        });
      }

      // Abort the model turn only if the caller disconnects mid-run. This must
      // listen on reply.raw (the response), NOT request.raw: the request stream
      // emits "close" as soon as Fastify finishes reading the body, which would
      // cancel every run the instant it started.
      const controller = new AbortController();
      reply.raw.on("close", () => {
        if (!reply.raw.writableEnded) controller.abort();
      });

      try {
        const examples = loadMethodExamples(
          context.config.libraryDirectory,
          methodId,
        );
        const result = await executeMethod(
          method,
          examples,
          request.body.input,
          controller.signal,
        );
        recordAudit(context.database, {
          actorType: "app",
          actorId: profile.id,
          actorName: profile.name,
          action: "library.method.run",
          decision: "allowed",
          reason: result.outputValid
            ? "Method run produced output matching its schema."
            : "Method run completed but output did not match its schema.",
          resourceType: "method",
          resourceId: methodId,
        });

        const response: RunMethodResponse = {
          methodId,
          methodVersion: method.version,
          output: result.output,
          outputValid: result.outputValid,
          raw: result.raw,
          webSearchUsed: result.webSearchUsed,
        };
        return response;
      } catch (error) {
        recordAudit(context.database, {
          actorType: "app",
          actorId: profile.id,
          actorName: profile.name,
          action: "library.method.run",
          decision: "denied",
          reason: `Method run failed: ${error instanceof Error ? error.message : "unknown"}`,
          resourceType: "method",
          resourceId: methodId,
        });
        return reply.code(502).send({ error: getMethodRunErrorMessage(error) });
      }
    },
  );

  // App-facing flywheel return (library-architecture §10). This is a KERNEL
  // endpoint (data intake = kernel), NOT a Method. FORCED token + the new
  // sendFeedback permission bit (no bit -> 403). Iron rule = intake only: the
  // correction is written to the LOCAL correction store (SQLite) and nothing
  // else — it never changes the recipe, never auto-publishes, and is not
  // de-identified here (that is a later internal flow, §9). A version mismatch is
  // stored anyway (the version is recorded), per §10.
  app.post<{ Params: { id: string }; Body: SendMethodFeedbackRequest }>(
    "/v1/library/methods/:id/feedback",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: SendMethodFeedbackRequestSchema,
        response: {
          200: SendMethodFeedbackResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const profile = authenticateAppProfile(context.database, request);
      if (!profile) {
        recordAudit(context.database, {
          actorType: "system",
          actorName: "Vaenyx Guard",
          action: "library.method.feedback",
          decision: "denied",
          reason: "Invalid or disabled App Token.",
          resourceType: "method_request",
        });
        return reply.code(401).send({ error: "A valid App Token is required." });
      }

      const methodId = request.params.id;

      // Requires the sendFeedback permission bit (default off; Owner enables it).
      if (!profile.sendFeedback) {
        recordAudit(context.database, {
          actorType: "app",
          actorId: profile.id,
          actorName: profile.name,
          action: "library.method.feedback",
          decision: "denied",
          reason: "App Profile is not permitted to send corrections.",
          resourceType: "method_request",
          resourceId: methodId,
        });
        return reply.code(403).send({
          error: "This App Profile is not allowed to send corrections.",
        });
      }

      // Allowlist: the method must be granted to this profile (same gate as /run,
      // /recipe). Version is NOT required to still match — that is recorded below.
      const lockedHash = getAppProfileMethodLock(
        context.database,
        profile.id,
        methodId,
      );
      if (!lockedHash) {
        recordAudit(context.database, {
          actorType: "app",
          actorId: profile.id,
          actorName: profile.name,
          action: "library.method.feedback",
          decision: "denied",
          reason: "Requested Method is outside the App Profile allowlist.",
          resourceType: "method_request",
          resourceId: methodId,
        });
        return reply.code(403).send({
          error: "This App Profile is not allowed to use that method.",
        });
      }

      const method = loadMethod(context.config.libraryDirectory, methodId);
      if (!method) {
        return reply.code(404).send({
          error: "That method is no longer available.",
        });
      }

      const body = request.body;

      // The version that produced the output. When it still matches the current
      // method version we validate correctedOutput against its output schema; a
      // mismatch is stored anyway (filtered later at training time, §10).
      const versionMatched = method.version === body.version;
      let outputValid: boolean | null = null;
      if (versionMatched && body.correctedOutput !== undefined) {
        const check = validateAgainstSchema(
          method.outputSchema,
          body.correctedOutput,
        );
        if (!check.valid) {
          recordAudit(context.database, {
            actorType: "app",
            actorId: profile.id,
            actorName: profile.name,
            action: "library.method.feedback",
            decision: "denied",
            reason: "Corrected output did not match the method's output schema.",
            resourceType: "method",
            resourceId: methodId,
          });
          return reply.code(400).send({
            error: `Corrected output does not match this method: ${check.errors.join("; ")}`,
          });
        }
        outputValid = true;
      }

      const { id } = recordMethodFeedback(context.database, {
        methodId,
        appProfileId: profile.id,
        appProfileName: profile.name,
        version: body.version,
        contentHash: method.contentHash,
        versionMatched,
        reaction: body.reaction,
        input: body.input,
        aiOutput: body.aiOutput,
        correctedOutput: body.correctedOutput,
        outputValid,
        note: body.note ?? null,
        occurredAt: body.occurredAt ?? null,
      });

      // The flywheel's local half, automatic by default (Oskar, 2026-07-26).
      // A correction that validates against the CURRENT schema becomes an
      // example straight away: it stays on this machine, it can be deleted, and
      // examples are outside the content hash, so nothing an app was granted
      // changes underneath it. A correction that does not validate is kept as a
      // record but never taught — a wrong-shaped example teaches the wrong shape.
      //
      // Sending it on to the Method's publisher is a SEPARATE path with its own
      // consent (Part K): queueForSharing does nothing unless the household
      // turned sharing on, and even then the item sits in a 48-hour window the
      // Owner can pull it out of.
      if (
        autoExamplesEnabled(context.database) &&
        body.reaction === "edited" &&
        outputValid === true &&
        body.input !== undefined &&
        body.correctedOutput !== undefined
      ) {
        try {
          addMethodExample(context.config.libraryDirectory, methodId, {
            input: body.input,
            output: body.correctedOutput,
            note: body.note ?? null,
            source: "contributed",
            contributor: profile.name,
          });
        } catch {
          // The correction is stored either way; failing to teach from it is
          // not a reason to reject the app's request.
        }
        queueForSharing(methodId, {
          input: body.input,
          output: body.correctedOutput,
          note: body.note ?? null,
        });
      }

      recordAudit(context.database, {
        actorType: "app",
        actorId: profile.id,
        actorName: profile.name,
        action: "library.method.feedback",
        decision: "allowed",
        reason: versionMatched
          ? `Correction (${body.reaction}) stored for the flywheel.`
          : `Correction (${body.reaction}) stored; version ${body.version} differs from the current method.`,
        resourceType: "method",
        resourceId: methodId,
      });

      const response: SendMethodFeedbackResponse = { id };
      return reply.code(200).send(response);
    },
  );

  // ── Publishing (library-architecture §16): the Owner signs in with Google,
  // then publishes their own Methods to the community warehouse. Owner-only; the
  // backend commits with its GitHub token, attributed to the Google identity. ──

  app.get(
    "/v1/publish/state",
    {
      schema: {
        response: { 200: PublishStateSchema, 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      const publishedMethodIds = listPublishedIds(context.database, "method");
      const publishedRoutineIds = listPublishedIds(context.database, "routine");
      // G5: which of those no longer match what is on disk.
      const staleMethodIds = listStalePublishedIds(
        context.database,
        "method",
        (id) =>
          loadMethod(context.config.libraryDirectory, id)?.contentHash ?? null,
      );
      const staleRoutineIds = listStalePublishedIds(
        context.database,
        "routine",
        (id) =>
          loadRoutine(
            context.config.routinesDirectory,
            context.config.libraryDirectory,
            id,
          )?.contentHash ?? null,
      );
      // L2: which Methods came from someone else's Skill. Read from disk every
      // time so the gate cannot drift out of step with what is actually there.
      const importedMethodIds = listMethodSummaries(
        context.config.libraryDirectory,
      )
        .filter(
          (method) =>
            getMethodProvenance(context.config.libraryDirectory, method.id) !==
            null,
        )
        .map((method) => method.id);
      // Service mode: publishing routes through the operator-hosted core-cloud
      // service; the Owner signs in there (Google/GitHub) and we hold a session.
      if (context.config.publishServiceUrl) {
        const session = getServiceSession(context.database, owner.id);
        const serviceState: PublishState = {
          mode: "service",
          configured: true,
          identity: null,
          signedInAs: session ? session.displayName : null,
          publishedMethodIds,
          publishedRoutineIds,
          staleMethodIds,
          staleRoutineIds,
          importedMethodIds,
        };
        return serviceState;
      }
      const identityRow = getPublisherIdentity(context.database, owner.id);
      const state: PublishState = {
        mode: "operator",
        configured:
          context.config.publish !== null &&
          context.config.googleOAuth !== null,
        identity: identityRow
          ? {
              email: identityRow.email,
              name: identityRow.name,
              linkedAt: identityRow.updated_at,
            }
          : null,
        signedInAs: identityRow ? identityRow.name : null,
        publishedMethodIds,
        publishedRoutineIds,
        staleMethodIds,
        staleRoutineIds,
        importedMethodIds,
      };
      return state;
    },
  );

  // Begin the Google sign-in: create a single-use state bound to the Owner, then
  // redirect to Google. Owner-only.
  app.get("/v1/auth/google/start", async (request, reply) => {
    const owner = requireOwner(request);
    if (!owner) {
      return reply.code(401).send({ error: "Owner login required." });
    }
    const oauth = context.config.googleOAuth;
    if (!oauth) {
      return reply
        .code(503)
        .send({ error: "Google sign-in is not configured on this server." });
    }
    const redirectUri = pickRedirectUri(oauth, request.headers.host);
    if (!redirectUri) {
      return reply
        .code(503)
        .send({ error: "No Google redirect URI is configured." });
    }
    const state = createOAuthState(context.database, owner.id, redirectUri);
    return reply.redirect(buildGoogleAuthUrl(oauth, redirectUri, state));
  });

  // Google redirects back here. Verify the state (which proves the flow and names
  // the Owner), exchange the code, link the identity, then bounce back to the app.
  app.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    "/v1/auth/google/callback",
    async (request, reply) => {
      const oauth = context.config.googleOAuth;
      if (!oauth) {
        return reply.redirect("/?publish=unconfigured");
      }
      const { code, state, error } = request.query;
      if (error || !code || !state) {
        return reply.redirect("/?publish=cancelled");
      }
      const stateRow = takeOAuthState(context.database, state);
      if (!stateRow) {
        return reply.redirect("/?publish=expired");
      }
      try {
        const profile = await exchangeCodeForProfile(
          oauth,
          code,
          stateRow.redirectUri,
        );
        const identity = linkPublisherIdentity(
          context.database,
          stateRow.ownerId,
          profile,
        );
        recordAudit(context.database, {
          actorType: "owner",
          actorId: stateRow.ownerId,
          actorName: identity.name,
          action: "publish.identity.link",
          decision: "allowed",
          reason: `Linked Google publisher identity ${identity.email}.`,
          resourceType: "publisher_identity",
          resourceId: identity.id,
        });
        return reply.redirect("/?publish=linked");
      } catch (linkError) {
        recordAudit(context.database, {
          actorType: "system",
          actorName: "Vaenyx",
          action: "publish.identity.link",
          decision: "denied",
          reason: `Google sign-in failed: ${linkError instanceof Error ? linkError.message : "unknown"}`,
          resourceType: "publisher_identity",
        });
        return reply.redirect("/?publish=failed");
      }
    },
  );

  // ── Central publish service sign-in (loopback). The app opens
  // /v1/publish-auth/start; we bounce to the service's OAuth with our callback +
  // a single-use state; the service returns the browser here with ?token=; we
  // verify it and store the session. Owner-only at start; the callback is proven
  // by the state (which names the Owner), like the Google flow above. ──
  app.get<{ Querystring: { provider?: string; return_to?: string } }>(
    "/v1/publish-auth/start",
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      const serviceUrl = context.config.publishServiceUrl;
      if (!serviceUrl) {
        return reply
          .code(503)
          .send({ error: "The publish service is not configured." });
      }
      const provider = request.query.provider === "google" ? "google" : "github";
      // Where to send the browser back to after login (the page the user was on).
      // Same-origin path only — never an absolute or protocol-relative URL.
      const rawReturn = request.query.return_to;
      // Same-origin path only: must start with a single "/" and the next char
      // must be neither "/" (protocol-relative) nor "\" (browsers normalize \ to
      // / for http(s), so /\evil.com would resolve off-site).
      const returnTo =
        typeof rawReturn === "string" && /^\/(?![/\\])/.test(rawReturn)
          ? rawReturn
          : "/";
      const host = request.headers.host ?? "localhost:3000";
      const proto = /^(localhost|127\.0\.0\.1)(:|$)/.test(host)
        ? "http"
        : "https";
      const callback = `${proto}://${host}/v1/publish-auth/callback`;
      const state = createOAuthState(context.database, owner.id, callback);
      const redirectUri = `${callback}?state=${encodeURIComponent(state)}&return_to=${encodeURIComponent(returnTo)}`;
      const url = `${serviceUrl}/auth/${provider}/start?redirect_uri=${encodeURIComponent(redirectUri)}`;
      return reply.redirect(url);
    },
  );

  app.get<{
    Querystring: { token?: string; state?: string; return_to?: string };
  }>(
    "/v1/publish-auth/callback",
    async (request, reply) => {
      const rawReturn = request.query.return_to;
      // Same-origin path only: must start with a single "/" and the next char
      // must be neither "/" (protocol-relative) nor "\" (browsers normalize \ to
      // / for http(s), so /\evil.com would resolve off-site).
      const returnTo =
        typeof rawReturn === "string" && /^\/(?![/\\])/.test(rawReturn)
          ? rawReturn
          : "/";
      const dest = (marker: string) =>
        `${returnTo}${returnTo.includes("?") ? "&" : "?"}publish=${marker}`;
      const serviceUrl = context.config.publishServiceUrl;
      if (!serviceUrl) return reply.redirect(dest("unconfigured"));
      const { token, state } = request.query;
      if (!token || !state) return reply.redirect(dest("cancelled"));
      const stateRow = takeOAuthState(context.database, state);
      if (!stateRow) return reply.redirect(dest("expired"));
      const identity = await fetchServiceIdentity(serviceUrl, token);
      if (!identity) return reply.redirect(dest("failed"));
      saveServiceSession(
        context.database,
        stateRow.ownerId,
        token,
        identity.displayName,
      );
      recordAudit(context.database, {
        actorType: "owner",
        actorId: stateRow.ownerId,
        actorName: identity.displayName,
        action: "publish.service.connect",
        decision: "allowed",
        reason: `Connected the publish service as "${identity.displayName}".`,
        resourceType: "system",
      });
      return reply.redirect(dest("linked"));
    },
  );

  // Change the public display name (community byline) on the service. Owner-only.
  app.patch<{ Body: { displayName?: unknown } }>(
    "/v1/publish-auth/display-name",
    {
      schema: {
        response: {
          200: Type.Object(
            { displayName: Type.String() },
            { additionalProperties: false },
          ),
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          502: ErrorResponseSchema,
          503: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      const serviceUrl = context.config.publishServiceUrl;
      if (!serviceUrl) {
        return reply
          .code(503)
          .send({ error: "The publish service is not configured." });
      }
      const session = getServiceSession(context.database, owner.id);
      if (!session) {
        return reply
          .code(403)
          .send({ error: "Connect the publish service first." });
      }
      const displayName =
        typeof request.body?.displayName === "string"
          ? request.body.displayName.trim()
          : "";
      if (displayName.length < 1 || displayName.length > 80) {
        return reply
          .code(400)
          .send({ error: "Enter a display name (1–80 characters)." });
      }
      try {
        const saved = await updateServiceDisplayName(
          serviceUrl,
          session.token,
          displayName,
        );
        saveServiceSession(context.database, owner.id, session.token, saved);
        return reply.code(200).send({ displayName: saved });
      } catch (error) {
        // The service blocks names that could be mistaken for Vaenyx staff.
        if (
          error instanceof Error &&
          error.message.includes("RESERVED_NAME")
        ) {
          return reply.code(400).send({
            error:
              "That name is reserved — pick something that couldn't be mistaken for Vaenyx or its staff.",
          });
        }
        return reply
          .code(502)
          .send({ error: "Could not update your display name. Try again." });
      }
    },
  );

  app.delete(
    "/v1/publish-auth",
    {
      schema: {
        response: { 200: MessageResponseSchema, 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      clearServiceSession(context.database, owner.id);
      return { message: "Disconnected from the publish service." };
    },
  );

  // --- Publish acceptance plumbing (copy pack clause 2.3 + G3a) ---

  // Record the G2 (Contributor Agreement) + G2a (warranty) acceptance locally,
  // tied to the contribution; in service mode the service also writes its own
  // rows server-side against the publishing account.
  function recordPublishAcceptanceLocally(
    ownerId: string,
    acceptance: PublishAcceptanceRequest["acceptance"],
    contributionId: string,
  ): void {
    for (const keyName of [
      "legal.notice.publish.contributorTerms",
      "legal.consent.publish.warranty",
    ]) {
      recordLegalAcknowledgement(context.database, {
        keyName,
        copyVersion: acceptance.copyVersion,
        language: acceptance.language,
        profileId: ownerId,
        choice: contributionId,
      });
    }
  }

  // Ensure the account's G3a overseas-disclosure consent is recorded on the
  // publish service (privacy-policy 14.2 makes it an operative condition of
  // publishing). The consent is ticked at the sign-in step and recorded locally;
  // it is pushed up to the account the first time a publish needs it. A service
  // without the /acceptance route (older deploy) returns null = cannot check —
  // skipped, matching that build's non-enforcement.
  async function ensureOverseasConsentOnService(
    ownerId: string,
    serviceUrl: string,
    token: string,
  ): Promise<string | null> {
    const records = await fetchServiceAcceptances(serviceUrl, token);
    if (records === null) return null;
    if (records === "unavailable") {
      // A transient failure must BLOCK (retryable), never silently skip the
      // operative consent check (privacy-policy 14.2).
      return "Vaenyx could not check the publish-service consent records. Try again.";
    }
    if (
      records.some((row) => row.keyName === "legal.consent.publish.overseas")
    ) {
      return null;
    }
    const local = listLegalAcknowledgements(context.database, ownerId).find(
      (ack) => ack.keyName === "legal.consent.publish.overseas",
    );
    if (!local) {
      return "Publishing needs the overseas-disclosure consent. Disconnect and sign in to the publish service again to confirm it.";
    }
    const pushed = await recordServiceAcceptance(serviceUrl, token, {
      keyName: "legal.consent.publish.overseas",
      copyVersion: local.copyVersion,
      language: local.language,
    });
    return pushed
      ? null
      : "Vaenyx could not record the overseas-disclosure consent with the publish service. Try again.";
  }

  // Publish one of the Owner's Methods to the community warehouse. Owner-only;
  // requires a linked Google identity + configured GitHub token. Every publish
  // carries the G2/G2a acceptance (copy pack clause 2.3).
  app.post<{ Params: { id: string }; Body: PublishAcceptanceRequest }>(
    "/v1/library/methods/:id/publish",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: PublishAcceptanceRequestSchema,
        response: {
          200: PublishMethodResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
          502: ErrorResponseSchema,
          503: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      // Service mode: collect the same files and hand them to the core-cloud
      // service, which holds the bot token and commits on the Owner's behalf.
      if (context.config.publishServiceUrl) {
        const serviceUrl = context.config.publishServiceUrl;
        const session = getServiceSession(context.database, owner.id);
        if (!session) {
          return reply
            .code(403)
            .send({ error: "Connect the publish service before publishing." });
        }
        const method = loadMethod(
          context.config.libraryDirectory,
          request.params.id,
        );
        if (!method) {
          return reply.code(404).send({ error: "That method was not found." });
        }
        const consentError = await ensureOverseasConsentOnService(
          owner.id,
          serviceUrl,
          session.token,
        );
        if (consentError) {
          return reply.code(403).send({ error: consentError });
        }
        try {
          const files = collectMethodFiles(
            context.config.libraryDirectory,
            method.id,
            session.displayName,
          );
          const { commitSha, url } = await publishViaService(
            serviceUrl,
            session.token,
            {
              kind: "method",
              itemId: method.id,
              version: method.version,
              contentHash: method.contentHash,
              files,
              // The legal set ships as one versioned train, so the copy version
              // is also the Contributor Agreement version accepted.
              acceptance: {
                ...request.body.acceptance,
                agreementVersion: request.body.acceptance.copyVersion,
              },
            },
          );
          recordServicePublish(
            context.database,
            "method",
            method.id,
            method.contentHash,
            session.displayName,
            commitSha,
          );
          // K9: whether this publisher wants corrections about it. Off unless
          // asked for, and a failure here is not a failed publish — the item is
          // already live, and off is the safe direction to fail in.
          if (request.body.receiveExamples === true) {
            void setServiceReceiving(serviceUrl, session.token, {
              kind: "method",
              itemId: method.id,
              receive: true,
            });
          }
          recordPublishAcceptanceLocally(
            owner.id,
            request.body.acceptance,
            `method:${method.id}@${method.version}`,
          );
          recordAudit(context.database, {
            actorType: "owner",
            actorId: owner.id,
            actorName: session.displayName,
            action: "library.method.publish",
            decision: "allowed",
            reason: `Published method ${method.id} v${method.version} via the publish service.`,
            resourceType: "method",
            resourceId: method.id,
          });
          const response: PublishMethodResponse = {
            kind: "method",
            itemId: method.id,
            version: method.version,
            contentHash: method.contentHash,
            commitSha,
            url: url || context.config.catalogueBaseUrl,
          };
          return reply.code(200).send(response);
        } catch (publishError) {
          const message =
            publishError instanceof Error ? publishError.message : "unknown";
          recordAudit(context.database, {
            actorType: "owner",
            actorId: owner.id,
            actorName: session.displayName,
            action: "library.method.publish",
            decision: "denied",
            reason: `Service publish failed: ${message}`,
            resourceType: "method",
            resourceId: method.id,
          });
          return reply.code(502).send({
            error: "Vaenyx could not publish via the service. Try again.",
          });
        }
      }

      const credentials = context.config.publish;
      if (!credentials) {
        return reply
          .code(503)
          .send({ error: "Publishing is not configured on this server." });
      }
      const identity = getPublisherIdentity(context.database, owner.id);
      if (!identity) {
        return reply
          .code(403)
          .send({ error: "Sign in with Google before publishing." });
      }
      const methodId = request.params.id;
      try {
        const result = await publishMethod(
          {
            credentials,
            libraryDirectory: context.config.libraryDirectory,
            catalogueBaseUrl: context.config.catalogueBaseUrl,
          },
          context.database,
          methodId,
          identity,
        );
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: identity.name,
          action: "library.method.publish",
          decision: "allowed",
          reason: `Published method ${methodId} v${result.version} to the community warehouse.`,
          resourceType: "method",
          resourceId: methodId,
        });
        recordPublishAcceptanceLocally(
          owner.id,
          request.body.acceptance,
          `method:${methodId}@${result.version}`,
        );
        const response: PublishMethodResponse = {
          kind: "method",
          itemId: result.itemId,
          version: result.version,
          contentHash: result.contentHash,
          commitSha: result.commitSha,
          url: result.url,
        };
        return reply.code(200).send(response);
      } catch (publishError) {
        const message =
          publishError instanceof Error ? publishError.message : "unknown";
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: identity.name,
          action: "library.method.publish",
          decision: "denied",
          reason: `Publish failed: ${message}`,
          resourceType: "method",
          resourceId: methodId,
        });
        if (message.startsWith("METHOD_NOT_FOUND")) {
          return reply.code(404).send({ error: "That method was not found." });
        }
        return reply.code(502).send({
          error: "Vaenyx could not publish to the warehouse. Try again.",
        });
      }
    },
  );

  // Publish one of the Owner's Routines (and its dependency Methods) to the
  // community warehouse. Owner-only; requires a linked Google identity. Every
  // publish carries the G2/G2a acceptance (copy pack clause 2.3).
  app.post<{ Params: { id: string }; Body: PublishAcceptanceRequest }>(
    "/v1/library/routines/:id/publish",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: PublishAcceptanceRequestSchema,
        response: {
          200: PublishRoutineResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
          502: ErrorResponseSchema,
          503: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      // Service mode: collect the routine + its dependency methods and hand them
      // to the core-cloud service for one commit.
      if (context.config.publishServiceUrl) {
        const serviceUrl = context.config.publishServiceUrl;
        const session = getServiceSession(context.database, owner.id);
        if (!session) {
          return reply
            .code(403)
            .send({ error: "Connect the publish service before publishing." });
        }
        const routineId = request.params.id;
        const consentError = await ensureOverseasConsentOnService(
          owner.id,
          serviceUrl,
          session.token,
        );
        if (consentError) {
          return reply.code(403).send({ error: consentError });
        }
        try {
          const collected = collectRoutineFiles(
            context.config.routinesDirectory,
            context.config.libraryDirectory,
            routineId,
            session.displayName,
          );
          const { commitSha, url } = await publishViaService(
            serviceUrl,
            session.token,
            {
              kind: "routine",
              itemId: routineId,
              version: collected.version,
              contentHash: collected.contentHash,
              files: collected.files,
              // Same versioned-train note as the method publish above.
              acceptance: {
                ...request.body.acceptance,
                agreementVersion: request.body.acceptance.copyVersion,
              },
            },
          );
          recordServicePublish(
            context.database,
            "routine",
            routineId,
            collected.contentHash,
            session.displayName,
            commitSha,
          );
          // K9, same as the Method path: asked for, or off.
          if (request.body.receiveExamples === true) {
            void setServiceReceiving(serviceUrl, session.token, {
              kind: "routine",
              itemId: routineId,
              receive: true,
            });
          }
          for (const dep of collected.depMethods) {
            recordServicePublish(
              context.database,
              "method",
              dep.id,
              dep.contentHash,
              session.displayName,
              commitSha,
            );
          }
          recordAudit(context.database, {
            actorType: "owner",
            actorId: owner.id,
            actorName: session.displayName,
            action: "library.routine.publish",
            decision: "allowed",
            reason: `Published routine ${routineId} v${collected.version} via the publish service.`,
            resourceType: "routine",
            resourceId: routineId,
          });
          recordPublishAcceptanceLocally(
            owner.id,
            request.body.acceptance,
            `routine:${routineId}@${collected.version}`,
          );
          const response: PublishRoutineResponse = {
            kind: "routine",
            itemId: routineId,
            version: collected.version,
            contentHash: collected.contentHash,
            commitSha,
            url: url || context.config.catalogueBaseUrl,
          };
          return reply.code(200).send(response);
        } catch (publishError) {
          const message =
            publishError instanceof Error ? publishError.message : "unknown";
          recordAudit(context.database, {
            actorType: "owner",
            actorId: owner.id,
            actorName: session.displayName,
            action: "library.routine.publish",
            decision: "denied",
            reason: `Service publish failed: ${message}`,
            resourceType: "routine",
            resourceId: routineId,
          });
          if (message.startsWith("ROUTINE_NOT_FOUND")) {
            return reply.code(404).send({ error: "That routine was not found." });
          }
          if (message.startsWith("ROUTINE_UNRESOLVED")) {
            return reply.code(409).send({
              error:
                "This routine has unresolved Method dependencies. Fix them first.",
            });
          }
          return reply.code(502).send({
            error: "Vaenyx could not publish via the service. Try again.",
          });
        }
      }

      const credentials = context.config.publish;
      if (!credentials) {
        return reply
          .code(503)
          .send({ error: "Publishing is not configured on this server." });
      }
      const identity = getPublisherIdentity(context.database, owner.id);
      if (!identity) {
        return reply
          .code(403)
          .send({ error: "Sign in with Google before publishing." });
      }
      const routineId = request.params.id;
      try {
        const result = await publishRoutine(
          {
            credentials,
            libraryDirectory: context.config.libraryDirectory,
            routinesDirectory: context.config.routinesDirectory,
            catalogueBaseUrl: context.config.catalogueBaseUrl,
          },
          context.database,
          routineId,
          identity,
        );
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: identity.name,
          action: "library.routine.publish",
          decision: "allowed",
          reason: `Published routine ${routineId} v${result.version} to the community warehouse.`,
          resourceType: "routine",
          resourceId: routineId,
        });
        recordPublishAcceptanceLocally(
          owner.id,
          request.body.acceptance,
          `routine:${routineId}@${result.version}`,
        );
        const response: PublishRoutineResponse = {
          kind: "routine",
          itemId: result.itemId,
          version: result.version,
          contentHash: result.contentHash,
          commitSha: result.commitSha,
          url: result.url,
        };
        return reply.code(200).send(response);
      } catch (publishError) {
        const message =
          publishError instanceof Error ? publishError.message : "unknown";
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: identity.name,
          action: "library.routine.publish",
          decision: "denied",
          reason: `Publish failed: ${message}`,
          resourceType: "routine",
          resourceId: routineId,
        });
        if (message.startsWith("ROUTINE_NOT_FOUND")) {
          return reply.code(404).send({ error: "That routine was not found." });
        }
        if (message.startsWith("ROUTINE_UNRESOLVED")) {
          return reply.code(409).send({
            error:
              "This routine has unresolved Method dependencies. Fix them first.",
          });
        }
        return reply.code(502).send({
          error: "Vaenyx could not publish to the warehouse. Try again.",
        });
      }
    },
  );

  // App-facing Routine Token run: the token references one Routine; Vaenyx runs
  // the whole flow STATELESSLY (no Journal/Gallery — the app keeps its own data)
  // and returns the result. FORCED token; version-locked to the Routine pinned at
  // grant. No 200 schema: output is arbitrary structured JSON.
  app.post<{ Params: { id: string }; Body: RunMethodRequest }>(
    "/v1/library/routines/:id/run",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: RunMethodRequestSchema,
        response: {
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
          502: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const profile = authenticateAppProfile(context.database, request);
      if (!profile) {
        recordAudit(context.database, {
          actorType: "system",
          actorName: "Vaenyx Guard",
          action: "library.routine.run",
          decision: "denied",
          reason: "Invalid or disabled App Token.",
          resourceType: "routine_request",
        });
        return reply.code(401).send({ error: "A valid App Token is required." });
      }

      const routineId = request.params.id;

      // This must be a Routine Token for exactly this routine (the version lock
      // doubles as the allowlist — only the granted routine has a pinned hash).
      const lockedHash = getAppProfileRoutineLock(
        context.database,
        profile.id,
        routineId,
      );
      if (!lockedHash) {
        recordAudit(context.database, {
          actorType: "app",
          actorId: profile.id,
          actorName: profile.name,
          action: "library.routine.run",
          decision: "denied",
          reason: "Requested Routine is not what this token grants.",
          resourceType: "routine_request",
          resourceId: routineId,
        });
        return reply.code(403).send({
          error: "This token is not allowed to run that routine.",
        });
      }

      const routine = loadRoutine(
        context.config.routinesDirectory,
        context.config.libraryDirectory,
        routineId,
      );
      if (!routine) {
        return reply.code(404).send({
          error: "That routine is no longer available.",
        });
      }
      if (routine.contentHash !== lockedHash) {
        recordAudit(context.database, {
          actorType: "app",
          actorId: profile.id,
          actorName: profile.name,
          action: "library.routine.run",
          decision: "denied",
          reason: "Routine version changed since it was granted to this app.",
          resourceType: "routine",
          resourceId: routineId,
        });
        return reply.code(409).send({
          error:
            "This routine changed since it was granted. Ask the Owner to re-grant it.",
        });
      }

      const controller = new AbortController();
      reply.raw.on("close", () => {
        if (!reply.raw.writableEnded) controller.abort();
      });

      try {
        const result = await runRoutine(
          context.database,
          context.config.routinesDirectory,
          context.config.libraryDirectory,
          routineId,
          request.body.input,
          controller.signal,
          { stateless: true },
        );
        recordAudit(context.database, {
          actorType: "app",
          actorId: profile.id,
          actorName: profile.name,
          action: "library.routine.run",
          decision: "allowed",
          reason: result.outputValid
            ? "Routine run produced output matching its final schema."
            : "Routine run completed but final output did not match its schema.",
          resourceType: "routine",
          resourceId: routineId,
        });
        return result;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.startsWith("STEP_INPUT_INVALID")
        ) {
          return reply.code(400).send({
            error: `Input did not match the routine's first step: ${error.message.split(":").slice(2).join(":")}`,
          });
        }
        if (
          error instanceof Error &&
          error.message.startsWith("ROUTINE_UNRESOLVED")
        ) {
          return reply.code(409).send({
            error:
              "This routine depends on a Method that changed or is missing. Ask the Owner to re-grant it.",
          });
        }
        recordAudit(context.database, {
          actorType: "app",
          actorId: profile.id,
          actorName: profile.name,
          action: "library.routine.run",
          decision: "denied",
          reason: `Routine run failed: ${error instanceof Error ? error.message : "unknown"}`,
          resourceType: "routine",
          resourceId: routineId,
        });
        return reply.code(502).send({ error: getMethodRunErrorMessage(error) });
      }
    },
  );

  // App-facing Mode B (library-architecture §13): a permitted app fetches a
  // method's recipe + schemas + examples to run on ITS OWN model. FORCED token;
  // requires the fetchRecipe permission + the method on the allowlist at the
  // granted version. No 200 response schema (schemas/examples are arbitrary
  // JSON). Mode A (/run) is unaffected.
  app.get<{ Params: { id: string } }>(
    "/v1/library/methods/:id/recipe",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        response: {
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const profile = authenticateAppProfile(context.database, request);
      if (!profile) {
        recordAudit(context.database, {
          actorType: "system",
          actorName: "Vaenyx Guard",
          action: "library.method.fetchRecipe",
          decision: "denied",
          reason: "Invalid or disabled App Token.",
          resourceType: "method_request",
        });
        return reply.code(401).send({ error: "A valid App Token is required." });
      }

      const methodId = request.params.id;

      if (!profile.fetchRecipe) {
        recordAudit(context.database, {
          actorType: "app",
          actorId: profile.id,
          actorName: profile.name,
          action: "library.method.fetchRecipe",
          decision: "denied",
          reason: "App Profile is not permitted to fetch method recipes.",
          resourceType: "method_request",
          resourceId: methodId,
        });
        return reply.code(403).send({
          error: "This App Profile is not allowed to fetch method recipes.",
        });
      }

      const lockedHash = getAppProfileMethodLock(
        context.database,
        profile.id,
        methodId,
      );
      if (!lockedHash) {
        recordAudit(context.database, {
          actorType: "app",
          actorId: profile.id,
          actorName: profile.name,
          action: "library.method.fetchRecipe",
          decision: "denied",
          reason: "Requested Method is outside the App Profile allowlist.",
          resourceType: "method_request",
          resourceId: methodId,
        });
        return reply.code(403).send({
          error: "This App Profile is not allowed to use that method.",
        });
      }

      const method = loadMethod(context.config.libraryDirectory, methodId);
      if (!method) {
        return reply.code(404).send({
          error: "That method is no longer available.",
        });
      }

      if (method.contentHash !== lockedHash) {
        recordAudit(context.database, {
          actorType: "app",
          actorId: profile.id,
          actorName: profile.name,
          action: "library.method.fetchRecipe",
          decision: "denied",
          reason: "Method version changed since it was granted to this app.",
          resourceType: "method",
          resourceId: methodId,
        });
        return reply.code(409).send({
          error:
            "This method changed since it was granted. Ask the Owner to re-grant it.",
        });
      }

      // ETag caching (§13 ②): the contentHash is the ETag. The first fetch needs
      // no If-None-Match; a later fetch may send it — exact match means the
      // caller's cached recipe is current, so return 304 (no body). Anything else
      // falls through to the full 200 payload below. The version lock above never
      // blocks a first fetch (a fresh grant pins the current hash).
      reply.header("etag", `"${method.contentHash}"`);
      const ifNoneMatchRaw = request.headers["if-none-match"];
      const ifNoneMatch = (
        Array.isArray(ifNoneMatchRaw) ? ifNoneMatchRaw[0] : ifNoneMatchRaw
      )
        ?.replace(/^W\//, "")
        .replace(/"/g, "")
        .trim();
      if (ifNoneMatch && ifNoneMatch === method.contentHash) {
        return reply.code(304).send();
      }

      const examples = loadMethodExamples(
        context.config.libraryDirectory,
        methodId,
        FETCH_RECIPE_EXAMPLE_LIMIT,
      );
      recordAudit(context.database, {
        actorType: "app",
        actorId: profile.id,
        actorName: profile.name,
        action: "library.method.fetchRecipe",
        decision: "allowed",
        reason: "App fetched the method recipe to run on its own model.",
        resourceType: "method",
        resourceId: methodId,
      });

      const response: FetchMethodRecipeResponse = {
        id: method.id,
        version: method.version,
        contentHash: method.contentHash,
        recipe: method.recipe,
        inputSchema: method.inputSchema,
        outputSchema: method.outputSchema,
        examples,
      };
      return response;
    },
  );

  app.get(
    "/v1/memories",
    {
      schema: {
        response: {
          200: Type.Array(ProjectMemorySchema),
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      return listProjectMemories(context.database, undefined, owner.modeId);
    },
  );

  app.post<{ Body: CreateProjectMemoryRequest }>(
    "/v1/memories",
    {
      schema: {
        body: CreateProjectMemoryRequestSchema,
        response: {
          200: ProjectMemorySchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      if (!request.body.title.trim() || !request.body.content.trim()) {
        return reply
          .code(400)
          .send({ error: "Memory title and content are required." });
      }

      try {
        const memory = createProjectMemory(
          context.database,
          request.body,
          owner.modeId,
        );
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "memory.create",
          decision: "allowed",
          reason: "Owner created an explicit project memory.",
          projectId: memory.projectId,
          resourceType: "project_memory",
          resourceId: memory.id,
        });
        return memory;
      } catch (error) {
        if (error instanceof Error && error.message === "PROJECT_NOT_FOUND") {
          return reply.code(400).send({ error: "Project not found." });
        }
        throw error;
      }
    },
  );

  app.put<{ Body: UpdateProjectMemoryRequest; Params: { id: string } }>(
    "/v1/memories/:id",
    {
      schema: {
        params: Type.Object({ id: Type.String({ minLength: 1 }) }),
        body: UpdateProjectMemoryRequestSchema,
        response: {
          200: ProjectMemorySchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      if (!request.body.title.trim() || !request.body.content.trim()) {
        return reply
          .code(400)
          .send({ error: "Memory title and content are required." });
      }

      try {
        const memory = updateProjectMemory(
          context.database,
          request.params.id,
          request.body,
        );
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "memory.update",
          decision: "allowed",
          reason: "Owner edited an explicit project memory.",
          projectId: memory.projectId,
          resourceType: "project_memory",
          resourceId: memory.id,
        });
        return memory;
      } catch (error) {
        if (error instanceof Error && error.message === "MEMORY_NOT_FOUND") {
          return reply.code(404).send({ error: "Memory not found." });
        }
        throw error;
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/v1/memories/:id",
    {
      schema: {
        params: Type.Object({ id: Type.String({ minLength: 1 }) }),
        response: {
          200: MessageResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      try {
        const memory = deleteProjectMemory(context.database, request.params.id);
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "memory.delete",
          decision: "allowed",
          reason: "Owner deleted an explicit project memory.",
          projectId: memory.projectId,
          resourceType: "project_memory",
          resourceId: memory.id,
        });
        return { message: "Memory deleted." };
      } catch (error) {
        if (error instanceof Error && error.message === "MEMORY_NOT_FOUND") {
          return reply.code(404).send({ error: "Memory not found." });
        }
        throw error;
      }
    },
  );

  app.get(
    "/v1/guard/audit",
    {
      schema: {
        response: {
          200: Type.Array(AuditEventSchema),
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      if (!requireOwner(request)) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      return listAuditEvents(context.database);
    },
  );

  app.get(
    "/v1/settings",
    {
      schema: {
        response: {
          200: InstanceSettingsSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      if (!requireOwner(request)) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      return getInstanceSettings(context.config, context.database);
    },
  );

  app.put<{ Body: UpdateInstanceSettingsRequest }>(
    "/v1/settings",
    {
      schema: {
        body: UpdateInstanceSettingsRequestSchema,
        response: {
          200: InstanceSettingsSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      if (!request.body.instanceName.trim()) {
        return reply.code(400).send({ error: "Instance name is required." });
      }

      const settings = updateInstanceSettings(
        context.config,
        context.database,
        request.body,
      );
      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "settings.update",
        decision: "allowed",
        reason: "Owner updated visible instance settings.",
        resourceType: "instance_settings",
      });
      return settings;
    },
  );

  app.post(
    "/v1/settings/forge-test",
    {
      schema: {
        response: {
          200: ForgeConnectionTestResultSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      const check = "Forge read-only repository inspection";
      const startedAt = Date.now();
      const timestamp = new Date().toISOString();

      try {
        const output = await runForgeReadOnly(
          "Inspect the root package.json in the current repository and answer only with the package name.",
        );
        const passed = /\bvaenyx\b/i.test(output);
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "provider.forge_test",
          decision: passed ? "allowed" : "denied",
          reason: passed
            ? "Forge connection test completed through ChatGPT Subscription Auth."
            : "Forge responded, but Vaenyx could not verify the expected repository result.",
          resourceType: "provider_connection",
        });

        return {
          status: passed ? "passed" : "failed",
          check,
          durationMs: Date.now() - startedAt,
          message: passed
            ? "Forge is connected. It used ChatGPT / Codex Auth and inspected the Vaenyx repository in read-only mode."
            : "Forge responded, but Vaenyx could not verify the expected repository result.",
          output,
          timestamp,
        };
      } catch (error) {
        const message = getForgeTestFailureMessage(error);
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "provider.forge_test",
          decision: "denied",
          reason: message,
          resourceType: "provider_connection",
        });

        return {
          status: "failed",
          check,
          durationMs: Date.now() - startedAt,
          message,
          output: null,
          timestamp,
        };
      }
    },
  );

  app.post<{ Body: ChatConnectionTestRequest }>(
    "/v1/settings/chat-test",
    {
      schema: {
        body: ChatConnectionTestRequestSchema,
        response: {
          200: ChatConnectionTestResultSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);

      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      const prompt = request.body.prompt.trim();

      if (!prompt) {
        return reply.code(400).send({ error: "Chat prompt is required." });
      }

      const check = "ChatGPT Subscription Auth quick chat";
      const startedAt = Date.now();
      const timestamp = new Date().toISOString();

      if (isLiveDataPrompt(prompt)) {
        const message =
          "This quick chat test is connected, but it does not browse or use tools. Live prices, weather, news, and other current-data questions are blocked here.";
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "provider.chat_test",
          decision: "denied",
          reason: message,
          resourceType: "provider_connection",
        });

        return {
          status: "blocked",
          check,
          durationMs: Date.now() - startedAt,
          message,
          output: null,
          timestamp,
        };
      }

      try {
        const output = await runCodexChatTest(prompt);
        const passed = output.trim().length > 0;
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "provider.chat_test",
          decision: passed ? "allowed" : "denied",
          reason: passed
            ? "Chat test completed through ChatGPT Subscription Auth without exposing tokens."
            : "Chat test returned no visible answer.",
          resourceType: "provider_connection",
        });

        return {
          status: passed ? "passed" : "failed",
          check,
          durationMs: Date.now() - startedAt,
          message: passed
            ? "Chat test passed. Vaenyx can send a simple prompt through your ChatGPT / Codex account."
            : "Chat test returned no visible answer.",
          output,
          timestamp,
        };
      } catch (error) {
        const message = getChatTestFailureMessage(error);
        const blocked =
          error instanceof Error &&
          error.message === "CODEX_CHAT_BOUNDARY_VIOLATION";
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "provider.chat_test",
          decision: "denied",
          reason: message,
          resourceType: "provider_connection",
        });

        return {
          status: blocked ? "blocked" : "failed",
          check,
          durationMs: Date.now() - startedAt,
          message,
          output: null,
          timestamp,
        };
      }
    },
  );
}
