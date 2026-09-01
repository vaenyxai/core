import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { Type } from "@sinclair/typebox";
import {
  AppAskRequestSchema,
  ApproveVaenyxMeCandidateRequestSchema,
  AgentProfileSchema,
  AppProfileSchema,
  type AppProfile,
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
  ModeCapabilitiesSchema,
  SwitchModeRequestSchema,
  type SwitchModeRequest,
  ExitModeRequestSchema,
  type ExitModeRequest,
  PushPrefsSchema,
  UpdateStatusSchema,
  PhoneAccessStatusSchema,
  PhoneLoginResponseSchema,
  PhoneTunnelResponseSchema,
  DeviceModeSchema,
  SetDeviceModeRequestSchema,
  type SetDeviceModeRequest,
  ApplyDeviceModeResponseSchema,
  StopTurnRequestSchema,
  FactsResponseSchema,
  RecordFactRequestSchema,
  type RecordFactRequest,
  VisionStatusSchema,
  ConnectVisionRequestSchema,
  EnginePairSchema,
  SetEngineChoiceRequestSchema,
  type SetEngineChoiceRequest,
  type ConnectVisionRequest,
  VisionDescribeResponseSchema,
  VisionUploadResponseSchema,
  AnnotateImageRequestSchema,
  type AnnotateImageRequest,
  AnnotateImageResponseSchema,
  SaveAnnotationsRequestSchema,
  type SaveAnnotationsRequest,
  type ImageAnnotationItem,
  DocumentUploadResponseSchema,
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
  RoutineEditSaveRequestSchema,
  ProposeRoutineEditRequestSchema,
  RoutineEditTestRequestSchema,
  RoutineChatIntentRequestSchema,
  RoutineChatIntentResponseSchema,
  type RoutineChatIntentRequest,
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
  UpdateAppProfileCapabilitiesRequestSchema,
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
  type RoutineEditSaveRequest,
  type ProposeRoutineEditRequest,
  type RoutineEditTestRequest,
  type InstallRoutineRequest,
  type InstallMethodRequest,
  type LegalAcknowledgeRequest,
  type SetSharingPreferenceRequest,
  type DraftRecipeEditRequest,
  type AdoptCorrectionRequest,
  type PreviewSkillRequest,
  type ImportSkillRequest,
  InboxSummarySchema,
  PendingCorrectionsResponseSchema,
  RegressionListResponseSchema,
  RegressionResultSchema,
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
  type UpdateAppProfileCapabilitiesRequest,
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
  RelayHealthSchema,
  RelayPanelSchema,
  RelayRunRequestSchema,
  RelayRunResponseSchema,
  RelaySettingsSchema,
  CapabilityTestResultSchema,
  UpdateRelaySettingsRequestSchema,
  RelayProfileStatusSchema,
  RelayProfileLoginStartRequestSchema,
  RelayProfileLoginStartResponseSchema,
  RelayProfileLoginCompleteRequestSchema,
  RelayProfileLoginCompleteResponseSchema,
  RelayProfileDisconnectRequestSchema,
  RelayRotateKeyResponseSchema,
  RelayUsageResponseSchema,
  type RelayProfileLoginStartRequest,
  type RelayProfileLoginCompleteRequest,
  type RelayProfileDisconnectRequest,
  type RelayRunRequest,
  type UpdateRelaySettingsRequest,
} from "@vaenyx/contracts";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

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
  relockMethodGrants,
  createAppProfile,
  deleteAppProfile,
  disableAppProfile,
  enableAppProfile,
  getAppProfileMethodLock,
  getAppProfileRoutineLock,
  listAppProfiles,
  appProfileKeyInfo,
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
  pushLanguage,
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
  isLocalTtsInstalled,
  removeLocalTts,
  startLocalTtsInstall,
} from "../core/voice-local.js";
import {
  checkForUpdate,
  getUpdateStatus,
  stageUpdate,
} from "../core/updates.js";
import {
  annotateImage,
  describeImage,
  getVisionStatus,
  readImage,
  saveImage,
  setVisionEngine,
} from "../core/vision.js";
import {
  DOCUMENT_GATE_PAGES,
  MAX_DOCUMENT_BYTES,
  MAX_DOCUMENT_PAGES,
  inspectDocument,
  saveDocument,
} from "../core/documents.js";
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
import {
  countPendingCorrections,
  getFeedbackById,
  listAdoptableFeedback,
  markFeedbackAdopted,
  recordMethodFeedback,
} from "../core/method-feedback.js";
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
  routineAnnotateFocus,
  toLibraryRoutine,
} from "../core/routines.js";
import {
  runRoutine,
  buildChatRoutineInput,
  describeRoutineInputFields,
  parseChatRoutineInput,
} from "../core/routine-run.js";
import {
  proposeRoutineEdit,
  readRoutineEditDraft,
  RoutineEditError,
  routineInputSchemaRev,
  runRoutineEditTest,
  saveRoutineEdit,
} from "../core/routine-edit.js";
import {
  buildProvenance,
  exportMethodAsSkill,
  previewSkillImport,
} from "../core/skills-interop.js";
import {
  buildImagePrompt,
  connectWorkersAi,
  generateImage,
  getImageEngineStatus,
  setImageEngine,
  type ImageEngineChoice,
} from "../core/image-gen.js";
import {
  classifyRoutineChatMessage,
  classifyRoutineIntent,
} from "../core/routine-intent.js";
import { getFreePicks, refreshFreePicks } from "../core/free-picks.js";
import { getDefaultProvider, initModelRegistry } from "../models/registry.js";
import type { ModelProvider } from "../models/provider.js";
import {
  fetchCatalogue,
  installRoutine,
  installMethod,
} from "../core/catalogue.js";
import {
  recordLegalAcknowledgement,
  listLegalAcknowledgements,
} from "../core/legal-records.js";
import {
  WINDOW_HOURS,
  getContributorId,
  listQueue,
  queueExample,
  releaseSensitive,
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
  readStoredAnnotations,
} from "../core/routine-storage.js";
import {
  backupNoteSentence,
  ENGINE_SLOTS,
  readEnginePair,
  writeEngineChoice,
} from "../models/engine-slots.js";
import {
  listProviderModels,
  ModelCatalogueUnavailableError,
} from "../models/catalogue.js";
import { readProviderConnections } from "../models/connections.js";
import { writeAppLanguage } from "../core/app-language.js";
import {
  connectModelProvider,
  disconnectModelProvider,
  listModelProviders,
  providerDisplayName,
  setDefaultModelProvider,
} from "../models/provider-settings.js";
import {
  cancelClaudeLogin,
  claudeMachineLogin,
  disconnectClaudeProfile,
  grantClaudeLoginToProfile,
  startClaudeLogin,
  submitClaudeLoginCode,
} from "../models/claude-login.js";
import { ensureClaudeSdkInstalled } from "../models/claude-sdk.js";
import { componentProgress } from "../core/wanted-components.js";
import { updateMethod, updateRoutine } from "../core/catalogue.js";
import {
  describeUpdate,
  recommendedAction,
} from "../core/community-updates.js";
import {
  availableRollback,
  getInstalledItem,
  keepRollback,
  listInstalledItems,
  recordInstall,
  restoreRollback,
  setUpdatePolicy,
} from "../core/install-ledger.js";
import { methodContentHash } from "../core/methods.js";
import {
  forkMethod,
  freeForkId,
  mayReturnCorrectionsUpstream,
  suggestForkName,
  toFolderId,
} from "../core/fork-method.js";
import { listExampleProvenance } from "../core/example-origin.js";
import { ensureInboxThread, postInboxNote } from "../core/inbox-thread.js";
import {
  clearRegression,
  listRegressions,
  recordRegression,
  runRegression,
} from "../core/update-regression.js";

// Six cases is the cap on one check: enough that a broken update shows up, few
// enough that pressing the button is never a decision worth agonising over.
// Each one is a real model call somebody pays for.
const REGRESSION_CASE_LIMIT = 6;
import { approveFactCandidate } from "../core/facts-extract.js";
import {
  listCurrentFacts,
  listFactHistory,
  recordFact,
  retireFact,
  searchFacts,
} from "../core/facts.js";
import {
  createProjectMemory,
  deleteProjectMemory,
  listProjectMemories,
  updateProjectMemory,
} from "../core/memory.js";
import {
  appendAssistantNote,
  conversationHasPhoto,
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
  markVaenyxThreadSeen,
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
  codexProfileSignedIn,
  disconnectCodexProfile,
  ensureCodexInstalled,
  grantCodexLoginToProfile,
  runCodexChatTest,
  runForgeReadOnly,
  startCodexLogin,
} from "../harness/codex.js";
import {
  enablePhoneTunnel,
  getPhoneAccessStatus,
  installTailscale,
  startTailscaleLogin,
} from "../core/phone-access.js";
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
import {
  capabilityOff,
  CAPABILITIES,
  CAPABILITY_IMPLEMENTED,
  type Capability,
  type CapabilityDecision,
  type CapabilityLanguage,
  cannotShareMessage,
  capabilitiesFromManifest,
  capabilityRefusedBy,
  decideCapabilities,
  decideTokenCapabilities,
  isCapability,
  listCapabilityWaiting,
  missingCapabilities,
  ModeAboveCeilingError,
  modeAboveCeilingMessage,
  countMethodsPerCapability,
  NEEDS_OWN_TOKEN_APPROVAL,
  NEVER_VIA_TOKEN,
  readGlobalCapabilities,
  readModeCapabilities,
  readProfileCapabilities,
  recordCapabilityWanted,
  refusedCapabilityMessage,
  TokenGrantRefusedError,
  tokenGrantRefusedMessage,
  writeGlobalCapabilities,
  writeModeCapabilities,
  writeProfileCapabilities,
} from "../core/capabilities.js";
import { runCapabilityProbe } from "../core/capability-probe.js";
import {
  browseFolders,
  readFetchFolders,
  suggestFetchFolders,
  writeFetchFolders,
} from "../core/fetching.js";
import {
  listRelayCalls,
  readRelayConfig,
  recordRelayCall,
  relayHealth,
  relayProfileEngineStatus,
  runRelay,
  writeRelayConfig,
} from "../core/relay.js";
import { listMonthUsage, usageMonth } from "../core/relay-usage.js";
import { ocrEngineConnected } from "../core/ocr.js";

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

// A refusal the screen has to ACT on rather than only print. A publish blocked
// because Vaenyx cannot do something yet is followed by the copy pack's N3
// question — may this be written down? — and the screen needs the capability
// names as data to ask it. Scraping them back out of the sentence would break
// the first time somebody read that sentence in Chinese.
//
// The array is optional so this one schema still serialises the ordinary
// {error} refusals the same route sends for everything else.
const PublishRefusedResponseSchema = Type.Object(
  {
    error: Type.String(),
    missingCapabilities: Type.Optional(Type.Array(Type.String())),
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

// How many examples to hand an app in a Type B recipe fetch (few-shot for its
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
    // The capability ceiling is the one setting a restricted session must
    // never reach: everything else here is a convenience, but a session that
    // can switch a capability back on can walk straight out of its own mode.
    // It was missing while the route above it promised exactly this guarantee.
    //
    // This is a PREFIX, and it is meant to be: it covers the switches
    // themselves, the folder whitelist behind Fetching, and — since the mode
    // layer became real — each mode's own capability list at
    // /v1/capabilities/modes/:id. All three are the same door, so they are
    // deliberately all under the same path. Each of those routes ALSO refuses
    // any session that is in a mode at all, locked or not; this entry is the
    // shared floor beneath them.
    "/v1/capabilities",
    "/v1/voice/connect",
    "/v1/voice/output",
    "/v1/voice/local",
    "/v1/vision/engine",
    // Same ceiling for the unified slot editor: a locked mode must not be
    // able to re-point a capability (or its stand-in) at another backend.
    "/v1/engines/",
    // Which model draws, beside the sibling slots it belongs with. It was the
    // one engine pointer missing from this floor, so a locked mode could
    // re-point Drawing at another backend — and, until the Cloudflare token
    // moved to /v1/models/, store a key through it as well.
    "/v1/images/engine",
    "/v1/app-profiles",
    "/v1/system/backup",
    "/v1/system/restart",
    "/v1/system/shutdown",
    // Publishing the instance to the internet is a system action; a locked
    // mode must not be able to start installs, sign-ins or tunnels.
    "/v1/phone/",
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
      pushLanguage() === "zh"
        ? `模式「${mode.name}」里有一次设置改动被拦下了(${request.method} ${path})。`
        : `A settings change was blocked in mode "${mode.name}" (${request.method} ${path}).`,
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

  // 🔴 The capability ceiling, enforced where the work is DONE. The card in
  // Settings tells the Owner that anything switched off there is out of reach
  // of every Method, every mode and every app key; until this existed that was
  // true only of the two Method routes, so Vision could be off while
  // /v1/vision/describe happily called the vision model. A route asks this
  // before it performs its capability, and refuses in the Owner's own words —
  // hiding the button is not a ceiling, because the route is still there.
  //
  // Both layers, in one question: the global switch first, then the mode this
  // SESSION is in. A route that only asked the global one would let a mode be
  // narrowed on the Modes screen and then ignored by every door in the app —
  // which is what "the mode layer is inert" meant. The refusal names the layer
  // that said no, because telling somebody sitting inside a mode to go and
  // change a setting they cannot reach is worse than saying nothing.
  const capabilityRefusal = (
    capability: Capability,
    owner: { id: string; name: string; modeId: string | null },
    language: CapabilityLanguage = "en",
  ): string | null => {
    const reason = capabilityRefusedBy(
      context.database,
      capability,
      owner.modeId,
    );
    if (!reason) return null;
    recordAudit(context.database, {
      actorType: "owner",
      actorId: owner.id,
      actorName: owner.name,
      action: "capability.refused",
      decision: "denied",
      reason:
        reason === "mode"
          ? `${capability} is not allowed in the mode this session is in, so the request was refused.`
          : `${capability} is switched off globally, so the request was refused.`,
      resourceType: "capability",
      resourceId: capability,
    });
    return refusedCapabilityMessage(capability, reason, language);
  };

  // The same honesty for a Method run, which cannot refuse the whole call: a
  // Method declaring four capabilities and getting three still has a job to do,
  // so the run goes ahead WITHOUT the fourth and says so. Both Method routes
  // used to throw `decision.refused` away, which made a run that never looked
  // at the picture indistinguishable from a run that looked and answered
  // badly — the caller could not tell, and neither could the Owner.
  //
  // The audit line is English like every other one on the Guard page; the
  // sentence handed back to the caller is in the language they asked in.
  const reportRefusals = (
    refused: CapabilityDecision["refused"],
    actor: {
      actorType: "owner" | "app";
      actorId: string;
      actorName: string;
    },
    methodId: string,
    language: CapabilityLanguage = "en",
  ): { capability: string; reason: string; message: string }[] => {
    for (const entry of refused) {
      recordAudit(context.database, {
        ...actor,
        action: "capability.refused",
        decision: "denied",
        reason: `${entry.capability} was refused to this method run (${entry.reason}).`,
        resourceType: "method",
        resourceId: methodId,
      });
    }
    return refused.map((entry) => ({
      capability: entry.capability,
      reason: entry.reason,
      message: refusedCapabilityMessage(
        entry.capability,
        entry.reason,
        language,
      ),
    }));
  };

  // The same door, said the same way, wherever it is met: the switches, the
  // folder whitelist behind Fetching, and a row's Test all belong to the
  // person who owns the account rather than to whoever is sitting inside a
  // mode. One sentence for the three, so they cannot drift apart — and it was
  // English-only in a bilingual app until now.
  const switchesLiveInUserMode = (language: CapabilityLanguage): string =>
    language === "zh"
      ? "能力的开关与测试只在 User Mode 里进行 —— 先退出当前模式。"
      : "Capabilities are set and tested in User Mode — exit this mode first.";

  // Custom Mode supervision events (spec §6, "must push"). Every event lands
  // as a note in the Owner's MAIN CONVERSATION (Oskar, 2026-08-30: 任何通知
  // 都是主对话告诉我) — the note is the complete record. The push merely
  // announces it, goes to User Mode devices only (the blocked device is the
  // one actively viewing; its holder already saw the refusal on screen), and
  // stays throttled so a hammering finger cannot flood the Owner's phone.
  let lastModeBlockPushAt = 0;
  const notifyModeBlocked = (modeName: string, body: string): void => {
    postInboxNote(context.database, null, body);
    const nowMs = Date.now();
    if (nowMs - lastModeBlockPushAt < 60_000) return;
    lastModeBlockPushAt = nowMs;
    void sendPushToAllDevices(
      context.database,
      {
        title:
          pushLanguage() === "zh"
            ? `模式「${modeName}」碰到了限制`
            : `Mode "${modeName}" hit a restriction`,
        body:
          pushLanguage() === "zh"
            ? "详情已放进主对话。"
            : "Details are in your main conversation.",
        url: "/",
      },
      "mode",
      { modeId: null },
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
        .get(decodeURIComponent(id)) as { mode_id: string | null } | undefined;
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
        pushLanguage() === "zh"
          ? `模式「${mode?.name ?? sessionMode}」试图打开它沙盒之外的内容,被拦下了。`
          : `Mode "${mode?.name ?? sessionMode}" tried to open content outside its sandbox and was blocked.`,
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
    audit: (
      response: Awaited<ReturnType<typeof createAskVaenyxMessage>>,
    ) => void,
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
        // The analysed photo, echoed into the reply as soon as the turn knows
        // about it — so it is there with the first words, not after the last.
        onEchoImage: (imageId) => send("photo", { imageId }),
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

  // What the installer's component page was ticked for, and how far each one
  // has got. The first-run screen reads this so a person who asked for phone
  // access is TAKEN to the sign-in rather than offered it — the installer
  // said the next screen would finish the job, and installing Tailscale is
  // not the same as being connected to it.
  //
  // Unauthenticated on purpose — but NOT because it is loopback-only. That was
  // the stated reason here until 2026-08-17, and Tailscale Funnel had already
  // falsified it: the funnel proxies / to 127.0.0.1:3000, so this answers the
  // open internet whenever remote access is on. The real reason it may stay
  // open is that it names COMPONENTS and nothing about the person, and the
  // first-run screen needs it before any Owner exists to authenticate as.
  // Anything person-shaped added here needs the Owner gate, funnel or no
  // funnel.
  app.get("/v1/system/components", async () => componentProgress());

  // ---- What Vaenyx knows (the facts table) ----
  //
  // Every one of these is filtered by the caller's mode in SQL, never by
  // asking the model to be careful: one household member's medication must
  // not surface in another's chat, and a rule that lives in a prompt leaks.
  app.get(
    "/v1/facts",
    {
      schema: {
        response: { 200: FactsResponseSchema, 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner)
        return reply.code(401).send({ error: "Owner login required." });
      return { facts: listCurrentFacts(context.database, owner.modeId) };
    },
  );

  // Everything this slot has ever been — "where did I live in March". The
  // whole reason nothing in that table is ever deleted.
  app.get<{ Params: { slot: string } }>(
    "/v1/facts/history/:slot",
    {
      schema: {
        params: Type.Object(
          { slot: Type.String({ minLength: 1 }) },
          {
            additionalProperties: false,
          },
        ),
        response: { 200: FactsResponseSchema, 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner)
        return reply.code(401).send({ error: "Owner login required." });
      return {
        facts: listFactHistory(
          context.database,
          request.params.slot,
          owner.modeId,
        ),
      };
    },
  );

  app.get<{ Querystring: { q?: string } }>(
    "/v1/facts/search",
    {
      schema: {
        querystring: Type.Object(
          { q: Type.Optional(Type.String({ maxLength: 200 })) },
          { additionalProperties: false },
        ),
        response: { 200: FactsResponseSchema, 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner)
        return reply.code(401).send({ error: "Owner login required." });
      const query = request.query.q?.trim() ?? "";
      if (!query) return { facts: [] };
      return { facts: searchFacts(context.database, query, owner.modeId) };
    },
  );

  // The Owner writing one by hand. This is the ONLY door through which
  // something read on a web page can become a long-term memory, and it is
  // deliberately a door a person has to walk through: the extractor never
  // reads an assistant reply, so nothing fetched can arrive on its own.
  app.post<{ Body: RecordFactRequest }>(
    "/v1/facts",
    {
      schema: {
        body: RecordFactRequestSchema,
        response: {
          200: FactsResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner)
        return reply.code(401).send({ error: "Owner login required." });
      try {
        recordFact(context.database, {
          eventTime: request.body.eventTime ?? null,
          modeId: owner.modeId,
          slot: request.body.slot,
          sourceDetail: request.body.sourceDetail ?? null,
          sourceKind: request.body.sourceKind ?? "manual",
          value: request.body.value,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        return reply.code(400).send({
          error: message.startsWith("FACT_SLOT_UNKNOWN")
            ? "FACT_SLOT_UNKNOWN:Vaenyx does not keep that kind of fact."
            : "FACT_INVALID:That could not be saved.",
        });
      }
      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "memory.fact.record",
        decision: "allowed",
        reason: `Owner recorded the fact ${request.body.slot}.`,
        resourceType: "system",
      });
      return { facts: listCurrentFacts(context.database, owner.modeId) };
    },
  );

  // Forgetting is dating, not deleting: the row stays so "Vaenyx forgot that
  // on Tuesday" is still answerable and an approved fact cannot vanish
  // without a trace.
  app.delete<{ Params: { id: string } }>(
    "/v1/facts/:id",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          {
            additionalProperties: false,
          },
        ),
        response: {
          200: FactsResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner)
        return reply.code(401).send({ error: "Owner login required." });
      if (!retireFact(context.database, request.params.id)) {
        return reply.code(404).send({ error: "That memory is not there." });
      }
      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "memory.fact.forget",
        decision: "allowed",
        reason: "Owner asked Vaenyx to forget a fact.",
        resourceType: "system",
      });
      return { facts: listCurrentFacts(context.database, owner.modeId) };
    },
  );

  // Approving a proposed fact. Separate from the trait approval on purpose:
  // that one collapses a whole category onto one row.
  app.post<{ Params: { id: string } }>(
    "/v1/facts/candidates/:id/approve",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          {
            additionalProperties: false,
          },
        ),
        response: {
          200: FactsResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner)
        return reply.code(401).send({ error: "Owner login required." });
      try {
        approveFactCandidate(
          context.database,
          request.params.id,
          owner.id,
          owner.modeId ?? null,
        );
      } catch (error) {
        return reply.code(400).send({
          error:
            error instanceof Error
              ? error.message
              : "That could not be approved.",
        });
      }
      return { facts: listCurrentFacts(context.database, owner.modeId) };
    },
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
        context.config.dataDirectory,
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
        context.config.dataDirectory,
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

  // ── Phone access (onboarding Part 2 section 5) ─────────────────────────
  // Owner-session-only, like every system action: these run the tailscale
  // CLI on the machine, so an app key or an unauthenticated caller must
  // never reach them. Status is a read (not audited, like other reads);
  // install, sign-in and tunnel changes are audited system actions.
  app.get(
    "/v1/phone/status",
    {
      schema: {
        response: { 200: PhoneAccessStatusSchema, 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      return getPhoneAccessStatus();
    },
  );

  // `lang` rides along on the three actions because their `detail` sentences
  // are read by the Owner in the panel, and a CLI result gives the server no
  // other clue which language to say so in.
  app.post<{ Querystring: { lang?: string } }>(
    "/v1/phone/install",
    {
      schema: {
        response: { 200: PhoneAccessStatusSchema, 401: ErrorResponseSchema },
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
        action: "phone.install",
        decision: "allowed",
        reason:
          "Owner asked Vaenyx to install the Tailscale client with winget.",
        resourceType: "system",
      });
      installTailscale(request.query.lang === "zh" ? "zh" : "en");
      return getPhoneAccessStatus();
    },
  );

  app.post<{ Querystring: { lang?: string } }>(
    "/v1/phone/login",
    {
      schema: {
        response: { 200: PhoneLoginResponseSchema, 401: ErrorResponseSchema },
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
        action: "phone.login",
        decision: "allowed",
        reason: "Owner started the Tailscale browser sign-in from phone setup.",
        resourceType: "system",
      });
      return startTailscaleLogin(request.query.lang === "zh" ? "zh" : "en");
    },
  );

  app.post<{ Querystring: { lang?: string } }>(
    "/v1/phone/tunnel",
    {
      schema: {
        response: { 200: PhoneTunnelResponseSchema, 401: ErrorResponseSchema },
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
        action: "phone.tunnel",
        decision: "allowed",
        reason:
          "Owner asked Vaenyx to publish local port 3000 through Tailscale Funnel.",
        resourceType: "system",
      });
      return enablePhoneTunnel(request.query.lang === "zh" ? "zh" : "en");
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
              // Whether the CLI's OWN browser window is visible on the
              // server machine (interactive session) — the page opens its
              // own window only when this is false, so there is exactly one.
              cliWindowVisible: Type.Optional(Type.Boolean()),
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
      // Root cause B (Oskar's Surface, 2026-08-06): on a clean machine nothing
      // had installed the Codex CLI, and this button showed Windows' raw
      // "'codex' is not recognized" to a non-technical user. The click now
      // installs it on demand (the people who never use ChatGPT never wait for
      // it), and NO raw shell line ever reaches the browser from here — the
      // detail field carries codes the UI turns into sentences, and the raw
      // line goes to the server log where it belongs.
      const ensured = await ensureCodexInstalled();
      if (ensured === "install-failed") {
        return { url: null, detail: "CODEX_INSTALL_FAILED" };
      }
      const result = await startCodexLogin();
      if (result.detail) {
        request.log.warn(
          { codexDetail: result.detail },
          "codex login could not start",
        );
        return { url: result.url, detail: "CODEX_LOGIN_FAILED" };
      }
      return result;
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

  // Ask a provider which models this key may use. Never a stored list: the
  // ids change under us, and a stale menu is worse than a text box.
  app.get<{ Params: { id: string } }>(
    "/v1/models/providers/:id/catalogue",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        response: {
          200: Type.Object(
            { models: Type.Array(Type.String()) },
            { additionalProperties: false },
          ),
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
      try {
        return {
          models: await listProviderModels(
            context.config.secretsDirectory,
            request.params.id,
          ),
        };
      } catch (error) {
        request.log.warn({ err: error }, "model catalogue unavailable");
        return reply.code(503).send({
          error:
            error instanceof ModelCatalogueUnavailableError
              ? error.message
              : "This provider did not answer with its model list.",
        });
      }
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

  // In-app Claude subscription sign-in — the codex-login pattern: the server
  // spawns the OFFICIAL bundled claude binary's `auth login` through pipes,
  // relays its sign-in URL to the UI, and feeds the pasted code back to it.
  // The official binary does the whole exchange; Vaenyx never speaks OAuth.
  app.post(
    "/v1/models/claude-login/start",
    {
      schema: {
        response: {
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
      // The Agent SDK is a 250 MB component, not a dependency: everybody who
      // uses Gemini, Groq or ChatGPT would otherwise download it to never
      // touch it. This press is the moment it is actually wanted, so this is
      // where it is fetched — the same shape as the ChatGPT button, and the
      // same rule about what reaches the browser: a code, never a shell line.
      const ready = await ensureClaudeSdkInstalled(
        context.config.dataDirectory,
      );
      if (ready === "install-failed") {
        return reply.code(502).send({
          error:
            "CLAUDE_COMPONENT_FAILED:The Claude sign-in component could not be installed.",
        });
      }
      try {
        const { url } = await startClaudeLogin();
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "model.provider.connect",
          decision: "allowed",
          reason: "Owner started the Claude subscription sign-in.",
          resourceType: "system",
        });
        return { url };
      } catch {
        cancelClaudeLogin();
        return reply.code(502).send({
          error: "CLAUDE_LOGIN_FAILED:The Claude sign-in could not start.",
        });
      }
    },
  );

  app.post<{ Body: { code: string } }>(
    "/v1/models/claude-login/code",
    {
      schema: {
        body: Type.Object(
          { code: Type.String({ minLength: 1, maxLength: 400 }) },
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
        await submitClaudeLoginCode(request.body.code);
        // The fresh sign-in takes effect immediately.
        initModelRegistry({
          secretsDirectory: context.config.secretsDirectory,
        });
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        return reply.code(400).send({
          error:
            code === "CLAUDE_LOGIN_NOT_STARTED"
              ? "The sign-in expired — press Sign In With Claude again."
              : "That code was not accepted. Start the sign-in again and paste the fresh code.",
        });
      }
      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "model.provider.connect",
        decision: "allowed",
        reason: "Owner connected the Claude subscription channel.",
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
        return reply
          .code(400)
          .send({ error: "That backup could not be found." });
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

      if (request.body.projectId !== null && !request.body.projectId.trim()) {
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

  // "I have this open" — the read watermark, kept on the instance so every
  // device agrees (Oskar, 2026-08-16: reading on the phone must clear the dot
  // on the computer). Not audited: it is the Owner looking at their own
  // screen, and it fires every time a thread is opened.
  app.post<{ Params: { id: string } }>(
    "/v1/threads/:id/seen",
    {
      schema: {
        params: Type.Object({ id: Type.String({ minLength: 1 }) }),
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
        return markVaenyxThreadSeen(
          context.database,
          request.params.id,
          owner.id,
        );
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

      // A fed photo stays a PHOTO in the journal; its contents are extracted
      // here, behind the scenes, and joined to the typed words for the parse
      // ("visual first" — the Owner never sees a text dump, Oskar 2026-07-28).
      const runLanguage =
        request.body.language === "zh" ||
        (!request.body.language && /[一-鿿]/.test(request.body.content))
          ? "zh"
          : "en";
      let effectiveContent = request.body.content;
      let photoAnnotations: ImageAnnotationItem[] | null = null;
      // A failed photo read is said out loud on the confirm card, never
      // swallowed into "it recognises nothing" (owner, 2026-08-16).
      let photoError: string | null = null;
      // Said out loud when the Owner's BACKUP engine answered instead.
      let photoBackupNote: string | null = null;
      // Vision switched off refuses the LOOKING, not the run: the typed words
      // still go through, exactly as they do when no vision model is
      // connected. The photo is never sent anywhere.
      const visionRefused = Boolean(
        request.body.imageId &&
        !request.body.input &&
        capabilityRefusal("vision", owner, runLanguage),
      );
      if (request.body.imageId && !request.body.input && !visionRefused) {
        const found = readImage(
          context.config.dataDirectory,
          request.body.imageId,
        );
        if (found) {
          // Marks first, transcript only if needed. These used to fire in
          // PARALLEL, which doubled the request rate against a free tier that
          // counts requests per minute — and 429s read to the Owner as "it
          // recognises nothing" (measured 2026-08-16). The marks already NAME
          // every item they point at, so when they land the second call is
          // pure waste; it is made only when marking came back with nothing.
          const photoId = request.body.imageId;
          const marksPromise = annotateImage(
            context.config.secretsDirectory,
            found.image,
            found.mimeType,
            runLanguage,
            routineAnnotateFocus(
              context.config.routinesDirectory,
              thread.routineId,
            ),
          ).catch(() => null);
          const marksOutcome = await marksPromise;
          photoAnnotations = marksOutcome?.value ?? null;
          // Whoever answered gets said out loud when it was the BACKUP.
          if (marksOutcome?.note.fellBackFrom) {
            photoBackupNote = backupNoteSentence(
              marksOutcome.note,
              providerDisplayName,
              runLanguage,
            );
          }
          const joinWithTyped = (extracted: string) => {
            const typed = request.body.content.trim();
            effectiveContent =
              typed && typed !== "(Photo)"
                ? `${typed}\n${extracted}`
                : extracted;
          };
          if (photoAnnotations && photoAnnotations.length > 0) {
            // The marks NAME what they point at, so they already ARE the item
            // list — no second call, and no second chance to be throttled.
            const counts = new Map<string, number>();
            for (const item of photoAnnotations) {
              const name = item.name.trim();
              if (!name) continue;
              counts.set(name, (counts.get(name) ?? 0) + 1);
            }
            const markList = [...counts.entries()]
              .map(([name, n]) => (n > 1 ? `${name} ×${n}` : name))
              .join("\n");
            if (markList) joinWithTyped(markList);
          } else {
            try {
              const described = await describeImage(
                context.config.secretsDirectory,
                found.image,
                found.mimeType,
                runLanguage,
              );
              if (described.note.fellBackFrom) {
                photoBackupNote = backupNoteSentence(
                  described.note,
                  providerDisplayName,
                  runLanguage,
                );
              }
              if (described.value.trim()) joinWithTyped(described.value.trim());
            } catch (visionError) {
              // The typed words still run — but a failed photo read must SAY
              // SO (owner, 2026-08-16: a flaky vision backend looked like "it
              // recognises nothing" because this swallowed the error).
              photoError =
                visionError instanceof Error
                  ? visionError.message.slice(0, 200)
                  : "vision failed";
              request.log.warn(
                { err: visionError },
                "routine-run photo read failed; running on typed words only",
              );
            }
          }
          if (photoAnnotations) {
            context.database.sqlite
              .prepare(
                `INSERT INTO image_annotations (image_id, items, created_at)
                 VALUES (?, ?, ?)
                 ON CONFLICT(image_id) DO UPDATE SET items = excluded.items,
                   created_at = excluded.created_at`,
              )
              .run(
                photoId,
                JSON.stringify(photoAnnotations),
                new Date().toISOString(),
              );
          }
        }
      }

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
          const routineForRev = loadRoutine(
            context.config.routinesDirectory,
            context.config.libraryDirectory,
            thread.routineId,
          );
          addParseExample(context.database, {
            routineId: thread.routineId,
            message: request.body.content,
            input: request.body.input,
            // Bound to the step-1 input schema it corrects (Edit Routine v1):
            // a later schema change stops serving it as few-shot.
            inputSchemaRev: routineForRev
              ? routineInputSchemaRev(
                  context.config.libraryDirectory,
                  routineForRev,
                )
              : null,
          });
        }
      } else {
        const wrapped = buildChatRoutineInput(
          context.config.routinesDirectory,
          context.config.libraryDirectory,
          thread.routineId,
          effectiveContent,
        );
        if (wrapped.ok) {
          journalInput = wrapped.input;
          // Single-field routines get no confirm card, so a failed photo
          // read must speak HERE — a note in the chat — or the owner sees
          // the silent "it recognises nothing" this exists to end.
          if (photoBackupNote) {
            try {
              appendAssistantNote(
                context.database,
                request.params.id,
                owner.id,
                photoBackupNote,
              );
            } catch {
              // The run itself still proceeds.
            }
          }
          if (photoError) {
            try {
              appendAssistantNote(
                context.database,
                request.params.id,
                owner.id,
                runLanguage === "zh"
                  ? `⚠ 照片这次没读出来(${photoError})。这次结果只基于你打的字;照片可以重发一次再试。`
                  : `⚠ The photo could not be read this time (${photoError}). This run used only your typed words; resend the photo to try again.`,
              );
            } catch {
              // The run itself still proceeds.
            }
          }
        } else {
          try {
            const routineForRev = loadRoutine(
              context.config.routinesDirectory,
              context.config.libraryDirectory,
              thread.routineId,
            );
            const parsed = await parseChatRoutineInput(
              context.config.routinesDirectory,
              context.config.libraryDirectory,
              thread.routineId,
              effectiveContent,
              controller.signal,
              undefined,
              // Only corrections made under the CURRENT step-1 input schema
              // (Edit Routine v1) — examples for renamed fields would steer
              // the parse wrong.
              listParseExamples(
                context.database,
                thread.routineId,
                3,
                routineForRev
                  ? routineInputSchemaRev(
                      context.config.libraryDirectory,
                      routineForRev,
                    )
                  : null,
              ),
            );
            if (!parsed) {
              return reply.code(400).send({
                error:
                  "Vaenyx could not work out this routine's input from a chat message.",
              });
            }
            // The confirm round sends this content back, so the learn example
            // pairs the parse with the text it actually saw. The marks let the
            // card show the annotated photo for editing (visual first).
            return {
              needsInput: true as const,
              ...parsed,
              content: effectiveContent,
              ...(photoAnnotations ? { annotations: photoAnnotations } : {}),
              ...(photoError ? { photoError } : {}),
              ...(photoBackupNote ? { engineNote: photoBackupNote } : {}),
            };
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
          {
            chatId: request.params.id,
            imageId: request.body.imageId ?? null,
            // The marks as they stand for THIS run — the Owner's corrections
            // included — frozen onto its rows, so re-marking the photo later
            // cannot rewrite what this run showed.
            imageAnnotations:
              photoAnnotations ??
              (request.body.imageId
                ? readStoredAnnotations(context.database, request.body.imageId)
                : null),
            // The Owner's own run meets the two layers a session has: the
            // global switches and whatever mode this session is in. A Routine
            // is several Method runs in a row, so it cannot be the one path
            // that ignores a switch every single Method run honours.
            narrow: (declared) =>
              decideCapabilities(
                context.database,
                declared,
                owner.modeId ?? null,
              ).allowed,
            // The picture of the result, when this Routine asks for one.
            // generateImage holds the drawing ceiling itself (global switch
            // + this session's mode), so a refusal here is simply no
            // picture — never a failed run, never a bypassed switch.
            //
            // Two things this shares with the chat's draw path, because the
            // reasons are the same: the words are translated into an ENGLISH
            // image prompt first (image models are not chat models — handed
            // Chinese, the free default drew pseudo-calligraphy), and the
            // whole thing is bounded, so a stalled provider costs the
            // illustration rather than the reply. The result row is already
            // on disk before this runs.
            drawResult: async (prompt) => {
              try {
                const english = await buildImagePrompt(
                  getDefaultProvider(),
                  prompt,
                );
                return await Promise.race([
                  generateImage(
                    context.database,
                    context.config.secretsDirectory,
                    context.config.dataDirectory,
                    english,
                    owner.modeId ?? null,
                  ),
                  new Promise<null>((resolve) => {
                    const timer = setTimeout(() => resolve(null), 60_000);
                    timer.unref?.();
                  }),
                ]);
              } catch (error) {
                request.log.warn(
                  { err: error },
                  "routine result image skipped",
                );
                return null;
              }
            },
          },
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
          context.config.dataDirectory,
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
          // Annotate is offered to the judge only when it could actually run:
          // a vision engine is connected AND this conversation has a photo.
          getVisionStatus(context.config.secretsDirectory).connected &&
            conversationHasPhoto(context.database, request.params.id),
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

  // Inside a Routine's chat: is this message content to run on, or a request
  // to change the routine itself? "unsure" makes the client show a large
  // chooser — the app never decides silently (owner rule, 2026-08-16).
  app.post<{ Params: { id: string }; Body: RoutineChatIntentRequest }>(
    "/v1/ask-vaenyx/conversations/:id/routine-chat-intent",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: RoutineChatIntentRequestSchema,
        response: {
          200: RoutineChatIntentResponseSchema,
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
      const thread = listVaenyxThreads(context.database, owner.id).find(
        (candidate) => candidate.conversationId === request.params.id,
      );
      if (!thread?.routineId) {
        return reply
          .code(400)
          .send({ error: "This chat is not bound to a routine." });
      }
      const routine = loadRoutine(
        context.config.routinesDirectory,
        context.config.libraryDirectory,
        thread.routineId,
      );
      if (!routine) {
        return reply.code(400).send({ error: "That routine is missing." });
      }
      // A community routine is not editable in place, so its chat can only
      // ever be feeding — answering "feed" without a model call keeps the
      // two entry points (this chat, the main-chat classifier) agreeing.
      if (routine.origin === "community") {
        return { decision: "feed" as const };
      }
      const controller = new AbortController();
      reply.raw.on("close", () => {
        if (!reply.raw.writableEnded) controller.abort();
      });
      return {
        decision: await classifyRoutineChatMessage(
          {
            name: routine.name,
            description: routine.description,
            // What it eats, so a message ABOUT the result cannot read as
            // something to put in (multi-field routines only; single-field
            // ones have nothing useful to list).
            inputFields:
              describeRoutineInputFields(
                context.config.routinesDirectory,
                context.config.libraryDirectory,
                thread.routineId,
              )?.fields.map((field) => field.key) ?? [],
          },
          request.body.content,
          controller.signal,
        ),
      };
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
              ...(request.body.annotate ? { annotate: true } : {}),
              ...(request.body.documentId
                ? { documentId: request.body.documentId }
                : {}),
              ...(request.body.documentName
                ? { documentName: request.body.documentName }
                : {}),
              ...(request.body.documentAcknowledged
                ? { documentAcknowledged: true }
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
  app.post<{
    Body: { content: string; role?: "assistant" | "owner" };
    Params: { id: string };
  }>(
    "/v1/ask-vaenyx/conversations/:id/notes",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: Type.Object(
          {
            content: Type.String({ minLength: 1, maxLength: 4000 }),
            // "owner" keeps the Owner's own words on the record (an edit
            // request in a routine chat must never vanish).
            role: Type.Optional(
              Type.Union([Type.Literal("assistant"), Type.Literal("owner")]),
            ),
          },
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
          request.body.role ?? "assistant",
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
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }

      // The session's own Mode only (Oskar, 2026-08-30: 不同的 mode 要分开) —
      // the same scope the badge's count always had.
      return listVaenyxMeCandidates(context.database, owner.modeId ?? null);
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
      // Scoped to the Mode the Owner is actually in. User Mode is the god
      // view for everything else, but not for this: reading a household
      // member's chats to build a picture of the Owner is not oversight, it is
      // the wrong person's data in the wrong place.
      await scanVaenyxMe(context.database, owner.id, owner.modeId ?? null);
      return listVaenyxMeCandidates(context.database, owner.modeId ?? null);
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

      // The session decides the Mode a hand-made card belongs to — never the
      // body, or a Mode could file cards into another Mode's review pile.
      const candidate = createVaenyxMeCandidate(
        context.database,
        { ...request.body, modeId: owner.modeId ?? null },
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
          owner.modeId ?? null,
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
          owner.modeId ?? null,
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
          owner.modeId ?? null,
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
          {
            // Same set as the streaming route above: a task follow-up may carry
            // whatever a chat message may carry.
            ...(request.body.voiceAudioId
              ? { voiceAudioId: request.body.voiceAudioId }
              : {}),
            ...(request.body.imageId ? { imageId: request.body.imageId } : {}),
            ...(request.body.annotate ? { annotate: true } : {}),
            ...(request.body.documentId
              ? { documentId: request.body.documentId }
              : {}),
            ...(request.body.documentName
              ? { documentName: request.body.documentName }
              : {}),
            ...(request.body.documentAcknowledged
              ? { documentAcknowledged: true }
              : {}),
            dataDirectory: context.config.dataDirectory,
            secretsDirectory: context.config.secretsDirectory,
          },
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
            {
              ...options,
              // A task follow-up is a chat message — createTaskMessage has
              // always handed straight to createAskVaenyxMessage, so photos,
              // PDFs and spoken input worked down here all along and this
              // route simply dropped them (Oskar, 2026-07-30: the task screen
              // had only a Send button). One conversation, one set of things
              // you can put in it.
              ...(request.body.voiceAudioId
                ? { voiceAudioId: request.body.voiceAudioId }
                : {}),
              ...(request.body.imageId
                ? { imageId: request.body.imageId }
                : {}),
              ...(request.body.annotate ? { annotate: true } : {}),
              ...(request.body.documentId
                ? { documentId: request.body.documentId }
                : {}),
              ...(request.body.documentName
                ? { documentName: request.body.documentName }
                : {}),
              ...(request.body.documentAcknowledged
                ? { documentAcknowledged: true }
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
            error:
              "The selected project, skill, or source chat is unavailable.",
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

  // THE SUBSCRIPTION DOOR (Oskar, 2026-07-29). Two routes for his own apps —
  // "are you there" and "do this on one of my subscriptions" — plus three for
  // the Owner's own settings page. Both outward routes go through the SAME App
  // Token the rest of the bridge uses: no new unauthenticated path exists.
  //
  // Cross-origin is opened here and ONLY here, and only for origins the Owner
  // typed in himself. It has to be opened at all because a Cloudflare Worker
  // can never reach this machine — Vaenyx lives inside a private network, so
  // the call comes from the page in the Owner's own browser, which is on that
  // network. That is also what makes "cannot reach it" a real gate: someone
  // else's phone does not find this door at all.
  // CORS on the door routes reflects any origin (Oskar, 2026-08-06: the
  // origin list retired with the shared key). CORS was never the door's
  // security — a curl ignores it entirely; the key and the tailnet gate are
  // the walls — and nothing here rides cookies, so reflecting the origin
  // hands a stranger's website nothing it could use without also holding an
  // app's own key. What the list actually did, in practice, was break every
  // NEW app until somebody remembered this screen existed.
  function allowRelayOrigin(
    request: FastifyRequest,
    reply: FastifyReply,
  ): void {
    const origin = request.headers.origin;
    if (!origin) return;
    reply.header("access-control-allow-origin", origin);
    reply.header("vary", "origin");
    reply.header("access-control-allow-headers", "authorization,content-type");
    reply.header("access-control-allow-methods", "GET,POST,OPTIONS");
    reply.header("access-control-max-age", "600");
  }

  // Who may knock: the door's own key, or any existing App Token. The door key
  // is the one an app is given — one key, because a key says WHICH APP is
  // knocking and the subscription to use is named in each request. Regenerating
  // it in Settings is how an app is cut off.
  //
  // It answers WHO rather than yes/no, because the two callers are not the same
  // thing: an App Token carries its own capability list and the door's own key
  // does not have one. A door that could not tell them apart would let a key
  // that was granted nothing take whatever the machine allows.
  // THE TAILNET GATE (2026-08-02). The whole app rides one port, and that port
  // is on Funnel — public internet — so until now the only thing between
  // anyone on earth and Oskar's subscriptions was a Bearer key. A leaked key
  // meant a stranger burning his paid quota from anywhere.
  //
  // Tailscale itself is the boundary: `serve` (tailnet traffic) injects
  // Tailscale-User-Login and strips any client-supplied copy; `funnel`
  // (public traffic) strips it and injects nothing. VERIFIED against reality
  // on 2026-08-02, not read off documentation — probed all three paths
  // (tailnet: header present; local: absent; public funnel: absent) AND
  // confirmed a forged header sent through the funnel arrives stripped.
  //
  // So the door requires the header. The key still does the authenticating —
  // this header only answers "did this arrive through the tailnet", never who
  // is asking (a process already on this machine could write it, but such a
  // process can read the database beside it anyway, and it still needs the
  // key — two doors, both locked). UI routes are deliberately NOT gated: the
  // phone-browser-without-Tailscale convenience stands.
  //
  // 🔴 Its own error code, never shared with "key invalid": an app showing
  // "connect to Tailscale" for one and "key rejected" for the other is the
  // whole reason the two are distinguishable — their fixes are different
  // people doing different things.
  function outsideTailnet(request: FastifyRequest): boolean {
    const login = request.headers["tailscale-user-login"];
    return typeof login !== "string" || login.length === 0;
  }

  // Who may knock (phase two, 2026-08-06): a RELAY key, nothing else. The
  // shared door key is retired — every caller is an app with its own identity.
  // A Method/Routine Token is a real key for a different product: it
  // authenticates, and is then refused with its own code, because "wrong kind
  // of key" and "no key" are fixed differently.
  function knocking(
    request: FastifyRequest,
  ): { profileId: string } | "wrong-kind" | null {
    const profile = authenticateAppProfile(context.database, request);
    if (!profile) return null;
    if (profile.kind !== "relay") return "wrong-kind";
    return { profileId: profile.id };
  }

  for (const path of ["/v1/ai/run", "/v1/ai/health"]) {
    app.options(path, async (request, reply) => {
      allowRelayOrigin(request, reply);
      return reply.code(204).send();
    });
  }

  // Deliberately cheap: the answer about the CLIs is cached and refreshed in
  // the background, because a caller decides in three seconds whether this
  // machine is worth waiting for.
  app.get(
    "/v1/ai/health",
    {
      schema: {
        response: {
          200: RelayHealthSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      allowRelayOrigin(request, reply);
      if (outsideTailnet(request)) {
        return reply.code(403).send({ error: "RELAY_TAILNET_REQUIRED" });
      }
      const knocker = knocking(request);
      if (knocker === "wrong-kind") {
        return reply.code(403).send({ error: "RELAY_KEY_WRONG_KIND" });
      }
      if (!knocker) {
        return reply
          .code(401)
          .send({ error: "A valid App Token is required." });
      }
      return relayHealth(context.database, knocker.profileId);
    },
  );

  app.post<{ Body: RelayRunRequest }>(
    "/v1/ai/run",
    {
      schema: {
        body: RelayRunRequestSchema,
        response: {
          200: RelayRunResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          502: ErrorResponseSchema,
          503: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      allowRelayOrigin(request, reply);
      if (outsideTailnet(request)) {
        recordAudit(context.database, {
          actorType: "system",
          actorName: "Vaenyx Guard",
          action: "relay.run",
          decision: "denied",
          reason:
            "A relay request arrived from outside the tailnet (no Tailscale identity), so it was refused before any key was checked.",
          resourceType: "relay_request",
        });
        return reply.code(403).send({ error: "RELAY_TAILNET_REQUIRED" });
      }
      const knocker = knocking(request);
      if (knocker === "wrong-kind") {
        recordAudit(context.database, {
          actorType: "system",
          actorName: "Vaenyx Guard",
          action: "relay.run",
          decision: "denied",
          reason:
            "A Method/Routine Token knocked on the Subscription Door; the door takes relay keys only.",
          resourceType: "relay_request",
        });
        return reply.code(403).send({ error: "RELAY_KEY_WRONG_KIND" });
      }
      if (!knocker) {
        recordAudit(context.database, {
          actorType: "system",
          actorName: "Vaenyx Guard",
          action: "relay.run",
          decision: "denied",
          reason: "Invalid or disabled App Token.",
          resourceType: "relay_request",
        });
        return reply
          .code(401)
          .send({ error: "A valid App Token is required." });
      }

      const started = Date.now();
      try {
        const result = await runRelay(
          context.database,
          context.config.secretsDirectory,
          {
            task: request.body.task,
            prompt: request.body.prompt,
            engine: request.body.engine,
            capability: request.body.capability,
            files: request.body.files ?? [],
            appProfileId: knocker.profileId,
            effort: request.body.effort,
            model: request.body.model,
          },
        );
        recordRelayCall(context.database, {
          task: request.body.task,
          engine: request.body.engine,
          capability: request.body.capability,
          ms: result.ms,
          ok: true,
          failure: null,
          appId: knocker.profileId,
        });
        return result;
      } catch (error) {
        // Every failure carries its own name so the calling app can tell "fall
        // back to your free model" from "tell the user something is wrong".
        const code = error instanceof Error ? error.message : "RELAY_FAILED";
        recordRelayCall(context.database, {
          task: request.body.task,
          engine: request.body.engine,
          capability: request.body.capability,
          ms: Date.now() - started,
          ok: false,
          failure: code,
          appId: knocker.profileId,
        });
        // The door answers calling apps in codes, not sentences, so this one
        // stays a code too — it names the capability, which is what an app
        // needs to tell its own user why the answer did not come.
        if (code.startsWith("RELAY_CAPABILITY_OFF")) {
          recordAudit(context.database, {
            actorType: "app",
            actorName: "App Token",
            action: "capability.refused",
            decision: "denied",
            reason: `${request.body.capability} is switched off globally, so a relay request was refused.`,
            resourceType: "capability",
            resourceId: request.body.capability,
          });
          return reply.code(403).send({ error: code });
        }
        // Its own code, not the one above: "the machine has this switched off"
        // and "this key was not given it" have two different fixes, and an app
        // that cannot tell them apart tells its own user the wrong thing.
        if (code.startsWith("RELAY_CAPABILITY_NOT_GRANTED")) {
          recordAudit(context.database, {
            actorType: "app",
            actorId: knocker.profileId,
            actorName: "App Token",
            action: "capability.refused",
            decision: "denied",
            reason: `${request.body.capability} was not granted to this app key, so a relay request was refused.`,
            resourceType: "capability",
            resourceId: request.body.capability,
          });
          return reply.code(403).send({ error: code });
        }
        const status =
          code === "RELAY_NOT_OWNER"
            ? 403
            : code === "RELAY_OFF" ||
                code.startsWith("RELAY_NOT_SIGNED_IN") ||
                // The profile's OWN login is missing — a different fix from the
                // door not being signed in: this app must sign in again, and
                // its error says so by name.
                code.startsWith("RELAY_PROFILE_NOT_CONNECTED")
              ? 503
              : code.startsWith("RELAY_CAPABILITY_UNSUPPORTED") ||
                  code.startsWith("RELAY_HOST_NOT_ALLOWED") ||
                  code.startsWith("RELAY_TOO_MANY_FILES") ||
                  // An effort/model outside the engine's whitelist: the
                  // caller's own word comes back in the code.
                  code.startsWith("RELAY_EFFORT_INVALID") ||
                  code.startsWith("RELAY_MODEL_INVALID") ||
                  code.includes("TOO_LARGE") ||
                  code === "RELAY_NO_FILE"
                ? 400
                : 502;
        return reply.code(status).send({ error: code });
      }
    },
  );

  // ── Relay Profiles v1: the app's own side of the door. ─────────────────────
  //
  // Every endpoint here authenticates with the APP'S OWN KEY, and the key IS
  // the identity: the profile is looked up from the token, no request names an
  // appId, so one app is physically unable to reach another's profile — the
  // isolation is machine-kept, not a rule anyone has to remember. The door's
  // shared key deliberately does not work here: it has no profile to act on.
  //
  // Nothing on these routes ever returns a credential in any form. Status is
  // connected-or-not, timestamps, the key's version and prefix. A leaked app
  // key must not be exchangeable for a subscription login.
  function knockingProfile(
    request: FastifyRequest,
  ): AppProfile | "wrong-kind" | null {
    const profile = authenticateAppProfile(context.database, request);
    if (!profile) return null;
    // Only a relay key has a subscription identity to manage. A Method/Routine
    // Token here gets its own refusal, never a confusing "no key".
    return profile.kind === "relay" ? profile : "wrong-kind";
  }

  for (const path of [
    "/v1/relay/profile",
    "/v1/relay/profile/login/start",
    "/v1/relay/profile/login/complete",
    "/v1/relay/profile/disconnect",
    "/v1/relay/profile/key/rotate",
  ]) {
    app.options(path, async (request, reply) => {
      allowRelayOrigin(request, reply);
      return reply.code(204).send();
    });
  }

  app.get(
    "/v1/relay/profile",
    {
      schema: {
        response: {
          200: RelayProfileStatusSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      allowRelayOrigin(request, reply);
      if (outsideTailnet(request)) {
        return reply.code(403).send({ error: "RELAY_TAILNET_REQUIRED" });
      }
      const profile = knockingProfile(request);
      if (profile === "wrong-kind") {
        return reply.code(403).send({ error: "RELAY_KEY_WRONG_KIND" });
      }
      if (!profile) {
        return reply.code(401).send({ error: "RELAY_PROFILE_REQUIRED" });
      }
      const status = relayProfileEngineStatus(context.database, profile.id);
      return {
        mode: status.mode,
        engines: status.engines,
        key: appProfileKeyInfo(context.database, profile.id),
        capabilities: profile.capabilities,
      };
    },
  );

  app.post<{ Body: RelayProfileLoginStartRequest }>(
    "/v1/relay/profile/login/start",
    {
      schema: {
        body: RelayProfileLoginStartRequestSchema,
        response: {
          200: RelayProfileLoginStartResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          409: ErrorResponseSchema,
          502: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      allowRelayOrigin(request, reply);
      if (outsideTailnet(request)) {
        return reply.code(403).send({ error: "RELAY_TAILNET_REQUIRED" });
      }
      const profile = knockingProfile(request);
      if (profile === "wrong-kind") {
        return reply.code(403).send({ error: "RELAY_KEY_WRONG_KIND" });
      }
      if (!profile) {
        return reply.code(401).send({ error: "RELAY_PROFILE_REQUIRED" });
      }
      // Signing in is a bigger power than asking questions, so it gets its own
      // audit trail: who started it, for which engine, before it can succeed.
      recordAudit(context.database, {
        actorType: "app",
        actorId: profile.id,
        actorName: profile.name,
        action: "relay.profile.login.start",
        decision: "allowed",
        reason: `The app began a ${request.body.engine} sign-in for its own profile.`,
        resourceType: "relay_profile",
        resourceId: profile.id,
      });
      try {
        if (request.body.engine === "claude-cli") {
          const { url } = await startClaudeLogin(profile.id);
          return { url, detail: null };
        }
        return await startCodexLogin(profile.id);
      } catch (error) {
        const code =
          error instanceof Error ? error.message : "RELAY_LOGIN_FAILED";
        // One codex login at a time across the machine (its browser flow hosts
        // a local callback port); "busy" is a retry, not a failure.
        return reply
          .code(code === "CODEX_LOGIN_BUSY" ? 409 : 502)
          .send({ error: code });
      }
    },
  );

  app.post<{ Body: RelayProfileLoginCompleteRequest }>(
    "/v1/relay/profile/login/complete",
    {
      schema: {
        body: RelayProfileLoginCompleteRequestSchema,
        response: {
          200: RelayProfileLoginCompleteResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          502: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      allowRelayOrigin(request, reply);
      if (outsideTailnet(request)) {
        return reply.code(403).send({ error: "RELAY_TAILNET_REQUIRED" });
      }
      const profile = knockingProfile(request);
      if (profile === "wrong-kind") {
        return reply.code(403).send({ error: "RELAY_KEY_WRONG_KIND" });
      }
      if (!profile) {
        return reply.code(401).send({ error: "RELAY_PROFILE_REQUIRED" });
      }
      try {
        if (request.body.engine === "claude-cli") {
          if (!request.body.code?.trim()) {
            return reply.code(400).send({ error: "RELAY_LOGIN_CODE_REQUIRED" });
          }
          await submitClaudeLoginCode(request.body.code, profile.id);
        } else if (!codexProfileSignedIn(profile.id)) {
          // Codex has no code to feed: its official flow completes itself, so
          // "complete" is the app asking whether it landed.
          return { connected: false };
        }
        recordAudit(context.database, {
          actorType: "app",
          actorId: profile.id,
          actorName: profile.name,
          action: "relay.profile.login.complete",
          decision: "allowed",
          reason: `The app completed a ${request.body.engine} sign-in; the profile now rides its own login.`,
          resourceType: "relay_profile",
          resourceId: profile.id,
        });
        return { connected: true };
      } catch (error) {
        const code =
          error instanceof Error ? error.message : "RELAY_LOGIN_FAILED";
        return reply.code(502).send({ error: code });
      }
    },
  );

  app.post<{ Body: RelayProfileDisconnectRequest }>(
    "/v1/relay/profile/disconnect",
    {
      schema: {
        body: RelayProfileDisconnectRequestSchema,
        response: {
          200: RelayProfileLoginCompleteResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          502: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      allowRelayOrigin(request, reply);
      if (outsideTailnet(request)) {
        return reply.code(403).send({ error: "RELAY_TAILNET_REQUIRED" });
      }
      const profile = knockingProfile(request);
      if (profile === "wrong-kind") {
        return reply.code(403).send({ error: "RELAY_KEY_WRONG_KIND" });
      }
      if (!profile) {
        return reply.code(401).send({ error: "RELAY_PROFILE_REQUIRED" });
      }
      try {
        if (request.body.engine === "claude-cli") {
          disconnectClaudeProfile(profile.id);
        } else {
          disconnectCodexProfile(profile.id);
        }
        recordAudit(context.database, {
          actorType: "app",
          actorId: profile.id,
          actorName: profile.name,
          action: "relay.profile.disconnect",
          decision: "allowed",
          reason: `The app disconnected its own ${request.body.engine} login.`,
          resourceType: "relay_profile",
          resourceId: profile.id,
        });
        return { connected: false };
      } catch (error) {
        const code =
          error instanceof Error ? error.message : "RELAY_DISCONNECT_FAILED";
        return reply.code(502).send({ error: code });
      }
    },
  );

  // Rotate, from the app itself: no trip into Vaenyx's Settings. The old key
  // stops working before the response carrying the new one is written, and the
  // new key is bound to the same profile by construction — it is an UPDATE of
  // this profile's row, and the request named no profile to redirect.
  app.post(
    "/v1/relay/profile/key/rotate",
    {
      schema: {
        response: {
          200: RelayRotateKeyResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      allowRelayOrigin(request, reply);
      if (outsideTailnet(request)) {
        return reply.code(403).send({ error: "RELAY_TAILNET_REQUIRED" });
      }
      const profile = knockingProfile(request);
      if (profile === "wrong-kind") {
        return reply.code(403).send({ error: "RELAY_KEY_WRONG_KIND" });
      }
      if (!profile) {
        return reply.code(401).send({ error: "RELAY_PROFILE_REQUIRED" });
      }
      const rotated = regenerateAppProfileToken(
        context.database,
        profile.id,
        context.config.secretsDirectory,
      );
      recordAudit(context.database, {
        actorType: "app",
        actorId: profile.id,
        actorName: profile.name,
        action: "relay.profile.key.rotate",
        decision: "allowed",
        reason: "The app rotated its own key; the previous key is dead.",
        resourceType: "relay_profile",
        resourceId: profile.id,
      });
      return {
        token: rotated.token,
        keyVersion: appProfileKeyInfo(context.database, profile.id).version,
      };
    },
  );

  // This month's spend, per app × engine — the Owner's page, not the apps'.
  // The promise it keeps: a nod that keeps costing money keeps being visible.
  app.get(
    "/v1/relay/usage",
    {
      schema: {
        response: { 200: RelayUsageResponseSchema, 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      return { month: usageMonth(), rows: listMonthUsage(context.database) };
    },
  );

  // The capability switches. They existed in code from the day the three layers
  // landed and the Owner had no way to touch them, so every instance sat on the
  // defaults — a ceiling nobody could lower.
  //
  // 🔴 Owner only. Somebody inside a restricted mode must not be able to widen
  // their own mode, or the mode is decoration. Every change is audited: who,
  // when, which capability, on or off.
  app.get(
    "/v1/capabilities",
    {
      schema: {
        response: {
          200: Type.Object(
            {
              global: Type.Record(Type.String(), Type.Boolean()),
              session: Type.Record(Type.String(), Type.Boolean()),
              vocabulary: Type.Array(Type.String()),
              implemented: Type.Record(Type.String(), Type.Boolean()),
              neverViaToken: Type.Array(Type.String()),
              needsOwnTokenApproval: Type.Array(Type.String()),
              usedByMethods: Type.Record(Type.String(), Type.Number()),
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
      // 🔴 TWO CEILINGS, BECAUSE THERE ARE TWO QUESTIONS AND THEY HAVE DIFFERENT
      // ANSWERS INSIDE A MODE. `global` is the machine's own switches — what the
      // Capabilities card writes, and what an app key's grant is measured
      // against, both of which are about the instance and not about whoever is
      // asking. `session` is global ∩ the mode this session is in: what the
      // caller may actually do right now.
      //
      // The browser needs the second one because it performs some capabilities
      // ITSELF. Device text-to-speech is spoken by the page and never sends a
      // request, so this answer is the only thing that can stop it — while it
      // read `global`, a mode with Speaking narrowed off still spoke, and a
      // switch that does nothing is exactly what the three layers exist to
      // prevent. Anything the browser does on its own gates on `session`.
      //
      // Handing back what this session may do is not a map out of the mode: it
      // is what the session discovers by trying. What a DIFFERENT mode still
      // allows stays behind /v1/capabilities/modes/:id, which refuses inside a
      // mode for exactly that reason.
      const session = Object.fromEntries(
        CAPABILITIES.map((capability) => [
          capability,
          capabilityRefusedBy(
            context.database,
            capability,
            owner.modeId ?? null,
          ) === null,
        ]),
      );
      return {
        global: readGlobalCapabilities(context.database),
        session,
        vocabulary: [...CAPABILITIES],
        implemented: CAPABILITY_IMPLEMENTED,
        // What an app key may never be handed, and what it may be handed only
        // as its own separate act. Both come from here rather than being
        // written into the screen a second time: the day one of those lists
        // changes, the screen has to change with it or it starts lying.
        neverViaToken: [...NEVER_VIA_TOKEN],
        needsOwnTokenApproval: [...NEEDS_OWN_TOKEN_APPROVAL],
        // How many Methods declared each capability — so the row can say who
        // would notice before the switch goes off. A view; it decides nothing.
        usedByMethods: countMethodsPerCapability(
          context.config.libraryDirectory,
        ),
      };
    },
  );

  app.put<{
    Body: Record<string, boolean>;
    Querystring: { lang?: string };
  }>(
    "/v1/capabilities",
    {
      schema: {
        body: Type.Record(Type.String(), Type.Boolean()),
        response: {
          200: Type.Record(Type.String(), Type.Boolean()),
          400: ErrorResponseSchema,
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
      const language: CapabilityLanguage =
        request.query.lang === "zh" ? "zh" : "en";
      // The prefix list above only bites inside a mode that has "lock
      // settings" ticked, and the ceiling needs more than that: a mode's
      // capabilities are intersected with the global ones, so ANY session
      // inside ANY mode that could raise the ceiling would be widening its
      // own mode. Mode management is already User-Mode-only for the same
      // reason; this is the other half of the same door.
      if (owner.modeId) {
        return reply
          .code(403)
          .send({ error: switchesLiveInUserMode(language) });
      }
      const unknown = Object.keys(request.body).filter(
        (name) => !isCapability(name),
      );
      if (unknown.length > 0) {
        return reply.code(400).send({
          error:
            language === "zh"
              ? `这不是一项能力:${unknown.join(", ")}`
              : `Not a capability: ${unknown.join(", ")}`,
        });
      }
      const next = writeGlobalCapabilities(context.database, request.body);
      for (const [name, on] of Object.entries(request.body)) {
        recordAudit(context.database, {
          actorType: "owner",
          actorName: owner.name,
          action: "capability.switch",
          decision: on ? "allowed" : "denied",
          reason: `${name} switched ${on ? "on" : "off"} globally.`,
          resourceType: "capability",
          resourceId: name,
        });
      }
      return next;
    },
  );

  // WHAT ONE MODE MAY DO — the middle of the three layers. The column has been
  // on `modes` since migration 0053 and nothing in the server ever wrote it, so
  // every mode sat at NULL and the layer did nothing at all.
  //
  // The whole point of a mode ceiling is a device you hand to somebody else
  // being narrower than your own instance, so the answer carries the global
  // switches with it: a capability the INSTANCE has switched off has to show as
  // unavailable in the mode rather than as a switch that would quietly do
  // nothing.
  app.get<{ Params: { id: string }; Querystring: { lang?: string } }>(
    "/v1/capabilities/modes/:id",
    {
      schema: {
        params: Type.Object({ id: Type.String({ minLength: 1 }) }),
        response: {
          200: ModeCapabilitiesSchema,
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
      // Reading is refused inside a mode as well as writing, and that is not
      // caution for its own sake: knowing exactly which capabilities a mode
      // still has is the map somebody would use to look for a way out of it.
      // Every other mode setting is already User-Mode-only for the same reason.
      if (owner.modeId) {
        return reply.code(403).send({
          error: switchesLiveInUserMode(
            request.query.lang === "zh" ? "zh" : "en",
          ),
        });
      }
      const mode = findMode(context.database, request.params.id);
      if (!mode) return reply.code(404).send({ error: "Mode not found." });
      const stored = readModeCapabilities(context.database, mode.id);
      const capabilities: Record<string, boolean> = {};
      for (const capability of CAPABILITIES) {
        capabilities[capability] = stored
          ? stored.includes(capability)
          : // NULL: this mode has never been narrowed, so it adds nothing of
            // its own and every row starts where the instance leaves it.
            true;
      }
      return {
        modeId: mode.id,
        modeName: mode.name,
        capabilities,
        narrowed: stored !== null,
        global: readGlobalCapabilities(context.database),
        implemented: CAPABILITY_IMPLEMENTED,
      };
    },
  );

  app.put<{
    Params: { id: string };
    Body: Record<string, boolean>;
    Querystring: { lang?: string };
  }>(
    "/v1/capabilities/modes/:id",
    {
      schema: {
        params: Type.Object({ id: Type.String({ minLength: 1 }) }),
        body: Type.Record(Type.String(), Type.Boolean()),
        response: {
          200: ModeCapabilitiesSchema,
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
      const language: CapabilityLanguage =
        request.query.lang === "zh" ? "zh" : "en";
      // 🔴 The guarantee the whole layer rests on: a session inside ANY mode
      // cannot change ANY mode's capabilities — least of all its own. The
      // locked-mode prefix hook above only bites when "lock settings" is
      // ticked, which would leave every unlocked mode able to hand itself back
      // whatever it was denied.
      if (owner.modeId) {
        return reply
          .code(403)
          .send({ error: switchesLiveInUserMode(language) });
      }
      const unknown = Object.keys(request.body).filter(
        (name) => !isCapability(name),
      );
      if (unknown.length > 0) {
        return reply.code(400).send({
          error:
            language === "zh"
              ? `这不是一项能力:${unknown.join(", ")}`
              : `Not a capability: ${unknown.join(", ")}`,
        });
      }
      const mode = findMode(context.database, request.params.id);
      if (!mode) return reply.code(404).send({ error: "Mode not found." });

      let stored: Capability[];
      try {
        stored = writeModeCapabilities(
          context.database,
          mode.id,
          request.body as Partial<Record<Capability, boolean>>,
        );
      } catch (error) {
        // The one thing a mode may not do. It is answered in the Owner's own
        // words rather than as a validation failure, because the fix is a
        // switch on the card above and nobody guesses that from "400".
        if (error instanceof ModeAboveCeilingError) {
          return reply.code(400).send({
            error: modeAboveCeilingMessage(error.capabilities, language),
          });
        }
        throw error;
      }
      // Audited exactly like the global switches, and named so the Guard page
      // can tell the two apart at a glance: who, when, which mode, which
      // capability, on or off.
      for (const [name, on] of Object.entries(request.body)) {
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "capability.mode.switch",
          decision: on ? "allowed" : "denied",
          reason: `${name} switched ${on ? "on" : "off"} for mode "${mode.name}".`,
          resourceType: "mode",
          resourceId: mode.id,
        });
      }
      const capabilities: Record<string, boolean> = {};
      for (const capability of CAPABILITIES) {
        capabilities[capability] = stored.includes(capability);
      }
      return {
        modeId: mode.id,
        modeName: mode.name,
        capabilities,
        narrowed: true,
        global: readGlobalCapabilities(context.database),
        implemented: CAPABILITY_IMPLEMENTED,
      };
    },
  );

  // THE FOLDER WHITELIST behind "Files on this machine". It is deliberately a
  // second, separate decision from the switch: switching Fetching on still
  // reads nothing at all until a folder is named here, so a stray tap on a
  // toggle can never open the disk.
  //
  // These sit under /v1/capabilities on purpose — the locked-mode prefix list
  // matches by prefix, so a restricted session cannot add itself a folder any
  // more than it can raise the ceiling.
  app.get(
    "/v1/capabilities/folders",
    {
      schema: {
        response: {
          200: Type.Object(
            { folders: Type.Array(Type.String()) },
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
      return { folders: readFetchFolders(context.database) };
    },
  );

  // The folders this machine actually has, by name, so naming one is a click
  // rather than a spelling test (see suggestFetchFolders). Owner-only: it
  // reveals real paths from the Owner's home directory.
  app.get<{ Querystring: { lang?: string } }>(
    "/v1/capabilities/folders/suggestions",
    async (request, reply) => {
      if (!requireOwner(request)) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      return { folders: suggestFetchFolders(request.query.lang ?? "en") };
    },
  );

  // Walk the machine's folders to pick one. Directories only, Owner-only, and
  // it opens nothing — see browseFolders for why this exists rather than a
  // native dialog.
  app.get<{ Querystring: { path?: string } }>(
    "/v1/capabilities/folders/browse",
    async (request, reply) => {
      if (!requireOwner(request)) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      try {
        return browseFolders(request.query.path ?? "");
      } catch {
        return reply
          .code(400)
          .send({ error: "That folder could not be opened." });
      }
    },
  );

  app.put<{ Body: { folders: string[] }; Querystring: { lang?: string } }>(
    "/v1/capabilities/folders",
    {
      schema: {
        body: Type.Object(
          {
            folders: Type.Array(Type.String({ maxLength: 4000 }), {
              maxItems: 64,
            }),
          },
          { additionalProperties: false },
        ),
        response: {
          200: Type.Object(
            {
              folders: Type.Array(Type.String()),
              rejected: Type.Array(
                Type.Object(
                  { folder: Type.String(), reason: Type.String() },
                  { additionalProperties: false },
                ),
              ),
            },
            { additionalProperties: false },
          ),
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
      // The same any-mode door as the switches themselves: a mode narrows what
      // may happen, so a session inside one must not be able to widen the very
      // list the narrowing is measured against.
      if (owner.modeId) {
        return reply.code(403).send({
          error: switchesLiveInUserMode(
            request.query.lang === "zh" ? "zh" : "en",
          ),
        });
      }
      const result = writeFetchFolders(
        context.database,
        request.body.folders,
        // Vaenyx's own data is never inside the whitelist, however it is typed.
        [context.config.dataDirectory, context.config.secretsDirectory],
      );
      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "capability.folders",
        decision: result.folders.length > 0 ? "allowed" : "denied",
        reason: `Files on this machine may now be opened from ${result.folders.length} folder(s).`,
        resourceType: "capability",
        resourceId: "fetching",
      });
      return result;
    },
  );

  // THE WAITING LIST, written only when the Owner says it may be (copy pack N3).
  // A publish refused for a capability Vaenyx has not built used to count the
  // attempt on its way past and then tell the Owner it had; this is the same
  // counter with the question asked first.
  //
  // What lands in the table is the capability NAME and a count. Nothing about
  // the Method, nothing about its recipe, and it never leaves this machine —
  // which is exactly what the string the Owner just read promised, so a future
  // sender of this table changes that string in the same commit.
  //
  // Under /v1/capabilities on purpose: the locked-mode prefix list matches by
  // prefix, so a restricted session cannot reach it either.
  app.post<{
    Body: { capabilities: string[] };
    Querystring: { lang?: string };
  }>(
    "/v1/capabilities/wanted",
    {
      schema: {
        body: Type.Object(
          {
            capabilities: Type.Array(Type.String({ maxLength: 64 }), {
              maxItems: 16,
            }),
          },
          { additionalProperties: false },
        ),
        response: {
          200: Type.Object(
            { counted: Type.Array(Type.String()) },
            { additionalProperties: false },
          ),
          400: ErrorResponseSchema,
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
      const language: CapabilityLanguage =
        request.query.lang === "zh" ? "zh" : "en";
      // Same door as the switches: whoever is inside a mode is not the person
      // who answers a question about what this instance records.
      if (owner.modeId) {
        return reply
          .code(403)
          .send({ error: switchesLiveInUserMode(language) });
      }
      const named = request.body.capabilities.filter(isCapability);
      if (named.length === 0) {
        return reply.code(400).send({
          error:
            language === "zh"
              ? "这不是一项能力。"
              : "That is not a capability.",
        });
      }
      // recordCapabilityWanted keeps its own rule about what belongs in the
      // table: only what a Method run genuinely cannot reach yet. A capability
      // the Owner merely switched off is not something anybody is waiting for,
      // and a consent cannot talk that filter out of the way.
      recordCapabilityWanted(context.database, named);
      const counted = listCapabilityWaiting(context.database)
        .map((row) => row.capability)
        .filter((capability) => named.includes(capability));
      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "capability.wanted",
        decision: "allowed",
        reason: `The Owner agreed to record that ${counted.join(", ") || named.join(", ")} was wanted.`,
        resourceType: "capability",
        resourceId: counted[0] ?? named[0] ?? "",
      });
      return { counted };
    },
  );

  // THE ROW'S OWN TEST. One press really performs the capability once, against
  // something whose answer is already known, and reports which of three things
  // happened — it worked, it failed in the failing side's own words, or that
  // path is not built. The probes themselves live in core/capability-probe.ts.
  //
  // 🔴 The path deliberately does NOT begin "/v1/capabilities": that prefix is
  // matched by startsWith in two places that would both be wrong here — the
  // locked-mode mutation list, and the web app's "Saved" toast rule, which
  // would pop "Saved" over a test result on every press.
  app.post<{ Params: { capability: string }; Querystring: { lang?: string } }>(
    "/v1/capability-test/:capability",
    {
      schema: {
        response: {
          200: CapabilityTestResultSchema,
          400: ErrorResponseSchema,
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
      const language: CapabilityLanguage =
        request.query.lang === "zh" ? "zh" : "en";
      // A test spends the Owner's real money on their real account and names
      // their engines. It belongs to the person who owns the account, not to
      // whoever happens to be sitting inside a mode — the same door the
      // switches themselves have.
      if (owner.modeId) {
        return reply
          .code(403)
          .send({ error: switchesLiveInUserMode(language) });
      }
      const capability = request.params.capability;
      if (!isCapability(capability)) {
        return reply.code(400).send({
          error:
            language === "zh"
              ? `这不是一项能力:${capability}`
              : `Not a capability: ${capability}`,
        });
      }
      // The switch comes first, and it answers in the Owner's own words. A test
      // that performed the thing anyway would be the one place in the app where
      // an off switch does not mean off.
      const refused = capabilityRefusal(capability, owner, language);
      if (refused) {
        return { status: "failed" as const, engine: "", detail: refused };
      }
      if (!CAPABILITY_IMPLEMENTED[capability]) {
        return {
          status: "not-implemented" as const,
          engine: "",
          detail:
            language === "zh"
              ? "这一项 Vaenyx 还没有做出来。"
              : "Vaenyx has not built this one yet.",
        };
      }
      // Resolved here rather than inside the probe: the registry is process
      // state, and a probe that reached for it could not be driven by a test
      // without a real backend behind it.
      let mainModel: ModelProvider | null = null;
      try {
        mainModel = getDefaultProvider();
      } catch {
        // Nothing registered at all — the probes say so in the Owner's words.
      }
      const result = await runCapabilityProbe(capability, {
        database: context.database,
        dataDirectory: context.config.dataDirectory,
        secretsDirectory: context.config.secretsDirectory,
        lang: language,
        owner: { id: owner.id, name: owner.name },
        provider: mainModel,
      });
      // Recorded whichever way it went, the way the Forge test is: what was
      // tried, with which engine, and what came back, so a Test pressed last
      // week is still answerable this week. A press that never got past the
      // switch above is already written down as the refusal it was — one press,
      // one row, under the name of what actually happened.
      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "capability.test",
        decision: result.status === "ok" ? "allowed" : "denied",
        reason:
          `${capability} test: ${result.status}${result.engine ? ` (${result.engine})` : ""} — ${result.detail}`.slice(
            0,
            500,
          ),
        resourceType: "capability",
        resourceId: capability,
      });
      return result;
    },
  );

  app.get(
    "/v1/relay",
    {
      schema: { response: { 200: RelayPanelSchema, 401: ErrorResponseSchema } },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      return {
        settings: readRelayConfig(context.database),
        calls: listRelayCalls(context.database),
      };
    },
  );

  app.put<{ Body: UpdateRelaySettingsRequest }>(
    "/v1/relay/settings",
    {
      schema: {
        body: UpdateRelaySettingsRequestSchema,
        response: { 200: RelaySettingsSchema, 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      const settings = writeRelayConfig(context.database, request.body);
      recordAudit(context.database, {
        actorType: "owner",
        actorName: owner.name,
        action: "relay.settings.update",
        decision: "allowed",
        reason: settings.enabled ? "Door open." : "Door closed.",
        resourceType: "relay_settings",
      });
      return settings;
    },
  );

  // Mint or revoke the door's key. Minting REPLACES: the previous key stops
  // working the instant this returns, which is how an app is cut off without
  // closing the door on the others. The plain text is returned exactly once and
  // stored nowhere — only its hash and its last four characters are kept.

  // The Test button sends a REAL request down the engine the Owner is looking
  // at. It never reads a config file, never trusts a vendor page, and never
  // asks the model whether it works.

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
        if (
          error instanceof Error &&
          error.message === "APP_PROFILE_NOT_FOUND"
        ) {
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
        if (
          error instanceof Error &&
          error.message === "APP_PROFILE_NOT_FOUND"
        ) {
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
      "application/pdf",
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

  // A capability's PAIR: who does this job, and the stand-in the Owner
  // picked for when that one cannot answer at all. One shape for every
  // capability — the two-level picker (backend, then that backend's own
  // models) reads and writes through here.
  app.get<{ Params: { slot: string } }>(
    "/v1/engines/:slot",
    {
      schema: {
        params: Type.Object(
          { slot: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        response: {
          200: EnginePairSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      if (!requireOwner(request)) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      const slot = ENGINE_SLOTS.find((entry) => entry === request.params.slot);
      if (!slot) {
        return reply.code(400).send({ error: "No such capability." });
      }
      return { slot, ...readEnginePair(context.config.secretsDirectory, slot) };
    },
  );

  // The Settings language switch lands here, so the server composes its own
  // sentences — push bodies above all — in the language the Owner reads.
  // Owner-only and deliberately not on the locked-mode floor: a language is
  // not a capability.
  app.post<{ Body: { language: "en" | "zh" } }>(
    "/v1/system/language",
    {
      schema: {
        body: Type.Object(
          { language: Type.Union([Type.Literal("en"), Type.Literal("zh")]) },
          { additionalProperties: false },
        ),
        response: { 200: Type.Object({ ok: Type.Boolean() }) },
      },
    },
    async (request, reply) => {
      if (!requireOwner(request)) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      writeAppLanguage(context.config.dataDirectory, request.body.language);
      return { ok: true };
    },
  );

  app.post<{ Params: { slot: string }; Body: SetEngineChoiceRequest }>(
    "/v1/engines/:slot",
    {
      schema: {
        params: Type.Object(
          { slot: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: SetEngineChoiceRequestSchema,
        response: {
          200: EnginePairSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      if (!requireOwner(request)) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      const slot = ENGINE_SLOTS.find((entry) => entry === request.params.slot);
      if (!slot) {
        return reply.code(400).send({ error: "No such capability." });
      }
      const choice = request.body.choice;
      if (choice) {
        // Speaking has two answers that are not accounts at all: this browser's
        // own voice, and the one downloaded onto this machine. Neither has a
        // key to check — the downloaded one is checked for being THERE.
        if (choice.provider === "local") {
          if (!isLocalTtsInstalled(context.config.dataDirectory)) {
            return reply.code(400).send({
              error:
                "The voice on this machine is not installed yet — install it under Models first.",
            });
          }
        } else if (choice.provider !== "browser") {
          // 🔴 ASK THE ONE PLACE THAT ALREADY KNOWS. This used to re-derive
          // "is it connected" from `apiKey`, plus a hand-written exception for
          // Codex — and it got the Claude subscription wrong, because that one
          // signs in on the MACHINE and may have no key stored at all. The
          // Owner had it connected, saw it in the list, picked it as a backup,
          // and was told to go and connect it (Oskar, 2026-08-17). A second
          // copy of a rule is a second chance to disagree with it; this is the
          // same list the picker itself was filled from.
          const known = listModelProviders(
            context.config.secretsDirectory,
          ).find((provider) => provider.id === choice.provider);
          if (!known?.connected) {
            return reply.code(400).send({
              error:
                "That backend is not connected yet — connect it under Models first, then pick it here.",
            });
          }
        }
      }
      const pair = writeEngineChoice(
        context.config.secretsDirectory,
        slot,
        request.body.which,
        choice,
      );
      // Chat's main engine IS the default backend (engine-slots.ts), so it has
      // to take effect on the next message, not the next restart.
      if (slot === "chat") initModelRegistry(context.config);
      return { slot, ...pair };
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

  app.post<{ Body: { provider: string } }>(
    "/v1/images/engine",
    {
      schema: {
        // WHICH connected backend draws, and nothing else. No key comes through
        // here any more: connecting Workers AI is POST /v1/models/workersai,
        // because a call that stored a key AND re-pointed this row meant the
        // Owner's choice was overwritten every time they saved a token.
        body: Type.Object(
          { provider: Type.String({ minLength: 1 }) },
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
        return setImageEngine(
          context.config.secretsDirectory,
          request.body.provider as ImageEngineChoice,
        );
      } catch (error) {
        if (error instanceof Error && error.message === "IMAGE_NO_KEY") {
          return reply.code(400).send({
            error:
              "That model has no key yet — connect it under Models first, then pick it here.",
          });
        }
        throw error;
      }
    },
  );

  // CONNECTING Cloudflare Workers AI — its own door, because it is its own act.
  // Every other provider is connected through /v1/models/providers/:id; this one
  // needs a route of its own only because the pair has to be VERIFIED with a
  // real Workers AI call and the account id looked up, neither of which the
  // generic connect does. What it deliberately does NOT do is decide what draws:
  // that is the Drawing row's answer, and an empty slot fills itself the way the
  // voice and vision slots always have.
  app.post<{ Body: { apiKey?: string; accountId?: string } }>(
    "/v1/models/workersai",
    {
      schema: {
        body: Type.Object(
          {
            apiKey: Type.Optional(Type.String({ maxLength: 500 })),
            // Asked for because a Workers AI-template token cannot name its own
            // account. Either field may be left out when the card is already
            // connected: whichever is blank falls back to what is stored, so a
            // wrong account id can be fixed without re-pasting the token.
            accountId: Type.Optional(Type.String({ maxLength: 64 })),
          },
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
        await connectWorkersAi(
          context.config.secretsDirectory,
          request.body.apiKey,
          request.body.accountId,
        );
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        if (code === "IMAGE_NO_KEY") {
          return reply.code(400).send({
            error: "Paste the Workers AI token — there is none stored yet.",
          });
        }
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
      // The stored pair carries a chat base URL as well, so re-register:
      // without this the Models card would go on calling Workers AI "Not
      // Connected" until the next restart, right after the Owner connected it.
      initModelRegistry({ secretsDirectory: context.config.secretsDirectory });
      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "model.provider.connect",
        decision: "allowed",
        reason: 'Owner connected model provider "workersai".',
        resourceType: "system",
      });
      return { providers: listModelProviders(context.config.secretsDirectory) };
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
          403: ErrorResponseSchema,
          502: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      const language: CapabilityLanguage =
        request.query.lang === "zh" ? "zh" : "en";
      const refused = capabilityRefusal("vision", owner, language);
      if (refused) return reply.code(403).send({ error: refused });
      const image = request.body as Buffer | undefined;
      if (!image || !Buffer.isBuffer(image) || image.length === 0) {
        return reply.code(400).send({ error: "No image received." });
      }
      try {
        const described = await describeImage(
          context.config.secretsDirectory,
          image,
          request.headers["content-type"] ?? "image/jpeg",
          language,
        );
        return { text: described.value };
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
        return reply.code(502).send({
          error: `Photo analysis failed: ${message || "unknown error"}`,
        });
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

  app.post<{ Querystring: { lang?: string } }>(
    "/v1/voice/transcribe",
    {
      bodyLimit: 15_000_000,
      schema: {
        response: {
          200: TranscribeVoiceResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          502: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      // The recording itself carries no language until it has been
      // transcribed — and the refusal happens before that — so the screen the
      // mic button sits on says which language to answer in. Refusing a
      // Chinese-speaking Owner in English was the one thing this route could
      // still get wrong.
      const refused = capabilityRefusal(
        "hearing",
        owner,
        request.query.lang === "zh" ? "zh" : "en",
      );
      if (refused) return reply.code(403).send({ error: refused });
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
          // Naming the card matters more than it used to: the download button
          // is no longer in the drawer this row's chooser sits above.
          return reply.code(400).send({
            error:
              "Local voice is not installed yet — download it under Models first.",
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
        if (error instanceof Error && error.message === "LOCAL_VOICE_UNKNOWN") {
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
          403: ErrorResponseSchema,
          502: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      // The sentence about to be spoken is the only language signal this
      // route has, and it is the same one the local engine already uses to
      // pick its voice.
      const refused = capabilityRefusal(
        "speaking",
        owner,
        /[一-鿿]/.test(request.body.text) ? "zh" : "en",
      );
      if (refused) return reply.code(403).send({ error: refused });
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
          // Two different situations wore the same sentence, and one of them
          // was actively misleading: "pick Gemini or Local Voice" told an
          // Owner who HAD picked Gemini to go and do what they had already
          // done. The engine can also be set and unusable — its provider's
          // key is gone — and that has a different fix (Oskar, 2026-08-07).
          const chosen = readProviderConnections(
            context.config.secretsDirectory,
          );
          const engine = chosen.voiceOutput?.engine;
          const staleKey =
            engine &&
            engine !== "browser" &&
            engine !== "local" &&
            !chosen[engine]?.apiKey;
          return reply.code(400).send({
            error: staleKey
              ? `Speaking is set to ${engine}, but ${engine} has no key on this machine any more — connect it again under Models, or switch this row to the voice on this machine.`
              : "Voice output has no speech engine — pick one on the Speaking row, or install the voice on this machine under Models.",
          });
        }
        // Cloudflare's voice is an English one. Saying so beats reading a
        // Chinese reply as if it were English, which is what it would do.
        if (message === "VOICE_TTS_ENGLISH_ONLY") {
          return reply.code(400).send({
            error:
              "The Cloudflare voice speaks English only. For Chinese, set Speaking to Gemini, or install the voice on this machine under Models — it speaks both.",
          });
        }
        // A free-tier refusal is a RATE limit, not an exhausted allowance:
        // Google permits three speech requests a minute per model and says
        // how many seconds to wait (measured 2026-08-07). The old wording,
        // "used up right now — wait a while", sent the Owner off to change
        // engines over what is usually an eight-second pause.
        if (message.startsWith("VOICE_TTS_RATE_LIMITED")) {
          const seconds = message.split(":")[1];
          const wait = seconds
            ? `Try again in about ${seconds} seconds.`
            : "Try again in a moment.";
          return reply.code(429).send({
            error: `Gemini's free tier allows three spoken replies a minute. ${wait} The voice on this machine has no such limit — install it under Models.`,
          });
        }
        if (message.startsWith("VOICE_TTS_FAILED:")) {
          const status = message.split(":")[1];
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
        body:
          pushLanguage() === "zh"
            ? "测试通知 —— 推送是通的。"
            : "Test notification — pushes are working.",
        url: "/",
        // A test exists to be SEEN. Without this, pressing Test on the phone
        // with the app open showed nothing — the service worker's "never
        // notify over the app you are looking at" rule ate it, and it read
        // as broken (Oskar, 2026-08-23).
        force: true,
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

  // Mark the objects in a stored photo (Oskar, 2026-07-28): the vision engine
  // returns each item's position; dots + names are stored per image so the
  // overlay survives reopening the chat. Re-marking overwrites.
  app.post<{ Body: AnnotateImageRequest }>(
    "/v1/vision/annotate",
    {
      schema: {
        body: AnnotateImageRequestSchema,
        response: {
          200: AnnotateImageResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
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
      const language: CapabilityLanguage =
        request.body.language === "zh" ? "zh" : "en";
      const refused = capabilityRefusal("vision", owner, language);
      if (refused) return reply.code(403).send({ error: refused });
      const found = readImage(
        context.config.dataDirectory,
        request.body.imageId,
      );
      if (!found) {
        return reply.code(404).send({ error: "Image not found." });
      }
      try {
        const { value: items } = await annotateImage(
          context.config.secretsDirectory,
          found.image,
          found.mimeType,
          language,
        );
        context.database.sqlite
          .prepare(
            `INSERT INTO image_annotations (image_id, items, created_at)
             VALUES (?, ?, ?)
             ON CONFLICT(image_id) DO UPDATE SET items = excluded.items,
               created_at = excluded.created_at`,
          )
          .run(
            request.body.imageId,
            JSON.stringify(items),
            new Date().toISOString(),
          );
        return { items };
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        if (code === "VISION_NOT_CONNECTED") {
          return reply.code(400).send({
            error:
              "No vision model is connected, so the photo could not be marked. Connect one under Settings → AI Setting → Models.",
          });
        }
        return reply.code(502).send({
          error: "The photo could not be marked. Try again.",
        });
      }
    },
  );

  // Document Reading: store a document (PDF, plain text, or a Word/Excel/
  // PowerPoint file) and report the facts the M1 cost gate needs — above all
  // a PDF's REAL page count. Every refusal says what is actually wrong (too
  // big, too many pages, password-protected, old Office format, unreadable),
  // because "something went wrong" is not something an Owner can act on.
  app.post<{ Querystring: { lang?: string } }>(
    "/v1/documents/upload",
    {
      bodyLimit: MAX_DOCUMENT_BYTES + 1024,
      schema: {
        response: {
          200: DocumentUploadResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          413: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      // Refused before the file is stored, not after: a document that may
      // not be read has no business sitting in the Owner's data directory.
      // A PDF has no language this route can trust, so the attach button
      // sends the one the Owner is reading the app in.
      const refused = capabilityRefusal(
        "reading",
        owner,
        request.query.lang === "zh" ? "zh" : "en",
      );
      if (refused) return reply.code(403).send({ error: refused });
      const file = request.body as Buffer | undefined;
      if (!file || !Buffer.isBuffer(file) || file.length === 0) {
        return reply.code(400).send({ error: "No document received." });
      }
      const rawName = request.headers["x-document-name"];
      const name = (
        typeof rawName === "string" && rawName.trim()
          ? decodeURIComponent(rawName).trim()
          : "document"
      ).slice(0, 200);

      let pages: number;
      let facts: { pages: number; scanned?: boolean };
      try {
        facts = await inspectDocument(file);
        pages = facts.pages;
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        // The refusals are read by the Owner in the attach flow, so they
        // follow the app's bilingual rule using the same `lang` the
        // capability refusal above already trusts.
        const zh = request.query.lang === "zh";
        if (code === "DOCUMENT_TOO_LARGE") {
          const limitMb = Math.round(MAX_DOCUMENT_BYTES / (1024 * 1024));
          return reply.code(413).send({
            error: zh
              ? `这个文件超过 ${limitMb} MB,已经超出模型一次能接收的上限。把它拆开,发你需要的那部分。`
              : `That file is larger than ${limitMb} MB, which is the most a model will take in one request. Split it and send the part you need.`,
          });
        }
        if (code === "DOCUMENT_TOO_MANY_PAGES") {
          return reply.code(400).send({
            error: zh
              ? `这份文档超过 ${MAX_DOCUMENT_PAGES} 页,已经超出模型一次能读的页数。把它拆开,发你需要的那几页。`
              : `That document has more than ${MAX_DOCUMENT_PAGES} pages, which is more than a model will read in one request. Split it and send the pages you need.`,
          });
        }
        if (code === "DOCUMENT_PASSWORD") {
          // "File", not "PDF": an Office archive with encrypted entries lands
          // here too, and the fix is the same sentence.
          return reply.code(400).send({
            error: zh
              ? "这个文件有密码保护,打不开。另存一份没有密码的,再发那份。"
              : "That file is password-protected, so it cannot be opened. Save an unlocked copy and send that.",
          });
        }
        if (code === "DOCUMENT_UNPACKS_TOO_LARGE") {
          // An Office file that inflates past the safety cap — corrupt or a
          // zip bomb; either way the honest advice is a smaller file.
          return reply.code(400).send({
            error: zh
              ? "这个文件解开后太大,这台电脑一次装不下。把它拆开,发你需要的那部分。"
              : "That file unpacks to more than this machine will safely hold in one go. Split it and send the part you need.",
          });
        }
        if (code === "DOCUMENT_LEGACY_OFFICE") {
          return reply.code(400).send({
            error: zh
              ? "这是旧格式的 Office 文件(.doc、.xls、.ppt),Vaenyx 打不开。把它另存为 PDF 或新格式(.docx、.xlsx、.pptx),再发那份。"
              : "That is an old-format Office file (.doc, .xls, .ppt), which Vaenyx cannot open. Save it as PDF or as the modern format (.docx, .xlsx, .pptx) and send that.",
          });
        }
        return reply.code(400).send({
          error: zh
            ? "这个文件读不了。Vaenyx 能收 PDF、纯文本文件(.txt、.md)和 Word、Excel、PowerPoint 文件(.docx、.xlsx、.pptx)。如果内容主要是图像 —— 扫描件、图纸 —— 把它另存为 PDF,会按图片来读。"
            : "That file could not be read. Vaenyx takes PDFs, plain-text files (.txt, .md) and Word, Excel or PowerPoint files (.docx, .xlsx, .pptx). If it is mostly visual — a scan, a drawing — save it as PDF, which is read as pictures.",
        });
      }

      // A scanned PDF is pictures of words: reading it AT ALL means OCR, the
      // eighth capability. Refused here, at the moment of the drop, with the
      // fix in the same sentence — the old behaviour was a silent empty
      // extraction, which read as "Vaenyx is broken" instead of "one switch
      // is off".
      if (facts.scanned) {
        const zhq = request.query.lang === "zh";
        if (capabilityOff(context.database, "ocr")) {
          return reply.code(403).send({
            error: zhq
              ? "DOCUMENT_NEEDS_OCR:这份是扫描件,里面没有可直接读取的文字。需要打开「图转文」才能读它。"
              : "DOCUMENT_NEEDS_OCR:This one is a scan — there is no text in it to read directly. Turning images into text (OCR) has to be on to read it.",
          });
        }
        if (!ocrEngineConnected(context.config.secretsDirectory)) {
          return reply.code(503).send({
            error: zhq
              ? "「图转文」开着,但还没有连上它的引擎 —— 到 Models 里给 Mistral 贴上 key。"
              : "OCR is on, but its engine is not connected yet — paste a Mistral key under Models.",
          });
        }
      }

      const documentId = saveDocument(context.config.dataDirectory, file);
      return {
        documentId,
        name,
        pages,
        needsCostGate: pages >= DOCUMENT_GATE_PAGES,
      };
    },
  );

  // Save the Owner's corrected marks (edited on a confirm card / photo). The
  // model made the first pass; the Owner's edit is the truth from here on.
  app.put<{ Body: SaveAnnotationsRequest }>(
    "/v1/vision/annotations",
    {
      schema: {
        body: SaveAnnotationsRequestSchema,
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
      const found = readImage(
        context.config.dataDirectory,
        request.body.imageId,
      );
      if (!found) {
        return reply.code(404).send({ error: "Image not found." });
      }
      const items = request.body.items
        .map((item) => ({
          name: item.name.trim().slice(0, 40),
          x: Math.min(100, Math.max(0, item.x)),
          y: Math.min(100, Math.max(0, item.y)),
        }))
        .filter((item) => item.name);
      context.database.sqlite
        .prepare(
          `INSERT INTO image_annotations (image_id, items, created_at)
           VALUES (?, ?, ?)
           ON CONFLICT(image_id) DO UPDATE SET items = excluded.items,
             created_at = excluded.created_at`,
        )
        .run(
          request.body.imageId,
          JSON.stringify(items),
          new Date().toISOString(),
        );
      return { message: "Saved." };
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
      savePushSubscription(
        context.database,
        request.body,
        request.body.deviceId ?? null,
      );
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

  // ── One-click login grants (Oskar, 2026-08-30) ──────────────────────────
  // Engine logins stay isolated per app profile, but the OAuth ritual only
  // works on this machine — so the Owner may copy their own login into a
  // profile's home instead of redoing it. Status first: which engines the
  // Owner can grant at all, and where every relay key stands, in one answer.
  app.get(
    "/v1/relay/logins",
    {
      schema: {
        response: {
          200: Type.Object(
            {
              owner: Type.Object(
                {
                  "openai-cli": Type.Boolean(),
                  "claude-cli": Type.Boolean(),
                },
                { additionalProperties: false },
              ),
              apps: Type.Array(
                Type.Object(
                  {
                    id: Type.String(),
                    "openai-cli": Type.Boolean(),
                    "claude-cli": Type.Boolean(),
                  },
                  { additionalProperties: false },
                ),
              ),
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
      return {
        owner: {
          "openai-cli": codexProfileSignedIn("core"),
          "claude-cli": claudeMachineLogin("core"),
        },
        apps: listAppProfiles(context.database)
          .filter((profile) => profile.kind === "relay")
          .map((profile) => ({
            id: profile.id,
            "openai-cli": codexProfileSignedIn(profile.id),
            "claude-cli": claudeMachineLogin(profile.id),
          })),
      };
    },
  );

  app.post<{ Params: { id: string }; Body: { engine: string } }>(
    "/v1/app-profiles/:id/grant-login",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: Type.Object(
          {
            engine: Type.Union([
              Type.Literal("openai-cli"),
              Type.Literal("claude-cli"),
            ]),
          },
          { additionalProperties: false },
        ),
        response: {
          200: Type.Object(
            {
              "openai-cli": Type.Boolean(),
              "claude-cli": Type.Boolean(),
            },
            { additionalProperties: false },
          ),
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
      // Handing a login to another program is a User Mode decision, like
      // every other grant a key can carry.
      if (owner.modeId) {
        const language: CapabilityLanguage =
          request.query && (request.query as { lang?: string }).lang === "zh"
            ? "zh"
            : "en";
        return reply
          .code(403)
          .send({ error: switchesLiveInUserMode(language) });
      }
      const profile = listAppProfiles(context.database).find(
        (item) => item.id === request.params.id,
      );
      if (!profile || profile.kind !== "relay") {
        return reply.code(404).send({ error: "App Profile not found." });
      }
      try {
        if (request.body.engine === "openai-cli") {
          grantCodexLoginToProfile(profile.id);
        } else {
          grantClaudeLoginToProfile(profile.id);
        }
      } catch (error) {
        const code =
          error instanceof Error ? error.message : "RELAY_GRANT_FAILED";
        if (code.startsWith("RELAY_OWNER_NOT_SIGNED_IN")) {
          return reply.code(400).send({ error: code });
        }
        throw error;
      }
      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "relay.login.granted",
        decision: "allowed",
        reason: `Owner granted their ${request.body.engine === "openai-cli" ? "Codex" : "Claude"} login to the app key "${profile.name}" (an independent copy; revoking the app never touches the Owner's own).`,
        resourceType: "app_profile",
        resourceId: profile.id,
      });
      return {
        "openai-cli": codexProfileSignedIn(profile.id),
        "claude-cli": claudeMachineLogin(profile.id),
      };
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
        if (
          error instanceof Error &&
          error.message === "APP_PROFILE_NOT_FOUND"
        ) {
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
          reason:
            "Owner reset an App Profile token; the previous token is void.",
          resourceType: "app_profile",
          resourceId: result.profile.id,
        });
        return result;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "APP_PROFILE_NOT_FOUND"
        ) {
          return reply.code(404).send({ error: "App Profile not found." });
        }
        throw error;
      }
    },
  );

  // Edit an existing App Profile's Method scope + Type B / memory permissions.
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
        if (
          error instanceof Error &&
          error.message === "APP_PROFILE_NOT_FOUND"
        ) {
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

  // WHAT ONE APP KEY MAY DO — the third of the three layers
  // (global ∩ what this key was granted ∩ what the Method declared). The column
  // has been on `app_profiles` since migration 0055 and nothing ever wrote it,
  // so every key sat at "nothing" and granting one was impossible.
  //
  // 🔴 Owner only, and User Mode only. A key is a hole in the ceiling that
  // outlives the session that made it: somebody inside a mode who could grant
  // a key `vision` could then call that key from another program and look at
  // whatever they liked. The same door as the global switches and each mode's
  // own list, for the same reason.
  app.put<{
    Params: { id: string };
    Body: UpdateAppProfileCapabilitiesRequest;
    Querystring: { lang?: string };
  }>(
    "/v1/app-profiles/:id/capabilities",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: UpdateAppProfileCapabilitiesRequestSchema,
        response: {
          200: UpdateAppProfileResponseSchema,
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
      const language: CapabilityLanguage =
        request.query.lang === "zh" ? "zh" : "en";
      if (owner.modeId) {
        return reply
          .code(403)
          .send({ error: switchesLiveInUserMode(language) });
      }
      const named = [
        ...Object.keys(request.body.changes),
        ...(request.body.approve ?? []),
      ];
      const unknown = named.filter((name) => !isCapability(name));
      if (unknown.length > 0) {
        return reply.code(400).send({
          error:
            language === "zh"
              ? `这不是一项能力:${unknown.join(", ")}`
              : `Not a capability: ${unknown.join(", ")}`,
        });
      }

      try {
        writeProfileCapabilities(
          context.database,
          request.params.id,
          request.body.changes as Partial<Record<Capability, boolean>>,
          (request.body.approve ?? []).filter(isCapability),
        );
      } catch (error) {
        // The three things a key may not be handed, each answered in the
        // Owner's own words rather than as a validation failure: nobody works
        // out from "400" that the fix is a switch one card away, or that this
        // particular tick needs a second deliberate press.
        if (error instanceof TokenGrantRefusedError) {
          recordAudit(context.database, {
            actorType: "owner",
            actorId: owner.id,
            actorName: owner.name,
            action: "capability.token.refused",
            decision: "denied",
            reason: `Refused to grant ${error.capabilities.join(", ")} to an app key (${error.refusal}).`,
            resourceType: "app_profile",
            resourceId: request.params.id,
          });
          return reply.code(400).send({
            error: tokenGrantRefusedMessage(
              error.capabilities,
              error.refusal,
              language,
            ),
          });
        }
        if (
          error instanceof Error &&
          error.message === "APP_PROFILE_NOT_FOUND"
        ) {
          return reply.code(404).send({ error: "App Profile not found." });
        }
        throw error;
      }

      // The whole profile, not just the list: the card the Owner is looking at
      // draws itself from one object, so handing back anything less would leave
      // the screen assembling a key out of two answers.
      const profile = listAppProfiles(context.database).find(
        (item) => item.id === request.params.id,
      );
      if (!profile) {
        return reply.code(404).send({ error: "App Profile not found." });
      }

      // Audited like the other two layers, and named so the Guard page can tell
      // the three apart at a glance: who, when, which key, which capability.
      // The key by NAME — an id tells the Owner nothing about which of their
      // apps just gained something.
      for (const [name, on] of Object.entries(request.body.changes)) {
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "capability.token.switch",
          decision: on ? "allowed" : "denied",
          reason: `${name} ${on ? "granted to" : "taken from"} app key "${profile.name}".`,
          resourceType: "app_profile",
          resourceId: profile.id,
        });
      }

      return { profile };
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

      const file =
        request.query.lang === "zh" ? "glossary.zh.md" : "glossary.md";
      const path = join(context.config.docsDirectory, file);
      const markdown = existsSync(path) ? readFileSync(path, "utf8") : "";
      return { markdown };
    },
  );

  // The user manual (Oskar, 2026-07-30: he cannot remember everything Vaenyx
  // now does). Same shape as the glossary and read from the same docs folder,
  // so the manual ships with the app and is read inside it — the place he will
  // actually look — rather than being a file somebody has to go and find.
  app.get<{ Querystring: { lang?: string } }>(
    "/v1/help/manual",
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

      // English is the authoritative copy; the Chinese one is its translation.
      const file =
        request.query.lang === "zh" ? "user-manual.zh.md" : "user-manual.md";
      const path = join(context.config.docsDirectory, file);
      const fallback = join(context.config.docsDirectory, "user-manual.md");
      const chosen = existsSync(path) ? path : fallback;
      const markdown = existsSync(chosen) ? readFileSync(chosen, "utf8") : "";
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
        return await draftMethodSpec(
          request.body.description,
          controller.signal,
        );
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

      const method = createMethod(
        context.config.libraryDirectory,
        request.body,
      );
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
        return reply
          .code(400)
          .send({ error: "A routine needs at least one step." });
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

  // ── Edit Routine v1 (Owner): draft → proposal → try → atomic save ──────────
  // No 200 schemas on purpose: the payloads carry author JSON (view, schemas,
  // manifest) that Fastify's strict serializer would strip.

  // The full editable draft, exactly what is on disk plus every step's Method
  // in detail. Community Routines come back with editable:false.
  app.get<{ Params: { id: string } }>(
    "/v1/routines/:id/edit",
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
      if (!requireOwner(request)) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      try {
        return readRoutineEditDraft(
          context.config.routinesDirectory,
          context.config.libraryDirectory,
          request.params.id,
        );
      } catch (error) {
        if (
          error instanceof RoutineEditError &&
          error.code === "ROUTINE_NOT_FOUND"
        ) {
          return reply.code(404).send({ error: "Routine not found." });
        }
        throw error;
      }
    },
  );

  // "What should improve" → a minimal proposed draft + per-step recipe diffs.
  // Writes nothing; the Owner reviews and try-runs before anything is saved.
  app.post<{ Params: { id: string }; Body: ProposeRoutineEditRequest }>(
    "/v1/routines/:id/edit/draft",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: ProposeRoutineEditRequestSchema,
        response: {
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
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
        return await proposeRoutineEdit(
          context.config.routinesDirectory,
          context.config.libraryDirectory,
          request.params.id,
          request.body.request,
          controller.signal,
        );
      } catch (error) {
        if (
          error instanceof RoutineEditError &&
          error.code === "ROUTINE_NOT_FOUND"
        ) {
          return reply.code(404).send({ error: "Routine not found." });
        }
        return reply.code(502).send({ error: getMethodRunErrorMessage(error) });
      }
    },
  );

  // Try Changes: run the draft in memory. Nothing is written — not the
  // Routine, not its Methods, not Journal/Gallery, not parse examples. A
  // photo runs the annotate tool with the DRAFT's annotateFocus, so Photo
  // Marks changes are testable before saving.
  app.post<{ Params: { id: string }; Body: RoutineEditTestRequest }>(
    "/v1/routines/:id/edit/test",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: RoutineEditTestRequestSchema,
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
      const controller = new AbortController();
      reply.raw.on("close", () => {
        if (!reply.raw.writableEnded) controller.abort();
      });

      let input = request.body.input;
      let annotations: ImageAnnotationItem[] | null = null;
      // Same ceiling as the chat run: Vision switched off (globally or by the
      // session's mode) refuses the LOOKING, not the run — the typed input
      // still goes through and the photo is never sent anywhere. A draft
      // rehearsal is not an exemption from the capability switch.
      const testLanguage = /[一-鿿]/.test(request.body.draft.name)
        ? ("zh" as const)
        : ("en" as const);
      const testVisionRefused = Boolean(
        request.body.imageId &&
        capabilityRefusal("vision", owner, testLanguage),
      );
      if (request.body.imageId && !testVisionRefused) {
        const found = readImage(
          context.config.dataDirectory,
          request.body.imageId,
        );
        if (found) {
          const focus = request.body.draft.annotateFocus ?? null;
          annotations =
            (
              await annotateImage(
                context.config.secretsDirectory,
                found.image,
                found.mimeType,
                testLanguage,
                focus,
              ).catch(() => null)
            )?.value ?? null;
          try {
            const described = await describeImage(
              context.config.secretsDirectory,
              found.image,
              found.mimeType,
              testLanguage,
            );
            // The photo's words join the FIRST string field of the given
            // input — the same "photo stays a photo, its words ride along"
            // deal the chat run makes.
            const extracted = described.value;
            if (extracted.trim() && input && typeof input === "object") {
              const record = { ...(input as Record<string, unknown>) };
              const stringKey = Object.keys(record).find(
                (key) => typeof record[key] === "string",
              );
              if (stringKey) {
                const existing = (record[stringKey] as string).trim();
                record[stringKey] = existing
                  ? `${existing}\n${extracted.trim()}`
                  : extracted.trim();
                input = record;
              }
            }
          } catch {
            // No vision model: the typed input still runs.
          }
        }
      }

      try {
        const result = await runRoutineEditTest(
          context.config.routinesDirectory,
          context.config.libraryDirectory,
          request.params.id,
          request.body.draft,
          input,
          controller.signal,
          (declared) =>
            decideCapabilities(context.database, declared, owner.modeId ?? null)
              .allowed,
        );
        return { ...result, ...(annotations ? { annotations } : {}) };
      } catch (error) {
        if (error instanceof RoutineEditError) {
          if (error.code === "ROUTINE_NOT_FOUND") {
            return reply.code(404).send({ error: "Routine not found." });
          }
          return reply.code(400).send({ error: error.message });
        }
        if (
          error instanceof Error &&
          error.message.startsWith("STEP_INPUT_INVALID:")
        ) {
          return reply.code(400).send({ error: error.message });
        }
        return reply.code(502).send({ error: getMethodRunErrorMessage(error) });
      }
    },
  );

  // Save New Version: staged, validated, atomic; the id never changes; the
  // server bumps the version; a no-op is not saved. Behaviour changes leave
  // every Routine Token 409ing until the Owner explicitly re-grants.
  app.put<{ Params: { id: string }; Body: RoutineEditSaveRequest }>(
    "/v1/routines/:id",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        body: RoutineEditSaveRequestSchema,
        response: {
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      try {
        const before = loadRoutine(
          context.config.routinesDirectory,
          context.config.libraryDirectory,
          request.params.id,
        );
        const result = saveRoutineEdit(
          context.database,
          context.config.routinesDirectory,
          context.config.libraryDirectory,
          request.params.id,
          request.body,
        );
        if (!result.unchanged) {
          // Routine id, versions, hashes, created Method ids, token count —
          // and NEVER the recipe text, photos or any household content.
          recordAudit(context.database, {
            actorType: "owner",
            actorId: owner.id,
            actorName: owner.name,
            action: "library.routine.edit",
            decision: "allowed",
            reason: `Routine edited in place: v${before?.version ?? "?"} (${(before?.contentHash ?? "").slice(0, 12)}) -> v${result.routine.version} (${result.routine.contentHash.slice(0, 12)}); execution ${result.behaviourChanged ? "changed" : "unchanged"}; new methods [${result.createdMethodIds.join(", ")}]; ${result.staleTokens} token(s) now need re-granting.`,
            resourceType: "routine",
            resourceId: request.params.id,
          });
        }
        return result;
      } catch (error) {
        if (error instanceof RoutineEditError) {
          switch (error.code) {
            case "ROUTINE_NOT_FOUND":
              return reply.code(404).send({ error: "Routine not found." });
            case "ROUTINE_NOT_SELF":
              return reply.code(403).send({
                error:
                  "Community Routines cannot be edited in place. Install-and-fork is the path for those.",
              });
            case "EDIT_CONFLICT":
              return reply.code(409).send({
                error:
                  "This Routine was changed somewhere else after this editor opened. Reopen it to edit the newer version — nothing was overwritten.",
              });
            default:
              return reply.code(400).send({ error: error.message });
          }
        }
        throw error;
      }
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
        recordInstall(context.database, {
          hash: methodContentHash(
            context.config.libraryDirectory,
            request.body.methodId,
          ),
          id: request.body.methodId,
          kind: "method",
          sourceUrl: `${context.config.catalogueBaseUrl}/methods/${request.body.methodId}`,
          version: method.version,
        });
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

  // WHAT AN UPDATE WOULD COST, before it is pressed.
  //
  // A version number is not a decision anybody can make. These three are:
  // whether the Owner's own edits get overwritten, which app keys stop working
  // until re-approved, and how many examples survive. The last one is the
  // reassuring half and is said out loud for that reason.
  //
  // Read-only. Nothing here changes anything.
  app.get<{
    Querystring: { id: string; kind: "method" | "routine"; version: string };
  }>(
    "/v1/library/updates/preview",
    {
      schema: {
        querystring: Type.Object(
          {
            id: Type.String({ minLength: 1 }),
            kind: Type.Union([Type.Literal("method"), Type.Literal("routine")]),
            version: Type.String({ minLength: 1, maxLength: 60 }),
          },
          { additionalProperties: false },
        ),
        response: { 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner)
        return reply.code(401).send({ error: "Owner login required." });

      const loaded =
        request.query.kind === "method"
          ? loadMethod(context.config.libraryDirectory, request.query.id)
          : null;
      const consequences = describeUpdate(context.database, {
        availableVersion: request.query.version,
        exampleCount: loaded?.exampleCount ?? 0,
        id: request.query.id,
        kind: request.query.kind,
        libraryDirectory: context.config.libraryDirectory,
        rollbackAvailable: Boolean(
          availableRollback(
            context.database,
            request.query.id,
            request.query.kind,
          ),
        ),
      });
      if (!consequences) return { offer: null };
      return {
        offer: {
          ...consequences,
          recommended: recommendedAction(consequences),
        },
      };
    },
  );

  // EDITING SOMEBODY ELSE'S RECIPE MAKES A COPY THAT IS YOURS.
  //
  // The rule, in one sentence: examples flow to the author of the recipe that
  // produced them. An unmodified community Method sends corrections upstream;
  // a modified one cannot, because those corrections describe a recipe that
  // author never wrote and they have no way to detect it. And if the modified
  // one is published, its installers send corrections to whoever modified it,
  // because that is now the author of the recipe they run.
  //
  // That only holds if a changed copy can never still claim to be the
  // community item — so the fork happens when it is EDITED, not when an update
  // happens to notice. The original stays installed beside it: the Owner keeps
  // getting the author's fixes for it, and any Routine still pointing at it
  // keeps working.
  app.post<{ Body: { methodId: string; name: string } }>(
    "/v1/library/methods/fork",
    {
      schema: {
        body: Type.Object(
          {
            methodId: Type.String({ minLength: 1 }),
            name: Type.String({ minLength: 1, maxLength: 120 }),
          },
          { additionalProperties: false },
        ),
        response: {
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner)
        return reply.code(401).send({ error: "Owner login required." });
      const forkId = toFolderId(
        request.body.name,
        `${request.body.methodId}-mine`,
      );
      try {
        const result = forkMethod({
          forkId,
          forkName: request.body.name.trim(),
          libraryDirectory: context.config.libraryDirectory,
          originalId: request.body.methodId,
        });
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "library.method.fork",
          decision: "allowed",
          reason: `Owner made "${forkId}" from the community Method "${request.body.methodId}"; the original is kept.`,
          resourceType: "method",
          resourceId: forkId,
        });
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.startsWith("FORK_ID_TAKEN")) {
          return reply
            .code(409)
            .send({ error: "Something here already has that name." });
        }
        if (message.startsWith("METHOD_MISSING")) {
          return reply.code(404).send({ error: "That Method is not here." });
        }
        return reply.code(400).send({ error: "That could not be copied." });
      }
    },
  );

  // C7 — DID THE NEW VERSION BREAK WHAT THIS HOUSEHOLD USES IT FOR?
  //
  // Deliberately a button and not an automatic step after every update. Each
  // case is a real model call the Owner pays for, and this product does not
  // spend somebody's money on their behalf without asking. The offer appears
  // the moment an update lands, which is when the answer is worth the most.
  app.post<{ Params: { id: string } }>(
    "/v1/library/methods/:id/check",
    {
      schema: {
        params: Type.Object(
          { id: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        response: {
          200: RegressionResultSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner)
        return reply.code(401).send({ error: "Owner login required." });
      const method = loadMethod(
        context.config.libraryDirectory,
        request.params.id,
      );
      if (!method) return reply.code(404).send({ error: "Method not found." });

      const controller = new AbortController();
      reply.raw.on("close", () => {
        if (!reply.raw.writableEnded) controller.abort();
      });

      const authorFiles = new Set(
        listExampleProvenance(context.database, request.params.id)
          .filter((entry) => entry.origin === "author")
          .map((entry) => entry.exampleFile),
      );
      const allowed = decideCapabilities(
        context.database,
        capabilitiesFromManifest(method.manifest).capabilities,
        owner.modeId ?? null,
      );

      const result = await runRegression(
        method,
        listMethodExamples(context.config.libraryDirectory, request.params.id),
        async (subject, fewShot, input) => {
          const run = await executeMethod(
            subject,
            fewShot,
            input,
            controller.signal,
            allowed.allowed,
          );
          return { output: run.output };
        },
        {
          authorFiles,
          // Six is the cap. Enough that a broken update shows up, few enough
          // that pressing the button is never a decision worth agonising over.
          limit: REGRESSION_CASE_LIMIT,
          now: new Date().toISOString(),
          version: method.version,
        },
      );
      recordRegression(context.database, request.params.id, "method", result);
      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "library.method.check",
        decision: "allowed",
        reason: `Owner re-ran ${result.checkedCount} of their own example(s) against "${request.params.id}" v${method.version}: ${result.state}.`,
        resourceType: "method",
        resourceId: request.params.id,
      });
      return result;
    },
  );

  // The lights. A verdict about a version that has since been replaced is
  // marked stale rather than shown, because a red light nobody can act on
  // truthfully is worse than no light at all.
  app.get(
    "/v1/library/checks",
    {
      schema: {
        response: {
          200: RegressionListResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      if (!requireOwner(request)) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      const installed = new Map(
        listInstalledItems(context.database).map((item) => [
          `${item.kind}:${item.id}`,
          item,
        ]),
      );
      return {
        checks: listRegressions(context.database).map((check) => {
          const current =
            check.kind === "method"
              ? loadMethod(context.config.libraryDirectory, check.id)?.version
              : installed.get(`${check.kind}:${check.id}`)?.installedVersion;
          return { ...check, stale: !current || current !== check.version };
        }),
      };
    },
  );

  // ---- Community updates: offer, apply, undo ----
  //
  // EVERY ONE OF THESE IS PRESSED BY THE OWNER. There is no timer, no startup
  // check that acts, and no "keep my things up to date" setting. An author can
  // change their repository and still cannot reach anybody's machine, and that
  // only stays true while nothing here moves by itself.
  app.get(
    "/v1/library/updates",
    { schema: { response: { 401: ErrorResponseSchema } } },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner)
        return reply.code(401).send({ error: "Owner login required." });
      return { items: listInstalledItems(context.database) };
    },
  );

  app.post<{
    Body: {
      id: string;
      kind: "method" | "routine";
      policy: "follow" | "locked" | "skipped";
      version?: string;
    };
  }>(
    "/v1/library/updates/policy",
    {
      schema: {
        body: Type.Object(
          {
            id: Type.String({ minLength: 1 }),
            kind: Type.Union([Type.Literal("method"), Type.Literal("routine")]),
            policy: Type.Union([
              Type.Literal("follow"),
              Type.Literal("locked"),
              Type.Literal("skipped"),
            ]),
            version: Type.Optional(Type.String({ maxLength: 60 })),
          },
          { additionalProperties: false },
        ),
        response: { 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner)
        return reply.code(401).send({ error: "Owner login required." });
      setUpdatePolicy(
        context.database,
        request.body.id,
        request.body.kind,
        request.body.policy,
        request.body.version ?? null,
      );
      return { items: listInstalledItems(context.database) };
    },
  );

  app.post<{ Body: { methodId: string } }>(
    "/v1/library/methods/update",
    {
      schema: {
        body: Type.Object(
          { methodId: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        response: {
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
          502: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner)
        return reply.code(401).send({ error: "Owner login required." });
      const controller = new AbortController();
      reply.raw.on("close", () => {
        if (!reply.raw.writableEnded) controller.abort();
      });
      try {
        const before = getInstalledItem(
          context.database,
          request.body.methodId,
          "method",
        );
        const method = await updateMethod(
          context.config.catalogueBaseUrl,
          context.config.libraryDirectory,
          request.body.methodId,
          {
            keepRollback: (folder) =>
              keepRollback(context.database, {
                folder,
                id: request.body.methodId,
                kind: "method",
                version: before?.installedVersion ?? "0.0.0",
              }),
            signal: controller.signal,
          },
        );
        recordInstall(context.database, {
          hash: methodContentHash(
            context.config.libraryDirectory,
            request.body.methodId,
          ),
          id: request.body.methodId,
          kind: "method",
          sourceUrl: `${context.config.catalogueBaseUrl}/methods/${request.body.methodId}`,
          version: method.version,
        });
        // The recipe just changed, so any verdict about the old one is about
        // something that is no longer running. A stale light is worse than
        // none, so it goes rather than lingering.
        clearRegression(context.database, request.body.methodId, "method");
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "library.method.update",
          decision: "allowed",
          reason: `Owner updated Method "${request.body.methodId}" to ${method.version}.`,
          resourceType: "method",
          resourceId: request.body.methodId,
        });
        return method;
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.startsWith("METHOD_MISSING")) {
          return reply
            .code(404)
            .send({ error: "That Method is not installed." });
        }
        return reply.code(502).send({
          error: "Could not update from the community catalogue.",
        });
      }
    },
  );

  app.post<{ Body: { routineId: string } }>(
    "/v1/library/routines/update",
    {
      schema: {
        body: Type.Object(
          { routineId: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        response: {
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
          502: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner)
        return reply.code(401).send({ error: "Owner login required." });
      const controller = new AbortController();
      reply.raw.on("close", () => {
        if (!reply.raw.writableEnded) controller.abort();
      });
      try {
        const before = getInstalledItem(
          context.database,
          request.body.routineId,
          "routine",
        );
        const result = await updateRoutine(
          context.config.catalogueBaseUrl,
          context.config.routinesDirectory,
          context.config.libraryDirectory,
          request.body.routineId,
          {
            keepRollback: (folder) =>
              keepRollback(context.database, {
                folder,
                id: request.body.routineId,
                kind: "routine",
                version: before?.installedVersion ?? "0.0.0",
              }),
            signal: controller.signal,
          },
        );
        recordInstall(context.database, {
          id: request.body.routineId,
          kind: "routine",
          sourceUrl: `${context.config.catalogueBaseUrl}/routines/${request.body.routineId}`,
          version: result.routine.version,
        });
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "library.routine.update",
          decision: "allowed",
          reason: `Owner updated Routine "${request.body.routineId}" to ${result.routine.version}.`,
          resourceType: "routine",
          resourceId: request.body.routineId,
        });
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.startsWith("ROUTINE_MISSING")) {
          return reply
            .code(404)
            .send({ error: "That Routine is not installed." });
        }
        return reply.code(502).send({
          error: "Could not update from the community catalogue.",
        });
      }
    },
  );

  // Undo. Deliberately offline: everything needed is already on this disk,
  // because the moment somebody wants an update undone is usually the moment
  // they are trying to get something done.
  app.post<{ Body: { methodId: string } }>(
    "/v1/library/methods/rollback",
    {
      schema: {
        body: Type.Object(
          { methodId: Type.String({ minLength: 1 }) },
          { additionalProperties: false },
        ),
        response: { 401: ErrorResponseSchema, 404: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner)
        return reply.code(401).send({ error: "Owner login required." });
      const restored = restoreRollback(
        context.database,
        request.body.methodId,
        "method",
        join(context.config.libraryDirectory, request.body.methodId),
      );
      // Putting the old version back also puts the question back: whatever the
      // check said about the version being removed no longer describes what is
      // on disk.
      if (restored)
        clearRegression(context.database, request.body.methodId, "method");
      if (!restored) {
        return reply
          .code(404)
          .send({ error: "There is no previous version kept for that." });
      }
      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "library.method.rollback",
        decision: "allowed",
        reason: `Owner rolled Method "${request.body.methodId}" back a version.`,
        resourceType: "method",
        resourceId: request.body.methodId,
      });
      return { items: listInstalledItems(context.database) };
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
        ? {
            available: true,
            paused: state.paused,
            envOverride: state.envOverride,
          }
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
        await setPublishingPause(
          serviceUrl,
          session.token,
          request.body.paused,
        );
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
        return reply.code(400).send({
          error: "Nothing was left to import once the code was dropped.",
        });
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
      if (!communityItemIdFor(context.config.libraryDirectory, methodId))
        return;
      // 🔴 A FORK NEVER SENDS ANYTHING UPSTREAM. Once the Owner has changed the
      // recipe, a correction from it describes something its original author
      // never wrote — and they have no way to tell. Sending it is not a privacy
      // problem, it is misinformation: their general recipe would be taught
      // this household's local convention. The corrections stay here, where
      // the recipe that produced them lives.
      if (
        !mayReturnCorrectionsUpstream(context.config.libraryDirectory, methodId)
      ) {
        return;
      }
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
      // EXACTLY WHAT WOULD BE SENT, not a summary of it. input/output are the
      // de-identified pair as stored, byte for byte what leaves; the kinds say
      // what the stripper thought it found. The original fragments are NOT
      // returned - they are the thing being protected, and the Owner can see
      // them in the correction itself, which never leaves this machine.
      items: listQueue(context.database).map((item) => ({
        id: item.id,
        methodId: item.methodId,
        input: item.input,
        output: item.output,
        note: item.note,
        redactions: item.redactions.length,
        redactionKinds: [
          ...new Set(item.redactions.map((entry) => entry.kind)),
        ],
        sensitive: item.sensitive,
        released: item.releasedAt !== null,
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
        return reply
          .code(404)
          .send({ error: "That item is no longer waiting." });
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

  // THE ALWAYS-ASK, ANSWERED (G4). A held item is health, family or finance,
  // so it never goes on its own. This is the Owner saying yes to THIS one,
  // having read exactly what it says — and there is deliberately no setting
  // that answers it in advance. The window is not shortened by saying yes: it
  // still waits, and it can still be pulled back.
  app.post<{ Params: { id: string } }>(
    "/v1/flywheel/:id/allow",
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      if (!releaseSensitive(context.database, request.params.id)) {
        return reply
          .code(404)
          .send({ error: "That item is not waiting to be asked about." });
      }
      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "flywheel.allow",
        decision: "allowed",
        reason:
          "Owner read a held example in full and allowed that one to be sent; held items are asked about individually and there is no setting that answers in advance.",
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

  // THE PERMANENT CONVERSATION FOR THE MODE THE OWNER IS IN.
  //
  // Made on first ask rather than by a migration: a migration cannot know the
  // agent's name, and a Mode nobody has opened does not need one yet.
  //
  // 🔴 THE COUNT IS SQL, AND ONLY SQL. It is derived from candidate status
  // every time it is asked for, so it cannot drift from what the list actually
  // shows — a stored counter goes wrong the first time an approve fails part
  // way through, and then two numbers on one screen disagree forever. The
  // model is never asked how many things are waiting.
  app.get(
    "/v1/inbox",
    {
      schema: {
        response: { 200: InboxSummarySchema, 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const owner = requireOwner(request);
      if (!owner)
        return reply.code(401).send({ error: "Owner login required." });

      const modeId = owner.modeId ?? null;
      const mode = modeId ? findMode(context.database, modeId) : null;
      const title =
        mode?.agentName?.trim() ||
        getInstanceSettings(context.config, context.database).agentName ||
        "Vaenyx";

      const inbox = ensureInboxThread(
        context.database,
        owner.id,
        modeId,
        title,
      );

      // Renaming the agent renames this conversation. The stored title is only
      // ever a snapshot; this keeps it in step each time anybody asks.
      context.database.sqlite
        .prepare(
          `UPDATE vaenyx_threads SET title = ? WHERE id = ? AND title != ?`,
        )
        .run(title, inbox.id, title);
      context.database.sqlite
        .prepare(
          `UPDATE ask_vaenyx_conversations SET title = ? WHERE id = ? AND title != ?`,
        )
        .run(title, inbox.conversationId, title);

      // Scoped to this Mode, with IS rather than = because User Mode is NULL
      // and = never matches NULL — the version of this filter that reads
      // correctly returns zero for the Mode every household actually uses.
      const waiting = (
        context.database.sqlite
          .prepare(
            `SELECT COUNT(*) AS n FROM vaenyx_me_candidates
              WHERE status = 'pending_review' AND mode_id IS ?`,
          )
          .get(modeId) as { n: number }
      ).n;

      return {
        conversationId: inbox.conversationId,
        threadId: inbox.id,
        title,
        waiting,
      };
    },
  );

  // A9 — HOW MANY CORRECTIONS ARE WAITING FOR YOU, per Method.
  //
  // The number behind the badge on the Methods tab. A correction that an app
  // sent sits here doing nothing until the Owner looks at it, and until this
  // existed the only way to find one was to open every Method in turn — so in
  // practice the flywheel's local half ran on the Owner remembering to check.
  app.get(
    "/v1/library/corrections/pending",
    {
      schema: {
        response: {
          200: PendingCorrectionsResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      if (!requireOwner(request)) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      // ONLY METHODS THAT ARE STILL HERE. Corrections outlive their Method:
      // method_feedback keeps every row an app ever sent, and deleting or
      // renaming a Method does not delete its history. Counting those would
      // put a number on the tab for work nobody can reach — which is exactly
      // what happened: a 5 on the tab, and not one card carrying a chip,
      // because both Methods behind it had been gone for weeks.
      const installed = new Set(
        listMethodSummaries(context.config.libraryDirectory).map(
          (method) => method.id,
        ),
      );
      return {
        pending: countPendingCorrections(context.database).filter((entry) =>
          installed.has(entry.methodId),
        ),
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
        response: {
          200: MethodExamplesResponseSchema,
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
        return reply
          .code(400)
          .send({ error: "That example could not be saved." });
      }

      // It has been kept, so it stops waiting. Recorded rather than deleted:
      // the correction is the evidence of what an app actually sent, and
      // without this the same one could be kept again on the next reload.
      markFeedbackAdopted(
        context.database,
        request.body.correctionId,
        new Date().toISOString(),
      );

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
        methodOrigin: method.origin,
        methodOwner: method.owner,
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
  //
  // EDITING A COMMUNITY METHOD DOES NOT EDIT IT. It makes this household's own
  // copy, carrying permanent credit to the author, and leaves theirs installed
  // and untouched. That is not politeness — it is what keeps the flywheel
  // honest. Corrections flow to the author of the recipe that produced them, so
  // a changed recipe must stop being theirs at the moment it changes, or it
  // would send that author corrections describing steps they never wrote.
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
      const existing = loadMethod(
        context.config.libraryDirectory,
        request.params.id,
      );
      if (!existing) {
        return reply.code(404).send({ error: "Method not found." });
      }

      let targetId = request.params.id;
      let forkedFrom: string | undefined;
      if (existing.origin === "community") {
        // The name the Owner typed on the approval screen; failing that, one
        // derived from the original — in its own language, since a Chinese
        // Method with an English suffix reads like a different thing.
        const forkName =
          request.body.forkName?.trim() ||
          suggestForkName(existing.name, /[一-鿿]/.test(existing.name));
        const forkId = freeForkId(
          context.config.libraryDirectory,
          toFolderId(forkName, `${existing.id}-mine`),
        );
        try {
          forkMethod({
            forkId,
            forkName,
            libraryDirectory: context.config.libraryDirectory,
            originalId: existing.id,
          });
        } catch {
          return reply
            .code(400)
            .send({ error: "Your own copy could not be made." });
        }
        targetId = forkId;
        forkedFrom = existing.id;
      }

      let updated;
      try {
        updated = updateMethodRecipe(
          context.config.libraryDirectory,
          targetId,
          request.body.recipe,
        );
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        if (code === "METHOD_NOT_FOUND") {
          return reply.code(404).send({ error: "Method not found." });
        }
        return reply
          .code(400)
          .send({ error: "That recipe could not be saved." });
      }

      // Owner's own method: every grant follows the edit right here, so the
      // reply reports zero stale grants and no app ever sees a 409. A fork is
      // "self" too, but it is a brand new id with no grants on it — and the
      // community original it came from keeps every grant it had, still
      // pointing at the unchanged recipe those apps were tested against.
      if (updated.origin === "self") {
        relockMethodGrants(context.database, updated.id, updated.contentHash);
      }

      recordAudit(context.database, {
        actorType: "owner",
        actorId: owner.id,
        actorName: owner.name,
        action: "library.method.recipe.edit",
        decision: "allowed",
        reason: forkedFrom
          ? `Owner edited the community Method "${forkedFrom}", so the change went into their own copy "${updated.id}" with credit to the author; the community one is untouched.`
          : "Owner approved a recipe edit from chat; grants follow their own edit automatically.",
        resourceType: "method",
        resourceId: updated.id,
      });

      return {
        methodId: updated.id,
        contentHash: updated.contentHash,
        staleGrants: countStaleMethodGrants(
          context.database,
          updated.id,
          updated.contentHash,
        ),
        ...(forkedFrom ? { forkedFrom } : {}),
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
        reason:
          "Owner set a Library Method's tags (hash + token lock unchanged).",
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
  app.post<{
    Params: { id: string };
    Body: RunMethodRequest;
    Querystring: { lang?: string };
  }>(
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
        // Three layers, narrowing: the global switches, then the mode the
        // Owner is in, then what the Method declared.
        const ownerAllowed = decideCapabilities(
          context.database,
          capabilitiesFromManifest(method.manifest).capabilities,
          owner.modeId ?? null,
        );
        const refusals = reportRefusals(
          ownerAllowed.refused,
          {
            actorType: "owner",
            actorId: owner.id,
            actorName: owner.name,
          },
          request.params.id,
          request.query.lang === "zh" ? "zh" : "en",
        );
        const result = await executeMethod(
          method,
          examples,
          request.body.input,
          controller.signal,
          ownerAllowed.allowed,
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
          ...(refusals.length > 0 ? { capabilityRefusals: refusals } : {}),
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
        return reply
          .code(401)
          .send({ error: "A valid App Token is required." });
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
        // The Owner's own method moved: grants follow automatically. Only a
        // community-origin change still needs the Owner's explicit re-grant.
        if (method.origin === "self") {
          relockMethodGrants(context.database, methodId, method.contentHash);
          recordAudit(context.database, {
            actorType: "app",
            actorId: profile.id,
            actorName: profile.name,
            action: "library.method.run",
            decision: "allowed",
            reason:
              "Version lock followed the Owner's own edit of their method.",
            resourceType: "method",
            resourceId: methodId,
          });
        } else {
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
        // A Token call has no conversation and no mode, so the mode layer
        // does not apply: global ∩ what this token was granted ∩ what the
        // Method declared. `files` is stripped here whatever anyone ticked —
        // reading the Owner's disk for another app is not something a token
        // carries.
        const tokenGrants = readProfileCapabilities(
          context.database,
          profile.id,
        );
        const tokenAllowed = decideTokenCapabilities(
          context.database,
          capabilitiesFromManifest(method.manifest).capabilities,
          tokenGrants,
        );
        // Said out loud, to the app and on the Guard page. An app that was
        // never granted `vision` gets a sentence saying so, not a picture-blind
        // answer that reads like the Method being poor at its job.
        const refusals = reportRefusals(
          tokenAllowed.refused,
          {
            actorType: "app",
            actorId: profile.id,
            actorName: profile.name,
          },
          methodId,
        );
        const result = await executeMethod(
          method,
          examples,
          request.body.input,
          controller.signal,
          tokenAllowed.allowed,
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
          ...(refusals.length > 0 ? { capabilityRefusals: refusals } : {}),
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
        return reply
          .code(401)
          .send({ error: "A valid App Token is required." });
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
            reason:
              "Corrected output did not match the method's output schema.",
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
        // D2: which step of which Routine. Without it a multi-step Routine
        // files every correction against whichever Method the app named, and
        // the wrong part quietly learns the wrong lesson.
        routineId: body.routineId ?? null,
        stepId: body.stepId ?? null,
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
          // D3 was already here: the example file itself records `source`
          // and `contributor`, which is what makes a contradiction between two
          // apps — one says DD/MM, the other MM/DD — resolvable by a person
          // rather than silently averaged away. Not duplicated into a table.
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

      // D1: an explicit acceptance, so an app knows when it is safe to clear
      // its queue. Clearing on "the request did not throw" loses corrections
      // whenever a connection drops mid-reply — silently, which is the worst
      // way to lose them. The rule for the app side is: hold the queue until
      // this field comes back true.
      const response: SendMethodFeedbackResponse = { accepted: true, id };
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
      const provider =
        request.query.provider === "google" ? "google" : "github";
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
  }>("/v1/publish-auth/callback", async (request, reply) => {
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
  });

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
        if (error instanceof Error && error.message.includes("RESERVED_NAME")) {
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
  app.post<{
    Params: { id: string };
    Querystring: { lang?: string };
    Body: PublishAcceptanceRequest;
  }>(
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
          403: PublishRefusedResponseSchema,
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
        // Built, kept — but not published. A Method that cannot run here cannot
        // run on anyone else's Vaenyx either, and a community shelf half greyed
        // out is a fatal first impression. The ATTEMPT is the vote.
        //
        // 🔴 The vote is no longer counted HERE. It used to be recorded on the
        // way past, and the refusal then told the Owner it had been — a record
        // made and announced afterwards is not a choice. The names go back with
        // the refusal instead, and the screen asks the copy pack's N3 question
        // before anything is written down (POST /v1/capabilities/wanted).
        const wanted = missingCapabilities(
          capabilitiesFromManifest(method.manifest).capabilities,
        );
        if (wanted.length > 0) {
          return reply.code(403).send({
            error: cannotShareMessage(
              wanted,
              request.query.lang === "zh" ? "zh" : "en",
            ),
            // The names ride back as data as well as inside the sentence: the
            // screen asks the N3 question about them, and reading them out of a
            // translated sentence is how that breaks in the other language.
            missingCapabilities: wanted,
          });
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
            return reply
              .code(404)
              .send({ error: "That routine was not found." });
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
        return reply
          .code(401)
          .send({ error: "A valid App Token is required." });
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
      // Edit Routine v1: the lock is the EXECUTION hash — what a run actually
      // does. Locks written before the split were re-encoded once at BOOT
      // (migrateLegacyRoutineTokenLocks); there is deliberately no run-time
      // re-encode, because at run time "contentHash still matches" no longer
      // proves the behaviour is unchanged (a dependency Method may have been
      // edited in between). A mismatch here is always a real change since the
      // grant, and only the Owner's explicit token edit ever re-pins it.
      if (routine.executionHash !== lockedHash) {
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
          {
            stateless: true,
            // A Routine Token runs several Methods in a row, and each step is
            // narrowed by the same three layers as a single Method run. Without
            // this the steps ran on their own manifests alone — so a Routine
            // Token could search the web with the instance's Web switch off,
            // and a grant ticked on the key changed nothing.
            narrow: (declared) =>
              decideTokenCapabilities(
                context.database,
                declared,
                readProfileCapabilities(context.database, profile.id),
              ).allowed,
          },
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

  // HANDING THE RECIPE OVER, for a Routine.
  //
  // This moved off the Method Token, which is retired. The Owner's choice on
  // the key is now "Vaenyx runs it" or "hand the recipe over", and this is the
  // second one: the app takes the instructions and runs them on its own model,
  // so it keeps working when this machine is off — and the recipe has left
  // this machine, which is the part the Owner is told before they choose.
  //
  // A MULTI-STEP ROUTINE RETURNS AN ORDERED CHAIN, not one recipe. That is the
  // honest shape: a Routine IS its steps in order, each with its own schema,
  // and an app given only the first step would produce something that looks
  // like a result and is not one. The order is the flow's order, and each
  // entry names its step id so a correction coming back can say which step it
  // belongs to rather than being guessed at.
  app.get<{ Params: { id: string } }>(
    "/v1/library/routines/:id/recipe",
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
        },
      },
    },
    async (request, reply) => {
      const profile = authenticateAppProfile(context.database, request);
      if (!profile) {
        return reply
          .code(401)
          .send({ error: "A valid App Token is required." });
      }
      if (!profile.fetchRecipe) {
        recordAudit(context.database, {
          actorType: "app",
          actorId: profile.id,
          actorName: profile.name,
          action: "library.routine.fetchRecipe",
          decision: "denied",
          reason: "This key was not given the recipe.",
          resourceType: "routine",
          resourceId: request.params.id,
        });
        return reply.code(403).send({
          error: "This key runs on Vaenyx; it was not given the recipe.",
        });
      }
      // One key, one Routine. A key for one thing must not read another.
      if (profile.allowedRoutineId !== request.params.id) {
        recordAudit(context.database, {
          actorType: "app",
          actorId: profile.id,
          actorName: profile.name,
          action: "library.routine.fetchRecipe",
          decision: "denied",
          reason: "This key is for a different Routine.",
          resourceType: "routine",
          resourceId: request.params.id,
        });
        return reply
          .code(403)
          .send({ error: "This key is for a different Routine." });
      }

      const routine = loadRoutine(
        context.config.routinesDirectory,
        context.config.libraryDirectory,
        request.params.id,
      );
      if (!routine) {
        return reply.code(404).send({ error: "That Routine is not here." });
      }

      const steps = routine.flow.map((step) => {
        const method = loadMethod(
          context.config.libraryDirectory,
          step.methodId,
        );
        return {
          // The step id travels with it: a correction that comes back has to
          // say WHICH step it is about, or a multi-step Routine learns the
          // wrong lesson silently.
          stepId: step.id,
          methodId: step.methodId,
          version: method?.version ?? null,
          recipe: method?.recipe ?? null,
          inputSchema: method?.inputSchema ?? null,
          outputSchema: method?.outputSchema ?? null,
        };
      });

      recordAudit(context.database, {
        actorType: "app",
        actorId: profile.id,
        actorName: profile.name,
        action: "library.routine.fetchRecipe",
        decision: "allowed",
        reason: `Handed over the ${steps.length}-step recipe chain.`,
        resourceType: "routine",
        resourceId: request.params.id,
      });
      return { routineId: routine.id, steps, version: routine.version };
    },
  );

  // App-facing Type B (library-architecture §13): a permitted app fetches a
  // method's recipe + schemas + examples to run on ITS OWN model. FORCED token;
  // requires the fetchRecipe permission + the method on the allowlist at the
  // granted version. No 200 response schema (schemas/examples are arbitrary
  // JSON). Type A (/run) is unaffected.
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
        return reply
          .code(401)
          .send({ error: "A valid App Token is required." });
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
        // Same self-heal as the run endpoint: the Owner's own edit never
        // strands their apps on a 409 — the grant follows the new version.
        if (method.origin === "self") {
          relockMethodGrants(context.database, methodId, method.contentHash);
          recordAudit(context.database, {
            actorType: "app",
            actorId: profile.id,
            actorName: profile.name,
            action: "library.method.fetchRecipe",
            decision: "allowed",
            reason:
              "Version lock followed the Owner's own edit of their method.",
            resourceType: "method",
            resourceId: methodId,
          });
        } else {
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
      const owner = requireOwner(request);
      if (!owner) {
        return reply.code(401).send({ error: "Owner login required." });
      }
      const settings = getInstanceSettings(context.config, context.database);
      // Inside a Custom Mode the effective agent name is the MODE's own —
      // the same resolution the chat header uses, so Settings can never show
      // a different name from the conversation beside it (Oskar, 2026-08-30:
      // 改成拿布布了,setting 里面显示的还是另一个名字).
      if (owner.modeId) {
        const mode = findMode(context.database, owner.modeId);
        if (mode?.agentName?.trim()) {
          return { ...settings, agentName: mode.agentName.trim() };
        }
      }
      return settings;
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

      // Inside a Custom Mode, "rename the assistant" means THIS MODE's
      // assistant — the write lands on the mode, never on the household-wide
      // name (dev.170 kept the field available in a locked mode; 2026-08-30
      // pins down what it edits there). The instance's own name stays a User
      // Mode decision: a changed one is refused by name, not ignored.
      if (owner.modeId) {
        const current = getInstanceSettings(context.config, context.database);
        if (request.body.instanceName.trim() !== current.instanceName) {
          return reply.code(403).send({
            error:
              "The instance name is set from User Mode; this mode can only rename its own assistant.",
          });
        }
        const mode = updateMode(context.database, owner.modeId, {
          agentName: request.body.agentName?.trim() ?? "",
        });
        recordAudit(context.database, {
          actorType: "owner",
          actorId: owner.id,
          actorName: owner.name,
          action: "mode.agent.renamed",
          decision: "allowed",
          reason: `The mode's assistant was renamed to "${mode.agentName || current.agentName}" from inside the mode.`,
          resourceType: "mode",
          resourceId: owner.modeId,
        });
        return {
          ...current,
          agentName: mode.agentName?.trim() || current.agentName,
        };
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
