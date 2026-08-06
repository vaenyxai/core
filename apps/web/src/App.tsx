import {
  type CSSProperties,
  Fragment,
  type FormEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  AnnotatedPhoto,
  AnnotatedPhotoEditor,
} from "./photo-marks";
import { encodeQr, qrSvgPath } from "./qr";

import type {
  AgentProfile,
  AppProfile,
  RecipeEditDraft,
  PublishPauseState,
  StoredCorrection,
  MethodExampleEntry,
  LibraryRoutine,
  SkillImportPreviewResponse,
  AskVaenyxConversation,
  AskVaenyxMessage,
  ImageAnnotationItem,
  ReasoningEffort,
  AuditEvent,
  BackupEntry,
  BootstrapStatus,
  ChatConnectionTestResult,
  CreateAppProfileResponse,
  ForgeConnectionTestResult,
  InstanceSettings,
  AppProfileKind,
  LibraryMethod,
  LibraryMethodSummary,
  LibraryRoutineSummary,
  ModelProviderInfo,
  CatalogueIndex,
  MethodDraft,
  Project,
  ProjectMemory,
  RoutineGalleryItem,
  RoutineInputField,
  RoutineJournalEntry,
  RoutinePlan,
  RoutineView,
  RoutineViewField,
  RunMethodResponse,
  PublishState,
  SystemStatus,
  Task,
  TaskRun,
  VaenyxMeCandidate,
  VaenyxThread,
  Workspace,
  RelayPanel as RelayPanelData,
  RelaySettings,
  CapabilityTestResult,
} from "@vaenyx/contracts";

import {
  approveVaenyxMeCandidate,
  cancelTask,
  fetchBackups,
  fetchBackupConfig,
  saveBackupConfig,
  createBackup,
  restoreBackup,
  createAskVaenyxConversation,
  createAppProfile,
  createMemory,
  createMethod,
  createProject,
  createRoutine,
  createTask,
  createVaenyxMeCandidate,
  deleteVaenyxMeCandidate,
  deleteMemory,
  deleteAppProfile,
  disableAppProfile,
  enableAppProfile,
  fetchAskVaenyxConversations,
  fetchAskVaenyxMessages,
  fetchAppProfiles,
  fetchAuditEvents,
  draftMethod,
  testDraftMethod,
  fetchBootstrapStatus,
  fetchGlossary,
  fetchLibraryMethod,
  fetchLibraryMethods,
  fetchLibraryRoutines,
  fetchLibraryRoutine,
  deleteAskVaenyxConversation,
  fetchCatalogue,
  installRoutineFromCatalogue,
  installMethodFromCatalogue,
  recordLegalAck,
  setSharingPreference,
  draftRecipeEdit,
  updateMethodRecipe,
  fetchPublishPause,
  setPublishPause,
  fetchCorrections,
  adoptCorrection,
  fetchMethodExamples,
  deleteMethodExample,
  previewSkillImport,
  importSkill,
  exportMethodAsSkill,
  fetchLegalAcks,
  fetchLegalDocument,
  fetchChatRoutineData,
  runRoutineInChat,
  attachRoutineToChat,
  classifyMessage,
  fetchModelProviders,
  connectModelProvider,
  disconnectModelProvider,
  startCodexLogin,
  appendConversationNote,
  setDefaultModelProvider,
  setReasoningEffort,
  setChatProvider,
  setChatModel,
  planRoutine,
  fetchMemories,
  fetchSettings,
  fetchSystemStatus,
  fetchTaskMessages,
  fetchTaskRuns,
  fetchVaenyxMeCandidates,
  scanVaenyxMe,
  fetchWorkspace,
  loginOwner,
  logoutOwner,
  logoutAllDevices,
  changeOwnerPassword,
  regenerateAppProfileToken,
  fetchAppProfileToken,
  fetchPushPublicKey,
  subscribePush,
  unsubscribePush,
  fetchVoiceStatus,
  setVoiceInput,
  transcribeAudio,
  fetchPushStatus,
  sendTestPush,
  fetchPushPrefs,
  updatePushPrefs,
  fetchUpdateStatus,
  checkForUpdate,
  downloadUpdate,
  fetchPhoneAccessStatus,
  installPhoneTailscale,
  startPhoneLogin,
  enablePhoneTunnel,
  type PhoneAccessStatus,
  type UpdateStatus,
  type PushPrefs,
  type PushDiagnostics,
  fetchVisionStatus,
  fetchFlywheel,
  fetchFreePicks,
  refreshFreePicks,
  fetchCapabilities,
  type CapabilityCeiling,
  updateCapabilities,
  fetchCapabilityFolders,
  updateCapabilityFolders,
  recordCapabilityWanted,
  runCapabilityTest,
  VaenyxRequestError,
  fetchRelay,
  fetchRelayUsage,
  type RelayUsageResponse,
  updateRelaySettings,
  fetchManual,
  type FreePicksState,
  withdrawFlywheelItem,
  type FlywheelState,
  fetchImageEngine,
  setImageEngineChoice,
  connectWorkersAi,
  saveAnnotations,
  uploadDocument,
  startClaudeLogin,
  submitClaudeLoginCode,
  describePhoto,
  uploadPhoto,
  fetchVoiceOutput,
  connectVoiceOutput,
  synthesizeSpeech,
  fetchLocalTts,
  installLocalTts,
  removeLocalTtsDownload,
  setLocalVoice,
  setVisionEngine,
  fetchModes,
  createMode,
  deleteMode,
  updateMode,
  switchMode,
  exitMode,
  fetchModeThreads,
  fetchModeCapabilities,
  updateModeCapabilities,
  fetchDeviceModes,
  setDeviceMode,
  forgetDeviceMode,
  applyDeviceMode,
  type Mode,
  type ModeCapabilities,
  type DeviceMode,
  type LocalTtsStatus,
  postPresenceHeartbeat,
  stopTurn,
  type VoiceOutputStatus,
  rejectVaenyxMeCandidate,
  renameMethod,
  renameMethodTag,
  setMethodTags,
  streamAskVaenyxMessage,
  streamTaskMessage,
  fetchTaskLive,
  retryTask,
  setTaskSchedule,
  setupOwner,
  restartVaenyx,
  shutdownVaenyx,
  testChatConnection,
  testForgeConnection,
  fetchPublishState,
  disconnectPublishService,
  publishMethodToCommunity,
  publishRoutineToCommunity,
  type PublishAcceptance,
  setPublishDisplayName,
  testRunMethod,
  updateAppProfile,
  updateAppProfileCapabilities,
  updateMemory,
  updateProject,
  updateProjectInstructions,
  updateSettings,
  updateVaenyxThreadProject,
  updateVaenyxThreadStatus,
  updateVaenyxThreadTitle,
} from "./api.js";
import { MarkdownMessage } from "./MarkdownMessage.js";
import {
  setToastListener,
  showErrorToast,
  type ToastTone,
} from "./toast.js";
import { useI18n, type Lang } from "./i18n.js";
import {
  CAPABILITY_META,
  CapabilityChip,
  CapabilityChips,
  capabilityMeta,
} from "./capability-chips.js";
import { Picker, type PickerOption } from "./picker.js";
import { CAPABILITIES } from "./capabilities.js";
import {
  getCodexAuthCopy,
  getProviderConnectionCopy,
  getProviderConnectionDetail,
} from "./status-copy.js";

type Screen =
  | "ask-vaenyx"
  | "projects"
  | "library"
  | "community"
  | "discord"
  | "modes"
  | "settings"
  | "vaenyx-me"
  | "guard"
  | "scheduled"
  | "help";

// The screens a ?view= URL may restore after a refresh. Everything except the
// chat portal, which is addressed by ?chat= / ?task= instead.
const RESTORABLE_SCREENS: Screen[] = [
  "projects",
  "library",
  "community",
  "discord",
  "modes",
  "settings",
  "vaenyx-me",
  "guard",
  "scheduled",
  "help",
];

type PortalView = "chat" | "task" | "new";

const GENERAL_PROJECT_ID = "general";

// Force the very latest build: drop any service worker + cache entries, then
// reload with a cache-busting query so the phone never gets stuck on a stale
// version. Useful because phones have no Ctrl+Shift+R.
async function hardRefresh(): Promise<void> {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    // Best effort; reload anyway.
  }
  // Keep the location params: ?chat / ?task / ?view are WHERE THE OWNER IS,
  // and dropping them made every refresh land on the home screen.
  const url = new URL(window.location.href);
  url.searchParams.set("r", String(Date.now()));
  window.location.replace(url.toString());
}

// Dates follow the app language, not the device locale (Oskar, dev.150): an
// English UI shows English dates. Key mirrors i18n.tsx's LANG_STORAGE_KEY.
function uiLocale(): string {
  try {
    return window.localStorage.getItem("vaenyx.lang") === "zh"
      ? "zh-CN"
      : "en-AU";
  } catch {
    return "en-AU";
  }
}

function formatTime(value: string | null): string {
  if (!value) return "In progress";
  return new Intl.DateTimeFormat(uiLocale(), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDuration(durationMs: number): string {
  return `${(durationMs / 1000).toFixed(1)}s`;
}

// A when, as short as it can be and still be unambiguous — for headers that
// have to fit a narrow phone. Today and tomorrow are the two the Owner reads
// most, so they say so instead of spelling out a date he already knows.
function shortWhen(value: string): string {
  const when = new Date(value);
  const time = new Intl.DateTimeFormat(uiLocale(), {
    timeStyle: "short",
  }).format(when);
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const days = Math.floor(
    (when.getTime() - midnight.getTime()) / 86_400_000,
  );
  if (days === 0) return time;
  if (days === 1) return `tomorrow ${time}`;
  if (days === -1) return `yesterday ${time}`;
  return `${new Intl.DateTimeFormat(uiLocale(), { day: "numeric", month: "short" }).format(when)} ${time}`;
}

// Rotating "what Vaenyx is doing" copy shown while waiting for the reply. The
// model can take several seconds before the first token, so a lively, changing
// indicator reassures the Owner that work is happening. The backend does not
// expose live step status, so these phases are friendly stand-ins.
const SCHEDULE_OPTIONS: {
  label: string;
  value: "hourly" | "daily" | "weekly" | "monthly" | null;
}[] = [
  { label: "Off", value: null },
  { label: "Hourly", value: "hourly" },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

const WEEKDAY_OPTIONS: { label: string; value: number }[] = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

// A scheduled task's schedule in one human line, e.g. "Every Friday at 9:00 AM".
function describeSchedule(task: {
  scheduleCadence: "hourly" | "daily" | "weekly" | "monthly" | null;
  scheduleTime: string | null;
  scheduleDayOfWeek: number | null;
  scheduleDayOfMonth: number | null;
}): string {
  const time = task.scheduleTime ?? "09:00";
  switch (task.scheduleCadence) {
    case "hourly":
      return "Every hour";
    case "daily":
      return `Every day at ${time}`;
    case "weekly": {
      const day =
        WEEKDAY_OPTIONS.find((d) => d.value === task.scheduleDayOfWeek)?.label ??
        "Mon";
      return `Every ${day} at ${time}`;
    }
    case "monthly":
      return `Monthly on day ${task.scheduleDayOfMonth ?? 1} at ${time}`;
    default:
      return "Not scheduled";
  }
}

const THINKING_PHASES = [
  "Thinking",
  "Working on it",
  "Looking into it",
  "Gathering my thoughts",
  "Connecting the dots",
  "Reasoning it through",
  "Checking the details",
  "Weighing the options",
  "Crunching the details",
  "Pulling it together",
  "Composing a reply",
  "Putting it into words",
  "Tidying up the answer",
  "Almost there",
  "Just a moment",
  "Mulling it over",
  "Lining up the facts",
  "Sorting it out",
  "Reading between the lines",
  "Making sense of it",
  "Framing the answer",
  "Sketching a reply",
  "Drafting a response",
  "Double-checking myself",
  "Considering the angles",
  "Turning it over",
  "Getting my bearings",
  "Mapping it out",
  "Untangling the details",
  "Piecing it together",
  "Sifting through it",
  "Shaping the answer",
  "Polishing the wording",
  "Narrowing it down",
  "Thinking carefully",
  "Working out the details",
  "Forming a view",
  "Cross-checking the facts",
  "Settling on an answer",
  "Refining the response",
  "Working the problem",
  "Bringing it together",
  "Lining up the steps",
  "Joining the dots",
  "Thinking it through",
  "Wrapping up my thoughts",
  "Reviewing the details",
  "Organising my thoughts",
  "Following the thread",
  "Putting it in order",
  "Finding the best answer",
  "Nearly done",
];

// No elapsed counter on purpose (Oskar, dev.125): a ticking number reads like a
// deadline and adds nothing — the moving dots already say "working".
function ThinkingIndicator(): ReactNode {
  // Start on a random phase so repeated sends don't always open with the same
  // word.
  const [phase, setPhase] = useState(() =>
    Math.floor(Math.random() * THINKING_PHASES.length),
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setPhase((current) => (current + 1) % THINKING_PHASES.length);
    }, 3000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <p aria-live="polite" className="streaming-pending">
      <span aria-hidden="true" className="thinking-dots">
        <span />
        <span />
        <span />
      </span>
      <span className="thinking-label">{THINKING_PHASES[phase]}…</span>
    </p>
  );
}

function getTaskAgentDisplayName(
  agents: AgentProfile[],
  taskAgent: Task["agent"],
): string {
  const profileId = taskAgent === "Forge" ? "forge" : "vaenyx";
  return agents.find((agent) => agent.id === profileId)?.name ?? taskAgent;
}

function getSidebarProjectName(project: Project): string {
  if (project.id === GENERAL_PROJECT_ID) {
    return "Unsorted";
  }

  if (project.id === "vaenyx" && project.name === "Vaenyx") {
    return "Testing";
  }

  return project.name;
}

function isGeneralProject(project: Project): boolean {
  return project.id === GENERAL_PROJECT_ID;
}

function sortProjectsForSidebar(projects: Project[]): Project[] {
  return [...projects].sort((left, right) => {
    if (isGeneralProject(left)) return 1;
    if (isGeneralProject(right)) return -1;

    return getSidebarProjectName(left).localeCompare(getSidebarProjectName(right));
  });
}

function clampSidebarWidth(width: number): number {
  return Math.min(460, Math.max(280, width));
}

// A Chat's status light. Plain conversations are "chat"; a Chat that has entered
// work mode (today: a task-kind thread) reflects its run status. See spec.md §2.
type ChatLight = "chat" | "working" | "done" | "failed";

function threadLight(thread: VaenyxThread, tasks: Task[]): ChatLight {
  if (thread.kind !== "task") return "chat";
  const task = thread.taskId
    ? tasks.find((candidate) => candidate.id === thread.taskId)
    : undefined;
  if (task?.status === "completed") return "done";
  if (task?.status === "failed") return "failed";
  return "working";
}

function chatLightLabel(light: ChatLight): string {
  switch (light) {
    case "working":
      return "Working";
    case "done":
      return "Done";
    case "failed":
      return "Failed";
    default:
      return "Chat";
  }
}

// Status chips pinned on a chat (spec §2a): a thread can carry several states at
// once (a Routine chat that is also Scheduled), so these render as a row, not a
// single light. Always derived from real state — never set decoratively.
// (No "capability" tone: Vision/Speak chips were tried and dropped the same
// day — those abilities are universal now, so a badge said nothing. Oskar,
// 2026-07-28.)
type ThreadChip = {
  key: string;
  label: string;
  tone: "routine" | "scheduled" | "working" | "done" | "failed" | "building";
  title?: string;
};

function threadStatusChips(thread: VaenyxThread, tasks: Task[]): ThreadChip[] {
  const chips: ThreadChip[] = [];
  if (thread.routineId) {
    chips.push({ key: "routine", label: "RTN", tone: "routine" });
  }
  const task = thread.taskId
    ? tasks.find((candidate) => candidate.id === thread.taskId)
    : undefined;
  if (task?.scheduleEnabled && task.scheduleCadence) {
    chips.push({
      key: "scheduled",
      label: "Scheduled",
      tone: "scheduled",
      title: describeSchedule(task),
    });
  }
  return chips;
}

function ThreadChipRow({
  chips,
  className,
}: {
  chips: ThreadChip[];
  className?: string;
}) {
  if (chips.length === 0) return null;
  return (
    <span className={className ?? "thread-chips"}>
      {chips.map((chip) => (
        <span
          className={`thread-chip thread-chip--${chip.tone}`}
          key={chip.key}
          title={chip.title}
        >
          {chip.label}
        </span>
      ))}
    </span>
  );
}

function SidebarDetails({
  children,
  className,
  count,
  initiallyOpen = true,
  label,
}: {
  children: ReactNode;
  className?: string;
  count: number;
  initiallyOpen?: boolean;
  label: string;
}) {
  const [open, setOpen] = useState(initiallyOpen);

  return (
    <details
      className={className}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      open={open}
    >
      <summary>
        <span>{label}</span>
        <small>{count}</small>
      </summary>
      {children}
    </details>
  );
}

function AuthScreen({
  bootstrap,
  onAuthenticated,
}: {
  bootstrap: BootstrapStatus;
  onAuthenticated: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Quick-connect: picking a model here routes straight to its connect card
  // in Settings → Models after sign-in (parked in localStorage — connecting
  // itself needs an unlocked instance, keys never touch this page).
  const [connectChoice, setConnectChoice] = useState<string | null>(() =>
    localStorage.getItem(CONNECT_MODEL_INTENT),
  );

  function chooseModel(id: string) {
    if (connectChoice === id) {
      localStorage.removeItem(CONNECT_MODEL_INTENT);
      setConnectChoice(null);
      return;
    }
    localStorage.setItem(CONNECT_MODEL_INTENT, id);
    setConnectChoice(id);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (bootstrap.setupRequired && password !== confirmPassword) {
      setError("The two passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      if (bootstrap.setupRequired) {
        await setupOwner({ name, password });
      } else {
        await loginOwner(password);
      }

      await onAuthenticated();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not continue.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand auth-brand">
          <img alt="Vaenyx" className="brand-mark brand-mark-img" src="/vaenyx-mark.svg" />
          <span>Vaenyx</span>
        </div>

        <p className="eyebrow">
          {bootstrap.setupRequired ? "Private setup" : "Owner login"}
        </p>
        <h1>
          {bootstrap.setupRequired ? "Create your Vaenyx." : "Unlock Vaenyx."}
        </h1>
        <p className="auth-description">
          {bootstrap.setupRequired
            ? "One owner. One local password. This stays on this computer."
            : `Welcome back, ${bootstrap.owner?.name ?? "Owner"}.`}
        </p>

        <form className="auth-form" onSubmit={submit}>
          {bootstrap.setupRequired ? (
            <label>
              Owner name
              <input
                autoComplete="name"
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
                placeholder="Oskar"
                required
                value={name}
              />
            </label>
          ) : null}

          <label>
            Password
            <input
              autoComplete={
                bootstrap.setupRequired ? "new-password" : "current-password"
              }
              minLength={bootstrap.setupRequired ? 8 : 1}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={
                bootstrap.setupRequired
                  ? "At least 8 characters"
                  : "Enter your password"
              }
              required
              type="password"
              value={password}
            />
          </label>

          {bootstrap.setupRequired ? (
            <label>
              Confirm password
              <input
                autoComplete="new-password"
                minLength={8}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Enter it again"
                required
                type="password"
                value={confirmPassword}
              />
            </label>
          ) : null}

          {error ? <p className="form-error">{error}</p> : null}

          <button
            className="primary-button"
            disabled={submitting}
            type="submit"
          >
            {submitting
              ? "Please wait..."
              : bootstrap.setupRequired
                ? "Create Vaenyx"
                : "Sign in"}
          </button>
        </form>

        <div className="auth-models">
          <p className="auth-models-title">
            Connect a model after {bootstrap.setupRequired ? "setup" : "sign-in"}
          </p>
          <div className="auth-models-row">
            {CONNECTABLE_MODELS.map((model) => (
              <button
                aria-pressed={connectChoice === model.id}
                className={
                  connectChoice === model.id
                    ? "auth-model-button selected"
                    : "auth-model-button"
                }
                key={model.id}
                onClick={() => chooseModel(model.id)}
                type="button"
              >
                {model.label}
              </button>
            ))}
          </div>
          <p className="auth-models-hint">
            {connectChoice
              ? "You'll land on that model's connection card."
              : "Pick one to go straight to its connection card."}
          </p>
        </div>

        <p className="privacy-note">
          Local-first / 127.0.0.1 / Owner-controlled
        </p>
      </section>
    </main>
  );
}

// A one-time secret (the App Token): masked by default with Show/Hide + Copy,
// the way most apps surface an API key. The full value is only ever shown here.
function TokenField({ token }: { token: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const masked = `${token.slice(0, 10)}${"•".repeat(24)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (rare outside a secure context): reveal so the Owner
      // can select and copy by hand.
      setRevealed(true);
    }
  }

  return (
    <div className="token-field">
      <code className="token-value">{revealed ? token : masked}</code>
      <div className="token-field-actions">
        <button
          className="secondary-button"
          onClick={() => setRevealed((value) => !value)}
          type="button"
        >
          {revealed ? "Hide" : "Show"}
        </button>
        <button className="secondary-button" onClick={() => void copy()} type="button">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

// An existing Token's masked row: Show / Copy fetch the real value on demand
// from the at-rest cipher (Owner-only endpoint). Tokens created before the
// cipher existed cannot be recovered — the row says so and points at Reset.
function StoredTokenField({ prefix, profileId }: { prefix: string; profileId: string }) {
  const [revealed, setRevealed] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [unrecoverable, setUnrecoverable] = useState(false);

  const masked = `${prefix.replace(/\.\.\.$/, "")}${"•".repeat(24)}`;

  async function load(): Promise<string | null> {
    if (token) return token;
    try {
      const result = await fetchAppProfileToken(profileId);
      setToken(result.token);
      return result.token;
    } catch {
      setUnrecoverable(true);
      return null;
    }
  }

  async function toggleReveal() {
    if (revealed) {
      setRevealed(false);
      return;
    }
    const value = await load();
    if (value) setRevealed(true);
  }

  async function copy() {
    const value = await load();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setRevealed(true);
    }
  }

  return (
    <div className="token-field">
      <code className="token-value">
        {revealed && token ? token : masked}
      </code>
      <div className="token-field-actions">
        <button
          className="secondary-button"
          onClick={() => void toggleReveal()}
          type="button"
        >
          {revealed ? "Hide" : "Show"}
        </button>
        <button
          className="secondary-button"
          onClick={() => void copy()}
          type="button"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {unrecoverable ? (
        <p className="library-note">
          Created before tokens became re-viewable — press Reset Token to get
          one you can view and copy any time.
        </p>
      ) : null}
    </div>
  );
}

// Line icons (dev.134): every icon in the app is stroke-only SVG — no emoji.
// Hand-drawn lucide-style paths, stroke = currentColor.
function LineIcon({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden="true" className="line-icon" viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

function IconMic() {
  return (
    <LineIcon>
      <rect height="11" rx="3" width="6" x="9" y="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <line x1="12" x2="12" y1="18" y2="21" />
    </LineIcon>
  );
}

function IconStop() {
  return (
    <LineIcon>
      <rect height="10" rx="2" width="10" x="7" y="7" />
    </LineIcon>
  );
}

function IconPlay() {
  return (
    <LineIcon>
      <path d="M8 5.5v13l11-6.5z" />
    </LineIcon>
  );
}

function IconPause() {
  return (
    <LineIcon>
      <line x1="9" x2="9" y1="6" y2="18" />
      <line x1="15" x2="15" y1="6" y2="18" />
    </LineIcon>
  );
}

function IconArrowDown() {
  return (
    <LineIcon>
      <path d="M12 4v14" />
      <path d="m6 12 6 6 6-6" />
    </LineIcon>
  );
}

function IconArrowUp() {
  return (
    <LineIcon>
      <path d="M12 20V6" />
      <path d="m6 12 6-6 6 6" />
    </LineIcon>
  );
}

function IconCamera() {
  return (
    <LineIcon>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </LineIcon>
  );
}

// Photo library: the classic framed-landscape glyph, beside the camera.
function IconAlbum() {
  return (
    <LineIcon>
      <rect height="14" rx="2" width="16" x="4" y="5" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m5 17 4.5-4.5 3 3L16 12l4 4" />
    </LineIcon>
  );
}

// A document (PDF) attachment: a page with a folded corner.
function IconDocument() {
  return (
    <LineIcon>
      <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z" />
      <path d="M14 3v4h4" />
    </LineIcon>
  );
}

// (The layers icon moved with the marks tool — see photo-marks.tsx.)

// Downscale a picked/taken photo before upload: phone originals are 5-15MB;
// 1280px JPEG keeps every fridge item recognisable at a fraction of the size.
async function downscalePhoto(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolvePhoto) =>
      canvas.toBlob(
        (blob) => resolvePhoto(blob ?? file),
        "image/jpeg",
        0.85,
      ),
    );
  } catch {
    return file;
  }
}

// Take/pick a photo → the vision engine turns it into useful text → the text
// lands in the composer for the Owner to top up and send (so Routines like
// Dinner Planner receive a ready ingredient list). Mirrors the voice flow.
function CameraButton({
  disabled,
  lang,
  onAttach,
  onPreview,
  onText,
  onUploadStart,
}: {
  disabled?: boolean;
  lang: string;
  // The photo attaches to the message itself and STAYS a photo everywhere —
  // chat and Routines alike; any text extraction happens server-side, out of
  // sight ("visual first", Oskar 2026-07-28). When absent (a surface with no
  // attachment slot), the describe fallback fills the box with text instead.
  onAttach?: (imageId: string) => void;
  // Fires the moment the photo is picked, with a local object URL — the
  // thumbnail shows instantly instead of after the upload round-trip
  // ("过了一秒钟才把照片固定住", Oskar 2026-07-28). Empty string = the upload
  // failed, clear the preview.
  onPreview?: (localUrl: string) => void;
  onText: (text: string) => void;
  // The in-flight upload, so a Run pressed before it finishes can await the
  // imageId instead of losing the photo.
  onUploadStart?: (upload: Promise<string>) => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      // The photo is ALWAYS kept: it uploads, attaches to the message, and
      // stays a photo in the conversation. It used to be turned into text and
      // the text sent in its place whenever the chat model could not see
      // images — the picture never reached the conversation at all (Oskar,
      // 2026-07-26). Reading it is the server's job now: a vision-capable
      // backend sees it first-hand, and any other backend gets the vision
      // model's description as context.
      const blob = await downscalePhoto(file);
      if (onAttach) {
        onPreview?.(URL.createObjectURL(blob));
        const upload = uploadPhoto(blob).then((result) => result.imageId);
        onUploadStart?.(upload);
        onAttach(await upload);
      } else {
        // Surfaces with no attachment slot (the start-work box) still get the
        // description in text form, because there is nowhere to hang a photo.
        const text = await describePhoto(blob, lang);
        if (text) {
          onText(text);
        } else {
          throw new Error(
            "No vision model is connected, so Vaenyx could not read that photo. Connect one under Settings → AI Setting → Models.",
          );
        }
      }
    } catch (nextError) {
      // A tooltip is not an error message on a phone: there is nothing to
      // hover. A photo that silently does nothing reads as a broken button,
      // so the reason is said out loud (Oskar, 2026-07-26).
      onPreview?.("");
      const message =
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not use that photo.";
      setError(message);
      showErrorToast(message);
    } finally {
      setBusy(false);
    }
  }


  return (
    <>
      {/* Two inputs, because one cannot do both jobs. `capture` tells a phone
          to open the camera straight away; without it the phone offers the
          photo library. Some phones show a chooser for a bare input and some
          go straight to the library — which is what Oskar hit — so the choice
          is made here instead of being left to the device. */}
      <input
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleFile(file);
        }}
        ref={inputRef}
        type="file"
      />
      <input
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleFile(file);
        }}
        ref={cameraRef}
        type="file"
      />
      {/* One tap each, no chooser in between ("一步到位", Oskar 2026-07-28):
          album first (the common case), camera beside it. */}
      <button
        aria-label={t("photo.choose")}
        className={`mic-button${busy ? " mic-button--busy" : ""}`}
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        title={error ?? t("photo.choose")}
        type="button"
      >
        {busy ? <IconSpinner /> : <IconAlbum />}
      </button>
      <button
        aria-label={t("photo.take")}
        className="mic-button"
        disabled={disabled || busy}
        onClick={() => cameraRef.current?.click()}
        title={error ?? t("photo.take")}
        type="button"
      >
        <IconCamera />
      </button>
    </>
  );
}


// Floating jump pill (Oskar design, dev.149), just above the composer on the
// right, accent-highlighted:
// - scrolled away from the bottom → "↓ Latest", stays until you're back down
// - landing at the bottom (opening a chat / a push / scrolling down yourself)
//   → "↑ Reply Start" jumps to the top of the last message, and fades by
//   itself after 3s; not shown when the whole last message already fits.
function JumpToLatest({
  resetKey,
  targetRef,
}: {
  resetKey: string;
  targetRef: RefObject<HTMLDivElement | null>;
}) {
  const [mode, setMode] = useState<"hidden" | "up" | "down">("hidden");
  const wasAtBottomRef = useRef(true);
  const hideTimerRef = useRef(0);

  function lastMessageElement(): Element | null {
    const all = document.querySelectorAll(
      ".ask-vaenyx-messages .ask-vaenyx-message",
    );
    return all[all.length - 1] ?? null;
  }

  // The sticky banner's height differs per conversation (task toolbar,
  // capability bar…) — measure it live so jumps land just below it.
  function bannerOffset(): number {
    const header = document.querySelector(".ask-vaenyx-chat-header");
    return (header?.getBoundingClientRect().height ?? 90) + 12;
  }

  function showUpIfUseful() {
    window.clearTimeout(hideTimerRef.current);
    const last = lastMessageElement();
    // Only useful when the last message's start is hidden behind/above the
    // banner.
    if (!last || last.getBoundingClientRect().top >= bannerOffset()) {
      setMode("hidden");
      return;
    }
    setMode("up");
    hideTimerRef.current = window.setTimeout(() => {
      setMode((current) => (current === "up" ? "hidden" : current));
    }, 3000);
  }

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const fromBottom =
        doc.scrollHeight - (window.scrollY + window.innerHeight);
      const atBottom = fromBottom < 120;
      if (!atBottom) {
        window.clearTimeout(hideTimerRef.current);
        setMode("down");
      } else if (!wasAtBottomRef.current) {
        // Just arrived at the bottom — offer the way back up, briefly.
        showUpIfUseful();
      }
      wasAtBottomRef.current = atBottom;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  // Opening a conversation lands at the bottom — offer the way up once the
  // auto-scroll settled.
  useEffect(() => {
    const timer = window.setTimeout(showUpIfUseful, 600);
    return () => window.clearTimeout(timer);
  }, [resetKey]);

  if (mode === "hidden") return null;

  if (mode === "up") {
    return (
      <button
        aria-label="Jump to the start of the last message"
        className="jump-latest"
        onClick={() => {
          window.clearTimeout(hideTimerRef.current);
          const last = lastMessageElement();
          if (!last) return;
          window.scrollTo({
            top:
              window.scrollY +
              last.getBoundingClientRect().top -
              bannerOffset(),
            behavior: "smooth",
          });
        }}
        type="button"
      >
        <IconArrowUp />
        Reply Start
      </button>
    );
  }

  return (
    <button
      aria-label="Jump to latest"
      className="jump-latest"
      onClick={() =>
        targetRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
      }
      type="button"
    >
      <IconArrowDown />
      Latest
    </button>
  );
}

function IconSpinner() {
  return (
    <svg
      aria-hidden="true"
      className="line-icon line-icon--spin"
      viewBox="0 0 24 24"
    >
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}

function IconX() {
  return (
    <LineIcon>
      <line x1="6" x2="18" y1="6" y2="18" />
      <line x1="18" x2="6" y1="6" y2="18" />
    </LineIcon>
  );
}

function IconCheck() {
  return (
    <LineIcon>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </LineIcon>
  );
}

// THE SPEAKING SWITCH, asked in the browser. Every other capability is
// performed by the server, which asks the ceiling before it does the work — but
// device text-to-speech happens entirely inside this page and never sends a
// request, so nothing would ever consult the switch and Vaenyx would keep
// talking with Speaking off. The card promises the opposite in so many words.
// Read once per page load and shared by every speak button; `noteSpeakingOn`
// keeps it true the moment the Owner flips the switch in Settings, so the
// buttons come back without a reload.
//
// 🔴 IT IS THE SESSION'S CEILING THAT IS ASKED, NOT THE MACHINE'S. A mode
// narrows what this session may do, and with the device voice there is no
// server call for the mode layer to bite on — so reading `global` here meant a
// mode with Speaking switched off still spoke. Entering or leaving a mode
// reloads the page, so one read per load is the whole of what this needs.
//
// THAT LAST PART ONLY WORKS BECAUSE SETTINGS AND THE CHAT ARE NEVER ON SCREEN
// AT THE SAME TIME. This is a module-level `let`, not state — writing it cannot
// re-render a button that is already mounted. Flipping the switch takes hold
// only because the top-level screen chain is one mutually exclusive ternary:
// opening Settings unmounts the whole chat tree, and every speak button reads
// this again on the way back. Give Settings a modal overlay, or keep the chat
// mounted behind it, and the buttons already on screen keep whatever value they
// were born with — the server side of the ceiling still holds, but in the
// browser Speaking quietly stops being switchable and nothing looks broken.
// Anyone making that change has to turn this into state the buttons subscribe
// to first.
let speakingOn: boolean | null = null;
let speakingRead: Promise<boolean> | null = null;

function noteSpeakingOn(allowed: Record<string, boolean>): void {
  speakingOn = allowed.speaking === true;
}

function readSpeakingOn(): Promise<boolean> {
  if (speakingOn !== null) return Promise.resolve(speakingOn);
  if (!speakingRead) {
    speakingRead = fetchCapabilities()
      .then((result) => {
        noteSpeakingOn(result.session);
        return speakingOn === true;
      })
      .catch(() => {
        // The ceiling itself could not be read. A reply can only be on screen
        // because the server answered, so this is a passing failure rather than
        // a switched-off machine — the answer is not remembered, and the next
        // press asks again.
        speakingRead = null;
        return true;
      });
  }
  return speakingRead;
}

// THE speech element ("同类功能必须统一", Oskar 2026-07-28): every spoken
// thing in the app goes through this one control — replaying an Owner voice
// recording, reading any reply aloud on tap, and the automatic read-out of a
// voice conversation (autoStart). Play ↔ pause on the main control (pause
// keeps the position), a stop button alongside while anything is in flight.
// TTS plays sentence-first: the opening sentence starts while the rest still
// generates, and autoStart reuses the clip prewarmed during streaming. One
// voice at a time — starting any playback silences whatever else is talking.
function SpeakButton({
  audioId,
  autoStart = false,
  className,
  engine = "browser",
  onAutoConsumed,
  prewarm,
  text,
}: {
  audioId?: string | null;
  autoStart?: boolean;
  className?: string;
  engine?: "none" | "browser" | "gemini" | "local";
  onAutoConsumed?: () => void;
  prewarm?: SpeechPrewarm | null;
  text: string;
}) {
  const { lang } = useI18n();
  const [state, setState] = useState<
    "idle" | "loading" | "playing" | "paused"
  >("idle");
  // Playing back a recording the Owner made is not Vaenyx speaking, so only
  // the synthesised paths sit under the Speaking switch — the clip is the
  // Owner's own voice and belongs to Hearing's side of the app.
  const synthesises = !audioId;
  // Seeded from what this page already knows, so only the very first button of
  // a session can appear for the instant before the answer arrives; every
  // reply after that is drawn right the first time.
  const [muted, setMuted] = useState(
    () => synthesises && speakingOn === false,
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // The clips to play in order (a recording is one clip; TTS is 1-2 sentence
  // chunks), synthesis already in flight. Built once, then replayable.
  const pendingRef = useRef<Promise<{ audioId: string }>[] | null>(null);
  const indexRef = useRef(0);
  // Bumped on stop/unmount so an in-flight chunk advance goes quiet.
  const sessionRef = useRef(0);
  // False until the element carries a real clip — the silent autoplay-unlock
  // blip must not chain into "play the next chunk" when it ends.
  const clipLoadedRef = useRef(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const autoConsumedRef = useRef(false);

  useEffect(
    () => () => {
      sessionRef.current += 1;
      audioRef.current?.pause();
      if (utteranceRef.current) {
        try {
          window.speechSynthesis?.cancel();
        } catch {
          // No TTS.
        }
      }
    },
    [],
  );

  // Ask the ceiling once, on mount, so a button that may not speak is never
  // drawn in the first place. The read is shared and cached, so a page full of
  // replies costs one request.
  useEffect(() => {
    if (!synthesises) return;
    let alive = true;
    void readSpeakingOn().then((allowed) => {
      if (alive) setMuted(!allowed);
    });
    return () => {
      alive = false;
    };
  }, [synthesises]);

  async function playChunk(
    audio: HTMLAudioElement,
    index: number,
    session: number,
  ) {
    const request = pendingRef.current?.[index];
    if (!request) {
      indexRef.current = 0;
      setState("idle");
      return;
    }
    try {
      const { audioId: clipId } = await request;
      if (sessionRef.current !== session) return;
      // Someone else started talking while this chunk generated — stay quiet.
      if (currentReplyAudio !== null && currentReplyAudio !== audio) {
        setState((current) => (current === "loading" ? "idle" : current));
        return;
      }
      indexRef.current = index;
      clipLoadedRef.current = true;
      audio.src = `/v1/voice/audio/${clipId}`;
      audio.currentTime = 0;
      currentReplyAudio = audio;
      await audio.play();
      setState("playing");
    } catch {
      if (sessionRef.current === session) setState("idle");
    }
  }

  async function play() {
    // 🔴 The switch, asked before EITHER text-to-speech path and before
    // anything else happens — a refused play must not silence whatever else is
    // talking. Normally the mount read has already settled and this button is
    // not on screen at all; this is the narrow case where autoStart fires
    // first, and it says why out loud rather than going quiet (the same rule
    // the photo button follows a few hundred lines up).
    if (synthesises && !(await readSpeakingOn())) {
      setMuted(true);
      setState("idle");
      showErrorToast(
        // Two different reasons land here — the instance switch, or the mode
        // narrowing it — and only one of them can be acted on from Settings.
        // Sending somebody inside a mode to a screen that refuses them is worse
        // than saying nothing, so the sentence names both doors.
        lang === "zh"
          ? "「念」现在是关的,所以 Vaenyx 没有念出来。在 AI Settings → Capabilities 把这一行打开;如果你正在某个模式里,要先退出那个模式。"
          : "Speaking is off, so Vaenyx did not read that out. Turn the Speaking row back on under AI Settings → Capabilities — and if you are inside a mode, leave the mode first.",
      );
      return;
    }
    stopReplySpeech();
    const session = (sessionRef.current += 1);
    try {
      if (!audioId && engine !== "gemini" && engine !== "local") {
        // Device TTS path, with pause/resume support.
        if (!("speechSynthesis" in window)) return;
        const clean = cleanSpeechText(text);
        if (!clean) return;
        const utterance = new SpeechSynthesisUtterance(clean.slice(0, 4000));
        utterance.lang = /[一-鿿]/.test(clean) ? "zh-CN" : "en-US";
        utterance.onend = () => {
          utteranceRef.current = null;
          setState("idle");
        };
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        setState("playing");
        return;
      }
      if (!pendingRef.current) {
        if (audioId) {
          pendingRef.current = [Promise.resolve({ audioId })];
        } else {
          const clean = cleanSpeechText(text).slice(0, 4000);
          if (!clean) return;
          setState("loading");
          pendingRef.current = splitForSpeech(clean).map((chunk, index) =>
            index === 0 && prewarm && prewarm.text === chunk
              ? prewarm.promise
              : synthesizeSpeech(chunk),
          );
          pendingRef.current.forEach((request) =>
            request.catch(() => undefined),
          );
        }
      }
      // Reuse the tap-blessed element when one exists (mobile autoplay): the
      // blip consumes the tap so a clip may start after seconds of synthesis,
      // and chaining chunks through the same element keeps the blessing.
      let audio = audioRef.current;
      if (!audio) {
        const created = new Audio(SILENT_WAV);
        void created.play().catch(() => undefined);
        created.onended = () => {
          if (!clipLoadedRef.current) return;
          void playChunk(created, indexRef.current + 1, sessionRef.current);
        };
        // A global stop (another playback starting) pauses us mid-flight —
        // show that as paused so Resume works naturally.
        created.onpause = () => {
          if (!created.ended) {
            setState((current) =>
              current === "playing" ? "paused" : current,
            );
          }
        };
        audioRef.current = created;
        audio = created;
      }
      await playChunk(audio, 0, session);
    } catch {
      setState("idle");
    }
  }

  function pause() {
    if (utteranceRef.current) {
      try {
        window.speechSynthesis?.pause();
      } catch {
        // No TTS.
      }
      setState("paused");
      return;
    }
    audioRef.current?.pause();
    setState("paused");
  }

  async function resume() {
    if (utteranceRef.current) {
      try {
        window.speechSynthesis?.resume();
      } catch {
        // No TTS.
      }
      setState("playing");
      return;
    }
    try {
      const audio = audioRef.current;
      if (!audio) return;
      stopReplySpeech();
      sessionRef.current += 1;
      currentReplyAudio = audio;
      await audio.play();
      setState("playing");
    } catch {
      setState("idle");
    }
  }

  function stop() {
    sessionRef.current += 1;
    if (utteranceRef.current) {
      try {
        window.speechSynthesis?.cancel();
      } catch {
        // No TTS.
      }
      utteranceRef.current = null;
    }
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    indexRef.current = 0;
    setState("idle");
  }

  // A voice conversation answers aloud by itself: the finished reply's own
  // button starts playing, so pausing or stopping it is the same gesture as
  // for any other message. Consumed exactly once per reply.
  useEffect(() => {
    if (!autoStart || autoConsumedRef.current) return;
    autoConsumedRef.current = true;
    onAutoConsumed?.();
    void play();
  }, [autoStart]);

  // Switched off, the button is not there — which is honest, where a button
  // that answers a tap with silence is not. Replaying a recording is untouched,
  // so an Owner voice message still has its play button with Speaking off.
  if (synthesises && muted) return null;

  return (
    <span className={className ? `speak-button ${className}` : "speak-button"}>
      <button
        aria-label={
          state === "playing"
            ? "Pause"
            : state === "paused"
              ? "Resume"
              : "Play as speech"
        }
        className="voice-bubble-play"
        disabled={state === "loading"}
        onClick={() => {
          if (state === "playing") pause();
          else if (state === "paused") void resume();
          else void play();
        }}
        type="button"
      >
        {state === "loading" ? (
          <IconSpinner />
        ) : state === "playing" ? (
          <IconPause />
        ) : (
          <IconPlay />
        )}
      </button>
      {state === "playing" || state === "paused" ? (
        <button
          aria-label="Stop"
          className="voice-bubble-play voice-bubble-stop"
          onClick={stop}
          type="button"
        >
          <IconStop />
        </button>
      ) : null}
    </span>
  );
}

// Read a finished reply aloud (Voice replies, dev.133). Markdown chrome is
// stripped first — nobody wants to hear "asterisk asterisk".
const VOICE_REPLIES_KEY = "vaenyx.voiceReplies";

function voiceRepliesEnabled(): boolean {
  try {
    return window.localStorage.getItem(VOICE_REPLIES_KEY) === "1";
  } catch {
    return false;
  }
}

function cleanSpeechText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_#>`~|]/g, "")
    .trim();
}

// One reply speaks at a time: starting a new playback (or flipping the toggle
// off) silences whatever is still talking — TTS audio and device speech both.
let currentReplyAudio: HTMLAudioElement | null = null;

function stopReplySpeech(): void {
  currentReplyAudio?.pause();
  currentReplyAudio = null;
  try {
    window.speechSynthesis?.cancel();
  } catch {
    // No TTS on this device.
  }
}

// Leaving the app pauses whatever is talking (Oskar, 2026-07-27): backgrounding
// the browser kept the voice going. Pause rather than stop — the element keeps
// its position, so coming back and tapping play resumes where it left off.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) return;
    currentReplyAudio?.pause();
    try {
      window.speechSynthesis?.pause();
    } catch {
      // No TTS on this device.
    }
  });
}

// Split for sentence-first playback: the opening sentence is generated (and
// starts playing) on its own while the rest generates in parallel. The same
// helper drives the mid-stream prewarm, so the prewarmed chunk always matches
// what playback asks for.
function firstSpeechChunk(
  text: string,
): { first: string; rest: string } | null {
  const boundary = /[。!?.!?;;\n]/g;
  let match: RegExpExecArray | null = boundary.exec(text);
  while (match) {
    if (match.index >= 12) {
      return {
        first: text.slice(0, match.index + 1).trim(),
        rest: text.slice(match.index + 1).trim(),
      };
    }
    match = boundary.exec(text);
  }
  return null;
}

function splitForSpeech(text: string): string[] {
  const split = firstSpeechChunk(text);
  if (!split) return [text];
  return split.rest ? [split.first, split.rest] : [split.first];
}

// A first-sentence synthesis started while the reply was still streaming.
interface SpeechPrewarm {
  text: string;
  promise: Promise<{ audioId: string }>;
}

// Attach a document ("Document Reading", Oskar 2026-07-29): one button for
// PDF, plain text and Word/Excel/PowerPoint — the server sorts kinds by
// content, never by name. The upload happens on pick so a PDF's REAL page
// count is known before anything is spent — that number is what the M1 cost
// gate names. Every refusal (too big, too many pages, password-protected,
// old Office format, unreadable) comes back from the server in words the
// Owner can act on.
interface PickedDocument {
  documentId: string;
  name: string;
  pages: number;
  needsCostGate: boolean;
}

function DocumentButton({
  disabled,
  onPicked,
}: {
  disabled?: boolean;
  onPicked: (document: PickedDocument) => void;
}) {
  const { lang, t } = useI18n();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <input
        accept="application/pdf,.pdf,.txt,.md,.markdown,text/plain,text/markdown,.docx,.xlsx,.pptx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setBusy(true);
          void uploadDocument(file, lang)
            .then(onPicked)
            .catch(() => {
              // uploadDocument already raised the toast with the reason.
            })
            .finally(() => setBusy(false));
        }}
        ref={inputRef}
        type="file"
      />
      <button
        aria-label={t("document.add")}
        className={`mic-button${busy ? " mic-button--busy" : ""}`}
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        title={t("document.add")}
        type="button"
      >
        {busy ? <IconSpinner /> : <IconDocument />}
      </button>
    </>
  );
}

// Push-to-talk mic: tap to record, tap again to stop; the utterance goes to the
// local server, which forwards it to the connected voice engine (Groq Whisper)
// and hands back text. Rendered only when a voice connection exists.
// THE COMPOSER'S TOOLS — camera, picture, document, microphone — as ONE unit
// used by every composer there is: a new chat, an open chat, a task (Oskar,
// 2026-07-30). They were written out three times, and every time something new
// arrived one of the three missed it: the task screen had nothing but Send for
// months, and a new chat had no document button until today. A button added
// here appears everywhere by construction.
//
// Folded behind ONE "+" on every screen (Oskar, 2026-08-06 — previously only
// on phones): the tools open UPWARD over the conversation, so the message box
// keeps its size whether two tools exist or five.
function ComposerTools({
  canAttachPhoto = true,
  disabled,
  lang,
  onDocument,
  onPhoto,
  onPhotoPreview,
  onSpoken,
  onTranscribed,
  onUploadStart,
  showCamera,
  showMic,
}: {
  canAttachPhoto?: boolean;
  disabled: boolean;
  lang: string;
  onDocument: (picked: PickedDocument) => void;
  onPhoto: (imageId: string) => void;
  onPhotoPreview: (url: string) => void;
  onSpoken: (text: string, audioId?: string) => void;
  onTranscribed: (text: string) => void;
  onUploadStart: (upload: Promise<string>) => void;
  showCamera: boolean;
  showMic: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span className="composer-tools" data-open={open ? "true" : "false"}>
      <button
        aria-expanded={open}
        aria-label={open ? "Fewer options" : "More options"}
        className="composer-tools-toggle"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <LineIcon>
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M12 5v14M5 12h14" />
          )}
        </LineIcon>
      </button>
      <span className="composer-tools-row">
        {showCamera ? (
          <CameraButton
            disabled={disabled}
            lang={lang}
            onAttach={canAttachPhoto ? onPhoto : undefined}
            onPreview={canAttachPhoto ? onPhotoPreview : undefined}
            onText={onTranscribed}
            onUploadStart={canAttachPhoto ? onUploadStart : undefined}
          />
        ) : null}
        <DocumentButton disabled={disabled} onPicked={onDocument} />
        {showMic ? (
          <MicButton disabled={disabled} onText={onSpoken} />
        ) : null}
      </span>
    </span>
  );
}

// THE COMPOSER. One of them, for every place a message is written: a new chat,
// an open chat, a task (Oskar, 2026-07-30 — "必须统一三种情况成为同一种东西").
// Three hand-written copies is what left the task screen with nothing but Send
// for months and a new chat with no document button until this morning; a
// fourth report was guaranteed while three copies existed.
//
// What genuinely differs between the three is passed in — which box the text
// lives in, what Submit is called, what happens on send, and whatever belongs
// under the box (model pickers, disclaimers) as children. Everything else —
// the attachment trays, the tools, Enter-to-send, Stop, the rule that a photo
// or a PDF alone is a whole message — exists once.
function Composer({
  attachDisabled = false,
  boxClassName = "ask-vaenyx-composer-box",
  busy,
  children,
  documentTray,
  lang,
  onDocument,
  onPhoto,
  onPhotoPreview,
  onRemoveDocument,
  onRemovePhoto,
  onSpoken,
  onStop,
  onSubmit,
  onTranscribed,
  onUploadStart,
  photoTray,
  placeholder,
  showCamera,
  showMic,
  submitLabel,
  value,
  onValueChange,
}: {
  attachDisabled?: boolean;
  /** The new-chat panel has a taller box of its own; everything else matches. */
  boxClassName?: string;
  busy: boolean;
  children?: React.ReactNode;
  documentTray: { name: string } | null;
  lang: string;
  onDocument: (picked: PickedDocument) => void;
  onPhoto: (imageId: string) => void;
  onPhotoPreview: (url: string) => void;
  onRemoveDocument: () => void;
  onRemovePhoto: () => void;
  onSpoken: (text: string, audioId?: string) => void;
  onStop: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTranscribed: (text: string) => void;
  onUploadStart: (upload: Promise<string>) => void;
  photoTray: string | null;
  placeholder: string;
  showCamera: boolean;
  showMic: boolean;
  submitLabel: string;
  value: string;
  onValueChange: (next: string) => void;
}) {
  // A photo or a PDF on its own is a complete message, everywhere.
  const hasAttachment = Boolean(photoTray || documentTray);

  // The <form> stays with the caller: the new-chat panel is already a form of
  // its own with a heading above the box, and a form inside a form is invalid.
  return (
    <>
      {documentTray ? (
        <div className="composer-attachment">
          <span className="composer-document-name">{documentTray.name}</span>
          <button
            aria-label="Remove document"
            className="composer-attachment-remove"
            onClick={onRemoveDocument}
            type="button"
          >
            <IconX />
          </button>
        </div>
      ) : null}
      {photoTray ? (
        <div className="composer-attachment">
          <img alt="" src={photoTray} />
          <button
            aria-label="Remove photo"
            className="composer-attachment-remove"
            onClick={onRemovePhoto}
            type="button"
          >
            <IconX />
          </button>
        </div>
      ) : null}
      <div className={boxClassName}>
        <textarea
          maxLength={10_000}
          onChange={(event) => onValueChange(event.target.value)}
          // Enter sends, Shift+Enter makes a new line — the convention every
          // chat app uses. IME composition (Chinese/Japanese input) must be
          // ignored: mid-composition Enter picks a candidate word and would
          // otherwise fire off a half-typed message.
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              if (!busy && (value.trim() || hasAttachment)) {
                onSubmit(event as unknown as FormEvent<HTMLFormElement>);
              }
            }
          }}
          placeholder={placeholder}
          required={!hasAttachment}
          rows={2}
          value={value}
        />
        <ComposerTools
          canAttachPhoto={!attachDisabled}
          disabled={busy}
          lang={lang}
          onDocument={onDocument}
          onPhoto={onPhoto}
          onPhotoPreview={onPhotoPreview}
          onSpoken={onSpoken}
          onTranscribed={onTranscribed}
          onUploadStart={onUploadStart}
          showCamera={showCamera}
          showMic={showMic}
        />
        {busy ? (
          <button
            className="primary-button stop-button"
            onClick={onStop}
            type="button"
          >
            Stop
          </button>
        ) : (
          <button
            className="primary-button"
            disabled={!value.trim() && !hasAttachment}
            type="submit"
          >
            {submitLabel}
          </button>
        )}
      </div>
      {children}
    </>
  );
}

function MicButton({
  disabled,
  onText,
}: {
  disabled?: boolean;
  onText: (text: string, audioId: string) => void;
}) {
  // Only for the refusal the server may send back: a recording has no
  // language of its own until it has been transcribed.
  const { lang } = useI18n();
  const [state, setState] = useState<"idle" | "recording" | "busy">("idle");
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  // Cancel throws the take away: onstop sees the flag and transcribes nothing.
  const discardRef = useRef(false);
  // Live volume meter (ChatGPT-style): an analyser drives the bar heights
  // directly via refs — no re-render per animation frame.
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number>(0);

  const supported =
    typeof MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia);
  if (!supported) return null;

  function startMeter(stream: MediaStream) {
    try {
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) {
          const deviation = (sample - 128) / 128;
          sum += deviation * deviation;
        }
        const level = Math.min(1, Math.sqrt(sum / samples.length) * 4);
        barRefs.current.forEach((bar, index) => {
          if (!bar) return;
          // Slightly different response per bar so it reads as a waveform.
          const wobble = 0.65 + 0.35 * Math.sin(Date.now() / 90 + index * 1.7);
          const height = 0.18 + level * wobble * 0.82;
          bar.style.transform = `scaleY(${height.toFixed(3)})`;
        });
        animationRef.current = requestAnimationFrame(tick);
      };
      animationRef.current = requestAnimationFrame(tick);
    } catch {
      // No meter — recording still works.
    }
  }

  function stopMeter() {
    cancelAnimationFrame(animationRef.current);
    void audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
  }

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm", "audio/mp4", "audio/ogg"].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stopMeter();
        stream.getTracks().forEach((track) => track.stop());
        if (discardRef.current) {
          discardRef.current = false;
          chunksRef.current = [];
          setState("idle");
          return;
        }
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        setState("busy");
        void transcribeAudio(blob, lang)
          .then(({ text, audioId }) => {
            if (text) onText(text, audioId);
            setState("idle");
          })
          .catch((nextError) => {
            setError(
              nextError instanceof Error
                ? nextError.message
                : "Transcription failed.",
            );
            setState("idle");
          });
      };
      recorderRef.current = recorder;
      discardRef.current = false;
      recorder.start();
      startMeter(stream);
      setState("recording");
    } catch {
      setError("Microphone blocked — allow it in the browser settings.");
      setState("idle");
    }
  }

  function stop(discard: boolean) {
    discardRef.current = discard;
    recorderRef.current?.stop();
    recorderRef.current = null;
  }

  if (state === "recording") {
    return (
      <span className="mic-record-group">
        <button
          aria-label="Cancel recording"
          className="mic-button mic-button--cancel"
          onClick={() => stop(true)}
          title="Cancel"
          type="button"
        >
          <IconX />
        </button>
        <span aria-hidden="true" className="mic-bars">
          {[0, 1, 2, 3, 4].map((index) => (
            <span
              key={index}
              ref={(element) => {
                barRefs.current[index] = element;
              }}
            />
          ))}
        </span>
        <button
          aria-label="Send recording"
          className="mic-button mic-button--recording"
          onClick={() => stop(false)}
          title="Send"
          type="button"
        >
          <IconCheck />
        </button>
      </span>
    );
  }

  return (
    <button
      aria-label="Voice input"
      className={`mic-button mic-button--${state}`}
      disabled={disabled || state === "busy"}
      onClick={() => void start()}
      title={error ?? "Voice input"}
      type="button"
    >
      {state === "busy" ? <IconSpinner /> : <IconMic />}
    </button>
  );
}

// A 4-sample silent WAV: played inside the tap so the same element may make
// real sound after a seconds-long TTS generation (mobile autoplay rules).
const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQQAAAAAAAAA";

const GEMINI_TTS_VOICES = [
  { id: "Kore", label: "Kore (Recommended)" },
  { id: "Leda", label: "Leda" },
  { id: "Puck", label: "Puck" },
  { id: "Zephyr", label: "Zephyr" },
  { id: "Charon", label: "Charon" },
  { id: "Aoede", label: "Aoede" },
];

// The Tools page (its own settings tab, Oskar 2026-07-29): what Vaenyx can do
// beyond chat — built-in tools that are always on, and what may come next.
// Hearing, speaking and pictures are switched on and set up on their own rows
// in AI Settings → Capabilities; this page is the map, the suggestion channel,
// and the safety line: tools ship only from Vaenyx, and community content can
// only NAME tools from this list, never bring its own.
function ToolsPanel() {
  return (
    <section className="settings-card" id="tools">
      <p className="eyebrow">App</p>
      <h2>Tools</h2>
      <p className="settings-card-copy">
        What Vaenyx can do beyond chat. Built-in tools are always on and never
        leave this machine. Hearing, speaking and pictures are set up on their
        own rows under AI Settings → Capabilities.
      </p>

      <section className="engine-section">
        <h3 className="settings-subhead">Built-In</h3>
        <div className="engine-row">
          <p className="settings-card-copy" style={{ margin: 0, flex: 1 }}>
            Photo Marks — dots and names on any photo; rename, add or remove
            them yourself.
          </p>
          <span className="library-chip chip-published">Always On</span>
        </div>
        <div className="engine-row">
          <p className="settings-card-copy" style={{ margin: 0, flex: 1 }}>
            Photo Viewer — tap any photo to open it full screen and zoom.
          </p>
          <span className="library-chip chip-published">Always On</span>
        </div>
        <div className="engine-row">
          <p className="settings-card-copy" style={{ margin: 0, flex: 1 }}>
            Spoken Replies — any reply or result read aloud from its own
            speaker button.
          </p>
          <span className="library-chip chip-published">Always On</span>
        </div>
        <div className="engine-row">
          <p className="settings-card-copy" style={{ margin: 0, flex: 1 }}>
            Document Reading — send a PDF the way you send a photo. A long
            document costs real money on your own model connection, so Vaenyx
            shows you its page count and asks first.
          </p>
          <span className="library-chip chip-published">Always On</span>
        </div>
      </section>

      <section className="engine-section">
        <h3 className="settings-subhead">Coming Soon</h3>
        {[
          "Calendar & Reminders — Routines that know your family's schedule.",
          "Web Page Reading — hand Vaenyx a link instead of pasting text.",
          "Weather — local conditions for planning Routines.",
          "Smart Home — read and act on devices you approve, one by one.",
        ].map((line) => (
          <div className="engine-row" key={line}>
            <p className="settings-card-copy" style={{ margin: 0, flex: 1 }}>
              {line}
            </p>
            <span className="library-chip">Coming Soon</span>
          </div>
        ))}
        <p className="settings-card-copy text-faint">
          Every new tool is built and reviewed by Vaenyx — Routines and
          Community content can only use tools from this list, never bring
          their own. That is the household safety line.
        </p>
      </section>

      <p className="settings-card-copy text-faint">
        Missing a tool you need? Suggest it on{" "}
        <a href="https://vaenyx.ai/discord" rel="noopener" target="_blank">
          Discord
        </a>{" "}
        or email <a href="mailto:hello@vaenyx.ai">hello@vaenyx.ai</a>.
      </p>
    </section>
  );
}

// Web Push subscribe helper: the VAPID public key arrives base64url-encoded and
// PushManager.subscribe wants raw bytes.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  // Explicit ArrayBuffer (not ArrayBufferLike): PushManager.subscribe rejects
  // the SharedArrayBuffer-typed generic under current TS DOM typings.
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

// App-level rule (Oskar, dev.170): the system permission IS the consent —
// once notifications are allowed for this site, the device keeps itself
// subscribed. The only extra state is an explicit per-device opt-out.
const PUSH_OPTOUT_KEY = "vaenyx.pushOptOut";

async function healPushSubscription(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }
  try {
    if (window.localStorage.getItem(PUSH_OPTOUT_KEY) === "1") return false;
  } catch {
    return false;
  }
  if (Notification.permission !== "granted") return false;
  try {
    const registration = await pushWorkerReady();
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const { key } = await fetchPushPublicKey();
      if (!key) return false;
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
    }
    const json = subscription.toJSON() as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return false;
    // Always re-sync to the server: this also repairs a server-side prune
    // while the browser still held a valid subscription.
    await subscribePush({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    });
    return true;
  } catch {
    return false;
  }
}

// Wait for a controlling service worker, but never forever: an unready worker
// used to leave the enable button spinning with no message at all.
async function pushWorkerReady(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  return await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_resolve, reject) => {
      window.setTimeout(() => reject(new Error("SW_TIMEOUT")), 6000);
    }),
  ]);
}

// Settings → Notifications: per-device on/off, how many devices are
// subscribed, a Send Test button that bypasses the presence gate, and the
// last send's outcome — everything needed to SEE why a push did or didn't go.
function NotificationsPanel() {
  const [supported] = useState(
    () =>
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window,
  );
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<PushDiagnostics | null>(null);
  const [testNote, setTestNote] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<PushPrefs | null>(null);

  useEffect(() => {
    void fetchPushPrefs()
      .then(setPrefs)
      .catch(() => undefined);
  }, []);

  function reloadDiagnostics() {
    void fetchPushStatus()
      .then(setDiagnostics)
      .catch(() => undefined);
  }

  useEffect(() => {
    reloadDiagnostics();
    if (!supported) return;
    // Repair first (the browser may have silently dropped the subscription),
    // then show the true state — and when repair is impossible, say WHY
    // instead of quietly showing Off (Oskar, dev.169: it kept turning off).
    void (async () => {
      await healPushSubscription().catch(() => false);
      const registration = await pushWorkerReady().catch(() => null);
      const subscription = registration
        ? await registration.pushManager.getSubscription().catch(() => null)
        : null;
      setEnabled(Boolean(subscription));
      reloadDiagnostics();
      let optedOut = false;
      try {
        optedOut = window.localStorage.getItem(PUSH_OPTOUT_KEY) === "1";
      } catch {
        // Best-effort.
      }
      if (!optedOut && !subscription) {
        if (Notification.permission === "denied") {
          const reason =
            "The browser or system has BLOCKED notifications for this site — re-allow them in the system settings, then reopen this page.";
          setError(reason);
          showErrorToast(reason);
        } else if (Notification.permission === "granted") {
          const reason =
            "Notifications are allowed, but the subscription could not be repaired automatically — press Turn On again.";
          setError(reason);
          showErrorToast(reason);
        }
        // "default" = never asked yet: just show the Turn On button quietly.
      }
    })();
  }, [supported]);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      if (Notification.permission === "denied") {
        setError(
          "Notifications are blocked for this site in the browser/system settings — allow them there, then try again.",
        );
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Permission was not granted — nothing was enabled.");
        return;
      }
      const { key } = await fetchPushPublicKey();
      if (!key) {
        setError("The server has no push key yet — try again in a moment.");
        return;
      }
      const registration = await pushWorkerReady();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      const json = subscription.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
        throw new Error("PUSH_SUBSCRIPTION_INCOMPLETE");
      }
      await subscribePush({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
      try {
        window.localStorage.removeItem(PUSH_OPTOUT_KEY);
      } catch {
        // Best-effort.
      }
      setEnabled(true);
      reloadDiagnostics();
    } catch (nextError) {
      setError(
        nextError instanceof Error && nextError.message === "SW_TIMEOUT"
          ? "The notification worker is not ready. Refresh the page and try again — on iPhone, Vaenyx must be opened from the Home Screen icon."
          : "Could not enable notifications on this device.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const registration = await pushWorkerReady();
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribePush(subscription.endpoint).catch(() => undefined);
        await subscription.unsubscribe();
      }
      try {
        window.localStorage.setItem(PUSH_OPTOUT_KEY, "1");
      } catch {
        // Best-effort.
      }
      setEnabled(false);
      reloadDiagnostics();
    } catch {
      setError("Could not turn notifications off on this device.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setTestNote(null);
    try {
      const result = await sendTestPush();
      setDiagnostics(result);
      setTestNote(
        result.subscriptions === 0
          ? "No devices are subscribed yet — turn notifications on below first."
          : "Test sent — the notification should arrive within seconds (this device included).",
      );
    } catch {
      setTestNote("Could not send the test.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="settings-card">
      <p className="eyebrow">Notifications</p>
      <h2>Notifications</h2>
      <p className="settings-card-copy">
        Vaenyx pushes a notification when something stays unseen for ~30
        seconds — while any device is viewing the app, it stays quiet. Once a
        device's system permission is granted, it keeps itself subscribed.
        iPhone: add Vaenyx to the Home Screen first and open it from there.
      </p>

      <h3 className="settings-subhead">What Gets Pushed</h3>
      <p className="settings-card-copy">
        App-wide choices — they apply to every device at once.
      </p>
      {(
        [
          ["chat", "Chat Replies"],
          ["scheduled", "Scheduled Task Results"],
          ["mode", "Mode Alerts (Blocked Actions)"],
        ] as const
      ).map(([key, label]) => (
        <label className="modes-toggle" key={key}>
          <input
            checked={prefs?.[key] ?? true}
            disabled={!prefs}
            onChange={(event) => {
              const next = {
                chat: prefs?.chat ?? true,
                scheduled: prefs?.scheduled ?? true,
                mode: prefs?.mode ?? true,
                [key]: event.target.checked,
              };
              setPrefs(next);
              void updatePushPrefs(next).then(setPrefs).catch(() => undefined);
            }}
            type="checkbox"
          />
          {label}
        </label>
      ))}

      <div className="settings-card-divider" />

      <div className="model-card-head">
        <strong>This Device</strong>
        <span
          className={enabled ? "library-chip chip-published" : "library-chip"}
        >
          {enabled ? "On" : "Off"}
        </span>
      </div>
      {!supported ? (
        <p className="settings-card-copy">
          This browser does not support push notifications.
        </p>
      ) : (
        <div className="model-card-actions">
          <button
            className="secondary-button"
            disabled={busy}
            onClick={() => void (enabled ? disable() : enable())}
            type="button"
          >
            {busy
              ? "Working…"
              : enabled
                ? "Turn Off On This Device"
                : "Turn On For This Device"}
          </button>
        </div>
      )}
      {error ? <p className="form-error">{error}</p> : null}

      <div className="settings-card-divider" />

      <h3 className="settings-subhead">Check It Works</h3>
      <p className="settings-card-copy">
        Subscribed devices: <strong>{diagnostics?.subscriptions ?? "…"}</strong>
        {diagnostics?.lastResult ? (
          <>
            <br />
            Last send: {diagnostics.lastResult}
          </>
        ) : null}
      </p>
      <div className="model-card-actions">
        <button
          className="secondary-button"
          disabled={busy}
          onClick={() => void sendTest()}
          type="button"
        >
          Send Test Notification
        </button>
      </div>
      {testNote ? <p className="settings-card-copy">{testNote}</p> : null}
    </section>
  );
}

// A searchable checkbox list of Library Methods, shared by the create picker and
// the edit dialog so the two stay identical. By default only already-selected
// methods are shown (the full list can be huge); typing a query reveals matching
// methods — selected or not — so more can be ticked without scrolling everything.
function MethodToggleList({
  methods,
  selected,
  onToggle,
}: {
  methods: LibraryMethodSummary[];
  selected: string[];
  onToggle: (methodId: string) => void;
}) {
  const [query, setQuery] = useState("");

  if (methods.length === 0) {
    return <p className="library-note">No methods in the Library yet.</p>;
  }

  const trimmed = query.trim().toLowerCase();
  const selectedSet = new Set(selected);
  const sorted = [...methods].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  const visible = trimmed
    ? sorted.filter(
        (method) =>
          method.name.toLowerCase().includes(trimmed) ||
          method.description.toLowerCase().includes(trimmed) ||
          method.tags.some((tag) => tag.toLowerCase().includes(trimmed)),
      )
    : sorted.filter((method) => selectedSet.has(method.id));

  return (
    <div className="method-toggle">
      <input
        className="method-toggle-search"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search methods by name or #tag to add…"
        type="search"
        value={query}
      />
      <p className="library-note method-toggle-hint">
        {trimmed
          ? `${visible.length} match${visible.length === 1 ? "" : "es"}`
          : `${selected.length} method${
              selected.length === 1 ? "" : "s"
            } selected — search to add more`}
      </p>
      <div className="method-toggle-list">
        {visible.length === 0 ? (
          <p className="library-note">
            {trimmed
              ? "No methods match your search."
              : "No methods selected yet — search above to add some."}
          </p>
        ) : (
          visible.map((method) => (
            <label className="skill-check" key={method.id}>
              <input
                checked={selectedSet.has(method.id)}
                onChange={() => onToggle(method.id)}
                type="checkbox"
              />
              <span>
                <strong>{method.name}</strong>
                <small>{method.description}</small>
                {method.tags.length > 0 ? (
                  <span className="tag-row">
                    {method.tags.map((tag) => (
                      <span className="tag-chip" key={tag}>
                        #{tag}
                      </span>
                    ))}
                  </span>
                ) : null}
              </span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

// Modal picker the Create form opens instead of listing every Method inline
// (the list gets long). Returns the chosen ids when the Owner taps Done.
function MethodPickerModal({
  methods,
  initialSelected,
  onClose,
  onConfirm,
}: {
  methods: LibraryMethodSummary[];
  initialSelected: string[];
  onClose: () => void;
  onConfirm: (selected: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(initialSelected);

  function toggle(methodId: string) {
    setSelected((current) =>
      current.includes(methodId)
        ? current.filter((id) => id !== methodId)
        : [...current, methodId],
    );
  }

  return (
    <Modal onClose={onClose} title="Choose Methods">
      <p className="settings-card-copy">
        Tick the Methods this app may use. You can change this any time.
      </p>
      <MethodToggleList methods={methods} onToggle={toggle} selected={selected} />
      <div className="modal-actions">
        <button className="text-button" onClick={onClose} type="button">
          Cancel
        </button>
        <button
          className="primary-button"
          onClick={() => onConfirm(selected)}
          type="button"
        >
          Done ({selected.length})
        </button>
      </div>
    </Modal>
  );
}

// Edit an existing Token. The token (identity) and its kind never change — only
// what it grants: a Routine Token swaps its routine, a Method Token edits its
// methods + fetch-recipe.
function EditAppProfileModal({
  profile,
  methods,
  routines,
  onClose,
  onSaved,
}: {
  profile: AppProfile;
  methods: LibraryMethodSummary[];
  routines: LibraryRoutineSummary[];
  onClose: () => void;
  onSaved: (profile: AppProfile) => void;
}) {
  const { t } = useI18n();
  const isRoutine = profile.kind === "routine";
  const [selected, setSelected] = useState<string[]>(profile.allowedMethodIds);
  const [fetchRecipe, setFetchRecipe] = useState(profile.fetchRecipe);
  const [sendFeedback, setSendFeedback] = useState(profile.sendFeedback);
  const [routineId, setRoutineId] = useState(
    profile.allowedRoutineId ?? routines[0]?.id ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(methodId: string) {
    setSelected((current) =>
      current.includes(methodId)
        ? current.filter((id) => id !== methodId)
        : [...current, methodId],
    );
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const { profile: updated } = await updateAppProfile(
        profile.id,
        isRoutine
          ? { allowedRoutineId: routineId }
          : { allowedMethodIds: selected, fetchRecipe, sendFeedback },
      );
      onSaved(updated);
      onClose();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not update this token.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} title={`Edit ${profile.name}`}>
      <p className="settings-card-copy">
        The token stays the same. Only what it grants changes.
      </p>
      {isRoutine ? (
        <label className="token-routine-field">
          <span className="method-picker-label">Routine</span>
          <select
            onChange={(event) => setRoutineId(event.target.value)}
            value={routineId}
          >
            {routines.map((routine) => (
              <option key={routine.id} value={routine.id}>
                {routine.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <>
          <MethodToggleList
            methods={methods}
            onToggle={toggle}
            selected={selected}
          />
          <label className="permission-check">
            <input
              checked={fetchRecipe}
              onChange={(event) => setFetchRecipe(event.target.checked)}
              type="checkbox"
            />
            <span>
              <strong>{t("apps.token.fetchRecipe.label")}</strong>
              <small>{t("apps.token.fetchRecipe.desc")}</small>
            </span>
          </label>
          <label className="permission-check">
            <input
              checked={sendFeedback}
              onChange={(event) => setSendFeedback(event.target.checked)}
              type="checkbox"
            />
            <span>
              <strong>{t("apps.token.sendFeedback.label")}</strong>
              <small>{t("apps.token.sendFeedback.desc")}</small>
              <small className="context-disclaimer">
                {t("legal.notice.methodToken.feedback")}
              </small>
            </span>
          </label>
        </>
      )}
      {error ? <p className="form-error">{error}</p> : null}
      <div className="modal-actions">
        <button className="text-button" onClick={onClose} type="button">
          Cancel
        </button>
        <button
          className="primary-button"
          disabled={
            saving || (isRoutine ? !routineId : selected.length === 0)
          }
          onClick={() => void save()}
          type="button"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </Modal>
  );
}

function AppsPanel({
  profiles,
  methods,
  routines,
  onCreate,
  onDisable,
  onUpdate,
  onDelete,
}: {
  profiles: AppProfile[];
  methods: LibraryMethodSummary[];
  routines: LibraryRoutineSummary[];
  onCreate: (result: CreateAppProfileResponse) => void;
  onDisable: (profile: AppProfile) => void;
  onUpdate: (profile: AppProfile) => void;
  onDelete: (profileId: string) => void;
}) {
  const { lang, t } = useI18n();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<AppProfileKind>("routine");
  const [routineId, setRoutineId] = useState("");
  const [allowedMethodIds, setAllowedMethodIds] = useState<string[]>([]);
  const [fetchRecipe, setFetchRecipe] = useState(false);
  // Corrections default ON: feeding the flywheel (de-identified) is the intended
  // default; the owner can opt a Token out per app.
  const [sendFeedback, setSendFeedback] = useState(true);
  // The freshly created profile's id + one-time token, so the token shows on that
  // profile's own card in the list below (not in a separate box up top).
  const [createdToken, setCreatedToken] = useState<{
    profileId: string;
    token: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState<AppProfile | null>(null);
  const [confirming, setConfirming] = useState<{
    id: string;
    action: "reset" | "disable" | "enable" | "delete";
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // WHAT ONE KEY MAY DO — the third capability layer (global ∩ what this key
  // was granted ∩ what the Method declared). One key's rows open at a time.
  const [capsFor, setCapsFor] = useState<string | null>(null);
  const [capsBusy, setCapsBusy] = useState(false);
  const [capsError, setCapsError] = useState<string | null>(null);
  // The one grant that is its own act rather than one more tick: which key, and
  // which capability is waiting for the second press.
  const [approving, setApproving] = useState<{
    profileId: string;
    capability: string;
  } | null>(null);

  // The instance's own switches, read once when this screen opens. A key's row
  // is meaningless without the ceiling it is measured against: a capability the
  // machine has switched off has to show as unavailable here rather than as a
  // tick that would quietly do nothing. The same answer also carries what a key
  // may NEVER be handed and what needs its own approval, so those two rules
  // live in one place instead of being written into this screen a second time.
  const [ceiling, setCeiling] = useState<CapabilityCeiling | null>(null);
  const [ceilingFailed, setCeilingFailed] = useState(false);
  useEffect(() => {
    let active = true;
    fetchCapabilities()
      .then((next) => {
        if (active) setCeiling(next);
      })
      .catch(() => {
        // 🔴 Failing to read the ceiling must never draw the rows anyway. Every
        // row would say "off for the whole machine" — which is a statement
        // about this machine, and it would be false.
        if (active) setCeilingFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const methodName = (id: string) =>
    methods.find((method) => method.id === id)?.name ?? id;
  const routineName = (id: string | null) =>
    routines.find((routine) => routine.id === id)?.name ?? id ?? "—";
  const capabilityNames = (ids: string[]) =>
    ids
      .map((id) => {
        const meta = capabilityMeta(id);
        if (!meta) return id;
        return lang === "zh" ? meta.name.zh : meta.name.en;
      })
      .join(lang === "zh" ? "、" : ", ");

  // One tick, sent on its own. The answer is the whole key, so the card and its
  // rows redraw from one object and cannot disagree with each other.
  async function grantCapability(
    profileId: string,
    capability: string,
    on: boolean,
    approve: string[] = [],
  ) {
    setCapsBusy(true);
    setCapsError(null);
    try {
      const { profile } = await updateAppProfileCapabilities(
        profileId,
        { [capability]: on },
        approve,
        lang,
      );
      onUpdate(profile);
      setApproving(null);
    } catch (nextError) {
      setCapsError(
        nextError instanceof Error
          ? nextError.message
          : lang === "zh"
            ? "改不了。"
            : "Could not change that.",
      );
    } finally {
      setCapsBusy(false);
    }
  }

  const canCreate =
    kind === "routine" ? routineId !== "" : allowedMethodIds.length > 0;

  async function resetToken(profileId: string) {
    setError(null);
    setBusyId(profileId);
    try {
      const result = await regenerateAppProfileToken(profileId);
      onUpdate(result.profile);
      setCreatedToken({ profileId, token: result.token });
      setConfirming(null);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not reset this token.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function disableToken(profileId: string) {
    setError(null);
    setBusyId(profileId);
    try {
      const updated = await disableAppProfile(profileId);
      onDisable(updated);
      setConfirming(null);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not disable this token.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function enableToken(profileId: string) {
    setError(null);
    setBusyId(profileId);
    try {
      const updated = await enableAppProfile(profileId);
      onUpdate(updated);
      setConfirming(null);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not re-enable this token.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deleteToken(profileId: string) {
    setError(null);
    setBusyId(profileId);
    try {
      await deleteAppProfile(profileId);
      onDelete(profileId);
      setConfirming(null);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not delete this token.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const result = await createAppProfile(
        kind === "routine"
          ? { name, kind: "routine", allowedRoutineId: routineId }
          : { name, kind: "method", allowedMethodIds, fetchRecipe, sendFeedback },
      );
      onCreate(result);
      setCreatedToken({ profileId: result.profile.id, token: result.token });
      setName("");
      setRoutineId("");
      setAllowedMethodIds([]);
      setFetchRecipe(false);
      setSendFeedback(true);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not create the token.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="apps-layout">
      <section className="app-profile-panel">
        <p className="eyebrow">New connection</p>
        <h2>Create a Token</h2>
        <p className="panel-description">
          A Token lets one external app use Vaenyx. Pick the type, then what it may
          use. Every request stays Level 0.
        </p>
        <p className="library-note">{t("apps.token.externalNote")}</p>

        <form className="app-profile-form" onSubmit={submit}>
          <label>
            Token Name
            <input
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              placeholder="My customer portal"
              required
              value={name}
            />
          </label>

          <div className="token-kind-field">
            <span className="method-picker-label">Token type</span>
            <div className="token-kind-options">
              <button
                className={`token-kind-option ${kind === "routine" ? "active" : ""}`}
                onClick={() => setKind("routine")}
                type="button"
              >
                <strong>Routine Token</strong>
                <small>
                  Pick one Routine. The app calls it as a black box and Vaenyx runs
                  the whole thing, returning the result.
                </small>
              </button>
              <button
                className={`token-kind-option ${kind === "method" ? "active" : ""}`}
                onClick={() => setKind("method")}
                type="button"
              >
                <strong>Method Token</strong>
                <small>
                  Pick one or more Methods (building blocks). The app composes and
                  runs them itself in its own code.
                </small>
              </button>
            </div>
          </div>

          {kind === "routine" ? (
            <label className="token-routine-field">
              <span className="method-picker-label">Routine</span>
              {routines.length === 0 ? (
                <p className="library-note">No routines in the Library yet.</p>
              ) : (
                <select
                  onChange={(event) => setRoutineId(event.target.value)}
                  value={routineId}
                >
                  <option value="">Choose a routine…</option>
                  {routines.map((routine) => (
                    <option key={routine.id} value={routine.id}>
                      {routine.name}
                    </option>
                  ))}
                </select>
              )}
              <small className="token-kind-hint">
                The app calls <code>POST /v1/library/routines/:id/run</code> with
                its input and gets the finished result. Nothing is stored on Vaenyx.
              </small>
            </label>
          ) : (
            <>
              <div className="method-picker-field">
                <span className="method-picker-label">Allowed Methods</span>
                <button
                  className="secondary-button"
                  disabled={methods.length === 0}
                  onClick={() => setPickerOpen(true)}
                  type="button"
                >
                  {methods.length === 0
                    ? "No methods in the Library yet"
                    : allowedMethodIds.length === 0
                      ? "Choose Methods from the library"
                      : `Choose Methods (${allowedMethodIds.length} selected)`}
                </button>
                {allowedMethodIds.length > 0 ? (
                  <div className="method-chip-row">
                    {allowedMethodIds.map((id) => (
                      <span className="method-chip" key={id}>
                        {methodName(id)}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <label className="permission-check">
                <input
                  checked={fetchRecipe}
                  onChange={(event) => setFetchRecipe(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  <strong>{t("apps.token.fetchRecipe.label")}</strong>
                  <small>{t("apps.token.fetchRecipe.desc")}</small>
                </span>
              </label>
              <label className="permission-check">
                <input
                  checked={sendFeedback}
                  onChange={(event) => setSendFeedback(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  <strong>{t("apps.token.sendFeedback.label")}</strong>
                  <small>{t("apps.token.sendFeedback.desc")}</small>
              <small className="context-disclaimer">
                {t("legal.notice.methodToken.feedback")}
              </small>
                </span>
              </label>
            </>
          )}

          {error ? <p className="form-error">{error}</p> : null}

          <button
            className="primary-button"
            disabled={submitting || !canCreate}
            type="submit"
          >
            {submitting ? "Creating..." : "Create Token"}
          </button>
        </form>
      </section>

      {pickerOpen ? (
        <MethodPickerModal
          initialSelected={allowedMethodIds}
          methods={methods}
          onClose={() => setPickerOpen(false)}
          onConfirm={(next) => {
            setAllowedMethodIds(next);
            setPickerOpen(false);
          }}
        />
      ) : null}

      {editing ? (
        <EditAppProfileModal
          methods={methods}
          onClose={() => setEditing(null)}
          onSaved={onUpdate}
          profile={editing}
          routines={routines}
        />
      ) : null}

      <section className="connection-panel">
        <p className="eyebrow">Safe connection</p>
        <h2>How the connection works</h2>
        <div className="connection-flow">
          <span>External PWA browser</span>
          <b>→</b>
          <span>Its Cloudflare Function / Worker</span>
          <b>→</b>
          <span>Vaenyx App Bridge</span>
        </div>
        <p>
          Store the Token as a secret in the external app's backend. Never put it
          in browser JavaScript or a public GitHub file.
        </p>
        <dl className="settings-list">
          <div>
            <dt>Routine Token · Vaenyx runs the whole routine</dt>
            <dd>
              <code>POST /v1/library/routines/:id/run</code>
            </dd>
          </div>
          <div>
            <dt>Method Token · Vaenyx runs one method (Mode A)</dt>
            <dd>
              <code>POST /v1/library/methods/:id/run</code>
            </dd>
          </div>
          <div>
            <dt>Method Token · fetch recipe, run it yourself (Mode B)</dt>
            <dd>
              <code>GET /v1/library/methods/:id/recipe</code>
            </dd>
          </div>
        </dl>
        <p className="token-kind-hint">
          Send the token as <code>Authorization: Bearer vaenyx_app_…</code>. The
          routine route returns the finished result; the method routes give you one
          building block at a time.
        </p>
      </section>

      <section className="profiles-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">Approved connections</p>
            <h2>Tokens</h2>
          </div>
        </div>
        {profiles.length === 0 ? (
          <div className="empty-state">
            <strong>No tokens yet</strong>
            <p>Create a Token when another app needs to use Vaenyx.</p>
          </div>
        ) : (
          <div className="profile-list">
            {profiles.map((profile) => (
              <article className="profile-card" key={profile.id}>
                <div>
                  <span className="task-status">
                    {profile.kind === "routine" ? "Routine Token" : "Method Token"}
                    {profile.enabled ? "" : " · Disabled"}
                  </span>
                  <strong>{profile.name}</strong>
                  <small>Created {formatTime(profile.createdAt)}</small>
                </div>
                {createdToken?.profileId !== profile.id ? (
                  <StoredTokenField
                    prefix={profile.tokenPrefix}
                    profileId={profile.id}
                  />
                ) : null}
                <dl>
                  {profile.kind === "routine" ? (
                    <div>
                      <dt>Routine</dt>
                      <dd>{routineName(profile.allowedRoutineId)}</dd>
                    </div>
                  ) : (
                    <>
                      <div>
                        <dt>Methods</dt>
                        <dd>{profile.allowedMethodIds.length}</dd>
                      </div>
                      <div>
                        <dt>Recipe</dt>
                        <dd>{profile.fetchRecipe ? "A + B" : "A only"}</dd>
                      </div>
                    </>
                  )}
                  {/* What this key may DO, as opposed to which Methods it may
                      call — on the card, because "nothing" is the answer for
                      every key until somebody ticks something and that is worth
                      seeing without opening anything. */}
                  <div>
                    <dt>{lang === "zh" ? "能做" : "May do"}</dt>
                    <dd>
                      {profile.capabilities.length === 0 ? (
                        lang === "zh" ? (
                          "只有配方"
                        ) : (
                          "The recipe only"
                        )
                      ) : (
                        <CapabilityChips
                          items={profile.capabilities}
                          lang={lang}
                        />
                      )}
                    </dd>
                  </div>
                </dl>
                {createdToken?.profileId === profile.id ? (
                  <div className="token-once">
                    <strong>Your new token is ready.</strong>
                    <TokenField token={createdToken.token} />
                    <p>
                      You can view or copy it again any time with the Show and
                      Copy buttons on this Token.
                    </p>
                  </div>
                ) : null}
                <div className="model-card-actions">
                  <button
                    className="text-button"
                    onClick={() => {
                      setCapsError(null);
                      setApproving(null);
                      setCapsFor((current) =>
                        current === profile.id ? null : profile.id,
                      );
                    }}
                    type="button"
                  >
                    {capsFor === profile.id
                      ? lang === "zh"
                        ? "收起能力"
                        : "Hide What It May Do"
                      : lang === "zh"
                        ? "它能做什么"
                        : "What It May Do"}
                  </button>
                </div>
                {capsFor === profile.id ? (
                  <div className="capability-window">
                    {/* Said before the ticks: these seven look exactly like the
                        seven in AI Settings, and somebody who reads them as a
                        second independent set will assume ticking one here can
                        give an outside app something this machine refuses. It
                        cannot. */}
                    <p className="settings-card-copy">
                      {lang === "zh"
                        ? "一把钥匙从「什么都不能」开始,只有你在这里勾上,它才拿得到。AI 设置里关掉的东西,这里也给不出去。"
                        : "A key starts with nothing, and only gets what you tick here. Anything switched off in AI Settings cannot be handed to a key either."}
                    </p>
                    {capsError ? (
                      <p className="form-error">{capsError}</p>
                    ) : null}
                    {!ceiling ? (
                      <p className={ceilingFailed ? "form-error" : "library-note"}>
                        {ceilingFailed
                          ? lang === "zh"
                            ? "这台机器自己的开关读不出来,所以现在什么都不能勾。"
                            : "This machine's own switches could not be read, so nothing can be ticked right now."
                          : lang === "zh"
                            ? "读着…"
                            : "Reading…"}
                      </p>
                    ) : (
                      <div className="capability-rows">
                        {CAPABILITY_META.map((meta) => {
                          const never = ceiling.neverViaToken.includes(meta.id);
                          const built = ceiling.implemented[meta.id] !== false;
                          const machineOn = ceiling.global[meta.id] === true;
                          const granted = profile.capabilities.includes(meta.id);
                          const ownApproval =
                            ceiling.needsOwnTokenApproval.includes(meta.id);
                          return (
                            <div className="capability-row" key={meta.id}>
                              <span className="capability-row-icon">
                                {meta.icon}
                              </span>
                              <span className="capability-row-name">
                                {lang === "zh" ? meta.name.zh : meta.name.en}
                                <em>
                                  (
                                  {lang === "zh" ? meta.gloss.zh : meta.gloss.en})
                                </em>
                              </span>
                              {never ? (
                                // Shown and refused, never quietly left out of
                                // the list: a row that is simply missing reads as
                                // an oversight, and the Owner would go looking
                                // for the switch somewhere else.
                                <span className="capability-row-pending">
                                  {lang === "zh"
                                    ? "钥匙永远拿不到"
                                    : "never through a key"}
                                </span>
                              ) : !built ? (
                                <span className="capability-row-pending">
                                  {lang === "zh"
                                    ? "还没做出来"
                                    : "not built yet"}
                                </span>
                              ) : !machineOn ? (
                                <span className="capability-row-pending">
                                  {lang === "zh"
                                    ? "整台机器都关着"
                                    : "off for the whole machine"}
                                </span>
                              ) : ownApproval && !granted ? (
                                // Its own act, deliberately not the same tick as
                                // the rest: this one can turn the machine into
                                // somebody else's way onto the internet.
                                <button
                                  className="secondary-button"
                                  disabled={capsBusy}
                                  onClick={() =>
                                    setApproving({
                                      profileId: profile.id,
                                      capability: meta.id,
                                    })
                                  }
                                  type="button"
                                >
                                  {lang === "zh" ? "单独批准" : "Approve"}
                                </button>
                              ) : (
                                <input
                                  aria-label={
                                    lang === "zh" ? meta.name.zh : meta.name.en
                                  }
                                  checked={granted}
                                  className="door-toggle"
                                  // All seven wait, not only the one being
                                  // written: the answer is the whole key, so two
                                  // ticks in flight would race and the loser
                                  // would silently come back.
                                  disabled={capsBusy}
                                  onChange={(event) =>
                                    void grantCapability(
                                      profile.id,
                                      meta.id,
                                      event.target.checked,
                                    )
                                  }
                                  role="switch"
                                  type="checkbox"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* The two rules that are not switches, each with its
                        reason. The names come from the server's own lists, so
                        this cannot drift from what the rows do. */}
                    {ceiling && ceiling.neverViaToken.length > 0 ? (
                      <p className="library-note">
                        {lang === "zh"
                          ? `${capabilityNames(ceiling.neverViaToken)}:永远给不了钥匙。替别的程序伸手进这台机器,不是一把钥匙该带的东西。`
                          : `${capabilityNames(ceiling.neverViaToken)} can never be given to a key. Reaching into this machine on another program's behalf is not something a key carries.`}
                      </p>
                    ) : null}
                    {ceiling && ceiling.needsOwnTokenApproval.length > 0 ? (
                      <p className="library-note">
                        {lang === "zh"
                          ? `${capabilityNames(ceiling.needsOwnTokenApproval)}:要单独批准一次,不跟其他几项一起勾。它可以把这台机器变成别人上网的通道。`
                          : `${capabilityNames(ceiling.needsOwnTokenApproval)} takes its own approval rather than the same tick as the rest: a key that can reach the internet can turn this machine into somebody else's way onto it.`}
                      </p>
                    ) : null}
                    {approving?.profileId === profile.id ? (
                      <div className="token-reset-confirm">
                        <span>
                          {lang === "zh"
                            ? `把「${capabilityNames([approving.capability])}」给这把钥匙?拿着它的程序就能通过这台机器上网。随时可以收回。`
                            : `Give this key ${capabilityNames([approving.capability])}? Whatever holds it can then reach the internet through this machine. You can take it back at any time.`}
                        </span>
                        <div className="profile-card-actions">
                          <button
                            className="danger-button"
                            disabled={capsBusy}
                            onClick={() =>
                              void grantCapability(
                                profile.id,
                                approving.capability,
                                true,
                                [approving.capability],
                              )
                            }
                            type="button"
                          >
                            {capsBusy
                              ? lang === "zh"
                                ? "处理中…"
                                : "Working..."
                              : lang === "zh"
                                ? "批准"
                                : "Approve"}
                          </button>
                          <button
                            className="text-button"
                            disabled={capsBusy}
                            onClick={() => setApproving(null)}
                            type="button"
                          >
                            {lang === "zh" ? "取消" : "Cancel"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {confirming?.id === profile.id ? (
                  <div
                    className={
                      confirming.action === "delete"
                        ? "token-reset-confirm token-delete-confirm"
                        : "token-reset-confirm"
                    }
                  >
                    <span>
                      {confirming.action === "reset"
                        ? "Reset the token? The current one stops working immediately and any app using it must be updated."
                        : confirming.action === "disable"
                          ? "Disable this token? Apps using it stop working until you re-enable it."
                          : confirming.action === "enable"
                            ? "Re-enable this token? The existing token starts working again."
                            : "Delete this token permanently? This cannot be undone, and any app using it stops working."}
                    </span>
                    <div className="profile-card-actions">
                      <button
                        className={
                          confirming.action === "enable"
                            ? "primary-button"
                            : "danger-button"
                        }
                        disabled={busyId === profile.id}
                        onClick={() => {
                          if (confirming.action === "reset") {
                            void resetToken(profile.id);
                          } else if (confirming.action === "disable") {
                            void disableToken(profile.id);
                          } else if (confirming.action === "enable") {
                            void enableToken(profile.id);
                          } else {
                            void deleteToken(profile.id);
                          }
                        }}
                        type="button"
                      >
                        {busyId === profile.id
                          ? "Working..."
                          : confirming.action === "reset"
                            ? "Reset token"
                            : confirming.action === "disable"
                              ? "Disable"
                              : confirming.action === "enable"
                                ? "Enable"
                                : "Delete"}
                      </button>
                      <button
                        className="text-button"
                        disabled={busyId === profile.id}
                        onClick={() => setConfirming(null)}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : profile.enabled ? (
                  <div className="profile-card-actions">
                    <button
                      className="secondary-button"
                      onClick={() => setEditing(profile)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() =>
                        setConfirming({ id: profile.id, action: "reset" })
                      }
                      type="button"
                    >
                      Reset token
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() =>
                        setConfirming({ id: profile.id, action: "disable" })
                      }
                      type="button"
                    >
                      Disable
                    </button>
                    <button
                      className="danger-button"
                      onClick={() =>
                        setConfirming({ id: profile.id, action: "delete" })
                      }
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <div className="profile-card-actions">
                    <button
                      className="primary-button"
                      onClick={() =>
                        setConfirming({ id: profile.id, action: "enable" })
                      }
                      type="button"
                    >
                      Enable
                    </button>
                    <button
                      className="danger-button"
                      onClick={() =>
                        setConfirming({ id: profile.id, action: "delete" })
                      }
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function GuardPanel({ events }: { events: AuditEvent[] }) {
  const [showAllAudit, setShowAllAudit] = useState(false);
  const visibleEvents = showAllAudit ? events : events.slice(0, 5);
  return (
    <div className="guard-layout">
      {/* "guard 是干什么用的,不知道" (Oskar, 2026-07-27) — the page now says
          so before anything else. */}
      <p className="settings-card-copy">
        Guard is Vaenyx's safety record: what Vaenyx is allowed to do on its
        own, and a log of every permission decision — which app asked for what,
        and what was allowed or refused.
      </p>
      <section className="guard-summary">
        <div>
          <p className="eyebrow">Autonomy policy</p>
          <h2>Level 0 only</h2>
          <p>
            Vaenyx can answer, but cannot take external action, and never changes
            its own memory, Skills, Apps, or behaviour silently — higher levels
            and any self-change need the Owner's approval.
          </p>
        </div>
      </section>
      <section className="audit-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">Guard audit trail</p>
            <h2>Recent decisions</h2>
          </div>
          <span className="count-chip">{events.length}</span>
        </div>
        {events.length === 0 ? (
          <div className="empty-state">
            <strong>No Guard decisions yet</strong>
            <p>Task and memory permission decisions will appear here.</p>
          </div>
        ) : (
          <div className="audit-list">
            {visibleEvents.map((event) => (
              <article className="audit-card" key={event.id}>
                <span className={`decision ${event.decision}`}>
                  {event.decision}
                </span>
                <div>
                  <strong>{event.action}</strong>
                  <p>{event.reason}</p>
                  <small>
                    {event.actorName} · {event.projectName ?? "No project"} ·{" "}
                    {formatTime(event.createdAt)}
                  </small>
                </div>
              </article>
            ))}
            {events.length > 5 ? (
              <button
                className="text-button"
                onClick={() => setShowAllAudit((value) => !value)}
                type="button"
              >
                {showAllAudit ? "Show less" : `Show more (${events.length - 5})`}
              </button>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

const MODE_TEMPLATES = [
  {
    name: "Focus",
    rules:
      "Stay on the current task. No unrelated topics or browsing; keep answers concise.",
  },
  {
    name: "Guest",
    rules:
      "General help only. No access to private projects, memory, or account settings.",
  },
  {
    name: "Minimal",
    rules:
      "Answer briefly and literally. No proactive suggestions or extra detail.",
  },
];

// Global error toasts (Oskar, dev.169): api.ts publishes every failed
// mutation here; toasts stack top-center and dismiss on tap or timeout.
function ToastHost() {
  const [toasts, setToasts] = useState<
    { id: number; text: string; tone: ToastTone }[]
  >([]);
  useEffect(() => {
    let nextId = 1;
    setToastListener((text, tone) => {
      const id = nextId;
      nextId += 1;
      setToasts((current) => [...current.slice(-2), { id, text, tone }]);
      window.setTimeout(
        () => setToasts((current) => current.filter((toast) => toast.id !== id)),
        // A confirmation has done its job in a moment; an error is read.
        tone === "success" ? 2200 : 6000,
      );
    });
    return () => setToastListener(null);
  }, []);
  if (toasts.length === 0) return null;
  return (
    <div className="toast-host">
      {toasts.map((toast) => (
        <button
          className={
            toast.tone === "success"
              ? "toast-item toast-item--success"
              : "toast-item"
          }
          key={toast.id}
          onClick={() =>
            setToasts((current) =>
              current.filter((item) => item.id !== toast.id),
            )
          }
          type="button"
        >
          {toast.text}
        </button>
      ))}
    </div>
  );
}

// Mode PINs are local convenience locks, not account credentials — a real
// password field made every browser offer to SAVE them (Oskar, dev.173).
// A text input masked in CSS looks the same, keeps the numeric keypad on
// phones, and no password manager touches it.
const PIN_INPUT_PROPS = {
  type: "text" as const,
  className: "pin-input",
  inputMode: "numeric" as const,
  autoComplete: "off" as const,
  spellCheck: false,
  "data-lpignore": "true",
  "data-1p-ignore": "",
  "data-form-type": "other",
};

// This browser's device id (spec §6 device pairing): a stable random id in
// localStorage, so the Owner can say "this device opens in mode X".
const DEVICE_ID_KEY = "vaenyx.deviceId";
const DEVICE_APPLIED_KEY = "vaenyx.deviceModeApplied";

function deviceId(): string {
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_ID_KEY, created);
    return created;
  } catch {
    return "unknown-device";
  }
}

// A human label so the Owner can tell devices apart in the Modes list.
function deviceLabel(): string {
  const agent = navigator.userAgent;
  const platform = /Android/i.test(agent)
    ? "Android"
    : /iPhone|iPad|iPod/i.test(agent)
      ? "iPhone/iPad"
      : /Mac/i.test(agent)
        ? "Mac"
        : /Windows/i.test(agent)
          ? "Windows"
          : "Device";
  const browser = /Edg\//.test(agent)
    ? "Edge"
    : /Chrome\//.test(agent)
      ? "Chrome"
      : /Safari\//.test(agent)
        ? "Safari"
        : /Firefox\//.test(agent)
          ? "Firefox"
          : "Browser";
  return `${platform} · ${browser}`;
}

// Re-ask the Enter PIN whenever the app is (re)opened into a gated mode
// (Oskar, dev.169): the session stays in its last mode across opens, but a
// mode with an Enter PIN must be unlocked again each time the app starts.
const MODE_PIN_SESSION_KEY = "vaenyx.modePinOk";

function modePinVerifiedThisSession(modeId: string): boolean {
  try {
    return window.sessionStorage.getItem(MODE_PIN_SESSION_KEY) === modeId;
  } catch {
    return true;
  }
}

export function markModePinVerified(modeId: string): void {
  try {
    window.sessionStorage.setItem(MODE_PIN_SESSION_KEY, modeId);
  } catch {
    // Best-effort.
  }
}

function ModePinGate({
  mode,
  onVerified,
}: {
  mode: Mode;
  onVerified: () => void;
}) {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function unlock() {
    if (!secret.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await switchMode(mode.id, secret.trim());
      markModePinVerified(mode.id);
      onVerified();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Wrong PIN.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    setBusy(true);
    setError(null);
    try {
      // Without an exit PIN this returns straight to User Mode; with one,
      // the typed secret must open the exit gate too.
      await exitMode(secret.trim() || undefined);
      try {
        window.sessionStorage.setItem(DEVICE_APPLIED_KEY, "exited");
      } catch {
        // Best-effort.
      }
      window.location.reload();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Could not exit.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="mode-gate-backdrop">
      <div className="mode-gate-card">
        <p className="eyebrow">Restricted Mode</p>
        <h2>{mode.name}</h2>
        <p className="settings-card-copy">
          This device is in the mode "{mode.name}". Enter its PIN to
          continue — the account password always works too.
        </p>
        <input
          {...PIN_INPUT_PROPS}
          autoFocus
          onChange={(event) => setSecret(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void unlock();
          }}
          placeholder="PIN Or Account Password"
          value={secret}
        />
        <div className="model-card-actions">
          <button
            className="primary-button"
            disabled={busy || !secret.trim()}
            onClick={() => void unlock()}
            type="button"
          >
            Unlock
          </button>
          <button
            className="secondary-button"
            disabled={busy}
            onClick={() => void leave()}
            type="button"
          >
            Exit To User Mode
          </button>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </div>
  );
}

// The persistent "you are in a mode" marker (spec §6, 建议 A): always
// visible while a session is switched into a Custom Mode, with the exit
// gate built in. Exit PIN or the account password both open it.
function ModeBadge({ mode }: { mode: Mode }) {
  const [asking, setAsking] = useState(false);
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function leave(withSecret?: string) {
    setError(null);
    try {
      await exitMode(withSecret);
      // An explicit exit wins over this device's default for the rest of
      // the session — otherwise the reload would drop straight back in.
      try {
        window.sessionStorage.setItem(DEVICE_APPLIED_KEY, "exited");
      } catch {
        // Best-effort.
      }
      window.location.reload();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Could not exit.",
      );
    }
  }

  return (
    <div className="mode-badge">
      <span className="mode-badge-name">Mode: {mode.name}</span>
      {asking ? (
        <span className="mode-badge-exit">
          <input
            {...PIN_INPUT_PROPS}
            autoFocus
            onChange={(event) => setSecret(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void leave(secret);
            }}
            placeholder="PIN Or Password"
            value={secret}
          />
          <button onClick={() => void leave(secret)} type="button">
            OK
          </button>
          <button
            onClick={() => {
              setAsking(false);
              setSecret("");
              setError(null);
            }}
            type="button"
          >
            Cancel
          </button>
        </span>
      ) : (
        <button
          onClick={() => {
            if (mode.hasExitPin) setAsking(true);
            else void leave();
          }}
          type="button"
        >
          Exit
        </button>
      )}
      {error ? <span className="mode-badge-error">{error}</span> : null}
    </div>
  );
}

// Custom Mode management (spec §6) — M1 wired storage; M2 adds switching:
// Enter gates (PIN or account password), the per-session sandbox filter
// server-side, and the persistent badge with its exit gate.
function ModesPanel() {
  // Only the capability block below is bilingual so far — the rest of this
  // screen is still English-only, and translating it is its own pass. New copy
  // is written in both languages from the day it lands, which is the only way
  // the gap ever closes.
  const { lang } = useI18n();
  const [modes, setModes] = useState<Mode[]>([]);
  const [name, setName] = useState("");
  const [rules, setRules] = useState("");
  const [lockSettings, setLockSettings] = useState(false);
  const [localOnly, setLocalOnly] = useState(false);
  const [enterPin, setEnterPin] = useState("");
  const [exitPin, setExitPin] = useState("");
  const [newAgentName, setNewAgentName] = useState("");
  const [newDigest, setNewDigest] = useState<"off" | "daily" | "weekly">("off");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Which mode's Enter is asking for its PIN right now (null = none).
  const [enterFor, setEnterFor] = useState<string | null>(null);
  const [enterSecret, setEnterSecret] = useState("");
  // Supervision view window (M4): which mode is expanded, its thread list,
  // and the messages of the thread being read. PIN-free from User Mode.
  const [viewingModeId, setViewingModeId] = useState<string | null>(null);
  const [viewThreads, setViewThreads] = useState<VaenyxThread[]>([]);
  const [viewMessages, setViewMessages] = useState<AskVaenyxMessage[] | null>(
    null,
  );
  const [viewThreadTitle, setViewThreadTitle] = useState("");

  async function openModeView(modeId: string) {
    if (viewingModeId === modeId) {
      setViewingModeId(null);
      setViewMessages(null);
      return;
    }
    setViewingModeId(modeId);
    setViewMessages(null);
    try {
      setViewThreads(await fetchModeThreads(modeId));
    } catch {
      setViewThreads([]);
    }
  }

  // WHAT THIS MODE MAY DO — the middle of the three capability layers. One mode
  // open at a time, and its answer is held with the mode id it came from: two
  // modes' lists look identical on screen, so showing the previous one against
  // the wrong name for even a moment would be a lie about a security setting.
  const [capsFor, setCapsFor] = useState<string | null>(null);
  const [caps, setCaps] = useState<ModeCapabilities | null>(null);
  const [capsBusy, setCapsBusy] = useState<string | null>(null);
  const [capsError, setCapsError] = useState<string | null>(null);

  async function openModeCapabilities(modeId: string) {
    if (capsFor === modeId) {
      setCapsFor(null);
      return;
    }
    setCapsFor(modeId);
    setCaps(null);
    setCapsError(null);
    try {
      setCaps(await fetchModeCapabilities(modeId));
    } catch (nextError) {
      setCapsError(
        nextError instanceof Error
          ? nextError.message
          : lang === "zh"
            ? "读不出来。"
            : "Could not read it.",
      );
    }
  }

  // One switch, sent on its own. The server answers with the whole resulting
  // state — including the instance's own switches — so a row that has just
  // become unreachable stops offering a switch without a second request.
  async function flipModeCapability(
    modeId: string,
    capability: string,
    on: boolean,
  ) {
    setCapsBusy(capability);
    setCapsError(null);
    try {
      setCaps(await updateModeCapabilities(modeId, { [capability]: on }, lang));
    } catch (nextError) {
      setCapsError(
        nextError instanceof Error
          ? nextError.message
          : lang === "zh"
            ? "改不了。"
            : "Could not change that.",
      );
    } finally {
      setCapsBusy(null);
    }
  }

  async function openModeThread(thread: VaenyxThread) {
    setViewThreadTitle(thread.title);
    try {
      if (thread.kind === "chat" && thread.conversationId) {
        setViewMessages(await fetchAskVaenyxMessages(thread.conversationId));
      } else if (thread.taskId) {
        setViewMessages(await fetchTaskMessages(thread.taskId));
      }
    } catch {
      setViewMessages([]);
    }
  }

  const thisDeviceId = deviceId();
  const [devices, setDevices] = useState<DeviceMode[]>([]);
  // Draft names per device; committed on blur/Enter.
  const [deviceNames, setDeviceNames] = useState<Record<string, string>>({});

  async function renameDevice(id: string) {
    const next = (deviceNames[id] ?? "").trim();
    const current = devices.find((device) => device.deviceId === id);
    if (!next || !current || next === current.label) return;
    try {
      setDevices(await setDeviceMode(id, { label: next }));
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not rename the device.",
      );
    }
  }

  useEffect(() => {
    void fetchModes()
      .then(setModes)
      .catch((nextError) =>
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Could not load modes.",
        ),
      );
    void fetchDeviceModes()
      .then(setDevices)
      .catch(() => undefined);
  }, []);

  async function applyDeviceDefault(id: string, modeId: string | null) {
    setBusy(true);
    setError(null);
    try {
      setDevices(await setDeviceMode(id, { modeId }));
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not set the device's mode.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function forgetDevice(id: string) {
    setBusy(true);
    setError(null);
    try {
      setDevices(await forgetDeviceMode(id));
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not forget the device.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function enterMode(mode: Mode, secret?: string) {
    setBusy(true);
    setError(null);
    try {
      await switchMode(mode.id, secret);
      // Entering counts as PIN-verified for this browser session; a fresh
      // app open will ask again (ModePinGate).
      markModePinVerified(mode.id);
      // A full reload re-fetches everything through the new mode's lens.
      window.location.reload();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not enter the mode.",
      );
      setBusy(false);
    }
  }

  async function addMode(template?: { name: string; rules: string }) {
    const draftName = template?.name ?? name.trim();
    if (!draftName) return;
    setBusy(true);
    setError(null);
    try {
      const created = await createMode({
        name: draftName,
        rules: template?.rules ?? rules.trim(),
        ...(template
          ? {}
          : {
              lockSettings,
              localOnly,
              agentName: newAgentName.trim(),
              digestCadence: newDigest,
              ...(enterPin.trim() ? { enterPin: enterPin.trim() } : {}),
              ...(exitPin.trim() ? { exitPin: exitPin.trim() } : {}),
            }),
      });
      setModes((current) => [...current, created]);
      if (!template) {
        setName("");
        setRules("");
        setLockSettings(false);
        setLocalOnly(false);
        setNewAgentName("");
        setNewDigest("off");
        setEnterPin("");
        setExitPin("");
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not save the mode.",
      );
    } finally {
      setBusy(false);
    }
  }

  // Editing an existing mode from User Mode (Oskar, dev.170). PIN fields:
  // blank = keep the current PIN, "Remove" checked = clear it, a typed
  // value = set a new one.
  const [editFor, setEditFor] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRules, setEditRules] = useState("");
  const [editLockSettings, setEditLockSettings] = useState(false);
  const [editLocalOnly, setEditLocalOnly] = useState(false);
  const [editAgentName, setEditAgentName] = useState("");
  const [editDigest, setEditDigest] = useState<"off" | "daily" | "weekly">(
    "off",
  );
  const [editEnterPin, setEditEnterPin] = useState("");
  const [editExitPin, setEditExitPin] = useState("");
  const [editClearEnterPin, setEditClearEnterPin] = useState(false);
  const [editClearExitPin, setEditClearExitPin] = useState(false);
  // Deleting a mode takes its sandbox with it — ask first (Oskar, dev.171).
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  function startEdit(mode: Mode) {
    setEditFor(mode.id);
    setEditName(mode.name);
    setEditRules(mode.rules);
    setEditLockSettings(mode.lockSettings);
    setEditLocalOnly(mode.localOnly);
    setEditAgentName(mode.agentName);
    setEditDigest(mode.digestCadence);
    setEditEnterPin("");
    setEditExitPin("");
    setEditClearEnterPin(false);
    setEditClearExitPin(false);
  }

  async function saveEdit(modeId: string) {
    setBusy(true);
    setError(null);
    try {
      const updated = await updateMode(modeId, {
        name: editName.trim() || undefined,
        rules: editRules,
        lockSettings: editLockSettings,
        localOnly: editLocalOnly,
        agentName: editAgentName.trim(),
        digestCadence: editDigest,
        ...(editClearEnterPin
          ? { enterPin: "" }
          : editEnterPin.trim()
            ? { enterPin: editEnterPin.trim() }
            : {}),
        ...(editClearExitPin
          ? { exitPin: "" }
          : editExitPin.trim()
            ? { exitPin: editExitPin.trim() }
            : {}),
      });
      setModes((current) =>
        current.map((item) => (item.id === modeId ? updated : item)),
      );
      setEditFor(null);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not update the mode.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeMode(modeId: string) {
    setBusy(true);
    setError(null);
    try {
      await deleteMode(modeId);
      setConfirmRemove(null);
      setModes((current) => current.filter((item) => item.id !== modeId));
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not remove the mode.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modes-layout">
      <p className="modes-preview-note">
        Enter a mode to work inside its own sandbox — separate chats,
        projects and memory. The badge in the corner shows where you are and
        is the way back; your account password always overrides a PIN.
      </p>

      <section className="settings-card">
        <p className="eyebrow">You are here</p>
        <h2>User Mode</h2>
        <p className="settings-card-copy">
          The default, unrestricted mode (you, the account owner). Every mode
          setting lives here. A Custom Mode is a restricted sandbox you switch
          into — with its own projects, chats, and memory, visible only from User
          Mode.
        </p>
      </section>

      <section className="settings-card">
        <p className="eyebrow">Quick start</p>
        <h2>Templates</h2>
        <p className="settings-card-copy">
          Neutral starting points (never a "kids" preset).
        </p>
        <div className="modes-templates">
          {MODE_TEMPLATES.map((template) => (
            <button
              className="secondary-button"
              disabled={busy}
              key={template.name}
              onClick={() => void addMode(template)}
              type="button"
            >
              + {template.name}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-card">
        <p className="eyebrow">New Custom Mode</p>
        <h2>Create a mode</h2>
        <form
          className="memory-form"
          onSubmit={(event) => {
            event.preventDefault();
            void addMode();
          }}
        >
          <label>
            Name
            <input
              maxLength={60}
              onChange={(event) => setName(event.target.value)}
              placeholder="Workshop"
              value={name}
            />
          </label>
          <label>
            Natural-language rules
            <textarea
              maxLength={2000}
              onChange={(event) => setRules(event.target.value)}
              placeholder="What this mode may and may not do…"
              rows={3}
              value={rules}
            />
          </label>
          <label className="modes-toggle">
            <input
              checked={lockSettings}
              onChange={(event) => setLockSettings(event.target.checked)}
              type="checkbox"
            />
            Lock settings (can't be changed from inside this mode)
          </label>
          <label className="modes-toggle">
            <input
              checked={localOnly}
              onChange={(event) => setLocalOnly(event.target.checked)}
              type="checkbox"
            />
            Local model only (also blocks network)
          </label>
          <label>
            Agent name in this mode (optional)
            <input
              maxLength={100}
              onChange={(event) => setNewAgentName(event.target.value)}
              placeholder="Blank uses the main name"
              value={newAgentName}
            />
          </label>
          <label>
            Activity summary to User Mode
            <select
              className="task-select"
              onChange={(event) =>
                setNewDigest(event.target.value as "off" | "daily" | "weekly")
              }
              value={newDigest}
            >
              <option value="off">Off</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>
          <label>
            Enter PIN (optional)
            <input
              {...PIN_INPUT_PROPS}
              onChange={(event) => setEnterPin(event.target.value)}
              placeholder="Leave blank for none"
              value={enterPin}
            />
          </label>
          <label>
            Exit PIN (optional — locks the mode)
            <input
              {...PIN_INPUT_PROPS}
              onChange={(event) => setExitPin(event.target.value)}
              placeholder="Leave blank for none"
              value={exitPin}
            />
          </label>
          <button className="primary-button" disabled={busy} type="submit">
            Add mode
          </button>
        </form>
        {error ? <p className="form-error">{error}</p> : null}
      </section>

      <section className="settings-card">
        <p className="eyebrow">Paired devices</p>
        <h2>Which Mode Each Device Opens In</h2>
        <p className="settings-card-copy">
          A device set to open in a mode lands there every time the app
          starts. Combined with that mode's Exit PIN, the device stays in it.
        </p>
        {devices.length === 0 ? (
          <p className="library-note">No other devices have opened Vaenyx yet.</p>
        ) : (
          <div className="modes-list">
            {devices.map((device) => (
              <article className="modes-card" key={device.deviceId}>
                <div className="modes-card-head">
                  <strong>
                    {device.label}
                    {device.deviceId === thisDeviceId ? " · This Device" : ""}
                  </strong>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => void forgetDevice(device.deviceId)}
                    type="button"
                  >
                    Forget
                  </button>
                </div>
                {/* Two Android phones look identical without a name of
                    their own (Oskar, dev.172). */}
                <label className="chat-font-field">
                  Name this device
                  <input
                    onBlur={() => void renameDevice(device.deviceId)}
                    onChange={(event) =>
                      setDeviceNames((current) => ({
                        ...current,
                        [device.deviceId]: event.target.value,
                      }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void renameDevice(device.deviceId);
                      }
                    }}
                    placeholder="Kitchen tablet"
                    value={deviceNames[device.deviceId] ?? device.label}
                  />
                </label>
                <label className="chat-font-field">
                  Opens in
                  <select
                    className="task-select"
                    disabled={busy}
                    onChange={(event) =>
                      void applyDeviceDefault(
                        device.deviceId,
                        event.target.value || null,
                      )
                    }
                    value={device.modeId ?? ""}
                  >
                    <option value="">User Mode (no restriction)</option>
                    {modes.map((mode) => (
                      <option key={mode.id} value={mode.id}>
                        {mode.name}
                      </option>
                    ))}
                  </select>
                </label>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="settings-card">
        <div className="section-title">
          <div>
            <p className="eyebrow">Restricted sandboxes</p>
            <h2>Custom Modes</h2>
          </div>
          <span className="count-chip">{modes.length}</span>
        </div>
        {modes.length === 0 ? (
          <div className="empty-state">
            <strong>No custom modes yet</strong>
            <p>Use a template or create one above.</p>
          </div>
        ) : (
          <div className="modes-list">
            {modes.map((mode) => (
              <article className="modes-card" key={mode.id}>
                <div className="modes-card-head">
                  <strong>{mode.name}</strong>
                  <span className="modes-card-buttons">
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() =>
                        editFor === mode.id ? setEditFor(null) : startEdit(mode)
                      }
                      type="button"
                    >
                      {editFor === mode.id ? "Cancel" : "Edit"}
                    </button>
                    {confirmRemove === mode.id ? (
                      <>
                        <button
                          className="text-button danger"
                          disabled={busy}
                          onClick={() => void removeMode(mode.id)}
                          type="button"
                        >
                          Really Remove
                        </button>
                        <button
                          className="text-button"
                          onClick={() => setConfirmRemove(null)}
                          type="button"
                        >
                          Keep
                        </button>
                      </>
                    ) : (
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() => setConfirmRemove(mode.id)}
                        type="button"
                      >
                        Remove
                      </button>
                    )}
                  </span>
                </div>
                {editFor === mode.id ? (
                  <div className="memory-form">
                    <label>
                      Name
                      <input
                        maxLength={60}
                        onChange={(event) => setEditName(event.target.value)}
                        value={editName}
                      />
                    </label>
                    <label>
                      Natural-language rules
                      <textarea
                        maxLength={2000}
                        onChange={(event) => setEditRules(event.target.value)}
                        rows={3}
                        value={editRules}
                      />
                    </label>
                    <label className="modes-toggle">
                      <input
                        checked={editLockSettings}
                        onChange={(event) =>
                          setEditLockSettings(event.target.checked)
                        }
                        type="checkbox"
                      />
                      Lock settings
                    </label>
                    <label className="modes-toggle">
                      <input
                        checked={editLocalOnly}
                        onChange={(event) =>
                          setEditLocalOnly(event.target.checked)
                        }
                        type="checkbox"
                      />
                      Local model only (also blocks network)
                    </label>
                    <label>
                      Agent name in this mode — blank uses the main one
                      <input
                        maxLength={100}
                        onChange={(event) =>
                          setEditAgentName(event.target.value)
                        }
                        placeholder="Vaenyx"
                        value={editAgentName}
                      />
                    </label>
                    <label>
                      Activity summary to User Mode
                      <select
                        className="task-select"
                        onChange={(event) =>
                          setEditDigest(
                            event.target.value as "off" | "daily" | "weekly",
                          )
                        }
                        value={editDigest}
                      >
                        <option value="off">Off</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </label>
                    <label>
                      Enter PIN — blank keeps the current one
                      <input
                        {...PIN_INPUT_PROPS}
                        disabled={editClearEnterPin}
                        onChange={(event) =>
                          setEditEnterPin(event.target.value)
                        }
                        placeholder={
                          mode.hasEnterPin ? "Unchanged" : "None set"
                        }
                        value={editEnterPin}
                      />
                    </label>
                    {mode.hasEnterPin ? (
                      <label className="modes-toggle">
                        <input
                          checked={editClearEnterPin}
                          onChange={(event) =>
                            setEditClearEnterPin(event.target.checked)
                          }
                          type="checkbox"
                        />
                        Remove Enter PIN
                      </label>
                    ) : null}
                    <label>
                      Exit PIN — blank keeps the current one
                      <input
                        {...PIN_INPUT_PROPS}
                        disabled={editClearExitPin}
                        onChange={(event) => setEditExitPin(event.target.value)}
                        placeholder={mode.hasExitPin ? "Unchanged" : "None set"}
                        value={editExitPin}
                      />
                    </label>
                    {mode.hasExitPin ? (
                      <label className="modes-toggle">
                        <input
                          checked={editClearExitPin}
                          onChange={(event) =>
                            setEditClearExitPin(event.target.checked)
                          }
                          type="checkbox"
                        />
                        Remove Exit PIN
                      </label>
                    ) : null}
                    <button
                      className="primary-button"
                      disabled={busy}
                      onClick={() => void saveEdit(mode.id)}
                      type="button"
                    >
                      Save Changes
                    </button>
                  </div>
                ) : null}
                {mode.rules ? <p>{mode.rules}</p> : null}
                <div className="modes-tags">
                  {mode.lockSettings ? (
                    <span className="library-chip">Settings locked</span>
                  ) : null}
                  {mode.localOnly ? (
                    <span className="library-chip">Local only</span>
                  ) : null}
                  {mode.hasEnterPin ? (
                    <span className="library-chip">Enter PIN</span>
                  ) : null}
                  {mode.hasExitPin ? (
                    <span className="library-chip">Exit PIN · locked</span>
                  ) : null}
                </div>
                {enterFor === mode.id ? (
                  <div className="modes-enter-row">
                    <input
                      {...PIN_INPUT_PROPS}
                      autoFocus
                      className={`method-rename-input ${PIN_INPUT_PROPS.className}`}
                      onChange={(event) => setEnterSecret(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void enterMode(mode, enterSecret);
                        }
                      }}
                      placeholder="Enter PIN (Or Account Password)"
                      value={enterSecret}
                    />
                    <button
                      className="primary-button"
                      disabled={busy}
                      onClick={() => void enterMode(mode, enterSecret)}
                      type="button"
                    >
                      Go
                    </button>
                    <button
                      className="secondary-button"
                      disabled={busy}
                      onClick={() => {
                        setEnterFor(null);
                        setEnterSecret("");
                      }}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="model-card-actions">
                    <button
                      className="primary-button"
                      disabled={busy}
                      onClick={() => {
                        if (mode.hasEnterPin) {
                          setEnterFor(mode.id);
                          setEnterSecret("");
                        } else {
                          void enterMode(mode);
                        }
                      }}
                      type="button"
                    >
                      Enter This Mode
                    </button>
                  </div>
                )}
                <div className="model-card-actions">
                  <button
                    className="text-button"
                    onClick={() => void openModeCapabilities(mode.id)}
                    type="button"
                  >
                    {capsFor === mode.id
                      ? lang === "zh"
                        ? "收起能力"
                        : "Hide What It May Do"
                      : lang === "zh"
                        ? "它能做什么"
                        : "What It May Do"}
                  </button>
                  <button
                    className="text-button"
                    onClick={() => void openModeView(mode.id)}
                    type="button"
                  >
                    {viewingModeId === mode.id
                      ? "Hide Activity"
                      : "View Activity"}
                  </button>
                </div>
                {capsFor === mode.id ? (
                  <div className="capability-window">
                    {/* Said before the switches, not after: these seven look
                        exactly like the seven in AI Settings, and somebody who
                        reads them as a second independent set will assume this
                        screen can hand a shared device something the instance
                        refuses. It cannot. */}
                    <p className="settings-card-copy">
                      {lang === "zh"
                        ? "模式只能往窄里收。AI 设置里关掉的东西,在这里也开不了 —— 这一层只会拿走,不会给回来。"
                        : "A mode only ever narrows. Anything switched off in AI Settings is off in here too — this layer takes away, it never gives back."}
                    </p>
                    {capsError ? (
                      <p className="form-error">{capsError}</p>
                    ) : null}
                    {caps && caps.modeId === mode.id ? (
                      <div className="capability-rows">
                        {CAPABILITY_META.map((meta) => {
                          const built = caps.implemented[meta.id] !== false;
                          const ceiling = caps.global[meta.id] === true;
                          return (
                            <div className="capability-row" key={meta.id}>
                              <span className="capability-row-icon">
                                {meta.icon}
                              </span>
                              <span className="capability-row-name">
                                {lang === "zh" ? meta.name.zh : meta.name.en}
                                <em>
                                  (
                                  {lang === "zh" ? meta.gloss.zh : meta.gloss.en}
                                  )
                                </em>
                              </span>
                              {!built ? (
                                <span className="capability-row-pending">
                                  {lang === "zh"
                                    ? "还没做出来"
                                    : "not built yet"}
                                </span>
                              ) : !ceiling ? (
                                // A switch here would be a switch that does
                                // nothing: the instance already refuses this
                                // one, so the mode cannot be given it. Saying
                                // where it is switched off is the difference
                                // between an unavailable row and a broken one.
                                <span className="capability-row-pending">
                                  {lang === "zh"
                                    ? "整台机器都关着"
                                    : "off for the whole machine"}
                                </span>
                              ) : (
                                <input
                                  aria-label={
                                    lang === "zh" ? meta.name.zh : meta.name.en
                                  }
                                  checked={caps.capabilities[meta.id] === true}
                                  className="door-toggle"
                                  // ALL seven wait, not just the one being
                                  // written: the answer to a write is the whole
                                  // resulting list, so two flips in flight
                                  // would race and the loser would silently
                                  // come back on. The write is one small
                                  // request; the pause is not felt.
                                  disabled={capsBusy !== null}
                                  onChange={(event) =>
                                    void flipModeCapability(
                                      mode.id,
                                      meta.id,
                                      event.target.checked,
                                    )
                                  }
                                  role="switch"
                                  type="checkbox"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : capsError ? null : (
                      <p className="library-note">
                        {lang === "zh" ? "读着…" : "Reading…"}
                      </p>
                    )}
                  </div>
                ) : null}
                {viewingModeId === mode.id ? (
                  <div className="mode-view-window">
                    {viewThreads.length === 0 ? (
                      <p className="library-note">
                        Nothing in this mode yet.
                      </p>
                    ) : (
                      viewThreads.map((thread) => (
                        <button
                          className="mode-view-thread"
                          key={thread.id}
                          onClick={() => void openModeThread(thread)}
                          type="button"
                        >
                          <span>{thread.title}</span>
                          <small>
                            {thread.kind === "task" ? "Task" : "Chat"}
                          </small>
                        </button>
                      ))
                    )}
                    {viewMessages ? (
                      <div className="mode-view-messages">
                        <strong>{viewThreadTitle}</strong>
                        {viewMessages.length === 0 ? (
                          <p className="library-note">No messages.</p>
                        ) : (
                          viewMessages.map((message) => (
                            <div
                              className={`mode-view-message mode-view-${message.role}`}
                              key={message.id}
                            >
                              <MarkdownMessage content={message.content} />
                            </div>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// A project's memory, shown inside its project card: list + add + edit + delete,
// scoped to that one project (no project selector needed).
// Dual instruction windows (spec §7, locked 2026-07-02): a manual window the
// Owner writes and an automatic Document Vaenyx rewrites from this project's
// chats. Both are injected into the project's chat context. The automatic
// window carries the B3 legal notice and is fully Owner-editable/deletable.
function ProjectInstructionsSection({
  project,
  onUpdate,
}: {
  project: Project;
  onUpdate: (project: Project) => void;
}) {
  const { t } = useI18n();
  const [manual, setManual] = useState(project.instructionsManual);
  const [auto, setAuto] = useState(project.instructionsAuto);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"manual" | "auto" | null>(null);

  // A background rewrite may land while the panel is open; follow the server
  // value unless the Owner has local unsaved edits.
  const [seenAuto, setSeenAuto] = useState(project.instructionsAuto);
  if (project.instructionsAuto !== seenAuto) {
    setSeenAuto(project.instructionsAuto);
    if (auto === seenAuto) setAuto(project.instructionsAuto);
  }

  async function save(input: { manual?: string; auto?: string }) {
    setError(null);
    setSaving(input.manual !== undefined ? "manual" : "auto");
    try {
      const updated = await updateProjectInstructions(project.id, input);
      onUpdate(updated);
      if (input.manual !== undefined) setManual(updated.instructionsManual);
      if (input.auto !== undefined) {
        setAuto(updated.instructionsAuto);
        setSeenAuto(updated.instructionsAuto);
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Instructions could not be saved.",
      );
    } finally {
      setSaving(null);
    }
  }

  return (
    <details className="project-instructions">
      <summary>
        <span>Instructions</span>
        <small>
          {(project.instructionsManual ? 1 : 0) +
            (project.instructionsAuto ? 1 : 0)}
        </small>
      </summary>

      <label>
        Your instructions
        <textarea
          maxLength={4000}
          onChange={(event) => setManual(event.target.value)}
          placeholder="Standing instructions for this project — e.g. reply in Chinese, amounts in AUD."
          rows={3}
          value={manual}
        />
      </label>
      <div className="card-actions">
        <button
          className="primary-button"
          disabled={saving !== null || manual === project.instructionsManual}
          onClick={() => void save({ manual })}
          type="button"
        >
          {saving === "manual" ? "Saving..." : "Save Instructions"}
        </button>
      </div>

      <label>
        Vaenyx's summary
        <textarea
          maxLength={8000}
          onChange={(event) => setAuto(event.target.value)}
          placeholder="Vaenyx hasn't written a summary yet — it builds one as you chat in this project."
          rows={4}
          value={auto}
        />
      </label>
      <p className="legal-note">{t("legal.notice.project.autoSummary")}</p>
      {project.instructionsAutoUpdatedAt ? (
        <p className="panel-description">
          Updated {new Date(project.instructionsAutoUpdatedAt).toLocaleString()}
        </p>
      ) : null}
      <div className="card-actions">
        <button
          className="primary-button"
          disabled={saving !== null || auto === project.instructionsAuto}
          onClick={() => void save({ auto })}
          type="button"
        >
          {saving === "auto" ? "Saving..." : "Save Summary"}
        </button>
        {project.instructionsAuto ? (
          <button
            className="text-button"
            disabled={saving !== null}
            onClick={() => void save({ auto: "" })}
            type="button"
          >
            Delete Summary
          </button>
        ) : null}
      </div>

      {error ? <p className="form-error">{error}</p> : null}
    </details>
  );
}

function ProjectMemorySection({
  project,
  memories,
  onCreate,
  onDelete,
  onUpdate,
}: {
  project: Project;
  memories: ProjectMemory[];
  onCreate: (memory: ProjectMemory) => void;
  onDelete: (memoryId: string) => void;
  onUpdate: (memory: ProjectMemory) => void;
}) {
  const projectMemories = memories.filter(
    (memory) => memory.projectId === project.id,
  );
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const memory = await createMemory({
        projectId: project.id,
        title,
        content,
      });
      onCreate(memory);
      setTitle("");
      setContent("");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Memory could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="project-memory">
      <summary>Memory ({projectMemories.length})</summary>
      <div className="project-memory-body">
        {projectMemories.length === 0 ? (
          <p className="library-note">No memory yet for this project.</p>
        ) : (
          <div className="project-memory-list">
            {projectMemories.map((memory) =>
              editingId === memory.id ? (
                <form
                  className="memory-form"
                  key={memory.id}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void updateMemory(memory.id, {
                      title: editTitle,
                      content: editContent,
                    }).then((updated) => {
                      onUpdate(updated);
                      setEditingId(null);
                    });
                  }}
                >
                  <input
                    onChange={(event) => setEditTitle(event.target.value)}
                    required
                    value={editTitle}
                  />
                  <textarea
                    onChange={(event) => setEditContent(event.target.value)}
                    required
                    rows={3}
                    value={editContent}
                  />
                  <div className="card-actions">
                    <button className="secondary-button" type="submit">
                      Save
                    </button>
                    <button
                      className="text-button"
                      onClick={() => setEditingId(null)}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="project-memory-item" key={memory.id}>
                  <div>
                    <strong>{memory.title}</strong>
                    <p>{memory.content}</p>
                  </div>
                  <div className="card-actions">
                    <button
                      className="text-button"
                      onClick={() => {
                        setEditingId(memory.id);
                        setEditTitle(memory.title);
                        setEditContent(memory.content);
                      }}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="text-button"
                      onClick={() =>
                        void deleteMemory(memory.id).then(() =>
                          onDelete(memory.id),
                        )
                      }
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
        <form className="memory-form" onSubmit={add}>
          <label>
            Memory title
            <input
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Preferred response style"
              required
              value={title}
            />
          </label>
          <label>
            What should Vaenyx remember?
            <textarea
              maxLength={20_000}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Keep answers clear, concise, and practical."
              required
              rows={3}
              value={content}
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="secondary-button" disabled={saving} type="submit">
            {saving ? "Saving..." : "Add memory"}
          </button>
        </form>
      </div>
    </details>
  );
}

function ProjectsPanel({
  workspace,
  onCreate,
  onUpdate,
  memories,
  onCreateMemory,
  onDeleteMemory,
  onUpdateMemory,
}: {
  workspace: Workspace;
  onCreate: (project: Project) => void;
  onUpdate: (project: Project) => void;
  memories: ProjectMemory[];
  onCreateMemory: (memory: ProjectMemory) => void;
  onDeleteMemory: (memoryId: string) => void;
  onUpdateMemory: (memory: ProjectMemory) => void;
}) {
  const projects = sortProjectsForSidebar(workspace.projects);
  const generalProject = projects.find(isGeneralProject) ?? null;
  const generalThreads = workspace.threads.filter(
    (thread) =>
      thread.status !== "archived" &&
      (thread.projectId === GENERAL_PROJECT_ID ||
        (!generalProject && thread.projectId === null)),
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      const project = await createProject({ name, description });
      onCreate(project);
      setName("");
      setDescription("");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Project could not be created.",
      );
    }
  }

  function startEditing(project: Project) {
    setEditingId(project.id);
    setEditName(getSidebarProjectName(project));
    setEditDescription(project.description);
  }

  return (
    <div className="projects-layout">
      <section className="project-editor">
        <div className="section-title">
          <div>
            <p className="eyebrow">New context boundary</p>
            <h2>Create a Project</h2>
          </div>
        </div>
        <p className="panel-description">
          A Project keeps its tasks, memory, and connected Apps inside one clear
          workspace.
        </p>
        <form className="memory-form" onSubmit={submit}>
          <label>
            Project name
            <input
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              placeholder="Auzzie Homes"
              required
              value={name}
            />
          </label>
          <label>
            Purpose
            <textarea
              maxLength={500}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What belongs inside this project?"
              required
              rows={4}
              value={description}
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-button" type="submit">
            Create Project
          </button>
        </form>
      </section>
      <section>
        <div className="section-title">
          <div>
            <p className="eyebrow">Context boundaries</p>
            <h2>Your Projects</h2>
          </div>
          <span className="count-chip">{projects.length}</span>
        </div>
        <div className="project-list">
          {projects.map((project) => (
            <article
              className={
                isGeneralProject(project)
                  ? "project-card general-project-card"
                  : "project-card"
              }
              key={project.id}
            >
              {isGeneralProject(project) ? (
                <>
                  <div className="project-card-head">
                    <div>
                      <span className="task-status">Default workspace</span>
                      <h3>Unsorted</h3>
                    </div>
                    <button className="text-button" disabled type="button">
                      Fixed
                    </button>
                  </div>
                  <p>
                    Chats that aren't filed under a Project stay here until you
                    move them into one. Unsorted has no shared project memory.
                  </p>
                  <dl>
                    <div>
                      <dt>Chats</dt>
                      <dd>{generalThreads.length}</dd>
                    </div>
                    <div>
                      <dt>Memory</dt>
                      <dd>Independent</dd>
                    </div>
                  </dl>
                </>
              ) : editingId === project.id ? (
                <form
                  className="memory-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void updateProject(project.id, {
                      name: editName,
                      description: editDescription,
                    }).then((updated) => {
                      onUpdate(updated);
                      setEditingId(null);
                    });
                  }}
                >
                  <input
                    onChange={(event) => setEditName(event.target.value)}
                    required
                    value={editName}
                  />
                  <textarea
                    onChange={(event) => setEditDescription(event.target.value)}
                    required
                    rows={4}
                    value={editDescription}
                  />
                  <div className="card-actions">
                    <button className="primary-button" type="submit">
                      Save changes
                    </button>
                    <button
                      className="text-button"
                      onClick={() => setEditingId(null)}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="project-card-head">
                    <div>
                      <span className="task-status">Project workspace</span>
                      <h3>{getSidebarProjectName(project)}</h3>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => startEditing(project)}
                      type="button"
                    >
                      Edit
                    </button>
                  </div>
                  <p>{project.description}</p>
                  <dl>
                    <div>
                      <dt>Threads</dt>
                      <dd>{project.threadCount}</dd>
                    </div>
                    <div>
                      <dt>Chats</dt>
                      <dd>{project.chatThreadCount}</dd>
                    </div>
                    <div>
                      <dt>Task Threads</dt>
                      <dd>{project.taskThreadCount}</dd>
                    </div>
                    <div>
                      <dt>Memory</dt>
                      <dd>{project.memoryCount}</dd>
                    </div>
                    <div>
                      <dt>Task records</dt>
                      <dd>{project.taskCount}</dd>
                    </div>
                  </dl>
                  <ProjectInstructionsSection
                    onUpdate={onUpdate}
                    project={project}
                  />
                  <ProjectMemorySection
                    memories={memories}
                    onCreate={onCreateMemory}
                    onDelete={onDeleteMemory}
                    onUpdate={onUpdateMemory}
                    project={project}
                  />
                </>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function AskVaenyxPanel({
  composeKey,
  agentName,
  conversations,
  libraryRoutines,
  onConversationsChange,
  onCreateTask,
  onDraftConversationStarted,
  onLibraryRefresh,
  onOpenSettings,
  onRequestedConversationHandled,
  onWorkspaceRefresh,
  requestedConversationId,
  requestedProjectId,
  view,
  focusedTaskId,
  workspace,
}: {
  agentName: string;
  conversations: AskVaenyxConversation[];
  libraryRoutines: LibraryRoutineSummary[];
  focusedTaskId: string | null;
  onConversationsChange: (conversations: AskVaenyxConversation[]) => void;
  // Used by the "Connect a model" hint when nothing can answer yet.
  onOpenSettings: () => void;
  onCreateTask: (
    content: string,
    sourceChatId?: string | null,
    projectId?: string | null,
    title?: string,
  ) => Promise<Task>;
  onDraftConversationStarted: (conversationId: string) => void;
  onLibraryRefresh: () => void;
  onRequestedConversationHandled: () => void;
  onWorkspaceRefresh: () => Promise<void>;
  requestedConversationId: string | null;
  requestedProjectId: string | null;
  composeKey: number;
  view: PortalView;
  workspace: Workspace;
}) {
  const { lang, t } = useI18n();
  // C2 health gate: acceptance is durable (until the consent floor moves); "Not
  // Now" only withholds for this session and re-fires next health chat.
  const [healthAck, setHealthAck] = useState(
    () =>
      localStorage.getItem(`vaenyx-health-ack-${LEGAL_CONSENT_FLOOR}`) === "1",
  );
  const [healthGateDismissed, setHealthGateDismissed] = useState(false);
  // In-chat background creation (spec §2a): while the drafted Method/Routine is
  // being built and saved, the chat shows a Building… banner; completion posts
  // a confirmation note into the conversation.
  const [building, setBuilding] = useState<{
    conversationId: string;
    kind: "method" | "routine";
  } | null>(null);
  // A proposed recipe edit waiting for the Owner to read the diff and approve.
  const [recipeEdit, setRecipeEdit] = useState<{
    conversationId: string;
    draft: RecipeEditDraft;
  } | null>(null);
  const [applyingEdit, setApplyingEdit] = useState(false);
  // Voice (dev.133): the mic shows once a voice connection exists; the speaker
  // toggle reads finished replies aloud (persisted per device).
  const [voiceReady, setVoiceReady] = useState(false);
  const [visionReady, setVisionReady] = useState(false);
  const [imageEngineReady, setImageEngineReady] = useState(false);
  // Phase B: an uploaded photo waiting to ride on the next message (direct
  // vision mode); null = no attachment pending.
  const [pendingImageId, setPendingImageId] = useState<string | null>(null);
  // Instant thumbnail: a local object URL shown the moment the photo is
  // picked, while the upload runs behind it. The ref holds the in-flight
  // upload so a Run pressed early can await the imageId.
  const [pendingPhotoPreview, setPendingPhotoPreview] = useState<string | null>(
    null,
  );
  const pendingUploadRef = useRef<Promise<string> | null>(null);
  function clearPendingPhoto() {
    setPendingImageId(null);
    setPendingPhotoPreview(null);
    pendingUploadRef.current = null;
  }
  // A PDF waiting to ride the next message, and the M1 cost gate it may have
  // to pass first. acknowledged is the Owner's answer — the server refuses a
  // gated document without it, so the gate is not just a screen.
  const [pendingDocument, setPendingDocument] = useState<{
    documentId: string;
    name: string;
    pages: number;
    acknowledged: boolean;
  } | null>(null);
  const [documentGate, setDocumentGate] = useState<{
    documentId: string;
    name: string;
    pages: number;
  } | null>(null);
  // New-chat model choice (dev.156): picked before the conversation exists,
  // applied the moment it is created so the very first turn uses it.
  const [newChatProviderId, setNewChatProviderId] = useState<string | null>(
    null,
  );
  const [newChatModelName, setNewChatModelName] = useState<string | null>(
    null,
  );
  const [newChatEffort, setNewChatEffort] = useState<ReasoningEffort | null>(
    null,
  );
  async function applyNewChatModelChoice(conversationId: string) {
    if (newChatProviderId) {
      await setChatProvider(conversationId, newChatProviderId).catch(
        () => undefined,
      );
    }
    // A model can be pinned even on the default provider.
    if (newChatModelName) {
      await setChatModel(conversationId, newChatModelName).catch(
        () => undefined,
      );
    }
    if (newChatEffort && newChatEffort !== "medium") {
      await setReasoningEffort(conversationId, newChatEffort).catch(
        () => undefined,
      );
    }
    setNewChatProviderId(null);
    setNewChatModelName(null);
    setNewChatEffort(null);
  }
  // Kept as a READ-ONLY preference: an Owner who turned always-read-aloud on
  // in an older build still gets it, but there is no toggle any more (the rule
  // is spoken in → spoken out, plus a speak button on every message).
  const [voiceReplies] = useState(voiceRepliesEnabled);
  const [voiceOutput, setVoiceOutput] = useState<VoiceOutputStatus | null>(
    null,
  );
  useEffect(() => {
    void fetchVoiceStatus()
      .then((status) => setVoiceReady(status.connected))
      .catch(() => undefined);
    void fetchVoiceOutput()
      .then(setVoiceOutput)
      .catch(() => undefined);
    void fetchVisionStatus()
      .then((status) => setVisionReady(status.connected))
      .catch(() => undefined);
    // With a picture engine connected, every message is classified (the judge
    // also decides draw), so the composer needs to know.
    void fetchImageEngine()
      .then((status) => setImageEngineReady(status.connected))
      .catch(() => undefined);
  }, []);
  // A finished voice-conversation reply speaks through its OWN message button
  // (the one speech element, see SpeakButton): this marks which reply should
  // start itself, carrying the clip prewarmed while the text streamed.
  const [autoSpeak, setAutoSpeak] = useState<{
    messageId: string;
    prewarm: SpeechPrewarm | null;
  } | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(conversations[0]?.id ?? null);
  const [messages, setMessages] = useState<AskVaenyxMessage[]>([]);
  const [routineJournal, setRoutineJournal] = useState<RoutineJournalEntry[]>(
    [],
  );
  const [routineGallery, setRoutineGallery] = useState<RoutineGalleryItem[]>([]);
  const [capabilityTab, setCapabilityTab] = useState<
    "chat" | "journal" | "gallery"
  >("chat");
  // Friendly input (Library v2 ③): a multi-field routine returns a
  // needs-confirmation payload instead of running; this holds the editable
  // confirm card (AI-parsed values as strings, booleans as checks).
  const [routineInputConfirm, setRoutineInputConfirm] = useState<{
    conversationId: string;
    routineId: string;
    content: string;
    imageId: string | null;
    // Spoken in → the eventual result is spoken out, even across the card.
    speakResult: boolean;
    // Photo mode (visual first): the marks ARE the primary field's value —
    // edited on the picture, never in a text blob. primaryKey names the field
    // they feed; initialMarks (JSON) detects real corrections for learning.
    marks: ImageAnnotationItem[] | null;
    initialMarks: string;
    primaryKey: string | null;
    fields: RoutineInputField[];
    values: Record<string, string>;
    checks: Record<string, boolean>;
    initialValues: Record<string, string>;
    initialChecks: Record<string, boolean>;
  } | null>(null);
  // Load a routine chat's Journal + Gallery whenever the open chat (or its
  // routine binding) changes; clear them for an ordinary chat.
  useEffect(() => {
    const conversationId = activeConversationId;
    if (!conversationId) {
      setRoutineJournal([]);
      setRoutineGallery([]);
      return;
    }
    const thread = workspace.threads.find(
      (candidate) =>
        candidate.kind === "chat" &&
        candidate.conversationId === conversationId,
    );
    if (!thread?.routineId) {
      setRoutineJournal([]);
      setRoutineGallery([]);
      return;
    }
    let active = true;
    void (async () => {
      try {
        const data = await fetchChatRoutineData(conversationId);
        if (active) {
          setRoutineJournal(data.journal);
          setRoutineGallery(data.gallery);
        }
      } catch {
        // Best-effort; the panels just stay empty on a transient error.
      }
    })();
    return () => {
      active = false;
    };
  }, [activeConversationId, workspace.threads]);

  // Reset the capability tab to Chat when switching chats.
  useEffect(() => {
    setCapabilityTab("chat");
  }, [activeConversationId]);
  // Connected model backends, for the composer's provider picker. Fetched once;
  // an empty/failed fetch just hides the picker (Codex-only stays the default).
  const [chatProviders, setChatProviders] = useState<ModelProviderInfo[]>([]);
  // Whether ANY backend can actually answer. Codex is always "connected"
  // even with no CLI installed, so only `healthy` tells the truth — without
  // this the composer used to show a confident "ChatGPT" chip on an install
  // with nothing connected at all.
  const [hasUsableModel, setHasUsableModel] = useState(true);
  useEffect(() => {
    let active = true;
    void fetchModelProviders()
      .then((result) => {
        if (active) {
          setChatProviders(
            result.providers.filter((provider) => provider.connected),
          );
          setHasUsableModel(
            result.providers.some((provider) => provider.healthy),
          );
        }
      })
      .catch(() => {
        // Best-effort; no picker if providers can't be listed.
      });
    return () => {
      active = false;
    };
  }, []);
  const [taskMessages, setTaskMessages] = useState<AskVaenyxMessage[]>([]);
  const [taskRuns, setTaskRuns] = useState<TaskRun[]>([]);
  const [prompt, setPrompt] = useState("");
  const [taskPrompt, setTaskPrompt] = useState("");
  const [startWorkPrompt, setStartWorkPrompt] = useState("");
  const generalProjectId =
    workspace.projects.find(isGeneralProject)?.id ??
    workspace.projects[0]?.id ??
    GENERAL_PROJECT_ID;
  const [composeProjectId, setComposeProjectId] = useState<string>(
    requestedProjectId ?? generalProjectId,
  );
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingTaskMessages, setLoadingTaskMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingTaskMessage, setSendingTaskMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const taskEndRef = useRef<HTMLDivElement | null>(null);
  // Controls the in-flight streaming request so a Stop button can abort it.
  const streamControllerRef = useRef<AbortController | null>(null);
  // Live "Thinking… Ns" counter while the model is reasoning before its reply.

  function upsertConversation(
    current: AskVaenyxConversation[],
    conversation: AskVaenyxConversation,
  ): AskVaenyxConversation[] {
    return [
      conversation,
      ...current.filter((item) => item.id !== conversation.id),
    ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async function openConversation(conversationId: string) {
    setActiveConversationId(conversationId);
    setLoadingMessages(true);
    setError(null);

    try {
      setMessages(await fetchAskVaenyxMessages(conversationId));
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx Chat could not load this chat.",
      );
    } finally {
      setLoadingMessages(false);
    }
  }

  useEffect(() => {
    if (view !== "chat") return;

    const firstConversation = conversations[0];
    if (activeConversationId || !firstConversation) return;

    void openConversation(firstConversation.id);
  }, [activeConversationId, conversations, view]);

  // Watch-it-work (Oskar, 2026-07-27): while a reply is being made, the chat
  // shows what is happening — a status line for the steps Vaenyx itself runs
  // (translating the picture prompt, generating the picture), and the model's
  // own thinking where the backend streams it. Both vanish when the reply
  // lands, Claude-Code style: the workings are watchable, the record is clean.
  const [streamStatus, setStreamStatus] = useState<string | null>(null);
  const [streamThinking, setStreamThinking] = useState("");
  // A task RUN's thinking arrives by poll, not stream (runs are detached).
  const [runThinking, setRunThinking] = useState("");

  function statusLabel(code: string): string {
    const zh = lang === "zh";
    if (code === "classifying") {
      return zh ? "正在理解你的要求…" : "Working out what you're asking…";
    }
    if (code === "image-prompt") {
      return zh ? "正在把要求写成画图 prompt…" : "Writing the picture prompt…";
    }
    if (code === "image-generating") {
      return zh ? "正在生成图片…" : "Generating the picture…";
    }
    if (code === "annotating") {
      return zh ? "正在标注照片…" : "Marking the photo…";
    }
    if (code === "answering") {
      return zh ? "思考中…" : "Thinking…";
    }
    return code;
  }

  // The chat splash's safety cap: after 4 seconds the normal loading row takes
  // over, so a slow or hung fetch never leaves a covered screen.
  const [splashExpired, setSplashExpired] = useState(false);
  useEffect(() => {
    if (!(loadingMessages && messages.length === 0)) {
      setSplashExpired(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setSplashExpired(true), 4000);
    return () => window.clearTimeout(timer);
  }, [loadingMessages, messages.length]);

  // Pulling down at the top of a conversation refreshes THAT conversation —
  // the browser's whole-page reload gesture is switched off in CSS, because
  // reloading the entire app to see a new message is a sledgehammer (Oskar,
  // 2026-07-27).
  const pullStartY = useRef<number | null>(null);
  const [pullReady, setPullReady] = useState(false);

  function handleMessagesPullStart(event: React.TouchEvent<HTMLDivElement>) {
    const atTop =
      (window.scrollY ?? 0) <= 0 && event.currentTarget.scrollTop <= 0;
    pullStartY.current = atTop ? (event.touches[0]?.clientY ?? null) : null;
  }

  function handleMessagesPullMove(event: React.TouchEvent<HTMLDivElement>) {
    if (pullStartY.current === null) return;
    const pulled =
      (event.touches[0]?.clientY ?? pullStartY.current) - pullStartY.current;
    setPullReady(pulled > 70);
  }

  async function handleMessagesPullEnd() {
    pullStartY.current = null;
    if (!pullReady) return;
    setPullReady(false);
    if (view === "chat" && activeConversationId) {
      await openConversation(activeConversationId);
    }
  }

  useEffect(() => {
    if (!requestedConversationId) return;

    if (requestedConversationId === activeConversationId) {
      // Same conversation, but reload when nothing is on screen: "already
      // open" with an emptied message list showed a blank chat until a manual
      // refresh (Oskar, 2026-07-27). Never while a send is in flight — the
      // send owns the message list, and a refetch would wipe its optimistic
      // bubbles.
      if (messages.length === 0 && !loadingMessages && !sending) {
        void openConversation(requestedConversationId).finally(
          onRequestedConversationHandled,
        );
      } else {
        onRequestedConversationHandled();
      }
      return;
    }

    void openConversation(requestedConversationId).finally(
      onRequestedConversationHandled,
    );
  }, [requestedConversationId]);

  useEffect(() => {
    if (view !== "new") return;

    setActiveConversationId(null);
    setMessages([]);
    setTaskMessages([]);
    setPrompt("");
    setTaskPrompt("");
    setStartWorkPrompt("");
    setError(null);
    setComposeProjectId(requestedProjectId ?? generalProjectId);
  }, [composeKey, generalProjectId, requestedProjectId, view]);

  useEffect(() => {
    if (view !== "task" || !focusedTaskId) {
      setTaskMessages([]);
      setTaskRuns([]);
      setTaskPrompt("");
      setLoadingTaskMessages(false);
      return;
    }

    let cancelled = false;
    setLoadingTaskMessages(true);
    setTaskPrompt("");
    setError(null);

    fetchTaskMessages(focusedTaskId)
      .then((nextMessages) => {
        if (!cancelled) {
          setTaskMessages(nextMessages);
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Vaenyx could not load this task conversation.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingTaskMessages(false);
        }
      });

    fetchTaskRuns(focusedTaskId)
      .then((runs) => {
        if (!cancelled) setTaskRuns(runs);
      })
      .catch(() => {
        // Run history is best-effort.
      });

    return () => {
      cancelled = true;
    };
  }, [focusedTaskId, view]);

  // Coming back to a suspended page (phone unlock, tab switch): the reply may
  // have finished server-side while the stream connection was dead — refetch
  // the open conversation so the real answer replaces any stale error bubble.
  // Runs once immediately and once after 2.5s: on resume, the dead stream's
  // rejection may not have settled yet (sending still true on the first pass).
  const activeConversationIdRef = useRef(activeConversationId);
  const sendingRef = useRef(sending);
  const sendingTaskRef = useRef(sendingTaskMessage);
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
    sendingRef.current = sending;
    sendingTaskRef.current = sendingTaskMessage;
  });
  useEffect(() => {
    const run = () => {
      if (view === "chat" && activeConversationId && !sendingRef.current) {
        void fetchAskVaenyxMessages(activeConversationId)
          .then((fresh) => {
            if (activeConversationIdRef.current === activeConversationId) {
              setMessages(fresh);
              setError(null);
            }
          })
          .catch(() => undefined);
        void fetchAskVaenyxConversations()
          .then(onConversationsChange)
          .catch(() => undefined);
      }
      if (view === "task" && focusedTaskId && !sendingTaskRef.current) {
        void fetchTaskMessages(focusedTaskId)
          .then(setTaskMessages)
          .catch(() => undefined);
        // The header (Last run / Next / chips) reads the workspace — a PWA
        // waking from the background otherwise shows yesterday's values.
        void onWorkspaceRefresh();
      }
    };
    const reconcile = () => {
      if (document.visibilityState !== "visible") return;
      run();
      window.setTimeout(run, 2_500);
    };
    document.addEventListener("visibilitychange", reconcile);
    return () => document.removeEventListener("visibilitychange", reconcile);
  }, [
    view,
    activeConversationId,
    focusedTaskId,
    onConversationsChange,
    onWorkspaceRefresh,
  ]);

  // A run finishes server-side without the UI knowing (no push channel), so
  // "Working" used to stick until a manual refresh. Poll while the open task is
  // waiting/running; the interval dissolves as soon as the status settles.
  const focusedTaskStatus = focusedTaskId
    ? workspace.tasks.find((task) => task.id === focusedTaskId)?.status ?? null
    : null;
  useEffect(() => {
    if (!focusedTaskId) return undefined;
    if (focusedTaskStatus !== "running" && focusedTaskStatus !== "waiting") {
      // The run is over; its workings go with it.
      setRunThinking("");
      return undefined;
    }
    const timer = window.setInterval(() => {
      void onWorkspaceRefresh();
      // A run executes detached on the server (a locked phone still gets its
      // reply), so its thinking cannot stream here — the open view polls it.
      void fetchTaskLive(focusedTaskId)
        .then((live) => setRunThinking(live.thinking))
        .catch(() => undefined);
      void fetchTaskRuns(focusedTaskId)
        .then(setTaskRuns)
        .catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [focusedTaskId, focusedTaskStatus, onWorkspaceRefresh]);

  // When a run settles, pull the conversation once more: the fresh result is a
  // NEW message in the task thread, and that thread is otherwise fetched only
  // when the task is opened — without this, "Run again" visibly did nothing.
  const previousTaskStatusRef = useRef<string | null>(null);
  useEffect(() => {
    const previous = previousTaskStatusRef.current;
    previousTaskStatusRef.current = focusedTaskStatus;
    if (!focusedTaskId || view !== "task") return;
    if (
      previous === "running" &&
      (focusedTaskStatus === "completed" || focusedTaskStatus === "failed")
    ) {
      void fetchTaskMessages(focusedTaskId)
        .then(setTaskMessages)
        .catch(() => undefined);
      void fetchTaskRuns(focusedTaskId)
        .then(setTaskRuns)
        .catch(() => undefined);
    }
  }, [focusedTaskId, focusedTaskStatus, view]);

  // Photos load after the text does, and each one pushes the page down under
  // the anchored position — which is how opening a picture conversation kept
  // landing on the FIRST photo instead of the end (Oskar, 2026-07-27). The
  // anchor time is remembered; every photo that finishes loading inside that
  // window re-anchors to the true end.
  const lastAnchorAtRef = useRef(0);

  function reanchorAfterImageLoad() {
    if (Date.now() - lastAnchorAtRef.current > 3000) return;
    const target = view === "task" ? taskEndRef.current : chatEndRef.current;
    target?.scrollIntoView({ block: "end" });
  }

  useEffect(() => {
    if (view !== "chat") return;
    if (!loadingMessages && messages.length > 0) {
      const cutoff = consumeUnreadCutoff();
      if (cutoff) {
        const first = messages.find((message) => message.createdAt > cutoff);
        if (first) {
          // Zeroed, not stamped: the photo re-anchor must not drag the view
          // back to the bottom while the Owner is reading from here.
          lastAnchorAtRef.current = 0;
          document
            .getElementById(`message-${first.id}`)
            ?.scrollIntoView({ block: "start" });
          return;
        }
      }
    }
    lastAnchorAtRef.current = Date.now();
    chatEndRef.current?.scrollIntoView({ block: "end" });
  }, [
    loadingMessages,
    messages.length,
    sending,
    streamStatus,
    streamThinking,
    view,
  ]);

  // streamStatus/streamThinking are in here on purpose: the working line ("Joining
  // the dots…") appears AFTER the send flips, so anchoring only on the send left
  // it jammed against the composer and the Owner had to scroll to see it (Oskar,
  // 2026-07-30). Every change of what is showing re-anchors.
  useEffect(() => {
    if (view !== "task") return;
    if (!loadingTaskMessages && taskMessages.length > 0) {
      const cutoff = consumeUnreadCutoff();
      if (cutoff) {
        const first = taskMessages.find(
          (message) => message.createdAt > cutoff,
        );
        if (first) {
          lastAnchorAtRef.current = 0;
          document
            .getElementById(`message-${first.id}`)
            ?.scrollIntoView({ block: "start" });
          return;
        }
      }
    }
    lastAnchorAtRef.current = Date.now();
    taskEndRef.current?.scrollIntoView({ block: "end" });
  }, [
    loadingTaskMessages,
    sendingTaskMessage,
    streamStatus,
    streamThinking,
    taskMessages.length,
    view,
  ]);

  // Routine chat: a message feeds the Routine. The fed-in note lands in the
  // Journal, the generated result in the Gallery; we refresh both from the server.
  // A multi-field routine answers with a needs-confirmation payload instead of
  // running — we open the confirm card and re-post with the confirmed `input`.
  // Spoken in → spoken out for Routines too: a run fed by voice speaks its
  // result through the result's own SpeakButton; a typed run stays text.
  const [autoSpeakGalleryId, setAutoSpeakGalleryId] = useState<string | null>(
    null,
  );

  async function runRoutineMessage(
    conversationId: string,
    routineId: string,
    content: string,
    input?: Record<string, unknown>,
    learn?: boolean,
    imageId?: string,
    speakResult?: boolean,
  ): Promise<void> {
    setSending(true);
    setError(null);
    setPrompt("");
    setCapabilityTab("chat");
    const tempId = `pending-journal-${crypto.randomUUID()}`;
    const startedAt = new Date().toISOString();
    setRoutineJournal((current) => [
      {
        id: tempId,
        routineId,
        chatId: conversationId,
        content,
        createdAt: startedAt,
        imageId: imageId ?? null,
      },
      ...current,
    ]);
    try {
      const result = await runRoutineInChat(
        conversationId,
        content,
        input,
        learn,
        imageId,
        lang,
      );
      if (result && typeof result === "object" && "needsInput" in result) {
        // Nothing ran yet: take the pending note back out and open the confirm
        // card prefilled with the AI-parsed fields.
        setRoutineJournal((current) =>
          current.filter((entry) => entry.id !== tempId),
        );
        const values: Record<string, string> = {};
        const checks: Record<string, boolean> = {};
        for (const field of result.fields) {
          const parsed = result.parsed[field.key];
          if (field.type === "boolean") {
            checks[field.key] = parsed === true;
          } else if (Array.isArray(parsed)) {
            values[field.key] = parsed.map((item) => String(item)).join("\n");
          } else if (parsed !== undefined && parsed !== null) {
            values[field.key] =
              typeof parsed === "object"
                ? JSON.stringify(parsed)
                : String(parsed);
          } else {
            values[field.key] = "";
          }
        }
        const marks =
          imageId && Array.isArray(result.annotations) &&
          result.annotations.length > 0
            ? result.annotations
            : null;
        setRoutineInputConfirm({
          conversationId,
          routineId,
          // What the parser actually read (typed words + a photo's extracted
          // lines) — the confirm round sends it back so the learn example
          // pairs the parse with its real source.
          content: result.content ?? content,
          imageId: imageId ?? null,
          speakResult: speakResult ?? false,
          marks,
          initialMarks: JSON.stringify(marks ?? []),
          primaryKey:
            result.fields.find(
              (field) => field.required && field.type !== "boolean",
            )?.key ?? null,
          fields: result.fields,
          values,
          checks,
          // Frozen copies of the AI's prefill, so confirmRoutineInput can tell
          // whether the Owner actually edited anything.
          initialValues: { ...values },
          initialChecks: { ...checks },
        });
        return;
      }
      const data = await fetchChatRoutineData(conversationId);
      setRoutineJournal(data.journal);
      setRoutineGallery(data.gallery);
      if (speakResult) {
        const newest = [...data.gallery].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        )[0];
        if (newest) setAutoSpeakGalleryId(newest.id);
      }
      void onWorkspaceRefresh();
    } catch (nextError) {
      setRoutineJournal((current) =>
        current.filter((entry) => entry.id !== tempId),
      );
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not run this routine.",
      );
    } finally {
      setSending(false);
    }
  }

  // Build the typed input from the confirm card and run for real. Empty
  // non-boolean fields are omitted (the run's schema validation is the final
  // gate); values are coerced by the field's declared type.
  function confirmRoutineInput(): void {
    const confirm = routineInputConfirm;
    if (!confirm) return;
    // Photo mode: the marks on the picture are the primary field's value.
    const markNames = confirm.marks
      ? confirm.marks.map((item) => item.name.trim()).filter(Boolean)
      : null;
    const input: Record<string, unknown> = {};
    for (const field of confirm.fields) {
      if (field.type === "boolean") {
        input[field.key] = confirm.checks[field.key] === true;
        continue;
      }
      if (markNames && field.key === confirm.primaryKey) {
        if (markNames.length > 0) {
          input[field.key] =
            field.type === "array" ? markNames : markNames.join("\n");
        }
        continue;
      }
      const raw = confirm.values[field.key] ?? "";
      if (raw.trim() === "") continue;
      if (field.type === "number" || field.type === "integer") {
        const num = Number(raw.trim());
        input[field.key] = Number.isNaN(num) ? raw.trim() : num;
      } else if (field.type === "array") {
        input[field.key] = raw
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
      } else {
        input[field.key] = raw;
      }
    }
    // Corrected marks persist: journal, gallery and the annotate overlay all
    // read the same store, so the Owner's edit is the truth everywhere.
    if (confirm.marks && confirm.imageId) {
      void saveAnnotations(confirm.imageId, confirm.marks).catch(
        () => undefined,
      );
    }
    // Did the Owner edit any field from the AI's prefill? Only a real correction
    // is worth saving as a local few-shot example.
    const edited =
      confirm.fields.some((field) =>
        field.type === "boolean"
          ? confirm.checks[field.key] !== confirm.initialChecks[field.key]
          : field.key !== confirm.primaryKey &&
            (confirm.values[field.key] ?? "") !==
              (confirm.initialValues[field.key] ?? ""),
      ) ||
      (confirm.marks !== null &&
        JSON.stringify(confirm.marks) !== confirm.initialMarks);
    setRoutineInputConfirm(null);
    void runRoutineMessage(
      confirm.conversationId,
      confirm.routineId,
      confirm.content,
      input,
      edited,
      confirm.imageId ?? undefined,
      confirm.speakResult,
    );
  }

  // In-chat background creation (spec §2a): draft with the existing pipeline,
  // save to the Library (a Routine plan drafts and saves its Methods too), then
  // post a confirmation note into the conversation — the Owner sees it in
  // place, and the model sees it in history on every later turn. Failures post
  // a note too, so the chat never goes silently quiet about a build.
  // edit-method (copy pack B4): propose the change, then show the Owner exactly
  // which lines move before anything is written. The confirmation is not
  // optional and the edit never publishes — see the note on the modal.
  async function proposeRecipeEdit(
    conversationId: string,
    methodId: string,
    request: string,
  ): Promise<void> {
    try {
      const draft = await draftRecipeEdit(methodId, request);
      if (draft.unchanged) {
        await appendConversationNote(
          conversationId,
          lang === "zh"
            ? `「${draft.methodName}」的步骤没有需要改的地方,没有做任何改动。`
            : `Nothing in "${draft.methodName}" needed changing, so nothing was changed.`,
        ).catch(() => {});
        return;
      }
      setRecipeEdit({ conversationId, draft });
    } catch {
      await appendConversationNote(
        conversationId,
        lang === "zh"
          ? "⚠ 这次没能改成。把要改的地方再说一遍,我重试。"
          : "⚠ That change could not be drafted. Say what to change again and I'll retry.",
      ).catch(() => {});
    }
  }

  async function applyRecipeEdit(): Promise<void> {
    if (!recipeEdit || applyingEdit) return;
    setApplyingEdit(true);
    const { conversationId, draft } = recipeEdit;
    try {
      const result = await updateMethodRecipe(draft.methodId, draft.proposed);
      const changed = draft.diff.filter((line) => line.kind !== "same").length;
      const regrant =
        result.staleGrants > 0
          ? lang === "zh"
            ? ` 有 ${result.staleGrants} 个 app 之前授权过这个 Method,需要重新授权。`
            : ` ${result.staleGrants} app grant(s) for this Method need granting again.`
          : "";
      setRecipeEdit(null);
      const note = await appendConversationNote(
        conversationId,
        lang === "zh"
          ? `✔ 「${draft.methodName}」的步骤已更新(${changed} 行有变动)。${regrant}`
          : `✔ "${draft.methodName}" updated (${changed} line(s) changed).${regrant}`,
      );
      setMessages((current) =>
        activeConversationId === conversationId ? [...current, note] : current,
      );
      onLibraryRefresh();
    } catch {
      // The toast from the failed request already said what went wrong.
    } finally {
      setApplyingEdit(false);
    }
  }

  async function buildFromChat(
    conversationId: string,
    kind: "method" | "routine",
    description: string,
  ): Promise<void> {
    setBuilding({ conversationId, kind });
    let note: string;
    try {
      let builtName: string;
      if (kind === "method") {
        const draft = await draftMethod(description);
        const created = await createMethod(draft);
        builtName = created.name;
      } else {
        const plan = await planRoutine(description);
        const created = await createRoutine(plan);
        builtName = created.name;
      }
      note =
        lang === "zh"
          ? `✔ ${kind === "method" ? "Method" : "Routine"}「${builtName}」已建好,已存入你的资源库。直接说"用它"就可以开始用;想细调,去 Settings → Library 打开它。`
          : `✔ The ${kind === "method" ? "Method" : "Routine"} "${builtName}" is built and saved to your Library. Just ask to use it; to fine-tune it, open it under Settings → Library.`;
    } catch (buildError) {
      const reason =
        buildError instanceof Error ? buildError.message : "unknown error";
      note =
        lang === "zh"
          ? `⚠ 这次没建成(${reason})。把需求再说一遍,我重新建。`
          : `⚠ The build failed (${reason}). Describe it again and I'll retry.`;
    }
    try {
      const message = await appendConversationNote(conversationId, note);
      setMessages((current) =>
        activeConversationId === conversationId
          ? [...current, message]
          : current,
      );
    } catch {
      // The note could not be stored; the Library still has the result.
    } finally {
      setBuilding((current) =>
        current?.conversationId === conversationId ? null : current,
      );
      void onWorkspaceRefresh();
      onLibraryRefresh();
    }
  }

  async function sendChatContent(
    content: string,
    voiceAudioId?: string,
  ): Promise<void> {
    // Phase B: a pending photo rides on this message; a photo alone is a
    // valid message too. A Run pressed while the upload is still in flight
    // waits for the imageId here instead of dropping the photo.
    let imageId = pendingImageId ?? undefined;
    if (!imageId && pendingUploadRef.current) {
      try {
        imageId = await pendingUploadRef.current;
      } catch {
        // Upload failed: the toast already said so; send goes on without it.
      }
    }
    const document = pendingDocument;
    if (!content.trim()) {
      if (!imageId && !document) return;
      content = document ? `(Document: ${document.name})` : "(Photo)";
    }
    clearPendingPhoto();
    setPendingDocument(null);
    if (activeThread?.routineId && activeConversationId) {
      await runRoutineMessage(
        activeConversationId,
        activeThread.routineId,
        content,
        undefined,
        undefined,
        imageId,
        Boolean(voiceAudioId),
      );
      return;
    }

    // AI-driven: in an ongoing plain chat, let Vaenyx judge whether this calls for
    // a Routine or a background Task. use-routine → turn this chat into a routine
    // chat and run now; use-task → start a background task; suggest-* → reply
    // normally but briefly offer it; none → plain reply. Conservative, best-effort.
    let suggestRoutineId: string | undefined;
    let suggestTask = false;
    let suggestCreate: "method" | "routine" | undefined;
    let editMethodId: string | null = null;
    let editRequest: string | null = null;
    let createDescription: string | null = null;
    let clarifyCreateQuestion: string | undefined;
    let drawPrompt: string | undefined;
    let annotateRide = false;
    // ONE controller for the whole turn — judge included. Stop aborts this, so
    // it bites immediately instead of waiting for the model to start.
    const turnController = new AbortController();
    streamControllerRef.current = turnController;
    // The FIRST message of a brand-new chat is exactly where people state what
    // they want ("daily AI news at 7am"), so it must be classified too. The
    // classifier needs a conversation to read history from, so create it first
    // and reuse it for the reply below — no extra chat is left behind.
    let preCreatedConversationId: string | null = null;
    if (!activeConversationId && messageMaybeIntent(content, messages, libraryRoutines)) {
      try {
        const conversation = await createAskVaenyxConversation({
          projectId: composeProjectId || generalProjectId,
        });
        preCreatedConversationId = conversation.id;
        onConversationsChange(upsertConversation(conversations, conversation));
        setActiveConversationId(conversation.id);
        // Switch into the chat view NOW, not after classification: the judge
        // takes a model round-trip, and on the compose screen the Owner
        // watched ~10 silent seconds before anything moved (Oskar,
        // 2026-07-27). With the view flipped, the optimistic bubble and the
        // "working out what you're asking" status below are actually visible.
        onDraftConversationStarted(conversation.id);
        await applyNewChatModelChoice(conversation.id);
      } catch {
        // Could not pre-create: fall through to the normal (unclassified) path.
      }
    }
    const classifyConversationId =
      activeConversationId ?? preCreatedConversationId;
    if (
      classifyConversationId &&
      // With a picture engine connected, every message goes to the judge:
      // draw-requests come in the words of the conversation, and the keyword
      // prefilter cannot see them (Oskar, 2026-07-27). Same when a vision
      // engine is connected — "标出来" in any wording is the judge's call,
      // never a keyword's (Oskar, 2026-07-28). Without either, the cheaper
      // prefilter stands.
      (imageEngineReady ||
        visionReady ||
        messageMaybeIntent(content, messages, libraryRoutines))
    ) {
      setSending(true);
      // The judge takes a model round-trip, and for its first hours the screen
      // showed NOTHING until it came back — the Owner's own message appeared
      // five seconds after Send (Oskar, 2026-07-27). The bubble now appears
      // immediately with a status line; the judgment happens behind it.
      setPrompt("");
      setStreamStatus("classifying");
      const pendingId = `pending-owner-${crypto.randomUUID()}`;
      setMessages((current) => [
        ...current,
        {
          id: pendingId,
          conversationId: classifyConversationId,
          role: "owner",
          content,
          status: "completed",
          webSearchUsed: false,
          createdAt: new Date().toISOString(),
          voice: false,
          audioId: null,
          imageId: imageId ?? null,
          imagePrompt: null,
        },
      ]);
      // The streaming send below adds its own owner bubble; this early one
      // hands over the moment any later path takes charge.
      const removePending = () =>
        setMessages((current) =>
          current.filter((message) => message.id !== pendingId),
        );
      let verdict: Awaited<ReturnType<typeof classifyMessage>> | null = null;
      try {
        verdict = await classifyMessage(
          classifyConversationId,
          content,
          // Stop must bite HERE too: the judge runs before any streaming, and
          // without this the button did nothing until the model started
          // talking (Oskar, 2026-07-29).
          turnController.signal,
        );
      } catch {
        // Best-effort: leave verdict null and fall through to a plain reply.
      }
      setStreamStatus(null);
      removePending();
      if (turnController.signal.aborted) {
        setSending(false);
        return;
      }
      if (verdict?.decision === "use-routine" && verdict.routineId) {
        try {
          await attachRoutineToChat(classifyConversationId, verdict.routineId);
          await onWorkspaceRefresh();
          setSending(false);
          await runRoutineMessage(
            classifyConversationId,
            verdict.routineId,
            content,
          );
          return;
        } catch {
          // Attach/run failed — fall through to a normal reply.
        }
      }
      if (verdict?.decision === "use-task" && verdict.taskRequest) {
        try {
          // onCreateTask creates the task and opens its detail view, so the
          // Owner lands straight on the new task — no hunting in the list.
          const task = await onCreateTask(
            verdict.taskRequest,
            classifyConversationId,
            activeThread?.projectId ?? null,
            verdict.taskTitle ?? undefined,
          );
          // Recurring ask ("every morning at 7"): schedule it in the same step
          // and tell the Owner in the chat, so it never silently stays one-off.
          if (verdict.taskSchedule) {
            const schedule = verdict.taskSchedule;
            try {
              await setTaskSchedule(task.id, {
                cadence: schedule.cadence,
                enabled: true,
                ...(schedule.time ? { time: schedule.time } : {}),
                ...(schedule.dayOfWeek !== null
                  ? { dayOfWeek: schedule.dayOfWeek }
                  : {}),
                ...(schedule.dayOfMonth !== null
                  ? { dayOfMonth: schedule.dayOfMonth }
                  : {}),
              });
              await appendConversationNote(
                classifyConversationId,
                lang === "zh"
                  ? `✔ 已建好定时任务并开启:${describeIntentSchedule(schedule, "zh")}。结果会在每次运行后出现在这个任务里。`
                  : `✔ Scheduled task created and switched on: ${describeIntentSchedule(schedule, "en")}. Each run's result lands in this task.`,
              ).catch(() => {});
              await onWorkspaceRefresh();
            } catch {
              // The task exists but could not be scheduled; say so rather than
              // letting the Owner believe it repeats.
              await appendConversationNote(
                classifyConversationId,
                lang === "zh"
                  ? "⚠ 任务已建好,但定时没设成功。可在 Scheduled 页面手动设定。"
                  : "⚠ The task was created but could not be scheduled. Set it on the Scheduled screen.",
              ).catch(() => {});
            }
          }
          setPrompt("");
          setSending(false);
          return;
        } catch {
          // Task creation failed — fall through to a normal reply.
        }
      }
      if (verdict?.decision === "suggest-routine" && verdict.routineId) {
        suggestRoutineId = verdict.routineId;
      }
      if (verdict?.decision === "suggest-task") {
        suggestTask = true;
      }
      if (
        verdict?.decision === "create-method" ||
        verdict?.decision === "create-routine"
      ) {
        suggestCreate =
          verdict.decision === "create-method" ? "method" : "routine";
        createDescription = verdict.createDescription ?? content;
      }
      // clarify-create (spec §2a phase 2): too vague to build — this reply asks
      // ONE clarifying question instead, and nothing is built this turn. The
      // answered follow-up classifies as create-* and builds as usual.
      if (verdict?.decision === "clarify-create" && verdict.clarifyQuestion) {
        clarifyCreateQuestion = verdict.clarifyQuestion;
      }
      // edit-method: an installed Method should behave differently. The reply
      // still happens; the proposed change follows it as a confirmation.
      if (
        verdict?.decision === "edit-method" &&
        verdict.methodId &&
        verdict.editRequest
      ) {
        editMethodId = verdict.methodId;
        editRequest = verdict.editRequest;
      }
      // draw: the one per-message judgment decided this asks for a picture and
      // produced the English prompt. It rides along with the send; the server
      // generates before the model speaks and hands it the truth.
      if (verdict?.decision === "draw" && verdict.imagePrompt) {
        drawPrompt = verdict.imagePrompt;
      }
      // annotate: the judge understood the Owner wants the conversation's
      // photo marked. The server marks it before the model replies.
      if (verdict?.decision === "annotate") {
        annotateRide = true;
      }
    }

    setSending(true);
    setError(null);
    let createdConversationId: string | null = null;
    const controller = turnController;
    const tempOwnerId = `pending-owner-${crypto.randomUUID()}`;
    const tempAssistantId = `pending-assistant-${crypto.randomUUID()}`;

    try {
      // Reuse the chat the classifier pass may have created, so a classified
      // first message never leaves an extra empty chat behind.
      let conversationId = activeConversationId ?? preCreatedConversationId;
      let nextConversations = conversations;
      if (preCreatedConversationId) {
        createdConversationId = preCreatedConversationId;
      }

      if (!conversationId) {
        const conversation = await createAskVaenyxConversation({
          projectId: composeProjectId || generalProjectId,
        });
        conversationId = conversation.id;
        nextConversations = upsertConversation(conversations, conversation);
        onConversationsChange(nextConversations);
        setActiveConversationId(conversation.id);
        createdConversationId = conversation.id;
        await applyNewChatModelChoice(conversation.id);
      }

      if (!conversationId) {
        throw new Error("Vaenyx Chat could not choose a chat.");
      }

      const startedAt = new Date().toISOString();
      // Show the Owner message + an empty assistant bubble immediately.
      setMessages((current) => [
        ...current,
        {
          id: tempOwnerId,
          conversationId,
          role: "owner",
          content,
          status: "completed",
          webSearchUsed: false,
          createdAt: startedAt,
          ...(voiceAudioId ? { voice: true, audioId: voiceAudioId } : {}),
          ...(imageId ? { imageId } : {}),
        },
        {
          id: tempAssistantId,
          conversationId,
          role: "assistant",
          content: "",
          status: "completed",
          webSearchUsed: false,
          createdAt: startedAt,
        },
      ]);
      setPrompt("");
      setStartWorkPrompt("");

      // For a brand-new chat, switch to the conversation view right away so the
      // Owner sees their message and the thinking indicator immediately, instead
      // of waiting on the "new chat" screen for the whole reply. activeConversationId
      // was set above, so the requestedConversationId effect treats this as the
      // current chat and skips the reload that would wipe the optimistic bubbles.
      if (createdConversationId) {
        onDraftConversationStarted(createdConversationId);
      }

      // Voice prewarm: the moment the streaming reply completes its first
      // sentence, start generating that sentence's audio — by the time the
      // text finishes, the opening chunk is usually ready to play instantly.
      let voiceStreamed = "";
      let voicePrewarm: SpeechPrewarm | null = null;
      const wantsVoiceReply = Boolean(voiceAudioId) || voiceReplies;
      const maybePrewarmSpeech = (delta: string) => {
        if (
          !wantsVoiceReply ||
          voicePrewarm ||
          !voiceOutput ||
          (voiceOutput.engine !== "gemini" && voiceOutput.engine !== "local")
        ) {
          return;
        }
        voiceStreamed += delta;
        const split = firstSpeechChunk(cleanSpeechText(voiceStreamed));
        if (split) {
          voicePrewarm = {
            text: split.first,
            promise: synthesizeSpeech(split.first),
          };
          voicePrewarm.promise.catch(() => undefined);
        }
      };

      const response = await streamAskVaenyxMessage(
        conversationId,
        content,
        {
          signal: controller.signal,
          onOwner: (ownerMessage) =>
            setMessages((current) =>
              current.map((message) =>
                message.id === tempOwnerId ? ownerMessage : message,
              ),
            ),
          onDelta: (text) => {
            maybePrewarmSpeech(text);
            // The answer is arriving: the working status has served its
            // purpose. Thinking stays visible until the turn finishes.
            setStreamStatus(null);
            setMessages((current) =>
              current.map((message) =>
                message.id === tempAssistantId
                  ? { ...message, content: message.content + text }
                  : message,
              ),
            );
          },
          onStatus: (code) => setStreamStatus(code),
          onThinking: (text) =>
            setStreamThinking((current) => (current + text).slice(-4000)),
          // The reply's photo arrives before its words: hang it on the
          // pending bubble straight away.
          onEchoImage: (echoId) =>
            setMessages((current) =>
              current.map((message) =>
                message.id === tempAssistantId
                  ? { ...message, imageId: echoId }
                  : message,
              ),
            ),
        },
        suggestRoutineId,
        suggestTask,
        suggestCreate,
        clarifyCreateQuestion,
        voiceAudioId,
        imageId,
        drawPrompt,
        annotateRide,
        document
          ? {
              documentId: document.documentId,
              name: document.name,
              acknowledged: document.acknowledged,
            }
          : undefined,
      );

      // Voice replies: spoken in → spoken out ("我输入是语音,你的输出才是
      // 语音", Oskar 2026-07-28) — a voice turn answers aloud, a typed turn
      // stays text. The speaker toggle remains the explicit always-on opt-in.
      // The reply's own SpeakButton does the talking, so pause/stop are right
      // there on the message.
      if (voiceAudioId || voiceReplies) {
        const assistantReply = [...response.messages]
          .reverse()
          .find(
            (message) =>
              message.role === "assistant" && message.status === "completed",
          );
        if (assistantReply?.content) {
          setAutoSpeak({
            messageId: assistantReply.id,
            prewarm: voicePrewarm,
          });
        }
      }

      // The reply landed: build the described Method/Routine in the background
      // and post the confirmation note when it is saved (spec §2a).
      if (suggestCreate) {
        void buildFromChat(
          conversationId,
          suggestCreate,
          createDescription ?? content,
        );
      }
      if (editMethodId && editRequest) {
        void proposeRecipeEdit(conversationId, editMethodId, editRequest);
      }

      onConversationsChange(
        upsertConversation(nextConversations, response.conversation),
      );
      setMessages((current) => {
        const responseIds = new Set(response.messages.map((m) => m.id));
        return [
          ...current.filter(
            (message) =>
              message.id !== tempOwnerId &&
              message.id !== tempAssistantId &&
              !responseIds.has(message.id),
          ),
          ...response.messages,
        ];
      });
      void onWorkspaceRefresh();
    } catch (nextError) {
      if (nextError instanceof DOMException && nextError.name === "AbortError") {
        // Owner pressed Stop: keep the partial reply, mark it failed so the
        // Retry button appears. The server persisted the same partial text.
        setMessages((current) =>
          current.map((message) =>
            message.id === tempAssistantId
              ? { ...message, status: "failed" }
              : message,
          ),
        );
        void onWorkspaceRefresh();
      } else {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Vaenyx Chat could not send this message.",
        );
        setMessages((current) =>
          current.filter(
            (message) =>
              message.id !== tempOwnerId && message.id !== tempAssistantId,
          ),
        );
        // The turn usually FINISHED server-side (turns survive dropped
        // connections — a locked phone kills only the stream). Keep pulling
        // until the network is back, then swap the real reply in and clear
        // the error. Backs off; gives up quietly after ~15s.
        const reconcileId =
          createdConversationId ?? activeConversationId ?? preCreatedConversationId;
        if (reconcileId) {
          void (async () => {
            for (let attempt = 0; attempt < 4; attempt += 1) {
              await new Promise((resolveWait) =>
                window.setTimeout(resolveWait, 1500 * (attempt + 1)),
              );
              try {
                const fresh = await fetchAskVaenyxMessages(reconcileId);
                if (activeConversationIdRef.current === reconcileId) {
                  setMessages(fresh);
                  setError(null);
                }
                void fetchAskVaenyxConversations()
                  .then(onConversationsChange)
                  .catch(() => undefined);
                return;
              } catch {
                // Network still down; try again.
              }
            }
          })();
        }
      }
    } finally {
      streamControllerRef.current = null;
      setSending(false);
      // The workings vanish when the reply lands (or fails): the transcript
      // keeps only the answer.
      setStreamStatus(null);
      setStreamThinking("");
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = prompt.trim();
    if (
      !content &&
      !pendingImageId &&
      !pendingPhotoPreview &&
      !pendingDocument
    ) {
      return;
    }

    await sendChatContent(content);
  }

  // Find the owner question that preceded a failed assistant reply.
  function precedingOwnerContent(
    list: AskVaenyxMessage[],
    failedIndex: number,
  ): string | null {
    for (let index = failedIndex - 1; index >= 0; index -= 1) {
      const earlier = list[index];
      if (earlier && earlier.role === "owner") {
        return earlier.content;
      }
    }
    return null;
  }

  function retryChatMessage(failedIndex: number) {
    if (sending) return;
    const content = precedingOwnerContent(messages, failedIndex);
    if (content) {
      void sendChatContent(content);
    }
  }

  async function sendTaskContent(
    content: string,
    voiceAudioId?: string,
  ): Promise<void> {
    if (!focusedTaskId) return;
    const taskId = focusedTaskId;
    // The same pending attachments the chat composer fills, because it is the
    // same composer: one photo tray, one document tray, one place they are
    // cleared (Oskar, 2026-07-30).
    let imageId = pendingImageId ?? undefined;
    if (!imageId && pendingUploadRef.current) {
      try {
        imageId = await pendingUploadRef.current;
      } catch {
        // Upload failed: the toast already said so; send goes on without it.
      }
    }
    const document = pendingDocument;
    let trimmed = content.trim();
    if (!trimmed) {
      // A photo or a PDF on its own is a complete message here too.
      if (!imageId && !document) return;
      trimmed = document ? `(Document: ${document.name})` : "(Photo)";
    }
    clearPendingPhoto();
    setPendingDocument(null);

    setSendingTaskMessage(true);
    setError(null);
    const controller = new AbortController();
    streamControllerRef.current = controller;
    const tempOwnerId = `pending-owner-${crypto.randomUUID()}`;
    const tempAssistantId = `pending-assistant-${crypto.randomUUID()}`;
    const startedAt = new Date().toISOString();

    setTaskMessages((current) => [
      ...current,
      {
        id: tempOwnerId,
        conversationId: taskId,
        role: "owner",
        content: trimmed,
        status: "completed",
        webSearchUsed: false,
        createdAt: startedAt,
      },
      {
        id: tempAssistantId,
        conversationId: taskId,
        role: "assistant",
        content: "",
        status: "completed",
        webSearchUsed: false,
        createdAt: startedAt,
      },
    ]);

    try {
      const response = await streamTaskMessage(
        taskId,
        trimmed,
        {
        signal: controller.signal,
        onOwner: (ownerMessage) =>
          setTaskMessages((current) =>
            current.map((message) =>
              message.id === tempOwnerId ? ownerMessage : message,
            ),
          ),
        // Same watch-it-work channel the plain chat has — the task thread was
        // missed on the first pass (Oskar, 2026-07-27).
        onStatus: (code) => setStreamStatus(code),
        onThinking: (text) =>
          setStreamThinking((current) => (current + text).slice(-4000)),
        onDelta: (text) =>
          setTaskMessages((current) =>
            current.map((message) =>
              message.id === tempAssistantId
                ? { ...message, content: message.content + text }
                : message,
            ),
          ),
        },
        {
          ...(voiceAudioId ? { voiceAudioId } : {}),
          ...(imageId ? { imageId } : {}),
          ...(document
            ? {
                document: {
                  documentId: document.documentId,
                  name: document.name,
                  acknowledged: document.acknowledged,
                },
              }
            : {}),
        },
      );
      setTaskMessages((current) => {
        const responseIds = new Set(response.messages.map((m) => m.id));
        return [
          ...current.filter(
            (message) =>
              message.id !== tempOwnerId &&
              message.id !== tempAssistantId &&
              !responseIds.has(message.id),
          ),
          ...response.messages,
        ];
      });
      void onWorkspaceRefresh();
    } catch (nextError) {
      if (nextError instanceof DOMException && nextError.name === "AbortError") {
        setTaskMessages((current) =>
          current.map((message) =>
            message.id === tempAssistantId
              ? { ...message, status: "failed" }
              : message,
          ),
        );
        void onWorkspaceRefresh();
      } else {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Vaenyx could not send this task message.",
        );
        setTaskMessages((current) =>
          current.filter(
            (message) =>
              message.id !== tempOwnerId && message.id !== tempAssistantId,
          ),
        );
      }
    } finally {
      streamControllerRef.current = null;
      setSendingTaskMessage(false);
      setStreamStatus(null);
      setStreamThinking("");
    }
  }

  async function sendFocusedTaskMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!focusedTaskId) return;
    // No content check: a photo or a PDF on its own is a whole message, and
    // sendTaskContent works out what to call it.
    await sendTaskContent(taskPrompt.trim());
    setTaskPrompt("");
  }

  function retryTaskMessage(list: AskVaenyxMessage[], failedIndex: number) {
    if (sendingTaskMessage) return;
    // Two different failures wear the same bubble (Oskar, 2026-07-27). A reply
    // that failed RIGHT AFTER something the Owner typed is a chat failure —
    // resend that input. Anything else is a failed RUN (the 7am schedule): the
    // thing to retry is the task's own instruction, through the task runner,
    // which also moves the FAILED chip — the chat path never touches task
    // status, which is why retrying used to leave it red.
    const previous = failedIndex > 0 ? list[failedIndex - 1] : undefined;
    if (previous?.role === "owner") {
      void sendTaskContent(previous.content);
      return;
    }
    if (focusedTaskId) {
      void retryFocusedTask(focusedTaskId);
    }
  }

  // Stop the in-flight streaming reply. A dropped connection no longer stops
  // generation (a locked phone must still get its reply), so Stop tells the
  // server explicitly, then closes the local stream.
  // Stop means stop NOW (Oskar, 2026-07-29): the local turn is aborted first
  // — judge, stream, everything on this controller — and the screen returns to
  // idle in the same tick. Telling the server is best-effort and never
  // something the Owner waits on.
  function stopStreaming() {
    streamControllerRef.current?.abort();
    setStreamStatus(null);
    setStreamThinking("");
    setSending(false);
    setSendingTaskMessage(false);
    const key =
      sendingTaskMessage && focusedTaskId
        ? `task:${focusedTaskId}`
        : activeConversationId;
    if (key) void stopTurn(key).catch(() => undefined);
  }

  async function startWork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = startWorkPrompt.trim();
    if (!content && !pendingImageId) return;
    // Compose always opens a Chat now; new chats default to Unsorted. Work is
    // activated later from inside the chat ("Run as task"). See spec.md §2.
    await sendChatContent(content);
  }

  const activeConversation =
    conversations.find(
      (conversation) => conversation.id === activeConversationId,
    ) ?? null;
  const chatThreads = workspace.threads.filter((thread) => thread.kind === "chat");
  const activeThread =
    activeConversation === null
      ? null
      : chatThreads.find(
          (thread) => thread.conversationId === activeConversation.id,
        ) ?? null;

  function getThreadForTask(task: Task): VaenyxThread | null {
    return (
      workspace.threads.find(
        (thread) => thread.taskId === task.id || thread.id === task.threadId,
      ) ?? null
    );
  }

  function updateConversationTitleFromThread(updatedThread: VaenyxThread) {
    if (!updatedThread.conversationId) return;

    onConversationsChange(
      conversations.map((conversation) =>
        conversation.id === updatedThread.conversationId
          ? {
              ...conversation,
              title: updatedThread.title,
              updatedAt: updatedThread.updatedAt,
            }
          : conversation,
      ),
    );
  }

  async function renameThread(thread: VaenyxThread, title: string) {
    const nextTitle = title.trim();
    if (!nextTitle || nextTitle === thread.title) return;

    setError(null);

    try {
      const updatedThread = await updateVaenyxThreadTitle(thread.id, {
        title: nextTitle,
      });
      updateConversationTitleFromThread(updatedThread);
      await onWorkspaceRefresh();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not rename this item.",
      );
    }
  }

  async function moveThreadProject(
    thread: VaenyxThread,
    projectId: string | null,
  ) {
    setError(null);

    try {
      await updateVaenyxThreadProject(thread.id, { projectId });
      await onWorkspaceRefresh();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not move this item.",
      );
    }
  }

  async function setThreadStatus(
    thread: VaenyxThread,
    status: VaenyxThread["status"],
  ) {
    setError(null);

    try {
      await updateVaenyxThreadStatus(thread.id, { status });
      await onWorkspaceRefresh();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not update this item.",
      );
    }
  }

  async function applyTaskSchedule(
    taskId: string,
    cadence: "hourly" | "daily" | "weekly" | "monthly" | null,
    extra?: { time?: string; dayOfWeek?: number; dayOfMonth?: number },
  ): Promise<void> {
    setError(null);
    try {
      await setTaskSchedule(taskId, {
        cadence,
        enabled: cadence !== null,
        ...(extra?.time ? { time: extra.time } : {}),
        ...(extra?.dayOfWeek != null ? { dayOfWeek: extra.dayOfWeek } : {}),
        ...(extra?.dayOfMonth != null ? { dayOfMonth: extra.dayOfMonth } : {}),
      });
      await onWorkspaceRefresh();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not update the schedule.",
      );
    }
  }

  async function retryFocusedTask(taskId: string): Promise<void> {
    setError(null);
    try {
      await retryTask(taskId);
      await onWorkspaceRefresh();
      const runs = await fetchTaskRuns(taskId);
      setTaskRuns(runs);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not re-run this task.",
      );
    }
  }

  async function cancelFocusedTask(taskId: string): Promise<void> {
    setError(null);
    try {
      await cancelTask(taskId);
      await onWorkspaceRefresh();
      const runs = await fetchTaskRuns(taskId);
      setTaskRuns(runs);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not cancel this task.",
      );
    }
  }

  function renderSimpleCompose() {
    const newChatEffective =
      chatProviders.find((candidate) => candidate.id === newChatProviderId) ??
      chatProviders.find((candidate) => candidate.isDefault) ??
      null;
    const defaultCanAttach = VISION_DIRECT_IDS.includes(
      newChatEffective?.id ?? "",
    );
    const newChatModelChoices =
      newChatEffective && newChatEffective.kind !== "cli-login"
        ? MODEL_CHOICES[newChatEffective.id] ?? []
        : [];
    return (
      <div className="simple-compose-shell">
        <form className="simple-compose-panel" onSubmit={startWork}>
          <div className="simple-compose-header">
            <h2>Where should we begin?</h2>
          </div>

          <Composer
            attachDisabled={!defaultCanAttach}
            boxClassName="simple-compose-box"
            busy={sending}
            documentTray={pendingDocument}
            lang={lang}
            onDocument={(picked) => {
              if (picked.needsCostGate) {
                setDocumentGate(picked);
                return;
              }
              setPendingDocument({ ...picked, acknowledged: false });
            }}
            onPhoto={(id) => setPendingImageId(id)}
            onPhotoPreview={(url) => setPendingPhotoPreview(url || null)}
            onRemoveDocument={() => setPendingDocument(null)}
            onRemovePhoto={clearPendingPhoto}
            onSpoken={(text, audioId) => void sendChatContent(text, audioId)}
            onStop={stopStreaming}
            onSubmit={startWork}
            onTranscribed={(text) =>
              setStartWorkPrompt((current) =>
                current ? `${current}\n${text}` : text,
              )
            }
            onUploadStart={(upload) => {
              pendingUploadRef.current = upload;
            }}
            onValueChange={setStartWorkPrompt}
            photoTray={
              pendingPhotoPreview ??
              (pendingImageId ? `/v1/vision/image/${pendingImageId}` : null)
            }
            placeholder="Ask anything"
            showCamera={visionReady}
            showMic={voiceReady}
            submitLabel={sending ? "Sending" : "Send"}
            value={startWorkPrompt}
          />


          {!hasUsableModel ? (
            <div className="composer-status">
              <button
                className="composer-connect-hint"
                onClick={onOpenSettings}
                type="button"
              >
                {lang === "zh" ? "先连一个模型 →" : "Connect a model →"}
              </button>
            </div>
          ) : chatProviders.length > 1 ? (
            // Identical to the conversation composer's picker row (Oskar,
            // dev.159): backend · model version · reasoning level.
            <div className="composer-status">
              <select
                aria-label="Model"
                className="composer-level-select"
                onChange={(event) => {
                  setNewChatProviderId(event.target.value || null);
                  setNewChatModelName(null);
                }}
                title={t("legal.notice.modelPicker")}
                value={newChatProviderId ?? ""}
              >
                <option value="">
                  {chatProviders.find((provider) => provider.isDefault)?.name ??
                    "Codex"}{" "}
                  (Default)
                </option>
                {chatProviders
                  .filter((provider) => !provider.isDefault)
                  .map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
              </select>
              {newChatModelChoices.length > 0 && newChatEffective ? (
                <>
                  <span aria-hidden="true" className="composer-sep">
                    ·
                  </span>
                  <select
                    aria-label="Model version"
                    className="composer-level-select"
                    onChange={(event) =>
                      setNewChatModelName(event.target.value || null)
                    }
                    value={newChatModelName ?? ""}
                  >
                    <option value="">
                      {newChatEffective.model ?? "provider default"} (Default)
                    </option>
                    {newChatModelChoices
                      .filter((choice) => choice !== newChatEffective.model)
                      .map((choice) => (
                        <option key={choice} value={choice}>
                          {choice}
                        </option>
                      ))}
                  </select>
                </>
              ) : null}
              <span aria-hidden="true" className="composer-sep">
                ·
              </span>
              <select
                aria-label="Reasoning level"
                className="composer-level-select"
                onChange={(event) =>
                  setNewChatEffort(event.target.value as ReasoningEffort)
                }
                value={newChatEffort ?? "medium"}
              >
                <option value="low">Fast</option>
                <option value="medium">Balanced</option>
                <option value="high">Deep</option>
              </select>
            </div>
          ) : null}

          {/* The home screen is a composer too, and the copy pack puts this
              line ON the composer, persistently. It was on the open chat and
              never on the screen every session starts at. */}
          <p className="composer-disclaimer">
            {t("legal.disclaimer.aiGeneral.composer")}
          </p>

          {error ? <p className="form-error">{error}</p> : null}
        </form>
      </div>
    );
  }

  if (view === "new") {
    return renderSimpleCompose();
  }

  const focusedTask =
    focusedTaskId === null
      ? null
      : workspace.tasks.find((task) => task.id === focusedTaskId) ?? null;
  const focusedTaskThread =
    focusedTask === null ? null : getThreadForTask(focusedTask);

  function renderThreadHeaderMenu(thread: VaenyxThread | null) {
    if (!thread) return null;

    return (
      <ThreadActionsMenu
        projects={workspace.projects}
        thread={thread}
        onMoveThreadProject={(nextThread, nextProjectId) =>
          void moveThreadProject(nextThread, nextProjectId)
        }
        onRenameThread={(nextThread, nextTitle) =>
          void renameThread(nextThread, nextTitle)
        }
        onSetThreadStatus={(nextThread, status) =>
          void setThreadStatus(nextThread, status)
        }
      />
    );
  }

  function renderChatSurface(mode: "embedded" | "focused") {
    const isRoutine = Boolean(activeThread?.routineId);
    const activeRoutine = activeThread?.routineId
      ? libraryRoutines.find(
          (routine) => routine.id === activeThread.routineId,
        ) ?? null
      : null;
    // Header chips (spec §2a): same real-state chips as the sidebar, but the
    // Routine chip shows the Routine's actual name, and an in-flight build adds
    // a Building chip alongside the in-conversation banner.
    const chatChips: ThreadChip[] = activeThread
      ? threadStatusChips(activeThread, workspace.tasks).map((chip) =>
          chip.tone === "routine" && activeRoutine
            ? { ...chip, label: activeRoutine.name }
            : chip,
        )
      : [];
    if (building && building.conversationId === activeConversationId) {
      chatChips.push({ key: "building", label: "Building…", tone: "building" });
    }
    const chatDomain = activeRoutine ? routineDomain(activeRoutine.tags) : null;
    const domainDisclaimer =
      chatDomain === "health"
        ? t("legal.disclaimer.health.banner")
        : chatDomain === "finance"
          ? t("legal.disclaimer.finance")
          : chatDomain === "legal"
            ? t("legal.disclaimer.legal")
            : null;
    // The routine chat timeline: fed-in notes (Journal) + results (Gallery),
    // oldest first so it reads like a conversation.
    const timeline = [
      ...routineJournal.map((entry) => ({
        kind: "journal" as const,
        at: entry.createdAt,
        id: entry.id,
        entry,
      })),
      ...routineGallery.map((item) => ({
        kind: "gallery" as const,
        at: item.createdAt,
        id: item.id,
        item,
      })),
    ].sort((a, b) => a.at.localeCompare(b.at));

    // Friendly-input confirm card: required fields still blank (booleans always
    // count as filled).
    // The tools contract, visible (Oskar's tools plan, 2026-07-28): a Routine
    // declares what it plugs into; the app answers with one of three truths —
    // ready, needs setting up (jump to Tools), or "Vaenyx does not have this
    // tool yet" with the suggestion channel. Never a silent failure.
    // The seven words, and only these (Oskar, 2026-07-31: 所有地方用词统一).
    // The server migrates the old names before they ever reach here, so this
    // map never needs to know what a capability used to be called.
    const knownToolStatus: Record<string, { label: string; ready: boolean }> = {
      hearing: {
        label: lang === "zh" ? "听" : "Hearing",
        ready: voiceReady,
      },
      // Speaking always works — the device voice is the floor.
      speaking: { label: lang === "zh" ? "念" : "Speaking", ready: true },
      vision: {
        label: lang === "zh" ? "看" : "Vision",
        ready: visionReady,
      },
      drawing: {
        label: lang === "zh" ? "画" : "Drawing",
        ready: imageEngineReady,
      },
      reading: {
        label: lang === "zh" ? "读文档" : "Reading",
        ready: visionReady,
      },
      // Built for Chat, but a ROUTINE step does not carry it yet — the step
      // runner has no way to hand a Method the grant. Never "ready" here, so a
      // Routine declaring it says so instead of failing halfway.
      fetching: {
        label: lang === "zh" ? "取文件" : "Fetching",
        ready: false,
      },
      web: { label: lang === "zh" ? "上网" : "Web", ready: true },
    };
    const toolNotices: { kind: "unknown" | "setup"; name: string }[] = [];
    for (const capability of activeRoutine?.capabilities ?? []) {
      const known = knownToolStatus[capability];
      if (!known) toolNotices.push({ kind: "unknown", name: capability });
      else if (!known.ready) {
        toolNotices.push({ kind: "setup", name: known.label });
      }
    }

    const confirmMissing = routineInputConfirm
      ? routineInputConfirm.fields
          .filter((field) => {
            if (!field.required || field.type === "boolean") return false;
            // Photo mode: the primary field is fed by the marks, so it counts
            // as filled while at least one mark has a name.
            if (
              routineInputConfirm.marks &&
              field.key === routineInputConfirm.primaryKey
            ) {
              return !routineInputConfirm.marks.some((item) =>
                item.name.trim(),
              );
            }
            return (routineInputConfirm.values[field.key] ?? "").trim() === "";
          })
          .map((field) => field.key)
      : [];

    return (
      <section
        className={
          mode === "focused"
            ? "ask-vaenyx-chat focused-chat"
            : "ask-vaenyx-chat"
        }
      >
        {/* A deep link (notification, refresh) must go splash → conversation
            with nothing in between. The splash covers ONLY the chat area — the
            first version covered the whole viewport, which over Tailscale on a
            phone read as "the app takes seconds to open" (Oskar, 2026-07-28):
            the sidebar and navigation are usable instantly, only the loading
            conversation hides its half-built frame. splashExpired is the
            4-second cap, so a hung fetch can never brick the screen. */}
        {loadingMessages && messages.length === 0 && !splashExpired ? (
          <div className="loading-screen chat-splash">
            <div>
              <img alt="Vaenyx" className="brand-mark brand-mark-img" src="/vaenyx-mark.svg" />
              <p>{lang === "zh" ? "正在打开对话…" : "Opening the chat…"}</p>
            </div>
          </div>
        ) : null}
        <header className="ask-vaenyx-chat-header">
          <div className="focused-title-line">
            <h2>{activeConversation?.title?.trim() || "Vaenyx Chat"}</h2>
            <ThreadChipRow
              chips={chatChips}
              className="chat-chips chat-chips--inline"
            />
            <div className="chat-header-actions">
              {renderThreadHeaderMenu(activeThread)}
            </div>
          </div>
          {isRoutine ? (
            <div className="capability-bar">
              {(["chat", "journal", "gallery"] as const).map((tab) => (
                <button
                  className={
                    capabilityTab === tab
                      ? "capability-tab capability-tab--active"
                      : "capability-tab"
                  }
                  key={tab}
                  onClick={() => setCapabilityTab(tab)}
                  type="button"
                >
                  {tab === "chat"
                    ? "Chat"
                    : tab === "journal"
                      ? "Journal"
                      : "Gallery"}
                </button>
              ))}
            </div>
          ) : null}
        </header>

        {/* What this Routine needs, drawn. A dimmed chip is the same shape, not
            a different one: it says "you have this off / Vaenyx has not got it
            yet", never "something is broken". */}
        {activeRoutine?.capabilities?.length ? (
          <CapabilityChips
            items={activeRoutine.capabilities}
            lang={lang}
            unavailable={activeRoutine.capabilities.filter(
              (capability) => !knownToolStatus[capability]?.ready,
            )}
          />
        ) : null}
        {toolNotices.length > 0 ? (
          <div className="tool-notices">
            {toolNotices.map((notice) =>
              notice.kind === "setup" ? (
                <p className="tool-notice" key={`setup-${notice.name}`}>
                  {lang === "zh"
                    ? `这个 Routine 需要「${notice.name}」工具,还没配置。`
                    : `This Routine needs the ${notice.name} tool — not set up yet.`}
                  <button
                    className="text-button"
                    onClick={() => {
                      try {
                        localStorage.setItem("vaenyx.toolsIntent", "1");
                      } catch {
                        // Storage blocked: settings still opens, just unscrolled.
                      }
                      onOpenSettings();
                    }}
                    type="button"
                  >
                    {lang === "zh" ? "去配置" : "Set It Up"}
                  </button>
                </p>
              ) : (
                <p className="tool-notice" key={`unknown-${notice.name}`}>
                  {lang === "zh"
                    ? `这个 Routine 需要「${notice.name}」,Vaenyx 还没有这个工具。想要它?告诉我们:`
                    : `This Routine needs "${notice.name}" — Vaenyx does not have that tool yet. Want it? Tell us:`}{" "}
                  <a
                    href="https://vaenyx.ai/discord"
                    rel="noopener"
                    target="_blank"
                  >
                    Discord
                  </a>{" "}
                  · <a href="mailto:hello@vaenyx.ai">hello@vaenyx.ai</a>
                </p>
              ),
            )}
          </div>
        ) : null}

        {/* B4: the Owner approves an edit by reading it, so the changed lines
            are shown against the current recipe — never a rewritten whole.
            Applying writes recipe.md only, and never publishes: a publication
            is a separate acceptance of the Contributor Agreement, and an edit
            that published itself would make those warranties for the Owner
            without asking (ToS 7.2(d), copy pack G5). */}
        {recipeEdit ? (
          <Modal
            onClose={() => setRecipeEdit(null)}
            title={recipeEdit.draft.methodName}
            variant="doc"
          >
            <p className="settings-card-copy">{t("legal.notice.method.edit")}</p>
            <div className="recipe-diff">
              {recipeEdit.draft.diff.map((line, index) => (
                <div
                  className={`recipe-diff-line ${line.kind}`}
                  key={`${index}-${line.kind}`}
                >
                  <span className="recipe-diff-mark">
                    {line.kind === "added"
                      ? "+"
                      : line.kind === "removed"
                        ? "−"
                        : " "}
                  </span>
                  <span>{line.text || " "}</span>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button
                className="text-button"
                onClick={() => setRecipeEdit(null)}
                type="button"
              >
                {t("routine.confirm.cancel")}
              </button>
              <button
                className="primary-button"
                disabled={applyingEdit}
                onClick={() => void applyRecipeEdit()}
                type="button"
              >
                {applyingEdit ? "…" : t("method.edit.apply")}
              </button>
            </div>
          </Modal>
        ) : null}

        {/* M1 — the document cost gate. Full-screen and blocking, never a
            toast and never small print (private + Oskar: it has to be
            impossible to miss). The page count is the file's REAL count, and
            neither choice is preselected. */}
        {documentGate ? (
          <div className="document-gate" role="dialog" aria-modal="true">
            <div className="document-gate-card">
              <p className="eyebrow">{t("document.gate.title")}</p>
              <h2>{documentGate.name}</h2>
              {t("legal.gate.document.pageCost")
                .replace("{n}", String(documentGate.pages))
                .split("\n\n")
                .map((paragraph, index) => (
                  <p className="document-gate-copy" key={index}>
                    {paragraph.replace(/\*\*/g, "")}
                  </p>
                ))}
              <div className="document-gate-actions">
                <button
                  className="secondary-button"
                  onClick={() => {
                    setPendingDocument({
                      documentId: documentGate.documentId,
                      name: documentGate.name,
                      pages: documentGate.pages,
                      acknowledged: true,
                    });
                    setDocumentGate(null);
                  }}
                  type="button"
                >
                  {t("document.gate.read")}
                </button>
                <button
                  className="secondary-button"
                  onClick={() => setDocumentGate(null)}
                  type="button"
                >
                  {t("document.gate.cancel")}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {routineInputConfirm ? (
          <Modal
            onClose={() => setRoutineInputConfirm(null)}
            title={t("routine.confirm.title")}
          >
            <p className="settings-card-copy">{t("routine.confirm.copy")}</p>
            {/* Photo mode (visual first): the marked photo IS the primary
                field — rename / add / remove marks on the picture itself.
                The other fields are secondary and stay compact. */}
            {routineInputConfirm.marks && routineInputConfirm.imageId ? (
              <AnnotatedPhotoEditor
                imageId={routineInputConfirm.imageId}
                marks={routineInputConfirm.marks}
                onChange={(next) =>
                  setRoutineInputConfirm((current) =>
                    current ? { ...current, marks: next } : current,
                  )
                }
              />
            ) : null}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                margin: "10px 0",
              }}
            >
              {routineInputConfirm.fields
                .filter(
                  (field) =>
                    !(
                      routineInputConfirm.marks &&
                      field.key === routineInputConfirm.primaryKey
                    ),
                )
                .map((field) => (
                <label
                  className={
                    routineInputConfirm.marks ? "confirm-compact" : undefined
                  }
                  key={field.key}
                  style={{ display: "flex", flexDirection: "column", gap: "4px" }}
                >
                  <span className="eyebrow" style={{ margin: 0 }}>
                    {field.key}
                    {field.required ? " *" : ""}
                  </span>
                  {field.description ? (
                    <span
                      className="settings-card-copy"
                      style={{ margin: 0, opacity: 0.75 }}
                    >
                      {field.description}
                    </span>
                  ) : null}
                  {field.type === "boolean" ? (
                    <input
                      checked={routineInputConfirm.checks[field.key] === true}
                      onChange={(event) =>
                        setRoutineInputConfirm((current) =>
                          current
                            ? {
                                ...current,
                                checks: {
                                  ...current.checks,
                                  [field.key]: event.target.checked,
                                },
                              }
                            : current,
                        )
                      }
                      type="checkbox"
                    />
                  ) : (
                    <textarea
                      onChange={(event) =>
                        setRoutineInputConfirm((current) =>
                          current
                            ? {
                                ...current,
                                values: {
                                  ...current.values,
                                  [field.key]: event.target.value,
                                },
                              }
                            : current,
                        )
                      }
                      placeholder={
                        field.type === "array"
                          ? t("routine.confirm.onePerLine")
                          : ""
                      }
                      rows={
                        routineInputConfirm.marks
                          ? 1
                          : field.type === "array"
                            ? 3
                            : 2
                      }
                      value={routineInputConfirm.values[field.key] ?? ""}
                    />
                  )}
                </label>
              ))}
            </div>
            {confirmMissing.length > 0 ? (
              <p className="settings-card-copy">
                {t("routine.confirm.missing")} {confirmMissing.join(", ")}
              </p>
            ) : null}
            <div className="modal-actions">
              <button
                className="text-button"
                onClick={() => setRoutineInputConfirm(null)}
                type="button"
              >
                {t("routine.confirm.cancel")}
              </button>
              <button
                className="secondary-button"
                disabled={confirmMissing.length > 0 || sending}
                onClick={confirmRoutineInput}
                type="button"
              >
                {t("routine.confirm.run")}
              </button>
            </div>
          </Modal>
        ) : null}

        {domainDisclaimer ? (
          <p
            className={`context-disclaimer ${
              chatDomain === "health" ? "health" : ""
            }`}
          >
            {domainDisclaimer}
          </p>
        ) : null}
        {chatDomain === "health" && !healthAck && !healthGateDismissed ? (
          <Modal
            onClose={() => setHealthGateDismissed(true)}
            title={t("legal.disclaimer.health.gateTitle")}
          >
            <p className="settings-card-copy">
              {t("legal.disclaimer.health.gateBody")}
            </p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                className="primary-button"
                onClick={() => {
                  localStorage.setItem(
                    `vaenyx-health-ack-${LEGAL_CONSENT_FLOOR}`,
                    "1",
                  );
                  setHealthAck(true);
                  void recordLegalAck({
                    keyName: "legal.disclaimer.health.gate",
                    copyVersion: LEGAL_COPY_VERSION,
                    language: lang,
                    choice: "accepted",
                  }).catch(() => {});
                }}
                type="button"
              >
                {t("legal.disclaimer.health.gateAccept")}
              </button>
              <button
                className="secondary-button"
                onClick={() => setHealthGateDismissed(true)}
                type="button"
              >
                {t("legal.disclaimer.health.gateCancel")}
              </button>
            </div>
          </Modal>
        ) : null}

        <div
          className="ask-vaenyx-messages"
          onTouchEnd={() => void handleMessagesPullEnd()}
          onTouchMove={handleMessagesPullMove}
          onTouchStart={handleMessagesPullStart}
        >
          {pullReady ? (
            <p className="pull-refresh-hint">
              {lang === "zh" ? "松手刷新这个对话" : "Release to refresh this chat"}
            </p>
          ) : null}
          {isRoutine ? (
            capabilityTab === "journal" ? (
              routineJournal.length === 0 ? (
                <div className="empty-state">
                  <strong>Nothing fed in yet</strong>
                  <p>What you send to this routine shows up here.</p>
                </div>
              ) : (
                routineJournal.map((entry) => (
                  <article
                    className="ask-vaenyx-message owner completed"
                    key={entry.id}
                  >
                    <div className="ask-vaenyx-message-head">
                      <strong>You</strong>
                      <small>{formatTime(entry.createdAt)}</small>
                    </div>
                    <p>{journalText(entry.content)}</p>
                  </article>
                ))
              )
            ) : capabilityTab === "gallery" ? (
              routineGallery.length === 0 ? (
                <div className="empty-state">
                  <strong>No results yet</strong>
                  <p>Run the routine and its results collect here.</p>
                </div>
              ) : (
                <div className="routine-gallery-grid">
                  {routineGallery.map((item) => (
                    <article className="routine-gallery-card" key={item.id}>
                      <small>{formatTime(item.createdAt)}</small>
                      <RoutineResultView
                        output={item.output}
                        view={activeRoutine?.view}
                      />
                    </article>
                  ))}
                </div>
              )
            ) : timeline.length === 0 && !sending ? (
              <div className="empty-state">
                <strong>Feed this routine</strong>
                <p>
                  Type a note below — the result appears here and in the Gallery.
                </p>
              </div>
            ) : (
              <>
                {timeline.map((node) =>
                  node.kind === "journal" ? (
                    <article
                      className="ask-vaenyx-message owner completed"
                      key={node.id}
                    >
                      <div className="ask-vaenyx-message-head">
                        <strong>You</strong>
                        <small>{formatTime(node.at)}</small>
                      </div>
                      {/* A fed photo stays a photo — with the same mark
                          button as chat photos (visual first). */}
                      {node.entry.imageId ? (
                        <AnnotatedPhoto
                          annotations={node.entry.imageAnnotations ?? null}
                          imageId={node.entry.imageId}
                          onLoad={reanchorAfterImageLoad}
                        />
                      ) : null}
                      <p>{journalText(node.entry.content)}</p>
                    </article>
                  ) : (
                    <article
                      className="ask-vaenyx-message assistant completed"
                      key={node.id}
                    >
                      <div className="ask-vaenyx-message-head">
                        <strong>Vaenyx</strong>
                        <small>{formatTime(node.at)}</small>
                      </div>
                      <RoutineResultView
                        output={node.item.output}
                        view={activeRoutine?.view}
                      />
                      {/* THE speech element on results too: tap speaks a short
                          digest; a voice-fed run starts it by itself. */}
                      <div className="message-footer">
                        <span aria-hidden="true">✓</span>
                        {formatTime(node.at)}
                        <SpeakButton
                          autoStart={autoSpeakGalleryId === node.item.id}
                          className="message-speak"
                          engine={voiceOutput?.engine ?? "browser"}
                          onAutoConsumed={() => setAutoSpeakGalleryId(null)}
                          text={spokenResultText(
                            node.item.output,
                            activeRoutine?.view,
                          )}
                        />
                      </div>
                    </article>
                  ),
                )}
                {sending ? (
                  <article className="ask-vaenyx-message assistant completed">
                    <div className="ask-vaenyx-message-head">
                      <strong>Vaenyx</strong>
                    </div>
                    <ThinkingIndicator />
                  </article>
                ) : null}
              </>
            )
          ) : loadingMessages ? (
            <div className="empty-state">
              <strong>Loading chat</strong>
              <p>One moment.</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="empty-state">
              <strong>Start with any question</strong>
              <p>Vaenyx Chat will answer through your ChatGPT / Codex login.</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <article
                className={`ask-vaenyx-message ${message.role} ${message.status}`}
                id={`message-${message.id}`}
                key={message.id}
              >
                {/* Name only: the time lives at the bottom of the message,
                    where the ✓ is (Oskar, 2026-07-29 — two timestamps on one
                    message is one too many). */}
                <div className="ask-vaenyx-message-head">
                  <strong>{message.role === "owner" ? "You" : agentName}</strong>
                </div>
                {message.documentId ? (
                  <div className="message-document">
                    <IconDocument />
                    <span className="composer-document-name">
                      {message.documentName ?? "document"}
                    </span>
                    {message.documentPages ? (
                      <span className="text-faint">
                        {t("document.pages").replace(
                          "{n}",
                          String(message.documentPages),
                        )}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {message.imageId ? (
                  <AnnotatedPhoto
                    annotations={message.imageAnnotations ?? null}
                    imageId={message.imageId}
                    onLoad={reanchorAfterImageLoad}
                  />
                ) : null}
                {/* F5's promise, kept: the exact prompt that went to the image
                    provider sits beside the picture — the main model wrote it,
                    so it can contain words the Owner never typed. */}
                {message.imageId && message.imagePrompt ? (
                  <p className="sent-prompt">
                    {lang === "zh" ? "发送的 prompt:" : "Prompt sent: "}
                    {message.imagePrompt}
                  </p>
                ) : null}
                {message.voice && message.role === "owner" ? (
                  <div className="voice-bubble">
                    <p>{message.content}</p>
                    <SpeakButton
                      audioId={message.audioId}
                      text={message.content}
                    />
                  </div>
                ) : message.role === "owner" ? (
                  <p>{message.content}</p>
                ) : message.content ? (
                  <MarkdownMessage content={message.content} />
                ) : (
                  <ThinkingIndicator />
                )}
                {message.webSearchUsed ? (
                  <span className="web-search-chip">Web search used</span>
                ) : null}
                {message.role !== "owner" && message.status === "failed" ? (
                  <button
                    className="retry-button"
                    disabled={sending}
                    onClick={() => retryChatMessage(index)}
                    type="button"
                  >
                    Retry
                  </button>
                ) : null}
                {message.role === "owner" ? (
                  <div className="message-footer message-footer--owner">
                    {formatTime(message.createdAt)}
                  </div>
                ) : null}
                {message.role !== "owner" &&
                message.content &&
                message.status !== "failed" &&
                !message.id.startsWith("pending-assistant") ? (
                  <div className="message-footer">
                    <span aria-hidden="true">✓</span>
                    {formatTime(message.createdAt)}
                    <SpeakButton
                      autoStart={autoSpeak?.messageId === message.id}
                      className="message-speak"
                      engine={voiceOutput?.engine ?? "browser"}
                      onAutoConsumed={() => setAutoSpeak(null)}
                      prewarm={
                        autoSpeak?.messageId === message.id
                          ? autoSpeak.prewarm
                          : null
                      }
                      text={message.content}
                    />
                  </div>
                ) : null}
              </article>
            ))
          )}
          {/* The live workings: status + thinking while the reply is made,
              gone the moment it lands. */}
          {sending && (streamStatus || streamThinking) ? (
            <div className="thinking-block">
              {streamStatus ? (
                <p className="thinking-status">{statusLabel(streamStatus)}</p>
              ) : null}
              {streamThinking ? (
                <p className="thinking-text">{streamThinking}</p>
              ) : null}
            </div>
          ) : null}
          <div className="chat-end-anchor" ref={chatEndRef} />
        </div>
        <JumpToLatest
          resetKey={activeConversationId ?? ""}
          targetRef={chatEndRef}
        />

        {building && building.conversationId === activeConversationId ? (
          <div className="chat-create-offer">
            <span>
              {building.kind === "method"
                ? "⏳ Building the Method in the background — the confirmation will appear here."
                : "⏳ Building the Routine in the background — the confirmation will appear here."}
            </span>
          </div>
        ) : null}

        <form className="ask-vaenyx-composer" onSubmit={sendMessage}>
        <Composer
          busy={sending}
          documentTray={pendingDocument}
          lang={lang}
          onDocument={(picked) => {
            if (picked.needsCostGate) {
              // The gate stands BEFORE the file is attached: nothing can be
              // sent, and nothing spent, until it is answered.
              setDocumentGate(picked);
              return;
            }
            setPendingDocument({ ...picked, acknowledged: false });
          }}
          onPhoto={(id) => setPendingImageId(id)}
          onPhotoPreview={(url) => setPendingPhotoPreview(url || null)}
          onRemoveDocument={() => setPendingDocument(null)}
          onRemovePhoto={clearPendingPhoto}
          onSpoken={(text, audioId) => void sendChatContent(text, audioId)}
          onStop={stopStreaming}
          onSubmit={sendMessage}
          onTranscribed={(text) =>
            setPrompt((current) => (current ? `${current}\n${text}` : text))
          }
          onUploadStart={(upload) => {
            pendingUploadRef.current = upload;
          }}
          onValueChange={setPrompt}
          photoTray={
            pendingPhotoPreview ??
            (pendingImageId ? `/v1/vision/image/${pendingImageId}` : null)
          }
          placeholder={isRoutine ? "Type or paste a note…" : "Ask anything"}
          showCamera={visionReady}
          showMic={voiceReady}
          submitLabel={isRoutine ? "Run" : "Send"}
          value={prompt}
        >
          <div className="composer-status">
            {chatProviders.length > 1 ? (
              <select
                aria-label="Model"
                className="composer-level-select"
                disabled={!activeConversationId}
                onChange={(event) => {
                  const next = event.target.value || null;
                  if (!activeConversationId) return;
                  onConversationsChange(
                    conversations.map((conversation) =>
                      conversation.id === activeConversationId
                        ? // A provider switch also clears the pinned model —
                          // model ids don't transfer between providers.
                          { ...conversation, modelProviderId: next, modelName: null }
                        : conversation,
                    ),
                  );
                  void setChatProvider(activeConversationId, next);
                  void setChatModel(activeConversationId, null);
                }}
                title={t("legal.notice.modelPicker")}
                value={activeConversation?.modelProviderId ?? ""}
              >
                {/* The default backend IS the empty choice — one entry,
                    marked inline, never listed twice (Oskar, dev.159). */}
                <option value="">
                  {chatProviders.find((provider) => provider.isDefault)?.name ??
                    "Codex"}{" "}
                  (Default)
                </option>
                {chatProviders
                  .filter((provider) => !provider.isDefault)
                  .map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
              </select>
            ) : hasUsableModel ? (
              <span className="composer-model">
                {chatProviders[0]?.name ?? "ChatGPT"}
              </span>
            ) : (
              // Skipped the first-run step (or the model stopped working):
              // say so honestly and go straight to where it is fixed.
              <button
                className="composer-connect-hint"
                onClick={onOpenSettings}
                type="button"
              >
                {lang === "zh" ? "先连一个模型 →" : "Connect a model →"}
              </button>
            )}
            {(() => {
              // "Model within the provider": a second picker with a curated
              // shortlist for the conversation's effective (pinned or default)
              // provider. Codex has no picker — it is a single-login backend.
              const effective =
                chatProviders.find(
                  (provider) =>
                    provider.id === activeConversation?.modelProviderId,
                ) ??
                chatProviders.find((provider) => provider.isDefault) ??
                null;
              const choices = effective
                ? MODEL_CHOICES[effective.id] ?? []
                : [];
              if (!effective || effective.kind === "cli-login" || choices.length === 0) {
                return null;
              }
              return (
                <>
                  <span aria-hidden="true" className="composer-sep">
                    ·
                  </span>
                  <select
                    aria-label="Model version"
                    className="composer-level-select"
                    disabled={!activeConversationId}
                    onChange={(event) => {
                      const next = event.target.value || null;
                      if (!activeConversationId) return;
                      onConversationsChange(
                        conversations.map((conversation) =>
                          conversation.id === activeConversationId
                            ? { ...conversation, modelName: next }
                            : conversation,
                        ),
                      );
                      void setChatModel(activeConversationId, next);
                    }}
                    value={activeConversation?.modelName ?? ""}
                  >
                    <option value="">
                      {effective.model ?? "provider default"} (Default)
                    </option>
                    {choices
                      .filter((choice) => choice !== effective.model)
                      .map((choice) => (
                        <option key={choice} value={choice}>
                          {choice}
                        </option>
                      ))}
                  </select>
                </>
              );
            })()}
            <span aria-hidden="true" className="composer-sep">
              ·
            </span>
            <select
              aria-label="Reasoning level"
              className="composer-level-select"
              disabled={!activeConversationId}
              onChange={(event) => {
                const next = event.target.value as ReasoningEffort;
                if (!activeConversationId) return;
                onConversationsChange(
                  conversations.map((conversation) =>
                    conversation.id === activeConversationId
                      ? { ...conversation, reasoningEffort: next }
                      : conversation,
                  ),
                );
                void setReasoningEffort(activeConversationId, next);
              }}
              value={activeConversation?.reasoningEffort ?? "medium"}
            >
              <option value="low">Fast</option>
              <option value="medium">Balanced</option>
              <option value="high">Deep</option>
            </select>
            <span aria-hidden="true" className="composer-sep">
              ·
            </span>
            {/* (The always-read-aloud toggle used to live here. It was a
                crossed-out speaker nobody could read, and it contradicts the
                rule that replaced it: spoken in → spoken out, plus a speak
                button on every message. Removed 2026-07-29.) */}
          </div>
          <p className="composer-disclaimer">
            {t("legal.disclaimer.aiGeneral.composer")}
          </p>
          {error ? <p className="form-error">{error}</p> : null}
        </Composer>
        </form>

      </section>
    );
  }

  if (view === "chat") {
    return <div className="focused-workspace">{renderChatSurface("focused")}</div>;
  }

  if (view === "task") {
    if (!focusedTask) {
      return (
        <div className="focused-workspace">
          <section className="focused-task-panel">
            <div className="empty-state">
              <strong>Task not found</strong>
              <p>This task may have been moved or archived.</p>
            </div>
          </section>
        </div>
      );
    }

    const agentName = getTaskAgentDisplayName(
      workspace.agents,
      focusedTask.agent,
    );
    const visibleTaskMessages =
      taskMessages.length > 0
        ? taskMessages
        : [
            {
              id: `${focusedTask.id}-request`,
              conversationId: focusedTask.id,
              role: "owner" as const,
              content: focusedTask.request,
              status: "completed" as const,
              webSearchUsed: false,
              createdAt: focusedTask.createdAt,
            },
            {
              id: `${focusedTask.id}-result`,
              conversationId: focusedTask.id,
              role: "assistant" as const,
              content: focusedTask.result,
              status:
                focusedTask.status === "failed"
                  ? ("failed" as const)
                  : ("completed" as const),
              webSearchUsed: false,
              createdAt: focusedTask.completedAt ?? focusedTask.createdAt,
            },
          ];

    // Task-view chips (spec §2a): run state + Scheduled, read from the Task
    // itself. The sidebar light collapses waiting/running into one "working"
    // hue; here the label distinguishes them.
    const taskChips: ThreadChip[] = [
      focusedTask.status === "completed"
        ? { key: "state", label: "Done", tone: "done" as const }
        : focusedTask.status === "failed"
          ? { key: "state", label: "Failed", tone: "failed" as const }
          : {
              key: "state",
              label: focusedTask.status === "running" ? "Working" : "Waiting",
              tone: "working" as const,
            },
    ];
    if (focusedTask.scheduleEnabled && focusedTask.scheduleCadence) {
      taskChips.push({
        key: "scheduled",
        // Short forms (Oskar, 2026-07-30): a chip is a marker, not a sentence,
        // and the full words pushed the phone header onto extra rows. The hover
        // title still spells the schedule out in full.
        label: "SCHED",
        tone: "scheduled",
        title: describeSchedule(focusedTask),
      });
    }

    return (
      <div className="focused-workspace">
        <section className="ask-vaenyx-chat focused-task-panel">
          <header className="ask-vaenyx-chat-header">
            <div className="focused-task-title">
              <div className="focused-title-line">
                <h2>{focusedTask.title}</h2>
                <ThreadChipRow
                  chips={taskChips}
                  className="chat-chips chat-chips--inline"
                />
                <div className="chat-header-actions">
                  {renderThreadHeaderMenu(focusedTaskThread)}
                </div>
              </div>
              {focusedTask.harness === "codex-harness" ? (
                <div className="task-toolbar">
                  <select
                    aria-label="Schedule"
                    className="task-select"
                    onChange={(event) =>
                      void applyTaskSchedule(
                        focusedTask.id,
                        (event.target.value || null) as
                          | "hourly"
                          | "daily"
                          | "weekly"
                          | "monthly"
                          | null,
                        {
                          time: focusedTask.scheduleTime ?? "09:00",
                          dayOfWeek: focusedTask.scheduleDayOfWeek ?? 1,
                          dayOfMonth: focusedTask.scheduleDayOfMonth ?? 1,
                        },
                      )
                    }
                    value={
                      focusedTask.scheduleEnabled
                        ? focusedTask.scheduleCadence ?? ""
                        : ""
                    }
                  >
                    {SCHEDULE_OPTIONS.map((option) => (
                      <option key={option.label} value={option.value ?? ""}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {focusedTask.scheduleEnabled &&
                  focusedTask.scheduleCadence &&
                  focusedTask.scheduleCadence !== "hourly" ? (
                    <input
                      aria-label="Time of day"
                      className="schedule-time-input"
                      onChange={(event) =>
                        void applyTaskSchedule(
                          focusedTask.id,
                          focusedTask.scheduleCadence,
                          {
                            time: event.target.value || "09:00",
                            dayOfWeek: focusedTask.scheduleDayOfWeek ?? 1,
                            dayOfMonth: focusedTask.scheduleDayOfMonth ?? 1,
                          },
                        )
                      }
                      type="time"
                      value={focusedTask.scheduleTime ?? "09:00"}
                    />
                  ) : null}
                  {focusedTask.scheduleEnabled &&
                  focusedTask.scheduleCadence === "weekly" ? (
                    <select
                      aria-label="Day of week"
                      className="task-select"
                      onChange={(event) =>
                        void applyTaskSchedule(focusedTask.id, "weekly", {
                          time: focusedTask.scheduleTime ?? "09:00",
                          dayOfWeek: Number.parseInt(event.target.value, 10),
                        })
                      }
                      value={focusedTask.scheduleDayOfWeek ?? 1}
                    >
                      {WEEKDAY_OPTIONS.map((day) => (
                        <option key={day.value} value={day.value}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  {focusedTask.scheduleEnabled &&
                  focusedTask.scheduleCadence === "monthly" ? (
                    <label className="schedule-monthday">
                      Day
                      <input
                        className="schedule-monthday-input"
                        max={31}
                        min={1}
                        onChange={(event) =>
                          void applyTaskSchedule(focusedTask.id, "monthly", {
                            time: focusedTask.scheduleTime ?? "09:00",
                            dayOfMonth: Math.min(
                              31,
                              Math.max(
                                1,
                                Number.parseInt(event.target.value, 10) || 1,
                              ),
                            ),
                          })
                        }
                        type="number"
                        value={focusedTask.scheduleDayOfMonth ?? 1}
                      />
                    </label>
                  ) : null}
                  {focusedTask.status === "running" ? (
                    <button
                      className="task-toolbar-action"
                      onClick={() => void cancelFocusedTask(focusedTask.id)}
                      type="button"
                    >
                      Cancel
                    </button>
                  ) : focusedTask.status === "failed" ? (
                    // Failed → Retry; scheduled → Run Now (run without waiting
                    // for the schedule). A completed unscheduled task gets no
                    // button at all — re-running it just repeats the same
                    // answer (Oskar decision, dev.125).
                    <button
                      className="task-toolbar-action"
                      onClick={() => void retryFocusedTask(focusedTask.id)}
                      type="button"
                    >
                      Retry
                    </button>
                  ) : focusedTask.scheduleEnabled ? (
                    <button
                      className="task-toolbar-action"
                      onClick={() => void retryFocusedTask(focusedTask.id)}
                      type="button"
                    >
                      Run Now
                    </button>
                  ) : null}
                  {taskRuns.length > 0 ? (
                    <details className="task-runs">
                      <summary>History ({taskRuns.length})</summary>
                      <ul>
                        {taskRuns.map((run) => (
                          <li className="task-run" key={run.id}>
                            {run.result.trim() ? (
                              <details className="task-run-detail">
                                <summary>
                                  <span
                                    className={`status-light status-light--${
                                      run.status === "completed"
                                        ? "done"
                                        : run.status === "failed"
                                          ? "failed"
                                          : "working"
                                    }`}
                                  />
                                  <span className="task-run-when">
                                    {formatTime(run.finishedAt ?? run.startedAt)}
                                  </span>
                                  <span className="task-run-trigger">
                                    {run.trigger === "schedule"
                                      ? "Scheduled"
                                      : "Manual"}
                                  </span>
                                </summary>
                                <div className="task-run-result">
                                  <MarkdownMessage content={run.result} />
                                </div>
                              </details>
                            ) : (
                              <>
                                <span
                                  className={`status-light status-light--${
                                    run.status === "completed"
                                      ? "done"
                                      : run.status === "failed"
                                        ? "failed"
                                        : "working"
                                  }`}
                                />
                                <span className="task-run-when">
                                  {formatTime(run.finishedAt ?? run.startedAt)}
                                </span>
                                <span className="task-run-trigger">
                                  {run.trigger === "schedule"
                                    ? "Scheduled"
                                    : "Manual"}
                                </span>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                  {/* One line, not two, and no year in it: this header has to
                      fit a low-resolution phone in three rows (Oskar,
                      2026-07-30 — it was taking six). */}
                  {focusedTask.completedAt || focusedTask.nextRunAt ? (
                    <span className="task-next">
                      {[
                        focusedTask.completedAt
                          ? `Last ${shortWhen(focusedTask.completedAt)}`
                          : null,
                        focusedTask.scheduleEnabled && focusedTask.nextRunAt
                          ? `Next ${shortWhen(focusedTask.nextRunAt)}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </header>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="ask-vaenyx-messages task-conversation-stream">
            {loadingTaskMessages ? (
              <div className="empty-state">
                <strong>Loading task</strong>
                <p>One moment.</p>
              </div>
            ) : (
              visibleTaskMessages.map((message, index) => (
                <article
                  className={`ask-vaenyx-message ${message.role} ${message.status}`}
                  id={`message-${message.id}`}
                  key={message.id}
                >
                  <div className="ask-vaenyx-message-head">
                    <strong>
                      {message.role === "owner" ? "You" : agentName}
                    </strong>
                  </div>
                  {message.role === "owner" ? (
                    <p>{message.content}</p>
                  ) : message.content ? (
                    <MarkdownMessage content={message.content} />
                  ) : (
                    <ThinkingIndicator />
                  )}
                  {message.webSearchUsed ? (
                    <span className="web-search-chip">Web search used</span>
                  ) : null}
                  {message.role !== "owner" && message.status === "failed" ? (
                    <button
                      className="retry-button"
                      disabled={sendingTaskMessage}
                      onClick={() => retryTaskMessage(visibleTaskMessages, index)}
                      type="button"
                    >
                      Retry
                    </button>
                  ) : null}
                  {message.role === "owner" ? (
                    <div className="message-footer message-footer--owner">
                      {formatTime(message.createdAt)}
                    </div>
                  ) : null}
                  {message.role !== "owner" &&
                  message.content &&
                  message.status !== "failed" &&
                  !message.id.startsWith("pending-assistant") ? (
                    <div className="message-footer">
                      <span aria-hidden="true">✓</span>
                      {formatTime(message.createdAt)}
                      <SpeakButton
                        className="message-speak"
                        engine={voiceOutput?.engine ?? "browser"}
                        text={message.content}
                      />
                    </div>
                  ) : null}
                </article>
              ))
            )}
            {focusedTask.status === "running" ? (
              <article className="ask-vaenyx-message assistant completed">
                <div className="ask-vaenyx-message-head">
                  <strong>{agentName}</strong>
                </div>
                <ThinkingIndicator />
                {/* The run's live thinking, polled while it works — a run is
                    detached from any one screen, so it cannot stream. */}
                {runThinking ? (
                  <p className="thinking-text">{runThinking}</p>
                ) : null}
              </article>
            ) : null}
            {/* Chatting in the task thread gets the same watch-it-work block
                as the plain chat. */}
            {sendingTaskMessage && (streamStatus || streamThinking) ? (
              <div className="thinking-block">
                {streamStatus ? (
                  <p className="thinking-status">
                    {statusLabel(streamStatus)}
                  </p>
                ) : null}
                {streamThinking ? (
                  <p className="thinking-text">{streamThinking}</p>
                ) : null}
              </div>
            ) : null}
            <div className="chat-end-anchor" ref={taskEndRef} />
          </div>
          <JumpToLatest
            resetKey={focusedTaskId ?? ""}
            targetRef={taskEndRef}
          />

          <form
            className="ask-vaenyx-composer"
            onSubmit={sendFocusedTaskMessage}
          >
          <Composer
            busy={sendingTaskMessage}
            documentTray={pendingDocument}
            lang={lang}
            onDocument={(picked) => {
              if (picked.needsCostGate) {
                setDocumentGate(picked);
                return;
              }
              setPendingDocument({ ...picked, acknowledged: false });
            }}
            onPhoto={(id) => setPendingImageId(id)}
            onPhotoPreview={(url) => setPendingPhotoPreview(url || null)}
            onRemoveDocument={() => setPendingDocument(null)}
            onRemovePhoto={clearPendingPhoto}
            onSpoken={(text, audioId) => void sendTaskContent(text, audioId)}
            onStop={stopStreaming}
            onSubmit={sendFocusedTaskMessage}
            onTranscribed={(text) =>
              setTaskPrompt((current) => (current ? `${current}\n${text}` : text))
            }
            onUploadStart={(upload) => {
              pendingUploadRef.current = upload;
            }}
            onValueChange={setTaskPrompt}
            photoTray={
              pendingPhotoPreview ??
              (pendingImageId ? `/v1/vision/image/${pendingImageId}` : null)
            }
            placeholder="Ask about this task"
            showCamera={visionReady}
            showMic={voiceReady}
            submitLabel="Send"
            value={taskPrompt}
          />
          </form>
        </section>
      </div>
    );
  }

  return renderSimpleCompose();
}

const THEME_STORAGE_KEY = "vaenyx.theme";
const DEFAULT_THEME = "mono";
const VAENYX_THEMES = [
  { id: "obice", label: "Obsidian Ice", swatch: "#9fc3ce" },
  { id: "steel", label: "Obsidian Steel", swatch: "#8198ab" },
  { id: "champagne", label: "Graphite Champagne", swatch: "#c9b18a" },
  { id: "ice", label: "Midnight Ice", swatch: "#9fc3ce" },
  { id: "platinum", label: "Ink Platinum", swatch: "#b9c0cf" },
  { id: "sage", label: "Moss Sage", swatch: "#9bb08a" },
  { id: "oxblood", label: "Oxblood Noir", swatch: "#b06a5f" },
  { id: "bronze", label: "Bronze Dusk", swatch: "#b8814f" },
  { id: "amber", label: "Amber Study", swatch: "#cba35e" },
  { id: "mauve", label: "Aubergine Mauve", swatch: "#b58aa6" },
  { id: "mono", label: "Mono Smoke", swatch: "#c9c3b8" },
  { id: "coral", label: "Coral", swatch: "#d97757" },
] as const;

function readStoredTheme(): string {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && VAENYX_THEMES.some((theme) => theme.id === stored)) {
      return stored;
    }
  } catch {
    // localStorage may be unavailable; fall through to the default.
  }

  return DEFAULT_THEME;
}

function applyTheme(themeId: string): void {
  document.documentElement.dataset.theme = themeId;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch {
    // Persisting the choice is best-effort; the theme still applies this session.
  }
}

// Chat text preferences (Owner request, dev.125): font family + size for the
// main conversation body only — chrome (headers, chips, sidebar) keeps the
// design scale. Stored on this device like the theme; applied as root CSS
// variables that the message styles read.
// Key versioned to .v2 (dev.148): the old default was Small/13px and the boot
// apply wrote it into everyone's storage — bumping the default to Medium/15px
// needs a fresh key so the old sticky value doesn't pin the small size.
const CHAT_FONT_SIZE_KEY = "vaenyx.chatFontSize.v2";
const CHAT_FONT_FAMILY_KEY = "vaenyx.chatFontFamily";
const CHAT_FONT_SIZES = [
  { id: "small", label: "Small", value: "0.8125rem" },
  { id: "medium", label: "Medium (Default)", value: "" },
  { id: "large", label: "Large", value: "1.0625rem" },
] as const;
const CHAT_FONT_FAMILIES = [
  { id: "system", label: "System (Default)", value: "" },
  { id: "serif", label: "Serif", value: 'Georgia, "Times New Roman", serif' },
  {
    id: "mono",
    label: "Monospace",
    value: 'ui-monospace, Consolas, "Cascadia Mono", monospace',
  },
] as const;

function readStoredChatFontChoice(
  key: string,
  ids: readonly string[],
  fallback: string,
): string {
  try {
    const stored = window.localStorage.getItem(key);
    if (stored && ids.includes(stored)) return stored;
  } catch {
    // localStorage may be unavailable; fall through to the default.
  }
  return fallback;
}

function applyChatFont(sizeId: string, familyId: string): void {
  const root = document.documentElement;
  const size = CHAT_FONT_SIZES.find((option) => option.id === sizeId);
  const family = CHAT_FONT_FAMILIES.find((option) => option.id === familyId);
  if (size?.value) {
    root.style.setProperty("--chat-font-size", size.value);
  } else {
    root.style.removeProperty("--chat-font-size");
  }
  if (family?.value) {
    root.style.setProperty("--chat-font-family", family.value);
  } else {
    root.style.removeProperty("--chat-font-family");
  }
  try {
    window.localStorage.setItem(CHAT_FONT_SIZE_KEY, sizeId);
    window.localStorage.setItem(CHAT_FONT_FAMILY_KEY, familyId);
  } catch {
    // Best-effort; the choice still applies this session.
  }
}

function readStoredChatFontSize(): string {
  return readStoredChatFontChoice(
    CHAT_FONT_SIZE_KEY,
    CHAT_FONT_SIZES.map((option) => option.id),
    "medium",
  );
}

function readStoredChatFontFamily(): string {
  return readStoredChatFontChoice(
    CHAT_FONT_FAMILY_KEY,
    CHAT_FONT_FAMILIES.map((option) => option.id),
    "system",
  );
}

// Apply the saved chat font at boot — Settings only applies it on change.
applyChatFont(readStoredChatFontSize(), readStoredChatFontFamily());

// Stack of open modals so Escape only closes the TOP one — with nested modals
// (e.g. the Contributor Agreement reader inside the publish dialog) every
// instance's document-level listener fires on one keypress; without the stack a
// single Escape would close them all at once.
const modalStack: symbol[] = [];

// Lightweight modal: centered dialog, top-right ×, closes on × or Esc, never on
// outside click (per the app's modal rules). Tap targets stay ≥44px.
function Modal({
  title,
  onClose,
  children,
  // "doc" is for long-form reading (the legal documents): a wide card that
  // fills the height it is given, instead of the 420px confirm-dialog box.
  variant,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  variant?: "doc";
}) {
  const idRef = useRef(Symbol("modal"));
  useEffect(() => {
    const id = idRef.current;
    modalStack.push(id);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && modalStack[modalStack.length - 1] === id) {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      const at = modalStack.indexOf(id);
      if (at >= 0) modalStack.splice(at, 1);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Rendered into <body>, never in place (Oskar, 2026-07-28: the Archived
  // window came out UNDER the chat). A fixed overlay still obeys any ancestor
  // that makes a stacking context — the sidebar does — so a modal opened from
  // inside a panel would be trapped behind its neighbours. Every Modal in the
  // app goes through here, so this holds everywhere.
  return createPortal(
    <div className="modal-overlay" role="dialog" aria-label={title} aria-modal="true">
      <div className={variant === "doc" ? "modal-card doc" : "modal-card"}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button
            aria-label="Close"
            className="modal-close"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

// Compact theme picker: a dark dropdown showing the active theme (swatch + name)
// that opens a list and closes on select or outside click.
function ThemeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const active =
    VAENYX_THEMES.find((option) => option.id === value) ?? VAENYX_THEMES[0];

  return (
    <div className="theme-select">
      <button
        aria-expanded={open}
        className="theme-select-button"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span
          className="theme-swatch-dot"
          style={{ background: active.swatch }}
        />
        <span className="theme-select-label">{active.label}</span>
        <span className="theme-select-chevron">▾</span>
      </button>
      {open ? (
        <>
          <button
            aria-hidden="true"
            className="theme-select-backdrop"
            onClick={() => setOpen(false)}
            tabIndex={-1}
            type="button"
          />
          <div className="theme-select-menu" role="listbox">
            {VAENYX_THEMES.map((option) => (
              <button
                aria-selected={option.id === value}
                className={`theme-select-option ${
                  option.id === value ? "active" : ""
                }`}
                key={option.id}
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
                role="option"
                type="button"
              >
                <span
                  className="theme-swatch-dot"
                  style={{ background: option.swatch }}
                />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

// Help / Glossary page: renders the spec-maintained bilingual markdown for the
// current language (docs/glossary.md / glossary.zh.md). Pure display; a docs
// edit shows up on next open with no rebuild.
// The full guide/glossary content, shared by the Help screen and the Settings →
// Manual tab (which shows it inline — no extra click).
// The Glossary ("what does this word mean") and the Manual ("what can this do
// and where do I press") are two different documents with one reader. Both ship
// in docs/ and are read in the app, because that is where the Owner actually
// looks — not in a file somebody has to go and find.
function HelpContent({ document = "glossary" }: { document?: "glossary" | "manual" }) {
  const { lang, t } = useI18n();
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setMarkdown(null);
    setError(null);
    void (async () => {
      try {
        const result =
          document === "manual"
            ? await fetchManual(lang)
            : await fetchGlossary(lang);
        if (active) setMarkdown(result.markdown);
      } catch {
        if (active) setError(t("help.error"));
      }
    })();
    return () => {
      active = false;
    };
  }, [document, lang, t]);

  if (error) return <p className="form-error">{error}</p>;
  if (markdown === null) {
    return <p className="settings-card-copy">{t("help.loading")}</p>;
  }
  if (markdown.trim() === "") {
    return <p className="settings-card-copy">{t("help.empty")}</p>;
  }
  return <MarkdownMessage content={markdown} />;
}

function HelpPage() {
  return (
    <div className="settings-layout">
      <section className="settings-card help-page">
        <HelpContent />
      </section>
    </div>
  );
}

// Sharing as ONE state machine (Oskar, 2026-07-27: "点一个按钮突然变成三个,
// 非常奇怪"). The card's anatomy never changes — status line on top, one body
// below it — and every state names itself:
//
//   OFF, never asked   → the K3 consent text + Turn On Sharing / Not Now
//   ON                 → status "On — Automatic", a mode dropdown, Turn Off,
//                        the waiting queue and the contributor ID
//   OFF, after consent → one line + Turn Sharing Back On (consent already
//                        given once; switching back on is a preference, not a
//                        re-consent)
//
// Turning on the first time records BOTH the K3 activation consent and the
// Automatic mode, so the panel lands in a fully-described ON state instead of
// morphing into unexplained new controls.
function SharingPanel() {
  const { lang, t } = useI18n();
  const [mode, setMode] = useState<"automatic" | "review-each" | "off" | null>(
    null,
  );
  const [state, setState] = useState<FlywheelState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The copy version the K3 acceptance was given under, for the floor check.
  const [activateVersion, setActivateVersion] = useState<string | null>(null);
  const zh = lang === "zh";

  const refresh = useCallback(() => {
    fetchFlywheel()
      .then(setState)
      .catch(() => setState(null));
    fetchLegalAcks()
      .then((acks) => {
        const row = acks.find(
          (ack) => ack.keyName === "legal.consent.flywheel",
        );
        const choice = row?.choice ?? null;
        setMode(
          choice === "accept" || choice === "automatic"
            ? "automatic"
            : choice === "review-each"
              ? "review-each"
              : "off",
        );
        const activate = acks.find(
          (ack) => ack.keyName === "legal.consent.flywheel.activate",
        );
        setActivateVersion(
          activate?.choice === "accept" ? activate.copyVersion : null,
        );
      })
      .catch(() => setMode("off"));
  }, []);

  useEffect(refresh, [refresh]);

  async function recordChoice(
    keyName: string,
    choice: string,
  ): Promise<boolean> {
    try {
      await recordLegalAck({
        keyName,
        copyVersion: LEGAL_COPY_VERSION,
        language: lang,
        choice,
      });
      return true;
    } catch {
      setError(zh ? "没保存上,请再试一次。" : "That could not be saved.");
      return false;
    }
  }

  // First turn-on: the K3 consent AND the Automatic mode in one step.
  async function turnOnFirstTime() {
    setBusy(true);
    setError(null);
    const consented = await recordChoice(
      "legal.consent.flywheel.activate",
      "accept",
    );
    if (consented) await recordChoice("legal.consent.flywheel", "automatic");
    refresh();
    setBusy(false);
  }

  async function declineFirstTime() {
    setBusy(true);
    setError(null);
    await recordChoice("legal.consent.flywheel.activate", "decline");
    refresh();
    setBusy(false);
  }

  async function setSharingMode(next: "automatic" | "review-each" | "off") {
    if (busy || mode === next) return;
    setBusy(true);
    setError(null);
    await recordChoice("legal.consent.flywheel", next);
    refresh();
    setBusy(false);
  }

  async function withdraw(id: string) {
    setBusy(true);
    try {
      await withdrawFlywheelItem(id);
      refresh();
    } catch {
      setError(
        zh ? "这一条没能移除。" : "That item could not be withdrawn.",
      );
    } finally {
      setBusy(false);
    }
  }

  // The whole surface waits on its copy and its capability: an activation
  // button with no description of what it activates is worse than no button.
  if (!CAPABILITIES.flywheelUpload || !state) return null;

  // Consent below the floor is treated as not given: the K3 text changed
  // materially at 2.9 ("how they go"), so an older yes was a yes to different
  // words. Re-opening walks through K3 again — never a silent re-enable.
  const consentCurrent =
    state.activated &&
    activateVersion !== null &&
    // Dotted compare, never parseFloat: "3.10" as a float is 3.1, i.e. BELOW
    // 3.9 — a floor checked that way quietly stops holding at the tenth
    // revision of a pack (private, 2026-07-29).
    legalVersionAtLeast(activateVersion, K3_CONSENT_FLOOR);
  const on = consentCurrent && mode !== "off" && mode !== null;
  const statusLine = on
    ? `${zh ? "分享:开启" : "Sharing: On"} — ${
        mode === "automatic"
          ? zh
            ? "自动"
            : "Automatic"
          : zh
            ? "逐条审"
            : "Review Each"
      }`
    : zh
      ? "分享:关闭"
      : "Sharing: Off";

  return (
    <section className="settings-card">
      <p className="eyebrow">Community</p>
      <h2>Sharing</h2>
      <p className="sharing-status">{statusLine}</p>

      {!consentCurrent ? (
        <>
          {/* K3, the only consent point in Part K. Long on purpose: it is the
              one screen that describes the whole mechanism. Two choices,
              neither pre-selected; declining is a complete answer and is not
              re-asked on a timer. */}
          <p className="settings-card-copy legal-multiline">
            {t("legal.consent.flywheel.activate")}
          </p>
          <div className="sharing-actions">
            <button
              className="primary-button"
              disabled={busy}
              onClick={() => void turnOnFirstTime()}
              type="button"
            >
              {zh ? "开启分享" : "Turn On Sharing"}
            </button>
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() => void declineFirstTime()}
              type="button"
            >
              {zh ? "暂不" : "Not Now"}
            </button>
          </div>
        </>
      ) : !on ? (
        <>
          <p className="settings-card-copy">
            {zh
              ? "你同意过分享机制,现在处于关闭状态 — 什么都不会发送。"
              : "You have agreed to the sharing mechanism; it is currently switched off — nothing is sent."}
          </p>
          <div className="sharing-actions">
            <button
              className="primary-button"
              disabled={busy}
              onClick={() => void setSharingMode("automatic")}
              type="button"
            >
              {zh ? "重新开启分享" : "Turn Sharing Back On"}
            </button>
          </div>
          {/* K10 stays visible with sharing OFF: someone who contributed
              before switching off needs this ID to exercise their access and
              correction rights — hiding it would take the rights with it. */}
          <p className="settings-card-copy">
            <code>{state.contributorId}</code>
          </p>
          <p className="settings-card-copy text-faint">
            {t("legal.notice.flywheel.contributorId")}
          </p>
        </>
      ) : (
        <>
          <p className="settings-card-copy legal-multiline">
            {t("flywheel.queue.window")}
          </p>
          <div className="sharing-actions">
            <label className="chat-font-field sharing-mode-field">
              {zh ? "方式" : "Mode"}
              <select
                className="task-select"
                disabled={busy}
                onChange={(event) =>
                  void setSharingMode(
                    event.target.value as "automatic" | "review-each",
                  )
                }
                value={mode ?? "automatic"}
              >
                <option value="automatic">
                  {zh ? "自动(等待期后发送)" : "Automatic — sends after the wait"}
                </option>
                <option value="review-each">
                  {zh ? "逐条审(每条经你确认)" : "Review Each — you confirm every one"}
                </option>
              </select>
            </label>
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() => void setSharingMode("off")}
              type="button"
            >
              {zh ? "关闭分享" : "Turn Off Sharing"}
            </button>
          </div>

          {state.items.length === 0 ? (
            <p className="settings-card-copy">
              {zh
                ? "目前没有等待发送的内容。"
                : "Nothing is waiting to be sent."}
            </p>
          ) : (
            <ul className="flywheel-list">
              {state.items.map((item) => (
                <li className="flywheel-item" key={item.id}>
                  <div>
                    <strong>{item.methodId}</strong>
                    {item.note ? <span> — {item.note}</span> : null}
                    <p className="text-faint">
                      {item.sensitive
                        ? t("flywheel.queue.held")
                        : `${zh ? "发送时间" : "Sends after"} ${new Date(
                            item.sendAfter,
                          ).toLocaleString()}`}
                      {item.redactions > 0
                        ? ` · ${item.redactions} ${zh ? "处细节已移除" : "detail(s) removed"}`
                        : ""}
                    </p>
                  </div>
                  <button
                    className="secondary-button"
                    disabled={busy}
                    onClick={() => void withdraw(item.id)}
                    type="button"
                  >
                    {zh ? "移除" : "Remove"}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {/* K10: available where someone looks for it, prominent nowhere. */}
          <p className="settings-card-copy">
            <code>{state.contributorId}</code>
          </p>
          <p className="settings-card-copy text-faint">
            {t("legal.notice.flywheel.contributorId")}
          </p>
          {state.configured ? null : (
            <p className="settings-card-copy text-faint">
              {zh
                ? "尚未配置发布服务,因此这台机器无法发送任何内容。"
                : "No publish service is configured, so nothing can be sent from this machine."}
            </p>
          )}
        </>
      )}
      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}

// F6 (copy pack): the model's free-options answer must carry, on the same
// screen, that it may simply be wrong. The pack string holds {model} / {date}
// and an optional web-search clause; one refresh answers all four slots, so
// one rendered instance covers them.
function freeAnswerNotice(
  t: (key: string) => string,
  lang: string,
  pick: { source: string; checkedAt: string },
): string {
  const webSuffix = ", web search";
  const searched = pick.source.endsWith(webSuffix);
  const model = searched
    ? pick.source.slice(0, -webSuffix.length)
    : pick.source;
  const date = new Date(pick.checkedAt).toLocaleDateString(
    lang === "zh" ? "zh-CN" : "en-AU",
  );
  return t("legal.notice.freeOptions.modelAnswer")
    .replaceAll("{model}", model)
    .replaceAll("{date}", date)
    .replace("{, with web search}", searched ? ", with web search" : "")
    .replace("{,已联网搜索}", searched ? ",已联网搜索" : "");
}

// The free way to do each of the four things Vaenyx needs an outside model for
// (Oskar, 2026-07-27). Someone who cannot pay should still be able to run the
// whole app, and finding that out should not require reading four pricing pages.
//
// The date is stamped and lives in ONE constant, because free tiers move: a
// recommendation with no date is one nobody can judge the age of, and four
// copies of a date is four chances for the UI to claim a check that never
// happened. Every claim under it was verified against the provider, not
// remembered — Google's image quota of zero is exactly what that catches.
// Stored as a plain date rather than as English words, so both languages render
// it the same way the model-answered variant below already does — one fact, one
// constant, and no second spelling of it to go stale.
const FREE_PICK_CHECKED = "2026-07-27";

function FreePick({
  children,
  href,
  pick,
}: {
  children: ReactNode;
  href?: string;
  /** A fresher suggestion from the Owner's own model (the Update button). It
   *  replaces the shipped line but is labelled as the model's answer, dated —
   *  the shipped line was verified by hand, this one was not. */
  pick?: { text: string; checkedAt: string; source: string } | undefined;
}) {
  // This sits inside four drawers that are written in both languages, and it
  // was the one line in them still speaking only English.
  const { lang } = useI18n();
  const checked = new Date(
    pick ? pick.checkedAt : FREE_PICK_CHECKED,
  ).toLocaleDateString();
  return (
    <p className="free-pick">
      <strong>{lang === "zh" ? "免费选项" : "Free option"}</strong>{" "}
      <span className="text-faint">
        (
        {lang === "zh"
          ? pick
            ? `${pick.source} 于 ${checked} 核对`
            : `${checked} 核对`
          : `checked ${checked}${pick ? ` by ${pick.source}` : ""}`}
        )
      </span>{" "}
      {pick ? pick.text : children}
      {!pick && href ? (
        <>
          {" "}
          <a href={href} rel="noreferrer noopener" target="_blank">
            {new URL(href).hostname.replace(/^www\./, "")}
          </a>
        </>
      ) : null}
    </p>
  );
}

// F2 (copy pack): which local-backend notice variant applies to an entered
// address. "Your own machine" may only render after a technical check confirms
// loopback; RFC1918 private-range gets the LAN variant (it may be ANOTHER
// machine); anything else — including unparseable/empty — falls back.
function localBackendNoticeKey(
  baseUrl: string,
): "legal.notice.modelConnect.local"
  | "legal.notice.modelConnect.local.lan"
  | "legal.notice.modelConnect.local.unverified" {
  try {
    const host = new URL(baseUrl).hostname.replace(/^\[|\]$/g, "");
    if (host === "localhost" || host === "::1" || host.startsWith("127.")) {
      return "legal.notice.modelConnect.local";
    }
    if (
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return "legal.notice.modelConnect.local.lan";
    }
    return "legal.notice.modelConnect.local.unverified";
  } catch {
    return "legal.notice.modelConnect.local.unverified";
  }
}

// THE SUBSCRIPTION DOOR, as the Owner sees it (Oskar, 2026-07-29: "不能是看不见
// 的后台功能"). Everything the door does is on this one card: whether it is open,
// which subscription is signed in, the address to give an app, who counts as
// him, the limits, and what it has been asked to do lately — without ever
// showing what was in any of it.
function SubscriptionDoorPanel() {
  const { lang } = useI18n();
  const [panel, setPanel] = useState<RelayPanelData | null>(null);
  const [hostDraft, setHostDraft] = useState("");
  const [usage, setUsage] = useState<RelayUsageResponse | null>(null);
  // THE APPS (2026-08-02): each app has its own relay key, listed and managed
  // here and nowhere else — the Tokens screen filters this kind out, and this
  // panel never shows a Method/Routine Token. One key pipeline underneath;
  // two products on top, kept apart on both screens. In front of the user the
  // relay key is called a Model Key (模型钥匙, 2026-08-06) — "Token" stays
  // reserved for the Method/Routine kind, and the two names must never blur.
  const [apps, setApps] = useState<AppProfile[]>([]);
  const [newAppName, setNewAppName] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  // {profileId, token}: the one moment an app's key is readable.
  const [mintedApp, setMintedApp] = useState<{
    profileId: string;
    token: string;
  } | null>(null);
  const [appBusy, setAppBusy] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [ceiling, setCeiling] = useState<{
    global: Record<string, boolean>;
    implemented: Record<string, boolean>;
    neverViaToken: string[];
    needsOwnTokenApproval: string[];
  } | null>(null);

  useEffect(() => {
    void fetchRelayUsage()
      .then(setUsage)
      .catch(() => undefined);
    void fetchAppProfiles()
      .then((all) => setApps(all.filter((profile) => profile.kind === "relay")))
      .catch(() => undefined);
    void fetchCapabilities()
      .then((result) =>
        setCeiling({
          global: result.global,
          implemented: result.implemented,
          neverViaToken: result.neverViaToken,
          needsOwnTokenApproval: result.needsOwnTokenApproval,
        }),
      )
      .catch(() => setCeiling(null));
  }, []);

  async function addApp() {
    const name = newAppName.trim();
    if (!name) return;
    setAddBusy(true);
    try {
      const created = await createAppProfile({ name, kind: "relay" });
      setApps((current) => [created.profile, ...current]);
      setMintedApp({ profileId: created.profile.id, token: created.token });
      setNewAppName("");
    } catch (error) {
      showErrorToast(
        error instanceof Error ? error.message : "Could not add the app.",
      );
    } finally {
      setAddBusy(false);
    }
  }

  async function rotateApp(profileId: string) {
    setAppBusy(profileId);
    try {
      const result = await regenerateAppProfileToken(profileId);
      setApps((current) =>
        current.map((entry) =>
          entry.id === profileId ? result.profile : entry,
        ),
      );
      setMintedApp({ profileId, token: result.token });
    } catch (error) {
      showErrorToast(
        error instanceof Error
          ? error.message
          : "Could not rotate the Model Key.",
      );
    } finally {
      setAppBusy(null);
    }
  }

  async function revokeApp(profileId: string) {
    setAppBusy(profileId);
    try {
      await deleteAppProfile(profileId);
      setApps((current) => current.filter((entry) => entry.id !== profileId));
      setConfirmRevoke(null);
      // The ledger keeps this app's spent months as "Removed app": money that
      // went out stays answerable after the key is gone.
    } catch (error) {
      showErrorToast(
        error instanceof Error
          ? error.message
          : "Could not revoke the Model Key.",
      );
    } finally {
      setAppBusy(null);
    }
  }

  async function grantAppCapability(
    profileId: string,
    capability: string,
    on: boolean,
    approve: string[] = [],
  ) {
    setAppBusy(profileId);
    try {
      const { profile } = await updateAppProfileCapabilities(
        profileId,
        { [capability]: on },
        approve,
        lang,
      );
      setApps((current) =>
        current.map((entry) => (entry.id === profileId ? profile : entry)),
      );
    } catch (error) {
      showErrorToast(
        error instanceof Error
          ? error.message
          : lang === "zh"
            ? "改不了。"
            : "Could not change that.",
      );
    } finally {
      setAppBusy(null);
    }
  }

  useEffect(() => {
    void fetchRelay()
      .then(setPanel)
      .catch(() => setPanel(null));
  }, []);

  async function save(changes: Partial<RelaySettings>) {
    const settings = await updateRelaySettings(changes);
    setPanel((current) => (current ? { ...current, settings } : current));
  }

  if (!panel) return null;
  const { settings, calls } = panel;

  return (
    <section className="settings-card">
      <p className="eyebrow">For your other apps</p>
      <h2>Subscription Door</h2>

      <div className="door-switch">
        <div>
          <strong>{settings.enabled ? "Open" : "Closed"}</strong>
          <p>
            Lends your ChatGPT and Claude subscriptions to your own apps.
            Reachable only from inside your private network.
          </p>
        </div>
        <input
          checked={settings.enabled}
          className="door-toggle"
          onChange={(event) => void save({ enabled: event.target.checked })}
          role="switch"
          type="checkbox"
        />
      </div>

      <h3 className="door-subhead">
        {lang === "zh" ? "给 app 填的地址" : "Address for your apps"}
      </h3>
      {/* One line: what gets pasted into an app's settings next to its key.
          The loopback twin was noise — an app on another device can never
          reach 127.0.0.1 here (Oskar, 2026-08-06). */}
      <div className="door-address">
        <code>{window.location.origin}</code>
        <button
          className="door-copy"
          onClick={() =>
            void navigator.clipboard?.writeText(window.location.origin)
          }
          type="button"
        >
          Copy
        </button>
        <span>
          {lang === "zh"
            ? "跟它的模型钥匙一起填进 app 的设置里"
            : "goes into the app's settings beside its Model Key"}
        </span>
      </div>

      <h3 className="door-subhead">Your apps</h3>
      <p className="door-legend">
        {lang === "zh"
          ? "一个 app 一把模型钥匙、一个订阅身份:钥匙配好后,app 要在它自己里面完成一次订阅登录才可用 —— 它花的是它登录的那个账号,绝不借用 Vaenyx 自己的。"
          : "One Model Key and one subscription identity per app: after the key is in place, the app signs in to a subscription from inside itself before it works — it spends the account it signed in with, never Vaenyx's own."}
      </p>
      <div className="door-address">
        <input
          className="door-add-input"
          onChange={(event) => setNewAppName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void addApp();
          }}
          placeholder={lang === "zh" ? "App 的名字" : "App name"}
          value={newAppName}
        />
        <button
          className="door-copy"
          disabled={addBusy || newAppName.trim() === ""}
          onClick={() => void addApp()}
          type="button"
        >
          {lang === "zh" ? "添加 App" : "Add App"}
        </button>
      </div>
      {apps.map((appProfile) => (
        <div className="door-app" key={appProfile.id}>
          <div className="door-app-head">
            <strong>{appProfile.name}</strong>
            <span className="door-app-meta">
              {new Date(appProfile.createdAt).toLocaleDateString()} ·{" "}
              <code>{appProfile.tokenPrefix}</code>
            </span>
            <button
              className="door-copy"
              disabled={appBusy === appProfile.id}
              onClick={() => void rotateApp(appProfile.id)}
              type="button"
            >
              {lang === "zh" ? "换钥匙" : "Rotate"}
            </button>
            {confirmRevoke === appProfile.id ? (
              <>
                <button
                  className="door-copy danger"
                  disabled={appBusy === appProfile.id}
                  onClick={() => void revokeApp(appProfile.id)}
                  type="button"
                >
                  {lang === "zh" ? "确认吊销" : "Really revoke"}
                </button>
                <button
                  className="door-copy"
                  onClick={() => setConfirmRevoke(null)}
                  type="button"
                >
                  {lang === "zh" ? "算了" : "Keep it"}
                </button>
              </>
            ) : (
              <button
                className="door-copy"
                disabled={appBusy === appProfile.id}
                onClick={() => setConfirmRevoke(appProfile.id)}
                type="button"
              >
                {lang === "zh" ? "吊销" : "Revoke"}
              </button>
            )}
          </div>
          {mintedApp?.profileId === appProfile.id ? (
            <div className="door-address door-key-new">
              <code>{mintedApp.token}</code>
              <button
                className="door-copy"
                onClick={() =>
                  void navigator.clipboard?.writeText(mintedApp.token)
                }
                type="button"
              >
                Copy
              </button>
              <span>
                {lang === "zh"
                  ? "现在就复制这把模型钥匙 —— 之后不再显示"
                  : "copy the Model Key now — it is never shown again"}
              </span>
            </div>
          ) : null}
          {/* Only what the door actually serves (Oskar, 2026-08-06: 图一大半
              不需要). Its engines do text + these two; hearing, speaking and
              drawing exist on no door engine, and web and fetching are not
              even in the door's request vocabulary — seven rows here were five
              rows of noise. The full seven-row grant surface stays where the
              other kinds of key live, on the Tokens screen. */}
          {ceiling ? (
            <div className="door-app-caps">
              {CAPABILITY_META.filter((meta) =>
                ["vision", "reading"].includes(meta.id),
              ).map((meta) => {
                const machineOn = ceiling.global[meta.id] === true;
                const granted = appProfile.capabilities.includes(meta.id);
                return (
                  <div className="door-app-cap" key={meta.id}>
                    <CapabilityChip id={meta.id} lang={lang} showName />
                    {!machineOn ? (
                      <span className="capability-row-pending">
                        {lang === "zh" ? "整机关着" : "machine off"}
                      </span>
                    ) : (
                      <input
                        aria-label={lang === "zh" ? meta.name.zh : meta.name.en}
                        checked={granted}
                        className="door-toggle"
                        disabled={appBusy === appProfile.id}
                        onChange={(event) =>
                          void grantAppCapability(
                            appProfile.id,
                            meta.id,
                            event.target.checked,
                          )
                        }
                        role="switch"
                        type="checkbox"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ))}

      <h3 className="door-subhead">
        {lang === "zh" ? "文件可以来自" : "Files may come from"}
      </h3>
      {/* The one list that stays (Oskar, 2026-08-06: the rest of "who and
          where" retired with the shared key). This one is a real wall: it is
          the only thing stopping a stolen key from making this machine
          download from anywhere on the internet. */}
      <div className="door-field">
        <span className="door-field-label">
          <em>
            {lang === "zh"
              ? "app 发的是链接,不是文件本身;用完即删。"
              : "apps send a link, never the file; it is used and deleted"}
          </em>
        </span>
        <DoorList
          items={settings.fileHosts}
          onChange={(fileHosts) => void save({ fileHosts })}
          placeholder="yourcompany.sharepoint.com"
          draft={hostDraft}
          setDraft={setHostDraft}
        />
      </div>

      <h3 className="door-subhead">Limits</h3>
      <div className="door-limits">
        <label>
          Files per call
          <input
            min={0}
            max={20}
            onChange={(event) =>
              void save({ maxFiles: Number(event.target.value) })
            }
            type="number"
            value={settings.maxFiles}
          />
        </label>
        <label>
          Largest file (MB)
          <input
            min={0}
            onChange={(event) =>
              void save({
                maxFileBytes: Number(event.target.value) * 1024 * 1024,
              })
            }
            type="number"
            value={Math.round(settings.maxFileBytes / 1024 / 1024)}
          />
        </label>
        <label>
          All files together (MB)
          <input
            min={0}
            onChange={(event) =>
              void save({
                maxTotalBytes: Number(event.target.value) * 1024 * 1024,
              })
            }
            type="number"
            value={Math.round(settings.maxTotalBytes / 1024 / 1024)}
          />
        </label>
        <label>
          Timeout (seconds)
          <input
            min={10}
            max={600}
            onChange={(event) =>
              void save({ timeoutSeconds: Number(event.target.value) })
            }
            type="number"
            value={settings.timeoutSeconds}
          />
        </label>
      </div>

      {/* Who spent what, this month (Oskar asked for exactly this page): a nod
          that keeps costing money must keep being visible, or the Owner only
          sees a bill that grew and cannot say which app grew it. Token counts
          appear only when an engine really reported them — the Claude SDK
          does, the Codex CLI does not — never estimated. */}
      <h3 className="door-subhead">This month</h3>
      {!usage || usage.rows.length === 0 ? (
        <p className="door-legend">
          {lang === "zh" ? "这个月还没有调用。" : "No calls yet this month."}
        </p>
      ) : (
        <ul className="door-usage">
          {usage.rows.map((row) => (
            <li key={`${row.appId}-${row.engine}`}>
              <span className="door-usage-app">
                {row.appId === "core"
                  ? lang === "zh"
                    ? "Vaenyx 自己"
                    : "Vaenyx itself"
                  : row.appId === "door"
                    ? lang === "zh"
                      ? "门钥匙"
                      : "Door key"
                    : row.appName}
              </span>
              <span className="door-usage-engine">
                {row.engine === "claude-cli" ? "Claude" : "OpenAI"}
              </span>
              <span className="door-usage-calls">
                {row.calls.toLocaleString()}
                {lang === "zh" ? " 次" : row.calls === 1 ? " call" : " calls"}
              </span>
              {typeof row.outputTokens === "number" ? (
                <span className="door-usage-tokens">
                  {((row.inputTokens ?? 0) + row.outputTokens).toLocaleString()}{" "}
                  tokens
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <h3 className="door-subhead">Recent calls</h3>
      {calls.length === 0 ? (
        <p className="door-legend">Nothing yet.</p>
      ) : (
        <ul className="door-calls">
          {calls.map((call, index) => (
            <li key={index}>
              <span className="door-call-when">
                {new Date(call.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="door-call-task">{call.task}</span>
              <span>{call.engine}</span>
              <span>{(call.ms / 1000).toFixed(1)}s</span>
              <span className={call.ok ? "ok" : "failed"}>
                {call.ok ? "✓" : `✗ ${call.failure ?? ""}`}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="door-legend">
        What happened, never what was in it: no prompt, no file, no answer is
        written down.
      </p>
    </section>
  );
}

// One editable list of short strings — addresses, origins, hosts. Adding or
// removing saves straight away, like the rest of Settings.
function DoorList({
  addLabel,
  draft,
  items,
  onChange,
  placeholder,
  setDraft,
}: {
  /** The Subscription Door's own card is English throughout; the Fetching
   *  drawer beside it is not, so the one word on the button travels with the
   *  caller rather than a second list being written to hold a translation. */
  addLabel?: string;
  draft: string;
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  setDraft: (value: string) => void;
}) {
  // An empty box asking to be filled in is the loudest thing on a screen, and
  // this card had three of them stacked (Oskar: 一切重简). Nothing shows but a
  // plus until you actually want to add something.
  const [adding, setAdding] = useState(false);
  return (
    <div className="door-list">
      {items.map((item) => (
        <span className="door-chip" key={item}>
          {item}
          <button
            aria-label={`Remove ${item}`}
            onClick={() => onChange(items.filter((entry) => entry !== item))}
            type="button"
          >
            ×
          </button>
        </span>
      ))}
      {adding ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const value = draft.trim();
            if (!value) {
              setAdding(false);
              return;
            }
            onChange([...items, value]);
            setDraft("");
            setAdding(false);
          }}
        >
          <input
            autoFocus
            onBlur={() => {
              if (!draft.trim()) setAdding(false);
            }}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={placeholder}
            value={draft}
          />
          <button className="text-button" type="submit">
            {addLabel ?? "Add"}
          </button>
        </form>
      ) : (
        <button
          aria-label={`${addLabel ?? "Add"} ${placeholder}`}
          className="door-add"
          onClick={() => setAdding(true)}
          title="Add"
          type="button"
        >
          +
        </button>
      )}
    </div>
  );
}

// WHAT IS FREE RIGHT NOW, in a window you open on purpose. It shows the answer
// from last time — including WHICH MODEL said it and WHEN, because free tiers
// change constantly and models state them wrongly with total confidence.
//
// Asking again is NOT a button in here. There is exactly one control that runs
// the survey and it sits on the card behind this window, one press from the
// page ("同类功能必须统一" — one job, one control): a second Update in here
// would be the same job wearing a different hat, and the card's button already
// opens this window on the fresh answer when it lands.
function FreeModelsModal({
  lang,
  onClose,
  picks,
}: {
  lang: Lang;
  onClose: () => void;
  picks: FreePicksState | null;
}) {
  const slots: { key: keyof FreePicksState["items"]; label: string }[] = [
    { key: "voiceIn", label: lang === "zh" ? "听(声音进)" : "Hearing" },
    { key: "voiceOut", label: lang === "zh" ? "念(声音出)" : "Speaking" },
    { key: "vision", label: lang === "zh" ? "看(图形进)" : "Vision" },
    { key: "image", label: lang === "zh" ? "画(图形出)" : "Drawing" },
  ];
  const found = slots.filter((slot) => picks?.items?.[slot.key]);

  return (
    <Modal
      onClose={onClose}
      title={lang === "zh" ? "现在有哪些免费的" : "What is free right now"}
    >
      <p className="settings-card-copy">
        {lang === "zh"
          ? "这是上一次问出来的答案。免费额度天天变,模型也会非常自信地答错 —— 用之前请到服务商官网确认。"
          : "This is what was found last time. Free tiers change constantly and models state them wrongly with confidence — check the provider's own site before relying on it."}
      </p>
      {picks === null ? null : found.length === 0 ? (
        <p className="settings-card-copy">
          {lang === "zh"
            ? "还没查过。关掉这个窗口,按「再问一次」。"
            : "Never checked. Close this and press Ask again."}
        </p>
      ) : (
        <div className="free-list">
          {found.map((slot) => {
            const item = picks.items[slot.key];
            if (!item) return null;
            return (
              <div className="free-item" key={slot.key}>
                <span className="free-item-slot">{slot.label}</span>
                <p className="free-item-text">{item.text}</p>
                <p className="free-item-meta">
                  {lang === "zh" ? "是 " : "said by "}
                  {item.source}
                  {lang === "zh" ? " 说的 · " : " · "}
                  {new Date(item.checkedAt).toLocaleDateString()}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

// THE CEILING. Seven rows, one per capability: the drawing, the word used
// everywhere, and in brackets the older familiar wording — which lives HERE and
// nowhere else (Oskar, 2026-07-31), because this is the one screen where
// somebody who learnt "Picture in" needs to recognise what "Vision" is.
//
// Whatever is off here is out of reach of every Method, every mode and every
// Token, whatever they say about themselves. A lower layer may only narrow.
//
// Each row also carries the SETUP for its own job — the key, the offline-voice
// download, the Cloudflare token — folded away behind the arrow (Oskar,
// 2026-07-31: "Model key 那里面的所有东西都要集成到 Capabilities 那个页面去").
// There is no second card any more: whether a job may happen, which model does
// it, and what that model needs are three answers to one question, and split
// across two cards nobody could ever tell what was actually set.
// Fetching is on this list for a different reason from the other four: its
// drawer holds no key at all, it holds the FOLDER WHITELIST. Switching the
// capability on reads nothing until a folder is named there, which is the
// second lock — and the only place in the app where that lock can be opened.
//
// Reading and Web have nothing to set up — they ride the main model — but they
// are on the list because every drawer now also holds that row's TEST, and a
// capability you cannot try is one you cannot trust. All seven are here: the
// two that cannot be tested by machine say so in their own drawer instead of
// showing a button that would have to pretend.
const SETUP_ROWS = new Set([
  "hearing",
  "speaking",
  "vision",
  "drawing",
  "reading",
  "fetching",
  "web",
]);

// WHAT ONE PRESS REALLY DOES, said in front of the button instead of after it.
// Two of these spend the Owner's own money on their own account, and finding
// that out afterwards is how a Test button becomes one nobody dares press.
//
// A row missing from this table gets no Test button at all, and nothing is
// missing: all seven are here. Hearing and Speaking are the two the SERVER
// cannot test without pretending — there is no recording to feed one and
// nothing there can listen to the other — so this device does them instead, in
// the browser, which is why they have a cost line like the rest.
const TEST_COST: Record<string, { en: string; zh: string }> = {
  hearing: {
    en: "Records three seconds from this device's microphone and sends it to the engine on this row. Say anything — what comes back is what it heard. The recording is not kept.",
    zh: "用这台设备的麦克风录三秒,发给这一行的引擎。随便说一句 —— 回来的就是它听到的。录音不保留。",
  },
  speaking: {
    en: "Really speaks one line with the voice on this row, out of this device. Nothing here can listen, so your ears are the last step.",
    zh: "用这一行的声音,从这台设备真的念一句。这里没有东西能听,最后一步靠你的耳朵。",
  },
  drawing: {
    en: "Really makes one picture with the engine on this row. Free on Cloudflare Workers AI and Zhipu; on a paid key it costs whatever one picture costs.",
    zh: "用这一行的引擎真的画一张图。Cloudflare Workers AI 和智谱是免费的;付费 key 就是一张图的钱。",
  },
  fetching: {
    en: "Looks inside the folders you named and really opens one text file from them. No model is used, nothing is sent anywhere, and the file's contents are not shown.",
    zh: "到你点名的文件夹里看一眼,并真的打开里面的一个文字文件。不用模型,什么都不发出去,文件内容也不会显示出来。",
  },
  reading: {
    en: "Reads a one-page test document. If your main model reads PDFs itself, that is one small request to it; otherwise nothing leaves this machine.",
    zh: "读一份一页的测试文档。如果主模型自己会读 PDF,那是给它的一次很小的请求;不然什么都不出这台机器。",
  },
  vision: {
    en: "Sends one small test picture to the model on this row and checks whether it can say what is in it. On a paid key that is one small request.",
    zh: "把一张很小的测试图发给这一行的模型,看它能不能说出里面是什么。用付费 key 的话,这是一次很小的请求。",
  },
  web: {
    en: "Asks your main model to look something up on the internet once, and checks that it really searched. It can take half a minute.",
    zh: "让主模型上网查一次,并确认它真的去搜了。可能要半分钟。",
  },
};

// THE TWO THAT ARE EXPLAINED BEFORE THEY ARE USED (copy pack N1/N2). Not the
// two most powerful — the two whose consequence nobody guesses. Web sends words
// this machine did not write to a company nobody chose; Fetching puts the
// CONTENTS of the Owner's own file into whatever model answers. The other five
// do on screen exactly what their name says.
const CAPABILITY_NOTICE_KEYS = {
  web: "legal.notice.capability.web",
  fetching: "legal.notice.capability.fetching",
} as const;

function capabilityNoticeKey(id: string): string | null {
  if (id === "web") return CAPABILITY_NOTICE_KEYS.web;
  if (id === "fetching") return CAPABILITY_NOTICE_KEYS.fetching;
  return null;
}

function CapabilitiesPanel({
  // The voice download, held by the Settings page above both cards. The
  // Speaking row STARTS one (picking a voice that is not here yet) and so has
  // to see it move; the poll that makes it move lives up there, where nothing
  // this card can close will take it away.
  localTts,
  onLocalTtsChanged,
  // Bumped by the Models card whenever a backend is connected, removed or made
  // the main model. The two cards are siblings, so nothing else tells this one
  // that the list it is choosing from just changed — and since the Cloudflare
  // token and the local voice moved over there, a connect on that card is now
  // what fills a row here.
  refreshKey,
}: {
  localTts: LocalTtsStatus | null;
  onLocalTtsChanged: (next: LocalTtsStatus) => void;
  refreshKey: number;
}) {
  const { lang, t } = useI18n();
  const [global, setGlobal] = useState<Record<string, boolean> | null>(null);
  // Told apart from "not loaded yet", because the two need different sentences.
  const [ceilingUnread, setCeilingUnread] = useState(false);
  const [implemented, setImplemented] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [showFree, setShowFree] = useState(false);
  const [providers, setProviders] = useState<ModelProviderInfo[]>([]);
  const [hearingEngine, setHearingEngine] = useState("none");
  const [speakingEngine, setSpeakingEngine] = useState("none");
  const [visionEngine, setVisionEngineState] = useState("none");
  const [drawingEngine, setDrawingEngine] = useState("none");
  // Which row has its setup showing. One at a time: four drawers open at once
  // is a wall of forms with the switches lost somewhere inside it.
  const [openSetup, setOpenSetup] = useState<string | null>(null);
  // Everything below belongs to the setup drawers — what used to be a separate
  // card of its own.
  const [output, setOutput] = useState<VoiceOutputStatus | null>(null);
  const [outputVoice, setOutputVoice] = useState("Kore");
  const [localEnVoice, setLocalEnVoice] = useState("en_US-amy-medium");
  const [localZhVoice, setLocalZhVoice] = useState("zh_CN-huayan-medium");
  const [outputError, setOutputError] = useState<string | null>(null);
  // Separate from `busy`, which names the row whose switch is being written: a
  // drawer's own buttons must not grey out because another row is mid-save.
  const [setupBusy, setSetupBusy] = useState(false);
  const [freePicks, setFreePicks] = useState<FreePicksState | null>(null);
  // The free-options survey is a real request to the main model and can take
  // half a minute, so its button has to say it is working.
  const [freeBusy, setFreeBusy] = useState(false);
  // Which row is being tested right now, and what each row's last test said.
  // Kept per row rather than one result: a test you ran a minute ago is still
  // the answer for that row, and clearing it when you open another one would
  // throw away the only record of what happened.
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, CapabilityTestResult>
  >({});
  // The two capabilities that get an explainer before they are used (copy pack
  // N1/N2), and what the Owner has already been shown. `null` means the
  // acknowledgement list has not been read yet — told apart from "read, and
  // nothing is recorded", because only the second may open a window.
  const [noticeSeen, setNoticeSeen] = useState<Set<string> | null>(null);
  const [capabilityNotice, setCapabilityNotice] = useState<string | null>(null);
  // Closed with × or Escape rather than answered. Nothing is recorded and the
  // notice comes back next visit — but not immediately, which would be a window
  // that cannot be closed.
  const [noticePutOff, setNoticePutOff] = useState<Set<string>>(new Set());
  // The folders "Files on this machine" may look in, and the one being typed.
  const [folders, setFolders] = useState<string[]>([]);
  const [folderDraft, setFolderDraft] = useState("");
  // A list, not one string: each refused folder gets its own line, because
  // three reasons run together on one line is three reasons nobody reads.
  const [folderErrors, setFolderErrors] = useState<string[]>([]);
  // The engine the SERVER has, never the one the row's chooser happens to
  // display: a blank slot is back-filled below with the main model's name, so
  // the chooser can read "gemini" while nothing is connected.
  const outputEngine = output?.engine ?? "none";

  // One loader for first mount AND for after a key is added in any drawer: a
  // new connection can auto-fill empty slots server-side, so every slot
  // re-reads rather than only the one that was typed into.
  const reload = useCallback(() => {
    void fetchCapabilities()
      .then((result) => {
        setGlobal(result.global);
        setImplemented(result.implemented);
        setCeilingUnread(false);
        // The speak buttons on the chat page read this too, and they are a
        // different component tree that will not re-fetch on its own. They get
        // the SESSION's ceiling, not this card's: this card writes the machine's
        // switches, and a speak button obeys the mode as well.
        noteSpeakingOn(result.session);
      })
      .catch(() => setCeilingUnread(true));
    void fetchVoiceStatus()
      .then((status) => setHearingEngine(status.provider ?? "none"))
      .catch(() => undefined);
    void fetchVoiceOutput()
      .then((status) => {
        setOutput(status);
        setSpeakingEngine(status.engine ?? "none");
        if (status.voice && status.engine === "gemini") {
          setOutputVoice(status.voice);
        }
        if (status.enVoice) setLocalEnVoice(status.enVoice);
        if (status.zhVoice) setLocalZhVoice(status.zhVoice);
      })
      .catch(() => undefined);
    void fetchVisionStatus()
      .then((status) => setVisionEngineState(status.provider ?? "none"))
      .catch(() => undefined);
    void fetchImageEngine()
      .then((status) => setDrawingEngine(status.provider ?? "none"))
      .catch(() => undefined);
    void fetchModelProviders()
      .then((result) => setProviders(result.providers))
      .catch(() => undefined);
    void fetchFreePicks()
      .then(setFreePicks)
      .catch(() => undefined);
    void fetchCapabilityFolders()
      .then((result) => setFolders(result.folders))
      .catch(() => undefined);
  }, []);

  useEffect(reload, [reload, refreshKey]);

  // Which explainers this Owner has already answered (copy pack N1/N2). Read
  // once on mount and never again — deliberately NOT part of `reload`, which
  // re-runs whenever a model is connected: what has been read is not part of
  // what is connected, and re-reading it there would be a request per connect
  // for an answer that cannot have changed.
  //
  // Presence of the key is enough, with no version floor: these are notices,
  // and re-interrupting somebody because a word was reworded is how a notice
  // becomes a reflex click. A MATERIAL rewrite would add a floor here
  // deliberately (copy pack clause 6.4).
  //
  // A failed read leaves this null, which shows nothing: a window that opens
  // because the app could not tell whether it had opened before is worse than
  // one that arrives a visit late.
  useEffect(() => {
    void fetchLegalAcks()
      .then((acks) => setNoticeSeen(new Set(acks.map((ack) => ack.keyName))))
      .catch(() => undefined);
  }, []);

  // WEB SHIPS ON, so the explainer cannot wait for a switch to be flipped — the
  // Owner may never touch it and would then never be told what leaves this
  // machine when their model looks something up. First sight of the card counts
  // as the moment (copy pack N1 behaviour).
  useEffect(() => {
    if (capabilityNotice || !noticeSeen || !global) return;
    if (global.web !== true) return;
    if (noticeSeen.has(CAPABILITY_NOTICE_KEYS.web)) return;
    if (noticePutOff.has("web")) return;
    setCapabilityNotice("web");
  }, [capabilityNotice, global, noticePutOff, noticeSeen]);

  // A "Set It Up" jump from a routine chat parked an intent: land scrolled to
  // this card (where the tool gets switched on and set up), then clear the flag
  // so an ordinary visit opens normally.
  useEffect(() => {
    try {
      if (localStorage.getItem("vaenyx.toolsIntent")) {
        localStorage.removeItem("vaenyx.toolsIntent");
        document.getElementById("engines")?.scrollIntoView({ block: "start" });
      }
    } catch {
      // Storage blocked: the settings page still opened.
    }
  }, []);

  // The 150 MB download's progress poll used to live here, beside the button
  // that started it. Both moved to the Models card (Oskar, 2026-08-01):
  // installing a voice onto this machine is connecting a model, and the poll
  // has to stay in the same component as the button or one can be moved
  // without the other. It is still card-level and never inside a drawer — a
  // closed drawer is unmounted, and an unmounted interval means a finished
  // download that switches nothing on.

  // Ask the main model what is free right now. This is the "Update Free
  // Options" button the old Model keys card had, restored to one press from
  // the page when that card was folded into this one.
  //
  // The window opens on the answer that just arrived: everything this press
  // changes lives inside that window, and a button whose entire effect is
  // hidden behind another button is a button that did nothing.
  async function updateFreeOptions() {
    setFreeBusy(true);
    try {
      setFreePicks(await refreshFreePicks());
      setShowFree(true);
    } catch (error) {
      showErrorToast(
        error instanceof Error
          ? error.message
          : lang === "zh"
            ? "问不到。"
            : "Could not ask.",
      );
    } finally {
      setFreeBusy(false);
    }
  }

  // Really do this one job, once, and say what happened. The three outcomes
  // come back from the server already worded — it is the only side that knows
  // which engine answered and what it said.
  async function runTest(id: string) {
    setTesting(id);
    try {
      // Two of the seven cannot be tested by the server, for opposite reasons:
      // nothing on that side can listen, and nothing on that side can speak.
      // Both are testable HERE, because the browser has ears and a mouth — so
      // every row gets the same button rather than two rows quietly getting an
      // apology instead of a control.
      if (id === "speaking" || id === "hearing") {
        const result =
          id === "speaking" ? await testSpeakingHere() : await testHearingHere();
        setTestResults((current) => ({ ...current, [id]: result }));
        return;
      }
      const result = await runCapabilityTest(id, lang === "zh" ? "zh" : "en");
      setTestResults((current) => ({ ...current, [id]: result }));
    } catch (error) {
      // The test never reached the server (offline, session expired). That is a
      // failure of the test, not of the capability, and it is worded as one.
      setTestResults((current) => ({
        ...current,
        [id]: {
          status: "failed",
          engine: "",
          detail:
            error instanceof Error
              ? error.message
              : lang === "zh"
                ? "测试没跑起来。"
                : "The test could not be run.",
        },
      }));
    } finally {
      // Always back to normal: a button stuck on "Testing…" is its own lie.
      setTesting(null);
    }
  }

  // Speaking, tested where the ears are. The machine cannot judge whether a
  // voice came out, so it does not pretend to: it reports that the sound was
  // produced and played, and the owner's own ears do the last step. That is
  // still a real test — a broken engine throws before anything plays.
  async function testSpeakingHere(): Promise<CapabilityTestResult> {
    const engine = speakingEngine === "none" ? "" : speakingEngine;
    if (global?.speaking === false) {
      return {
        status: "failed",
        engine,
        detail:
          lang === "zh"
            ? "「念」在这一行是关的。"
            : "Speaking is switched off on this row.",
      };
    }
    try {
      const sample =
        lang === "zh"
          ? "你好,我是 Vaenyx。这是当前音色的试听。"
          : "Hello, this is Vaenyx. This is the voice you have set.";
      // The blip must be created and played inside the click, before the await:
      // a phone will not let an element sound seconds later unless it already
      // sounded once during the gesture.
      const audio = new Audio(SILENT_WAV);
      void audio.play().catch(() => undefined);
      const { audioId } = await synthesizeSpeech(sample);
      audio.src = `/v1/voice/audio/${audioId}`;
      await audio.play();
      return {
        status: "ok",
        engine,
        detail:
          lang === "zh"
            ? "念出来了 —— 听见了就是通了。"
            : "It spoke — if you heard it, this works.",
      };
    } catch (error) {
      return {
        status: "failed",
        engine,
        detail:
          error instanceof Error
            ? error.message
            : lang === "zh"
              ? "放不出声音。"
              : "No sound came out.",
      };
    }
  }

  // Hearing, tested where the microphone is. A recording of a real voice is the
  // only honest input, and the only real voice available is the owner's — so
  // the test records three seconds and shows what came back. You know what you
  // said, which is what makes this a test rather than a demonstration.
  async function testHearingHere(): Promise<CapabilityTestResult> {
    const engine = hearingEngine === "none" ? "" : hearingEngine;
    if (global?.hearing === false) {
      return {
        status: "failed",
        engine,
        detail:
          lang === "zh"
            ? "「听」在这一行是关的。"
            : "Hearing is switched off on this row.",
      };
    }
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const parts: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) parts.push(event.data);
      };
      const stopped = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });
      recorder.start();
      await new Promise((resolve) => window.setTimeout(resolve, 3000));
      recorder.stop();
      await stopped;
      const heard = await transcribeAudio(
        new Blob(parts, { type: recorder.mimeType || "audio/webm" }),
        lang === "zh" ? "zh" : "en",
      );
      const words = heard.text.trim();
      if (!words) {
        return {
          status: "failed",
          engine,
          detail:
            lang === "zh"
              ? "录到了声音,但什么字都没转出来。"
              : "It recorded, but no words came back.",
        };
      }
      return {
        status: "ok",
        engine,
        detail:
          lang === "zh" ? `听到的是:「${words}」` : `It heard: “${words}”`,
      };
    } catch (error) {
      return {
        status: "failed",
        engine,
        detail:
          error instanceof Error
            ? error.message
            : lang === "zh"
              ? "麦克风打不开。"
              : "The microphone could not be opened.",
      };
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
    }
  }

  // Pick a local voice for its language slot; a not-yet-downloaded voice starts
  // its ~60 MB download. The answer goes UP to the Settings page rather than
  // into this card: that is what starts the one poll watching it, so the bar
  // below moves and the two pickers come back on their own.
  async function pickLocalVoice(id: string, slotLang: "zh" | "en") {
    setOutputError(null);
    if (slotLang === "en") setLocalEnVoice(id);
    else setLocalZhVoice(id);
    try {
      onLocalTtsChanged(await setLocalVoice(id));
    } catch {
      setOutputError("Could not change the local voice.");
    }
  }

  // WHICH MODEL DOES THIS JOB, on the same row as WHETHER IT MAY (Oskar asked
  // four times). They are the two halves of one capability; split across two
  // cards, nobody can ever tell what is actually set.
  //
  // Every row that can be done at all gets a chooser, never a printed word
  // (Oskar, 2026-07-31): "main model" written flat looks like a label you
  // cannot act on. Reading and Web genuinely have one choice today, so their
  // list has one entry — an honest list of one, not a dead caption. When they
  // grow their own engines the entries appear and nothing else changes.
  // Real model names, never the words "main model" (Oskar, 2026-07-31). A row
  // that says "main model" makes you go and look up what that is; the name is
  // the thing you wanted to know. Which one happens to BE the main model is a
  // note in brackets after the name — that is the fact worth marking, and it
  // moves by itself when you change the main model below.
  const mainNote = lang === "zh" ? "(主模型)" : "(main model)";
  function slotOptions(slot: string, extra: PickerOption[] = []) {
    const connected = providers.filter((provider) => provider.connected);
    // Connected but not able to do THIS job stays in the list, greyed
    // (AI-CONNECT): you should see that it is there and cannot do this here,
    // not wonder where it went.
    const options: PickerOption[] = connected.map((provider) => ({
      disabled: !provider.capabilities.includes(slot),
      label: provider.isDefault ? `${provider.name} ${mainNote}` : provider.name,
      value: provider.id,
    }));
    return [...options, ...extra];
  }
  // No "off" in any of these lists (Oskar): off is what the switch on the right
  // is for, and offering it twice means two controls that can disagree. So the
  // list is only ever "which one", and the main model is what you get until you
  // say otherwise.
  function firstUsable(options: PickerOption[]) {
    const main = options.find(
      (option) => !option.disabled && option.label.endsWith(mainNote),
    );
    return (main ?? options.find((option) => !option.disabled))?.value ?? "";
  }
  const mainOnly = (() => {
    const main = providers.find(
      (provider) => provider.connected && provider.isDefault,
    );
    return main
      ? [{ label: `${main.name} ${mainNote}`, value: main.id }]
      : ([] as PickerOption[]);
  })();

  // Fetching rides the main model like Reading does, and for the same reason
  // (Oskar, 2026-08-01: "不应该限制到claude"). Tying it to one backend was an
  // implementation showing through the product: it was built on that backend's
  // own file tool, so only that backend could do it. Wrong way round — VAENYX
  // opens the file, against the folders the Owner named, and hands the words to
  // whichever model answers. Every model works, and the model never gets a tool
  // that can reach a disk at all, which is also the safer half of the trade.

  const engines: Record<
    string,
    | {
        options: PickerOption[];
        /** `voice` is Speaking's alone — the Gemini voices are a property of
         *  the connection, so choosing one goes through the same call that
         *  chose the engine rather than a second path that could drift. */
        set: (next: string, voice?: string) => Promise<void>;
        value: string;
      }
    | undefined
  > = {
    drawing: {
      options: slotOptions("image"),
      set: async (next) => {
        const status = await setImageEngineChoice(
          next as "none" | "workersai" | "gemini" | "openai" | "zhipu",
        );
        setDrawingEngine(status.provider ?? "none");
      },
      value: drawingEngine,
    },
    hearing: {
      options: slotOptions("voice-in"),
      set: async (next) => {
        const status = await setVoiceInput(next as "none" | "groq" | "openai");
        setHearingEngine(status.provider ?? "none");
      },
      value: hearingEngine,
    },
    // Reading and Web are done by whichever model answers you; there is no
    // second choice to offer yet, so the list is one entry — the real name.
    reading: { options: mainOnly, set: async () => undefined, value: "" },
    speaking: {
      // The two that are not models at all: this browser's own voice, and the
      // voice downloaded onto this machine.
      options: slotOptions("voice-out", [
        {
          label: lang === "zh" ? "本机浏览器" : "This device",
          value: "browser",
        },
        {
          label: lang === "zh" ? "本机语音" : "On this machine",
          value: "local",
        },
      ]),
      set: async (next, voice) => {
        const status = await connectVoiceOutput({
          engine: next as "none" | "browser" | "gemini" | "local",
          ...(voice ? { voice } : {}),
        });
        setOutput(status);
        setSpeakingEngine(status.engine ?? "none");
        if (status.voice && status.engine === "gemini") {
          setOutputVoice(status.voice);
        }
      },
      value: speakingEngine,
    },
    vision: {
      options: slotOptions("vision"),
      set: async (next) => {
        const status = await setVisionEngine(
          next as "none" | "gemini" | "zhipu" | "openai" | "claude-sub",
        );
        setVisionEngineState(status.provider ?? "none");
      },
      value: visionEngine,
    },
    fetching: { options: mainOnly, set: async () => undefined, value: "" },
    web: { options: mainOnly, set: async () => undefined, value: "" },
  };
  for (const entry of Object.values(engines)) {
    // Nothing chosen yet reads as the main model, not as a blank.
    if (entry && (entry.value === "" || entry.value === "none")) {
      entry.value = firstUsable(entry.options);
    }
  }

  async function pickEngine(id: string, next: string) {
    const engine = engines[id];
    if (!engine) return;
    setBusy(id);
    try {
      await engine.set(next);
    } catch (error) {
      showErrorToast(
        error instanceof Error
          ? error.message
          : lang === "zh"
            ? "改不了。"
            : "Could not change that.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function flip(id: string, on: boolean) {
    setBusy(id);
    try {
      const next = await updateCapabilities({ [id]: on }, lang);
      setGlobal(next);
      // Switching Speaking back on has to bring the chat page's speak buttons
      // back without a reload, and switching it off has to take them away. The
      // machine's answer is the session's answer here: this write is refused
      // inside a mode altogether, so nothing can be narrowing it.
      noteSpeakingOn(next);
      // The row shows a model the moment you switch it on, so that model has to
      // be the one really wired up — otherwise the display is a promise the
      // machine never made. Only ever fills a blank; it never overrides a
      // choice you made.
      const engine = engines[id];
      const unset =
        id === "hearing"
          ? hearingEngine
          : id === "speaking"
            ? speakingEngine
            : id === "vision"
              ? visionEngine
              : id === "drawing"
                ? drawingEngine
                : null;
      if (on && engine && (unset === "none" || unset === "") && engine.value) {
        await engine.set(engine.value);
      }
      // Two of the seven say what they really do before they do it (copy pack
      // N1/N2). The switch has already moved by the time this opens, on purpose:
      // the window's own "Switch it off" is the undo, so the Owner reads an
      // explanation of a state the machine is actually in rather than one it is
      // asking permission to enter.
      const noticeKey = capabilityNoticeKey(id);
      if (on && noticeKey && noticeSeen && !noticeSeen.has(noticeKey)) {
        setCapabilityNotice(id);
      }
    } catch (error) {
      showErrorToast(
        error instanceof Error
          ? error.message
          : lang === "zh"
            ? "改不了。"
            : "Could not change that.",
      );
    } finally {
      setBusy(null);
    }
  }

  // The Owner answered one of the two explainers. Either answer is recorded —
  // the record is what stops the window coming back, and a decline that left no
  // trace would be indistinguishable from never having been asked.
  async function answerCapabilityNotice(id: string, keepItOn: boolean) {
    const keyName = capabilityNoticeKey(id);
    if (!keyName) return;
    setCapabilityNotice(null);
    setNoticeSeen((current) => new Set(current ?? []).add(keyName));
    try {
      await recordLegalAck({
        keyName,
        copyVersion: LEGAL_COPY_VERSION,
        language: lang === "zh" ? "zh" : "en",
        choice: keepItOn ? "keep" : "off",
      });
    } catch {
      // The record did not land. Nothing here is a permission — the capability
      // is doing whatever the switch says — so the only cost is being told
      // again next visit, which is the safe direction to fail in.
    }
    if (!keepItOn) await flip(id, false);
  }

  // Speaking's voice list belongs to the Gemini connection, so choosing one
  // goes back through the connection rather than through a second setting.
  async function applyGeminiVoice(voice: string) {
    setSetupBusy(true);
    setOutputError(null);
    try {
      setOutputVoice(voice);
      await engines.speaking?.set("gemini", voice);
    } catch (nextError) {
      setOutputError(
        nextError instanceof Error
          ? nextError.message
          : "Could not update voice output.",
      );
    } finally {
      setSetupBusy(false);
    }
  }

  // F6 (copy pack): a free-option line that came from the model — rather than
  // from the hand-checked shipped list — carries the may-be-wrong caveat right
  // beside it. Only one drawer is open at a time, so it appears at most once.
  function freeAnswerLine(
    pick: { checkedAt: string; source: string } | undefined,
  ) {
    if (!pick) return null;
    return (
      <p className="context-disclaimer">{freeAnswerNotice(t, lang, pick)}</p>
    );
  }

  function hearingSetup() {
    return drawer({
      what: (
        <p className="settings-card-copy">
          {lang === "zh"
            ? "麦克风按钮 —— 你说的话变成文字。"
            : "The mic button — what you say becomes text."}
        </p>
      ),
      who: (
        <>
          <p className="settings-card-copy">
            {lang === "zh"
              ? "转写在这一行选的那个服务上做,录音发过去,回来的是文字。它的 key 在下面的 Models 里粘。"
              : "The transcribing happens at whichever service this row is set to: the recording goes there, words come back. Its key is pasted below, in Models."}
          </p>
          <FreePick
            href="https://console.groq.com"
            pick={freePicks?.items.voiceIn}
          >
            {lang === "zh"
              ? "Groq —— 免费 key,不用绑卡。"
              : "Groq — free key, no card."}
          </FreePick>
          {freeAnswerLine(freePicks?.items.voiceIn)}
        </>
      ),
    });
  }

  function localVoiceOptions(voiceLang: "zh" | "en"): PickerOption[] {
    return (localTts?.voices ?? [])
      .filter((voice) => voice.lang === voiceLang)
      .map((voice) => ({
        label: voice.downloaded
          ? voice.label
          : `${voice.label}${lang === "zh" ? " —— 需下载 60 MB" : " — Downloads 60 MB"}`,
        value: voice.id,
      }));
  }

  function speakingSetup() {
    // WHICH voice speaks is how this job behaves, so it stays on the row. What
    // PUTS a voice on this machine — the 150 MB download, its progress and its
    // removal — is connecting a model, so it moved to the Models card (Oskar,
    // 2026-08-01: 所有添加模型都應該在模型那邊添加,然後 capability 這邊只是選擇模型).
    // Both engines' voice lists sit here together, so "change the voice" is one
    // place whatever happens to be speaking.
    //
    // `installed` is not just belt-and-braces: this card's copy of the status
    // arrives a moment after the first paint, and the server refuses to set
    // this engine at all until the download is there — so an uninstalled
    // "local" is only ever the half-second before the answer lands, and half a
    // second of the wrong sentence is worse than half a second of nothing.
    const voiceChoice =
      outputEngine === "local" && localTts?.installed ? (
        <>
          <p className="settings-card-copy">
            {lang === "zh"
              ? "回复是哪种语言,就用哪个音色。"
              : "The right voice is used per reply, by the language it is written in."}
          </p>
          <div className="field-pair">
            <div className="chat-font-field">
              <span>{lang === "zh" ? "英文音色" : "English Voice"}</span>
              <Picker
                ariaLabel={lang === "zh" ? "英文音色" : "English voice"}
                disabled={setupBusy || localTts.status === "downloading"}
                onChange={(next) => void pickLocalVoice(next, "en")}
                options={localVoiceOptions("en")}
                value={localEnVoice}
              />
            </div>
            <div className="chat-font-field">
              <span>{lang === "zh" ? "中文音色" : "Chinese Voice"}</span>
              <Picker
                ariaLabel={lang === "zh" ? "中文音色" : "Chinese voice"}
                disabled={setupBusy || localTts.status === "downloading"}
                onChange={(next) => void pickLocalVoice(next, "zh")}
                options={localVoiceOptions("zh")}
                value={localZhVoice}
              />
            </div>
          </div>
          {/* Picking a voice that is not on the machine yet fetches its own
              ~60 MB, so the wait it causes is shown where it was caused. The
              first 150 MB install is a different thing, started and shown on
              the Models card — one poll, up on the Settings page, feeds both. */}
          {localTts.status === "downloading" ? (
            <>
              <p className="settings-card-copy">
                {lang === "zh" ? "下载中… " : "Downloading… "}
                {localTts.progress}%
                {localTts.detail ? ` · ${localTts.detail}` : ""}
              </p>
              <progress
                className="local-tts-progress"
                max={100}
                value={localTts.progress}
              />
            </>
          ) : null}
        </>
      ) : outputEngine === "gemini" ? (
        <div className="chat-font-field">
          <span>{lang === "zh" ? "音色" : "Voice"}</span>
          <Picker
            ariaLabel={lang === "zh" ? "Gemini 音色" : "Gemini voice"}
            disabled={setupBusy}
            onChange={(next) => void applyGeminiVoice(next)}
            options={GEMINI_TTS_VOICES.map((option) => ({
              label: option.label,
              value: option.id,
            }))}
            value={outputVoice}
          />
        </div>
      ) : null;
    return drawer({
      what: (
        <p className="settings-card-copy">
          {lang === "zh" ? "回复念出来。" : "Replies read aloud."}
        </p>
      ),
      // An engine with no voice to choose from leaves this part out entirely,
      // rather than printing a heading with nothing under it.
      settings: voiceChoice ? (
        <>
          {voiceChoice}
          {outputError ? <p className="form-error">{outputError}</p> : null}
        </>
      ) : null,
      who: (
        <>
          <p className="settings-card-copy">
            {lang === "zh"
              ? "跟这一行选的引擎走。本机语音在这台电脑上生成,什么都不出去、也没有每次的费用;Gemini 那种是发出去合成的,声音更自然。本机语音在下面的 Models 里装。"
              : "Whichever engine this row is set to. The voice on this machine is generated here — nothing leaves and there is no per-use cost; Gemini and the like synthesise it away from here and sound more natural. The voice on this machine is installed below, in Models."}
          </p>
          {outputEngine === "browser" ? (
            <p className="settings-card-copy">
              {lang === "zh"
                ? "现在用的是这台设备自带的语音。Gemini TTS 或本机语音听起来自然得多。"
                : "Right now that is the device's own built-in voice. Gemini TTS or the voice on this machine sound much more natural."}
            </p>
          ) : null}
          <FreePick pick={freePicks?.items.voiceOut}>
            {lang === "zh"
              ? "本机语音 —— 永久免费,离线可用。"
              : "Local Voice — free forever, works offline."}
          </FreePick>
          {freeAnswerLine(freePicks?.items.voiceOut)}
        </>
      ),
    });
  }

  function visionSetup() {
    return drawer({
      what: (
        <p className="settings-card-copy">
          {lang === "zh"
            ? "相机按钮 —— 一张照片变成文字。"
            : "The camera button — a photo becomes words."}
        </p>
      ),
      who: (
        <>
          <p className="settings-card-copy">
            {lang === "zh"
              ? "照片直接发给这一行选的模型。有的模型自己就会看图,有的得靠别人先描述一遍 —— 这一行选的就是真正看图的那个。它的 key 在下面的 Models 里粘。"
              : "The photo goes to the model this row is set to. Some models look at a picture first-hand; this row is the one that actually does the looking. Its key is pasted below, in Models."}
          </p>
          <FreePick
            href="https://aistudio.google.com/apikey"
            pick={freePicks?.items.vision}
          >
            {lang === "zh"
              ? "Gemini —— Google AI Studio 的免费 key。"
              : "Gemini — free Google AI Studio key."}
          </FreePick>
          {freeAnswerLine(freePicks?.items.vision)}
        </>
      ),
    });
  }

  function drawingSetup() {
    // This row has no settings of its own any more. The Cloudflare token and
    // account id were typed here because pictures are the one thing a household
    // adds Cloudflare for — but a token is a key, and a key belongs to the model
    // rather than to the job it was bought for (Oskar, 2026-08-01: 所有添加模型
    // 都應該在模型那邊添加,然後 capability 這邊只是選擇模型). Both fields moved to
    // the Models card, which is also the honest home for them: the same Workers
    // AI connection can answer chats, not only draw. The row picks the engine
    // and nothing else, so the drawer leaves the settings part out entirely.
    return drawer({
      what: (
        <p className="settings-card-copy">
          {lang === "zh"
            ? "在聊天里说一句,就画出一张图。关掉,Vaenyx 就不会去画。"
            : "Ask in chat and a picture is made. Off means Vaenyx will not try."}
        </p>
      ),
      who: (
        <>
          <p className="settings-card-copy">
            {lang === "zh"
              ? "跟这一行选的引擎走,跟看图的那个是两回事 —— 会看图的模型不一定会画。Cloudflare Workers AI 和智谱都是免费的,在下面的 Models 里连。"
              : "Whichever engine this row is set to, which is a different thing from the one that looks at pictures — a model that can see one cannot necessarily make one. Cloudflare Workers AI and Zhipu are both free, and both are connected below, in Models."}
          </p>
          <FreePick
            href="https://dash.cloudflare.com/profile/api-tokens"
            pick={freePicks?.items.image}
          >
            {lang === "zh"
              ? "Cloudflare Workers AI —— 免费,一天大约 170 张。"
              : "Cloudflare Workers AI — free, about 170 pictures a day."}
          </FreePick>
          {freeAnswerLine(freePicks?.items.image)}
        </>
      ),
    });
  }

  // Every refusal has a different fix, so each one gets its own sentence. A
  // single "that folder could not be added" would leave the Owner guessing
  // between a typo, a folder that is not there, and one Vaenyx will never open.
  function folderRefusal(reason: string): string {
    if (reason === "not-absolute") {
      return lang === "zh"
        ? "要写完整路径,例如 C:\\Users\\你\\Documents。"
        : "Give the full path, like C:\\Users\\you\\Documents.";
    }
    if (reason === "not-a-folder") {
      return lang === "zh"
        ? "那是一个文件,不是文件夹。"
        : "That is a file, not a folder.";
    }
    if (reason === "protected") {
      return lang === "zh"
        ? "那个文件夹装着 Vaenyx 自己的资料,永远不能加进来。"
        : "That folder holds Vaenyx's own data, so it can never be added.";
    }
    if (reason === "too-many") {
      return lang === "zh" ? "文件夹太多了。" : "That is too many folders.";
    }
    return lang === "zh" ? "找不到那个文件夹。" : "There is no such folder.";
  }

  // The server is the one that decides: it resolves the path, follows any
  // links and refuses what it will not take, so the screen shows what was
  // really stored rather than what was typed.
  async function saveFolders(next: string[]) {
    setFolderErrors([]);
    try {
      const result = await updateCapabilityFolders(next, lang);
      setFolders(result.folders);
      setFolderErrors(
        result.rejected.map(
          (entry) => `${entry.folder} — ${folderRefusal(entry.reason)}`,
        ),
      );
    } catch (error) {
      setFolderErrors([
        error instanceof Error
          ? error.message
          : lang === "zh"
            ? "这些文件夹没能存下来。"
            : "Could not save the folders.",
      ]);
    }
  }

  function fetchingSetup() {
    return drawer({
      what: (
        <p className="settings-card-copy">
          {lang === "zh"
            ? "只有你在下面点名的文件夹,Vaenyx 才能打开里面的文字文件。没有点名之前,就算开关是开的,它也一个字都读不到。"
            : "Vaenyx can open text files from the folders you name here, and nowhere else. Until you name one, the switch on its own reads nothing at all."}
        </p>
      ),
      settings: (
        <>
        <DoorList
          addLabel={lang === "zh" ? "加上" : "Add"}
          draft={folderDraft}
          items={folders}
          onChange={(next) => void saveFolders(next)}
          placeholder={
            lang === "zh"
              ? "C:\\Users\\你\\Documents"
              : "C:\\Users\\you\\Documents"
          }
          setDraft={setFolderDraft}
        />
        {folderErrors.map((line) => (
          <p className="form-error" key={line}>
            {line}
          </p>
        ))}
        </>
      ),
      who: (
        <p className="settings-card-copy">
          {lang === "zh"
            ? "开文件的是 Vaenyx 自己,不是模型 —— 模型拿到的只是文字,它没有任何能碰到硬盘的工具。所以主模型是哪个都行。文档和扫描件走聊天里的附件按钮,那是「读文档」。"
            : "Vaenyx opens the file, not the model — the model is handed words and never gets a tool that can touch a disk. So it works with whichever main model you use. Documents and scans go through the chat's attach button instead — that is Reading."}
        </p>
      ),
    });
  }

  // Reading and Web have no key and no engine of their own — they ride the main
  // model — so their drawers hold the one thing that was missing: what the row
  // actually means on this machine, and a way to try it.
  function readingSetup() {
    return drawer({
      what: (
        <p className="settings-card-copy">
          {lang === "zh"
            ? "在聊天里用附件按钮丢进来的 PDF 或文档。"
            : "A PDF or document you attach in a chat with the attach button."}
        </p>
      ),
      who: (
        <p className="settings-card-copy">
          {lang === "zh"
            ? "跟主模型走,但怎么读不一样:Claude 把每一页当图片和文字一起读;别的模型只拿到本机抠出来的文字,图和表格它看不见。超过十页会先问你,因为那是真花钱的。"
            : "It rides the main model, but how it reads differs: Claude takes every page as picture and text; every other model is handed words pulled out of the file here, so drawings and tables never reach it. Over ten pages you are asked first, because that costs real money."}
        </p>
      ),
    });
  }

  function webSetup() {
    return drawer({
      what: (
        <p className="settings-card-copy">
          {lang === "zh"
            ? "回答的时候上网查一下,而不是只用它记住的东西。"
            : "Looking something up on the internet while it answers, instead of answering only from memory."}
        </p>
      ),
      who: (
        <p className="settings-card-copy">
          {lang === "zh"
            ? "跟主模型走。今天只有 Codex CLI (ChatGPT) 和 Claude(订阅)真的会去搜;别的模型只能用训练时记住的东西回答,而且答错的时候一样自信 —— 所以这一项默认是开的。"
            : "It rides the main model. Only the Codex CLI (ChatGPT) and Claude (Subscription) backends really search today; every other model answers from what it memorised when it was trained, and sounds just as certain when that is out of date — which is why this one ships on."}
        </p>
      ),
    });
  }

  // Three outcomes, never merged: it worked, it failed in the failing side's
  // own words, or that path is not built. The wording all comes from the server
  // — it is the only side that knows which engine answered and what it said.
  // On the row, not folded away (Oskar, 2026-08-01). A test you have to go
  // looking for is a test nobody runs; "does this actually work" is the first
  // question anyone has about a row, so it is answered on the row. The cost
  // rides in the button's title rather than as a line of its own, because four
  // words of warning beside every row is louder than the rows themselves.
  function rowTest(id: string) {
    const cost = TEST_COST[id];
    if (!cost) return null;
    const running = testing === id;
    return (
      <button
        className="capability-row-test"
        disabled={running}
        onClick={() => void runTest(id)}
        title={lang === "zh" ? cost.zh : cost.en}
        type="button"
      >
        {running
          ? lang === "zh"
            ? "测试中…"
            : "Testing…"
          : lang === "zh"
            ? "测一次"
            : "Test"}
      </button>
    );
  }

  // The answer is a sentence in somebody else's words, so it gets the full
  // width under the row rather than being squeezed into it.
  function testAnswer(id: string) {
    const result = testResults[id];
    if (!result) return null;
    const mark =
      result.status === "ok" ? "✓" : result.status === "failed" ? "✗" : "—";
    return (
      <p className={`capability-test-result ${result.status}`}>
        {`${mark} ${result.engine ? `${result.engine}${lang === "zh" ? ":" : ": "}` : ""}${result.detail}`}
      </p>
    );
  }

  // Every drawer is the same three parts, in the same order (Oskar: 抽屉内容做到
  //完全统一). A drawer that is laid out differently on each row makes you read
  // each row from scratch; laid out the same, you learn it once and then you
  // are only reading the words that changed. The parts answer the three
  // questions in the order they get asked: what IS this, what do I set, and
  // what actually does it.
  function drawer(parts: {
    /** What the capability is, in one line. */
    what: ReactNode;
    /** Its own settings, if it has any of its own. */
    settings?: ReactNode;
    /** Who really performs it, and what happens when nothing can. */
    who: ReactNode;
  }) {
    return (
      <>
        <p className="drawer-head">{lang === "zh" ? "这是什么" : "What it is"}</p>
        {parts.what}
        {parts.settings ? (
          <>
            <p className="drawer-head">
              {lang === "zh" ? "它自己的设置" : "Its own settings"}
            </p>
            {parts.settings}
          </>
        ) : null}
        <p className="drawer-head">
          {lang === "zh" ? "谁真的在做" : "What actually does it"}
        </p>
        {parts.who}
      </>
    );
  }

  function setupFor(id: string) {
    const body =
      id === "hearing"
        ? hearingSetup()
        : id === "speaking"
          ? speakingSetup()
          : id === "vision"
            ? visionSetup()
            : id === "drawing"
              ? drawingSetup()
              : id === "reading"
                ? readingSetup()
                : id === "fetching"
                  ? fetchingSetup()
                  : id === "web"
                    ? webSetup()
                    : null;
    return body;
  }

  return (
    // The id the routine chat's "Set It Up" button scrolls to. It still reads
    // "engines" because that is the value already parked in localStorage by
    // installed copies; renaming it would strand every pending jump.
    <section className="settings-card" id="engines">
      <p className="eyebrow">What Vaenyx may do</p>
      <div className="settings-card-head">
        <h2>Capabilities</h2>
        {/* The free-model survey lives behind these two, not on the page
            (Oskar, 2026-07-31). It is a thing you consult perhaps twice a
            year; on the page it was permanent furniture in front of the
            switches you touch weekly. The first opens LAST time's answer — a
            stale answer you can see beats a spinner every time you look — and
            the second is the survey's ONE refresh, on the page rather than
            inside the window because that is where it sat on the Model keys
            card this page swallowed.

            The two labels name different things on purpose. "Update Free
            Options" contained "Free models" word for word, so on a phone the
            pair read as one label wrapped onto two lines and either one could
            be pressed for the other — and pressing the wrong one costs a real
            request to the main model. */}
        <div className="card-head-actions">
          <button
            className="text-button"
            onClick={() => setShowFree(true)}
            type="button"
          >
            {lang === "zh" ? "免费额度" : "Free models"}
          </button>
          <button
            className="text-button"
            disabled={freeBusy}
            onClick={() => void updateFreeOptions()}
            type="button"
          >
            {freeBusy
              ? lang === "zh"
                ? "问着…"
                : "Asking…"
              : lang === "zh"
                ? "再问一次"
                : "Ask again"}
          </button>
        </div>
      </div>
      <p className="settings-card-copy">
        {lang === "zh"
          ? "这是天花板。在这里关掉的东西,任何 Method、任何模式、任何 app 钥匙都够不着 —— 不管它们要什么。"
          : "The ceiling. Anything switched off here is out of reach of every Method, every mode and every app key — whatever they ask for."}
      </p>
      {/* One row is not yet all of that, and saying so is cheaper than a
          promise that quietly is not kept: switching Web off does stop a
          Method and an app key from searching, but an ordinary chat still
          looks things up. Enforcing it there would need every backend to
          honour it, and two of them cannot yet. */}
      <p className="settings-card-copy">
        {lang === "zh"
          ? "只有「上网」还差一步:关掉它,Method 和 app 钥匙就不能搜了,但普通聊天还是会去查。"
          : "Web is the one that is not all the way there yet: switching it off stops Methods and app keys from searching, but an ordinary chat still looks things up."}
      </p>
      {/* The fact the old Model keys card opened with: these are not seven
          separate accounts. It used to read "a key added on any row" — true
          when two rows took a key of their own, and false since both moved to
          Models (Oskar, 2026-08-01). What it has to say now is why a row can
          offer a model the Owner never set up on that row. */}
      <p className="settings-card-copy">
        {lang === "zh"
          ? "一个服务商在下面的 Models 里连一次,进的就是同一个池子:凡是它能干的活,每一行都能挑它。"
          : "Connect a provider once, below in Models, and it joins one shared pool: every row that provider can serve may choose it."}
      </p>
      {/* N5 — the answer to "what does one call cost", which the app could not
          give anywhere except in the title of a Test button. Above the switches
          because that is where somebody is deciding whether to switch one on,
          and persistent rather than behind a press: burying the answer one tap
          deep is the same as not having it. No prices — those are the
          provider's, they go stale, and a stale number of ours is worse than
          none. */}
      <div className="capability-cost">
        <p className="drawer-head">{t("legal.notice.capability.cost.title")}</p>
        {t("legal.notice.capability.cost")
          .split("\n\n")
          .map((paragraph) => (
            <p className="settings-card-copy" key={paragraph.slice(0, 24)}>
              {paragraph}
            </p>
          ))}
      </div>
      {/* N1/N2 — said once, before the capability is used, and both buttons are
          real: "Switch it off" really switches it off, so this is a decision
          rather than a wall to click past. Closing it without answering records
          nothing and it comes back next visit. */}
      {capabilityNotice ? (
        <Modal
          onClose={() => {
            setNoticePutOff((current) => new Set(current).add(capabilityNotice));
            setCapabilityNotice(null);
          }}
          title={t(`legal.notice.capability.${capabilityNotice}.title`)}
        >
          {t(`legal.notice.capability.${capabilityNotice}`)
            .split("\n\n")
            .map((paragraph) => (
              <p className="settings-card-copy" key={paragraph.slice(0, 24)}>
                {paragraph}
              </p>
            ))}
          <div className="modal-actions">
            <button
              className="secondary-button"
              onClick={() =>
                void answerCapabilityNotice(capabilityNotice, true)
              }
              type="button"
            >
              {t("legal.notice.capability.keep")}
            </button>
            <button
              className="secondary-button"
              onClick={() =>
                void answerCapabilityNotice(capabilityNotice, false)
              }
              type="button"
            >
              {t("legal.notice.capability.turnOff")}
            </button>
          </div>
        </Modal>
      ) : null}
      {showFree ? (
        <FreeModelsModal
          lang={lang}
          onClose={() => setShowFree(false)}
          picks={freePicks}
        />
      ) : null}
      {/* A failed read greys the switches and says so, rather than removing the
          card: this is the only place a capability can be switched off at all,
          and a card that silently disappears looks like a finished page instead
          of a broken one. */}
      {ceilingUnread ? (
        <p className="form-error">
          {lang === "zh"
            ? "这些开关读不出来,现在改不了。下面每一行的设置照常能用。"
            : "The switches could not be read, so they cannot be changed right now. The setup on each row still works."}
        </p>
      ) : null}
      <div className="capability-rows">
        {CAPABILITY_META.map((meta) => {
          const built = implemented[meta.id] !== false;
          const engine = engines[meta.id];
          const hasSetup = SETUP_ROWS.has(meta.id);
          const open = openSetup === meta.id;
          return (
            <Fragment key={meta.id}>
              <div className={open ? "capability-row open" : "capability-row"}>
                <span className="capability-row-icon">{meta.icon}</span>
                <span className="capability-row-name">
                  {lang === "zh" ? meta.name.zh : meta.name.en}
                  <em>({lang === "zh" ? meta.gloss.zh : meta.gloss.en})</em>
                </span>
                {engine ? (
                  <div className="capability-row-engine">
                    <Picker
                      ariaLabel={`${meta.name.en} model`}
                      disabled={busy === meta.id}
                      onChange={(next) => void pickEngine(meta.id, next)}
                      options={engine.options}
                      value={engine.value}
                    />
                  </div>
                ) : (
                  <span className="capability-row-engine" />
                )}
                {rowTest(meta.id)}
                {hasSetup ? (
                  <button
                    aria-controls={`setup-${meta.id}`}
                    aria-expanded={open}
                    aria-label={
                      lang === "zh"
                        ? `${meta.name.zh}的设置`
                        : `${meta.name.en} setup`
                    }
                    className={
                      open ? "capability-row-more open" : "capability-row-more"
                    }
                    onClick={() => setOpenSetup(open ? null : meta.id)}
                    type="button"
                  >
                    <LineIcon>
                      <path d="m7 10 5 5 5-5" />
                    </LineIcon>
                  </button>
                ) : null}
                {built ? (
                  <input
                    aria-label={lang === "zh" ? meta.name.zh : meta.name.en}
                    checked={global?.[meta.id] === true}
                    className="door-toggle"
                    disabled={busy === meta.id || !global}
                    onChange={(event) =>
                      void flip(meta.id, event.target.checked)
                    }
                    role="switch"
                    type="checkbox"
                  />
                ) : (
                  // Not "unsupported" — that reads as broken. Vaenyx simply has
                  // not built it yet, which is a different sentence and a
                  // different fix.
                  <span className="capability-row-pending">
                    {lang === "zh" ? "还没做出来" : "not built yet"}
                  </span>
                )}
              </div>
              {/* A SIBLING of the row, never a child: the indent and the full
                  width come from `grid-column: 1 / -1`, which resolves against
                  the rows grid and not against the flex row. */}
              {testAnswer(meta.id)}
              {hasSetup && open ? (
                <div className="capability-setup" id={`setup-${meta.id}`}>
                  {setupFor(meta.id)}
                </div>
              ) : null}
            </Fragment>
          );
        })}
      </div>
      {/* Adding a model happens in ONE place and it is not this card (Oskar,
          2026-08-01). A key belongs to the model, not to the job: the same key
          serves every row that model can do, so offering to add it on four
          different rows made one thing look like four. Here you only choose
          among what is connected. */}
      <p className="door-legend">
        {lang === "zh"
          ? "这里只选模型。要加新模型、贴 key,都在下面的 Models 里。"
          : "You only choose here. Connecting a model and pasting its key both happen below, in Models."}
      </p>
    </section>
  );
}

function ModelsPanel({
  // The voice download, held by the Settings page above both cards — this one
  // starts the 150 MB engine install, the Speaking row starts an extra voice,
  // and both watch the same answer move.
  localTts,
  // Called after anything that changes what is connected. The Capabilities card
  // above chooses among these backends and cannot hear about a connect on its
  // own, so every path that adds, removes or re-points one says so out loud.
  onConnectionsChanged,
  onLocalTtsChanged,
}: {
  localTts: LocalTtsStatus | null;
  onConnectionsChanged: () => void;
  onLocalTtsChanged: (next: LocalTtsStatus) => void;
}) {
  const { lang, t } = useI18n();
  const [providers, setProviders] = useState<ModelProviderInfo[]>([]);
  const [drafts, setDrafts] = useState<
    Record<string, { apiKey: string; baseUrl: string; model: string }>
  >({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Compact layout (Oskar, dev.127): connected backends are small cards; the
  // rest live behind one "Add a Model" dropdown whose pick expands its form.
  const [addTargetId, setAddTargetId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  // Disconnecting drops a stored key — ask first (Oskar, dev.171).
  const [confirmDisconnect, setConfirmDisconnect] = useState<string | null>(
    null,
  );
  // In-app Claude subscription sign-in (one click, no terminal — Oskar
  // 2026-07-29): the official sign-in URL to open, and the code the Owner
  // pastes back from claude.com. The official binary holds the whole flow.
  const [claudeLoginUrl, setClaudeLoginUrl] = useState<string | null>(null);
  const [claudeLoginCode, setClaudeLoginCode] = useState("");
  // Cloudflare's Workers AI is connected with a token and an account id rather
  // than a base URL, so it has its own form below (Oskar, 2026-08-01). These
  // two fields used to sit in the Drawing row's drawer, back when the only
  // reason to add Cloudflare was pictures. They are a key, so they live here.
  const [cloudflareToken, setCloudflareToken] = useState("");
  // A Workers AI-template token cannot name its own account (verified
  // 2026-07-27), so the id has its own always-visible field.
  const [cfAccountId, setCfAccountId] = useState("");
  // Deleting the local voice throws away a 150 MB download — ask first.
  const [confirmRemoveLocal, setConfirmRemoveLocal] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Anything that changes the connected set is written through here, so the
  // Capabilities card can never be left showing a list that no longer matches.
  function applyProviders(next: ModelProviderInfo[]) {
    setProviders(next);
    onConnectionsChanged();
  }

  async function beginClaudeLogin() {
    setBusy("claude-sub");
    setError(null);
    // Open the tab NOW, inside the click gesture, so popup blockers allow it;
    // point it at the sign-in URL the moment the server hands it over.
    const popup = window.open("", "_blank");
    try {
      const { url } = await startClaudeLogin();
      setClaudeLoginUrl(url);
      if (popup) popup.location.href = url;
    } catch {
      popup?.close();
      // requestJson already raised the toast with the server's reason.
    } finally {
      setBusy(null);
    }
  }

  async function finishClaudeLogin() {
    setBusy("claude-sub");
    setError(null);
    try {
      const result = await submitClaudeLoginCode(claudeLoginCode.trim());
      applyProviders(result.providers);
      setClaudeLoginUrl(null);
      setClaudeLoginCode("");
      setAddTargetId("");
      setEditingId(null);
    } catch {
      // Toast already shown; reset so they can restart cleanly.
      setClaudeLoginUrl(null);
      setClaudeLoginCode("");
    } finally {
      setBusy(null);
    }
  }
  // A sign-in-page model button parked a connect intent: open that provider's
  // add form once, then clear the intent so later visits open normally.
  const [connectTarget] = useState<string | null>(() =>
    localStorage.getItem(CONNECT_MODEL_INTENT),
  );
  useEffect(() => {
    localStorage.removeItem(CONNECT_MODEL_INTENT);
  }, []);
  useEffect(() => {
    if (!connectTarget || providers.length === 0) return;
    const target = providers.find(
      (provider) => provider.id === connectTarget && !provider.connected,
    );
    if (target) setAddTargetId(target.id);
    document
      .getElementById(`model-card-${connectTarget}`)
      ?.scrollIntoView({ block: "center" });
  }, [connectTarget, providers]);

  function reload() {
    fetchModelProviders()
      .then((result) => setProviders(result.providers))
      .catch(() => setError("Could not load model providers."));
  }
  useEffect(() => {
    reload();
  }, []);

  function draftFor(id: string) {
    return drafts[id] ?? { apiKey: "", baseUrl: "", model: "" };
  }
  function patchDraft(
    id: string,
    patch: Partial<{ apiKey: string; baseUrl: string; model: string }>,
  ) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...draftFor(id), ...patch },
    }));
  }

  async function connect(provider: ModelProviderInfo) {
    setBusy(provider.id);
    setError(null);
    const draft = draftFor(provider.id);
    try {
      const result = await connectModelProvider(provider.id, {
        ...(provider.needsKey ? { apiKey: draft.apiKey } : {}),
        ...(provider.needsBaseUrl ? { baseUrl: draft.baseUrl } : {}),
        ...(draft.model.trim() ? { model: draft.model.trim() } : {}),
      });
      applyProviders(result.providers);
      patchDraft(provider.id, { apiKey: "" });
      setAddTargetId("");
      setEditingId(null);
    } catch {
      setError(`Could not connect ${provider.name}.`);
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(provider: ModelProviderInfo) {
    setBusy(provider.id);
    setError(null);
    try {
      const result = await disconnectModelProvider(provider.id);
      applyProviders(result.providers);
    } catch {
      setError(`Could not disconnect ${provider.name}.`);
    } finally {
      setBusy(null);
    }
  }

  async function makeDefault(provider: ModelProviderInfo) {
    setBusy(provider.id);
    setError(null);
    try {
      const result = await setDefaultModelProvider(provider.id);
      applyProviders(result.providers);
    } catch {
      setError(`Could not set ${provider.name} as the default.`);
    } finally {
      setBusy(null);
    }
  }

  // One-click Codex sign-in: kick off the official `codex login` browser flow
  // on the machine Vaenyx runs on, then poll until the CLI reports signed-in
  // (or give up quietly after ~2 minutes — the card just stays as it was).
  // The CLI's own error line surfaces immediately instead of a blind wait,
  // and the sign-in URL is kept as a clickable fallback link.
  const [codexWaiting, setCodexWaiting] = useState(false);
  const [codexLoginUrl, setCodexLoginUrl] = useState<string | null>(null);
  async function signInCodex() {
    setCodexWaiting(true);
    setError(null);
    setCodexLoginUrl(null);
    try {
      const { url, detail } = await startCodexLogin();
      if (detail) {
        setError(detail);
        return;
      }
      if (url) {
        setCodexLoginUrl(url);
        window.open(url, "_blank", "noreferrer");
      }
      for (let attempt = 0; attempt < 40; attempt += 1) {
        await new Promise((resolveWait) => setTimeout(resolveWait, 3000));
        const result = await fetchModelProviders();
        setProviders(result.providers);
        if (result.providers.find((p) => p.id === "codex")?.healthy) {
          setCodexLoginUrl(null);
          // Only the attempt that succeeded is worth telling the other card
          // about; the forty that were still waiting changed nothing.
          onConnectionsChanged();
          break;
        }
      }
    } catch {
      setError("Could not start the ChatGPT sign-in.");
    } finally {
      setCodexWaiting(false);
    }
  }

  // Cloudflare answers with the one message that says what to fix ("check the
  // token was copied whole", "that account id is not 32 characters"), so it is
  // printed inside its own form rather than in the card's error line at the
  // top — a fix belongs beside the field it is about.
  const [cfError, setCfError] = useState<string | null>(null);
  // CONNECTING, and only connecting. This used to post the picture-engine
  // choice, so saving a token also made Workers AI the one that draws — over
  // whatever the Owner had chosen on the Drawing row, and again every time they
  // opened Edit and saved. Which model draws is that row's answer; this form
  // stores a key. An empty Drawing row still fills itself, server-side, the way
  // the voice and vision rows always have.
  async function saveWorkersAiToken() {
    setBusy("workersai");
    setCfError(null);
    try {
      // Either field may be blank on a connected card — the stored value stands
      // in — so an account id can be corrected on its own.
      const result = await connectWorkersAi(
        cloudflareToken.trim() || undefined,
        cfAccountId.trim() || undefined,
      );
      // The token is cleared because it is a secret and the field has done its
      // job; the account id stays, because it is not one and it is the field
      // somebody comes back to check.
      setCloudflareToken("");
      applyProviders(result.providers);
      setAddTargetId("");
      setEditingId(null);
    } catch (nextError) {
      setCfError(
        nextError instanceof Error
          ? nextError.message
          : "Could not connect Workers AI.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function startLocalDownload() {
    setVoiceError(null);
    try {
      onLocalTtsChanged(await installLocalTts());
    } catch {
      setVoiceError(
        lang === "zh" ? "下载没能开始。" : "Could not start the download.",
      );
    }
  }

  async function removeLocalVoice() {
    setVoiceBusy(true);
    setVoiceError(null);
    try {
      onLocalTtsChanged(await removeLocalTtsDownload());
      // Removing it can leave Speaking pointing at a voice that is gone, and
      // the server decides what it falls back to — so the row is told to look
      // again rather than being handed an answer from here.
      onConnectionsChanged();
    } catch {
      setVoiceError(
        lang === "zh" ? "删不掉这个下载。" : "Could not remove the download.",
      );
    } finally {
      setVoiceBusy(false);
    }
  }

  function renderConnectForm(provider: ModelProviderInfo) {
    // Claude subscription: one click. The server drives the OFFICIAL claude
    // binary's own login; the Owner just signs in on the page that opens and
    // pastes back the code it shows. A setup token remains as the manual
    // fallback for unusual setups.
    if (provider.id === "claude-sub") {
      return (
        <div className="model-connect-form">
          <p className="library-note">
            Uses your own Claude plan, subject to that plan's limits.
          </p>
          {claudeLoginUrl ? (
            <>
              <a
                className="primary-button claude-signin-button"
                href={claudeLoginUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open Claude Sign-In ↗
              </a>
              <p className="settings-card-copy text-faint">
                The sign-in page opened in a new tab (button above reopens
                it). Sign in, copy the code the page shows, paste it here:
              </p>
              <input
                autoCapitalize="off"
                autoComplete="off"
                autoFocus
                className="method-rename-input key-input"
                onChange={(event) => setClaudeLoginCode(event.target.value)}
                placeholder="Code from the sign-in page"
                spellCheck={false}
                type="text"
                value={claudeLoginCode}
              />
            </>
          ) : null}
          <p className="context-disclaimer">
            {t("legal.notice.modelConnect.cloud")}
          </p>
          <div className="model-card-actions">
            {claudeLoginUrl ? (
              <button
                className="secondary-button"
                disabled={busy === provider.id || !claudeLoginCode.trim()}
                onClick={() => void finishClaudeLogin()}
                type="button"
              >
                {busy === provider.id ? "Connecting…" : "Finish Sign-In"}
              </button>
            ) : (
              <button
                className="primary-button"
                disabled={busy === provider.id}
                onClick={() => void beginClaudeLogin()}
                type="button"
              >
                {busy === provider.id ? "Starting…" : "Sign In With Claude"}
              </button>
            )}
            <button
              className="text-button"
              onClick={() => {
                setClaudeLoginUrl(null);
                setClaudeLoginCode("");
                setEditingId(null);
                setAddTargetId("");
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
          {!claudeLoginUrl ? (
            <details className="claude-token-fallback">
              <summary className="text-faint">
                Have a setup token? Paste it instead
              </summary>
              <input
                autoCapitalize="off"
                autoComplete="off"
                className="method-rename-input key-input"
                onChange={(event) =>
                  patchDraft(provider.id, { apiKey: event.target.value })
                }
                placeholder="Setup token (from: claude setup-token)"
                spellCheck={false}
                type="text"
                value={draftFor(provider.id).apiKey}
              />
              <button
                className="secondary-button"
                disabled={
                  busy === provider.id || !draftFor(provider.id).apiKey.trim()
                }
                onClick={() => void connect(provider)}
                type="button"
              >
                Connect With Token
              </button>
            </details>
          ) : null}
        </div>
      );
    }
    // Workers AI: a token plus an account id, never a hand-typed base URL. The
    // endpoint embeds the account id, so asking for the URL asked the Owner to
    // assemble it themselves — this form takes the two things Cloudflare
    // actually shows you and builds the rest, and the server checks the pair
    // with a real call before it saves anything.
    //
    // It is written in both languages while the rest of this card is not: it
    // arrived from the Drawing drawer bilingual, and dropping a language to
    // match its new neighbours would be losing something in a move.
    if (provider.id === "workersai") {
      return (
        <div className="model-connect-form">
          <p className="library-note">
            {lang === "zh"
              ? "免费额度:每天 10,000 Neurons —— 大约 170 张图。同一个令牌也能用来聊天。"
              : "Free tier: 10,000 Neurons a day — about 170 pictures. The same token can answer chats too."}
          </p>
          <a
            className="model-key-link"
            href="https://dash.cloudflare.com/profile/api-tokens"
            rel="noreferrer"
            target="_blank"
          >
            {lang === "zh" ? "去 Cloudflare 建令牌 ↗" : "Make a token ↗"}
          </a>
          <div className="chat-font-field">
            <span>{lang === "zh" ? "Workers AI 令牌" : "Workers AI Token"}</span>
            <input
              autoCapitalize="off"
              autoComplete="off"
              className="key-input"
              disabled={busy === provider.id}
              onChange={(event) => setCloudflareToken(event.target.value)}
              placeholder={
                lang === "zh"
                  ? "粘贴 Cloudflare 那边的令牌"
                  : "Paste the token from Cloudflare"
              }
              spellCheck={false}
              type="text"
              value={cloudflareToken}
            />
          </div>
          {cloudflareToken.trim().length > 0 &&
          cloudflareToken.trim().length < 40 ? (
            <p className="settings-card-copy text-faint">
              {lang === "zh"
                ? "这比 Cloudflare 的令牌短(应该是 40 个字符)—— 确认整段都复制到了。"
                : "That looks shorter than a Cloudflare token (40 characters) — make sure the whole value was copied."}
            </p>
          ) : null}
          {/* Always visible, not revealed-on-error: "where do I paste the id"
              must never be a puzzle (Oskar, 2026-07-27). A broad token can
              leave it empty; a Workers AI-template token needs it. */}
          <div className="chat-font-field">
            <span>{lang === "zh" ? "账户 ID" : "Account ID"}</span>
            <input
              autoCapitalize="off"
              autoComplete="off"
              className="key-input"
              disabled={busy === provider.id}
              onChange={(event) => setCfAccountId(event.target.value)}
              placeholder={
                lang === "zh" ? "32 位字母和数字" : "32 letters and digits"
              }
              spellCheck={false}
              type="text"
              value={cfAccountId}
            />
          </div>
          <p className="settings-card-copy text-faint">
            {lang === "zh"
              ? "Cloudflare 控制台 → My Profile → API Tokens → Create Token → Workers AI 模板。登录后地址栏里就有账户 ID —— dash.cloudflare.com/<那串长码>。用模板做出来的令牌说不出自己属于哪个账户,所以两个都要粘。"
              : "Cloudflare dashboard → My Profile → API Tokens → Create Token → Workers AI template. The Account ID is in the address bar once you are signed in — dash.cloudflare.com/<that long code>. A token made from the template cannot tell us its account, so paste both."}
          </p>
          {/* F5, not F1: the generic cloud notice claims memories, profile and
              attachments go to the provider, which is NOT true of the picture
              path — one English prompt goes. This is the notice this connection
              shipped with and it stays with the fields it belongs to; chat use
              carries its own notice at the point of use. The real disclosure is
              the other way round: the main model WRITES that prompt and can see
              context, so it can word things the Owner never typed — which is
              why the sent prompt is shown beside every generated picture. */}
          <p className="context-disclaimer">
            {t("legal.notice.modelConnect.pictures")}
          </p>
          {cfError ? <p className="form-error">{cfError}</p> : null}
          <div className="model-card-actions">
            {/* Either field is enough once this card is connected: the stored
                value stands in for whichever is blank, so a wrong Account ID
                can be fixed without going back to Cloudflare for the token
                again. Nothing at all typed, and there is nothing to save. */}
            <button
              className="primary-button"
              disabled={
                busy === provider.id ||
                (cloudflareToken.trim().length === 0 &&
                  (!provider.connected || cfAccountId.trim().length === 0))
              }
              onClick={() => void saveWorkersAiToken()}
              type="button"
            >
              {busy === provider.id
                ? lang === "zh"
                  ? "保存中…"
                  : "Saving…"
                : lang === "zh"
                  ? "保存令牌"
                  : "Save Token"}
            </button>
            <button
              className="secondary-button"
              onClick={() => {
                setAddTargetId("");
                setEditingId(null);
                setCfError(null);
              }}
              type="button"
            >
              {lang === "zh" ? "取消" : "Cancel"}
            </button>
          </div>
        </div>
      );
    }
    const keyUrl = CONNECTABLE_MODELS.find(
      (model) => model.id === provider.id,
    )?.keyUrl;
    const freeNote = MODEL_FREE_TIER_NOTES[provider.id];
    return (
      <div className="model-connect-form">
        {freeNote ? <p className="library-note">{freeNote}</p> : null}
        {keyUrl ? (
          <a
            className="model-key-link"
            href={keyUrl}
            rel="noreferrer"
            target="_blank"
          >
            Get an API key ↗
          </a>
        ) : null}
        {provider.needsKey ? (
          <input
            autoCapitalize="off"
            autoComplete="off"
            className="method-rename-input key-input"
            spellCheck={false}
            type="text"
            placeholder={
              provider.id === "claude-sub"
                ? "Setup token (from: claude setup-token)"
                : "API key"
            }
            value={draftFor(provider.id).apiKey}
            onChange={(event) =>
              patchDraft(provider.id, { apiKey: event.target.value })
            }
          />
        ) : null}
        {provider.needsBaseUrl ? (
          <input
            className="method-rename-input"
            placeholder={
              provider.id === "workersai"
                ? "https://api.cloudflare.com/client/v4/accounts/<account-id>/ai/v1"
                : "Base URL (e.g. http://127.0.0.1:11434/v1)"
            }
            value={draftFor(provider.id).baseUrl}
            onChange={(event) =>
              patchDraft(provider.id, { baseUrl: event.target.value })
            }
          />
        ) : null}
        <input
          className="method-rename-input"
          placeholder={
            provider.model
              ? `Model (optional, current: ${provider.model})`
              : "Model (optional)"
          }
          value={draftFor(provider.id).model}
          onChange={(event) =>
            patchDraft(provider.id, { model: event.target.value })
          }
        />
        <p className="context-disclaimer">
          {provider.kind === "openai-compatible"
            ? t(localBackendNoticeKey(draftFor(provider.id).baseUrl))
            : t("legal.notice.modelConnect.cloud")}
        </p>
        <div className="model-card-actions">
          <button
            className="primary-button"
            disabled={busy === provider.id}
            onClick={() => void connect(provider)}
            type="button"
          >
            {provider.connected ? "Update" : "Connect"}
          </button>
          <button
            className="secondary-button"
            onClick={() => {
              setAddTargetId("");
              setEditingId(null);
            }}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const connectedProviders = providers.filter((provider) => provider.connected);
  const availableProviders = providers.filter(
    (provider) => !provider.connected,
  );
  const addTarget =
    availableProviders.find((provider) => provider.id === addTargetId) ?? null;

  return (
    <section className="settings-card">
      <p className="eyebrow">Models</p>
      <p className="settings-card-copy">
        Connect one or more model backends. Keys stay on this machine and are
        never uploaded. Codex uses its own ChatGPT login (see the Connection
        tab).
      </p>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="model-cards">
        {connectedProviders.map((provider) => (
          <div
            className={
              connectTarget === provider.id
                ? "model-card connect-target"
                : "model-card"
            }
            id={`model-card-${provider.id}`}
            key={provider.id}
          >
            <div className="model-card-head">
              <strong>{provider.name}</strong>
              <span
                className={
                  provider.healthy
                    ? "library-chip chip-published"
                    : "library-chip"
                }
              >
                {provider.healthy ? "Connected" : "Needs Attention"}
              </span>
              {provider.isDefault ? (
                <span className="library-chip chip-installed">Default</span>
              ) : null}
            </div>
            {provider.model ? (
              <small className="model-card-model">{provider.model}</small>
            ) : null}
            {!provider.healthy ? (
              <small className="model-card-model">{provider.detail}</small>
            ) : null}
            {provider.kind === "cli-login" ? (
              <>
                {!provider.healthy ? (
                  <div className="model-card-actions">
                    <button
                      className="primary-button"
                      disabled={codexWaiting}
                      onClick={() => void signInCodex()}
                      type="button"
                    >
                      {codexWaiting
                        ? "Waiting For Sign-In..."
                        : "Sign In With ChatGPT"}
                    </button>
                  </div>
                ) : null}
                {codexWaiting && codexLoginUrl ? (
                  <a
                    className="model-key-link"
                    href={codexLoginUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    No window? Open the sign-in page ↗
                  </a>
                ) : null}
                {codexWaiting ? (
                  <p className="library-note">
                    Finish the ChatGPT login in the browser window that just
                    opened — this card updates by itself.
                  </p>
                ) : null}
              </>
            ) : null}
            <div className="model-card-actions">
              {!provider.isDefault ? (
                <button
                  className="secondary-button"
                  disabled={busy === provider.id}
                  onClick={() => void makeDefault(provider)}
                  type="button"
                >
                  Set As Default
                </button>
              ) : null}
              {provider.kind !== "cli-login" ? (
                <>
                  <button
                    className="secondary-button"
                    onClick={() =>
                      setEditingId((current) =>
                        current === provider.id ? null : provider.id,
                      )
                    }
                    type="button"
                  >
                    {editingId === provider.id ? "Close" : "Edit"}
                  </button>
                  {confirmDisconnect === provider.id ? (
                    <>
                      <button
                        className="text-button danger"
                        disabled={busy === provider.id}
                        onClick={() => {
                          setConfirmDisconnect(null);
                          void disconnect(provider);
                        }}
                        type="button"
                      >
                        Really Disconnect
                      </button>
                      <button
                        className="text-button"
                        onClick={() => setConfirmDisconnect(null)}
                        type="button"
                      >
                        Keep
                      </button>
                    </>
                  ) : (
                    <button
                      className="text-button"
                      disabled={busy === provider.id}
                      onClick={() => setConfirmDisconnect(provider.id)}
                      type="button"
                    >
                      Disconnect
                    </button>
                  )}
                </>
              ) : null}
            </div>
            {editingId === provider.id ? renderConnectForm(provider) : null}
          </div>
        ))}
      </div>
      {availableProviders.length > 0 ? (
        <>
          <div className="settings-card-divider" />
          <h3 className="settings-subhead">
            {lang === "zh" ? "添加模型" : "Add a Model"}
          </h3>
          {/* Our own drop-down, not the browser's. This is now the ONLY way to
              connect a model — the Cloudflare token moved here off the Drawing
              row — so the one control every household has to get through was
              also the one still painting a white popup on a dark page
              (picker.tsx). */}
          <Picker
            ariaLabel={lang === "zh" ? "添加模型" : "Add a model"}
            onChange={setAddTargetId}
            options={[
              {
                label: lang === "zh" ? "选一个提供方…" : "Choose a provider…",
                value: "",
              },
              ...availableProviders.map((provider) => ({
                // claude-sub has a connect note but is NOT a free tier — its
                // usage comes out of the Owner's own Claude plan.
                label:
                  MODEL_FREE_TIER_NOTES[provider.id] &&
                  provider.id !== "claude-sub"
                    ? `${provider.name}${lang === "zh" ? " —— 免费额度" : " — Free Tier"}`
                    : provider.name,
                value: provider.id,
              })),
            ]}
            value={addTargetId}
          />
          {addTarget ? (
            <div
              className={
                connectTarget === addTarget.id
                  ? "model-card connect-target"
                  : "model-card"
              }
              id={`model-card-${addTarget.id}`}
            >
              <div className="model-card-head">
                <strong>{addTarget.name}</strong>
                <span className="library-chip">Not Connected</span>
              </div>
              {renderConnectForm(addTarget)}
            </div>
          ) : null}
        </>
      ) : null}
      {/* The one model you do not sign in to — you download it. It moved off
          the Speaking row (Oskar, 2026-08-01: 所有添加模型都應該在模型那邊添加,
          然後 capability 這邊只是選擇模型), and it sits outside the "Add a Model"
          block on purpose: that block disappears once every provider is
          connected, and a 150 MB download in progress must never disappear
          with it. WHICH of its voices reads a reply stays on the Speaking row,
          because that is how the job behaves rather than what is installed.

          Nothing shows until the status has been read: offering a 150 MB
          download to someone who already has it, for the half-second before
          the answer lands, is worse than showing nothing for that half-second. */}
      {localTts ? (
        <>
          <div className="settings-card-divider" />
          <h3 className="settings-subhead">
            {lang === "zh" ? "本机语音" : "A Voice On This Machine"}
          </h3>
          {localTts.installed ? (
            <div className="model-card">
              <div className="model-card-head">
                <strong>{lang === "zh" ? "本机语音" : "Local Voice"}</strong>
                <span className="library-chip chip-published">
                  {lang === "zh" ? "已安装" : "Installed"}
                </span>
              </div>
              <p className="settings-card-copy">
                {lang === "zh"
                  ? "语音在这台电脑上生成 —— 什么都不出去,也没有每次的费用。中文和英文音色都在里面;念哪个音色,在上面 Capabilities 的「念」那一行选。"
                  : "Speech is generated on this computer — nothing leaves it and there is no per-use cost. Chinese and English voices are both included; which one reads a reply is chosen on the Speaking row above."}
              </p>
              {/* Installed and still downloading can only mean an EXTRA voice,
                  and that one was started on the Speaking row. A second bar for
                  one download is a look-alike control; a sentence saying what is
                  happening and where to watch it is not — and it is why Remove
                  is greyed out while it runs. */}
              {localTts.status === "downloading" ? (
                <p className="settings-card-copy">
                  {lang === "zh"
                    ? "正在下载另一个音色 —— 进度在上面 Capabilities 的「念」那一行。"
                    : "Another voice is downloading — the progress is on the Speaking row above."}
                </p>
              ) : null}
              <div className="model-card-actions">
                {confirmRemoveLocal ? (
                  <>
                    <button
                      className="text-button danger"
                      disabled={voiceBusy}
                      onClick={() => {
                        setConfirmRemoveLocal(false);
                        void removeLocalVoice();
                      }}
                      type="button"
                    >
                      {lang === "zh"
                        ? "确认删除(150 MB)"
                        : "Really Remove (150 MB)"}
                    </button>
                    <button
                      className="text-button"
                      onClick={() => setConfirmRemoveLocal(false)}
                      type="button"
                    >
                      {lang === "zh" ? "留着" : "Keep"}
                    </button>
                  </>
                ) : (
                  <button
                    className="text-button"
                    disabled={voiceBusy}
                    onClick={() => setConfirmRemoveLocal(true)}
                    type="button"
                  >
                    {lang === "zh" ? "删除下载" : "Remove Download"}
                  </button>
                )}
              </div>
            </div>
          ) : localTts.status === "downloading" ? (
            <div className="model-card">
              <p className="settings-card-copy">
                {lang === "zh"
                  ? "正在下载语音引擎和两个音色(约 150 MB)—— 只下载这一次。 "
                  : "Downloading the speech engine and two voices (about 150 MB) — this happens once. "}
                {localTts.progress}%
                {localTts.detail ? ` · ${localTts.detail}` : ""}
              </p>
              <progress
                className="local-tts-progress"
                max={100}
                value={localTts.progress}
              />
            </div>
          ) : (
            <div className="model-card">
              <p className="settings-card-copy">
                {lang === "zh"
                  ? "下载一次(约 150 MB),这台电脑上就有了一个神经网络语音:完全离线,永久免费,不用 key。中文和英文音色都在里面,按回复的语言自动选。下好了,「念」那一行会自己用上它。"
                  : "A one-time download (about 150 MB) puts a neural voice on this computer: fully offline, free forever, no key. Chinese and English voices are included, picked per reply by its language. When it lands, the Speaking row switches over by itself."}
              </p>
              {localTts.status === "error" && localTts.detail ? (
                <p className="form-error">{localTts.detail}</p>
              ) : null}
              <div className="model-card-actions">
                <button
                  className="primary-button"
                  disabled={voiceBusy}
                  onClick={() => void startLocalDownload()}
                  type="button"
                >
                  {lang === "zh"
                    ? "下载本机语音(150 MB)"
                    : "Download Local Voice (150 MB)"}
                </button>
              </div>
            </div>
          )}
          {voiceError ? <p className="form-error">{voiceError}</p> : null}
        </>
      ) : null}
    </section>
  );
}

function BackupPanel() {
  const { t } = useI18n();
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"create" | "restore" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [restarting, setRestarting] = useState(false);
  // Owner backup preferences: destination folder + keep-most-recent-N +
  // optional encryption (password is write-only; we only know on/off).
  const [destination, setDestination] = useState("");
  const [keep, setKeep] = useState("");
  const [encrypted, setEncrypted] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [scheduleCadence, setScheduleCadence] = useState<
    "off" | "daily" | "weekly"
  >("off");
  const [scheduleHour, setScheduleHour] = useState("3");
  const [lastAuto, setLastAuto] = useState<{
    at: string | null;
    ok: boolean | null;
  }>({ at: null, ok: null });
  const [savingConfig, setSavingConfig] = useState(false);
  const [configNotice, setConfigNotice] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchBackups();
      setBackups(result.backups);
    } catch {
      setError(t("settings.backup.error"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    fetchBackupConfig()
      .then((config) => {
        setDestination(config.destination ?? "");
        setKeep(config.keep === null ? "" : String(config.keep));
        setEncrypted(config.encrypted);
        setScheduleCadence(config.schedule?.cadence ?? "off");
        setScheduleHour(String(config.schedule?.hour ?? 3));
        setLastAuto({ at: config.lastAutoAt, ok: config.lastAutoOk });
      })
      .catch(() => {});
  }, []);

  // passphrase: undefined = keep current, null = turn encryption off, string =
  // set/replace (matches the PUT contract).
  async function handleSaveConfig(passphraseAction?: string | null) {
    setSavingConfig(true);
    setConfigError(null);
    setConfigNotice(null);
    const keepNumber = Number.parseInt(keep, 10);
    try {
      const hourNumber = Number.parseInt(scheduleHour, 10);
      const saved = await saveBackupConfig({
        destination: destination.trim() === "" ? null : destination.trim(),
        keep:
          Number.isInteger(keepNumber) && keepNumber >= 1 ? keepNumber : null,
        schedule:
          scheduleCadence === "off"
            ? null
            : {
                cadence: scheduleCadence,
                hour:
                  Number.isInteger(hourNumber) &&
                  hourNumber >= 0 &&
                  hourNumber <= 23
                    ? hourNumber
                    : 3,
              },
        ...(passphraseAction !== undefined
          ? { passphrase: passphraseAction }
          : passphrase.trim() !== ""
            ? { passphrase: passphrase.trim() }
            : {}),
      });
      setEncrypted(saved.encrypted);
      setPassphrase("");
      setConfigNotice(t("settings.backup.configSaved"));
      void load();
    } catch (nextError) {
      setConfigError(
        nextError instanceof Error
          ? nextError.message
          : t("settings.backup.error"),
      );
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleCreate() {
    setBusy("create");
    setError(null);
    setNotice(null);
    try {
      await createBackup();
      setNotice(t("settings.backup.created"));
      await load();
    } catch {
      setError(t("settings.backup.error"));
    } finally {
      setBusy(null);
    }
  }

  async function handleRestore(id: string) {
    setBusy("restore");
    setError(null);
    try {
      await restoreBackup(id);
      setConfirmId(null);
      setRestarting(true);
    } catch {
      setConfirmId(null);
      setError(t("settings.backup.error"));
    } finally {
      setBusy(null);
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${bytes} B`;
  }

  function formatDate(iso: string): string {
    if (!iso) return "—";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString(uiLocale());
  }

  return (
    <section className="settings-card">
      <p className="eyebrow">{t("settings.backup.eyebrow")}</p>
      <h2>{t("settings.backup.title")}</h2>
      <p className="settings-card-copy">{t("settings.backup.copy")}</p>
      <p className="context-disclaimer">{t("legal.notice.backup")}</p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem",
          margin: "0.75rem 0",
        }}
      >
        <label className="method-picker-label">
          {t("settings.backup.destination")}
        </label>
        <input
          className="method-rename-input"
          onChange={(event) => setDestination(event.target.value)}
          placeholder="D:\VaenyxBackups"
          value={destination}
        />
        <p className="library-note">{t("settings.backup.destinationHint")}</p>
        <p className="context-disclaimer">
          {t("legal.notice.backup.cloudSync")}
        </p>
        <label className="method-picker-label">
          {t("settings.backup.keep")}
        </label>
        <input
          className="method-rename-input"
          inputMode="numeric"
          onChange={(event) => setKeep(event.target.value)}
          placeholder="10"
          style={{ maxWidth: "8rem" }}
          value={keep}
        />
        <p className="library-note">{t("settings.backup.keepHint")}</p>
        <label className="method-picker-label">
          {t("settings.backup.schedule")}
        </label>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <select
            className="composer-level-select"
            onChange={(event) =>
              setScheduleCadence(
                event.target.value as "off" | "daily" | "weekly",
              )
            }
            value={scheduleCadence}
          >
            <option value="off">{t("settings.backup.scheduleOff")}</option>
            <option value="daily">{t("settings.backup.scheduleDaily")}</option>
            <option value="weekly">
              {t("settings.backup.scheduleWeekly")}
            </option>
          </select>
          {scheduleCadence !== "off" ? (
            <select
              aria-label={t("settings.backup.scheduleHour")}
              className="composer-level-select"
              onChange={(event) => setScheduleHour(event.target.value)}
              value={scheduleHour}
            >
              {Array.from({ length: 24 }, (_, hour) => (
                <option key={hour} value={String(hour)}>
                  {String(hour).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          ) : null}
        </div>
        {scheduleCadence !== "off" ? (
          <p className="library-note">
            {t("settings.backup.lastAuto")}:{" "}
            {lastAuto.at
              ? `${new Date(lastAuto.at).toLocaleString()} — ${
                  lastAuto.ok
                    ? t("settings.backup.lastAutoOk")
                    : t("settings.backup.lastAutoFail")
                }`
              : t("settings.backup.lastAutoNever")}
          </p>
        ) : null}
        <label className="method-picker-label">
          {t("settings.backup.password")}
        </label>
        <input
          autoComplete="new-password"
          className="method-rename-input"
          onChange={(event) => setPassphrase(event.target.value)}
          type="password"
          value={passphrase}
        />
        <p className="library-note">
          {encrypted
            ? t("settings.backup.passwordHintOn")
            : t("settings.backup.passwordHintOff")}
        </p>
        <p className="context-disclaimer">
          {t("settings.backup.passwordWarn")}
        </p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            className="secondary-button"
            disabled={savingConfig}
            onClick={() => void handleSaveConfig()}
            type="button"
          >
            {t("settings.backup.saveConfig")}
          </button>
          {encrypted ? (
            <button
              className="text-button"
              disabled={savingConfig}
              onClick={() => void handleSaveConfig(null)}
              type="button"
            >
              {t("settings.backup.passwordClear")}
            </button>
          ) : null}
        </div>
        {configNotice ? (
          <p className="settings-card-copy">{configNotice}</p>
        ) : null}
        {configError ? <p className="form-error">{configError}</p> : null}
      </div>

      <button
        className="secondary-button"
        disabled={busy === "create" || restarting}
        onClick={() => void handleCreate()}
        type="button"
      >
        {busy === "create"
          ? t("settings.backup.creating")
          : t("settings.backup.create")}
      </button>

      {notice ? <p className="settings-card-copy">{notice}</p> : null}
      {error ? <p className="settings-card-copy">{error}</p> : null}
      {restarting ? (
        <p className="settings-card-copy">{t("settings.backup.restoring")}</p>
      ) : null}

      <div className="settings-card-divider" />

      {loading ? (
        <p className="settings-card-copy">{t("settings.backup.loading")}</p>
      ) : backups.length === 0 ? (
        <p className="settings-card-copy">{t("settings.backup.empty")}</p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {backups.map((entry) => (
            <li
              key={entry.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span className="settings-card-copy" style={{ margin: 0 }}>
                  {formatDate(entry.createdAt)}
                </span>
                <span className="eyebrow" style={{ margin: 0 }}>
                  {entry.kind === "safety"
                    ? `${t("settings.backup.safety")} · `
                    : ""}
                  {entry.library.included
                    ? `${entry.library.methods} ${t("settings.backup.methodsLabel")} · ${entry.library.routines} ${t("settings.backup.routinesLabel")} · `
                    : `${t("settings.backup.dbOnly")} · `}
                  {formatBytes(entry.sizeBytes)}
                </span>
              </div>
              <button
                className="text-button"
                disabled={restarting}
                onClick={() => setConfirmId(entry.id)}
                type="button"
              >
                {t("settings.backup.restore")}
              </button>
            </li>
          ))}
        </ul>
      )}

      {confirmId ? (
        <Modal
          onClose={() => setConfirmId(null)}
          title={t("settings.backup.restoreTitle")}
        >
          {/* H3 (copy pack): point-of-action restore notice + confirm label. */}
          <p className="settings-card-copy">{t("legal.notice.restore")}</p>
          <div className="modal-actions">
            <button
              className="text-button"
              onClick={() => setConfirmId(null)}
              type="button"
            >
              {t("settings.backup.cancel")}
            </button>
            <button
              className="danger-button"
              disabled={busy === "restore"}
              onClick={() => void handleRestore(confirmId)}
              type="button"
            >
              {t("legal.notice.restore.confirm")}
            </button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}

// Settings -> User Settings -> Updates. An instance installed from the zip
// has no git remote, so this is the only way it can move forward: check,
// download + verify, then restart to let the watchdog swap it in.
function UpdatePanel() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  // One button, one press (Oskar, dev.178): check, download, verify, install,
  // restart, come back. The Owner should never have to know there were five
  // steps, or be left holding a "now press Restart" instruction.
  const [step, setStep] = useState<
    "idle" | "checking" | "downloading" | "restarting"
  >("idle");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    void fetchUpdateStatus()
      .then(setStatus)
      .catch(() => undefined);
  }, []);

  async function updateNow() {
    setNote(null);
    setStep("checking");
    try {
      const checked = await checkForUpdate();
      setStatus(checked);
      if (checked.phase === "error") {
        setStep("idle");
        return;
      }
      if (!checked.updateAvailable) {
        setNote("You are on the latest version.");
        setStep("idle");
        return;
      }

      setStep("downloading");
      const staged = await downloadUpdate();
      setStatus(staged);
      if (staged.phase !== "staged") {
        setStep("idle");
        return;
      }

      // Restart is part of the same press: the watchdog swaps the new version
      // in while the server is down, then this page reloads onto it.
      setStep("restarting");
      await restartVaenyx();
      for (let attempt = 0; attempt < 60; attempt += 1) {
        await new Promise((wait) => setTimeout(wait, 3000));
        try {
          const response = await fetch("/health");
          if (response.ok) {
            window.location.reload();
            return;
          }
        } catch {
          // Still installing and restarting.
        }
      }
      setNote(
        "Vaenyx is taking longer than usual to come back. It is finishing the update — refresh this page in a minute.",
      );
      setStep("idle");
    } catch {
      // api.ts already raised a toast with the reason.
      setStep("idle");
    }
  }

  // A git checkout can never take a release package, so say that up front
  // instead of offering a button that will refuse (Oskar, dev.180).
  if (status?.developerInstall) {
    return (
      <p className="settings-card-copy">
        This Vaenyx is version <strong>{status.currentVersion}</strong>, and
        this copy is managed with git — it updates with <strong>git pull</strong>,
        not by unpacking a release over itself. The one-press updater is for
        installs made with Vaenyx-Setup.cmd.
      </p>
    );
  }

  const label =
    step === "checking"
      ? "Checking…"
      : step === "downloading"
        ? "Downloading…"
        : step === "restarting"
          ? "Installing and restarting…"
          : status?.updateAvailable && status.availableVersion
            ? `Update To ${status.availableVersion}`
            : "Check For Updates";

  return (
    <>
      <p className="settings-card-copy">
        This Vaenyx is version <strong>{status?.currentVersion ?? "…"}</strong>.
        {status?.updateAvailable && status.availableVersion
          ? ` Version ${status.availableVersion} is available.`
          : " One press checks for a new version, downloads it, verifies it against its published checksum, installs it and restarts — your data, settings and connected models are untouched, and the previous version comes back automatically if anything goes wrong."}
      </p>
      {step === "restarting" ? (
        <p className="settings-card-copy">
          Installing. Vaenyx will restart and this page will reload on its own
          — leave it open.
        </p>
      ) : null}
      {note ? <p className="saved-note">{note}</p> : null}
      {/* "Nothing published yet" is information, not a failure - only real
          errors get the red treatment. */}
      {status?.detail ? (
        <p
          className={
            status.phase === "error" ? "form-error" : "settings-card-copy"
          }
        >
          {status.detail}
        </p>
      ) : null}
      <div className="model-card-actions">
        <button
          className="primary-button"
          disabled={step !== "idle"}
          onClick={() => void updateNow()}
          type="button"
        >
          {label}
        </button>
      </div>
    </>
  );
}

// ── Phone access (onboarding Part 2 section 5) ───────────────────────────
// One flow, two homes: the last first-run step and the permanent Settings →
// Phone Access card both render this panel. Vaenyx binds to 127.0.0.1 only,
// so a phone reaches it through the owner's own Tailscale account; the three
// rows mirror the three server-checked facts (installed / signed in / tunnel
// up) and each red row carries its one-tap fix. The QR is generated by our
// own encoder in qr.ts — the instance URL never touches an external QR or
// short-link service.

function PhoneQrCode({ url }: { url: string }) {
  const qr = useMemo(() => {
    try {
      return encodeQr(url);
    } catch {
      return null;
    }
  }, [url]);
  if (!qr) return null;
  // The four-module quiet zone the spec requires is part of the drawing, and
  // the symbol stays dark-on-white in every theme — a scanner needs contrast.
  return (
    <svg
      aria-label={url}
      className="phone-qr"
      role="img"
      shapeRendering="crispEdges"
      viewBox={`-4 -4 ${qr.size + 8} ${qr.size + 8}`}
    >
      <rect
        fill="#ffffff"
        height={qr.size + 8}
        width={qr.size + 8}
        x={-4}
        y={-4}
      />
      <path d={qrSvgPath(qr)} fill="#000000" />
    </svg>
  );
}

// Drawn hints for the two add-to-home-screen menus (never screenshots, never
// emoji): the iOS share square with its up arrow, and Chrome's three dots.
function PhoneHintIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className="line-icon"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

const IconIosShare = (
  <PhoneHintIcon>
    <path d="M8 9.5H6.5A1.5 1.5 0 0 0 5 11v8a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-8a1.5 1.5 0 0 0-1.5-1.5H16" />
    <path d="M12 14V3.5" />
    <path d="m8.5 7 3.5-3.5L15.5 7" />
  </PhoneHintIcon>
);

const IconAndroidMenu = (
  <PhoneHintIcon>
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="19" r="1" />
  </PhoneHintIcon>
);

// The phone-side steps, shown beside the QR wherever it appears.
function PhoneInstructions({ url }: { url: string }) {
  const { lang } = useI18n();
  const zh = lang === "zh";
  return (
    <ol className="phone-steps">
      <li>
        {zh
          ? "用手机相机扫上面的二维码,打开出现的链接。"
          : "Scan the code above with the phone's camera and open the link it shows."}
        <span className="phone-step-fine">
          {zh
            ? "这个地址是公开网址,但后面的一切都需要你的 Vaenyx 密码。"
            : "The address is public, but everything behind it needs your Vaenyx password."}
        </span>
      </li>
      <li>
        {zh
          ? "在手机上用你自己的 Vaenyx 账号登录 —— 和在这台电脑上一样。"
          : "Log in with your own Vaenyx account — the same login as on this computer."}
      </li>
      <li>
        {zh ? "加到主屏幕:" : "Add it to the Home Screen:"}
        <span className="phone-step-detail">
          {IconIosShare}
          {zh
            ? "iPhone:在 Safari 里点分享按钮,选「添加到主屏幕」。"
            : "iPhone: in Safari, tap the Share button, then “Add to Home Screen”."}
        </span>
        <span className="phone-step-detail">
          {IconAndroidMenu}
          {zh
            ? "Android:在 Chrome 里点右上角菜单,选「安装应用」或「添加到主屏幕」。"
            : "Android: in Chrome, tap the top-right menu, then “Install app” or “Add to Home screen”."}
        </span>
      </li>
      <li>
        <a href={url} rel="noreferrer" target="_blank">
          {url}
        </a>
        <span className="phone-step-fine">
          {zh
            ? "扫不了码的话,直接在手机浏览器里输入这个地址也一样。"
            : "No camera handy? Typing this address into the phone's browser works the same."}
        </span>
      </li>
    </ol>
  );
}

function PhoneAccessPanel() {
  const { lang } = useI18n();
  const zh = lang === "zh";
  const [status, setStatus] = useState<PhoneAccessStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"install" | "login" | "tunnel" | null>(
    null,
  );
  const [loginUrl, setLoginUrl] = useState<string | null>(null);
  // Poll while something settles OUTSIDE this page — the winget download or
  // the browser sign-in. Stops by itself once every light is green (or the
  // install fails), and always stops when the panel unmounts.
  const [watching, setWatching] = useState(false);

  const refresh = useCallback(async (): Promise<PhoneAccessStatus | null> => {
    try {
      const next = await fetchPhoneAccessStatus();
      setStatus(next);
      return next;
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : zh
            ? "读不到手机访问的状态。"
            : "Could not read the phone-access status.",
      );
      return null;
    }
  }, [zh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!watching) return undefined;
    const timer = window.setInterval(() => {
      void refresh().then((next) => {
        if (!next) return;
        const settled =
          next.installPhase === "failed" ||
          (next.installPhase !== "installing" &&
            next.installed &&
            next.signedIn);
        if (settled) setWatching(false);
      });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [watching, refresh]);

  async function doInstall() {
    setBusy("install");
    setError(null);
    try {
      setStatus(await installPhoneTailscale(lang));
      setWatching(true);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : zh
            ? "安装没能开始。"
            : "The install could not start.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function doLogin() {
    setBusy("login");
    setError(null);
    try {
      const result = await startPhoneLogin(lang);
      if (result.alreadySignedIn) {
        await refresh();
        return;
      }
      if (result.url) {
        setLoginUrl(result.url);
        window.open(result.url, "_blank", "noopener");
        setWatching(true);
        return;
      }
      if (result.detail) setError(result.detail);
      await refresh();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : zh
            ? "登录没能开始。"
            : "The sign-in could not start.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function doTunnel() {
    setBusy("tunnel");
    setError(null);
    try {
      const result = await enablePhoneTunnel(lang);
      if (!result.tunnelUp && result.detail) setError(result.detail);
      await refresh();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : zh
            ? "通道没能打开。"
            : "The channel could not be turned on.",
      );
    } finally {
      setBusy(null);
    }
  }

  if (!status) {
    return <p className="settings-card-copy">{zh ? "正在检查…" : "Checking..."}</p>;
  }

  const installing = status.installPhase === "installing";
  const notYet = (
    <span className="library-chip">{zh ? "未完成" : "Not Yet"}</span>
  );
  const done = (label: string) => (
    <span className="library-chip chip-published">{label}</span>
  );
  // An admin-console link inside a Tailscale error (Funnel not enabled on the
  // tailnet yet) is the fix itself, so surface it as a link, not just prose.
  const errorLink = error?.match(/https:\/\/[^\s"']+/)?.[0] ?? null;

  return (
    <>
      <p className="settings-card-copy">
        {zh
          ? "Vaenyx 只监听这台电脑的 127.0.0.1,从不向网络开放端口 —— 手机(哪怕同一个 WiFi)要走你自己的 Tailscale 账号建立的加密通道。Tailscale 是免费服务,下面三步都在这里完成。"
          : "Vaenyx listens only on this computer's 127.0.0.1 and never opens a port to the network — so a phone (even on the same WiFi) connects through an encrypted channel run by your own Tailscale account. Tailscale is a free service, and all three steps happen right here."}
      </p>

      <div className="engine-row">
        <p className="settings-card-copy phone-row-label">
          {zh ? "1. 安装 Tailscale" : "1. Tailscale installed"}
          <span className="phone-step-fine">
            {status.version ??
              (zh
                ? "这台电脑上还没有 Tailscale。"
                : "Tailscale is not on this computer yet.")}
          </span>
        </p>
        {status.installed ? (
          done(zh ? "已安装" : "Installed")
        ) : (
          <>
            {notYet}
            <button
              className="secondary-button"
              disabled={busy !== null || installing}
              onClick={() => void doInstall()}
              type="button"
            >
              {installing
                ? zh
                  ? "正在安装…"
                  : "Installing..."
                : zh
                  ? "自动安装"
                  : "Install It"}
            </button>
          </>
        )}
      </div>
      {installing ? (
        <p className="settings-card-copy phone-step-fine">
          {zh
            ? "下载和安装可能要几分钟,这个页面会自己更新。"
            : "The download can take a few minutes; this page updates by itself."}
        </p>
      ) : null}
      {status.installPhase === "failed" ? (
        <p className="form-error">
          {status.detail}{" "}
          {zh ? "也可以自己装:去 " : "You can also install it yourself from "}
          <a
            href="https://tailscale.com/download"
            rel="noreferrer"
            target="_blank"
          >
            tailscale.com/download
          </a>
          {zh ? " 下载安装,然后回到这里。" : " — then come back here."}
        </p>
      ) : null}

      <div className="engine-row">
        <p className="settings-card-copy phone-row-label">
          {zh ? "2. 登录 Tailscale" : "2. Signed in to Tailscale"}
          <span className="phone-step-fine">
            {zh
              ? "用你自己的免费 Tailscale 账号,在浏览器里登录一次。"
              : "One browser sign-in with your own free Tailscale account."}
          </span>
        </p>
        {status.signedIn ? (
          done(zh ? "已登录" : "Signed In")
        ) : (
          <>
            {notYet}
            <button
              className="secondary-button"
              disabled={busy !== null || !status.installed}
              onClick={() => void doLogin()}
              type="button"
            >
              {busy === "login"
                ? zh
                  ? "正在打开…"
                  : "Opening..."
                : zh
                  ? "去登录"
                  : "Sign In"}
            </button>
          </>
        )}
      </div>
      {!status.signedIn && (loginUrl ?? status.loginUrl) ? (
        <p className="settings-card-copy phone-step-fine">
          <a
            href={loginUrl ?? status.loginUrl ?? undefined}
            rel="noreferrer"
            target="_blank"
          >
            {zh
              ? "没弹出窗口?点这里打开登录页 ↗"
              : "No window? Open the sign-in page ↗"}
          </a>
        </p>
      ) : null}

      <div className="engine-row">
        <p className="settings-card-copy phone-row-label">
          {zh ? "3. 打开手机通道" : "3. Phone channel on"}
          <span className="phone-step-fine">
            {zh
              ? "把本机的 Vaenyx 通过加密通道发布成一个 https 地址。"
              : "Publishes this machine's Vaenyx as an https address over the encrypted channel."}
          </span>
        </p>
        {status.tunnelUp ? (
          done(zh ? "已开启" : "On")
        ) : (
          <>
            {notYet}
            <button
              className="secondary-button"
              disabled={busy !== null || !status.signedIn}
              onClick={() => void doTunnel()}
              type="button"
            >
              {busy === "tunnel"
                ? zh
                  ? "正在开启…"
                  : "Turning On..."
                : zh
                  ? "开启"
                  : "Turn On"}
            </button>
          </>
        )}
      </div>

      {error ? (
        <p className="form-error">
          {error}
          {errorLink ? (
            <>
              {" "}
              <a href={errorLink} rel="noreferrer" target="_blank">
                {zh ? "打开这个链接处理 ↗" : "Open this link to fix it ↗"}
              </a>
            </>
          ) : null}
        </p>
      ) : null}

      {status.tunnelUp && status.phoneUrl ? (
        <>
          <div className="settings-card-divider" />
          <h3 className="settings-subhead">
            {zh ? "用手机扫这个码" : "Scan This With The Phone"}
          </h3>
          <PhoneQrCode url={status.phoneUrl} />
          {/* Honest reachability (a real lesson): a fresh funnel takes a
              minute to reach the public internet, and THIS machine cannot
              verify the public side — its own lookup resolves through
              MagicDNS straight back into the tailnet. Only the phone can
              prove it, so the copy never claims this machine confirmed it. */}
          <p className="settings-card-copy phone-step-fine">
            {zh
              ? "刚开启的通道要过一两分钟才能从外网打开。手机打不开的话,等一分钟再扫一次 —— 这台电脑自己没法确认外网那一侧,能证明的只有手机。"
              : "A freshly opened channel can take a minute or two to work from the internet. If the phone cannot open it, wait a minute and scan again — this computer cannot confirm the public side itself; only the phone can."}
          </p>
          <PhoneInstructions url={status.phoneUrl} />
        </>
      ) : null}

      <button
        className="text-button"
        disabled={busy !== null}
        onClick={() => void refresh()}
        type="button"
      >
        {zh ? "重新检查" : "Check Again"}
      </button>
    </>
  );
}

function SettingsPanel({
  settings,
  onUpdate,
  sessionMode,
}: {
  settings: InstanceSettings;
  systemStatus: SystemStatus | null;
  onUpdate: (settings: InstanceSettings) => void;
  // Custom Mode M3: the mode this session is in (null = User Mode); with
  // lockSettings the whole page is replaced by a locked notice (the server
  // enforces the same rule — this is the honest UI on top of it).
  sessionMode: Mode | null;
}) {
  const { lang, setLang, t } = useI18n();
  const [instanceName, setInstanceName] = useState(settings.instanceName);
  const [agentName, setAgentName] = useState(settings.agentName || "Vaenyx");
  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState(readStoredTheme);
  const [chatFontSize, setChatFontSize] = useState(readStoredChatFontSize);
  const [chatFontFamily, setChatFontFamily] = useState(
    readStoredChatFontFamily,
  );
  // Counts connects, disconnects and main-model changes made on the Models
  // card. Capabilities is a sibling card that chooses among those backends and
  // has no other way to hear it — and since the Cloudflare token and the local
  // voice moved to Models, a change there is now what fills a row here.
  const [modelsChanged, setModelsChanged] = useState(0);
  // THE VOICE DOWNLOAD LIVES HERE, above both cards that touch it, because two
  // cards can start one. Models starts the 150 MB engine install; the Speaking
  // row starts a ~60 MB extra voice when the Owner picks one they do not have.
  // Owned by either card, the OTHER card's copy goes stale, and the card that
  // started the download can be the stale one — which is exactly what happened
  // when the poll moved to Models and the Speaking row froze at 0%.
  //
  // One state, one poll, both cards reading the same answer. It cannot freeze:
  // this component is the Settings page itself, so nothing inside a drawer, a
  // tab or an "Add a Model" dropdown can unmount the thing doing the watching —
  // switching to another Settings tab keeps it running. Leaving Settings stops
  // it, and the next visit re-reads the status and picks a download back up.
  const [localTts, setLocalTts] = useState<LocalTtsStatus | null>(null);
  const [testingForge, setTestingForge] = useState(false);
  const [forgeTestResult, setForgeTestResult] =
    useState<ForgeConnectionTestResult | null>(null);
  const [forgeTestError, setForgeTestError] = useState<string | null>(null);
  const [chatPrompt, setChatPrompt] = useState(
    "用一句中文回复：Vaenyx 已经可以通过我的 ChatGPT / Codex 账号对话。",
  );
  const [testingChat, setTestingChat] = useState(false);
  const [chatTestResult, setChatTestResult] =
    useState<ChatConnectionTestResult | null>(null);
  const [chatTestError, setChatTestError] = useState<string | null>(null);
  const [chatStartedAt, setChatStartedAt] = useState<number | null>(null);
  const [chatElapsedSeconds, setChatElapsedSeconds] = useState(0);
  // Regrouped 2026-07-22 (Oskar): User Settings = Appearance + Account;
  // AI Settings = Identity + Connection + Models; Notifications its own tab;
  // Manual second-to-last.
  const [settingsTab, setSettingsTab] = useState<
    | "user"
    | "ai"
    | "tools"
    | "notifications"
    | "backup"
    | "sharing"
    | "modes"
    | "manual"
    | "legal"
    // A sign-in-page model button parked a connect intent: open on AI Settings
    // so the chosen provider's card is front and centre.
  >(() =>
    localStorage.getItem(CONNECT_MODEL_INTENT) ||
    localStorage.getItem("vaenyx.toolsIntent")
      ? "ai"
      : "user",
  );
  const [stoppingVaenyx, setStoppingVaenyx] = useState(false);
  const [shutdownMessage, setShutdownMessage] = useState<string | null>(null);
  const [shutdownError, setShutdownError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  async function handleChangePassword() {
    setPasswordError(null);
    setPasswordSaved(false);

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setChangingPassword(true);
    try {
      await changeOwnerPassword({ currentPassword, newPassword });
      setPasswordSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordError(
        error instanceof Error ? error.message : "Could not change password.",
      );
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleLogoutAll() {
    setPasswordError(null);
    setLoggingOutAll(true);
    try {
      await logoutAllDevices();
      // This device is signed out too; reload back to the login screen.
      window.location.reload();
    } catch (error) {
      setPasswordError(
        error instanceof Error
          ? error.message
          : "Could not sign out all devices.",
      );
      setLoggingOutAll(false);
    }
  }

  const providerConnected = settings.providerConnection === "chatgpt-connected";

  // Read once when Settings opens, so a download already running elsewhere is
  // picked up rather than discovered by accident.
  useEffect(() => {
    void fetchLocalTts()
      .then(setLocalTts)
      .catch(() => undefined);
  }, []);

  // The only timer watching that download. It runs while the status says
  // "downloading" and stops the moment it does not, so an idle Settings page
  // polls nothing. When the engine install lands, Speaking is switched over —
  // that is what the 150 MB was for — and both cards are told to re-read.
  useEffect(() => {
    if (localTts?.status !== "downloading") return undefined;
    const timer = window.setInterval(() => {
      void fetchLocalTts()
        .then((next) => {
          setLocalTts(next);
          if (next.installed && next.status === "ready") {
            void connectVoiceOutput({ engine: "local" })
              .then(() => setModelsChanged((count) => count + 1))
              .catch(() => undefined);
          }
        })
        .catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [localTts?.status]);

  useEffect(() => {
    if (!testingChat || chatStartedAt === null) return undefined;

    setChatElapsedSeconds(0);
    const timer = window.setInterval(() => {
      setChatElapsedSeconds(
        Math.max(1, Math.floor((Date.now() - chatStartedAt) / 1000)),
      );
    }, 500);

    return () => window.clearInterval(timer);
  }, [chatStartedAt, testingChat]);

  async function runForgeTest() {
    setTestingForge(true);
    setForgeTestResult(null);
    setForgeTestError(null);

    try {
      setForgeTestResult(await testForgeConnection());
    } catch (nextError) {
      setForgeTestError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not run the Forge connection test.",
      );
    } finally {
      setTestingForge(false);
    }
  }

  async function runChatTest() {
    setTestingChat(true);
    setChatTestResult(null);
    setChatTestError(null);
    setChatStartedAt(Date.now());

    try {
      setChatTestResult(await testChatConnection({ prompt: chatPrompt }));
    } catch (nextError) {
      setChatTestError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not run the chat test.",
      );
    } finally {
      setTestingChat(false);
    }
  }

  async function stopVaenyx() {
    const confirmed = window.confirm(
      "Stop Vaenyx now? After it stops, close this browser tab. Start it again with Vaenyx-Start.cmd.",
    );

    if (!confirmed) return;

    setStoppingVaenyx(true);
    setShutdownMessage(null);
    setShutdownError(null);

    try {
      const response = await shutdownVaenyx();
      setShutdownMessage(response.message);
    } catch (nextError) {
      setShutdownError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not stop from the browser.",
      );
    } finally {
      setStoppingVaenyx(false);
    }
  }

  // Restart: the server exits, the watchdog relaunches whatever build is on
  // disk, and this page reloads itself once the instance answers again.
  const [restartingVaenyx, setRestartingVaenyx] = useState(false);
  async function restartVaenyxNow() {
    setRestartingVaenyx(true);
    setShutdownMessage(null);
    setShutdownError(null);
    try {
      const response = await restartVaenyx();
      setShutdownMessage(response.message);
      for (let attempt = 0; attempt < 40; attempt += 1) {
        await new Promise((resolveWait) => setTimeout(resolveWait, 3000));
        try {
          const status = await fetch("/health");
          if (status.ok) {
            window.location.reload();
            return;
          }
        } catch {
          // Still restarting.
        }
      }
      setShutdownError(
        "Vaenyx did not come back by itself — start it with Vaenyx-Start.cmd.",
      );
    } catch (nextError) {
      setShutdownError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not restart from the browser.",
      );
    } finally {
      setRestartingVaenyx(false);
    }
  }

  // A lockSettings mode keeps only the harmless personal preferences and the
  // read-only documents (Oskar, dev.171). Everything else disappears from the
  // UI; the server hook is still the floor underneath.
  const locked = sessionMode?.lockSettings ?? false;
  const activeTab =
    locked && !["user", "manual", "legal"].includes(settingsTab)
      ? "user"
      : settingsTab;

  return (
    <div className="settings-layout">
      <nav aria-label="Settings sections" className="library-subtabs">
        <button
          className={activeTab === "user" ? "active" : ""}
          onClick={() => setSettingsTab("user")}
          type="button"
        >
          User Settings
        </button>
        {locked ? null : (
          <>
            <button
              className={activeTab === "ai" ? "active" : ""}
              onClick={() => setSettingsTab("ai")}
              type="button"
            >
              AI Settings
            </button>
            <button
              className={activeTab === "tools" ? "active" : ""}
              onClick={() => setSettingsTab("tools")}
              type="button"
            >
              Tools
            </button>
            <button
              className={activeTab === "notifications" ? "active" : ""}
              onClick={() => setSettingsTab("notifications")}
              type="button"
            >
              Notifications
            </button>
            <button
              className={activeTab === "backup" ? "active" : ""}
              onClick={() => setSettingsTab("backup")}
              type="button"
            >
              {t("settings.backup.tab")}
            </button>
            <button
              className={activeTab === "sharing" ? "active" : ""}
              onClick={() => setSettingsTab("sharing")}
              type="button"
            >
              Sharing
            </button>
          </>
        )}
        {sessionMode ? null : (
          <button
            className={activeTab === "modes" ? "active" : ""}
            onClick={() => setSettingsTab("modes")}
            type="button"
          >
            Modes
          </button>
        )}
        <button
          className={activeTab === "manual" ? "active" : ""}
          onClick={() => setSettingsTab("manual")}
          type="button"
        >
          Manual
        </button>
        <button
          className={activeTab === "legal" ? "active" : ""}
          onClick={() => setSettingsTab("legal")}
          type="button"
        >
          {t("settings.legal.title")}
        </button>
      </nav>
      {locked ? (
        <p className="modes-preview-note">
          You are in the mode "{sessionMode?.name}" — it locks everything
          except these personal preferences. Exit to User Mode (the badge at
          the top) to change the rest.
        </p>
      ) : null}
      {activeTab === "manual" ? (
      <section className="settings-card">
        <p className="eyebrow">{t("settings.manual.eyebrow")}</p>
        <h2>{t("settings.manual.title")}</h2>
        <HelpContent document="manual" />
      </section>
      ) : null}
      {activeTab === "user" ? (
      <section className="settings-card">
        <p className="eyebrow">Personal</p>
        <h2>Appearance &amp; Name</h2>
        <h3 className="settings-subhead">Theme</h3>
        <p className="settings-card-copy">
          Pick a color theme for Vaenyx. Your choice is saved on this device.
        </p>
        <ThemeSelect
          onChange={(id) => {
            applyTheme(id);
            setTheme(id);
          }}
          value={theme}
        />
        <div className="settings-card-divider" />
        <h3 className="settings-subhead">Chat Text</h3>
        <p className="settings-card-copy">
          Font and size for the conversation area. Saved on this device.
        </p>
        <div className="chat-font-controls">
          <label className="chat-font-field">
            Size
            <select
              className="task-select"
              onChange={(event) => {
                setChatFontSize(event.target.value);
                applyChatFont(event.target.value, chatFontFamily);
              }}
              value={chatFontSize}
            >
              {CHAT_FONT_SIZES.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="chat-font-field">
            Font
            <select
              className="task-select"
              onChange={(event) => {
                setChatFontFamily(event.target.value);
                applyChatFont(chatFontSize, event.target.value);
              }}
              value={chatFontFamily}
            >
              {CHAT_FONT_FAMILIES.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="settings-card-divider" />
        <h3 className="settings-subhead">{t("settings.language.title")}</h3>
        <p className="settings-card-copy">{t("settings.language.copy")}</p>
        <div className="lang-toggle">
          <button
            className={`lang-toggle-option ${lang === "en" ? "active" : ""}`}
            onClick={() => setLang("en")}
            type="button"
          >
            {t("settings.language.english")}
          </button>
          <button
            className={`lang-toggle-option ${lang === "zh" ? "active" : ""}`}
            onClick={() => setLang("zh")}
            type="button"
          >
            {t("settings.language.chinese")}
          </button>
        </div>
        <div className="settings-card-divider" />
        <h3 className="settings-subhead">Agent Name</h3>
        <p className="settings-card-copy">
          What your assistant is called in conversations. A Custom Mode can
          carry its own name — set that on the mode itself.
        </p>
        <label className="chat-font-field">
          Agent Name
          <input
            maxLength={100}
            onChange={(event) => {
              setAgentName(event.target.value);
              setSaved(false);
            }}
            value={agentName}
          />
        </label>
        <div className="model-card-actions">
          <button
            className="secondary-button"
            onClick={() =>
              void updateSettings({
                instanceName: settings.instanceName,
                agentName,
              }).then((updated) => {
                onUpdate(updated);
                setSaved(true);
              })
            }
            type="button"
          >
            Save
          </button>
        </div>
        {saved ? <p className="saved-note">Saved.</p> : null}
      </section>
      ) : null}
      {activeTab === "user" && !locked ? (
      <section className="settings-card">
        <p className="eyebrow">Account</p>
        <h2>Account &amp; power</h2>
        <h3 className="settings-subhead">Owner password</h3>
        <p className="settings-card-copy">
          Change your password (signs out other devices) or sign out everywhere.
        </p>
        <button
          className="secondary-button"
          onClick={() => setShowPasswordModal(true)}
          type="button"
        >
          Change password
        </button>
        <div className="settings-card-divider" />
        <h3 className="settings-subhead">Sign out everywhere</h3>
        <p className="settings-card-copy">
          Sign out on all devices, including this one. Use this if a device was
          lost or you want to force every session to log in again.
        </p>
        <button
          className="text-button"
          disabled={loggingOutAll}
          onClick={() => void handleLogoutAll()}
          type="button"
        >
          {loggingOutAll ? "Signing out..." : "Sign out all devices"}
        </button>
        <div className="settings-card-divider" />
        <h3 className="settings-subhead">Updates</h3>
        <UpdatePanel />
        <div className="settings-card-divider" />
        <h3 className="settings-subhead">Restart Vaenyx</h3>
        <p className="settings-card-copy">
          Restarts the local server and reloads this page when it is back —
          also how an updated build goes live.
        </p>
        <button
          className="secondary-button"
          disabled={restartingVaenyx || stoppingVaenyx}
          onClick={() => void restartVaenyxNow()}
          type="button"
        >
          {restartingVaenyx ? "Restarting..." : "Restart Vaenyx"}
        </button>
        <div className="settings-card-divider" />
        <h3 className="settings-subhead">Stop Vaenyx</h3>
        <p className="settings-card-copy">
          Use this when you want Vaenyx fully off. Closing the browser alone does
          not safely stop the local server.
        </p>
        <button
          className="danger-button"
          disabled={stoppingVaenyx || restartingVaenyx}
          onClick={() => void stopVaenyx()}
          type="button"
        >
          {stoppingVaenyx ? "Stopping Vaenyx..." : "Stop Vaenyx"}
        </button>
        {shutdownMessage ? (
          <p className="connection-test-result passed">{shutdownMessage}</p>
        ) : null}
        {shutdownError ? <p className="form-error">{shutdownError}</p> : null}
        {showPasswordModal ? (
          <Modal
            onClose={() => setShowPasswordModal(false)}
            title="Change password"
          >
            <form
              className="memory-form"
              onSubmit={(event) => {
                event.preventDefault();
                void handleChangePassword();
              }}
            >
              <label>
                Current password
                <input
                  autoComplete="current-password"
                  onChange={(event) => {
                    setCurrentPassword(event.target.value);
                    setPasswordSaved(false);
                    setPasswordError(null);
                  }}
                  required
                  type="password"
                  value={currentPassword}
                />
              </label>
              <label>
                New password
                <input
                  autoComplete="new-password"
                  minLength={8}
                  onChange={(event) => {
                    setNewPassword(event.target.value);
                    setPasswordSaved(false);
                    setPasswordError(null);
                  }}
                  required
                  type="password"
                  value={newPassword}
                />
              </label>
              <label>
                Confirm new password
                <input
                  autoComplete="new-password"
                  minLength={8}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setPasswordSaved(false);
                    setPasswordError(null);
                  }}
                  required
                  type="password"
                  value={confirmPassword}
                />
              </label>
              <button
                className="primary-button"
                disabled={changingPassword}
                type="submit"
              >
                {changingPassword ? "Changing..." : "Change password"}
              </button>
              {passwordSaved ? (
                <p className="saved-note">
                  Password changed. Other devices are signed out.
                </p>
              ) : null}
              {passwordError ? (
                <p className="form-error">{passwordError}</p>
              ) : null}
            </form>
          </Modal>
        ) : null}
      </section>
      ) : null}
      {activeTab === "user" && !locked ? (
      <section className="settings-card" id="phone-access">
        <p className="eyebrow">{lang === "zh" ? "设备" : "Devices"}</p>
        <h2>{lang === "zh" ? "手机访问" : "Phone Access"}</h2>
        <PhoneAccessPanel />
      </section>
      ) : null}
      {activeTab === "ai" ? (
      <section className="settings-card">
        <p className="eyebrow">Visible identity</p>
        <h2>Identity</h2>
        <form
          className="memory-form"
          onSubmit={(event) => {
            event.preventDefault();
            void updateSettings({ instanceName, agentName }).then((updated) => {
              onUpdate(updated);
              setSaved(true);
            });
          }}
        >
          <label>
            Instance Name
            <input
              maxLength={100}
              onChange={(event) => {
                setInstanceName(event.target.value);
                setSaved(false);
              }}
              required
              value={instanceName}
            />
          </label>
          <p className="settings-card-copy">
            The name of this Vaenyx install. Your assistant's name lives in
            User Settings.
          </p>
          <button className="primary-button" type="submit">
            Save
          </button>
          {saved ? <p className="saved-note">Saved locally.</p> : null}
        </form>
      </section>
      ) : null}
      {activeTab === "ai" ? (
      <section className="settings-card">
        <p className="eyebrow">Provider Auth</p>
        <h2>OpenAI / Codex connection</h2>
        <div
          className={`provider-status-card ${
            providerConnected ? "connected" : "needs-attention"
          }`}
        >
          <span>{providerConnected ? "Connected" : "Needs setup"}</span>
          <strong>
            {getProviderConnectionCopy(settings.providerConnection)}
          </strong>
          <p>{getProviderConnectionDetail(settings.providerConnection)}</p>
        </div>
        {/* F1 (copy pack): the Codex CLI channel is a cloud-provider
            connection — the third-party notice renders on its connect surface
            (TPN n.3 acknowledgement surface). */}
        <p className="context-disclaimer">
          {t("legal.notice.modelConnect.cloud")}
        </p>
        <p className="context-disclaimer">{t("disclaimer.remote")}</p>
        <details className="advanced-details">
          <summary>Advanced</summary>
          <h3 className="settings-subhead">Diagnostics</h3>
          <div className="diagnostics-stack">
            <div className="connection-test-panel">
              <div>
                <strong>Forge connection test</strong>
                <p>
                  Runs one approved read-only repository check through the Codex
                  harness. No files are changed.
                </p>
              </div>
              <button
                className="secondary-button"
                disabled={testingForge}
                onClick={() => void runForgeTest()}
                type="button"
              >
                {testingForge ? "Testing Forge..." : "Run connection test"}
              </button>
              {forgeTestResult ? (
                <p
                  className={`connection-test-result ${forgeTestResult.status}`}
                >
                  <strong>
                    {forgeTestResult.status === "passed" ? "Passed" : "Failed"}
                  </strong>
                  {forgeTestResult.message}
                </p>
              ) : null}
              {forgeTestError ? (
                <p className="form-error">{forgeTestError}</p>
              ) : null}
            </div>
            <div className="connection-test-panel">
              <div>
                <strong>ChatGPT quick chat</strong>
                <p>
                  Sends one short message through your ChatGPT / Codex account.
                  It does not read files, change files, or expose tokens in the
                  browser. The first call may take longer while Vaenyx warms the
                  local Codex bridge.
                </p>
              </div>
              <label>
                Test message
                <textarea
                  maxLength={1000}
                  onChange={(event) => setChatPrompt(event.target.value)}
                  rows={3}
                  value={chatPrompt}
                />
              </label>
              <button
                className="secondary-button"
                disabled={testingChat || !chatPrompt.trim()}
                onClick={() => void runChatTest()}
                type="button"
              >
                {testingChat
                  ? `Sending... ${chatElapsedSeconds}s`
                  : "Send chat test"}
              </button>
              {chatTestResult ? (
                <div
                  className={`connection-test-result ${chatTestResult.status}`}
                >
                  <strong>
                    {chatTestResult.status === "passed"
                      ? "Passed"
                      : chatTestResult.status === "blocked"
                        ? "Blocked"
                        : "Failed"}
                  </strong>
                  <p>{chatTestResult.message}</p>
                  <p>
                    Response time: {formatDuration(chatTestResult.durationMs)}
                  </p>
                  {chatTestResult.output ? (
                    <pre className="connection-test-output">
                      {chatTestResult.output}
                    </pre>
                  ) : null}
                </div>
              ) : null}
              {chatTestError ? (
                <p className="form-error">{chatTestError}</p>
              ) : null}
            </div>
          </div>
          <h3 className="settings-subhead">Connection details</h3>
          <dl className="settings-list">
            <div>
              <dt>Codex auth</dt>
              <dd>{getCodexAuthCopy(settings.codex.authMethod)}</dd>
            </div>
            <div>
              <dt>Harness</dt>
              <dd>{settings.harness}</dd>
            </div>
            <div>
              <dt>Autonomy</dt>
              <dd>Level 0 only</dd>
            </div>
            <div>
              <dt>Forge access</dt>
              <dd>Vaenyx repository · Read-only</dd>
            </div>
            <div>
              <dt>Browser secrets</dt>
              <dd>Never exposed</dd>
            </div>
            <div>
              <dt>Storage</dt>
              <dd>{settings.dataStorage}</dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd>{settings.version}</dd>
            </div>
            <div>
              <dt>Mode</dt>
              <dd>{settings.mode}</dd>
            </div>
            <div>
              <dt>Local bind</dt>
              <dd>{settings.bindAddress}</dd>
            </div>
            <div>
              <dt>Codex CLI</dt>
              <dd>{settings.codex.version ?? "Not installed"}</dd>
            </div>
          </dl>
        </details>
      </section>
      ) : null}
      {activeTab === "ai" ? (
        <CapabilitiesPanel
          localTts={localTts}
          onLocalTtsChanged={setLocalTts}
          refreshKey={modelsChanged}
        />
      ) : null}
      {activeTab === "ai" ? (
        <ModelsPanel
          localTts={localTts}
          onConnectionsChanged={() => setModelsChanged((count) => count + 1)}
          onLocalTtsChanged={setLocalTts}
        />
      ) : null}
      {activeTab === "ai" ? <SubscriptionDoorPanel /> : null}
      {activeTab === "tools" ? <ToolsPanel /> : null}
      {activeTab === "notifications" ? <NotificationsPanel /> : null}
      {activeTab === "backup" ? <BackupPanel /> : null}
      {activeTab === "sharing" ? (
        <>
          <SharingPanel />
          <PublishPausePanel />
        </>
      ) : null}
      {activeTab === "modes" ? <ModesPanel /> : null}
      {activeTab === "legal" ? (
      <section className="settings-card">
        <p className="eyebrow">{t("settings.legal.eyebrow")}</p>
        <h2>{t("settings.legal.title")}</h2>
        <p className="settings-card-copy">{t("settings.legal.copy")}</p>
        <p className="context-disclaimer">
          {t("legal.notice.settings.legalLinks")}
        </p>
        <div className="legal-list">
          <p className="settings-card-copy">{t("disclaimer.ai")}</p>
          <p className="settings-card-copy">{t("disclaimer.health")}</p>
          <p className="settings-card-copy">{t("disclaimer.finance")}</p>
          <p className="settings-card-copy">{t("disclaimer.legal")}</p>
          <p className="settings-card-copy">{t("disclaimer.community")}</p>
          {/* No Merit line (copy pack J3): Merit is not built and the Terms say
              it is not provided, so a summary of how it works would imply it
              exists. The held string lives in the copy pack until the Schedule
              marks Merit active. */}
          <p className="settings-card-copy">{t("disclaimer.remote")}</p>
          <p className="settings-card-copy">{t("disclaimer.model")}</p>
        </div>
        <div className="settings-card-divider" />
        <LegalDocLinks />
      </section>
      ) : null}
    </div>
  );
}

// Three plain learning states (Not learned / Learning / Learned) instead of a
// raw % — clearer for the Owner; the exact confidence shows on hover.
function vaenyxMeState(item: {
  status: Workspace["vaenyxMe"]["items"][number]["status"];
  confidence: number;
}): { key: "not" | "learning" | "learned"; label: string } {
  if (item.status === "approved" || item.confidence >= 60)
    return { key: "learned", label: "Learned" };
  if (item.confidence > 0) return { key: "learning", label: "Learning" };
  return { key: "not", label: "Not learned" };
}

const defaultVaenyxMeCategory = {
  id: "communication",
  label: "Communication style",
};

const vaenyxMeCategories = [
  { id: "identity", label: "Owner identity" },
  defaultVaenyxMeCategory,
  { id: "preferences", label: "Stable preferences" },
  { id: "decisions", label: "Decision patterns" },
  { id: "projects", label: "Project behaviour" },
  { id: "trust", label: "Trust by Project" },
  { id: "autonomy", label: "Autonomy suggestions" },
];

function getVaenyxMeCandidateStatusCopy(
  status: VaenyxMeCandidate["status"],
): string {
  if (status === "pending_review") return "Pending review";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Deleted";
}

function VaenyxMePanel({
  ownerName,
  onProfileRefresh,
  profile,
}: {
  ownerName: string;
  onProfileRefresh: () => Promise<void>;
  profile: Workspace["vaenyxMe"];
}) {
  const items = profile.items;
  const [candidates, setCandidates] = useState<VaenyxMeCandidate[]>([]);
  const [category, setCategory] = useState(defaultVaenyxMeCategory.id);
  const [title, setTitle] = useState(defaultVaenyxMeCategory.label);
  const [proposedSummary, setProposedSummary] = useState("");
  const [proposedEvidence, setProposedEvidence] = useState("");
  const [confidence, setConfidence] = useState(80);
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [creatingCandidate, setCreatingCandidate] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(
    null,
  );
  const [approvalTitle, setApprovalTitle] = useState("");
  const [approvalSummary, setApprovalSummary] = useState("");
  const [approvalEvidence, setApprovalEvidence] = useState("");
  const [approvalConfidence, setApprovalConfidence] = useState(50);
  const [approvalReviewNote, setApprovalReviewNote] = useState("");
  const pendingCandidates = candidates.filter(
    (candidate) => candidate.status === "pending_review",
  );
  const reviewedCandidates = candidates.filter(
    (candidate) => candidate.status !== "pending_review",
  );

  useEffect(() => {
    fetchVaenyxMeCandidates()
      .then(setCandidates)
      .catch((error: unknown) => {
        setCandidateError(
          error instanceof Error
            ? error.message
            : "Vaenyx Me candidates could not load.",
        );
      });
  }, []);

  async function runScan() {
    setScanning(true);
    setCandidateError(null);
    try {
      setCandidates(await scanVaenyxMe());
    } catch (error) {
      setCandidateError(
        error instanceof Error ? error.message : "Vaenyx Me scan failed.",
      );
    } finally {
      setScanning(false);
    }
  }

  async function submitCandidate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCandidateError(null);
    setCreatingCandidate(true);

    try {
      const candidate = await createVaenyxMeCandidate({
        category,
        title,
        proposedSummary,
        proposedEvidence,
        confidence,
      });
      setCandidates((current) => [candidate, ...current]);
      setTitle(
        vaenyxMeCategories.find((item) => item.id === category)?.label ?? "",
      );
      setProposedSummary("");
      setProposedEvidence("");
      setConfidence(80);
    } catch (error) {
      setCandidateError(
        error instanceof Error
          ? error.message
          : "Vaenyx Me candidate could not be created.",
      );
    } finally {
      setCreatingCandidate(false);
    }
  }

  function startApprovalEdit(candidate: VaenyxMeCandidate) {
    setEditingCandidateId(candidate.id);
    setApprovalTitle(candidate.title);
    setApprovalSummary(candidate.proposedSummary);
    setApprovalEvidence(candidate.proposedEvidence);
    setApprovalConfidence(candidate.confidence);
    setApprovalReviewNote("");
  }

  async function approveCandidate(
    candidate: VaenyxMeCandidate,
    input: {
      title: string;
      summary: string;
      evidence: string;
      confidence: number;
      reviewNote?: string;
    },
  ) {
    setCandidateError(null);

    try {
      const updated = await approveVaenyxMeCandidate(candidate.id, input);
      setCandidates((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setEditingCandidateId(null);
      await onProfileRefresh();
    } catch (error) {
      setCandidateError(
        error instanceof Error
          ? error.message
          : "Vaenyx Me candidate could not be approved.",
      );
    }
  }

  async function rejectCandidate(candidate: VaenyxMeCandidate) {
    const reviewNote = window.prompt(
      "Optional: why reject this Vaenyx Me candidate?",
      "",
    );

    if (reviewNote === null) return;

    setCandidateError(null);

    try {
      const updated = await rejectVaenyxMeCandidate(candidate.id, {
        reviewNote,
      });
      setCandidates((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (error) {
      setCandidateError(
        error instanceof Error
          ? error.message
          : "Vaenyx Me candidate could not be rejected.",
      );
    }
  }

  async function removeCandidate(candidate: VaenyxMeCandidate) {
    const confirmed = window.confirm(
      "Delete this candidate from the Vaenyx Me review queue?",
    );

    if (!confirmed) return;

    setCandidateError(null);

    try {
      await deleteVaenyxMeCandidate(candidate.id);
      setCandidates((current) =>
        current.filter((item) => item.id !== candidate.id),
      );
    } catch (error) {
      setCandidateError(
        error instanceof Error
          ? error.message
          : "Vaenyx Me candidate could not be deleted.",
      );
    }
  }

  return (
    <div className="future-layout">
      <section className="future-hero">
        <p className="eyebrow">Owner review page</p>
        <h2>Vaenyx Me is your inspectable digital self.</h2>
        <p>
          This is where Vaenyx will shape a reviewed model of {ownerName}: your
          communication style, stable preferences, decision patterns, project
          behaviour, trust settings, and autonomy suggestions. It is not an
          Agent list, and it must never silently grow without review.
        </p>
      </section>
      <section>
        <div className="section-title">
          <div>
            <p className="eyebrow">Digital self</p>
            <h2>Vaenyx Me profile</h2>
          </div>
          <div className="vaenyx-me-header-right">
            <span className="count-chip">
              {items.filter((item) => item.status === "approved").length} of{" "}
              {items.length} learned
            </span>
            <button
              className="secondary-button"
              disabled={scanning}
              onClick={() => void runScan()}
              type="button"
            >
              {scanning ? "Scanning..." : "Scan recent activity"}
            </button>
          </div>
        </div>
        <div className="vaenyx-me-grid">
          {items.map((item) => {
            const state = vaenyxMeState(item);
            return (
              <article className="vaenyx-me-card" key={item.id}>
                <div className="project-card-head">
                  <div>
                    <span
                      className={`vaenyx-me-state vaenyx-me-state--${state.key}`}
                      title={`${item.confidence}% confidence`}
                    >
                      <span className="vaenyx-me-dot" />
                      {state.label}
                    </span>
                    <h3>{item.title}</h3>
                  </div>
                  <small>{item.category}</small>
                </div>
                <p>{item.summary}</p>
                <dl>
                  <div>
                    <dt>Why</dt>
                    <dd>{item.evidence ?? "Not learned yet."}</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      </section>
      <div className="memory-layout">
        <details className="memory-editor vaenyx-me-tell">
          <summary>+ Tell Vaenyx something about me</summary>
          <p className="panel-description">
            Optional — Vaenyx learns this on its own from how you work. Use this
            only to tell it something directly. It still needs your approval
            below before it changes Vaenyx Me.
          </p>
          <form className="memory-form" onSubmit={submitCandidate}>
            <label>
              Category
              <select
                onChange={(event) => {
                  const nextCategory = event.target.value;
                  setCategory(nextCategory);
                  setTitle(
                    vaenyxMeCategories.find((item) => item.id === nextCategory)
                      ?.label ?? "",
                  );
                }}
                value={category}
              >
                {vaenyxMeCategories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              What should Vaenyx know?
              <textarea
                maxLength={2_000}
                onChange={(event) => setProposedSummary(event.target.value)}
                placeholder="Example: I prefer concise, practical explanations."
                required
                rows={4}
                value={proposedSummary}
              />
            </label>
            <label>
              Why (evidence)
              <textarea
                maxLength={2_000}
                onChange={(event) => setProposedEvidence(event.target.value)}
                placeholder="Example: I keep asking for clear, simple explanations."
                required
                rows={3}
                value={proposedEvidence}
              />
            </label>
            {candidateError ? (
              <p className="form-error">{candidateError}</p>
            ) : null}
            <button
              className="primary-button"
              disabled={creatingCandidate}
              type="submit"
            >
              {creatingCandidate ? "Adding..." : "Add candidate"}
            </button>
          </form>
        </details>

        <section className="memory-list-section">
          <div className="section-title">
            <div>
              <p className="eyebrow">Owner approval required</p>
              <h2>Vaenyx Me review queue</h2>
            </div>
            <span className="count-chip">{pendingCandidates.length}</span>
          </div>
          {pendingCandidates.length === 0 ? (
            <div className="empty-state">
              <strong>No Vaenyx Me candidates waiting</strong>
              <p>
                Vaenyx Me will stay unchanged until a candidate is created and
                approved.
              </p>
            </div>
          ) : (
            <div className="memory-list">
              {pendingCandidates.map((candidate) => (
                <article className="memory-card" key={candidate.id}>
                  <span className="task-status">
                    {getVaenyxMeCandidateStatusCopy(candidate.status)}
                  </span>
                  <h3>{candidate.title}</h3>
                  <p>{candidate.proposedSummary}</p>
                  <dl className="settings-list">
                    <div>
                      <dt>Category</dt>
                      <dd>{candidate.category}</dd>
                    </div>
                    <div>
                      <dt>Evidence</dt>
                      <dd>{candidate.proposedEvidence}</dd>
                    </div>
                    <div>
                      <dt>Confidence</dt>
                      <dd>{candidate.confidence}%</dd>
                    </div>
                    <div>
                      <dt>Source</dt>
                      <dd>{candidate.sourceType}</dd>
                    </div>
                  </dl>
                  {editingCandidateId === candidate.id ? (
                    <form
                      className="memory-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void approveCandidate(candidate, {
                          title: approvalTitle,
                          summary: approvalSummary,
                          evidence: approvalEvidence,
                          confidence: approvalConfidence,
                          reviewNote: approvalReviewNote,
                        });
                      }}
                    >
                      <label>
                        Approved title
                        <input
                          maxLength={120}
                          onChange={(event) =>
                            setApprovalTitle(event.target.value)
                          }
                          required
                          value={approvalTitle}
                        />
                      </label>
                      <label>
                        Approved summary
                        <textarea
                          maxLength={2_000}
                          onChange={(event) =>
                            setApprovalSummary(event.target.value)
                          }
                          required
                          rows={4}
                          value={approvalSummary}
                        />
                      </label>
                      <label>
                        Approved evidence
                        <textarea
                          maxLength={2_000}
                          onChange={(event) =>
                            setApprovalEvidence(event.target.value)
                          }
                          required
                          rows={3}
                          value={approvalEvidence}
                        />
                      </label>
                      <label>
                        Confidence
                        <input
                          max={100}
                          min={0}
                          onChange={(event) =>
                            setApprovalConfidence(Number(event.target.value))
                          }
                          required
                          type="number"
                          value={approvalConfidence}
                        />
                      </label>
                      <label>
                        Review note
                        <input
                          maxLength={2_000}
                          onChange={(event) =>
                            setApprovalReviewNote(event.target.value)
                          }
                          placeholder="Optional note"
                          value={approvalReviewNote}
                        />
                      </label>
                      <div className="card-actions">
                        <button className="primary-button" type="submit">
                          Save approved Vaenyx Me
                        </button>
                        <button
                          className="text-button"
                          onClick={() => setEditingCandidateId(null)}
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="card-actions">
                      <button
                        className="primary-button"
                        onClick={() =>
                          void approveCandidate(candidate, {
                            title: candidate.title,
                            summary: candidate.proposedSummary,
                            evidence: candidate.proposedEvidence,
                            confidence: candidate.confidence,
                          })
                        }
                        type="button"
                      >
                        Approve
                      </button>
                      <button
                        className="text-button"
                        onClick={() => startApprovalEdit(candidate)}
                        type="button"
                      >
                        Edit and approve
                      </button>
                      <button
                        className="text-button"
                        onClick={() => void rejectCandidate(candidate)}
                        type="button"
                      >
                        Reject
                      </button>
                      <button
                        className="danger-button"
                        onClick={() => void removeCandidate(candidate)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}

          {reviewedCandidates.length > 0 ? (
            <section className="recent-section">
              <div className="section-title">
                <div>
                  <p className="eyebrow">Reviewed</p>
                  <h2>Recent decisions</h2>
                </div>
                <span className="count-chip">{reviewedCandidates.length}</span>
              </div>
              <div className="memory-list">
                {reviewedCandidates.slice(0, 4).map((candidate) => (
                  <article className="memory-card" key={candidate.id}>
                    <span className="task-status">
                      {getVaenyxMeCandidateStatusCopy(candidate.status)}
                    </span>
                    <h3>{candidate.title}</h3>
                    <p>{candidate.proposedSummary}</p>
                    <small>{candidate.reviewNote ?? "No review note."}</small>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </section>
      </div>
    </div>
  );
}

interface MethodSchemaField {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

// Turn an author-written JSON Schema into a readable list of top-level fields.
// Defensive: the schema is arbitrary JSON, so every access is guarded.
function readMethodSchemaFields(schema: unknown): MethodSchemaField[] {
  if (!schema || typeof schema !== "object") return [];
  const record = schema as Record<string, unknown>;
  const properties = record.properties;
  if (!properties || typeof properties !== "object") return [];

  const required = Array.isArray(record.required)
    ? record.required.filter((item): item is string => typeof item === "string")
    : [];

  return Object.entries(properties as Record<string, unknown>).map(
    ([name, raw]) => {
      const prop = (
        raw && typeof raw === "object" ? raw : {}
      ) as Record<string, unknown>;
      const rawType = prop.type;
      let type =
        typeof rawType === "string"
          ? rawType
          : Array.isArray(rawType)
            ? rawType.join(" | ")
            : "any";
      if (
        type === "array" &&
        prop.items &&
        typeof prop.items === "object" &&
        typeof (prop.items as Record<string, unknown>).type === "string"
      ) {
        type = `array of ${(prop.items as Record<string, unknown>).type as string}`;
      }
      return {
        name,
        type,
        required: required.includes(name),
        description:
          typeof prop.description === "string" ? prop.description : "",
      };
    },
  );
}

function MethodFieldTable({ schema }: { schema: unknown }) {
  const fields = readMethodSchemaFields(schema);
  if (fields.length === 0) {
    return <p className="library-note">No structured fields declared.</p>;
  }
  return (
    <table className="library-field-table">
      <thead>
        <tr>
          <th>Field</th>
          <th>Type</th>
          <th>Required</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {fields.map((field) => (
          <tr key={field.name}>
            <td>
              <code>{field.name}</code>
            </td>
            <td>{field.type}</td>
            <td>{field.required ? "Yes" : "No"}</td>
            <td>{field.description || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MethodManifest({ manifest }: { manifest: unknown }) {
  if (!manifest || typeof manifest !== "object") {
    return <p className="library-note">No manifest declared.</p>;
  }
  const record = manifest as Record<string, unknown>;
  const permissions = (
    record.permissions && typeof record.permissions === "object"
      ? record.permissions
      : {}
  ) as Record<string, unknown>;
  const learning = (
    record.learning && typeof record.learning === "object"
      ? record.learning
      : {}
  ) as Record<string, unknown>;
  const yesNo = (value: unknown) => (value === true ? "Yes" : "No");

  return (
    <dl className="settings-list">
      <div>
        <dt>Network access</dt>
        <dd>{yesNo(permissions.network)}</dd>
      </div>
      <div>
        <dt>Reads files</dt>
        <dd>{yesNo(permissions.readFiles)}</dd>
      </div>
      <div>
        <dt>Behaviour learning</dt>
        <dd>{yesNo(learning.enabled)}</dd>
      </div>
    </dl>
  );
}

function placeholderForType(type: string): unknown {
  if (type === "number" || type === "integer") return 0;
  if (type === "boolean") return false;
  if (type === "array" || type.startsWith("array")) return [];
  if (type === "object") return {};
  return "";
}

// A fillable JSON skeleton from the method's input schema, so the owner has a
// working starting point in the test-run box instead of a blank field.
function buildInputSkeleton(schema: unknown): Record<string, unknown> {
  const skeleton: Record<string, unknown> = {};
  for (const field of readMethodSchemaFields(schema)) {
    skeleton[field.name] = placeholderForType(field.type);
  }
  return skeleton;
}

// Full method detail + an owner-only test run. Keyed by method id by the parent,
// so the test-run state resets cleanly when switching methods.
// Publish-to-community card shown on a Method's detail page. Self-contained: it
// fetches its own publish state. Owner signs in with Google once (a full-page
// redirect), then publishes; a published Method shows a badge and can be updated.
// Shows who you're signed in as (the public community byline) and lets you
// change it to a nickname. Auto-opens right after a fresh sign-in so the user
// can set a nickname instead of their full Google/GitHub name.
// The publish confirmation dialog (copy pack G1/G2/G2a): the permanence + CC BY
// notice, the Contributor Agreement acceptance line (tappable — opens the
// operative document), and the warranty checkbox — un-pre-selected and actively
// confirmed on EVERY publish; the publish button stays disabled until ticked.
function PublishConfirmDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: (acceptance: PublishAcceptance) => void;
}) {
  const { lang, t } = useI18n();
  const [warranty, setWarranty] = useState(false);
  const [receiveExamples, setReceiveExamples] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);
  return (
    <Modal onClose={onCancel} title={t("publish.title")}>
      <div
        className="legal-doc-body"
        style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
      >
        <p className="settings-card-copy">{t("legal.notice.publish")}</p>
        <p className="settings-card-copy" style={{ fontSize: "var(--fs-sm)" }}>
          {t("legal.notice.publish.contributorTerms")}{" "}
          <button
            className="text-button"
            onClick={() => setShowAgreement(true)}
            type="button"
          >
            {lang === "zh" ? "贡献者协议" : "Contributor Agreement"}
          </button>
        </p>
        <label
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "flex-start",
            fontSize: "var(--fs-sm)",
            cursor: "pointer",
          }}
        >
          <input
            checked={warranty}
            onChange={(event) => setWarranty(event.target.checked)}
            style={{ marginTop: "0.2rem" }}
            type="checkbox"
          />
          <span>{t("legal.consent.publish.warranty")}</span>
        </label>
        {/* K9. A separate question from the warranty above and deliberately
            unticked: publishing something is not agreeing to hear from everyone
            who installs it. Changeable later in Sharing. */}
        {CAPABILITIES.flywheelUpload ? (
          <label
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "flex-start",
              fontSize: "var(--fs-sm)",
              cursor: "pointer",
            }}
          >
            <input
              checked={receiveExamples}
              onChange={(event) => setReceiveExamples(event.target.checked)}
              style={{ marginTop: "0.2rem" }}
              type="checkbox"
            />
            <span>{t("legal.consent.flywheel.receive.label")}</span>
          </label>
        ) : null}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            className="primary-button"
            disabled={!warranty}
            onClick={() =>
              onConfirm({
                copyVersion: LEGAL_COPY_VERSION,
                language: lang,
                warrantyConfirmed: true,
                receiveExamples,
              })
            }
            type="button"
          >
            {t("publish.button")}
          </button>
          <button className="secondary-button" onClick={onCancel} type="button">
            {t("routine.confirm.cancel")}
          </button>
        </div>
      </div>
      {showAgreement ? (
        <LegalDocModal
          name="contributor-agreement"
          onClose={() => setShowAgreement(false)}
        />
      ) : null}
    </Modal>
  );
}

function PublishNicknameEditor({
  signedInAs,
  autoOpen,
  onSaved,
}: {
  signedInAs: string;
  autoOpen: boolean;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(autoOpen);
  const [value, setValue] = useState(signedInAs);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const name = value.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      await setPublishDisplayName(name);
      setEditing(false);
      onSaved();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not save your name.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <p className="settings-card-copy">
        {t("publish.signedInAs")} <strong>{signedInAs}</strong>{" "}
        <button
          className="text-button"
          onClick={() => {
            setValue(signedInAs);
            setEditing(true);
          }}
          style={{ fontSize: "var(--fs-sm)" }}
          type="button"
        >
          Edit name
        </button>
      </p>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.4rem",
        marginBottom: "0.5rem",
      }}
    >
      <label className="settings-card-copy" style={{ fontSize: "var(--fs-sm)" }}>
        Your public name — shown as the author in the community library.
      </label>
      <input
        className="method-rename-input"
        maxLength={80}
        onChange={(event) => setValue(event.target.value)}
        placeholder="A nickname others will see"
        value={value}
      />
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button
          className="primary-button"
          disabled={busy || !value.trim()}
          onClick={() => void save()}
          type="button"
        >
          {busy ? "Saving…" : "Save name"}
        </button>
        <button
          className="secondary-button"
          disabled={busy}
          onClick={() => setEditing(false)}
          type="button"
        >
          Cancel
        </button>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}

// The publish sign-in: in service mode the user signs in to the operator-hosted
// core-cloud service (GitHub or Google); in operator mode it's the direct Google
// link. Both are full-page redirects that come back to /?publish=linked.
function PublishSignIn({ state }: { state: PublishState }) {
  const { lang, t } = useI18n();
  // G3a (copy pack): the APP 8.2(b) overseas-disclosure consent — an
  // un-pre-selected checkbox that gates the sign-in buttons, shown BEFORE
  // authentication so the consent precedes the first collection of account data.
  const [overseasConsent, setOverseasConsent] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  if (state.mode === "service") {
    // Come back to the page the user was on (not the app home) after login.
    const returnTo = encodeURIComponent(
      window.location.pathname + window.location.search,
    );
    const signIn = async (provider: "google" | "github") => {
      if (!overseasConsent) return;
      // Record the consent locally BEFORE navigating (clause 2.3) — the OAuth
      // redirect would abort an in-flight fire-and-forget write, losing the
      // only evidence of the tick. It's a localhost round-trip; a failure still
      // proceeds (the gateway re-asks at publish time when no record exists).
      await recordLegalAck({
        keyName: "legal.consent.publish.overseas",
        copyVersion: LEGAL_COPY_VERSION,
        language: lang,
        choice: "agreed",
      }).catch(() => {});
      window.location.assign(
        `/v1/publish-auth/start?provider=${provider}&return_to=${returnTo}`,
      );
    };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <p className="settings-card-copy" style={{ fontSize: "var(--fs-sm)" }}>
          {t("legal.notice.publish.signIn")}{" "}
          <button
            className="text-button"
            onClick={() => setShowPrivacy(true)}
            type="button"
          >
            {lang === "zh" ? "隐私政策" : "Privacy Policy"}
          </button>
        </p>
        <label
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "flex-start",
            fontSize: "var(--fs-sm)",
            cursor: "pointer",
          }}
        >
          <input
            checked={overseasConsent}
            onChange={(event) => setOverseasConsent(event.target.checked)}
            style={{ marginTop: "0.2rem" }}
            type="checkbox"
          />
          <span>{t("legal.consent.publish.overseas")}</span>
        </label>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            className="primary-button"
            disabled={!overseasConsent}
            onClick={() => void signIn("google")}
            type="button"
          >
            Sign in with Google
          </button>
          <button
            className="secondary-button"
            disabled={!overseasConsent}
            onClick={() => void signIn("github")}
            type="button"
          >
            Sign in with GitHub
          </button>
        </div>
        {showPrivacy ? (
          <LegalDocModal
            name="privacy-policy"
            onClose={() => setShowPrivacy(false)}
          />
        ) : null}
      </div>
    );
  }
  return (
    <button
      className="primary-button"
      onClick={() => window.location.assign("/v1/auth/google/start")}
      type="button"
    >
      {t("publish.signin")}
    </button>
  );
}

function MethodPublishCard({ method }: { method: LibraryMethod }) {
  const { lang, t } = useI18n();
  const [state, setState] = useState<PublishState | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  // The capabilities this Method needs and Vaenyx has not built. Set when the
  // publish comes back refused; cleared the moment the Owner answers, either
  // way (copy pack N3).
  const [wanted, setWanted] = useState<string[] | null>(null);

  useEffect(() => {
    let active = true;
    fetchPublishState()
      .then((next) => {
        if (active) setState(next);
      })
      .catch(() => {
        if (active) setState(null);
      });
    return () => {
      active = false;
    };
  }, []);

  if (state && !state.configured) {
    return (
      <section className="settings-card">
        <p className="eyebrow">{t("publish.title")}</p>
        <p className="settings-card-copy">{t("publish.notConfigured")}</p>
      </section>
    );
  }

  const published = state?.publishedMethodIds.includes(method.id) ?? false;

  async function publish(acceptance: PublishAcceptance) {
    setConfirming(false);
    setError(null);
    setWanted(null);
    setBusy(true);
    try {
      await publishMethodToCommunity(method.id, acceptance, lang);
      setDone(true);
      setState(await fetchPublishState());
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not publish this method.",
      );
      // The one refusal that asks a question back. The names arrive as data
      // rather than inside the sentence, because the sentence is translated and
      // a screen that read the names out of it would break in Chinese.
      const missing =
        nextError instanceof VaenyxRequestError
          ? nextError.body.missingCapabilities
          : null;
      if (Array.isArray(missing) && missing.length > 0) {
        setWanted(missing.map((name) => String(name)));
      }
    } finally {
      setBusy(false);
    }
  }

  // N3 — the counter is written only here, only after a yes. A decline is
  // recorded too: "was asked and said no" and "was never asked" are different
  // facts, and only one of them means the question is settled for that attempt.
  async function answerWanted(count: boolean) {
    const capabilities = wanted ?? [];
    setWanted(null);
    try {
      await recordLegalAck({
        keyName: "legal.consent.capability.wanted",
        copyVersion: LEGAL_COPY_VERSION,
        language: lang === "zh" ? "zh" : "en",
        choice: count ? "count" : "decline",
      });
    } catch {
      // The choice did not record. Nothing is counted on a failure here, which
      // is the safe direction: a missing record is a question that gets asked
      // again, and a count nobody agreed to cannot be taken back.
    }
    if (!count) return;
    try {
      await recordCapabilityWanted(capabilities, lang === "zh" ? "zh" : "en");
    } catch {
      // The request already popped its own error toast.
    }
  }

  return (
    <section className="settings-card">
      <p className="eyebrow">{t("publish.title")}</p>
      <p className="settings-card-copy">{t("publish.intro")}</p>
      {!state ? null : !state.signedInAs ? (
        <PublishSignIn state={state} />
      ) : (
        <>
          <PublishNicknameEditor
            signedInAs={state.signedInAs}
            autoOpen={
              state.mode === "service" &&
              new URLSearchParams(window.location.search).get("publish") ===
                "linked"
            }
            onSaved={() => {
              void fetchPublishState().then(setState);
            }}
          />
          {published ? (
            <p className="settings-card-copy">
              <span className="ok-text">{t("publish.published")} ✓</span>
            </p>
          ) : null}
          {/* G5: states the fact, and offers nothing. Republishing is a fresh
              acceptance of the Contributor Agreement, so it stays the Owner's
              deliberate act — never a nudge, never automatic. */}
          {state.staleMethodIds.includes(method.id) ? (
            <p className="context-disclaimer">
              {t("legal.notice.publish.localChanges")}
            </p>
          ) : null}
          {/* L2: fires on the Method carrying import provenance, never on the
              publisher remembering where it came from — and it is shown IN
              ADDITION to the ordinary publish confirmations, never instead. */}
          {state.importedMethodIds.includes(method.id) ? (
            <p className="context-disclaimer">
              {t("legal.notice.skill.importedPublish")}
            </p>
          ) : null}
          <button
            className="primary-button"
            disabled={busy}
            onClick={() => setConfirming(true)}
            type="button"
          >
            {busy
              ? t("publish.publishing")
              : published
                ? t("publish.republish")
                : t("publish.button")}
          </button>
          {done ? (
            <p className="settings-card-copy">{t("publish.done")}</p>
          ) : null}
        </>
      )}
      {error ? <p className="form-error">{error}</p> : null}
      {confirming ? (
        <PublishConfirmDialog
          onCancel={() => setConfirming(false)}
          onConfirm={(acceptance) => void publish(acceptance)}
        />
      ) : null}
      {/* N3 — asked BEFORE anything is written down. The refusal used to count
          the attempt on its way past and then announce that it had; a record
          made and reported afterwards is not a choice. Closing the window
          without answering counts nothing, exactly like saying no. */}
      {wanted ? (
        <Modal
          onClose={() => setWanted(null)}
          title={t("legal.consent.capability.wanted.title")}
        >
          {t("legal.consent.capability.wanted")
            .split("\n\n")
            .map((paragraph) => (
              <p className="settings-card-copy" key={paragraph.slice(0, 24)}>
                {paragraph}
              </p>
            ))}
          <div className="modal-actions">
            <button
              className="secondary-button"
              onClick={() => void answerWanted(true)}
              type="button"
            >
              {t("legal.consent.capability.wanted.accept")}
            </button>
            <button
              className="secondary-button"
              onClick={() => void answerWanted(false)}
              type="button"
            >
              {t("legal.consent.capability.wanted.decline")}
            </button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}

// The operator's emergency stop on community publishing. Invisible to everyone
// else: the publish service holds the operator allow-list and answers 403, so
// this panel simply does not render rather than showing a control that refuses.
// Oskar has to be able to reach this himself when abuse is in progress - a stop
// that needs a deploy is not a stop.
function PublishPausePanel() {
  const { t } = useI18n();
  const [state, setState] = useState<PublishPauseState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchPublishPause()
      .then((next) => {
        if (active) setState(next);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (!state?.available) return null;

  async function toggle() {
    if (!state || busy) return;
    setBusy(true);
    try {
      setState(await setPublishPause(!state.paused));
    } catch {
      // The failed request already raised a toast.
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="settings-card">
      <p className="eyebrow">{t("title.community")}</p>
      <h2>{t("settings.community.pauseTitle")}</h2>
      <p className="settings-card-copy">{t("settings.community.pauseCopy")}</p>
      <p className="settings-card-copy">
        <strong>
          {state.paused
            ? t("settings.community.paused")
            : t("settings.community.live")}
        </strong>
      </p>
      {state.envOverride ? (
        <p className="context-disclaimer">
          {t("settings.community.pauseOverride")}
        </p>
      ) : null}
      <button
        className={state.paused ? "primary-button" : "danger-button"}
        disabled={busy}
        onClick={() => void toggle()}
        type="button"
      >
        {busy
          ? "…"
          : state.paused
            ? t("settings.community.live")
            : t("settings.community.paused")}
      </button>
    </section>
  );
}

// What a Routine does, before anyone starts using it. Reached by opening a
// Routine in the Library; the chat starts from the button at the bottom, so
// nobody is dropped into a conversation with something they have not read.
function RoutineDetail({
  summary,
  methods,
  onBack,
  onStart,
}: {
  summary: LibraryRoutineSummary;
  methods: LibraryMethodSummary[];
  onBack: () => void;
  onStart: () => void;
}) {
  const { t } = useI18n();
  const [full, setFull] = useState<LibraryRoutine | null>(null);

  useEffect(() => {
    let active = true;
    void fetchLibraryRoutine(summary.id)
      .then((routine) => {
        if (active) setFull(routine);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [summary.id]);

  const methodName = (methodId: string) =>
    methods.find((method) => method.id === methodId)?.name ?? methodId;

  return (
    <div className="library-layout">
      <button className="text-button library-back" onClick={onBack} type="button">
        {t("common.back")}
      </button>
      <section className="settings-card">
        <p className="eyebrow">{t("routine.open.title")}</p>
        <h2>{summary.name}</h2>
        <p className="settings-card-copy">{summary.description}</p>
        {summary.tags.length > 0 ? (
          <span className="tag-row">
            {summary.tags.map((tag) => (
              <span className="tag-chip" key={tag}>
                #{tag}
              </span>
            ))}
          </span>
        ) : null}
        <p className="settings-card-copy">
          {summary.mode === "accumulate"
            ? t("routine.open.mode.accumulate")
            : t("routine.open.mode.oneShot")}
        </p>

        <p className="eyebrow">{t("routine.open.steps")}</p>
        {full ? (
          <ol className="routine-steps">
            {full.flow.map((step, index) => (
              <li key={step.id}>
                <strong>{methodName(step.methodId)}</strong>
                {" — "}
                {step.from === "previous"
                  ? t("routine.open.from.previous")
                  : step.from === "static"
                    ? t("routine.open.from.static")
                    : t("routine.open.from.journal")}
                {index === 0 ? "" : ""}
              </li>
            ))}
          </ol>
        ) : (
          <p className="settings-card-copy">
            {summary.stepCount} {summary.stepCount === 1 ? "step" : "steps"}
          </p>
        )}

        {full && full.deps.length > 0 ? (
          <p className="settings-card-copy">
            {t("routine.open.uses")}:{" "}
            {full.deps.map((dep) => methodName(dep.methodId)).join(" · ")}
          </p>
        ) : null}

        <small>
          v{summary.version}
          {summary.owner ? ` · by ${summary.owner}` : ""}
        </small>

        {/* The start button gets its own row at the bottom right (Oskar,
            2026-07-26): sharing a line with the version made it look like a
            caption, and it sat on top of the text on a narrow screen. */}
        <div className="routine-start-row">
          <button className="primary-button" onClick={onStart} type="button">
            {t("routine.open.start")}
          </button>
        </div>
      </section>
    </div>
  );
}

// Importing the instructions from an Agent Skill (copy pack Part L).
//
// WORDING — never "Skill compatible", "runs Skills" or "works with Skills".
// Our interoperability statements are descriptive only under ToS 11.5, and that
// holds only while we do not overstate them. What this does is import the
// INSTRUCTIONS and name what was dropped, item by item: "some features may not
// work" would send the Owner off to discover the breakage themselves, which is
// precisely what L1 exists to prevent.
// Hands the Owner the file. Everything stays on this machine: the export is
// built by the local server and saved by the browser, with nothing uploaded.
async function downloadMethodAsSkill(methodId: string): Promise<void> {
  try {
    const result = await exportMethodAsSkill(methodId);
    const url = URL.createObjectURL(
      new Blob([result.markdown], { type: "text/markdown" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = result.fileName;
    link.click();
    URL.revokeObjectURL(url);
  } catch {
    // The failed request already raised a toast.
  }
}

function SkillImportPanel({ onImported }: { onImported: () => void }) {
  const { t } = useI18n();
  const [markdown, setMarkdown] = useState("");
  const [source, setSource] = useState("");
  const [preview, setPreview] = useState<SkillImportPreviewResponse | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  if (!CAPABILITIES.skillInterop) return null;

  // A SKILL.md arrives as a file far more often than as something to paste, so
  // it can be dropped on the box or picked with the button. Read here in the
  // browser: the file never goes anywhere until the Owner confirms the import.
  async function takeFile(file: File | undefined) {
    if (!file) return;
    try {
      setMarkdown(await file.text());
      if (!source.trim()) setSource(file.name);
    } catch {
      showErrorToast("Vaenyx could not read that file.");
    }
  }

  async function look() {
    if (!markdown.trim() || busy) return;
    setBusy(true);
    try {
      setPreview(
        await previewSkillImport({
          markdown,
          source: source.trim() || undefined,
        }),
      );
    } catch {
      // The failed request already raised a toast.
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!preview || busy) return;
    setBusy(true);
    try {
      await importSkill({
        markdown,
        source: source.trim() || undefined,
        license: preview.license ?? undefined,
      });
      setPreview(null);
      setMarkdown("");
      setSource("");
      onImported();
    } catch {
      // The failed request already raised a toast.
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="settings-card">
      <p className="eyebrow">{t("skill.import.title")}</p>
      <p className="settings-card-copy">{t("skill.import.copy")}</p>
      <input
        className="method-rename-input"
        onChange={(event) => setSource(event.target.value)}
        placeholder={t("skill.import.source")}
        value={source}
      />
      <input
        accept=".md,.markdown,text/markdown,text/plain"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void takeFile(file);
        }}
        ref={fileRef}
        type="file"
      />
      <div
        className={`skill-drop${dragging ? " dragging" : ""}`}
        onDragLeave={() => setDragging(false)}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void takeFile(event.dataTransfer.files?.[0]);
        }}
      >
        <textarea
          className="method-rename-input"
          onChange={(event) => setMarkdown(event.target.value)}
          placeholder={t("skill.import.paste")}
          rows={8}
          style={{ fontFamily: "ui-monospace, monospace", width: "100%" }}
          value={markdown}
        />
        <p className="library-note">{t("skill.import.drop")}</p>
      </div>
      <div className="skill-import-actions">
        <button
          className="secondary-button"
          onClick={() => fileRef.current?.click()}
          type="button"
        >
          {t("skill.import.choose")}
        </button>
        <button
          className="primary-button"
          disabled={busy || !markdown.trim()}
          onClick={() => void look()}
          type="button"
        >
          {busy ? "…" : t("skill.import.look")}
        </button>
      </div>

      {preview ? (
        <Modal onClose={() => setPreview(null)} title={preview.name} variant="doc">
          <p className="settings-card-copy">{t("legal.notice.skill.import")}</p>
          {/* L1 requires the dropped items listed one by one, and L5 requires
              each label to sit AGAINST the thing found — the file name, the
              step. Never a category heading with a count: "3 x A file that
              would have run" tells a person nothing about what their Skill
              did. */}
          {preview.dropped.length > 0 ? (
            <ul className="skill-dropped">
              {preview.dropped.map((item, index) => (
                <li key={`${item.kind}-${index}`}>
                  <strong>{t(`skill.drop.${item.reason}`)}</strong> — {item.detail}
                </li>
              ))}
            </ul>
          ) : (
            <p className="settings-card-copy">{t("skill.import.nothingLost")}</p>
          )}
          <div className="modal-actions">
            <button
              className="text-button"
              onClick={() => setPreview(null)}
              type="button"
            >
              {t("routine.confirm.cancel")}
            </button>
            <button
              className="primary-button"
              disabled={busy}
              onClick={() => void confirm()}
              type="button"
            >
              {busy ? "…" : t("skill.import.confirm")}
            </button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}

// The flywheel, local half. An app sent back a correction; the Owner reads it
// and decides whether it becomes an example this Method learns from.
//
// Shown in full on purpose. A correction contains whatever was actually typed
// that day — a name, an amount, an address — so the Owner sees the real content
// before keeping it, rather than trusting a detector to decide what is safe.
// Nothing here leaves the machine: keeping an example writes one file into the
// Method's folder, and examples are outside the content hash, so no app grant
// is disturbed by a Method getting better.
function MethodCorrections({ methodId }: { methodId: string }) {
  const { t } = useI18n();
  const [corrections, setCorrections] = useState<StoredCorrection[]>([]);
  const [examples, setExamples] = useState<MethodExampleEntry[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [kept, setKept] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    void fetchCorrections(methodId)
      .then((response) => {
        if (active) setCorrections(response.corrections);
      })
      .catch(() => undefined);
    void fetchMethodExamples(methodId)
      .then((response) => {
        if (active) setExamples(response.examples);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [methodId]);

  async function removeExample(file: string) {
    setBusyId(file);
    try {
      await deleteMethodExample(methodId, file);
      setExamples((current) => current.filter((entry) => entry.file !== file));
    } catch {
      // The failed request already raised a toast.
    } finally {
      setBusyId(null);
    }
  }

  if (corrections.length === 0 && examples.length === 0) return null;

  async function keep(correction: StoredCorrection) {
    setBusyId(correction.id);
    try {
      await adoptCorrection(methodId, {
        correctionId: correction.id,
        // The app that sent it is the closest thing to a contributor we have
        // locally; an empty name means the Owner's own instance.
        contributor: correction.appProfileName,
      });
      setKept((current) => [...current, correction.id]);
    } catch {
      // The failed request already raised a toast.
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="settings-card">
      <p className="eyebrow">{t("method.examples.title")}</p>
      <p className="settings-card-copy">{t("method.examples.copy")}</p>
      {examples.length > 0 ? (
        <div className="example-list">
          {examples.map((example) => (
            <div className="correction-card" key={example.file}>
              <small>
                {example.contributor ?? t("method.examples.you")}
                {example.time ? ` · ${example.time}` : ""}
                {` · ${example.source}`}
              </small>
              <pre className="correction-body">
                {JSON.stringify(example.input, null, 2)}
              </pre>
              <button
                className="text-button"
                disabled={busyId === example.file}
                onClick={() => void removeExample(example.file)}
                type="button"
              >
                {t("method.examples.remove")}
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {corrections.length > 0 ? (
        <>
          <p className="eyebrow">{t("method.corrections.title")}</p>
          <p className="settings-card-copy">{t("method.corrections.copy")}</p>
        </>
      ) : null}
      {corrections.map((correction) => (
        <div className="correction-card" key={correction.id}>
          <small>
            {correction.appProfileName} · {correction.createdAt.slice(0, 10)}
          </small>
          <pre className="correction-body">
            {JSON.stringify(correction.input, null, 2)}
          </pre>
          <small>{t("method.corrections.corrected")}</small>
          <pre className="correction-body">
            {JSON.stringify(correction.correctedOutput, null, 2)}
          </pre>
          {correction.note ? (
            <p className="settings-card-copy">{correction.note}</p>
          ) : null}
          {kept.includes(correction.id) ? (
            <span className="ok-text">{t("method.corrections.kept")} ✓</span>
          ) : (
            <button
              className="secondary-button"
              disabled={busyId === correction.id}
              onClick={() => void keep(correction)}
              type="button"
            >
              {busyId === correction.id
                ? "…"
                : t("method.corrections.keep")}
            </button>
          )}
        </div>
      ))}
      {/* D4f: this sentence used to be written inline here. A statement about
          where data goes belongs in the copy pack, where the audit can see it. */}
      <p className="context-disclaimer">
        {t("method.corrections.locality")}
      </p>
    </section>
  );
}

// D6 (copy pack): what the community currently publishes, for items installed
// from it. Fetched once per screen and best-effort — an unreachable catalogue
// means no notice, never an error in the Owner's face.
function useCommunityVersions(): Map<string, { version: string; description: string }> {
  const [versions, setVersions] = useState<
    Map<string, { version: string; description: string }>
  >(new Map());
  useEffect(() => {
    let active = true;
    void fetchCatalogue()
      .then((index) => {
        if (!active) return;
        const next = new Map<string, { version: string; description: string }>();
        for (const item of [...index.methods, ...index.routines]) {
          next.set(item.id, {
            version: item.version,
            description: item.description,
          });
        }
        setVersions(next);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return versions;
}

// Dotted compare: is `candidate` a later version than `installed`?
function isLaterVersion(candidate: string, installed: string): boolean {
  const a = candidate.split(".").map((part) => Number.parseInt(part, 10));
  const b = installed.split(".").map((part) => Number.parseInt(part, 10));
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const left = a[index] ?? 0;
    const right = b[index] ?? 0;
    if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
    if (left !== right) return left > right;
  }
  return false;
}

// The notice on an installed community item when a newer version exists.
//
// Deliberately NOT an update prompt. Vaenyx has not reviewed the new version
// any more than it reviewed the installed one, so recommending it would be
// vouching for third-party content — the string states availability and stops.
// And nothing updates itself: user-side auto-update is prohibited, because "the
// author can change a repository but cannot reach anyone's machine" is the
// property that keeps a compromised item from becoming a compromised install.
// Content that must reach installed copies goes through takedown (ToS 8.5),
// which the operator controls.
function CommunityUpdateNotice({
  kind,
  id,
  installedVersion,
  latest,
  onUpdated,
}: {
  kind: "method" | "routine";
  id: string;
  installedVersion: string;
  latest: { version: string; description: string } | undefined;
  onUpdated: () => void;
}) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!latest || !isLaterVersion(latest.version, installedVersion)) return null;

  async function update() {
    setBusy(true);
    try {
      if (kind === "method") {
        await installMethodFromCatalogue(id);
      } else {
        await installRoutineFromCatalogue(id);
      }
      setConfirming(false);
      onUpdated();
    } catch {
      // The failed request already raised a toast.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="update-notice">
      <p className="context-disclaimer">
        {t("legal.notice.community.updateAvailable")}
      </p>
      <p className="settings-card-copy">
        {t("community.update.versions")
          .replace("{installed}", `v${installedVersion}`)
          .replace("{latest}", `v${latest.version}`)}
      </p>
      {latest.description ? (
        <p className="settings-card-copy">{latest.description}</p>
      ) : null}
      <button
        className="text-button"
        onClick={() => setConfirming(true)}
        type="button"
      >
        {t("community.update.action")}
      </button>
      {confirming ? (
        <Modal onClose={() => setConfirming(false)} title={t("community.update.action")}>
          {/* An update IS an install of someone else's content, so D2 is shown
              again exactly as it was the first time. */}
          <p className="settings-card-copy">
            {t("legal.disclaimer.community.install")}
          </p>
          <div className="modal-actions">
            <button
              className="text-button"
              onClick={() => setConfirming(false)}
              type="button"
            >
              {t("routine.confirm.cancel")}
            </button>
            <button
              className="primary-button"
              disabled={busy}
              onClick={() => void update()}
              type="button"
            >
              {busy ? "…" : t("community.update.action")}
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function MethodDetail({
  method,
  onBack,
  onChanged,
}: {
  method: LibraryMethod;
  onBack: () => void;
  onChanged: (method: LibraryMethod) => void;
}) {
  const { lang, t } = useI18n();
  const communityVersions = useCommunityVersions();
  const [inputText, setInputText] = useState(() =>
    JSON.stringify(buildInputSkeleton(method.inputSchema), null, 2),
  );
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunMethodResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(method.name);
  const [savingName, setSavingName] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [draftTag, setDraftTag] = useState("");
  const [tagBusy, setTagBusy] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  const [publishState, setPublishState] = useState<PublishState | null>(null);

  useEffect(() => {
    let active = true;
    fetchPublishState()
      .then((next) => {
        if (active) setPublishState(next);
      })
      .catch(() => {
        if (active) setPublishState(null);
      });
    return () => {
      active = false;
    };
  }, []);

  async function saveName() {
    const next = draftName.trim();
    if (!next || next === method.name) {
      setRenaming(false);
      setDraftName(method.name);
      return;
    }
    setRenameError(null);
    setSavingName(true);
    try {
      onChanged(await renameMethod(method.id, next));
      setRenaming(false);
    } catch (nextError) {
      setRenameError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not rename this method.",
      );
    } finally {
      setSavingName(false);
    }
  }

  async function writeTags(tags: string[]) {
    setTagError(null);
    setTagBusy(true);
    try {
      onChanged(await setMethodTags(method.id, tags));
    } catch (nextError) {
      setTagError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not update tags.",
      );
    } finally {
      setTagBusy(false);
    }
  }

  function addTag() {
    const tag = draftTag.trim();
    if (!tag || method.tags.includes(tag)) {
      setDraftTag("");
      return;
    }
    setDraftTag("");
    void writeTags([...method.tags, tag]);
  }

  function removeTag(tag: string) {
    void writeTags(method.tags.filter((value) => value !== tag));
  }

  async function run() {
    setError(null);
    setResult(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(inputText);
    } catch {
      setError("Input must be valid JSON.");
      return;
    }

    setRunning(true);
    try {
      setResult(await testRunMethod(method.id, parsed, lang));
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not run this method.",
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="library-layout">
      <button className="text-button library-back" onClick={onBack} type="button">
        ← All methods
      </button>
      <MethodPublishCard method={method} />
      <section className="settings-card">
        {renaming ? (
          <div className="method-rename">
            <input
              autoFocus
              className="method-rename-input"
              maxLength={120}
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void saveName();
                if (event.key === "Escape") {
                  setRenaming(false);
                  setDraftName(method.name);
                }
              }}
              value={draftName}
            />
            <button
              className="primary-button"
              disabled={savingName}
              onClick={() => void saveName()}
              type="button"
            >
              {savingName ? "Saving..." : "Save"}
            </button>
            <button
              className="text-button"
              onClick={() => {
                setRenaming(false);
                setDraftName(method.name);
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="method-title-row">
            <h2>{method.name}</h2>
            <ProvenanceChip
              origin={method.origin}
              owner={method.owner}
              published={
                publishState?.publishedMethodIds.includes(method.id) ?? false
              }
              version={method.version}
            />
            <button
              className="secondary-button"
              onClick={() => {
                setDraftName(method.name);
                setRenameError(null);
                setRenaming(true);
              }}
              type="button"
            >
              Rename
            </button>
          </div>
        )}
        {renameError ? <p className="form-error">{renameError}</p> : null}
        <p className="settings-card-copy">{method.description}</p>
        {method.origin === "community" ? (
          <CommunityUpdateNotice
            id={method.id}
            installedVersion={method.version}
            kind="method"
            latest={communityVersions.get(method.id)}
            onUpdated={onBack}
          />
        ) : null}
        <MethodCorrections methodId={method.id} />
        {/* L3: the clean direction. A Method is instructions already, so
            nothing is lost and no capability is implied that does not exist. */}
        {CAPABILITIES.skillInterop ? (
          <div className="skill-export">
            <button
              className="secondary-button"
              onClick={() => void downloadMethodAsSkill(method.id)}
              type="button"
            >
              {t("skill.export.action")}
            </button>
            <p className="context-disclaimer">
              {t("legal.notice.skill.export")}
            </p>
          </div>
        ) : null}
        <div className="method-tag-editor">
          <span className="method-picker-label">Tags</span>
          <div className="tag-row">
            {method.tags.length === 0 ? (
              <span className="library-note">No tags yet.</span>
            ) : (
              method.tags.map((tag) => (
                <span className="tag-chip editable" key={tag}>
                  #{tag}
                  <button
                    aria-label={`Remove ${tag}`}
                    className="tag-chip-remove"
                    disabled={tagBusy}
                    onClick={() => removeTag(tag)}
                    type="button"
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
          <div className="method-tag-add">
            <input
              className="method-rename-input"
              disabled={tagBusy}
              maxLength={120}
              onChange={(event) => setDraftTag(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addTag();
                }
              }}
              placeholder="Add a tag"
              value={draftTag}
            />
            <button
              className="secondary-button"
              disabled={tagBusy || !draftTag.trim()}
              onClick={addTag}
              type="button"
            >
              Add
            </button>
          </div>
          {tagError ? <p className="form-error">{tagError}</p> : null}
        </div>
        <dl className="settings-list">
          <div>
            <dt>Version</dt>
            <dd>{method.version}</dd>
          </div>
          <div>
            <dt>Examples</dt>
            <dd>{method.exampleCount}</dd>
          </div>
          <div>
            <dt>Content hash</dt>
            <dd>
              <code className="library-hash">{method.contentHash}</code>
            </dd>
          </div>
        </dl>
      </section>
      <section className="settings-card">
        <p className="eyebrow">Try it</p>
        <h2>Test run</h2>
        <p className="settings-card-copy">
          Runs this method through Vaenyx's model with the input below. Owner-only;
          nothing is saved.
        </p>
        <label className="library-tryit-label">
          Input (JSON)
          <textarea
            className="library-tryit-input"
            onChange={(event) => setInputText(event.target.value)}
            rows={6}
            spellCheck={false}
            value={inputText}
          />
        </label>
        <button
          className="primary-button"
          disabled={running}
          onClick={() => void run()}
          type="button"
        >
          {running ? "Running..." : "Run method"}
        </button>
        {error ? <p className="form-error">{error}</p> : null}
        {result ? (
          <div
            className={`library-result ${result.outputValid ? "valid" : "invalid"}`}
          >
            <strong>
              {result.outputValid
                ? "Output matches the schema"
                : "Output did not match the schema"}
            </strong>
            {/* A Method that declared four capabilities and got three still
                runs — without the fourth. Said here, because a run that never
                looked at the picture and a run that looked and answered badly
                are indistinguishable on the output alone. */}
            {result.capabilityRefusals?.map((refusal) => (
              <p className="library-note" key={refusal.capability}>
                {refusal.message}
              </p>
            ))}
            <pre className="library-result-json">
              {result.output === null
                ? "(no JSON output)"
                : JSON.stringify(result.output, null, 2)}
            </pre>
            <details className="advanced-details">
              <summary>Raw model output</summary>
              <pre className="library-result-json">{result.raw}</pre>
            </details>
          </div>
        ) : null}
      </section>
      <section className="settings-card">
        <p className="eyebrow">Recipe</p>
        <h2>How it works</h2>
        <pre className="library-recipe">{method.recipe}</pre>
      </section>
      <section className="settings-card">
        <p className="eyebrow">Input</p>
        <h2>What it takes</h2>
        <MethodFieldTable schema={method.inputSchema} />
      </section>
      <section className="settings-card">
        <p className="eyebrow">Output</p>
        <h2>What it returns</h2>
        <MethodFieldTable schema={method.outputSchema} />
      </section>
      <section className="settings-card">
        <p className="eyebrow">Manifest</p>
        <h2>Permissions &amp; learning</h2>
        <MethodManifest manifest={method.manifest} />
      </section>
    </div>
  );
}

// The Library: a shelf of Methods (and, later, imported Skills). The list is
// progressive-disclosure (summaries); opening one loads the full method and
// offers an owner-only test run.
// Skills sub-view: imported capability packs (SKILL.md / MCP / Hermes converted
// to Vaenyx's format). Import is a later phase; built-in skills show now.
function SkillsLibrary({ skills }: { skills: Workspace["skills"] }) {
  return (
    <div className="library-layout">
      <section className="library-intro">
        <p className="eyebrow">Skills</p>
        <h2>Skills</h2>
        <p>
          Skills are lightweight capability packs. Importing external skills
          (SKILL.md / MCP / Hermes) and converting them to Vaenyx's format is
          coming; the built-in skills available now are listed below.
        </p>
      </section>
      {skills.length === 0 ? (
        <div className="empty-state">
          <strong>No skills yet</strong>
          <p>Imported skills will appear here.</p>
        </div>
      ) : (
        <div className="library-list">
          {skills.map((skill) => (
            <div className="library-card library-card-static" key={skill.id}>
              <div className="library-card-head">
                <strong>{skill.name}</strong>
                <span className="library-chip">built-in</span>
              </div>
              <p>{skill.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Routines tab: the user-facing products. Browse, open one, feed it (a Journal
// entry), run its flow, and revisit its Gallery (results) + Journal (inputs).
// Create a Routine from plain language (③ slice 2): describe → Vaenyx plans the
// steps (reusing installed Methods or drafting new ones) → Owner reviews the plan
// → save (creates the new Methods + the Routine). The Owner only describes; the
// plan is reviewable before anything is written.
function CreateRoutinePanel({
  onRoutinesRefresh,
  onDone,
}: {
  onRoutinesRefresh: () => void;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<"describe" | "review">("describe");
  // Consume a chat create-offer: pre-fill the description and clear the intent.
  const [description, setDescription] = useState(() => {
    const intent = peekCreateIntent();
    if (intent?.kind === "routine") {
      localStorage.removeItem(CREATE_INTENT);
      return intent.description;
    }
    return "";
  });
  const [planning, setPlanning] = useState(false);
  const [plan, setPlan] = useState<RoutinePlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runPlan() {
    if (!description.trim()) return;
    setError(null);
    setPlanning(true);
    try {
      setPlan(await planRoutine(description));
      setPhase("review");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not plan this routine.",
      );
    } finally {
      setPlanning(false);
    }
  }

  function patchStepMethod(index: number, patch: Partial<MethodDraft>) {
    setPlan((current) => {
      if (!current) return current;
      const steps = current.steps.map((step, i) =>
        i === index && step.method
          ? { ...step, method: { ...step.method, ...patch } }
          : step,
      );
      return { ...current, steps };
    });
  }

  async function save() {
    if (!plan) return;
    if (!plan.name.trim() || plan.steps.length === 0) {
      setError("A name and at least one step are required.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await createRoutine(plan);
      onRoutinesRefresh();
      onDone();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not save this routine.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="library-layout">
      <button className="text-button library-back" onClick={onDone} type="button">
        ← All routines
      </button>
      {phase === "describe" || !plan ? (
        <section className="settings-card">
          <p className="eyebrow">New routine</p>
          <h2>Describe what you want</h2>
          <p className="settings-card-copy">
            Say in plain language what you want to do, step by step. Vaenyx plans it
            — reusing methods you have and drafting any that are missing — and shows
            you the plan before anything is saved.
          </p>
          <textarea
            className="library-tryit-input"
            onChange={(event) => setDescription(event.target.value)}
            placeholder="e.g. Take a photo of a receipt, pull out what I spent, and keep a running monthly total I can ask about."
            rows={5}
            value={description}
          />
          {error ? <p className="form-error">{error}</p> : null}
          <button
            className="primary-button"
            disabled={planning || !description.trim()}
            onClick={() => void runPlan()}
            type="button"
          >
            {planning ? "Planning…" : "Plan with Vaenyx"}
          </button>
        </section>
      ) : (
        <>
          <section className="settings-card">
            <p className="eyebrow">Review plan</p>
            <h2>Edit &amp; save</h2>
            <label className="library-tryit-label">
              Routine name
              <input
                className="method-rename-input"
                maxLength={120}
                onChange={(event) =>
                  setPlan({ ...plan, name: event.target.value })
                }
                value={plan.name}
              />
            </label>
            <div className="lang-toggle">
              <button
                className={`lang-toggle-option ${plan.mode === "accumulate" ? "active" : ""}`}
                onClick={() => setPlan({ ...plan, mode: "accumulate" })}
                type="button"
              >
                Accumulate
              </button>
              <button
                className={`lang-toggle-option ${plan.mode === "one-shot" ? "active" : ""}`}
                onClick={() => setPlan({ ...plan, mode: "one-shot" })}
                type="button"
              >
                One-shot
              </button>
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            <button
              className="primary-button"
              disabled={saving}
              onClick={() => void save()}
              type="button"
            >
              {saving ? "Saving…" : "Save routine"}
            </button>
          </section>

          {plan.steps.map((step, index) => (
            <section className="settings-card" key={index}>
              <p className="eyebrow">
                Step {index + 1} ·{" "}
                {step.reuse ? "reuse a method" : "new method"}
              </p>
              <h2>{step.title}</h2>
              {step.reuse ? (
                <p className="settings-card-copy">
                  Reuses your existing method <code>{step.reuse}</code>.
                </p>
              ) : step.method ? (
                <>
                  <label className="library-tryit-label">
                    New method name
                    <input
                      className="method-rename-input"
                      maxLength={120}
                      onChange={(event) =>
                        patchStepMethod(index, { name: event.target.value })
                      }
                      value={step.method.name}
                    />
                  </label>
                  <label className="library-tryit-label">
                    Recipe
                    <textarea
                      className="library-tryit-input"
                      onChange={(event) =>
                        patchStepMethod(index, { recipe: event.target.value })
                      }
                      rows={6}
                      spellCheck={false}
                      value={step.method.recipe}
                    />
                  </label>
                </>
              ) : null}
            </section>
          ))}
        </>
      )}
    </div>
  );
}

// Domain of a Method/Routine from its tags, for the B-class context disclaimers
// (health is highest-risk). Tags are free-form hashtags; match by substring.
// Mirrors i18n `legal.copyVersion` (copy pack clause 6.4). This is the EDITORIAL
// version: it changes whenever any string changes, and it is what gets recorded
// against an acknowledgement, so a record always says exactly which text the
// Owner was shown.
// 2.9 = K3 gains the "How they go" sentence (2026-07-27): 2.8's K3 never said
// corrections go out ON THEIR OWN after the wait, so a person could read it as
// "Vaenyx asks me each time" — and a consent read that way cannot carry
// mode=automatic. This IS a material change to an existing consent string, so
// the floor moves with it (K3_CONSENT_FLOOR below, and the publish service's
// MIN_ACCEPTED_COPY_VERSION): anyone who consented under 2.8 is asked again.
// Cheap now, precisely because almost nobody has answered yet.
// 2.9 → 3.0, skipping 2.10 on purpose (private, 2026-07-29): a version
// compared as a decimal would read "2.10" as 2.1 and place it BELOW 2.9. The
// comparisons are dotted-numeric now, but the pack keeps the safe numbering.
// 3.0 → 3.1 (2026-08-01): the pack gains Part N — the two capability explainers
// (N1 web, N2 fetching), the waiting-list consent (N3), the one degradation
// wording (N4) and the cost note (N5). All ADDITIONS; no existing string
// changed, and the one new consent string has nobody's answer recorded against
// it yet, so LEGAL_CONSENT_FLOOR stays where it is and nobody is re-asked.
const LEGAL_COPY_VERSION = "3.1";

// The K3 activation floor: a recorded activation below this is treated as not
// given — re-opening sharing walks through K3 again instead of silently
// re-enabling. Consent goes stale when the THING CONSENTED TO changed, and
// that is what this constant tracks (private, 2026-07-27).
const K3_CONSENT_FLOOR = "2.9";

// The consent floor, and the only thing that re-asks the Owner (Oskar, 2026-07-25).
// It moves ONLY when a consent-class string (`legal.consent.*`) changes in
// substance. Fixing a typo, adding a notice or rewording an explanation bumps
// LEGAL_COPY_VERSION and nobody is interrupted; asking again for something the
// Owner has already agreed to is how consent turns into a reflex click.
// Acknowledgements count while they are at or above this floor.
const LEGAL_CONSENT_FLOOR = "2.6";

// Fail-closed dotted compare: an unparseable recorded version never satisfies
// the floor. Mirrors the publish service's copyVersionAtLeast.
function legalVersionAtLeast(version: string, floor: string): boolean {
  const left = version.trim().split(".");
  const right = floor.trim().split(".");
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const a = Number.parseInt(left[index] ?? "0", 10);
    const b = Number.parseInt(right[index] ?? "0", 10);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    if (a !== b) return a > b;
  }
  return true;
}

// Sign-in page model buttons: the chosen provider id is parked here, then the
// workspace opens Settings → Models and highlights that provider's connect
// card (cleared once the card is shown). The buttons are shortcuts, not
// logins — API-key providers have no third-party OAuth for local apps.
const CONNECT_MODEL_INTENT = "vaenyx-connect-model";

// Chat → Library creation hand-off: the offer card under a create-* reply
// parks what to build here; the Library consumes it (picks the tab, opens the
// create panel, pre-fills the description) and clears it.
const CREATE_INTENT = "vaenyx-create-intent";

function peekCreateIntent(): {
  kind: "method" | "routine";
  description: string;
} | null {
  try {
    const raw = localStorage.getItem(CREATE_INTENT);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { kind?: unknown; description?: unknown };
    if (
      (parsed.kind === "method" || parsed.kind === "routine") &&
      typeof parsed.description === "string"
    ) {
      return { kind: parsed.kind, description: parsed.description };
    }
  } catch {
    // Unreadable intent: treat as absent.
  }
  return null;
}

// The sign-in page's quick-connect row and the Models panel's "get a key"
// links share this list. Codex is the ChatGPT login; `local` needs no key.
const CONNECTABLE_MODELS: Array<{
  id: string;
  label: string;
  keyUrl: string | null;
}> = [
  { id: "codex", label: "ChatGPT (Codex)", keyUrl: null },
  {
    id: "openai",
    label: "OpenAI",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "anthropic",
    label: "Claude",
    keyUrl: "https://console.anthropic.com/settings/keys",
  },
  { id: "gemini", label: "Gemini", keyUrl: "https://aistudio.google.com/apikey" },
  { id: "grok", label: "Grok", keyUrl: "https://console.x.ai" },
  { id: "groq", label: "Groq", keyUrl: "https://console.groq.com/keys" },
  {
    id: "cerebras",
    label: "Cerebras",
    keyUrl: "https://cloud.cerebras.ai",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    keyUrl: "https://openrouter.ai/settings/keys",
  },
  {
    id: "zhipu",
    label: "Zhipu BigModel",
    keyUrl: "https://open.bigmodel.cn/usercenter/apikeys",
  },
  {
    id: "mistral",
    label: "Mistral",
    keyUrl: "https://console.mistral.ai/api-keys",
  },
  {
    id: "workersai",
    label: "Workers AI",
    keyUrl: "https://dash.cloudflare.com/profile/api-tokens",
  },
  { id: "local", label: "Local", keyUrl: null },
];

// Free-tier notes shown on the connect form (researched 2026-07-22). Free
// almost always means the provider may use your data under its own terms —
// the standard third-party notice still gates every connect.
const MODEL_FREE_TIER_NOTES: Record<string, string> = {
  // (claude-sub has no entry here: its connect card is the one-click guided
  // sign-in, and its usage is the Owner's own plan, never a free tier.
  // Wording rule 2026-07-29: no quota numbers for the Claude plan, anywhere.)
  gemini: "Free tier: ~1,500 requests/day via Google AI Studio, no card needed.",
  groq: "Free tier: ~1,000 requests/day, very fast responses. No card needed.",
  cerebras: "Free tier: ~1M tokens/day, fastest responses. No card needed.",
  openrouter:
    "Free tier: one key unlocks 30+ free community models (rate-limited). Pick a model id ending in :free.",
  zhipu:
    "GLM Flash models are free (rate allocated per account). Strong Chinese; image/PDF understanding.",
  mistral:
    "Free tier requires OPTING IN to your data being used for training — read the terms before connecting. The paid tier keeps data private.",
  // Workers AI has its own connect form (token + account id), so this entry is
  // only read for the "— Free Tier" mark beside its name in the Add a Model
  // list; the form prints its own bilingual version of this line.
  workersai: "Free: 10,000 Neurons/day — about 170 pictures.",
};

// Backends whose chat endpoint reads images directly (Phase B) — must mirror
// the server's VISION_DIRECT_PROVIDER_IDS.
const VISION_DIRECT_IDS = [
  "gemini",
  "zhipu",
  "openai",
  "codex",
  "anthropic",
  "claude-sub",
];

// Per-provider model shortlists for the in-chat picker (curated 2026-07-22;
// the provider's own configured model always remains the Default option, and
// Settings → Models → Edit accepts any model id these lists miss).
const MODEL_CHOICES: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "o4-mini"],
  anthropic: ["claude-sonnet-5", "claude-opus-4-8", "claude-haiku-4-5"],
  gemini: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
  grok: ["grok-4", "grok-3-mini"],
  groq: [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "openai/gpt-oss-120b",
  ],
  cerebras: ["llama-3.3-70b", "llama3.1-8b", "qwen-3-32b"],
  openrouter: [
    "deepseek/deepseek-chat-v3-0324:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "qwen/qwen3-235b-a22b:free",
  ],
  zhipu: ["glm-4.7-flash", "glm-4.6v-flash", "glm-4-flash"],
  mistral: ["mistral-small-latest", "mistral-medium-latest"],
  workersai: [
    "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    "@cf/qwen/qwen2.5-coder-32b-instruct",
  ],
};

function routineDomain(
  tags: string[],
): "health" | "finance" | "legal" | null {
  const lower = tags.map((tag) => tag.toLowerCase());
  const has = (...needles: string[]) =>
    lower.some((tag) => needles.some((needle) => tag.includes(needle)));
  // Health is the single highest-risk domain: the flagger is deliberately biased
  // to over-trigger (false positives are cheap; a missed flag silently defeats
  // the C1 banner and C2 gate), with a keyword union spanning medication, dosage
  // and treatment terms (copy pack Part C standing position).
  if (
    has(
      "health",
      "medic",
      "doctor",
      "diagnos",
      "dose",
      "dosage",
      "prescri",
      "treat",
      "symptom",
      "pill",
      "tablet",
      "drug",
      "pharmac",
      "therap",
      "vaccin",
      "clinic",
      "hospital",
      "illness",
      "disease",
      "patient",
    )
  )
    return "health";
  if (has("financ", "tax", "invoice", "budget", "accounting"))
    return "finance";
  if (has("legal", "lawyer", "contract", "lease")) return "legal";
  return null;
}

// Pre-filter for the AI intent classifier: only classify when the message hints
// at a routine/task job, or follows a Vaenyx offer (the Owner may be saying yes).
// Keeps ordinary Q&A fast — most plain messages never reach the model call.
// Does the message share a real token with some installed Routine's name, tags
// or description? A cheap local check so everyday chatter never reaches the
// (blocking, serialized) model classify. CJK has no word boundaries, so a CJK
// run is matched on any 2-char shingle; latin tokens must be >= 3 chars.
// Plain-language rendering of a schedule the classifier extracted, for the
// confirmation note in chat ("every day at 07:00"). Separate from
// describeSchedule (which renders a saved Task's own fields, English-only).
function describeIntentSchedule(
  schedule: {
    cadence: "hourly" | "daily" | "weekly" | "monthly";
    time: string | null;
    dayOfWeek: number | null;
    dayOfMonth: number | null;
  },
  lang: "zh" | "en",
): string {
  const time = schedule.time ?? "07:00";
  const zhDays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const enDays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  if (lang === "zh") {
    if (schedule.cadence === "hourly") return "每小时";
    if (schedule.cadence === "daily") return `每天 ${time}`;
    if (schedule.cadence === "weekly") {
      return `每${zhDays[schedule.dayOfWeek ?? 1]} ${time}`;
    }
    return `每月 ${schedule.dayOfMonth ?? 1} 号 ${time}`;
  }
  if (schedule.cadence === "hourly") return "every hour";
  if (schedule.cadence === "daily") return `every day at ${time}`;
  if (schedule.cadence === "weekly") {
    return `every ${enDays[schedule.dayOfWeek ?? 1]} at ${time}`;
  }
  return `on day ${schedule.dayOfMonth ?? 1} of each month at ${time}`;
}

function messageMentionsRoutine(
  content: string,
  routines: LibraryRoutineSummary[],
): boolean {
  const haystack = content.toLowerCase();
  for (const routine of routines) {
    const text = [routine.name, ...routine.tags, routine.description]
      .join(" ")
      .toLowerCase();
    for (const token of text.split(/[^\p{L}\p{N}]+/u)) {
      if (!token) continue;
      if (/[一-鿿]/.test(token)) {
        for (let i = 0; i + 2 <= token.length; i += 1) {
          if (haystack.includes(token.slice(i, i + 2))) return true;
        }
      } else if (token.length >= 3 && haystack.includes(token)) {
        return true;
      }
    }
  }
  return false;
}

function messageIsCreationAsk(content: string): boolean {
  return (
    /(建|新建|创建|創建|做一?个|做一?個|帮我做|幫我做|create|build|make)/i.test(
      content,
    ) && /(method|routine|方法|流程|工具)/i.test(content)
  );
}

function messageMaybeIntent(
  content: string,
  messages: AskVaenyxMessage[],
  routines: LibraryRoutineSummary[],
): boolean {
  const lastAssistant = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");
  // An offer just made ("want me to…") must always classify — a bare "yes/ok"
  // accept carries no keyword of its own.
  if (lastAssistant && /(want me to|要不要|要我)/i.test(lastAssistant.content)) {
    return true;
  }
  // A creation ask classifies WITHOUT needing overlap with installed Routines —
  // the whole point is to build something that does not exist yet.
  if (messageIsCreationAsk(content)) {
    return true;
  }
  // A clarify round in flight (spec §2a phase 2): Vaenyx just asked a question
  // and a recent Owner message was a creation ask — the answer must classify
  // even though it usually carries no keyword of its own ("PDF 发票,输出 Excel").
  if (
    lastAssistant &&
    /[??]/.test(lastAssistant.content) &&
    messages
      .slice(-6)
      .some(
        (message) =>
          message.role === "owner" && messageIsCreationAsk(message.content),
      )
  ) {
    return true;
  }
  // A recurring ask ("every morning at 7", 每天早上七点) is a scheduled-task
  // intent by itself — it describes something that does not exist yet, so it
  // must classify without needing to match an installed Routine.
  if (
    /(每天|每日|每周|每週|每月|每小时|每小時|天天|定时|定時|每.{0,3}早上|每.{0,3}晚上|every ?(day|morning|week|month|hour)|daily|weekly|monthly|hourly)/i.test(
      content,
    )
  ) {
    return true;
  }
  // Strong-intent keywords only (dropped broad everyday words — help me / record
  // / report / track / monitor — that fire on ordinary chat).
  if (
    !/(要不要|整理|汇总|彙整|研究|每天|每周|每月|定时|定時|提醒|summari[sz]e|research|every ?day|every ?week|every ?month|daily|weekly|monthly|schedule|remind|digest|tidy|organi[sz]e)/i.test(
      content,
    )
  ) {
    return false;
  }
  // Keyword matched: only spend the model call if the message actually overlaps
  // an installed Routine. Worst case this misses (open the Routine manually);
  // it can never wrongly hijack a plain chat.
  return messageMentionsRoutine(content, routines);
}

// Declarative View (Library v2 ④): validate a routine.json `view` slot at
// render time. Anything that doesn't parse — wrong shape, unknown renderers,
// older format — yields null and the automatic view ("A") takes over, so a bad
// view can never break rendering.
function parseRoutineView(raw: unknown): RoutineView | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const fieldsRaw = (raw as Record<string, unknown>).fields;
  if (!Array.isArray(fieldsRaw)) return null;
  const fields: RoutineViewField[] = [];
  for (const entry of fieldsRaw) {
    if (entry === null || typeof entry !== "object") continue;
    const candidate = entry as Record<string, unknown>;
    if (typeof candidate.key !== "string" || candidate.key === "") continue;
    if (
      candidate.as !== "title" &&
      candidate.as !== "text" &&
      candidate.as !== "bullets" &&
      candidate.as !== "table" &&
      candidate.as !== "amount" &&
      candidate.as !== "note"
    ) {
      continue;
    }
    fields.push({
      key: candidate.key,
      as: candidate.as,
      ...(typeof candidate.label === "string"
        ? { label: candidate.label }
        : {}),
    });
  }
  return fields.length > 0 ? { fields } : null;
}

// Render a Routine result (a Gallery item's structured output). With a declared
// View ("B") the fields render in the author's order and style; otherwise the
// generic "house template" ("A"): a title if one is present, then bullet lists
// and field:value rows. The SAME component renders results in the chat timeline
// and in the Gallery panel — one place to define, two to reuse.
function RoutineResultView({
  output,
  view,
}: {
  output: unknown;
  view?: unknown;
}) {
  if (output === null || output === undefined) {
    return <p className="settings-card-copy">No result.</p>;
  }
  if (typeof output !== "object") {
    return <p>{String(output)}</p>;
  }
  const record = output as Record<string, unknown>;

  const declared = parseRoutineView(view);
  if (declared) {
    return (
      <div className="routine-result">
        {declared.fields.map((field) => {
          const value = record[field.key];
          if (value === null || value === undefined) return null;
          if (field.as === "title") {
            return (
              <strong className="routine-result-title" key={field.key}>
                {String(value)}
              </strong>
            );
          }
          if (field.as === "bullets") {
            const items = Array.isArray(value) ? value : [value];
            return (
              <div className="routine-result-field" key={field.key}>
                <ul>
                  {items.map((item, index) => (
                    <li key={`${field.key}-${index}`}>
                      {typeof item === "object"
                        ? JSON.stringify(item)
                        : String(item)}
                    </li>
                  ))}
                </ul>
              </div>
            );
          }
          if (field.as === "table") {
            const rows = (Array.isArray(value) ? value : []).filter(
              (row): row is Record<string, unknown> =>
                row !== null && typeof row === "object" && !Array.isArray(row),
            );
            if (rows.length === 0) return null;
            const firstRow = rows[0] as Record<string, unknown>;
            const columns = Object.keys(firstRow);
            return (
              <div className="routine-result-field" key={field.key}>
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                  <thead>
                    <tr>
                      {columns.map((column) => (
                        <th
                          key={column}
                          style={{
                            textAlign: "left",
                            padding: "4px 8px",
                            opacity: 0.7,
                          }}
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={`${field.key}-${index}`}>
                        {columns.map((column) => (
                          <td
                            key={column}
                            style={{ padding: "4px 8px", verticalAlign: "top" }}
                          >
                            {typeof row[column] === "object"
                              ? JSON.stringify(row[column])
                              : String(row[column] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
          if (field.as === "amount") {
            const n = Number(value);
            if (!Number.isFinite(n)) return null;
            // Currency-neutral: "$" serves AU and US alike; no locale currency.
            return (
              <div className="routine-result-amount" key={field.key}>
                <span className="routine-result-amount-value">
                  ${n.toLocaleString()}
                </span>
                {field.label ? (
                  <span className="routine-result-amount-label">
                    {field.label}
                  </span>
                ) : null}
              </div>
            );
          }
          if (field.as === "note") {
            const note = String(value).trim();
            if (note === "") return null;
            return (
              <div className="routine-result-note" key={field.key}>
                {field.label ? (
                  <span className="routine-result-note-label">
                    {field.label}
                  </span>
                ) : null}
                <p>{note}</p>
              </div>
            );
          }
          // "text": a labelled line.
          return (
            <div className="routine-result-field" key={field.key}>
              <p>
                <span className="routine-result-key">
                  {field.label ?? field.key}:{" "}
                </span>
                {String(value)}
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  const entries = Object.entries(record);
  const titleEntry = entries.find(
    ([key, value]) =>
      typeof value === "string" && /title|name|summary|heading/i.test(key),
  );
  const rest = entries.filter(([key]) => key !== titleEntry?.[0]);
  return (
    <div className="routine-result">
      {titleEntry ? (
        <strong className="routine-result-title">
          {titleEntry[1] as string}
        </strong>
      ) : null}
      {rest.map(([key, value]) => (
        <div className="routine-result-field" key={key}>
          {Array.isArray(value) ? (
            <ul>
              {value.map((item, index) => (
                <li key={`${key}-${index}`}>
                  {typeof item === "object"
                    ? JSON.stringify(item)
                    : String(item)}
                </li>
              ))}
            </ul>
          ) : value !== null && typeof value === "object" ? (
            <pre>{JSON.stringify(value, null, 2)}</pre>
          ) : (
            <p>
              <span className="routine-result-key">{key}: </span>
              {String(value)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// What the family fed into the Journal, as a line for a chat bubble. A single
// string field (e.g. {text: "..."}) shows its value; a flat multi-field object
// (a confirmed friendly input) reads as "key: value · key: value"; anything
// deeper falls back to compact JSON.
// The spoken form of a routine result: title + the first bullets field, short
// phrases for the ear — never the raw structured text with its punctuation
// ("念出来就是念上面的文字…尽量总结", Oskar 2026-07-28).
function spokenResultText(output: unknown, view?: unknown): string {
  if (output === null || typeof output !== "object") return "";
  const record = output as Record<string, unknown>;
  const declared = parseRoutineView(view);
  const parts: string[] = [];
  if (declared) {
    const titleKey = declared.fields.find((field) => field.as === "title")?.key;
    const bulletsKey = declared.fields.find(
      (field) => field.as === "bullets",
    )?.key;
    const title = titleKey ? record[titleKey] : undefined;
    if (typeof title === "string" && title.trim()) parts.push(title.trim());
    const bullets = bulletsKey ? record[bulletsKey] : undefined;
    if (Array.isArray(bullets) && bullets.length > 0) {
      parts.push(
        bullets
          .slice(0, 4)
          .map((item) => String(item))
          .join(", "),
      );
    }
  }
  if (parts.length === 0) {
    for (const value of Object.values(record)) {
      if (typeof value === "string" && value.trim()) {
        parts.push(value.trim());
        if (parts.length >= 2) break;
      }
    }
  }
  return parts.join(". ").slice(0, 400);
}

function journalText(content: unknown): string {
  if (typeof content === "string") return content;
  if (content !== null && typeof content === "object" && !Array.isArray(content)) {
    const entries = Object.entries(content as Record<string, unknown>);
    const strings = entries.filter(([, value]) => typeof value === "string");
    if (strings.length === 1 && entries.length === 1) {
      return strings[0]?.[1] as string;
    }
    if (
      entries.length > 0 &&
      entries.every(
        ([, value]) =>
          value === null || ["string", "number", "boolean"].includes(typeof value),
      )
    ) {
      return entries
        .map(([key, value]) => `${key}: ${String(value ?? "")}`)
        .join(" · ");
    }
    return JSON.stringify(content);
  }
  return String(content ?? "");
}

// C1a trigger: does this scheduled task look like a medication reminder? Biased
// to over-trigger (copy pack Part C: a missed flag silently defeats the single
// highest-risk protection; false positives are cheap).
function looksLikeMedicationTask(title: string): boolean {
  const lower = title.toLowerCase();
  return (
    [
      "medic",
      "pill",
      "tablet",
      "dose",
      "dosage",
      "prescri",
      "drug",
      "insulin",
      "vitamin",
      "supplement",
      "meds",
    ].some((needle) => lower.includes(needle)) ||
    /药|服药|吃药|用药|胰岛素|维生素/.test(title)
  );
}

// The Scheduled center: every Scheduled task in one place — what it's called,
// when it runs, and on/off — so the Owner finds and manages them at a glance.
function ScheduledPanel({
  tasks,
  onOpenTask,
  onTurnOff,
}: {
  tasks: Task[];
  onOpenTask: (taskId: string) => void;
  onTurnOff: (taskId: string) => void;
}) {
  const { t } = useI18n();
  const scheduled = tasks.filter(
    (task) => task.scheduleEnabled && task.scheduleCadence,
  );
  return (
    <div className="library-area">
      <section className="library-intro">
        <div className="library-intro-head">
          <div>
            <p className="eyebrow">Scheduled</p>
            <h2>Scheduled tasks</h2>
          </div>
        </div>
        <p>Tasks Vaenyx runs for you automatically.</p>
      </section>
      {scheduled.length === 0 ? (
        <div className="empty-state">
          <strong>Nothing scheduled</strong>
          <p>Give a task a schedule and it shows up here.</p>
        </div>
      ) : (
        <div className="scheduled-list">
          {scheduled.map((task) => (
            <div className="scheduled-card" key={task.id}>
              <div className="scheduled-card-head">
                <strong>{task.title}</strong>
                <span className="schedule-pill on">On</span>
              </div>
              <div className="schedule-row">
                <span className="label">Runs</span>
                <span>{describeSchedule(task)}</span>
              </div>
              {task.nextRunAt ? (
                <div className="schedule-row">
                  <span className="label">Next</span>
                  <span>{formatTime(task.nextRunAt)}</span>
                </div>
              ) : null}
              {looksLikeMedicationTask(task.title) ? (
                <>
                  <p className="context-disclaimer">
                    {t("legal.disclaimer.health.banner")}
                  </p>
                  <p className="context-disclaimer">
                    {t("legal.disclaimer.health.reminderReliability")}
                  </p>
                </>
              ) : null}
              <div className="scheduled-actions">
                <button
                  className="text-button"
                  onClick={() => onOpenTask(task.id)}
                  type="button"
                >
                  Open
                </button>
                <button
                  className="text-button"
                  onClick={() => onTurnOff(task.id)}
                  type="button"
                >
                  Turn off
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Browse the community catalogue (④): the app reads a single index from our
// server (which proxies Cloudflare), searches it locally, and installs one
// Routine — plus any Methods it needs — onto this machine on demand.
// The Community tab's identity strip: signed out -> sign in to publish; signed
// in -> see and edit your public nickname. This is the one findable home for the
// community login + nickname (lifted out of the per-Method publish card).
// Browsing and installing work without an account, so it hides itself when
// publishing isn't configured on this server.
function CommunityIdentityBar() {
  const { t } = useI18n();
  const [state, setState] = useState<PublishState | null>(null);

  useEffect(() => {
    let active = true;
    fetchPublishState()
      .then((next) => {
        if (active) setState(next);
      })
      .catch(() => {
        if (active) setState(null);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!state || !state.configured) return null;

  return (
    <section className="settings-card">
      <p className="eyebrow">{t("library.tierCommunity")}</p>
      {!state.signedInAs ? (
        <>
          <p className="settings-card-copy">
            Sign in to publish your own Methods and Routines to the Community.
          </p>
          <PublishSignIn state={state} />
        </>
      ) : (
        <>
          <PublishNicknameEditor
            signedInAs={state.signedInAs}
            autoOpen={
              state.mode === "service" &&
              new URLSearchParams(window.location.search).get("publish") ===
                "linked"
            }
            onSaved={() => {
              void fetchPublishState().then(setState);
            }}
          />
          <button
            className="text-button"
            onClick={() => {
              void disconnectPublishService()
                .then(() => fetchPublishState())
                .then(setState)
                .catch(() => {});
            }}
            style={{ alignSelf: "flex-start", fontSize: "var(--fs-sm)" }}
            type="button"
          >
            Sign out
          </button>
        </>
      )}
    </section>
  );
}

// Community — the shared catalogue, a top-level peer of the Library. Same
// look-and-feel as the Library (intro + subtabs + cards); the intro's first
// paragraph states the Community-vs-Library difference.
function CommunityArea({
  methods,
  routines,
  onMethodsRefresh,
  onRoutinesRefresh,
}: {
  methods: LibraryMethodSummary[];
  routines: LibraryRoutineSummary[];
  onMethodsRefresh: () => void;
  onRoutinesRefresh: () => void;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"routines" | "methods" | "account">(
    "routines",
  );
  return (
    <div className="library-area">
      {/* Same skeleton as Library (Oskar, 2026-07-27): one line saying what
          this place is, then straight to the tabs, then search and the list.
          Discord moved to its own screen. */}
      <section className="library-intro community-intro">
        <p>{t("community.intro")}</p>
        <p className="context-disclaimer">
          {t("legal.disclaimer.community.browse")}
        </p>
      </section>
      <nav aria-label="Community sections" className="library-subtabs">
        <button
          className={tab === "routines" ? "active" : ""}
          onClick={() => setTab("routines")}
          type="button"
        >
          Routines
        </button>
        <button
          className={tab === "methods" ? "active" : ""}
          onClick={() => setTab("methods")}
          type="button"
        >
          Methods
        </button>
        <button
          className={tab === "account" ? "active" : ""}
          onClick={() => setTab("account")}
          type="button"
        >
          Account
        </button>
      </nav>
      {tab === "account" ? (
        <CommunityIdentityBar />
      ) : (
        <CataloguePanel
          installedIds={[
            ...methods.map((method) => method.id),
            ...routines.map((routine) => routine.id),
          ]}
          kind={tab}
          onMethodsRefresh={onMethodsRefresh}
          onRoutinesRefresh={onRoutinesRefresh}
        />
      )}
    </div>
  );
}

// D4 (copy pack): the report channel has to be reachable from every community
// item, or the takedown discipline in the Terms has nothing to trigger it from
// inside the app. On-demand: the notice travels with this control.
// D4a: the fixed report categories. English tokens on purpose — they go into
// the subject line, which is what makes an inbox of reports sortable, so they
// must not change with the reader's language.
const REPORT_CATEGORIES = [
  "defamation",
  "privacy",
  "copyright",
  "illegal",
  "safety",
  "other",
] as const;

type ReportCategory = (typeof REPORT_CATEGORIES)[number];

// D4a body template, verbatim, in the language the person is reading. The
// identifier and category are pre-filled; everything else the reporter writes.
function reportBody(
  lang: Lang,
  itemId: string,
  category: ReportCategory,
): string {
  const lines =
    lang === "zh"
      ? [
          `条目标识: ${itemId}`,
          `类别: ${category}`,
          "被投诉的具体内容(哪一句、哪一段):",
          "为什么认为有问题:",
          "你的姓名:",
          "你的联系方式:",
          "你与该内容的关系(可选):",
        ]
      : [
          `Item identifier: ${itemId}`,
          `Category: ${category}`,
          "The specific content complained of (which sentence or section):",
          "Why you say it is a problem:",
          "Your name:",
          "Your contact details:",
          "Your connection to the content (optional):",
        ];
  return lines.join("\n");
}

function CommunityReportLink({
  kind,
  id,
  name,
}: {
  kind: "routine" | "method";
  id: string;
  name: string;
}) {
  const { lang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ReportCategory | "">("");
  const label =
    kind === "routine"
      ? t("community.report.routine")
      : t("community.report.method");

  // D4a: "[VAENYX-REPORT] <category> — <item identifier>". The item ID, not the
  // display name, because that is what identifies the item in the warehouse —
  // and no reporter name, because subject lines show in notification previews.
  const subject = category
    ? `[VAENYX-REPORT] ${category} — ${id}`
    : `[VAENYX-REPORT] other — ${id}`;
  const mailto = `mailto:hello@vaenyx.ai?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(reportBody(lang, id, category || "other"))}`;

  return (
    <>
      <button className="text-button" onClick={() => setOpen(true)} type="button">
        {label}
      </button>
      {open ? (
        <Modal onClose={() => setOpen(false)} title={`${label} — ${name}`}>
          <p className="settings-card-copy">
            {t("legal.notice.community.report")}
          </p>
          <label className="report-category">
            <span className="eyebrow">{t("community.report.category")}</span>
            <select
              onChange={(event) =>
                setCategory(event.target.value as ReportCategory | "")
              }
              value={category}
            >
              <option value="">{t("community.report.categoryPrompt")}</option>
              {REPORT_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {t(`community.report.category.${value}`)}
                </option>
              ))}
            </select>
          </label>
          {/* No "your email" field: the mail client puts the sender in the From
              header already, and a redundant field is one more reason not to
              finish (D4a). */}
          <div className="modal-actions">
            <button
              className="text-button"
              onClick={() => setOpen(false)}
              type="button"
            >
              {t("routine.confirm.cancel")}
            </button>
            <a
              aria-disabled={category === ""}
              className="primary-button"
              href={category === "" ? undefined : mailto}
              onClick={() => {
                if (category !== "") setOpen(false);
              }}
            >
              {t("community.report.email")}
            </a>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

function CataloguePanel({
  kind,
  installedIds,
  onMethodsRefresh,
  onRoutinesRefresh,
}: {
  kind: "routines" | "methods";
  installedIds: string[];
  onMethodsRefresh: () => void;
  onRoutinesRefresh: () => void;
}) {
  const { t } = useI18n();
  const [catalogue, setCatalogue] = useState<CatalogueIndex | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [installing, setInstalling] = useState<string | null>(null);
  const [installed, setInstalled] = useState<string[]>(installedIds);
  const [actionError, setActionError] = useState<string | null>(null);
  // D2 install confirmation (point-of-action, every community install).
  const [confirmingInstall, setConfirmingInstall] = useState<{
    id: string;
    kind: "routine" | "method";
    name: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const index = await fetchCatalogue();
        if (active) setCatalogue(index);
      } catch (nextError) {
        if (active) {
          setLoadError(
            nextError instanceof Error
              ? nextError.message
              : "Vaenyx could not reach the community catalogue.",
          );
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function install(id: string, kind: "routine" | "method") {
    setActionError(null);
    setInstalling(id);
    try {
      if (kind === "method") {
        await installMethodFromCatalogue(id);
        onMethodsRefresh();
      } else {
        await installRoutineFromCatalogue(id);
        onRoutinesRefresh();
      }
      setInstalled((prev) => [...new Set([...prev, id])]);
    } catch (nextError) {
      setActionError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not install that item.",
      );
    } finally {
      setInstalling(null);
    }
  }

  const q = query.trim().toLowerCase();
  const matches = (item: {
    name: string;
    description: string;
    tags: string[];
  }) =>
    q === "" ||
    item.name.toLowerCase().includes(q) ||
    item.description.toLowerCase().includes(q) ||
    item.tags.some((tag) => tag.toLowerCase().includes(q));

  const routineHits =
    kind === "routines" ? (catalogue?.routines ?? []).filter(matches) : [];
  const methodHits =
    kind === "methods" ? (catalogue?.methods ?? []).filter(matches) : [];
  const total = routineHits.length + methodHits.length;

  return (
    <div className="library-layout">
      <input
        className="method-rename-input"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name, description or #tag"
        style={{ width: "100%" }}
        type="search"
        value={query}
      />
      {loadError ? <p className="form-error">{loadError}</p> : null}
      {actionError ? <p className="form-error">{actionError}</p> : null}
      {catalogue === null && !loadError ? (
        <p className="settings-card-copy">Loading…</p>
      ) : null}
      {catalogue !== null && total === 0 ? (
        <div className="empty-state">
          <strong>Nothing to show</strong>
          <p>
            {query.trim() !== ""
              ? "No items match your search — try fewer or different words, or clear the search."
              : kind === "routines"
                ? catalogue.methods.length > 0
                  ? "No Routines in the Community yet — check the Methods tab, or publish one of your own from your Library."
                  : "The Community is empty for now — be the first: publish a Routine from your Library."
                : catalogue.routines.length > 0
                  ? "No Methods in the Community yet — check the Routines tab, or publish one of your own from your Library."
                  : "The Community is empty for now — be the first: publish a Method from your Library."}
          </p>
        </div>
      ) : null}
      {total > 0 ? (
        <div className="library-list">
          {routineHits.map((routine) => {
            const isInstalled = installed.includes(routine.id);
            return (
              <div className="library-card" key={`routine-${routine.id}`}>
                <div className="library-card-head">
                  <strong>{routine.name}</strong>
                  <span className="library-chip">Routine</span>
                </div>
                <p>{routine.description}</p>
                {routine.tags.length > 0 ? (
                  <span className="tag-row">
                    {routine.tags.map((tag) => (
                      <span className="tag-chip" key={tag}>
                        #{tag}
                      </span>
                    ))}
                  </span>
                ) : null}
                <small>
                  v{routine.version} · {routine.stepCount}{" "}
                  {routine.stepCount === 1 ? "step" : "steps"} ·{" "}
                  {routine.mode === "accumulate" ? "Accumulate" : "One-shot"}
                  {routine.owner ? ` · by ${routine.owner}` : ""}
                </small>
                <div className="library-card-actions">
                  <button
                    className="primary-button"
                    disabled={isInstalled || installing === routine.id}
                    onClick={() =>
                      setConfirmingInstall({
                        id: routine.id,
                        kind: "routine",
                        name: routine.name,
                      })
                    }
                    type="button"
                  >
                    {isInstalled
                      ? "Installed"
                      : installing === routine.id
                        ? "Installing…"
                        : "Install"}
                  </button>
                  <CommunityReportLink id={routine.id} kind="routine" name={routine.name} />
                </div>
              </div>
            );
          })}
          {methodHits.map((method) => {
            const isInstalled = installed.includes(method.id);
            return (
              <div className="library-card" key={`method-${method.id}`}>
                <div className="library-card-head">
                  <strong>{method.name}</strong>
                  <span className="library-chip">Method</span>
                </div>
                <p>{method.description}</p>
                <p className="library-note">
                  A building block — install it to reuse as a step when you build
                  your own Routine.
                </p>
                {method.tags.length > 0 ? (
                  <span className="tag-row">
                    {method.tags.map((tag) => (
                      <span className="tag-chip" key={tag}>
                        #{tag}
                      </span>
                    ))}
                  </span>
                ) : null}
                <small>
                  v{method.version}
                  {method.owner ? ` · by ${method.owner}` : ""}
                </small>
                <div className="library-card-actions">
                  <button
                    className="primary-button"
                    disabled={isInstalled || installing === method.id}
                    onClick={() =>
                      setConfirmingInstall({
                        id: method.id,
                        kind: "method",
                        name: method.name,
                      })
                    }
                    type="button"
                  >
                    {isInstalled
                      ? "Installed"
                      : installing === method.id
                        ? "Installing…"
                        : "Install"}
                  </button>
                  <CommunityReportLink id={method.id} kind="method" name={method.name} />
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
      {confirmingInstall ? (
        <Modal
          onClose={() => setConfirmingInstall(null)}
          title={confirmingInstall.name}
        >
          <p className="settings-card-copy">
            {t("legal.disclaimer.community.install")}
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              className="primary-button"
              onClick={() => {
                const target = confirmingInstall;
                setConfirmingInstall(null);
                void install(target.id, target.kind);
              }}
              type="button"
            >
              Install
            </button>
            <button
              className="secondary-button"
              onClick={() => setConfirmingInstall(null)}
              type="button"
            >
              {t("routine.confirm.cancel")}
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

// Compact publish control shown under each Routine card. Uses the shared publish
// state RoutinesPanel fetches once. Sign in with Google, then Publish / update;
// publishes the Routine + its dependency Methods.
function RoutinePublishControl({
  routineId,
  state,
  onPublished,
}: {
  routineId: string;
  state: PublishState | null;
  onPublished: () => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (!state || !state.configured) return null;

  if (!state.signedInAs) {
    // Always the shared sign-in block: it carries the G3 notice + G3a
    // overseas-consent checkbox that must gate the sign-in buttons (copy pack
    // G3a) — a bare link here would bypass the consent.
    return (
      <div style={{ padding: "0 0.25rem" }}>
        <PublishSignIn state={state} />
      </div>
    );
  }

  const published = state.publishedRoutineIds.includes(routineId);

  async function publish(acceptance: PublishAcceptance) {
    setConfirming(false);
    setError(null);
    setBusy(true);
    try {
      await publishRoutineToCommunity(routineId, acceptance);
      onPublished();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not publish this routine.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
        fontSize: "var(--fs-sm)",
        padding: "0 0.25rem",
      }}
    >
      <button
        className="text-button"
        disabled={busy}
        onClick={() => setConfirming(true)}
        type="button"
      >
        {busy
          ? t("publish.publishing")
          : published
            ? t("publish.republish")
            : t("publish.button")}
      </button>
      {published ? (
        <span className="ok-text">{t("publish.published")} ✓</span>
      ) : null}
      {/* G5: fact, not prompt — see the note on the Method publish card. */}
      {state.staleRoutineIds.includes(routineId) ? (
        <span className="context-disclaimer">
          {t("legal.notice.publish.localChanges")}
        </span>
      ) : null}
      {error ? <span className="form-error">{error}</span> : null}
      {confirming ? (
        <PublishConfirmDialog
          onCancel={() => setConfirming(false)}
          onConfirm={(acceptance) => void publish(acceptance)}
        />
      ) : null}
    </div>
  );
}

// A small chip showing an item's provenance: installed from the community
// Library (with the creator), published to the community, or a private local
// item. Uses the shared library-chip style.
function ProvenanceChip({
  origin,
  owner,
  published,
  version,
}: {
  origin?: "self" | "community";
  owner: string;
  published: boolean;
  version: string;
}) {
  if (origin === "community") {
    return (
      <span className="library-chip chip-installed">
        Installed{owner ? ` · by ${owner}` : ""}
      </span>
    );
  }
  if (published) {
    return (
      <span className="library-chip chip-published">Published · v{version}</span>
    );
  }
  return <span className="library-chip chip-private">Private</span>;
}

function RoutinesPanel({
  routines,
  methods,
  onRoutinesRefresh,
  onUseRoutine,
}: {
  routines: LibraryRoutineSummary[];
  methods: LibraryMethodSummary[];
  onRoutinesRefresh: () => void;
  onUseRoutine: (routineId: string) => void;
}) {
  const communityVersions = useCommunityVersions();
  // Which Routine's description is open. Null = the list.
  const [opened, setOpened] = useState<string | null>(null);
  // A chat create-offer opens the create flow directly, description pre-filled.
  const [creating, setCreating] = useState(
    () => peekCreateIntent()?.kind === "routine",
  );
  const [publishState, setPublishState] = useState<PublishState | null>(null);

  useEffect(() => {
    let active = true;
    fetchPublishState()
      .then((next) => {
        if (active) setPublishState(next);
      })
      .catch(() => {
        if (active) setPublishState(null);
      });
    return () => {
      active = false;
    };
  }, []);

  function reloadPublish() {
    fetchPublishState()
      .then(setPublishState)
      .catch(() => setPublishState(null));
  }

  if (creating) {
    return (
      <CreateRoutinePanel
        onDone={() => setCreating(false)}
        onRoutinesRefresh={onRoutinesRefresh}
      />
    );
  }

  const openedRoutine = routines.find((routine) => routine.id === opened);
  if (openedRoutine) {
    return (
      <RoutineDetail
        methods={methods}
        onBack={() => setOpened(null)}
        onStart={() => {
          setOpened(null);
          onUseRoutine(openedRoutine.id);
        }}
        summary={openedRoutine}
      />
    );
  }

  return (
    <div className="library-layout">
      <section className="library-intro">
        <div className="library-intro-head">
          <div>
            <p className="eyebrow">Routines</p>
            <h2>Your routines</h2>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              className="primary-button"
              disabled={methods.length === 0}
              onClick={() => setCreating(true)}
              type="button"
            >
              + New routine
            </button>
          </div>
        </div>
        <p>
          A Routine is a ready-to-use product: feed it something, it runs its
          steps and keeps a log you can revisit. Tap one to see what it does.
        </p>
      </section>
      {routines.length === 0 ? (
        <div className="empty-state">
          <strong>No routines yet</strong>
          <p>When a Routine is added to the library, it will appear here.</p>
        </div>
      ) : (
        <div className="library-list">
          {routines.map((routine) => (
            <div
              key={routine.id}
              style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}
            >
              {/* Opening a Routine explains it first (Oskar, 2026-07-26).
                  Tapping a card used to drop straight into a chat with it,
                  which asks someone to use a thing before they know what it
                  does — Methods have always opened a page first. */}
              <button
                className="library-card"
                onClick={() => setOpened(routine.id)}
                type="button"
              >
                <div className="library-card-head">
                  <strong>{routine.name}</strong>
                  <ProvenanceChip
                    origin={routine.origin}
                    owner={routine.owner}
                    published={
                      publishState?.publishedRoutineIds.includes(routine.id) ??
                      false
                    }
                    version={routine.version}
                  />
                </div>
                <p>{routine.description}</p>
                {routine.tags.length > 0 ? (
                  <span className="tag-row">
                    {routine.tags.map((tag) => (
                      <span className="tag-chip" key={tag}>
                        #{tag}
                      </span>
                    ))}
                  </span>
                ) : null}
                <small>
                  v{routine.version} · {routine.stepCount}{" "}
                  {routine.stepCount === 1 ? "step" : "steps"} ·{" "}
                  {routine.mode === "accumulate" ? "Accumulate" : "One-shot"}
                </small>
              </button>
              <RoutinePublishControl
                routineId={routine.id}
                state={publishState}
                onPublished={reloadPublish}
              />
              {routine.origin === "community" ? (
                <CommunityUpdateNotice
                  id={routine.id}
                  installedVersion={routine.version}
                  kind="routine"
                  latest={communityVersions.get(routine.id)}
                  onUpdated={onRoutinesRefresh}
                />
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// The Library area: Methods (ours), Apps (who may call them), and Skills
// (imported capability packs). Apps live here because an App Profile is just the
// keyed access to Methods (see docs/library-architecture.md §10).
function LibraryArea({
  methods,
  routines,
  appProfiles,
  skills,
  onAppCreate,
  onAppDisable,
  onAppUpdate,
  onAppDelete,
  onMethodsRefresh,
  onRoutinesRefresh,
  onUseRoutine,
}: {
  methods: LibraryMethodSummary[];
  routines: LibraryRoutineSummary[];
  appProfiles: AppProfile[];
  skills: Workspace["skills"];
  onAppCreate: (result: CreateAppProfileResponse) => void;
  onAppDisable: (profile: AppProfile) => void;
  onAppUpdate: (profile: AppProfile) => void;
  onAppDelete: (profileId: string) => void;
  onMethodsRefresh: () => void;
  onRoutinesRefresh: () => void;
  onUseRoutine: (routineId: string) => void;
}) {
  const [tab, setTab] = useState<
    "methods" | "routines" | "token" | "skills"
  >(() =>
    // A chat create-offer landed here: open on the tab it wants to create in.
    peekCreateIntent()?.kind === "method" ? "methods" : "routines",
  );

  return (
    <div className="library-area">
      {/* Mirrors the Community screen's skeleton: one line on what this place
          is, then the tabs. */}
      <section className="library-intro">
        <p>
          Your own Methods and Routines, on this machine — yours to use, edit
          and publish.
        </p>
      </section>
      <nav aria-label="Library sections" className="library-subtabs">
        <button
          className={tab === "routines" ? "active" : ""}
          onClick={() => setTab("routines")}
          type="button"
        >
          Routines
        </button>
        <button
          className={tab === "methods" ? "active" : ""}
          onClick={() => setTab("methods")}
          type="button"
        >
          Methods
        </button>
        <button
          className={tab === "token" ? "active" : ""}
          onClick={() => setTab("token")}
          type="button"
        >
          Token
        </button>
      </nav>

      {tab === "methods" ? (
        <LibraryPanel methods={methods} onMethodsRefresh={onMethodsRefresh} />
      ) : tab === "routines" ? (
        <RoutinesPanel
          methods={methods}
          onRoutinesRefresh={onRoutinesRefresh}
          onUseRoutine={onUseRoutine}
          routines={routines}
        />
      ) : tab === "token" ? (
        <AppsPanel
          methods={methods}
          onCreate={onAppCreate}
          onDisable={onAppDisable}
          onUpdate={onAppUpdate}
          onDelete={onAppDelete}
          profiles={appProfiles}
          routines={routines}
        />
      ) : (

        <SkillsLibrary skills={skills} />
      )}
    </div>
  );
}

// Create a Method from a plain-language description (③, slice 1): describe →
// Vaenyx drafts (recipe + I/O schemas + tags) → Owner reviews/edits + demo-tests →
// save. The Owner only ever describes the job; the draft is reviewable before it
// touches disk.
function CreateMethodPanel({
  onMethodsRefresh,
  onDone,
}: {
  onMethodsRefresh: () => void;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<"describe" | "review">("describe");
  // Consume a chat create-offer: pre-fill the description and clear the intent.
  const [description, setDescription] = useState(() => {
    const intent = peekCreateIntent();
    if (intent?.kind === "method") {
      localStorage.removeItem(CREATE_INTENT);
      return intent.description;
    }
    return "";
  });
  const [drafting, setDrafting] = useState(false);
  const [draftDescription, setDraftDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [recipe, setRecipe] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [inputSchemaText, setInputSchemaText] = useState("{}");
  const [outputSchemaText, setOutputSchemaText] = useState("{}");

  const [testInput, setTestInput] = useState("{}");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    Awaited<ReturnType<typeof testDraftMethod>> | null
  >(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function runDraft() {
    if (!description.trim()) return;
    setError(null);
    setDrafting(true);
    try {
      const draft = await draftMethod(description);
      setName(draft.name);
      setDraftDescription(draft.description);
      setRecipe(draft.recipe);
      setTagsText(draft.tags.join(", "));
      setInputSchemaText(JSON.stringify(draft.inputSchema, null, 2));
      setOutputSchemaText(JSON.stringify(draft.outputSchema, null, 2));
      setTestInput(JSON.stringify(buildInputSkeleton(draft.inputSchema), null, 2));
      setPhase("review");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not draft this method.",
      );
    } finally {
      setDrafting(false);
    }
  }

  // Assemble the editable fields into a draft, or set an error on bad JSON.
  function buildDraft(): MethodDraft | null {
    let inputSchema: unknown;
    let outputSchema: unknown;
    try {
      inputSchema = JSON.parse(inputSchemaText);
    } catch {
      setError("Input schema is not valid JSON.");
      return null;
    }
    try {
      outputSchema = JSON.parse(outputSchemaText);
    } catch {
      setError("Output schema is not valid JSON.");
      return null;
    }
    return {
      name: name.trim(),
      description: draftDescription,
      recipe,
      inputSchema,
      outputSchema,
      tags: tagsText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    };
  }

  async function test() {
    const draft = buildDraft();
    if (!draft) return;
    let input: unknown;
    try {
      input = JSON.parse(testInput);
    } catch {
      setTestError("Test input is not valid JSON.");
      return;
    }
    setError(null);
    setTestError(null);
    setTestResult(null);
    setTesting(true);
    try {
      setTestResult(await testDraftMethod(draft, input));
    } catch (nextError) {
      setTestError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not run the draft.",
      );
    } finally {
      setTesting(false);
    }
  }

  async function save() {
    const draft = buildDraft();
    if (!draft) return;
    if (!draft.name || !draft.recipe.trim()) {
      setError("A name and a recipe are required.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await createMethod(draft);
      onMethodsRefresh();
      onDone();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not save this method.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="library-layout">
      <button className="text-button library-back" onClick={onDone} type="button">
        ← All methods
      </button>
      {phase === "describe" ? (
        <section className="settings-card">
          <p className="eyebrow">New method</p>
          <h2>Describe what it should do</h2>
          <p className="settings-card-copy">
            Say, in plain language, the one job this method does. Vaenyx drafts it;
            you review and test it before anything is saved.
          </p>
          <textarea
            className="library-tryit-input"
            onChange={(event) => setDescription(event.target.value)}
            placeholder="e.g. Read a supplier quote email and pull out the supplier, the totals, the line items, and any risks I should notice."
            rows={5}
            value={description}
          />
          {error ? <p className="form-error">{error}</p> : null}
          <button
            className="primary-button"
            disabled={drafting || !description.trim()}
            onClick={() => void runDraft()}
            type="button"
          >
            {drafting ? "Drafting…" : "Draft with Vaenyx"}
          </button>
        </section>
      ) : (
        <>
          <section className="settings-card">
            <p className="eyebrow">Review draft</p>
            <h2>Edit &amp; save</h2>
            <label className="library-tryit-label">
              Name
              <input
                className="method-rename-input"
                maxLength={120}
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
            </label>
            <label className="library-tryit-label">
              Recipe (the instructions Vaenyx follows)
              <textarea
                className="library-tryit-input"
                onChange={(event) => setRecipe(event.target.value)}
                rows={8}
                spellCheck={false}
                value={recipe}
              />
            </label>
            <label className="library-tryit-label">
              Tags (comma-separated)
              <input
                className="method-rename-input"
                onChange={(event) => setTagsText(event.target.value)}
                value={tagsText}
              />
            </label>
            <details className="advanced-details">
              <summary>Input shape (JSON Schema)</summary>
              <textarea
                className="library-tryit-input"
                onChange={(event) => setInputSchemaText(event.target.value)}
                rows={6}
                spellCheck={false}
                value={inputSchemaText}
              />
            </details>
            <details className="advanced-details">
              <summary>Output shape (JSON Schema)</summary>
              <textarea
                className="library-tryit-input"
                onChange={(event) => setOutputSchemaText(event.target.value)}
                rows={6}
                spellCheck={false}
                value={outputSchemaText}
              />
            </details>
            {error ? <p className="form-error">{error}</p> : null}
            <button
              className="primary-button"
              disabled={saving}
              onClick={() => void save()}
              type="button"
            >
              {saving ? "Saving…" : "Save method"}
            </button>
          </section>
          <section className="settings-card">
            <p className="eyebrow">Try it first</p>
            <h2>Demo test (before saving)</h2>
            <label className="library-tryit-label">
              Input (JSON)
              <textarea
                className="library-tryit-input"
                onChange={(event) => setTestInput(event.target.value)}
                rows={5}
                spellCheck={false}
                value={testInput}
              />
            </label>
            <button
              className="secondary-button"
              disabled={testing}
              onClick={() => void test()}
              type="button"
            >
              {testing ? "Running…" : "Run draft"}
            </button>
            {testError ? <p className="form-error">{testError}</p> : null}
            {testResult ? (
              <div
                className={`library-result ${testResult.outputValid ? "valid" : "invalid"}`}
              >
                <strong>
                  {testResult.outputValid
                    ? "Output matches the schema"
                    : "Output did not match the schema"}
                </strong>
                <pre className="library-result-json">
                  {testResult.output === null
                    ? "(no JSON output)"
                    : JSON.stringify(testResult.output, null, 2)}
                </pre>
              </div>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}

function LibraryPanel({
  methods,
  onMethodsRefresh,
}: {
  methods: LibraryMethodSummary[];
  onMethodsRefresh: () => void;
}) {
  const [selected, setSelected] = useState<LibraryMethod | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A chat create-offer opens the create flow directly, description pre-filled.
  const [creating, setCreating] = useState(
    () => peekCreateIntent()?.kind === "method",
  );
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameFrom, setRenameFrom] = useState("");
  const [draftTag, setDraftTag] = useState("");
  const [savingTag, setSavingTag] = useState(false);
  const [publishState, setPublishState] = useState<PublishState | null>(null);

  useEffect(() => {
    let active = true;
    fetchPublishState()
      .then((next) => {
        if (active) setPublishState(next);
      })
      .catch(() => {
        if (active) setPublishState(null);
      });
    return () => {
      active = false;
    };
  }, []);

  // Every distinct tag across the shelf, for the filter bar + rename picker.
  const allTags = [
    ...new Set(methods.flatMap((method) => method.tags)),
  ].sort((left, right) => left.localeCompare(right));

  // Filter is OR: with tags selected, show methods carrying any of them.
  const visible = [...methods]
    .filter(
      (method) =>
        activeTags.length === 0 ||
        method.tags.some((tag) => activeTags.includes(tag)),
    )
    .sort((left, right) => left.name.localeCompare(right.name));

  function toggleFilter(tag: string) {
    setActiveTags((current) =>
      current.includes(tag)
        ? current.filter((value) => value !== tag)
        : [...current, tag],
    );
  }

  async function openMethod(id: string) {
    setError(null);
    setLoadingId(id);
    try {
      setSelected(await fetchLibraryMethod(id));
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not load this method.",
      );
    } finally {
      setLoadingId(null);
    }
  }

  async function saveTagRename() {
    const from = renameFrom.trim();
    const to = draftTag.trim();
    if (!from || !to || from === to) {
      setRenameOpen(false);
      return;
    }
    setError(null);
    setSavingTag(true);
    try {
      await renameMethodTag(from, to);
      setRenameOpen(false);
      setDraftTag("");
      setActiveTags((current) =>
        current.map((tag) => (tag === from ? to : tag)),
      );
      onMethodsRefresh();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not rename this tag.",
      );
    } finally {
      setSavingTag(false);
    }
  }

  if (creating) {
    return (
      <CreateMethodPanel
        onDone={() => setCreating(false)}
        onMethodsRefresh={onMethodsRefresh}
      />
    );
  }

  if (selected) {
    return (
      <MethodDetail
        key={selected.id}
        method={selected}
        onBack={() => setSelected(null)}
        onChanged={(updated) => {
          setSelected(updated);
          // Refresh the summary list so the card name + tags update too.
          onMethodsRefresh();
        }}
      />
    );
  }

  return (
    <div className="library-layout">
      <section className="library-intro">
        <div className="library-intro-head">
          <div>
            <p className="eyebrow">Methods</p>
            <h2>Your methods</h2>
          </div>
          <button
            className="primary-button"
            onClick={() => setCreating(true)}
            type="button"
          >
            + New method
          </button>
        </div>
        <p>
          A Method is a building block — a single reusable part that Routines are
          built from. Most people just use Routines; Methods are here for when you
          want to build your own.
        </p>
      </section>
      {error ? <p className="form-error">{error}</p> : null}
      <SkillImportPanel onImported={onMethodsRefresh} />
      {methods.length === 0 ? (
        <div className="empty-state">
          <strong>No Methods yet</strong>
          <p>When a Method is added to the library, it will appear here.</p>
        </div>
      ) : (
        <>
          {allTags.length > 0 ? (
            <div className="library-tagbar">
              <button
                className={`tag-filter ${activeTags.length === 0 ? "active" : ""}`}
                onClick={() => setActiveTags([])}
                type="button"
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  className={`tag-filter ${activeTags.includes(tag) ? "active" : ""}`}
                  key={tag}
                  onClick={() => toggleFilter(tag)}
                  type="button"
                >
                  #{tag}
                </button>
              ))}
              <button
                className="text-button library-tag-rename-toggle"
                onClick={() => {
                  setRenameFrom(activeTags[0] ?? allTags[0] ?? "");
                  setDraftTag("");
                  setRenameOpen((open) => !open);
                }}
                type="button"
              >
                Rename a tag
              </button>
            </div>
          ) : null}
          {renameOpen ? (
            <div className="library-tag-rename">
              <select
                onChange={(event) => setRenameFrom(event.target.value)}
                value={renameFrom}
              >
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    #{tag}
                  </option>
                ))}
              </select>
              <span>→</span>
              <input
                className="method-rename-input"
                maxLength={120}
                onChange={(event) => setDraftTag(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void saveTagRename();
                  if (event.key === "Escape") setRenameOpen(false);
                }}
                placeholder="New tag name"
                value={draftTag}
              />
              <button
                className="primary-button"
                disabled={savingTag}
                onClick={() => void saveTagRename()}
                type="button"
              >
                {savingTag ? "Renaming..." : "Rename"}
              </button>
              <button
                className="text-button"
                onClick={() => setRenameOpen(false)}
                type="button"
              >
                Cancel
              </button>
            </div>
          ) : null}
          <div className="library-list">
            {visible.map((method) => (
              <button
                className="library-card"
                disabled={loadingId === method.id}
                key={method.id}
                onClick={() => void openMethod(method.id)}
                type="button"
              >
                <div className="library-card-head">
                  <strong>{method.name}</strong>
                  <ProvenanceChip
                    origin={method.origin}
                    owner={method.owner}
                    published={
                      publishState?.publishedMethodIds.includes(method.id) ??
                      false
                    }
                    version={method.version}
                  />
                </div>
                <p>{method.description}</p>
                {method.tags.length > 0 ? (
                  <span className="tag-row">
                    {method.tags.map((tag) => (
                      <span className="tag-chip" key={tag}>
                        #{tag}
                      </span>
                    ))}
                  </span>
                ) : null}
                <small>
                  v{method.version}
                  {loadingId === method.id ? " · Loading..." : ""}
                </small>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ThreadActionsMenu({
  projects,
  thread,
  onMoveThreadProject,
  onRenameThread,
  onSetThreadStatus,
}: {
  projects: Project[];
  thread: VaenyxThread;
  onMoveThreadProject: (thread: VaenyxThread, projectId: string | null) => void;
  onRenameThread: (thread: VaenyxThread, title: string) => void;
  onSetThreadStatus: (thread: VaenyxThread, status: VaenyxThread["status"]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState(thread.title);
  const [renaming, setRenaming] = useState(false);
  const isArchived = thread.status === "archived";

  useEffect(() => {
    setDraftTitle(thread.title);
    setRenaming(false);
  }, [thread.id, thread.title]);

  useEffect(() => {
    if (!open) setRenaming(false);
  }, [open]);

  function pinToggle() {
    onSetThreadStatus(thread, thread.status === "pinned" ? "active" : "pinned");
    setOpen(false);
  }

  function archiveToggle() {
    onSetThreadStatus(thread, isArchived ? "active" : "archived");
    setOpen(false);
  }

  // Claude-Code-style shortcuts while the menu is open: R / P / A, Esc to close.
  // Disabled while renaming so typing in the field isn't hijacked.
  useEffect(() => {
    if (!open || renaming) return undefined;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const key = event.key.toLowerCase();
      if (key === "r") {
        event.preventDefault();
        setRenaming(true);
      } else if (key === "p" && !isArchived) {
        event.preventDefault();
        onSetThreadStatus(
          thread,
          thread.status === "pinned" ? "active" : "pinned",
        );
        setOpen(false);
      } else if (key === "a") {
        event.preventDefault();
        onSetThreadStatus(thread, isArchived ? "active" : "archived");
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, renaming, isArchived, thread, onSetThreadStatus]);

  const menuRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function renameFromMenu(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTitle = draftTitle.trim();
    if (!nextTitle || nextTitle === thread.title) return;

    onRenameThread(thread, nextTitle);
    setRenaming(false);
    setOpen(false);
  }

  return (
    <details
      className="thread-action-menu"
      onToggle={(event) => setOpen(event.currentTarget.open)}
      open={open}
      ref={menuRef}
    >
      <summary aria-label={`Actions for ${thread.title}`}>
        <span aria-hidden="true">⋮</span>
      </summary>
      <div className="thread-action-popover">
        {renaming ? (
          <form className="thread-rename-form" onSubmit={renameFromMenu}>
            <label>
              <span>Rename</span>
              <input
                autoFocus
                maxLength={120}
                onChange={(event) => setDraftTitle(event.target.value)}
                value={draftTitle}
              />
            </label>
            <div className="thread-rename-actions">
              <button
                disabled={!draftTitle.trim() || draftTitle.trim() === thread.title}
                type="submit"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setDraftTitle(thread.title);
                  setRenaming(false);
                }}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <button onClick={() => setRenaming(true)} type="button">
              <span>Rename</span>
              <kbd>R</kbd>
            </button>
            {!isArchived ? (
              <button onClick={pinToggle} type="button">
                <span>{thread.status === "pinned" ? "Unpin" : "Pin"}</span>
                <kbd>P</kbd>
              </button>
            ) : null}
            <div className="menu-divider" />
            <div className="thread-move-group">
              <span className="thread-menu-label">Move to group</span>
              {sortProjectsForSidebar(projects).map((project) => {
                const current =
                  (thread.projectId ?? GENERAL_PROJECT_ID) === project.id;
                return (
                  <button
                    className={
                      current
                        ? "thread-move-target active"
                        : "thread-move-target"
                    }
                    key={project.id}
                    onClick={() => {
                      onMoveThreadProject(thread, project.id);
                      setOpen(false);
                    }}
                    type="button"
                  >
                    {getSidebarProjectName(project)}
                    {current ? <span aria-hidden="true">✓</span> : null}
                  </button>
                );
              })}
            </div>
            <div className="menu-divider" />
            <button onClick={archiveToggle} type="button">
              <span>{isArchived ? "Restore" : "Archive"}</span>
              <kbd>A</kbd>
            </button>
          </>
        )}
      </div>
    </details>
  );
}

const THREAD_LIST_INITIAL = 5;
const THREAD_LIST_STEP = 10;

// A folder's chat list, capped so a long folder (e.g. Unsorted) shows the first
// few and reveals more in steps via "Show more".
// OPENING AN UNREAD CHAT LANDS AT THE FIRST UNREAD MESSAGE, not the bottom
// (Oskar, 2026-08-06: "只要是未读的信息…自动从 reply start 的地方开始"). The
// shell notices the thread was unread BEFORE it marks it read and leaves the
// old watermark here; the chat view consumes it once, right after the messages
// load, and scrolls the first message newer than the watermark to the top.
// Freshness-scoped rather than id-matched: the note is written in the same
// breath as the open, and a stale one (nothing consumed it within a few
// seconds) is dropped rather than yanking some later conversation around.
let pendingUnreadCutoff: { cutoff: string; at: number } | null = null;

export function noteUnreadOpen(cutoff: string): void {
  pendingUnreadCutoff = { cutoff, at: Date.now() };
}

function consumeUnreadCutoff(): string | null {
  if (!pendingUnreadCutoff) return null;
  const { cutoff, at } = pendingUnreadCutoff;
  pendingUnreadCutoff = null;
  return Date.now() - at < 8000 ? cutoff : null;
}

// Per-device read tracking for the sidebar's unread dots (Oskar, 2026-07-28):
// a thread is unread when its last activity is newer than the last time THIS
// device had it open. Device-local on purpose — read state is a property of
// the person at the screen, and it needs no server schema.
//
// TWO parts, and the watermark is the important one. The per-thread map alone
// meant "no entry = unread", so every chat missing from the map — anything the
// map was not written with — stayed lit forever ("红点全部都在"). The watermark
// is the moment this device started tracking: activity older than it is read,
// full stop. So a thread's floor is its own entry when it has one, else the
// watermark, and unknown chats simply do not light up for old activity.
const THREAD_SEEN_KEY = "vaenyx-thread-seen-2";
const THREAD_SEEN_SINCE_KEY = "vaenyx-thread-seen-since";

function readThreadSeen(): Record<string, string> {
  try {
    return JSON.parse(
      localStorage.getItem(THREAD_SEEN_KEY) ?? "",
    ) as Record<string, string>;
  } catch {
    return {};
  }
}

function readThreadSeenSince(): string {
  try {
    return localStorage.getItem(THREAD_SEEN_SINCE_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeThreadSeen(map: Record<string, string>): void {
  try {
    localStorage.setItem(THREAD_SEEN_KEY, JSON.stringify(map));
  } catch {
    // Storage full or blocked: the dots just stay conservative.
  }
}

function ThreadList({
  threads,
  emptyLabel,
  selectedThreadId,
  tasks,
  projects,
  unreadIds,
  onOpenChat,
  onOpenTask,
  onMoveThreadProject,
  onRenameThread,
  onSetThreadStatus,
  onBulkArchive,
  onBulkDelete,
}: {
  threads: VaenyxThread[];
  emptyLabel: string;
  unreadIds: ReadonlySet<string>;
  selectedThreadId: string | null;
  tasks: Task[];
  projects: Project[];
  onOpenChat: (conversationId: string, threadId: string) => void;
  onOpenTask: (taskId: string, threadId: string) => void;
  onMoveThreadProject: (thread: VaenyxThread, projectId: string | null) => void;
  onRenameThread: (thread: VaenyxThread, title: string) => void;
  onSetThreadStatus: (thread: VaenyxThread, status: VaenyxThread["status"]) => void;
  // Bulk actions on a selection. Ctrl/Cmd-click adds one, Shift-click takes a
  // run — the same gesture as a file manager, because that is what people
  // already know (Oskar, 2026-07-27).
  onBulkArchive: (threads: VaenyxThread[]) => void;
  onBulkDelete: (threads: VaenyxThread[]) => void;
}) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(THREAD_LIST_INITIAL);
  const [selected, setSelected] = useState<string[]>([]);
  const [anchor, setAnchor] = useState<string | null>(null);

  if (threads.length === 0) {
    return <p className="thread-empty">{emptyLabel}</p>;
  }

  const shown = threads.slice(0, visible);
  const remaining = threads.length - shown.length;
  const selectedThreads = threads.filter((thread) =>
    selected.includes(thread.id),
  );

  // Modifier-click selects instead of opening. Returns true when the click was
  // a selection gesture, so the caller knows not to open the chat.
  function handleSelectClick(
    thread: VaenyxThread,
    event: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean },
  ): boolean {
    if (event.shiftKey && anchor) {
      const from = shown.findIndex((entry) => entry.id === anchor);
      const to = shown.findIndex((entry) => entry.id === thread.id);
      if (from >= 0 && to >= 0) {
        const [start, end] = from <= to ? [from, to] : [to, from];
        const run = shown.slice(start, end + 1).map((entry) => entry.id);
        setSelected((current) => [...new Set([...current, ...run])]);
        return true;
      }
    }
    if (event.ctrlKey || event.metaKey) {
      setSelected((current) =>
        current.includes(thread.id)
          ? current.filter((id) => id !== thread.id)
          : [...current, thread.id],
      );
      setAnchor(thread.id);
      return true;
    }
    return false;
  }

  return (
    <div className="thread-items">
      {selected.length > 0 ? (
        <div className="thread-bulk-bar">
          <span>
            {t("threads.bulk.count").replace("{n}", String(selected.length))}
          </span>
          <button
            className="text-button"
            onClick={() => {
              onBulkArchive(selectedThreads);
              setSelected([]);
            }}
            type="button"
          >
            {t("threads.bulk.archive")}
          </button>
          <button
            className="text-button danger"
            onClick={() => {
              onBulkDelete(selectedThreads);
              setSelected([]);
            }}
            type="button"
          >
            {t("threads.bulk.delete")}
          </button>
          <button
            className="text-button"
            onClick={() => setSelected([])}
            type="button"
          >
            {t("threads.bulk.clear")}
          </button>
        </div>
      ) : null}
      {shown.map((thread) => {
        const light = threadLight(thread, tasks);
        return (
          <div
            className={[
              "thread-item-row",
              selectedThreadId === thread.id ? "active" : "",
              selected.includes(thread.id) ? "picked" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            key={thread.id}
          >
            <button
              className={
                selectedThreadId === thread.id
                  ? "thread-item active"
                  : "thread-item"
              }
              onClick={(event) => {
                if (handleSelectClick(thread, event)) return;
                if (thread.kind === "chat" && thread.conversationId) {
                  onOpenChat(thread.conversationId, thread.id);
                  return;
                }

                if (thread.kind === "task" && thread.taskId) {
                  onOpenTask(thread.taskId, thread.id);
                }
              }}
              type="button"
            >
              {/* Unread breathes the light that is already there (Oskar,
                  2026-07-29): a second red dot beside it said the same thing
                  twice and read as a competing status. */}
              <span
                aria-label={
                  unreadIds.has(thread.id)
                    ? `${chatLightLabel(light)} · unread`
                    : chatLightLabel(light)
                }
                className={
                  unreadIds.has(thread.id)
                    ? `status-light status-light--${light} status-light--unread`
                    : `status-light status-light--${light}`
                }
              />
              <strong>{thread.title.trim() || "New chat"}</strong>
              <ThreadChipRow chips={threadStatusChips(thread, tasks)} />
              {thread.status === "pinned" ? (
                <span aria-label="Pinned" className="thread-pin">
                  ★
                </span>
              ) : null}
            </button>
            <ThreadActionsMenu
              projects={projects}
              thread={thread}
              onMoveThreadProject={onMoveThreadProject}
              onRenameThread={onRenameThread}
              onSetThreadStatus={onSetThreadStatus}
            />
          </div>
        );
      })}
      {remaining > 0 ? (
        <button
          className="thread-show-more"
          onClick={() => setVisible((current) => current + THREAD_LIST_STEP)}
          type="button"
        >
          Show {Math.min(remaining, THREAD_LIST_STEP)} more ({remaining} left)
        </button>
      ) : null}
    </div>
  );
}

function SidebarThreadTree({
  selectedThreadId,
  workspace,
  onOpenChat,
  onOpenTask,
  onMoveThreadProject,
  onRenameThread,
  onSetThreadStatus,
  onBulkArchive,
  onBulkDelete,
}: {
  selectedThreadId: string | null;
  workspace: Workspace;
  onOpenChat: (conversationId: string, threadId: string) => void;
  onOpenTask: (taskId: string, threadId: string) => void;
  onMoveThreadProject: (thread: VaenyxThread, projectId: string | null) => void;
  onRenameThread: (thread: VaenyxThread, title: string) => void;
  onSetThreadStatus: (thread: VaenyxThread, status: VaenyxThread["status"]) => void;
  onBulkArchive: (threads: VaenyxThread[]) => void;
  onBulkDelete: (threads: VaenyxThread[]) => void;
}) {
  const { t } = useI18n();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [pickedArchived, setPickedArchived] = useState<Set<string>>(new Set());
  // Deleting archived chats is the one destructive act here — two clicks.
  const [confirmArchiveDelete, setConfirmArchiveDelete] = useState(false);
  // Unread dots: last-seen per thread, plus the tracking watermark. Device only.
  const [threadSeen, setThreadSeen] = useState<Record<string, string>>(
    readThreadSeen,
  );
  const [seenSince, setSeenSince] = useState<string>(readThreadSeenSince);

  // First run on this device: everything that already happened counts as read.
  // A sidebar that lights up wall-to-wall on update says nothing.
  useEffect(() => {
    if (seenSince) return;
    const now = new Date().toISOString();
    try {
      localStorage.setItem(THREAD_SEEN_SINCE_KEY, now);
      // Superseded keys from earlier attempts at this.
      localStorage.removeItem("vaenyx-thread-seen");
    } catch {
      // Storage blocked: the dots just stay quiet this session.
    }
    setSeenSince(now);
  }, [seenSince]);

  // The open thread is always read: opening marks it, and activity arriving
  // while it is open keeps it marked.
  useEffect(() => {
    if (!selectedThreadId) return;
    const thread = workspace.threads.find(
      (candidate) => candidate.id === selectedThreadId,
    );
    if (!thread) return;
    if ((threadSeen[thread.id] ?? "") >= thread.updatedAt) return;
    // Unread until this very moment: keep the old watermark so the view can
    // open at the first message the Owner has not seen, instead of the bottom.
    const cutoff = threadSeen[thread.id] ?? seenSince;
    if (cutoff) noteUnreadOpen(cutoff);
    const next = { ...threadSeen, [thread.id]: thread.updatedAt };
    setThreadSeen(next);
    writeThreadSeen(next);
  }, [selectedThreadId, workspace.threads, threadSeen, seenSince]);

  const unreadIds: ReadonlySet<string> = new Set(
    workspace.threads
      .filter(
        (thread) =>
          thread.status !== "archived" &&
          thread.id !== selectedThreadId &&
          // Its own last-read moment, or — never opened here — the moment this
          // device started tracking. No watermark yet = nothing is unread.
          Boolean(seenSince) &&
          (threadSeen[thread.id] ?? seenSince) < thread.updatedAt,
      )
      .map((thread) => thread.id),
  );
  const visibleThreads = workspace.threads.filter(
    (thread) => thread.status !== "archived",
  );
  const archivedThreads = workspace.threads.filter(
    (thread) => thread.status === "archived",
  );

  const namedProjects = sortProjectsForSidebar(workspace.projects).filter(
    (project) => !isGeneralProject(project),
  );

  function threadsForProject(projectId: string): VaenyxThread[] {
    return visibleThreads.filter((thread) => thread.projectId === projectId);
  }

  // Unsorted = not in a named Project: legacy General (or null project). The old
  // "General" folder is folded in here (spec.md §2, 2026-06-15).
  const unsortedThreads = visibleThreads.filter(
    (thread) =>
      thread.projectId === null || thread.projectId === GENERAL_PROJECT_ID,
  );

  function renderThreadItems(threads: VaenyxThread[], emptyLabel: string) {
    return (
      <ThreadList
        emptyLabel={emptyLabel}
        onMoveThreadProject={onMoveThreadProject}
        onOpenChat={onOpenChat}
        onOpenTask={onOpenTask}
        onRenameThread={onRenameThread}
        onSetThreadStatus={onSetThreadStatus}
        onBulkArchive={onBulkArchive}
        onBulkDelete={onBulkDelete}
        projects={workspace.projects}
        selectedThreadId={selectedThreadId}
        tasks={workspace.tasks}
        threads={threads}
        unreadIds={unreadIds}
      />
    );
  }

  return (
    <section className="thread-tree" aria-label="Vaenyx workspace">
      {namedProjects.length > 0 ? (
        <div className="project-thread-folders">
          {namedProjects.map((project) => {
              const projectThreads = threadsForProject(project.id);

              return (
                <SidebarDetails
                  className="project-thread-folder"
                  count={projectThreads.length}
                  initiallyOpen={projectThreads.length > 0}
                  key={project.id}
                  label={getSidebarProjectName(project)}
                >
                  {renderThreadItems(projectThreads, "No chats yet")}
                </SidebarDetails>
              );
            })}
        </div>
      ) : null}
      <div className="project-thread-folders unsorted-section">
        <SidebarDetails
          className="project-thread-folder"
          count={unsortedThreads.length}
          initiallyOpen
          label="Unsorted"
        >
          {renderThreadItems(unsortedThreads, "No chats yet")}
        </SidebarDetails>
      </div>
      {/* The archive is one button and one window (Oskar, 2026-07-27): the
          sidebar stays for live chats, and everything archived is dealt with in
          a compact list — click rows to pick several, then restore or delete
          the lot. */}
      {archivedThreads.length > 0 ? (
        <div className="project-thread-folders archived-section">
          <button
            className="thread-show-more"
            onClick={() => setArchiveOpen(true)}
            type="button"
          >
            {t("threads.archived")} ({archivedThreads.length})
          </button>
        </div>
      ) : null}
      {archiveOpen ? (
        <Modal
          onClose={() => {
            setArchiveOpen(false);
            setPickedArchived(new Set());
            setConfirmArchiveDelete(false);
          }}
          title={`${t("threads.archived")} (${archivedThreads.length})`}
        >
          <div className="archive-modal">
            <div className="archive-modal-toolbar">
              <button
                className="text-button"
                onClick={() =>
                  setPickedArchived(
                    pickedArchived.size === archivedThreads.length
                      ? new Set()
                      : new Set(archivedThreads.map((thread) => thread.id)),
                  )
                }
                type="button"
              >
                {pickedArchived.size === archivedThreads.length
                  ? "Clear Selection"
                  : "Select All"}
              </button>
              <span className="text-faint">
                {pickedArchived.size > 0 ? `${pickedArchived.size} picked` : ""}
              </span>
            </div>
            <div className="archive-modal-list">
              {archivedThreads.map((thread) => {
                const picked = pickedArchived.has(thread.id);
                return (
                  <button
                    className={
                      picked ? "archive-row picked" : "archive-row"
                    }
                    key={thread.id}
                    onClick={() => {
                      const next = new Set(pickedArchived);
                      if (picked) next.delete(thread.id);
                      else next.add(thread.id);
                      setPickedArchived(next);
                      setConfirmArchiveDelete(false);
                    }}
                    type="button"
                  >
                    <span className="archive-row-mark">
                      {picked ? "✓" : ""}
                    </span>
                    <span className="archive-row-title">
                      {thread.title.trim() || "New chat"}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="archive-modal-actions">
              <button
                className="secondary-button"
                disabled={pickedArchived.size === 0}
                onClick={() => {
                  for (const thread of archivedThreads) {
                    if (pickedArchived.has(thread.id)) {
                      onSetThreadStatus(thread, "active");
                    }
                  }
                  setPickedArchived(new Set());
                }}
                type="button"
              >
                {t("threads.archived.restore")}
              </button>
              {confirmArchiveDelete ? (
                <button
                  className="primary-button danger"
                  disabled={pickedArchived.size === 0}
                  onClick={() => {
                    onBulkDelete(
                      archivedThreads.filter((thread) =>
                        pickedArchived.has(thread.id),
                      ),
                    );
                    setPickedArchived(new Set());
                    setConfirmArchiveDelete(false);
                  }}
                  type="button"
                >
                  Really Delete ({pickedArchived.size})
                </button>
              ) : (
                <button
                  className="secondary-button danger"
                  disabled={pickedArchived.size === 0}
                  onClick={() => setConfirmArchiveDelete(true)}
                  type="button"
                >
                  {t("threads.bulk.delete")}
                </button>
              )}
            </div>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}

function VaenyxWorkspace({
  workspace,
  systemStatus,
  onLogout,
  onWorkspaceChange,
}: {
  workspace: Workspace;
  systemStatus: SystemStatus | null;
  onLogout: () => Promise<void>;
  onWorkspaceChange: (workspace: Workspace) => void;
}) {
  const { lang, t } = useI18n();
  // A model button on the sign-in page leaves a connect intent; land straight
  // on Settings (whose Models tab picks it up) instead of the chat portal.
  const [screen, setScreen] = useState<Screen>(() =>
    localStorage.getItem(CONNECT_MODEL_INTENT) ? "settings" : "ask-vaenyx",
  );
  const [askVaenyxConversations, setAskVaenyxConversations] = useState<
    AskVaenyxConversation[]
  >([]);
  const [appProfiles, setAppProfiles] = useState<AppProfile[]>([]);
  const [memories, setMemories] = useState<ProjectMemory[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [libraryMethods, setLibraryMethods] = useState<LibraryMethodSummary[]>(
    [],
  );
  const [libraryRoutines, setLibraryRoutines] = useState<
    LibraryRoutineSummary[]
  >([]);
  const [settings, setSettings] = useState<InstanceSettings | null>(null);
  const generalProjectId = workspace.projects.find(isGeneralProject)?.id ?? null;
  const defaultProjectId = generalProjectId ?? workspace.projects[0]?.id ?? "";
  const defaultSkillId = workspace.skills[0]?.id ?? "";
  const [, setError] = useState<string | null>(null);
  // The URL is read DURING state initialisation, not in an effect: a
  // notification deep-link or a refresh must paint the target page first
  // time, not paint home and then jump there (Oskar, 2026-07-27).
  const bootParams = new URLSearchParams(window.location.search);
  const bootTaskId = bootParams.get("task");
  const bootChatId = bootParams.get("chat");
  const [requestedConversationId, setRequestedConversationId] = useState<
    string | null
  >(bootChatId);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    bootChatId ?? bootTaskId,
  );
  const [portalView, setPortalView] = useState<PortalView>(
    bootTaskId ? "task" : bootChatId ? "chat" : "new",
  );
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(bootTaskId);
  const [requestedProjectId, setRequestedProjectId] = useState<string | null>(
    null,
  );
  const [composeKey, setComposeKey] = useState(0);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [scheduledExpanded, setScheduledExpanded] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const savedWidth = window.localStorage.getItem("vaenyx.sidebarWidth");
    const parsedWidth = savedWidth ? Number.parseInt(savedWidth, 10) : 320;

    return Number.isFinite(parsedWidth)
      ? clampSidebarWidth(parsedWidth)
      : 320;
  });
  const [resizingSidebar, setResizingSidebar] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const bootVersionRef = useRef<string | null>(systemStatus?.version ?? null);

  useEffect(() => {
    Promise.all([
      fetchAskVaenyxConversations().then(setAskVaenyxConversations),
      // The Tokens screen manages Method/Routine Tokens ONLY. Relay keys are
      // the Door panel's product (Oskar, 2026-08-02: the two separated), and
      // the filter lives at the load so no screen downstream can forget it.
      fetchAppProfiles().then((all) =>
        setAppProfiles(all.filter((profile) => profile.kind !== "relay")),
      ),
      fetchMemories().then(setMemories),
      fetchSettings().then(setSettings),
    ]).catch(() => undefined);
  }, []);

  // Capture the version this client booted with, then poll every 10s: if the
  // server reports a different version, a new build is live -> offer a refresh.
  useEffect(() => {
    if (!bootVersionRef.current && systemStatus?.version) {
      bootVersionRef.current = systemStatus.version;
    }
  }, [systemStatus]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void fetchSystemStatus()
        .then((status) => {
          const boot = bootVersionRef.current;
          if (boot && status.version && status.version !== boot) {
            setUpdateAvailable(true);
          }
        })
        .catch(() => undefined);
    }, 10_000);
    return () => window.clearInterval(id);
  }, []);

  // Presence heartbeat (Owner request): "someone is looking" = the page is
  // visible AND the Owner actually interacted in the last minute. A monitor
  // left on with the tab open no longer counts as seen — the phone still gets
  // its push (Oskar, dev.143).
  useEffect(() => {
    let lastInteractionAt = Date.now();
    const noteInteraction = () => {
      lastInteractionAt = Date.now();
    };
    const beat = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastInteractionAt < 60_000
      ) {
        void postPresenceHeartbeat().catch(() => undefined);
      }
    };
    const interactionEvents = [
      "pointerdown",
      "pointermove",
      "keydown",
      "touchstart",
      "wheel",
    ] as const;
    for (const eventName of interactionEvents) {
      window.addEventListener(eventName, noteInteraction, { passive: true });
    }
    beat();
    const id = window.setInterval(beat, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        noteInteraction();
        beat();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      for (const eventName of interactionEvents) {
        window.removeEventListener(eventName, noteInteraction);
      }
    };
  }, []);

  // Self-healing push (dev.144, hardened dev.147): browsers drop subscriptions
  // on their own, and an installed PWA can live in the background for DAYS —
  // mount-once healing never re-ran. Heal on every return to the foreground
  // too (throttled), so an expired subscription repairs before it matters.
  useEffect(() => {
    let lastHealAt = 0;
    const heal = () => {
      if (Date.now() - lastHealAt < 300_000) return;
      lastHealAt = Date.now();
      void healPushSubscription();
    };
    heal();
    const onVisible = () => {
      if (document.visibilityState === "visible") heal();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("vaenyx.sidebarWidth", String(sidebarWidth));
  }, [sidebarWidth]);

  // Lock background scroll while the mobile sidebar drawer is open, so a finger
  // swipe moves the drawer (not the page behind it).
  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileSidebarOpen]);

  useEffect(() => {
    if (!resizingSidebar) return undefined;

    function resizeSidebar(event: PointerEvent) {
      event.preventDefault();
      setSidebarWidth(clampSidebarWidth(event.clientX));
    }

    function stopResizingSidebar() {
      setResizingSidebar(false);
    }

    document.body.classList.add("resizing-sidebar");
    window.addEventListener("pointermove", resizeSidebar);
    window.addEventListener("pointerup", stopResizingSidebar);

    return () => {
      document.body.classList.remove("resizing-sidebar");
      window.removeEventListener("pointermove", resizeSidebar);
      window.removeEventListener("pointerup", stopResizingSidebar);
    };
  }, [resizingSidebar]);

  function startNewChatInProject(projectId: string | null) {
    setSelectedThreadId(null);
    setRequestedConversationId(null);
    setFocusedTaskId(null);
    setRequestedProjectId(projectId);
    setPortalView("new");
    setScreen("ask-vaenyx");
    setComposeKey((current) => current + 1);
    setMobileSidebarOpen(false);
  }

  function startSidebarNew() {
    startNewChatInProject(null);
  }

  function openDraftConversation(conversationId: string) {
    setSelectedThreadId(conversationId);
    setRequestedConversationId(conversationId);
    setFocusedTaskId(null);
    setRequestedProjectId(null);
    setPortalView("chat");
    setScreen("ask-vaenyx");
    setMobileSidebarOpen(false);
  }

  // Library v2: "Use" a Routine from the list — open a fresh chat already bound to
  // it, so the capability bar appears and messages feed the Routine.
  async function useRoutineInChat(routineId: string) {
    try {
      const routine = libraryRoutines.find((item) => item.id === routineId);
      const conversation = await createAskVaenyxConversation({
        routineId,
        title: routine?.name,
      });
      setAskVaenyxConversations((current) => [
        conversation,
        ...current.filter((item) => item.id !== conversation.id),
      ]);
      await refreshWorkspace();
      openDraftConversation(conversation.id);
    } catch {
      // Leave the Routine list as-is; the Owner can retry.
    }
  }

  async function turnOffSchedule(taskId: string): Promise<void> {
    try {
      await setTaskSchedule(taskId, { cadence: null, enabled: false });
      await refreshWorkspace();
    } catch {
      // Best-effort; the Scheduled list refreshes on the next change.
    }
  }

  // Navigation switches the screen FIRST and loads data behind it. These used
  // to await their fetches before setScreen, so one failed request meant the
  // click did nothing at all — which is exactly how Guard "stopped working"
  // (Oskar, 2026-07-27). A screen with stale-or-empty data beats a dead button.
  function openGuard() {
    setSelectedThreadId(null);
    setMobileSidebarOpen(false);
    setScreen("guard");
    void fetchAuditEvents()
      .then(setAuditEvents)
      .catch(() => undefined);
  }

  function refreshLibraryData(): void {
    void fetchLibraryMethods()
      .then(setLibraryMethods)
      .catch(() => undefined);
    void fetchLibraryRoutines()
      .then(setLibraryRoutines)
      .catch(() => undefined);
  }

  function openLibrary() {
    setSelectedThreadId(null);
    setMobileSidebarOpen(false);
    setScreen("library");
    refreshLibraryData();
  }

  function openCommunity() {
    setSelectedThreadId(null);
    setMobileSidebarOpen(false);
    setScreen("community");
    refreshLibraryData();
  }

  function openScreen(nextScreen: Screen) {
    setSelectedThreadId(null);
    setFocusedTaskId(null);
    if (nextScreen === "ask-vaenyx") {
      setPortalView("new");
      setRequestedProjectId(null);
      setComposeKey((current) => current + 1);
    }
    setScreen(nextScreen);
    setMobileSidebarOpen(false);
  }

  async function refreshWorkspace() {
    onWorkspaceChange(await fetchWorkspace());
  }

  async function createTaskFromPortal(
    content: string,
    sourceChatId: string | null = null,
    requestedProjectId: string | null = null,
    title?: string,
  ): Promise<Task> {
    setError(null);
    const nextProjectId = requestedProjectId || defaultProjectId;
    // Forge (read-only repo agent) runs in the Vaenyx repo project; everywhere
    // else runs a real research task (chat with web search), schedulable too.
    const executionMode: "forge-readonly" | "research" =
      nextProjectId === "vaenyx" ? "forge-readonly" : "research";

    const task = await createTask({
      request: content,
      ...(title ? { title } : {}),
      projectId: nextProjectId,
      ...(defaultSkillId ? { skillId: defaultSkillId } : {}),
      ...(sourceChatId ? { sourceChatId } : {}),
      executionMode,
    });

    await refreshWorkspace();
    setSelectedThreadId(task.threadId ?? task.id);
    setFocusedTaskId(task.id);
    setPortalView("task");
    setMobileSidebarOpen(false);
    return task;
  }

  async function renameWorkspaceThread(thread: VaenyxThread, title: string) {
    const nextTitle = title.trim();
    if (!nextTitle || nextTitle === thread.title) return;

    setError(null);

    try {
      const updatedThread = await updateVaenyxThreadTitle(thread.id, {
        title: nextTitle,
      });

      if (updatedThread.conversationId) {
        setAskVaenyxConversations((current) =>
          current.map((conversation) =>
            conversation.id === updatedThread.conversationId
              ? {
                  ...conversation,
                  title: updatedThread.title,
                  updatedAt: updatedThread.updatedAt,
                }
              : conversation,
          ),
        );
      }

      await refreshWorkspace();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not rename this item.",
      );
    }
  }

  async function moveWorkspaceThreadProject(
    thread: VaenyxThread,
    nextProjectId: string | null,
  ) {
    setError(null);

    try {
      await updateVaenyxThreadProject(thread.id, { projectId: nextProjectId });
      await refreshWorkspace();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not move this item.",
      );
    }
  }

  async function setWorkspaceThreadStatus(
    thread: VaenyxThread,
    status: VaenyxThread["status"],
  ) {
    setError(null);

    try {
      await updateVaenyxThreadStatus(thread.id, { status });
      if (status === "archived" && selectedThreadId === thread.id) {
        setSelectedThreadId(null);
        setFocusedTaskId(null);
        setRequestedProjectId(null);
        setComposeKey((current) => current + 1);
        setPortalView("new");
      }
      await refreshWorkspace();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not update this item.",
      );
    }
  }

  function openSourceConversation(sourceChatId: string, threadId?: string) {
    const sourceThread = workspace.threads.find(
      (thread) => thread.conversationId === sourceChatId,
    );
    setSelectedThreadId(threadId ?? sourceThread?.id ?? sourceChatId);
    setRequestedConversationId(sourceChatId);
    setFocusedTaskId(null);
    setRequestedProjectId(null);
    setPortalView("chat");
    setScreen("ask-vaenyx");
    setMobileSidebarOpen(false);
  }

  // The address bar mirrors where you are, and a load follows it — that is
  // what makes a notification's URL open the thing it is about, and a refresh
  // stay on the page you were on. The target states are initialised straight
  // from the URL above (no paint-home-then-jump); the ?view= restore happens
  // here because Screen has its own initialiser logic.
  useEffect(() => {
    const view = bootParams.get("view");
    if (!bootTaskId && !bootChatId && view && RESTORABLE_SCREENS.includes(view as Screen)) {
      setScreen(view as Screen);
    }
    // Runs once per load; afterwards the sync effect owns the URL.
  }, []);

  // Which chat the sidebar selection points at, for the URL below. The second
  // clause covers deep-link opens, where selectedThreadId holds the
  // conversation id itself until the thread row exists.
  const selectedThreadConversationId =
    workspace.threads.find((thread) => thread.id === selectedThreadId)
      ?.conversationId ??
    (selectedThreadId &&
    workspace.threads.some(
      (thread) => thread.conversationId === selectedThreadId,
    )
      ? selectedThreadId
      : null);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("view");
    url.searchParams.delete("task");
    url.searchParams.delete("chat");
    // A hard-refresh's cache-busting ?r must not linger: a home-screen
    // shortcut created while it sat in the address bar would open with it
    // forever, busting the cache on every launch.
    url.searchParams.delete("r");
    if (screen !== "ask-vaenyx") {
      url.searchParams.set("view", screen);
    } else if (focusedTaskId) {
      url.searchParams.set("task", focusedTaskId);
    } else if (selectedThreadConversationId) {
      url.searchParams.set("chat", selectedThreadConversationId);
    }
    // replaceState, not pushState: refresh-stays-put needs no back-button
    // history of every click.
    window.history.replaceState({}, "", url.toString());
  }, [screen, focusedTaskId, selectedThreadConversationId]);

  // Bulk archive: one call per thread, then a single refresh. Archiving is
  // reversible, so it needs no confirmation.
  async function archiveThreads(threads: VaenyxThread[]): Promise<void> {
    for (const thread of threads) {
      try {
        await updateVaenyxThreadStatus(thread.id, { status: "archived" });
      } catch {
        // Keep going: one failure should not strand the rest.
      }
    }
    await refreshWorkspace();
  }

  // Bulk delete: this one asks first, because it cannot be undone and the
  // whole point of selecting several is that it is easy to select one too many.
  async function deleteThreads(threads: VaenyxThread[]): Promise<void> {
    const chats = threads.filter(
      (thread) => thread.kind === "chat" && thread.conversationId,
    );
    if (chats.length === 0) return;
    const question =
      lang === "zh"
        ? `删除 ${chats.length} 个对话?这个动作无法撤销。`
        : `Delete ${chats.length} conversation(s)? This cannot be undone.`;
    if (!window.confirm(question)) return;
    for (const thread of chats) {
      try {
        if (thread.conversationId) {
          await deleteAskVaenyxConversation(thread.conversationId);
        }
      } catch {
        // Keep going: one failure should not strand the rest.
      }
    }
    setAskVaenyxConversations((current) =>
      current.filter(
        (conversation) =>
          !chats.some((thread) => thread.conversationId === conversation.id),
      ),
    );
    await refreshWorkspace();
  }

  function openThreadTask(taskId: string, threadId?: string) {
    const taskThread = workspace.threads.find(
      (thread) => thread.taskId === taskId,
    );
    setSelectedThreadId(threadId ?? taskThread?.id ?? taskId);
    setFocusedTaskId(taskId);
    setPortalView("task");
    setScreen("ask-vaenyx");
    setMobileSidebarOpen(false);
  }

  const screenTitle = (value: Screen): string => t(`title.${value}`);
  const appShellStyle = {
    "--sidebar-width": `${sidebarWidth}px`,
  } as CSSProperties;
  // Enter-PIN re-check on every app open (Oskar, dev.169): the session
  // remembers its mode, but a gated mode asks for its PIN again each time
  // the app starts on this device.
  const [modePinOk, setModePinOk] = useState(
    () =>
      !workspace.mode?.hasEnterPin ||
      modePinVerifiedThisSession(workspace.mode.id),
  );
  // Device pairing + default mode (spec §6): register this device so the
  // Owner can see it, then land in its default mode on app open. Skipped
  // for the rest of a session in which the Owner explicitly exited, so
  // fixing a device's setting is always possible.
  useEffect(() => {
    const id = deviceId();
    void setDeviceMode(id, { label: deviceLabel(), register: true }).catch(
      () => undefined,
    );
    if (workspace.mode) return;
    let exited = false;
    try {
      exited = window.sessionStorage.getItem(DEVICE_APPLIED_KEY) === "exited";
    } catch {
      // Best-effort.
    }
    if (exited) return;
    void applyDeviceMode(id)
      .then((result) => {
        if (result.modeId) window.location.reload();
      })
      .catch(() => undefined);
  }, [workspace.mode]);

  return (
    <main className="app-shell" style={appShellStyle}>
      <ToastHost />
      {workspace.mode?.hasEnterPin && !modePinOk ? (
        <ModePinGate
          mode={workspace.mode}
          onVerified={() => setModePinOk(true)}
        />
      ) : null}
      {/* The floating hard-refresh button is gone (Oskar, 2026-07-27): it sat
          over every screen and, worse, its reload dropped the URL params, so
          "refresh" meant "lose your place". Loading a genuinely new build is
          what the update banner below is for. */}
      {systemStatus?.version ? (
        <span className="version-badge">v{systemStatus.version}</span>
      ) : null}
      {updateAvailable ? (
        <button
          className="update-banner"
          onClick={() => void hardRefresh()}
          type="button"
        >
          New version available — tap to refresh
        </button>
      ) : null}
      <aside className={`sidebar ${mobileSidebarOpen ? "mobile-open" : ""}`}>
        <div className="brand sidebar-brand">
          <img alt="Vaenyx" className="brand-mark brand-mark-img" src="/vaenyx-mark.svg" />
          <span>{workspace.mode?.agentName?.trim() || "Vaenyx"}</span>
          {/* The mode marker sits with the identity it belongs to (Oskar,
              dev.171) instead of floating over the sign-out row. */}
          {workspace.mode ? <ModeBadge mode={workspace.mode} /> : null}
        </div>

        <nav aria-label="Vaenyx navigation">
          <div aria-label="Create new Vaenyx work" className="sidebar-compose-switch">
            <button
              aria-label="Start a new Vaenyx conversation"
              className={
                screen === "ask-vaenyx" && portalView === "new" ? "active" : ""
              }
              onClick={startSidebarNew}
              type="button"
            >
              <span className="nav-label">New</span>
            </button>
          </div>
          {(() => {
            const scheduledTasks = workspace.tasks.filter(
              (task) => task.scheduleEnabled && task.scheduleCadence,
            );
            if (scheduledTasks.length === 0) return null;
            return (
              <div className="sidebar-scheduled">
                <button
                  aria-expanded={scheduledExpanded}
                  className="sidebar-scheduled-toggle"
                  onClick={() => setScheduledExpanded((open) => !open)}
                  type="button"
                >
                  <span
                    className={`sidebar-caret ${scheduledExpanded ? "open" : ""}`}
                  />
                  <span className="nav-label">Scheduled</span>
                  <span className="sidebar-scheduled-count">
                    {scheduledTasks.length}
                  </span>
                </button>
                {scheduledExpanded ? (
                  <div className="sidebar-scheduled-list">
                    {scheduledTasks.map((task) => {
                      const thread = workspace.threads.find(
                        (candidate) => candidate.taskId === task.id,
                      );
                      return (
                        <button
                          className="sidebar-scheduled-item"
                          key={task.id}
                          onClick={() => {
                            if (thread) openThreadTask(task.id, thread.id);
                          }}
                          title={describeSchedule(task)}
                          type="button"
                        >
                          <span className="sidebar-scheduled-name">
                            {task.title}
                          </span>
                          <small>{describeSchedule(task)}</small>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })()}
          <SidebarThreadTree
            selectedThreadId={selectedThreadId}
            workspace={workspace}
            onMoveThreadProject={(thread, nextProjectId) =>
              void moveWorkspaceThreadProject(thread, nextProjectId)
            }
            onOpenChat={openSourceConversation}
            onOpenTask={openThreadTask}
            onRenameThread={(thread, nextTitle) =>
              void renameWorkspaceThread(thread, nextTitle)
            }
            onSetThreadStatus={(thread, status) =>
              void setWorkspaceThreadStatus(thread, status)
            }
            onBulkArchive={(threads) => void archiveThreads(threads)}
            onBulkDelete={(threads) => void deleteThreads(threads)}
          />
        </nav>

        <div className="sidebar-bottom">
          <button
            className={
              screen === "ask-vaenyx"
                ? "sidebar-settings-button"
                : "sidebar-settings-button active"
            }
            onClick={() => openScreen("settings")}
            type="button"
          >
            Settings
          </button>
          <div className="owner-chip">
            <span>{workspace.owner.name.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{workspace.owner.name}</strong>
              <small>Instance owner</small>
            </div>
          </div>
          <button
            className="text-button"
            onClick={() => void onLogout()}
            type="button"
          >
            Sign Out
          </button>
        </div>
        <div
          aria-label="Resize sidebar"
          className="sidebar-resizer"
          onPointerDown={(event) => {
            event.preventDefault();
            setResizingSidebar(true);
          }}
          role="separator"
        />
      </aside>
      <button
        aria-label="Close navigation"
        className={`mobile-sidebar-backdrop ${
          mobileSidebarOpen ? "open" : ""
        }`}
        onClick={() => setMobileSidebarOpen(false)}
        type="button"
      />

      <section
        className={
          screen === "ask-vaenyx"
            ? "workspace-content portal-content"
            : "workspace-content"
        }
      >
        <button
          aria-label="Open navigation"
          className="mobile-sidebar-toggle"
          onClick={() => setMobileSidebarOpen(true)}
          type="button"
        >
          <span />
          <span />
          <span />
        </button>
        {screen === "ask-vaenyx" ? null : (
          <>
            <header className="workspace-header">
              <div>
                <p className="eyebrow">My Vaenyx</p>
                <h1>{screenTitle(screen)}</h1>
              </div>
              <div className="workspace-header-right">
                <div className="ready-chip">
                  <span />
                  {systemStatus?.status === "ready"
                    ? "Instance ready"
                    : "Checking"}
                </div>
                <button
                  className="admin-back"
                  onClick={() => setScreen("ask-vaenyx")}
                  type="button"
                >
                  {t("common.back")}
                </button>
              </div>
            </header>
            <nav aria-label="Workspace sections" className="admin-tabs">
              <button
                className={screen === "settings" ? "active" : ""}
                onClick={() => openScreen("settings")}
                type="button"
              >
                {t("title.settings")}
              </button>
              <button
                className={screen === "projects" ? "active" : ""}
                onClick={() => openScreen("projects")}
                type="button"
              >
                {t("title.projects")}
              </button>
              <button
                className={screen === "scheduled" ? "active" : ""}
                onClick={() => openScreen("scheduled")}
                type="button"
              >
                {t("title.scheduled")}
              </button>
              <button
                className={screen === "library" ? "active" : ""}
                onClick={() => void openLibrary()}
                type="button"
              >
                {t("title.library")}
              </button>
              <button
                className={screen === "community" ? "active" : ""}
                onClick={() => void openCommunity()}
                type="button"
              >
                {t("title.community")}
              </button>
              <button
                className={screen === "discord" ? "active" : ""}
                onClick={() => openScreen("discord")}
                type="button"
              >
                Discord
              </button>
              <button
                className={screen === "vaenyx-me" ? "active" : ""}
                onClick={() => openScreen("vaenyx-me")}
                type="button"
              >
                {t("title.vaenyx-me")}
              </button>
              <button
                className={screen === "guard" ? "active" : ""}
                onClick={() => void openGuard()}
                type="button"
              >
                {t("title.guard")}
              </button>
            </nav>
          </>
        )}

        {screen === "ask-vaenyx" ? (
          <AskVaenyxPanel
            agentName={settings?.agentName?.trim() || "Vaenyx"}
            composeKey={composeKey}
            conversations={askVaenyxConversations}
            libraryRoutines={libraryRoutines}
            onConversationsChange={setAskVaenyxConversations}
            onCreateTask={createTaskFromPortal}
            onDraftConversationStarted={openDraftConversation}
            onLibraryRefresh={() => {
              void fetchLibraryMethods().then(setLibraryMethods);
              void fetchLibraryRoutines().then(setLibraryRoutines);
            }}
            onOpenSettings={() => openScreen("settings")}
            onRequestedConversationHandled={() =>
              setRequestedConversationId(null)
            }
            onWorkspaceRefresh={refreshWorkspace}
            requestedConversationId={requestedConversationId}
            requestedProjectId={requestedProjectId}
            view={portalView}
            focusedTaskId={focusedTaskId}
            workspace={workspace}
          />
        ) : screen === "projects" ? (
          <ProjectsPanel
            memories={memories}
            onCreate={(project) =>
              onWorkspaceChange({
                ...workspace,
                projects: sortProjectsForSidebar([
                  ...workspace.projects,
                  project,
                ]),
              })
            }
            onCreateMemory={(memory) => {
              setMemories((current) => [memory, ...current]);
              onWorkspaceChange({
                ...workspace,
                projects: workspace.projects.map((project) =>
                  project.id === memory.projectId
                    ? { ...project, memoryCount: project.memoryCount + 1 }
                    : project,
                ),
              });
            }}
            onDeleteMemory={(memoryId) => {
              const deleted = memories.find((memory) => memory.id === memoryId);
              setMemories((current) =>
                current.filter((memory) => memory.id !== memoryId),
              );
              if (deleted) {
                onWorkspaceChange({
                  ...workspace,
                  projects: workspace.projects.map((project) =>
                    project.id === deleted.projectId
                      ? {
                          ...project,
                          memoryCount: Math.max(0, project.memoryCount - 1),
                        }
                      : project,
                  ),
                });
              }
            }}
            onUpdate={(updated) =>
              onWorkspaceChange({
                ...workspace,
                projects: sortProjectsForSidebar(
                  workspace.projects.map((project) =>
                    project.id === updated.id ? updated : project,
                  ),
                ),
              })
            }
            onUpdateMemory={(updated) =>
              setMemories((current) =>
                current.map((memory) =>
                  memory.id === updated.id ? updated : memory,
                ),
              )
            }
            workspace={workspace}
          />
        ) : screen === "library" ? (
          <LibraryArea
            appProfiles={appProfiles}
            methods={libraryMethods}
            routines={libraryRoutines}
            onUseRoutine={(id) => void useRoutineInChat(id)}
            onAppCreate={(result) => {
              setAppProfiles((current) => [result.profile, ...current]);
            }}
            onAppDisable={(disabledProfile) => {
              setAppProfiles((current) =>
                current.map((profile) =>
                  profile.id === disabledProfile.id ? disabledProfile : profile,
                ),
              );
            }}
            onAppUpdate={(updatedProfile) => {
              setAppProfiles((current) =>
                current.map((profile) =>
                  profile.id === updatedProfile.id ? updatedProfile : profile,
                ),
              );
            }}
            onAppDelete={(profileId) => {
              setAppProfiles((current) =>
                current.filter((profile) => profile.id !== profileId),
              );
            }}
            onMethodsRefresh={() => {
              void fetchLibraryMethods().then(setLibraryMethods);
            }}
            onRoutinesRefresh={() => {
              void fetchLibraryRoutines().then(setLibraryRoutines);
            }}
            skills={workspace.skills}
          />
        ) : screen === "community" ? (
          <CommunityArea
            methods={libraryMethods}
            routines={libraryRoutines}
            onMethodsRefresh={() => {
              void fetchLibraryMethods().then(setLibraryMethods);
            }}
            onRoutinesRefresh={() => {
              void fetchLibraryRoutines().then(setLibraryRoutines);
            }}
          />
        ) : screen === "discord" ? (
          // Discord got its own screen (Oskar, 2026-07-27): what it is, the
          // link, and the third-party notice that travels with it (D5) —
          // instead of crowding the top of the Community list.
          <section className="settings-card">
            <p className="eyebrow">Community</p>
            <h2>Discord</h2>
            <p className="settings-card-copy">
              {lang === "zh"
                ? "Vaenyx 用户聊天的地方 — 提问、展示你做的东西、看公告。"
                : "Where Vaenyx users talk — questions, showing what you built, and announcements."}
            </p>
            <p className="settings-card-copy">
              <a href="https://vaenyx.ai/discord" rel="noopener" target="_blank">
                {t("community.discord.link")}
              </a>
            </p>
            <p className="context-disclaimer">
              {t("legal.notice.community.discord")}
            </p>
          </section>
        ) : screen === "scheduled" ? (
          <ScheduledPanel
            tasks={workspace.tasks}
            onOpenTask={(taskId) => {
              const thread = workspace.threads.find(
                (candidate) => candidate.taskId === taskId,
              );
              if (thread) openThreadTask(taskId, thread.id);
            }}
            onTurnOff={(taskId) => void turnOffSchedule(taskId)}
          />
        ) : screen === "settings" && settings ? (
          <SettingsPanel
            onUpdate={setSettings}
            sessionMode={workspace.mode ?? null}
            settings={settings}
            systemStatus={systemStatus}
          />
        ) : screen === "vaenyx-me" ? (
          <VaenyxMePanel
            onProfileRefresh={async () =>
              onWorkspaceChange(await fetchWorkspace())
            }
            ownerName={workspace.owner.name}
            profile={
              workspace.vaenyxMe ?? { ownerModel: "digital-self", items: [] }
            }
          />
        ) : screen === "help" ? (
          <HelpPage />
        ) : (
          <GuardPanel events={auditEvents} />
        )}
      </section>
    </main>
  );
}

// The A-class legal documents with their formal titles (copy pack clause 6.5).
const LEGAL_DOCS: Array<{ name: string; en: string; zh: string }> = [
  { name: "terms-of-service", en: "Terms of Service", zh: "服务条款" },
  { name: "privacy-policy", en: "Privacy Policy", zh: "隐私政策" },
  {
    name: "implementation-status",
    en: "Implementation and Data-Handling Schedule",
    zh: "当前实现与数据处理明细表",
  },
  {
    name: "contributor-agreement",
    en: "Contributor Agreement",
    zh: "贡献者协议",
  },
  { name: "trademark-policy", en: "Trademark Policy", zh: "商标政策" },
  { name: "third-party-notices", en: "Third-Party Notices", zh: "第三方声明" },
  {
    name: "third-party-licenses",
    en: "Third-Party Licences (Release Manifest)",
    zh: "第三方许可(发行清单)",
  },
];

// Reader modal for one A-class document (operative text; notes stripped server-
// side). Reads at open time in the active language.
function LegalDocModal({
  name,
  onClose,
}: {
  name: string;
  onClose: () => void;
}) {
  const { lang } = useI18n();
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const doc = LEGAL_DOCS.find((entry) => entry.name === name);
  const title = doc ? (lang === "zh" ? doc.zh : doc.en) : name;

  useEffect(() => {
    let active = true;
    setMarkdown(null);
    setError(false);
    fetchLegalDocument(name, lang)
      .then((result) => {
        if (active) setMarkdown(result.markdown);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [name, lang]);

  return (
    <Modal onClose={onClose} title={title} variant="doc">
      <div className="legal-doc-body">
        {error ? (
          <p className="form-error">
            {lang === "zh" ? "无法加载文档。" : "Could not load the document."}
          </p>
        ) : markdown === null ? (
          <p className="settings-card-copy">
            {lang === "zh" ? "加载中…" : "Loading…"}
          </p>
        ) : (
          <MarkdownMessage content={markdown} />
        )}
      </div>
    </Modal>
  );
}

// Clickable A-class document titles; each opens the reader modal. `names` limits
// the set (e.g. the acceptance wizard shows only Terms + Privacy).
function LegalDocLinks({ names }: { names?: string[] }) {
  const { lang } = useI18n();
  const [open, setOpen] = useState<string | null>(null);
  const docs = names
    ? LEGAL_DOCS.filter((entry) => names.includes(entry.name))
    : LEGAL_DOCS;
  return (
    <>
      <div className="legal-doc-links">
        {docs.map((doc) => (
          <button
            className="text-button"
            key={doc.name}
            onClick={() => setOpen(doc.name)}
            type="button"
          >
            {lang === "zh" ? doc.zh : doc.en}
          </button>
        ))}
      </div>
      {open ? (
        <LegalDocModal name={open} onClose={() => setOpen(null)} />
      ) : null}
    </>
  );
}

// First-run acceptance gate (copy pack Part A; decision A, 2026-07-10). Shown to
// any Owner whose recorded A2 Terms/Privacy acceptance is older than the consent
// floor — a fresh install AND an existing instance both see it once, then never
// again, because the gate keys off the recorded acceptance, not "is this a fresh
// install". An editorial copy revision no longer brings it back. Fails OPEN on a
// lookup error so a transient hiccup can never lock the Owner out of their own
// instance.
const LEGAL_ACCEPT_CACHE = `vaenyx-legal-accepted-${LEGAL_CONSENT_FLOOR}`;

function InstallAcceptanceGate({ children }: { children: ReactNode }) {
  const [accepted, setAccepted] = useState<boolean | null>(() =>
    localStorage.getItem(LEGAL_ACCEPT_CACHE) === "1" ? true : null,
  );

  useEffect(() => {
    if (accepted !== null) return;
    let settled = false;
    const settle = (value: boolean) => {
      if (settled) return;
      settled = true;
      setAccepted(value);
    };
    // Fail OPEN on a stall too (not just a rejection): if the lookup neither
    // resolves nor rejects within 8s, let the Owner through so a hung request
    // can never lock them at the loading screen.
    const timer = setTimeout(() => settle(true), 8000);
    fetchLegalAcks()
      .then((acks) => {
        const has = (key: string) =>
          acks.some(
            (ack) =>
              ack.keyName === key &&
              legalVersionAtLeast(ack.copyVersion, LEGAL_CONSENT_FLOOR),
          );
        // A2 alone: the sharing card next to it is a preference, not a consent,
        // so an Owner who skipped it is not held at the gate forever.
        const done = has("legal.notice.firstRun.terms");
        if (done) localStorage.setItem(LEGAL_ACCEPT_CACHE, "1");
        clearTimeout(timer);
        settle(done);
      })
      .catch(() => {
        clearTimeout(timer);
        settle(true);
      });
    return () => {
      settled = true;
      clearTimeout(timer);
    };
  }, [accepted]);

  if (accepted === null) {
    return (
      <main className="loading-screen">
        <div>
          <img alt="Vaenyx" className="brand-mark brand-mark-img" src="/vaenyx-mark.svg" />
          <p>Loading…</p>
        </div>
      </main>
    );
  }
  if (accepted) return children;
  return (
    <InstallAcceptanceWizard
      onDone={() => {
        localStorage.setItem(LEGAL_ACCEPT_CACHE, "1");
        setAccepted(true);
      }}
    />
  );
}

// First-run step 3 (onboarding spec section 4): connect a model. The Owner
// has an app that cannot answer anything until one backend is reachable, so
// this asks once, right after the legal step — but it NEVER hard-locks: Skip
// is always one tap away and the composer then carries the reminder.
//
// Order is deliberate for a non-technical owner: the ChatGPT sign-in needs no
// key at all, then the free-tier keys, then everything else in Settings.
const MODEL_STEP_DONE_KEY = "vaenyx.modelStepDone";

const WIZARD_KEY_PROVIDERS = [
  { id: "gemini", label: "Google Gemini", note: "Free tier, no card" },
  { id: "groq", label: "Groq", note: "Free tier, very fast" },
  { id: "openai", label: "OpenAI", note: "Paid API key" },
  { id: "anthropic", label: "Claude", note: "Paid API key" },
];

function ModelConnectStep({ onDone }: { onDone: () => void }) {
  const { lang, t } = useI18n();
  const [providers, setProviders] = useState<ModelProviderInfo[]>([]);
  const [choice, setChoice] = useState<string>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codexWaiting, setCodexWaiting] = useState(false);
  const [codexUrl, setCodexUrl] = useState<string | null>(null);
  // Step 4: the completion page, shown after connecting or skipping.
  const [finished, setFinished] = useState(false);
  // Step 5, optional: the phone step — the same panel Settings → Phone
  // Access keeps permanently, so skipping here loses nothing.
  const [phoneSetup, setPhoneSetup] = useState(false);

  useEffect(() => {
    void fetchModelProviders()
      .then((result) => setProviders(result.providers))
      .catch(() => undefined);
  }, []);

  const zh = lang === "zh";
  const keyUrl = CONNECTABLE_MODELS.find(
    (model) => model.id === choice,
  )?.keyUrl;

  function finish() {
    try {
      window.localStorage.setItem(MODEL_STEP_DONE_KEY, "1");
    } catch {
      // Best-effort; the gate simply asks again next launch.
    }
    setFinished(true);
  }

  // Same flow as the Models panel (dev.111): the server drives the official
  // Codex CLI login and we poll until the provider reports healthy.
  async function signInCodex() {
    setBusy(true);
    setError(null);
    try {
      const { url, detail } = await startCodexLogin();
      if (detail) setError(detail);
      if (!url) {
        setBusy(false);
        return;
      }
      setCodexUrl(url);
      setCodexWaiting(true);
      window.open(url, "_blank", "noopener");
      for (let attempt = 0; attempt < 40; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const result = await fetchModelProviders().catch(() => null);
        const codex = result?.providers.find(
          (provider) => provider.id === "codex",
        );
        if (codex?.healthy) {
          finish();
          return;
        }
      }
      setError(
        zh
          ? "还没检测到登录完成。登录后可以直接点“稍后再说”,连接会自动生效。"
          : "Sign-in has not completed yet. You can press Skip — it will connect on its own once finished.",
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not start the sign-in.",
      );
    } finally {
      setBusy(false);
      setCodexWaiting(false);
    }
  }

  async function connectKey() {
    if (!apiKey.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await connectModelProvider(choice, {
        apiKey: apiKey.trim(),
      });
      const connected = result.providers.find(
        (provider) => provider.id === choice,
      );
      if (!connected?.healthy) {
        setError(
          connected?.detail ??
            (zh ? "这个 key 没能连上。" : "That key did not connect."),
        );
        return;
      }
      await setDefaultModelProvider(choice).catch(() => undefined);
      finish();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not connect that model.",
      );
    } finally {
      setBusy(false);
    }
  }

  const codexProvider = providers.find((provider) => provider.id === "codex");

  // Step 5 of the first run (onboarding Part 2 section 5): the real phone
  // step — detect, install, sign in, tunnel, then the QR — driven by the
  // shared Phone Access panel. Always skippable; Done and Skip both land in
  // the workspace, and Settings → Phone Access carries the same flow forever.
  if (finished && phoneSetup) {
    return (
      <main className="acceptance-screen">
        <div className="acceptance-card">
          <img alt="Vaenyx" className="brand-mark brand-mark-img" src="/vaenyx-mark.svg" />
          <h2>{zh ? "把 Vaenyx 装到手机上" : "Put Vaenyx on your phone"}</h2>
          <PhoneAccessPanel />
          <button
            className="primary-button acceptance-continue"
            onClick={onDone}
            type="button"
          >
            {zh ? "完成,开始使用" : "Done — Start Using Vaenyx"}
          </button>
          <p className="acceptance-fine">
            {zh
              ? "没弄完也没关系:设置 → 手机访问 里随时能接着做。"
              : "Unfinished is fine: Settings → Phone Access carries on from wherever you stop."}
          </p>
        </div>
      </main>
    );
  }

  // Step 4 of the first run (onboarding spec section 4): one screen that
  // points at something to try and at the phone/remote option, so the Owner
  // is never dropped into an empty app wondering what it is for.
  if (finished) {
    return (
      <main className="acceptance-screen">
        <div className="acceptance-card">
          <img alt="Vaenyx" className="brand-mark brand-mark-img" src="/vaenyx-mark.svg" />
          <h2>{zh ? "都设好了" : "You're set up"}</h2>
          <p className="settings-card-copy">
            {zh
              ? "Vaenyx 已经在这台电脑上运行。你的对话、笔记和文件都留在本机;发给已连接的云端模型的内容会去到那家服务商。"
              : "Vaenyx is running on this computer. Your chats, notes and files stay here; whatever you send to a connected cloud model goes to that provider."}
          </p>

          <section className="wizard-option">
            <strong>{zh ? "试试这个" : "Try this first"}</strong>
            <p className="settings-card-copy">
              {zh
                ? "在输入框里直接说人话,例如:「把这段乱糟糟的笔记整理成要点」,或者「每天早上 7 点给我一份 AI 新闻摘要」。"
                : "Just say it in plain words, for example: “Tidy these messy notes into bullet points”, or “every morning at 7, give me an AI news summary”."}
            </p>
            <p className="settings-card-copy">
              {zh
                ? "资源库里已经放好一个示例 Routine,可以直接用来看看效果。"
                : "A sample Routine is already in your Library if you want to see one working."}
            </p>
          </section>

          <section className="wizard-option">
            <strong>{zh ? "想在手机上用?" : "Want it on your phone?"}</strong>
            <p className="settings-card-copy">
              {zh
                ? "三步把 Vaenyx 加到手机主屏:装上 Tailscale、登录、开启加密通道,然后用手机扫一个码。全程在这里引导完成。"
                : "Three steps put Vaenyx on the phone's Home Screen: install Tailscale, sign in, turn on the encrypted channel — then scan one code with the phone. Everything is guided right here."}
            </p>
            <button
              className="secondary-button"
              onClick={() => setPhoneSetup(true)}
              type="button"
            >
              {zh ? "现在设置手机" : "Set Up The Phone Now"}
            </button>
            <p className="acceptance-fine">
              {zh
                ? "可选,随时都能做:以后在 设置 → 手机访问 里也是同一套流程。"
                : "Optional, any time: Settings → Phone Access keeps this exact flow."}
            </p>
          </section>

          <button
            className="primary-button acceptance-continue"
            onClick={onDone}
            type="button"
          >
            {zh ? "开始使用" : "Start Using Vaenyx"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="acceptance-screen">
      <div className="acceptance-card">
        <img alt="Vaenyx" className="brand-mark brand-mark-img" src="/vaenyx-mark.svg" />
        <h2>{zh ? "连接第一个模型" : "Connect your first model"}</h2>
        <p className="settings-card-copy">
          {zh
            ? "Vaenyx 本身不含 AI 模型 —— 它替你调用你自己的模型账号。选一个就能开始,以后随时能改或加。"
            : "Vaenyx has no AI model of its own — it uses an account you control. Pick one to get started; you can change or add more later."}
        </p>

        <section className="wizard-option">
          <strong>{zh ? "① 用 ChatGPT 登录" : "1. Sign in with ChatGPT"}</strong>
          <p className="settings-card-copy">
            {zh
              ? "有 ChatGPT 订阅就选这个:不用 API key,浏览器登录一次即可。"
              : "Best if you have a ChatGPT subscription: no API key, just one browser sign-in."}
          </p>
          {codexProvider?.healthy ? (
            <span className="library-chip chip-published">
              {zh ? "已连接" : "Connected"}
            </span>
          ) : (
            <button
              className="primary-button"
              disabled={busy}
              onClick={() => void signInCodex()}
              type="button"
            >
              {codexWaiting
                ? zh
                  ? "等待登录完成…"
                  : "Waiting For Sign-In..."
                : zh
                  ? "用 ChatGPT 登录"
                  : "Sign In With ChatGPT"}
            </button>
          )}
          {codexUrl ? (
            <a
              className="model-key-link"
              href={codexUrl}
              rel="noreferrer"
              target="_blank"
            >
              {zh ? "没弹出窗口?点这里打开登录页 ↗" : "No window? Open the sign-in page ↗"}
            </a>
          ) : null}
        </section>

        <section className="wizard-option">
          <strong>{zh ? "② 粘一个 API key" : "2. Paste an API key"}</strong>
          <p className="settings-card-copy">
            {zh
              ? "Gemini 和 Groq 有免费额度,不用信用卡。"
              : "Gemini and Groq have a free tier and need no credit card."}
          </p>
          <label className="chat-font-field">
            {zh ? "选择" : "Provider"}
            <select
              className="task-select"
              onChange={(event) => {
                setChoice(event.target.value);
                setApiKey("");
                setError(null);
              }}
              value={choice}
            >
              {WIZARD_KEY_PROVIDERS.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.label} — {provider.note}
                </option>
              ))}
            </select>
          </label>
          {keyUrl ? (
            <a
              className="model-key-link"
              href={keyUrl}
              rel="noreferrer"
              target="_blank"
            >
              {zh ? "去拿一个 API key ↗" : "Get an API key ↗"}
            </a>
          ) : null}
          <input
            autoCapitalize="off"
            autoComplete="off"
            className="method-rename-input key-input"
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={zh ? "粘贴 API key" : "Paste the API key"}
            spellCheck={false}
            type="text"
            value={apiKey}
          />
          {/* F1 / TPN n.3: the third-party notice must render on every
              surface where a cloud model is connected. */}
          <p className="context-disclaimer">
            {t("legal.notice.modelConnect.cloud")}
          </p>
          <button
            className="primary-button"
            disabled={busy || !apiKey.trim()}
            onClick={() => void connectKey()}
            type="button"
          >
            {zh ? "连接" : "Connect"}
          </button>
        </section>

        {error ? <p className="form-error">{error}</p> : null}

        <button
          className="text-button"
          disabled={busy}
          onClick={finish}
          type="button"
        >
          {zh ? "稍后再说" : "Skip for now"}
        </button>
        <p className="acceptance-fine">
          {zh
            ? "跳过也能逛遍界面。设置 → AI Settings → Models 里随时能连。"
            : "Skipping is fine — you can look around, and connect later in Settings → AI Settings → Models."}
        </p>
      </div>
    </main>
  );
}

// Gate around the workspace: show the connect step once, on an install that
// has no working model yet. Fails OPEN on any error or slow reply, exactly
// like the acceptance gate — a provider-list hiccup must never strand the
// Owner on a wizard.
function ModelConnectGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState<boolean | null>(() => {
    try {
      return window.localStorage.getItem(MODEL_STEP_DONE_KEY) === "1"
        ? true
        : null;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (ready !== null) return;
    let settled = false;
    const settle = (value: boolean) => {
      if (!settled) {
        settled = true;
        setReady(value);
      }
    };
    const timer = window.setTimeout(() => settle(true), 8000);
    void fetchModelProviders()
      .then((result) => {
        // `connected` is true for Codex even with no CLI installed; only
        // `healthy` means a model can actually answer.
        const usable = result.providers.some((provider) => provider.healthy);
        if (usable) {
          try {
            window.localStorage.setItem(MODEL_STEP_DONE_KEY, "1");
          } catch {
            // Best-effort.
          }
        }
        settle(usable);
      })
      .catch(() => settle(true))
      .finally(() => window.clearTimeout(timer));
    return () => window.clearTimeout(timer);
  }, [ready]);

  if (ready === null) {
    return (
      <main className="loading-screen">
        <img alt="Vaenyx" className="brand-mark brand-mark-img" src="/vaenyx-mark.svg" />
        <p>Loading…</p>
      </main>
    );
  }
  if (ready) return <>{children}</>;
  return <ModelConnectStep onDone={() => setReady(true)} />;
}

// The install-time acceptance screen: A1 (AI notice), A3 (the sharing-preference
// card), then A2 (the Continue tap is the Terms acceptance event).
//
// A3 stopped being a consent at copy 2.6: sharing does not exist in this
// version, so the old card recommended consenting to nothing and wrote an
// acknowledgement record for an authorisation nobody gave. The card still asks
// — an answer is required to continue — but the answer is interest, stored as
// an ordinary local setting. Neither option is pre-selected or recommended.
// The forced *affirmative consent* moves to where it bites: the day sharing
// actually becomes available.
function InstallAcceptanceWizard({ onDone }: { onDone: () => void }) {
  const { lang, t } = useI18n();
  const [choice, setChoice] = useState<
    "interested" | "not-interested" | null
  >(null);
  const [busy, setBusy] = useState(false);

  function proceed() {
    if (!choice || busy) return;
    setBusy(true);
    // Fire-and-forget both writes (best-effort, clause 2.3) and release the gate
    // immediately — never block the Owner behind a network write.
    void recordLegalAck({
      keyName: "legal.notice.firstRun.terms",
      copyVersion: LEGAL_COPY_VERSION,
      language: lang,
      choice: "accepted",
    }).catch(() => {});
    void setSharingPreference(choice).catch(() => {});
    onDone();
  }

  return (
    <main className="acceptance-screen">
      <div className="acceptance-card">
        <img alt="Vaenyx" className="brand-mark brand-mark-img" src="/vaenyx-mark.svg" />
        <p className="acceptance-ai">
          {t("legal.disclaimer.aiGeneral.firstRun")}
        </p>

        <section className="acceptance-flywheel">
          <h2>{t("legal.notice.flywheel.preference.title")}</h2>
          {/* The body ships under the bare key the copy pack's A3 block is named
              for, so audit-copy.mjs compares it word for word. */}
          <p>{t("legal.notice.flywheel.preference")}</p>
          {/* Both buttons carry the same weight: neither is recommended. */}
          <div className="acceptance-choices">
            <button
              aria-pressed={choice === "interested"}
              className={`secondary-button${choice === "interested" ? " selected" : ""}`}
              onClick={() => setChoice("interested")}
              type="button"
            >
              {t("legal.notice.flywheel.preference.interested")}
            </button>
            <button
              aria-pressed={choice === "not-interested"}
              className={`secondary-button${choice === "not-interested" ? " selected" : ""}`}
              onClick={() => setChoice("not-interested")}
              type="button"
            >
              {t("legal.notice.flywheel.preference.notInterested")}
            </button>
          </div>
        </section>

        <p className="acceptance-terms">{t("legal.notice.firstRun.terms")}</p>
        <LegalDocLinks names={["terms-of-service", "privacy-policy"]} />
        <button
          className="primary-button acceptance-continue"
          disabled={!choice || busy}
          onClick={() => void proceed()}
          type="button"
        >
          {busy ? "…" : lang === "zh" ? "继续" : "Continue"}
        </button>
      </div>
    </main>
  );
}

export function App() {
  const [bootstrap, setBootstrap] = useState<BootstrapStatus | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);

  async function loadAuthenticatedWorkspace() {
    const nextBootstrap = await fetchBootstrapStatus();
    setBootstrap(nextBootstrap);

    if (nextBootstrap.authenticated) {
      setWorkspace(await fetchWorkspace());
    } else {
      setWorkspace(null);
    }
  }

  useEffect(() => {
    Promise.all([
      loadAuthenticatedWorkspace(),
      fetchSystemStatus().then(setSystemStatus),
    ]).catch((error: unknown) => {
      setFatalError(
        error instanceof Error ? error.message : "Vaenyx could not start.",
      );
    });
  }, []);

  async function logout() {
    await logoutOwner();
    await loadAuthenticatedWorkspace();
  }

  if (fatalError) {
    return (
      <main className="loading-screen">
        <div>
          <img alt="Vaenyx" className="brand-mark brand-mark-img" src="/vaenyx-mark.svg" />
          <h1>Vaenyx needs attention.</h1>
          <p>{fatalError}</p>
        </div>
      </main>
    );
  }

  if (!bootstrap) {
    return (
      <main className="loading-screen">
        <div>
          <img alt="Vaenyx" className="brand-mark brand-mark-img" src="/vaenyx-mark.svg" />
          <p>Starting your private Vaenyx Instance...</p>
        </div>
      </main>
    );
  }

  if (!bootstrap.authenticated) {
    return (
      <AuthScreen
        bootstrap={bootstrap}
        onAuthenticated={loadAuthenticatedWorkspace}
      />
    );
  }

  // Authenticated but the workspace is still loading: show the loading screen,
  // never the login page (otherwise login flashes for a logged-in owner on every
  // open, between bootstrap resolving and the workspace arriving).
  if (!workspace) {
    return (
      <main className="loading-screen">
        <div>
          <img alt="Vaenyx" className="brand-mark brand-mark-img" src="/vaenyx-mark.svg" />
          <p>Loading your workspace...</p>
        </div>
      </main>
    );
  }

  return (
    <InstallAcceptanceGate>
      <ModelConnectGate>
        <VaenyxWorkspace
          onLogout={logout}
          onWorkspaceChange={setWorkspace}
          systemStatus={systemStatus}
          workspace={workspace}
        />
      </ModelConnectGate>
    </InstallAcceptanceGate>
  );
}
