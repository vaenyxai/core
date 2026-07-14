import {
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  AgentProfile,
  AppProfile,
  AskVaenyxConversation,
  AskVaenyxMessage,
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
  fetchCatalogue,
  installRoutineFromCatalogue,
  installMethodFromCatalogue,
  recordLegalAck,
  fetchLegalAcks,
  fetchLegalDocument,
  fetchChatRoutineData,
  runRoutineInChat,
  attachRoutineToChat,
  classifyMessage,
  fetchModelProviders,
  connectModelProvider,
  disconnectModelProvider,
  setDefaultModelProvider,
  setReasoningEffort,
  setChatProvider,
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
  rejectVaenyxMeCandidate,
  renameMethod,
  renameMethodTag,
  setMethodTags,
  streamAskVaenyxMessage,
  streamTaskMessage,
  retryTask,
  setTaskSchedule,
  setupOwner,
  shutdownVaenyx,
  testChatConnection,
  testForgeConnection,
  fetchPublishState,
  publishMethodToCommunity,
  publishRoutineToCommunity,
  type PublishAcceptance,
  setPublishDisplayName,
  testRunMethod,
  updateAppProfile,
  updateMemory,
  updateProject,
  updateSettings,
  updateVaenyxThreadProject,
  updateVaenyxThreadStatus,
  updateVaenyxThreadTitle,
} from "./api.js";
import { MarkdownMessage } from "./MarkdownMessage.js";
import { useI18n } from "./i18n.js";
import {
  getCodexAuthCopy,
  getProviderConnectionCopy,
  getProviderConnectionDetail,
} from "./status-copy.js";

type Screen =
  | "ask-vaenyx"
  | "projects"
  | "library"
  | "modes"
  | "settings"
  | "vaenyx-me"
  | "guard"
  | "scheduled"
  | "help";

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
  window.location.replace(`${window.location.pathname}?r=${Date.now()}`);
}

function formatTime(value: string | null): string {
  if (!value) return "In progress";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDuration(durationMs: number): string {
  return `${(durationMs / 1000).toFixed(1)}s`;
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

function ThinkingIndicator({ seconds }: { seconds: number }): ReactNode {
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
      <span className="thinking-elapsed">{seconds}s</span>
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
          <span className="brand-mark">V</span>
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
  const { t } = useI18n();
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

  const methodName = (id: string) =>
    methods.find((method) => method.id === id)?.name ?? id;
  const routineName = (id: string | null) =>
    routines.find((routine) => routine.id === id)?.name ?? id ?? "—";

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
            App name
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
                  <small>
                    Token {profile.tokenPrefix} · Created{" "}
                    {formatTime(profile.createdAt)}
                  </small>
                </div>
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
                </dl>
                {createdToken?.profileId === profile.id ? (
                  <div className="token-once">
                    <strong>Save this token now. It is shown only once.</strong>
                    <TokenField token={createdToken.token} />
                    <p>
                      Vaenyx stores only an irreversible fingerprint, so this full
                      token cannot be shown again after you leave this page.
                    </p>
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

interface DraftMode {
  id: string;
  name: string;
  rules: string;
  lockSettings: boolean;
  localOnly: boolean;
  enterPin: string;
  exitPin: string;
}

// Custom Mode interface — a front-end preview of the design (spec §6). Not wired
// to a backend yet: modes added here live only in this session so the layout and
// flow can be reviewed.
function ModesPanel() {
  const [modes, setModes] = useState<DraftMode[]>([]);
  const [name, setName] = useState("");
  const [rules, setRules] = useState("");
  const [lockSettings, setLockSettings] = useState(false);
  const [localOnly, setLocalOnly] = useState(false);
  const [enterPin, setEnterPin] = useState("");
  const [exitPin, setExitPin] = useState("");

  function addMode(template?: { name: string; rules: string }) {
    const draftName = template?.name ?? name.trim();
    if (!draftName) return;
    setModes((current) => [
      {
        id: crypto.randomUUID(),
        name: draftName,
        rules: template?.rules ?? rules.trim(),
        lockSettings,
        localOnly,
        enterPin,
        exitPin,
      },
      ...current,
    ]);
    if (!template) {
      setName("");
      setRules("");
      setLockSettings(false);
      setLocalOnly(false);
      setEnterPin("");
      setExitPin("");
    }
  }

  return (
    <div className="modes-layout">
      <p className="modes-preview-note">
        Preview — this is the Custom Mode interface design. It is not wired to the
        backend yet, so modes added here are not saved.
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
              key={template.name}
              onClick={() => addMode(template)}
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
            addMode();
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
            Enter PIN (optional)
            <input
              inputMode="numeric"
              onChange={(event) => setEnterPin(event.target.value)}
              placeholder="Leave blank for none"
              value={enterPin}
            />
          </label>
          <label>
            Exit PIN (optional — locks the mode)
            <input
              inputMode="numeric"
              onChange={(event) => setExitPin(event.target.value)}
              placeholder="Leave blank for none"
              value={exitPin}
            />
          </label>
          <button className="primary-button" type="submit">
            Add mode
          </button>
        </form>
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
                  <button
                    className="text-button"
                    onClick={() =>
                      setModes((current) =>
                        current.filter((item) => item.id !== mode.id),
                      )
                    }
                    type="button"
                  >
                    Remove
                  </button>
                </div>
                {mode.rules ? <p>{mode.rules}</p> : null}
                <div className="modes-tags">
                  {mode.lockSettings ? (
                    <span className="library-chip">Settings locked</span>
                  ) : null}
                  {mode.localOnly ? (
                    <span className="library-chip">Local only</span>
                  ) : null}
                  {mode.enterPin ? (
                    <span className="library-chip">Enter PIN</span>
                  ) : null}
                  {mode.exitPin ? (
                    <span className="library-chip">Exit PIN · locked</span>
                  ) : null}
                </div>
                <p className="library-note">
                  Supervision: view window + push alerts to User Mode (coming).
                </p>
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
  conversations,
  libraryRoutines,
  onConversationsChange,
  onCreateTask,
  onDraftConversationStarted,
  onRequestedConversationHandled,
  onWorkspaceRefresh,
  requestedConversationId,
  requestedProjectId,
  view,
  focusedTaskId,
  workspace,
}: {
  conversations: AskVaenyxConversation[];
  libraryRoutines: LibraryRoutineSummary[];
  focusedTaskId: string | null;
  onConversationsChange: (conversations: AskVaenyxConversation[]) => void;
  onCreateTask: (
    content: string,
    sourceChatId?: string | null,
    projectId?: string | null,
  ) => Promise<Task>;
  onDraftConversationStarted: (conversationId: string) => void;
  onRequestedConversationHandled: () => void;
  onWorkspaceRefresh: () => Promise<void>;
  requestedConversationId: string | null;
  requestedProjectId: string | null;
  composeKey: number;
  view: PortalView;
  workspace: Workspace;
}) {
  const { lang, t } = useI18n();
  // C2 health gate: acceptance is durable (per copy version); "Not Now" only
  // withholds for this session and re-fires next health chat.
  const [healthAck, setHealthAck] = useState(
    () =>
      localStorage.getItem(`vaenyx-health-ack-${LEGAL_COPY_VERSION}`) === "1",
  );
  const [healthGateDismissed, setHealthGateDismissed] = useState(false);
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
  useEffect(() => {
    let active = true;
    void fetchModelProviders()
      .then((result) => {
        if (active) {
          setChatProviders(
            result.providers.filter((provider) => provider.connected),
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
  const [thinkingSeconds, setThinkingSeconds] = useState(0);

  useEffect(() => {
    if (!sending && !sendingTaskMessage) {
      return;
    }
    setThinkingSeconds(0);
    const startedAt = Date.now();
    const timer = setInterval(() => {
      setThinkingSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [sending, sendingTaskMessage]);

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

  useEffect(() => {
    if (!requestedConversationId) return;

    if (requestedConversationId === activeConversationId) {
      onRequestedConversationHandled();
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

  useEffect(() => {
    if (view !== "chat") return;
    chatEndRef.current?.scrollIntoView({ block: "end" });
  }, [loadingMessages, messages.length, sending, view]);

  useEffect(() => {
    if (view !== "task") return;
    taskEndRef.current?.scrollIntoView({ block: "end" });
  }, [loadingTaskMessages, sendingTaskMessage, taskMessages.length, view]);

  // Routine chat: a message feeds the Routine. The fed-in note lands in the
  // Journal, the generated result in the Gallery; we refresh both from the server.
  // A multi-field routine answers with a needs-confirmation payload instead of
  // running — we open the confirm card and re-post with the confirmed `input`.
  async function runRoutineMessage(
    conversationId: string,
    routineId: string,
    content: string,
    input?: Record<string, unknown>,
    learn?: boolean,
  ): Promise<void> {
    setSending(true);
    setError(null);
    setPrompt("");
    setCapabilityTab("chat");
    const tempId = `pending-journal-${crypto.randomUUID()}`;
    const startedAt = new Date().toISOString();
    setRoutineJournal((current) => [
      { id: tempId, routineId, chatId: conversationId, content, createdAt: startedAt },
      ...current,
    ]);
    try {
      const result = await runRoutineInChat(
        conversationId,
        content,
        input,
        learn,
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
        setRoutineInputConfirm({
          conversationId,
          routineId,
          content,
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
    const input: Record<string, unknown> = {};
    for (const field of confirm.fields) {
      if (field.type === "boolean") {
        input[field.key] = confirm.checks[field.key] === true;
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
    // Did the Owner edit any field from the AI's prefill? Only a real correction
    // is worth saving as a local few-shot example.
    const edited = confirm.fields.some((field) =>
      field.type === "boolean"
        ? confirm.checks[field.key] !== confirm.initialChecks[field.key]
        : (confirm.values[field.key] ?? "") !==
          (confirm.initialValues[field.key] ?? ""),
    );
    setRoutineInputConfirm(null);
    void runRoutineMessage(
      confirm.conversationId,
      confirm.routineId,
      confirm.content,
      input,
      edited,
    );
  }

  async function sendChatContent(content: string): Promise<void> {
    if (activeThread?.routineId && activeConversationId) {
      await runRoutineMessage(
        activeConversationId,
        activeThread.routineId,
        content,
      );
      return;
    }

    // AI-driven: in an ongoing plain chat, let Vaenyx judge whether this calls for
    // a Routine or a background Task. use-routine → turn this chat into a routine
    // chat and run now; use-task → start a background task; suggest-* → reply
    // normally but briefly offer it; none → plain reply. Conservative, best-effort.
    let suggestRoutineId: string | undefined;
    let suggestTask = false;
    if (
      activeConversationId &&
      messageMaybeIntent(content, messages, libraryRoutines)
    ) {
      setSending(true);
      let verdict: Awaited<ReturnType<typeof classifyMessage>> | null = null;
      try {
        verdict = await classifyMessage(activeConversationId, content);
      } catch {
        // Best-effort: leave verdict null and fall through to a plain reply.
      }
      if (verdict?.decision === "use-routine" && verdict.routineId) {
        try {
          await attachRoutineToChat(activeConversationId, verdict.routineId);
          await onWorkspaceRefresh();
          setSending(false);
          await runRoutineMessage(
            activeConversationId,
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
          await onCreateTask(
            verdict.taskRequest,
            activeConversationId,
            activeThread?.projectId ?? null,
          );
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
    }

    setSending(true);
    setError(null);
    let createdConversationId: string | null = null;
    const controller = new AbortController();
    streamControllerRef.current = controller;
    const tempOwnerId = `pending-owner-${crypto.randomUUID()}`;
    const tempAssistantId = `pending-assistant-${crypto.randomUUID()}`;

    try {
      let conversationId = activeConversationId;
      let nextConversations = conversations;

      if (!conversationId) {
        const conversation = await createAskVaenyxConversation({
          projectId: composeProjectId || generalProjectId,
        });
        conversationId = conversation.id;
        nextConversations = upsertConversation(conversations, conversation);
        onConversationsChange(nextConversations);
        setActiveConversationId(conversation.id);
        createdConversationId = conversation.id;
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
          onDelta: (text) =>
            setMessages((current) =>
              current.map((message) =>
                message.id === tempAssistantId
                  ? { ...message, content: message.content + text }
                  : message,
              ),
            ),
        },
        suggestRoutineId,
        suggestTask,
      );

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
      }
    } finally {
      streamControllerRef.current = null;
      setSending(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = prompt.trim();
    if (!content) return;

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

  async function sendTaskContent(content: string): Promise<void> {
    const trimmed = content.trim();
    if (!trimmed || !focusedTaskId) return;
    const taskId = focusedTaskId;

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
      const response = await streamTaskMessage(taskId, trimmed, {
        signal: controller.signal,
        onOwner: (ownerMessage) =>
          setTaskMessages((current) =>
            current.map((message) =>
              message.id === tempOwnerId ? ownerMessage : message,
            ),
          ),
        onDelta: (text) =>
          setTaskMessages((current) =>
            current.map((message) =>
              message.id === tempAssistantId
                ? { ...message, content: message.content + text }
                : message,
            ),
          ),
      });
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
    }
  }

  async function sendFocusedTaskMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = taskPrompt.trim();
    if (!content || !focusedTaskId) return;

    await sendTaskContent(content);
    setTaskPrompt("");
  }

  function retryTaskMessage(list: AskVaenyxMessage[], failedIndex: number) {
    if (sendingTaskMessage) return;
    const content = precedingOwnerContent(list, failedIndex);
    if (content) {
      void sendTaskContent(content);
    }
  }

  // Stop the in-flight streaming reply. Aborting closes the connection, which
  // the server sees and uses to cancel the model turn.
  function stopStreaming() {
    streamControllerRef.current?.abort();
  }

  async function startWork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = startWorkPrompt.trim();
    if (!content) return;
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
    return (
      <div className="simple-compose-shell">
        <form className="simple-compose-panel" onSubmit={startWork}>
          <div className="simple-compose-header">
            <h2>Where should we begin?</h2>
          </div>

          <div className="simple-compose-box">
            <textarea
              autoFocus
              maxLength={10_000}
              onChange={(event) => setStartWorkPrompt(event.target.value)}
              placeholder="Ask anything"
              required
              rows={2}
              value={startWorkPrompt}
            />
            <button
              className="primary-button"
              disabled={sending || !startWorkPrompt.trim()}
              type="submit"
            >
              {sending ? "Sending" : "Send"}
            </button>
          </div>

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
    const confirmMissing = routineInputConfirm
      ? routineInputConfirm.fields
          .filter(
            (field) =>
              field.required &&
              field.type !== "boolean" &&
              (routineInputConfirm.values[field.key] ?? "").trim() === "",
          )
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
        <header className="ask-vaenyx-chat-header">
          <div className="focused-title-line">
            <h2>{activeConversation?.title?.trim() || "Vaenyx Chat"}</h2>
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

        {routineInputConfirm ? (
          <Modal
            onClose={() => setRoutineInputConfirm(null)}
            title={t("routine.confirm.title")}
          >
            <p className="settings-card-copy">{t("routine.confirm.copy")}</p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                margin: "10px 0",
              }}
            >
              {routineInputConfirm.fields.map((field) => (
                <label
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
                      rows={field.type === "array" ? 3 : 2}
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
                    `vaenyx-health-ack-${LEGAL_COPY_VERSION}`,
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

        <div className="ask-vaenyx-messages">
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
                    </article>
                  ),
                )}
                {sending ? (
                  <article className="ask-vaenyx-message assistant completed">
                    <div className="ask-vaenyx-message-head">
                      <strong>Vaenyx</strong>
                    </div>
                    <ThinkingIndicator seconds={thinkingSeconds} />
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
                key={message.id}
              >
                <div className="ask-vaenyx-message-head">
                  <strong>{message.role === "owner" ? "You" : "Vaenyx"}</strong>
                  <small>{formatTime(message.createdAt)}</small>
                </div>
                {message.role === "owner" ? (
                  <p>{message.content}</p>
                ) : message.content ? (
                  <MarkdownMessage content={message.content} />
                ) : (
                  <ThinkingIndicator seconds={thinkingSeconds} />
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
                {message.role !== "owner" &&
                message.content &&
                message.status !== "failed" &&
                !message.id.startsWith("pending-assistant") ? (
                  <div className="message-footer">
                    <span aria-hidden="true">✓</span>
                    {formatTime(message.createdAt)}
                  </div>
                ) : null}
              </article>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        <form className="ask-vaenyx-composer" onSubmit={sendMessage}>
          <div className="ask-vaenyx-composer-box">
            <textarea
              maxLength={10_000}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={isRoutine ? "Type or paste a note…" : "Ask anything"}
              required
              rows={2}
              value={prompt}
            />
            {sending ? (
              <button
                className="primary-button stop-button"
                onClick={stopStreaming}
                type="button"
              >
                Stop
              </button>
            ) : (
              <button
                className="primary-button"
                disabled={!prompt.trim()}
                type="submit"
              >
                {isRoutine ? "Run" : "Send"}
              </button>
            )}
          </div>
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
                        ? { ...conversation, modelProviderId: next }
                        : conversation,
                    ),
                  );
                  void setChatProvider(activeConversationId, next);
                }}
                title={t("legal.notice.modelPicker")}
                value={activeConversation?.modelProviderId ?? ""}
              >
                <option value="">
                  Default (
                  {chatProviders.find((provider) => provider.isDefault)?.name ??
                    "Codex"}
                  )
                </option>
                {chatProviders.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="composer-model">ChatGPT</span>
            )}
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
          </div>
          <p className="composer-disclaimer">
            {t("legal.disclaimer.aiGeneral.composer")}
          </p>
          {error ? <p className="form-error">{error}</p> : null}
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

    return (
      <div className="focused-workspace">
        <section className="ask-vaenyx-chat focused-task-panel">
          <header className="ask-vaenyx-chat-header">
            <div className="focused-task-title">
              <div className="focused-title-line">
                <h2>{focusedTask.title}</h2>
                {renderThreadHeaderMenu(focusedTaskThread)}
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
                  ) : (
                    <button
                      className="task-toolbar-action"
                      onClick={() => void retryFocusedTask(focusedTask.id)}
                      type="button"
                    >
                      Run again
                    </button>
                  )}
                  {taskRuns.length > 0 ? (
                    <details className="task-runs">
                      <summary>History ({taskRuns.length})</summary>
                      <ul>
                        {taskRuns.map((run) => (
                          <li className="task-run" key={run.id}>
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
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                  {focusedTask.scheduleEnabled && focusedTask.nextRunAt ? (
                    <span className="task-next">
                      Next {formatTime(focusedTask.nextRunAt)}
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
                  key={message.id}
                >
                  <div className="ask-vaenyx-message-head">
                    <strong>
                      {message.role === "owner" ? "You" : agentName}
                    </strong>
                    <small>{formatTime(message.createdAt)}</small>
                  </div>
                  {message.role === "owner" ? (
                    <p>{message.content}</p>
                  ) : message.content ? (
                    <MarkdownMessage content={message.content} />
                  ) : (
                    <ThinkingIndicator seconds={thinkingSeconds} />
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
                  {message.role !== "owner" &&
                  message.content &&
                  message.status !== "failed" &&
                  !message.id.startsWith("pending-assistant") ? (
                    <div className="message-footer">
                      <span aria-hidden="true">✓</span>
                      {formatTime(message.createdAt)}
                    </div>
                  ) : null}
                </article>
              ))
            )}
            <div ref={taskEndRef} />
          </div>

          <form
            className="ask-vaenyx-composer"
            onSubmit={sendFocusedTaskMessage}
          >
            <div className="ask-vaenyx-composer-box">
              <textarea
                maxLength={10_000}
                onChange={(event) => setTaskPrompt(event.target.value)}
                placeholder="Ask about this task"
                required
                rows={2}
                value={taskPrompt}
              />
              {sendingTaskMessage ? (
                <button
                  className="primary-button stop-button"
                  onClick={stopStreaming}
                  type="button"
                >
                  Stop
                </button>
              ) : (
                <button
                  className="primary-button"
                  disabled={!taskPrompt.trim()}
                  type="submit"
                >
                  Send
                </button>
              )}
            </div>
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
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
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

  return (
    <div className="modal-overlay" role="dialog" aria-label={title} aria-modal="true">
      <div className="modal-card">
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
    </div>
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
function HelpPage() {
  const { lang, t } = useI18n();
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setMarkdown(null);
    setError(null);
    void (async () => {
      try {
        const result = await fetchGlossary(lang);
        if (active) setMarkdown(result.markdown);
      } catch {
        if (active) setError(t("help.error"));
      }
    })();
    return () => {
      active = false;
    };
  }, [lang, t]);

  return (
    <div className="settings-layout">
      <section className="settings-card help-page">
        {error ? (
          <p className="form-error">{error}</p>
        ) : markdown === null ? (
          <p className="settings-card-copy">{t("help.loading")}</p>
        ) : markdown.trim() === "" ? (
          <p className="settings-card-copy">{t("help.empty")}</p>
        ) : (
          <MarkdownMessage content={markdown} />
        )}
      </section>
    </div>
  );
}

// Settings → Sharing (copy pack I1): the flywheel sharing mode selector. The
// install-time A3 choice maps accept → Automatic and decline → Off; a change
// here appends a fresh consent record (clause 2.3) with the mode as the choice.
// No sharing engine uploads anything yet — the recorded mode is the operative
// choice the engine honours when flywheel sharing ships.
function SharingPanel() {
  const { lang, t } = useI18n();
  const [mode, setMode] = useState<"automatic" | "review-each" | "off" | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetchLegalAcks()
      .then((acks) => {
        if (!active) return;
        const row = acks.find(
          (ack) => ack.keyName === "legal.consent.flywheel",
        );
        const choice = row?.choice ?? null;
        // No recorded choice reads as Off: nothing is shared until chosen.
        setMode(
          choice === "accept" || choice === "automatic"
            ? "automatic"
            : choice === "review-each"
              ? "review-each"
              : "off",
        );
      })
      .catch(() => {
        if (active) setMode("off");
      });
    return () => {
      active = false;
    };
  }, []);

  function choose(next: "automatic" | "review-each" | "off") {
    if (busy || mode === next) return;
    setBusy(true);
    recordLegalAck({
      keyName: "legal.consent.flywheel",
      copyVersion: LEGAL_COPY_VERSION,
      language: lang,
      choice: next,
    })
      .then(() => setMode(next))
      .catch(() => {})
      .finally(() => setBusy(false));
  }

  return (
    <section className="settings-card">
      <p className="eyebrow">Community</p>
      <h2>Sharing</h2>
      <p className="settings-card-copy">
        {t("legal.consent.flywheel.settingsNote")}
      </p>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {(
          [
            ["automatic", "Automatic"],
            ["review-each", "Review Each"],
            ["off", "Off"],
          ] as const
        ).map(([value, label]) => (
          <button
            className={mode === value ? "primary-button" : "secondary-button"}
            disabled={busy || mode === null}
            key={value}
            onClick={() => choose(value)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
    </section>
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

function ModelsPanel() {
  const { t } = useI18n();
  const [providers, setProviders] = useState<ModelProviderInfo[]>([]);
  const [drafts, setDrafts] = useState<
    Record<string, { apiKey: string; baseUrl: string; model: string }>
  >({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setProviders(result.providers);
      patchDraft(provider.id, { apiKey: "" });
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
      setProviders(result.providers);
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
      setProviders(result.providers);
    } catch {
      setError(`Could not set ${provider.name} as the default.`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="settings-card">
      <p className="eyebrow">Models</p>
      <p className="settings-card-copy">
        Connect one or more model backends. Keys stay on this machine and are
        never uploaded. Codex uses its own ChatGPT login (see the Connection
        tab).
      </p>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="library-list">
        {providers.map((provider) => (
          <div className="settings-card" key={provider.id}>
            <div className="library-card-head">
              <strong>{provider.name}</strong>
              <span className="library-chip">
                {provider.connected
                  ? provider.healthy
                    ? "Connected"
                    : "Needs attention"
                  : "Not connected"}
              </span>
              {provider.isDefault ? (
                <span className="library-chip">Default</span>
              ) : provider.connected ? (
                <button
                  className="secondary-button"
                  disabled={busy === provider.id}
                  onClick={() => void makeDefault(provider)}
                  type="button"
                >
                  Set as default
                </button>
              ) : null}
            </div>
            <small>{provider.detail}</small>
            {provider.kind === "cli-login" ? (
              <p className="library-note">Managed in the Connection tab.</p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  marginTop: "0.5rem",
                }}
              >
                {provider.needsKey ? (
                  <input
                    className="method-rename-input"
                    type="password"
                    placeholder="API key"
                    value={draftFor(provider.id).apiKey}
                    onChange={(event) =>
                      patchDraft(provider.id, { apiKey: event.target.value })
                    }
                  />
                ) : null}
                {provider.needsBaseUrl ? (
                  <input
                    className="method-rename-input"
                    placeholder="Base URL (e.g. http://127.0.0.1:11434/v1)"
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
                  {provider.needsBaseUrl
                    ? t(localBackendNoticeKey(draftFor(provider.id).baseUrl))
                    : t("legal.notice.modelConnect.cloud")}
                </p>
                <div
                  style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
                >
                  <button
                    className="primary-button"
                    disabled={busy === provider.id}
                    onClick={() => void connect(provider)}
                    type="button"
                  >
                    {provider.connected ? "Update" : "Connect"}
                  </button>
                  {provider.connected ? (
                    <button
                      className="secondary-button"
                      disabled={busy === provider.id}
                      onClick={() => void disconnect(provider)}
                      type="button"
                    >
                      Disconnect
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
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
  // Owner backup preferences: destination folder + keep-most-recent-N.
  const [destination, setDestination] = useState("");
  const [keep, setKeep] = useState("");
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
      })
      .catch(() => {});
  }, []);

  async function handleSaveConfig() {
    setSavingConfig(true);
    setConfigError(null);
    setConfigNotice(null);
    const keepNumber = Number.parseInt(keep, 10);
    try {
      await saveBackupConfig({
        destination: destination.trim() === "" ? null : destination.trim(),
        keep:
          Number.isInteger(keepNumber) && keepNumber >= 1 ? keepNumber : null,
      });
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
    return date.toLocaleString();
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
        <button
          className="secondary-button"
          disabled={savingConfig}
          onClick={() => void handleSaveConfig()}
          style={{ alignSelf: "flex-start" }}
          type="button"
        >
          {t("settings.backup.saveConfig")}
        </button>
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
          <p className="settings-card-copy">{t("settings.backup.restoreWarn")}</p>
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
              {t("settings.backup.restore")}
            </button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}

function SettingsPanel({
  settings,
  onOpenHelp,
  onUpdate,
}: {
  settings: InstanceSettings;
  systemStatus: SystemStatus | null;
  onOpenHelp: () => void;
  onUpdate: (settings: InstanceSettings) => void;
}) {
  const { lang, setLang, t } = useI18n();
  const [instanceName, setInstanceName] = useState(settings.instanceName);
  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState(readStoredTheme);
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
  const [settingsTab, setSettingsTab] = useState<
    | "manual"
    | "appearance"
    | "account"
    | "identity"
    | "provider"
    | "models"
    | "backup"
    | "sharing"
    | "legal"
  >("manual");
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

  return (
    <div className="settings-layout">
      <nav aria-label="Settings sections" className="library-subtabs">
        <button
          className={settingsTab === "manual" ? "active" : ""}
          onClick={() => setSettingsTab("manual")}
          type="button"
        >
          Manual
        </button>
        <button
          className={settingsTab === "appearance" ? "active" : ""}
          onClick={() => setSettingsTab("appearance")}
          type="button"
        >
          Appearance
        </button>
        <button
          className={settingsTab === "account" ? "active" : ""}
          onClick={() => setSettingsTab("account")}
          type="button"
        >
          Account
        </button>
        <button
          className={settingsTab === "identity" ? "active" : ""}
          onClick={() => setSettingsTab("identity")}
          type="button"
        >
          Identity
        </button>
        <button
          className={settingsTab === "provider" ? "active" : ""}
          onClick={() => setSettingsTab("provider")}
          type="button"
        >
          Connection
        </button>
        <button
          className={settingsTab === "models" ? "active" : ""}
          onClick={() => setSettingsTab("models")}
          type="button"
        >
          Models
        </button>
        <button
          className={settingsTab === "backup" ? "active" : ""}
          onClick={() => setSettingsTab("backup")}
          type="button"
        >
          {t("settings.backup.tab")}
        </button>
        <button
          className={settingsTab === "sharing" ? "active" : ""}
          onClick={() => setSettingsTab("sharing")}
          type="button"
        >
          Sharing
        </button>
        <button
          className={settingsTab === "legal" ? "active" : ""}
          onClick={() => setSettingsTab("legal")}
          type="button"
        >
          {t("settings.legal.title")}
        </button>
      </nav>
      {settingsTab === "manual" ? (
      <section className="settings-card">
        <p className="eyebrow">{t("settings.manual.eyebrow")}</p>
        <h2>{t("settings.manual.title")}</h2>
        <p className="settings-card-copy">{t("settings.manual.copy")}</p>
        <button className="secondary-button" onClick={onOpenHelp} type="button">
          {t("settings.help.open")}
        </button>
      </section>
      ) : null}
      {settingsTab === "appearance" ? (
      <section className="settings-card">
        <p className="eyebrow">Appearance</p>
        <h2>Appearance</h2>
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
      </section>
      ) : null}
      {settingsTab === "account" ? (
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
        <h3 className="settings-subhead">Stop Vaenyx</h3>
        <p className="settings-card-copy">
          Use this when you want Vaenyx fully off. Closing the browser alone does
          not safely stop the local server.
        </p>
        <button
          className="danger-button"
          disabled={stoppingVaenyx}
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
      {settingsTab === "identity" ? (
      <section className="settings-card">
        <p className="eyebrow">Visible identity</p>
        <h2>Instance name</h2>
        <form
          className="memory-form"
          onSubmit={(event) => {
            event.preventDefault();
            void updateSettings({ instanceName }).then((updated) => {
              onUpdate(updated);
              setSaved(true);
            });
          }}
        >
          <label>
            Name shown in Vaenyx
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
          <button className="primary-button" type="submit">
            Save name
          </button>
          {saved ? <p className="saved-note">Saved locally.</p> : null}
        </form>
      </section>
      ) : null}
      {settingsTab === "provider" ? (
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
      {settingsTab === "models" ? <ModelsPanel /> : null}
      {settingsTab === "backup" ? <BackupPanel /> : null}
      {settingsTab === "sharing" ? <SharingPanel /> : null}
      {settingsTab === "legal" ? (
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
          <p className="settings-card-copy">{t("disclaimer.merit")}</p>
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
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            className="primary-button"
            disabled={!warranty}
            onClick={() =>
              onConfirm({
                copyVersion: LEGAL_COPY_VERSION,
                language: lang,
                warrantyConfirmed: true,
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
  const { t } = useI18n();
  const [state, setState] = useState<PublishState | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

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
    setBusy(true);
    try {
      await publishMethodToCommunity(method.id, acceptance);
      setDone(true);
      setState(await fetchPublishState());
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Vaenyx could not publish this method.",
      );
    } finally {
      setBusy(false);
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
    </section>
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
      setResult(await testRunMethod(method.id, parsed));
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
  const [description, setDescription] = useState("");
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
// Mirrors i18n `legal.copyVersion` (copy pack clause 6.4): bumping it re-fires
// version-gated acknowledgements. Keep the two in step.
const LEGAL_COPY_VERSION = "2.2";

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
      )}
    </section>
  );
}

function CataloguePanel({
  installedIds,
  onBack,
  onMethodsRefresh,
  onRoutinesRefresh,
}: {
  installedIds: string[];
  onBack?: () => void;
  onMethodsRefresh: () => void;
  onRoutinesRefresh: () => void;
}) {
  const { t } = useI18n();
  const [catalogue, setCatalogue] = useState<CatalogueIndex | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "routines" | "methods">("all");
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

  // Routines first (the ready-to-use products), then Methods (building blocks).
  const routineHits =
    filter === "methods" ? [] : (catalogue?.routines ?? []).filter(matches);
  const methodHits =
    filter === "routines" ? [] : (catalogue?.methods ?? []).filter(matches);
  const total = routineHits.length + methodHits.length;

  return (
    <div className="library-layout">
      {onBack ? (
        <button
          className="text-button library-back"
          onClick={onBack}
          type="button"
        >
          ← All routines
        </button>
      ) : null}
      <CommunityIdentityBar />
      <section className="library-intro">
        <div className="library-intro-head">
          <div>
            <p className="eyebrow">{t("library.tierCommunity")}</p>
            <h2>Browse the Community</h2>
          </div>
        </div>
        <p>
          Methods and Routines shared by the community. Install one and it runs on
          your own machine — its files are copied locally. A <strong>Routine</strong>{" "}
          is ready to use; a <strong>Method</strong> is a building block you can
          reuse as a step when you build your own Routine.
        </p>
        <p className="context-disclaimer">
          {t("legal.disclaimer.community.browse")}
        </p>
        <input
          className="method-rename-input"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search Methods and Routines by name, description or #tag"
          style={{ width: "100%" }}
          type="search"
          value={query}
        />
        <div
          aria-label="Filter by type"
          className="catalogue-filter"
          role="tablist"
        >
          {(
            [
              ["all", "All"],
              ["routines", "Routines"],
              ["methods", "Methods"],
            ] as const
          ).map(([value, label]) => (
            <button
              aria-selected={filter === value}
              className={filter === value ? "active" : ""}
              key={value}
              onClick={() => setFilter(value)}
              role="tab"
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </section>
      {loadError ? <p className="form-error">{loadError}</p> : null}
      {actionError ? <p className="form-error">{actionError}</p> : null}
      {catalogue === null && !loadError ? (
        <p className="settings-card-copy">Loading…</p>
      ) : null}
      {catalogue !== null && total === 0 ? (
        <div className="empty-state">
          <strong>Nothing to show</strong>
          <p>
            {catalogue.routines.length === 0 && catalogue.methods.length === 0
              ? "The Community is empty for now."
              : "No items match your search."}
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
                  style={{ marginTop: "0.75rem", alignSelf: "flex-start" }}
                  type="button"
                >
                  {isInstalled
                    ? "Installed"
                    : installing === routine.id
                      ? "Installing…"
                      : "Install"}
                </button>
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
                  style={{ marginTop: "0.75rem", alignSelf: "flex-start" }}
                  type="button"
                >
                  {isInstalled
                    ? "Installed"
                    : installing === method.id
                      ? "Installing…"
                      : "Install"}
                </button>
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
  const [creating, setCreating] = useState(false);
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
          steps and keeps a log you can revisit. Tap one to use it.
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
              <button
                className="library-card"
                onClick={() => onUseRoutine(routine.id)}
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
    "methods" | "routines" | "token" | "community" | "skills"
  >("routines");

  return (
    <div className="library-area">
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
        <button
          className={tab === "community" ? "active" : ""}
          onClick={() => setTab("community")}
          type="button"
        >
          Community
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
      ) : tab === "community" ? (
        <CataloguePanel
          installedIds={[
            ...methods.map((method) => method.id),
            ...routines.map((routine) => routine.id),
          ]}
          onMethodsRefresh={onMethodsRefresh}
          onRoutinesRefresh={onRoutinesRefresh}
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
  const [description, setDescription] = useState("");
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
  const [creating, setCreating] = useState(false);
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
function ThreadList({
  threads,
  emptyLabel,
  selectedThreadId,
  tasks,
  projects,
  onOpenChat,
  onOpenTask,
  onMoveThreadProject,
  onRenameThread,
  onSetThreadStatus,
}: {
  threads: VaenyxThread[];
  emptyLabel: string;
  selectedThreadId: string | null;
  tasks: Task[];
  projects: Project[];
  onOpenChat: (conversationId: string, threadId: string) => void;
  onOpenTask: (taskId: string, threadId: string) => void;
  onMoveThreadProject: (thread: VaenyxThread, projectId: string | null) => void;
  onRenameThread: (thread: VaenyxThread, title: string) => void;
  onSetThreadStatus: (thread: VaenyxThread, status: VaenyxThread["status"]) => void;
}) {
  const [visible, setVisible] = useState(THREAD_LIST_INITIAL);

  if (threads.length === 0) {
    return <p className="thread-empty">{emptyLabel}</p>;
  }

  const shown = threads.slice(0, visible);
  const remaining = threads.length - shown.length;

  return (
    <div className="thread-items">
      {shown.map((thread) => {
        const light = threadLight(thread, tasks);
        return (
          <div
            className={
              selectedThreadId === thread.id
                ? "thread-item-row active"
                : "thread-item-row"
            }
            key={thread.id}
          >
            <button
              className={
                selectedThreadId === thread.id
                  ? "thread-item active"
                  : "thread-item"
              }
              onClick={() => {
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
              <span
                aria-label={chatLightLabel(light)}
                className={`status-light status-light--${light}`}
              />
              <strong>{thread.title.trim() || "New chat"}</strong>
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
}: {
  selectedThreadId: string | null;
  workspace: Workspace;
  onOpenChat: (conversationId: string, threadId: string) => void;
  onOpenTask: (taskId: string, threadId: string) => void;
  onMoveThreadProject: (thread: VaenyxThread, projectId: string | null) => void;
  onRenameThread: (thread: VaenyxThread, title: string) => void;
  onSetThreadStatus: (thread: VaenyxThread, status: VaenyxThread["status"]) => void;
}) {
  const visibleThreads = workspace.threads.filter(
    (thread) => thread.status !== "archived",
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
        projects={workspace.projects}
        selectedThreadId={selectedThreadId}
        tasks={workspace.tasks}
        threads={threads}
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
  const { t } = useI18n();
  const [screen, setScreen] = useState<Screen>("ask-vaenyx");
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
  const [requestedConversationId, setRequestedConversationId] = useState<
    string | null
  >(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [portalView, setPortalView] = useState<PortalView>("new");
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
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
      fetchAppProfiles().then(setAppProfiles),
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

  async function openGuard() {
    setSelectedThreadId(null);
    setMobileSidebarOpen(false);
    setAuditEvents(await fetchAuditEvents());
    setScreen("guard");
  }

  async function openLibrary() {
    setSelectedThreadId(null);
    setMobileSidebarOpen(false);
    const [methods, routines] = await Promise.all([
      fetchLibraryMethods(),
      fetchLibraryRoutines(),
    ]);
    setLibraryMethods(methods);
    setLibraryRoutines(routines);
    setScreen("library");
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
  ): Promise<Task> {
    setError(null);
    const nextProjectId = requestedProjectId || defaultProjectId;
    // Forge (read-only repo agent) runs in the Vaenyx repo project; everywhere
    // else runs a real research task (chat with web search), schedulable too.
    const executionMode: "forge-readonly" | "research" =
      nextProjectId === "vaenyx" ? "forge-readonly" : "research";

    const task = await createTask({
      request: content,
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

  return (
    <main className="app-shell" style={appShellStyle}>
      <button
        aria-label="Hard refresh"
        className="hard-refresh-button"
        onClick={() => void hardRefresh()}
        title="Hard refresh — load the latest version"
        type="button"
      >
        ⟳
      </button>
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
          <span className="brand-mark">V</span>
          <span>Vaenyx</span>
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
                General
              </button>
              <button
                className={screen === "projects" ? "active" : ""}
                onClick={() => openScreen("projects")}
                type="button"
              >
                Projects
              </button>
              <button
                className={screen === "scheduled" ? "active" : ""}
                onClick={() => openScreen("scheduled")}
                type="button"
              >
                Scheduled
              </button>
              <button
                className={screen === "library" ? "active" : ""}
                onClick={() => void openLibrary()}
                type="button"
              >
                {t("title.library")}
              </button>
              <button
                className={screen === "vaenyx-me" ? "active" : ""}
                onClick={() => openScreen("vaenyx-me")}
                type="button"
              >
                Vaenyx Me
              </button>
              <button
                className={screen === "guard" ? "active" : ""}
                onClick={() => void openGuard()}
                type="button"
              >
                Guard
              </button>
            </nav>
          </>
        )}

        {screen === "ask-vaenyx" ? (
          <AskVaenyxPanel
            composeKey={composeKey}
            conversations={askVaenyxConversations}
            libraryRoutines={libraryRoutines}
            onConversationsChange={setAskVaenyxConversations}
            onCreateTask={createTaskFromPortal}
            onDraftConversationStarted={openDraftConversation}
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
        ) : screen === "modes" ? (
          <ModesPanel />
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
            onOpenHelp={() => openScreen("help")}
            onUpdate={setSettings}
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
    <Modal onClose={onClose} title={title}>
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

// First-run acceptance gate (copy pack Part A; decision A, 2026-07-10). Shown once
// per copy version to any Owner who has not recorded the A2 Terms/Privacy
// acceptance and the A3 flywheel sharing choice — a fresh install AND an existing
// instance both see it once, then never again, because the gate keys off the
// recorded acceptance, not "is this a fresh install". Fails OPEN on a lookup error
// so a transient hiccup can never lock the Owner out of their own instance.
const LEGAL_ACCEPT_CACHE = `vaenyx-legal-accepted-${LEGAL_COPY_VERSION}`;

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
              ack.keyName === key && ack.copyVersion === LEGAL_COPY_VERSION,
          );
        const done =
          has("legal.notice.firstRun.terms") && has("legal.consent.flywheel");
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
          <span className="brand-mark">V</span>
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

// The install-time acceptance screen: A1 (AI notice), A3 (flywheel forced choice —
// no option pre-selected; "Keep Sharing On (Recommended)" is visually prominent but
// never pre-ticked; decline is one equally-accessible tap), then A2 (the Continue
// tap is the Terms acceptance event). Continue stays disabled until a sharing
// choice is made, so nothing proceeds — and nothing is shared — until the user
// chooses. Both the A2 acceptance and the A3 choice are recorded to the backbone.
function InstallAcceptanceWizard({ onDone }: { onDone: () => void }) {
  const { lang, t } = useI18n();
  const [choice, setChoice] = useState<"accept" | "decline" | null>(null);
  const [busy, setBusy] = useState(false);

  function proceed() {
    if (!choice || busy) return;
    setBusy(true);
    // Fire-and-forget the evidence records (best-effort, clause 2.3) and release
    // the gate immediately — never block the Owner behind a network write.
    const record = (keyName: string, choiceValue?: string) =>
      void recordLegalAck({
        keyName,
        copyVersion: LEGAL_COPY_VERSION,
        language: lang,
        choice: choiceValue,
      }).catch(() => {});
    record("legal.notice.firstRun.terms", "accepted");
    record("legal.consent.flywheel", choice);
    onDone();
  }

  return (
    <main className="acceptance-screen">
      <div className="acceptance-card">
        <span className="brand-mark">V</span>
        <p className="acceptance-ai">
          {t("legal.disclaimer.aiGeneral.firstRun")}
        </p>

        <section className="acceptance-flywheel">
          <h2>{t("legal.consent.flywheel.title")}</h2>
          <p>{t("legal.consent.flywheel.body")}</p>
          <div className="acceptance-choices">
            <button
              aria-pressed={choice === "accept"}
              className={`primary-button${choice === "accept" ? " selected" : ""}`}
              onClick={() => setChoice("accept")}
              type="button"
            >
              {t("legal.consent.flywheel.accept")}
            </button>
            <button
              aria-pressed={choice === "decline"}
              className={`secondary-button${choice === "decline" ? " selected" : ""}`}
              onClick={() => setChoice("decline")}
              type="button"
            >
              {t("legal.consent.flywheel.decline")}
            </button>
          </div>
          <p className="acceptance-fine">
            {t("legal.consent.flywheel.sensitiveNote")}
          </p>
          <p className="acceptance-fine">
            {t("legal.consent.flywheel.multiUserNote")}
          </p>
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
          <span className="brand-mark">V</span>
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
          <span className="brand-mark">V</span>
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
          <span className="brand-mark">V</span>
          <p>Loading your workspace...</p>
        </div>
      </main>
    );
  }

  return (
    <InstallAcceptanceGate>
      <VaenyxWorkspace
        onLogout={logout}
        onWorkspaceChange={setWorkspace}
        systemStatus={systemStatus}
        workspace={workspace}
      />
    </InstallAcceptanceGate>
  );
}
