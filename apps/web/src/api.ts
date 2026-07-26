import type {
  AppProfile,
  AskVaenyxConversation,
  AskVaenyxMessage,
  ReasoningEffort,
  ClassifyRoutineResponse,
  ApproveVaenyxMeCandidateRequest,
  AuditEvent,
  BackupListResponse,
  BackupConfigView,
  BackupConfigUpdate,
  ModelProviderInfo,
  PublishPauseState,
  CorrectionsResponse,
  MethodExamplesResponse,
  PreviewSkillRequest,
  SkillImportPreviewResponse,
  ImportSkillRequest,
  ImportSkillResponse,
  ExportSkillResponse,
  AdoptCorrectionRequest,
  AdoptCorrectionResponse,
  RecipeEditDraft,
  UpdateRecipeResponse,
  BootstrapStatus,
  ChangePasswordRequest,
  ChatConnectionTestRequest,
  ChatConnectionTestResult,
  CreateAskVaenyxConversationRequest,
  CreateAskVaenyxMessageRequest,
  CreateAskVaenyxMessageResponse,
  CreateAppProfileRequest,
  CreateAppProfileResponse,
  CreateProjectMemoryRequest,
  CreateProjectRequest,
  CreateTaskRequest,
  CreateVaenyxMeCandidateRequest,
  CatalogueIndex,
  InstallRoutineResponse,
  LegalAcknowledgement,
  LegalAcknowledgementsResponse,
  ForgeConnectionTestResult,
  InstanceSettings,
  LibraryMethod,
  LibraryMethodSummary,
  LibraryRoutine,
  LibraryRoutineSummary,
  MethodDraft,
  Mode,
  CreateModeRequest,
  UpdateModeRequest,
  DeviceMode,
  SetDeviceModeRequest,
  Project,
  RoutineGalleryItem,
  RoutineJournalEntry,
  RoutinePlan,
  RoutineRunNeedsInput,
  ProjectMemory,
  RejectVaenyxMeCandidateRequest,
  RenameMethodTagResponse,
  PublishMethodResponse,
  PublishRoutineResponse,
  PublishState,
  RunMethodResponse,
  SetTaskScheduleRequest,
  SetupOwnerRequest,
  SystemStatus,
  Task,
  TaskRun,
  UpdateAppProfileRequest,
  UpdateAppProfileResponse,
  UpdateProjectMemoryRequest,
  UpdateInstanceSettingsRequest,
  UpdateProjectInstructionsRequest,
  UpdateProjectRequest,
  UpdateVaenyxThreadProjectRequest,
  UpdateVaenyxThreadStatusRequest,
  UpdateStatus,
  UpdateVaenyxThreadTitleRequest,
  VaenyxMeCandidate,
  VaenyxThread,
  Workspace,
} from "@vaenyx/contracts";

export type { Mode, DeviceMode, UpdateStatus } from "@vaenyx/contracts";

import { showErrorToast } from "./toast.js";

interface ErrorResponse {
  error?: string;
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      accept: "application/json",
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ErrorResponse;
    const message =
      body.error ?? `Vaenyx request failed with ${response.status}.`;
    // Failed ACTIONS pop a global toast (Oskar, dev.169). Reads and auth
    // checks stay quiet — background polls and the login flow handle their
    // own states.
    const method = (options.method ?? "GET").toUpperCase();
    if (method !== "GET" && response.status !== 401) {
      showErrorToast(message);
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function fetchSystemStatus(): Promise<SystemStatus> {
  return requestJson<SystemStatus>("/v1/system/status");
}

export function shutdownVaenyx(): Promise<{ message: string }> {
  return requestJson<{ message: string }>("/v1/system/shutdown", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function restartVaenyx(): Promise<{ message: string }> {
  return requestJson<{ message: string }>("/v1/system/restart", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function fetchBackups(): Promise<BackupListResponse> {
  return requestJson<BackupListResponse>("/v1/system/backups");
}

// Disconnect the community publishing session (local token cleared; the
// account itself is untouched — signing in again relinks it).
export function disconnectPublishService(): Promise<{ message: string }> {
  return requestJson<{ message: string }>("/v1/publish-auth", {
    method: "DELETE",
  });
}

export function fetchBackupConfig(): Promise<BackupConfigView> {
  return requestJson<BackupConfigView>("/v1/system/backup-config");
}

export function saveBackupConfig(
  config: BackupConfigUpdate,
): Promise<BackupConfigView> {
  return requestJson<BackupConfigView>("/v1/system/backup-config", {
    method: "PUT",
    body: JSON.stringify(config),
  });
}

export function createBackup(): Promise<{ message: string }> {
  return requestJson<{ message: string }>("/v1/system/backups", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function restoreBackup(id: string): Promise<{ message: string }> {
  return requestJson<{ message: string }>(
    `/v1/system/backups/${encodeURIComponent(id)}/restore`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export function fetchBootstrapStatus(): Promise<BootstrapStatus> {
  return requestJson<BootstrapStatus>("/v1/bootstrap/status");
}

export function setupOwner(input: SetupOwnerRequest): Promise<BootstrapStatus> {
  return requestJson<BootstrapStatus>("/v1/setup", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function loginOwner(password: string): Promise<BootstrapStatus> {
  return requestJson<BootstrapStatus>("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export async function logoutOwner(): Promise<void> {
  await requestJson<{ message: string }>("/v1/auth/logout", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function changeOwnerPassword(
  input: ChangePasswordRequest,
): Promise<{ message: string }> {
  return requestJson<{ message: string }>("/v1/auth/change-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// Publishing (library-architecture §16): the Owner's Google link + which items are
// published, and the action to publish one Method to the community warehouse.
export function fetchPublishState(): Promise<PublishState> {
  return requestJson<PublishState>("/v1/publish/state");
}

// The G2/G2a acceptance every publish carries: the warranty checkbox actively
// confirmed in the publish dialog (copy pack clause 2.3).
export interface PublishAcceptance {
  copyVersion: string;
  language: string;
  warrantyConfirmed: true;
}

export function publishMethodToCommunity(
  id: string,
  acceptance: PublishAcceptance,
): Promise<PublishMethodResponse> {
  return requestJson<PublishMethodResponse>(
    `/v1/library/methods/${encodeURIComponent(id)}/publish`,
    { method: "POST", body: JSON.stringify({ acceptance }) },
  );
}

export function publishRoutineToCommunity(
  id: string,
  acceptance: PublishAcceptance,
): Promise<PublishRoutineResponse> {
  return requestJson<PublishRoutineResponse>(
    `/v1/library/routines/${encodeURIComponent(id)}/publish`,
    { method: "POST", body: JSON.stringify({ acceptance }) },
  );
}

// Change the public display name (community byline) on the publish service.
export function setPublishDisplayName(
  displayName: string,
): Promise<{ displayName: string }> {
  return requestJson<{ displayName: string }>(
    "/v1/publish-auth/display-name",
    { method: "PATCH", body: JSON.stringify({ displayName }) },
  );
}

export async function logoutAllDevices(): Promise<void> {
  await requestJson<{ message: string }>("/v1/auth/logout-all", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function fetchWorkspace(): Promise<Workspace> {
  return requestJson<Workspace>("/v1/workspace");
}

export function fetchAskVaenyxConversations(): Promise<AskVaenyxConversation[]> {
  return requestJson<AskVaenyxConversation[]>("/v1/ask-vaenyx/conversations");
}

export function createAskVaenyxConversation(
  input: CreateAskVaenyxConversationRequest = {},
): Promise<AskVaenyxConversation> {
  return requestJson<AskVaenyxConversation>("/v1/ask-vaenyx/conversations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function setReasoningEffort(
  conversationId: string,
  effort: ReasoningEffort,
): Promise<AskVaenyxConversation> {
  return requestJson<AskVaenyxConversation>(
    `/v1/ask-vaenyx/conversations/${conversationId}/reasoning-effort`,
    { method: "PUT", body: JSON.stringify({ effort }) },
  );
}

export function setChatProvider(
  conversationId: string,
  providerId: string | null,
): Promise<AskVaenyxConversation> {
  return requestJson<AskVaenyxConversation>(
    `/v1/ask-vaenyx/conversations/${conversationId}/model-provider`,
    { method: "PUT", body: JSON.stringify({ providerId }) },
  );
}

export function setChatModel(
  conversationId: string,
  model: string | null,
): Promise<AskVaenyxConversation> {
  return requestJson<AskVaenyxConversation>(
    `/v1/ask-vaenyx/conversations/${conversationId}/model`,
    { method: "PUT", body: JSON.stringify({ model }) },
  );
}

export async function deleteAskVaenyxConversation(
  conversationId: string,
): Promise<void> {
  await requestJson<{ message: string }>(
    `/v1/ask-vaenyx/conversations/${conversationId}`,
    {
      method: "DELETE",
    },
  );
}

export function fetchAskVaenyxMessages(
  conversationId: string,
): Promise<AskVaenyxMessage[]> {
  return requestJson<AskVaenyxMessage[]>(
    `/v1/ask-vaenyx/conversations/${conversationId}/messages`,
  );
}

// Library v2 (Routine in Chat): the Journal + Gallery for a routine chat, scoped
// to this conversation.
export function fetchChatRoutineData(
  conversationId: string,
): Promise<{ journal: RoutineJournalEntry[]; gallery: RoutineGalleryItem[] }> {
  return requestJson<{
    journal: RoutineJournalEntry[];
    gallery: RoutineGalleryItem[];
  }>(`/v1/ask-vaenyx/conversations/${conversationId}/routine-data`);
}

// Run this routine chat's Routine on a plain message (writes to its Journal +
// Gallery and returns the run result). A multi-field routine returns a
// needs-confirmation payload instead of running; the caller shows the confirm
// card and re-posts with the confirmed structured `input`.
export function runRoutineInChat(
  conversationId: string,
  content: string,
  input?: Record<string, unknown>,
  learn?: boolean,
): Promise<RoutineRunResult | RoutineRunNeedsInput> {
  return requestJson<RoutineRunResult | RoutineRunNeedsInput>(
    `/v1/ask-vaenyx/conversations/${conversationId}/routine-run`,
    {
      method: "POST",
      body: JSON.stringify(
        input ? { content, input, ...(learn ? { learn: true } : {}) } : { content },
      ),
    },
  );
}

// Attach (or change) the Routine on an existing chat — the "+" entry that turns
// an ongoing chat into a routine chat.
export function attachRoutineToChat(
  conversationId: string,
  routineId: string,
): Promise<VaenyxThread> {
  return requestJson<VaenyxThread>(
    `/v1/ask-vaenyx/conversations/${conversationId}/routine`,
    { method: "POST", body: JSON.stringify({ routineId }) },
  );
}

// Multi-model: the Settings "Models" section reads the known providers + their
// status here, and connects/disconnects the API-key + local ones.
export function fetchModelProviders(): Promise<{
  providers: ModelProviderInfo[];
}> {
  return requestJson<{ providers: ModelProviderInfo[] }>(
    "/v1/models/providers",
  );
}

// In-chat background creation (spec §2a): post the "✔ built" confirmation into
// the conversation as a normal assistant message.
export function appendConversationNote(
  conversationId: string,
  content: string,
): Promise<AskVaenyxMessage> {
  return requestJson<AskVaenyxMessage>(
    `/v1/ask-vaenyx/conversations/${conversationId}/notes`,
    { method: "POST", body: JSON.stringify({ content }) },
  );
}

// Starts the official `codex login` flow on the machine Vaenyx runs on;
// returns the sign-in URL when the CLI printed one before opening the browser,
// or `detail` (the CLI's first error line) when the flow could not start.
export function startCodexLogin(): Promise<{
  url: string | null;
  detail: string | null;
}> {
  return requestJson<{ url: string | null; detail: string | null }>(
    "/v1/models/codex/login",
    { method: "POST" },
  );
}

export function connectModelProvider(
  id: string,
  input: { apiKey?: string; baseUrl?: string; model?: string },
): Promise<{ providers: ModelProviderInfo[] }> {
  return requestJson<{ providers: ModelProviderInfo[] }>(
    `/v1/models/providers/${encodeURIComponent(id)}`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function disconnectModelProvider(
  id: string,
): Promise<{ providers: ModelProviderInfo[] }> {
  return requestJson<{ providers: ModelProviderInfo[] }>(
    `/v1/models/providers/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

export function setDefaultModelProvider(
  id: string,
): Promise<{ providers: ModelProviderInfo[] }> {
  return requestJson<{ providers: ModelProviderInfo[] }>(
    `/v1/models/default/${encodeURIComponent(id)}`,
    { method: "POST" },
  );
}

export interface StreamMessageCallbacks {
  onOwner?: (message: AskVaenyxMessage) => void;
  onDelta?: (text: string) => void;
  signal?: AbortSignal;
}

async function streamMessageRequest(
  path: string,
  content: string,
  callbacks: StreamMessageCallbacks,
  suggestRoutineId?: string,
  suggestTask?: boolean,
  suggestCreate?: "method" | "routine",
  clarifyCreate?: string,
  voiceAudioId?: string,
  imageId?: string,
): Promise<CreateAskVaenyxMessageResponse> {
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      accept: "text/event-stream",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      content,
      ...(suggestRoutineId ? { suggestRoutineId } : {}),
      ...(suggestTask ? { suggestTask: true } : {}),
      ...(suggestCreate ? { suggestCreate } : {}),
      ...(clarifyCreate ? { clarifyCreate } : {}),
      ...(voiceAudioId ? { voiceAudioId } : {}),
      ...(imageId ? { imageId } : {}),
    }),
    signal: callbacks.signal,
  });

  if (!response.ok || !response.body) {
    const body = (await response.json().catch(() => ({}))) as ErrorResponse;
    throw new Error(
      body.error ?? `Vaenyx request failed with ${response.status}.`,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: CreateAskVaenyxMessageResponse | null = null;
  let streamError: string | null = null;

  const handleEvent = (block: string): void => {
    let event = "message";
    const dataLines: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).replace(/^ /, ""));
      }
    }
    if (dataLines.length === 0) return;

    const data = JSON.parse(dataLines.join("\n")) as unknown;
    if (event === "owner") {
      callbacks.onOwner?.(data as AskVaenyxMessage);
    } else if (event === "delta") {
      callbacks.onDelta?.((data as { text: string }).text);
    } else if (event === "done") {
      result = data as CreateAskVaenyxMessageResponse;
    } else if (event === "error") {
      streamError = (data as { error: string }).error;
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let separator = buffer.indexOf("\n\n");
    while (separator !== -1) {
      const block = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 2);
      if (block.trim()) handleEvent(block);
      separator = buffer.indexOf("\n\n");
    }
  }
  if (buffer.trim()) handleEvent(buffer);

  if (streamError) throw new Error(streamError);
  if (!result) throw new Error("Vaenyx Chat stream ended unexpectedly.");
  return result;
}

export function streamAskVaenyxMessage(
  conversationId: string,
  content: string,
  callbacks: StreamMessageCallbacks,
  suggestRoutineId?: string,
  suggestTask?: boolean,
  suggestCreate?: "method" | "routine",
  clarifyCreate?: string,
  voiceAudioId?: string,
  imageId?: string,
): Promise<CreateAskVaenyxMessageResponse> {
  return streamMessageRequest(
    `/v1/ask-vaenyx/conversations/${conversationId}/messages/stream`,
    content,
    callbacks,
    suggestRoutineId,
    suggestTask,
    suggestCreate,
    clarifyCreate,
    voiceAudioId,
    imageId,
  );
}

// Library v2 (AI-driven): classify whether the Owner's message calls for a
// Routine or Task before replying. Cached per (conversation, message) so an
// identical message never pays for the model call twice; the caller also
// pre-filters so most plain chatter never reaches here at all.
const classifyCache = new Map<string, ClassifyRoutineResponse>();

export async function classifyMessage(
  conversationId: string,
  content: string,
): Promise<ClassifyRoutineResponse> {
  const key = `${conversationId}\n${content}`;
  const cached = classifyCache.get(key);
  if (cached) return cached;
  const verdict = await requestJson<ClassifyRoutineResponse>(
    `/v1/ask-vaenyx/conversations/${conversationId}/classify`,
    { method: "POST", body: JSON.stringify({ content }) },
  );
  classifyCache.set(key, verdict);
  if (classifyCache.size > 200) {
    classifyCache.delete(classifyCache.keys().next().value as string);
  }
  return verdict;
}

export function streamTaskMessage(
  taskId: string,
  content: string,
  callbacks: StreamMessageCallbacks,
): Promise<CreateAskVaenyxMessageResponse> {
  return streamMessageRequest(
    `/v1/tasks/${taskId}/messages/stream`,
    content,
    callbacks,
  );
}

export function fetchTaskMessages(taskId: string): Promise<AskVaenyxMessage[]> {
  return requestJson<AskVaenyxMessage[]>(`/v1/tasks/${taskId}/messages`);
}

export function fetchTaskRuns(taskId: string): Promise<TaskRun[]> {
  return requestJson<TaskRun[]>(`/v1/tasks/${taskId}/runs`);
}

export function retryTask(taskId: string): Promise<Task> {
  return requestJson<Task>(`/v1/tasks/${taskId}/retry`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function cancelTask(taskId: string): Promise<Task> {
  return requestJson<Task>(`/v1/tasks/${taskId}/cancel`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function sendTaskMessage(
  taskId: string,
  input: CreateAskVaenyxMessageRequest,
): Promise<CreateAskVaenyxMessageResponse> {
  return requestJson<CreateAskVaenyxMessageResponse>(
    `/v1/tasks/${taskId}/messages`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function setTaskSchedule(
  taskId: string,
  input: SetTaskScheduleRequest,
): Promise<Task> {
  return requestJson<Task>(`/v1/tasks/${taskId}/schedule`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function updateVaenyxThreadProject(
  threadId: string,
  input: UpdateVaenyxThreadProjectRequest,
): Promise<VaenyxThread> {
  return requestJson<VaenyxThread>(`/v1/threads/${threadId}/project`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function updateVaenyxThreadStatus(
  threadId: string,
  input: UpdateVaenyxThreadStatusRequest,
): Promise<VaenyxThread> {
  return requestJson<VaenyxThread>(`/v1/threads/${threadId}/status`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function updateVaenyxThreadTitle(
  threadId: string,
  input: UpdateVaenyxThreadTitleRequest,
): Promise<VaenyxThread> {
  return requestJson<VaenyxThread>(`/v1/threads/${threadId}/title`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function createTask(input: CreateTaskRequest): Promise<Task> {
  return requestJson<Task>("/v1/tasks", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchVaenyxMeCandidates(): Promise<VaenyxMeCandidate[]> {
  return requestJson<VaenyxMeCandidate[]>("/v1/vaenyx-me/candidates");
}

// Auto-learn: scan recent activity for stable Owner traits → pending candidates.
export function scanVaenyxMe(): Promise<VaenyxMeCandidate[]> {
  return requestJson<VaenyxMeCandidate[]>("/v1/vaenyx-me/scan", {
    method: "POST",
  });
}

export function createVaenyxMeCandidate(
  input: CreateVaenyxMeCandidateRequest,
): Promise<VaenyxMeCandidate> {
  return requestJson<VaenyxMeCandidate>("/v1/vaenyx-me/candidates", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function approveVaenyxMeCandidate(
  candidateId: string,
  input: ApproveVaenyxMeCandidateRequest,
): Promise<VaenyxMeCandidate> {
  return requestJson<VaenyxMeCandidate>(
    `/v1/vaenyx-me/candidates/${candidateId}/approve`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function rejectVaenyxMeCandidate(
  candidateId: string,
  input: RejectVaenyxMeCandidateRequest = {},
): Promise<VaenyxMeCandidate> {
  return requestJson<VaenyxMeCandidate>(
    `/v1/vaenyx-me/candidates/${candidateId}/reject`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function deleteVaenyxMeCandidate(
  candidateId: string,
): Promise<void> {
  await requestJson<{ message: string }>(
    `/v1/vaenyx-me/candidates/${candidateId}`,
    {
      method: "DELETE",
    },
  );
}

export function fetchAppProfiles(): Promise<AppProfile[]> {
  return requestJson<AppProfile[]>("/v1/app-profiles");
}

export function createAppProfile(
  input: CreateAppProfileRequest,
): Promise<CreateAppProfileResponse> {
  return requestJson<CreateAppProfileResponse>("/v1/app-profiles", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAppProfile(
  profileId: string,
  input: UpdateAppProfileRequest,
): Promise<UpdateAppProfileResponse> {
  return requestJson<UpdateAppProfileResponse>(`/v1/app-profiles/${profileId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function regenerateAppProfileToken(
  profileId: string,
): Promise<CreateAppProfileResponse> {
  return requestJson<CreateAppProfileResponse>(
    `/v1/app-profiles/${profileId}/regenerate-token`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export function fetchAppProfileToken(
  profileId: string,
): Promise<{ token: string }> {
  return requestJson<{ token: string }>(`/v1/app-profiles/${profileId}/token`);
}

export function fetchPushPublicKey(): Promise<{ key: string | null }> {
  return requestJson<{ key: string | null }>("/v1/push/public-key");
}

export function subscribePush(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<{ ok: boolean }> {
  return requestJson<{ ok: boolean }>("/v1/push/subscriptions", {
    method: "POST",
    body: JSON.stringify(subscription),
  });
}

export function unsubscribePush(endpoint: string): Promise<{ ok: boolean }> {
  return requestJson<{ ok: boolean }>("/v1/push/subscriptions", {
    method: "DELETE",
    body: JSON.stringify({ endpoint }),
  });
}

export interface VoiceStatus {
  connected: boolean;
  provider: string | null;
  model: string | null;
}

export function fetchVoiceStatus(): Promise<VoiceStatus> {
  return requestJson<VoiceStatus>("/v1/voice/status");
}

export function setVoiceInput(
  provider: "none" | "groq" | "openai",
): Promise<VoiceStatus> {
  return requestJson<VoiceStatus>("/v1/voice/connect", {
    method: "POST",
    body: JSON.stringify({ provider }),
  });
}

export interface VoiceOutputStatus {
  engine: "none" | "browser" | "gemini" | "local";
  connected: boolean;
  voice: string | null;
  zhVoice?: string;
  enVoice?: string;
}

export interface LocalTtsStatus {
  installed: boolean;
  status: "idle" | "downloading" | "ready" | "error";
  progress: number;
  detail: string | null;
  voices: {
    id: string;
    lang: "zh" | "en";
    label: string;
    downloaded: boolean;
  }[];
}

export function fetchVoiceOutput(): Promise<VoiceOutputStatus> {
  return requestJson<VoiceOutputStatus>("/v1/voice/output");
}

export function connectVoiceOutput(input: {
  engine: "none" | "browser" | "gemini" | "local";
  voice?: string;
}): Promise<VoiceOutputStatus> {
  return requestJson<VoiceOutputStatus>("/v1/voice/output", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function synthesizeSpeech(text: string): Promise<{ audioId: string }> {
  return requestJson<{ audioId: string }>("/v1/voice/speak", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function fetchLocalTts(): Promise<LocalTtsStatus> {
  return requestJson<LocalTtsStatus>("/v1/voice/local");
}

export function installLocalTts(): Promise<LocalTtsStatus> {
  return requestJson<LocalTtsStatus>("/v1/voice/local/install", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function removeLocalTtsDownload(): Promise<LocalTtsStatus> {
  return requestJson<LocalTtsStatus>("/v1/voice/local", {
    method: "DELETE",
  });
}

export function setLocalVoice(id: string): Promise<LocalTtsStatus> {
  return requestJson<LocalTtsStatus>("/v1/voice/local/voice", {
    method: "POST",
    body: JSON.stringify({ id }),
  });
}

export function postPresenceHeartbeat(): Promise<{ ok: boolean }> {
  return requestJson<{ ok: boolean }>("/v1/presence", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function stopTurn(key: string): Promise<{ ok: boolean }> {
  return requestJson<{ ok: boolean }>("/v1/turns/stop", {
    method: "POST",
    body: JSON.stringify({ key }),
  });
}

export interface PushDiagnostics {
  subscriptions: number;
  lastResult: string | null;
}

export function fetchPushStatus(): Promise<PushDiagnostics> {
  return requestJson<PushDiagnostics>("/v1/push/status");
}

export function sendTestPush(): Promise<PushDiagnostics> {
  return requestJson<PushDiagnostics>("/v1/push/test", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export interface VisionStatus {
  connected: boolean;
  provider: string | null;
}

export function fetchVisionStatus(): Promise<VisionStatus> {
  return requestJson<VisionStatus>("/v1/vision/status");
}

export function fetchModes(): Promise<Mode[]> {
  return requestJson<Mode[]>("/v1/modes");
}

export function createMode(input: CreateModeRequest): Promise<Mode> {
  return requestJson<Mode>("/v1/modes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateMode(
  modeId: string,
  input: UpdateModeRequest,
): Promise<Mode> {
  return requestJson<Mode>(`/v1/modes/${modeId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteMode(modeId: string): Promise<Mode> {
  return requestJson<Mode>(`/v1/modes/${modeId}`, { method: "DELETE" });
}

export interface PushPrefs {
  chat: boolean;
  scheduled: boolean;
  mode: boolean;
}

export function fetchUpdateStatus(): Promise<UpdateStatus> {
  return requestJson<UpdateStatus>("/v1/system/update");
}

export function checkForUpdate(): Promise<UpdateStatus> {
  return requestJson<UpdateStatus>("/v1/system/update/check", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function downloadUpdate(): Promise<UpdateStatus> {
  return requestJson<UpdateStatus>("/v1/system/update/download", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function fetchPushPrefs(): Promise<PushPrefs> {
  return requestJson<PushPrefs>("/v1/push/prefs");
}

export function updatePushPrefs(input: PushPrefs): Promise<PushPrefs> {
  return requestJson<PushPrefs>("/v1/push/prefs", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function fetchDeviceModes(): Promise<DeviceMode[]> {
  return requestJson<DeviceMode[]>("/v1/mode/devices");
}

export function setDeviceMode(
  deviceId: string,
  input: SetDeviceModeRequest,
): Promise<DeviceMode[]> {
  return requestJson<DeviceMode[]>(`/v1/mode/devices/${deviceId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function forgetDeviceMode(deviceId: string): Promise<DeviceMode[]> {
  return requestJson<DeviceMode[]>(`/v1/mode/devices/${deviceId}`, {
    method: "DELETE",
  });
}

export function applyDeviceMode(
  deviceId: string,
): Promise<{ modeId: string | null }> {
  return requestJson<{ modeId: string | null }>(
    `/v1/mode/devices/${deviceId}/apply`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export function fetchModeThreads(modeId: string): Promise<VaenyxThread[]> {
  return requestJson<VaenyxThread[]>(`/v1/modes/${modeId}/threads`);
}

export function switchMode(
  modeId: string,
  secret?: string,
): Promise<{ ok: boolean }> {
  return requestJson<{ ok: boolean }>("/v1/mode/switch", {
    method: "POST",
    body: JSON.stringify({ modeId, ...(secret ? { secret } : {}) }),
  });
}

export function exitMode(secret?: string): Promise<{ ok: boolean }> {
  return requestJson<{ ok: boolean }>("/v1/mode/exit", {
    method: "POST",
    body: JSON.stringify(secret ? { secret } : {}),
  });
}

export function setVisionEngine(
  provider: "none" | "gemini" | "zhipu" | "openai",
): Promise<VisionStatus> {
  return requestJson<VisionStatus>("/v1/vision/engine", {
    method: "POST",
    body: JSON.stringify({ provider }),
  });
}

export async function uploadPhoto(blob: Blob): Promise<{ imageId: string }> {
  const response = await fetch("/v1/vision/upload", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": blob.type || "image/jpeg" },
    body: blob,
  });
  const body = (await response.json().catch(() => ({}))) as {
    imageId?: string;
    error?: string;
  };
  if (!response.ok || !body.imageId) {
    throw new Error(body.error ?? "Photo upload failed.");
  }
  return { imageId: body.imageId };
}

export async function describePhoto(
  blob: Blob,
  lang: string,
): Promise<string> {
  const response = await fetch(`/v1/vision/describe?lang=${lang}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": blob.type || "image/jpeg" },
    body: blob,
  });
  const body = (await response.json().catch(() => ({}))) as {
    text?: string;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(body.error ?? "Photo analysis failed.");
  }
  return body.text ?? "";
}

export async function transcribeAudio(
  blob: Blob,
): Promise<{ text: string; audioId: string }> {
  const response = await fetch("/v1/voice/transcribe", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": blob.type || "application/octet-stream" },
    body: blob,
  });
  const body = (await response.json().catch(() => ({}))) as {
    text?: string;
    audioId?: string;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(body.error ?? "Transcription failed.");
  }
  return { text: body.text ?? "", audioId: body.audioId ?? "" };
}

export function disableAppProfile(profileId: string): Promise<AppProfile> {
  return requestJson<AppProfile>(`/v1/app-profiles/${profileId}/disable`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function enableAppProfile(profileId: string): Promise<AppProfile> {
  return requestJson<AppProfile>(`/v1/app-profiles/${profileId}/enable`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function deleteAppProfile(
  profileId: string,
): Promise<{ message: string }> {
  return requestJson<{ message: string }>(`/v1/app-profiles/${profileId}`, {
    method: "DELETE",
  });
}

export function fetchMemories(): Promise<ProjectMemory[]> {
  return requestJson<ProjectMemory[]>("/v1/memories");
}

export function createMemory(
  input: CreateProjectMemoryRequest,
): Promise<ProjectMemory> {
  return requestJson<ProjectMemory>("/v1/memories", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateMemory(
  memoryId: string,
  input: UpdateProjectMemoryRequest,
): Promise<ProjectMemory> {
  return requestJson<ProjectMemory>(`/v1/memories/${memoryId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteMemory(memoryId: string): Promise<void> {
  await requestJson<{ message: string }>(`/v1/memories/${memoryId}`, {
    method: "DELETE",
  });
}

export function fetchAuditEvents(): Promise<AuditEvent[]> {
  return requestJson<AuditEvent[]>("/v1/guard/audit");
}

export function fetchGlossary(lang: string): Promise<{ markdown: string }> {
  return requestJson<{ markdown: string }>(
    `/v1/help/glossary?lang=${encodeURIComponent(lang)}`,
  );
}

export function fetchLibraryMethods(): Promise<LibraryMethodSummary[]> {
  return requestJson<LibraryMethodSummary[]>("/v1/methods");
}

export function fetchLibraryRoutines(): Promise<LibraryRoutineSummary[]> {
  return requestJson<LibraryRoutineSummary[]>("/v1/routines");
}

export function planRoutine(description: string): Promise<RoutinePlan> {
  return requestJson<RoutinePlan>("/v1/routines/plan", {
    method: "POST",
    body: JSON.stringify({ description }),
  });
}

export function createRoutine(plan: RoutinePlan): Promise<LibraryRoutine> {
  return requestJson<LibraryRoutine>("/v1/routines", {
    method: "POST",
    body: JSON.stringify(plan),
  });
}

// The result of an owner-initiated Routine run (shape mirrors the server's
// RoutineRunResult; output is the final structured result).
export interface RoutineRunResult {
  routineId: string;
  journalEntry: RoutineJournalEntry | null;
  galleryItem: RoutineGalleryItem | null;
  steps: {
    stepId: string;
    methodId: string;
    output: unknown;
    outputValid: boolean;
  }[];
  output: unknown;
  outputValid: boolean;
  webSearchUsed: boolean;
}

// ── Library v2 distribution (④): the community catalogue (served via Cloudflare,
// proxied by our server so the browser never calls the CDN cross-origin). ──────
export function fetchCatalogue(): Promise<CatalogueIndex> {
  return requestJson<CatalogueIndex>("/v1/library/catalogue");
}

export function installRoutineFromCatalogue(
  routineId: string,
): Promise<InstallRoutineResponse> {
  return requestJson<InstallRoutineResponse>("/v1/library/catalogue/install", {
    method: "POST",
    body: JSON.stringify({ routineId }),
  });
}

export function installMethodFromCatalogue(
  methodId: string,
): Promise<LibraryMethod> {
  return requestJson<LibraryMethod>("/v1/library/catalogue/install-method", {
    method: "POST",
    body: JSON.stringify({ methodId }),
  });
}

// Record a legal acknowledgement / consent choice (copy pack clause 2.3).
export function recordLegalAck(input: {
  keyName: string;
  copyVersion: string;
  language: string;
  choice?: string;
}): Promise<{ ok: boolean }> {
  return requestJson<{ ok: boolean }>("/v1/legal/acknowledge", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// The local flywheel: corrections an app sent back, and keeping one as an
// example. Reading is free; keeping is always the Owner's explicit act.
export function fetchCorrections(
  methodId: string,
): Promise<CorrectionsResponse> {
  return requestJson<CorrectionsResponse>(
    `/v1/library/methods/${encodeURIComponent(methodId)}/corrections`,
  );
}

// Agent Skill interoperability (copy pack Part L). The wording is binding:
// Vaenyx IMPORTS THE INSTRUCTIONS FROM A SKILL and lists what was dropped.
// Never "Skill compatible", never "runs Skills" (L4 / ToS 11.5).
export function previewSkillImport(
  input: PreviewSkillRequest,
): Promise<SkillImportPreviewResponse> {
  return requestJson<SkillImportPreviewResponse>("/v1/skills/preview", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function importSkill(
  input: ImportSkillRequest,
): Promise<ImportSkillResponse> {
  return requestJson<ImportSkillResponse>("/v1/skills/import", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function exportMethodAsSkill(
  methodId: string,
): Promise<ExportSkillResponse> {
  return requestJson<ExportSkillResponse>(
    `/v1/methods/${encodeURIComponent(methodId)}/skill-export`,
  );
}

export function fetchMethodExamples(
  methodId: string,
): Promise<MethodExamplesResponse> {
  return requestJson<MethodExamplesResponse>(
    `/v1/library/methods/${encodeURIComponent(methodId)}/examples`,
  );
}

export function deleteMethodExample(
  methodId: string,
  file: string,
): Promise<{ exampleCount: number }> {
  return requestJson<{ exampleCount: number }>(
    `/v1/library/methods/${encodeURIComponent(methodId)}/examples/${encodeURIComponent(file)}`,
    { method: "DELETE" },
  );
}

export function adoptCorrection(
  methodId: string,
  input: AdoptCorrectionRequest,
): Promise<AdoptCorrectionResponse> {
  return requestJson<AdoptCorrectionResponse>(
    `/v1/library/methods/${encodeURIComponent(methodId)}/examples`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

// The operator's publishing pause. Reports available: false for anyone the
// publish service does not recognise as an operator.
export function fetchPublishPause(): Promise<PublishPauseState> {
  return requestJson<PublishPauseState>("/v1/publish/pause");
}

export function setPublishPause(paused: boolean): Promise<PublishPauseState> {
  return requestJson<PublishPauseState>("/v1/publish/pause", {
    method: "POST",
    body: JSON.stringify({ paused }),
  });
}

// Editing a Method's recipe from chat (copy pack B4). Two calls, never one:
// the draft only proposes and returns the difference, and nothing is written
// until the Owner has seen what changed and approved it.
export function draftRecipeEdit(
  methodId: string,
  request: string,
): Promise<RecipeEditDraft> {
  return requestJson<RecipeEditDraft>(
    `/v1/methods/${encodeURIComponent(methodId)}/recipe/draft`,
    { method: "POST", body: JSON.stringify({ request }) },
  );
}

export function updateMethodRecipe(
  methodId: string,
  recipe: string,
): Promise<UpdateRecipeResponse> {
  return requestJson<UpdateRecipeResponse>(
    `/v1/methods/${encodeURIComponent(methodId)}/recipe`,
    { method: "PUT", body: JSON.stringify({ recipe }) },
  );
}

// The A3 sharing card's answer. A plain local setting, kept off the
// acknowledgement path on purpose: sharing does not exist in this release, so
// this is interest, never consent.
export function setSharingPreference(
  choice: "interested" | "not-interested",
): Promise<{ ok: boolean }> {
  return requestJson<{ ok: boolean }>("/v1/legal/sharing-preference", {
    method: "POST",
    body: JSON.stringify({ choice }),
  });
}

// The signed-in Owner's recorded legal acknowledgements (latest row per key).
export function fetchLegalAcks(): Promise<LegalAcknowledgement[]> {
  return requestJson<LegalAcknowledgementsResponse>(
    "/v1/legal/acknowledgements",
  ).then((response) => response.acknowledgements);
}

// An A-class legal document as operative text (Notes-for-Operator stripped).
export function fetchLegalDocument(
  name: string,
  lang: string,
): Promise<{ markdown: string }> {
  return requestJson<{ markdown: string }>(
    `/v1/legal/documents/${encodeURIComponent(name)}?lang=${encodeURIComponent(
      lang,
    )}`,
  );
}

export function fetchLibraryMethod(id: string): Promise<LibraryMethod> {
  return requestJson<LibraryMethod>(`/v1/methods/${encodeURIComponent(id)}`);
}

export function draftMethod(description: string): Promise<MethodDraft> {
  return requestJson<MethodDraft>("/v1/methods/draft", {
    method: "POST",
    body: JSON.stringify({ description }),
  });
}

export interface DraftRunResult {
  output: unknown;
  outputValid: boolean;
  raw: string;
  webSearchUsed: boolean;
}

export function testDraftMethod(
  draft: MethodDraft,
  input: unknown,
): Promise<DraftRunResult> {
  return requestJson<DraftRunResult>("/v1/methods/draft/test", {
    method: "POST",
    body: JSON.stringify({ draft, input }),
  });
}

export function createMethod(draft: MethodDraft): Promise<LibraryMethod> {
  return requestJson<LibraryMethod>("/v1/methods", {
    method: "POST",
    body: JSON.stringify(draft),
  });
}

export function renameMethod(id: string, name: string): Promise<LibraryMethod> {
  return requestJson<LibraryMethod>(
    `/v1/methods/${encodeURIComponent(id)}/rename`,
    { method: "POST", body: JSON.stringify({ name }) },
  );
}

export function setMethodTags(
  id: string,
  tags: string[],
): Promise<LibraryMethod> {
  return requestJson<LibraryMethod>(
    `/v1/methods/${encodeURIComponent(id)}/tags`,
    { method: "POST", body: JSON.stringify({ tags }) },
  );
}

export function renameMethodTag(
  from: string,
  to: string,
): Promise<RenameMethodTagResponse> {
  return requestJson<RenameMethodTagResponse>("/v1/methods/tags/rename", {
    method: "POST",
    body: JSON.stringify({ from, to }),
  });
}

export function testRunMethod(
  id: string,
  input: unknown,
): Promise<RunMethodResponse> {
  return requestJson<RunMethodResponse>(
    `/v1/methods/${encodeURIComponent(id)}/test-run`,
    { method: "POST", body: JSON.stringify({ input }) },
  );
}

export function createProject(input: CreateProjectRequest): Promise<Project> {
  return requestJson<Project>("/v1/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateProject(
  projectId: string,
  input: UpdateProjectRequest,
): Promise<Project> {
  return requestJson<Project>(`/v1/projects/${projectId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function updateProjectInstructions(
  projectId: string,
  input: UpdateProjectInstructionsRequest,
): Promise<Project> {
  return requestJson<Project>(`/v1/projects/${projectId}/instructions`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function fetchSettings(): Promise<InstanceSettings> {
  return requestJson<InstanceSettings>("/v1/settings");
}

export function updateSettings(
  input: UpdateInstanceSettingsRequest,
): Promise<InstanceSettings> {
  return requestJson<InstanceSettings>("/v1/settings", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function testForgeConnection(): Promise<ForgeConnectionTestResult> {
  return requestJson<ForgeConnectionTestResult>("/v1/settings/forge-test", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function testChatConnection(
  input: ChatConnectionTestRequest,
): Promise<ChatConnectionTestResult> {
  return requestJson<ChatConnectionTestResult>("/v1/settings/chat-test", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
