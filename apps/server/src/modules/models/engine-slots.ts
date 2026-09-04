// WHO DOES EACH JOB, AND WHO STANDS IN (Oskar, 2026-08-16).
//
// The old shape said only WHICH BACKEND powers a capability, and the model
// came from whatever that backend was set to for chat. That is how a chat
// model chosen for quality (gemini-3.7-flash) quietly put every photo on its
// 20-requests-per-minute free bucket — measured, 429 after 429.
//
// So a capability now names its own PAIR:
//   primary  — the backend and the exact model the Owner picked for this job
//   backup   — a second one, picked by the OWNER, used only when the primary
//              cannot answer at all
//
// Two rules hold this together, and both are the Owner's:
//   • The app NEVER chooses the backup. An empty backup means "no backup" —
//     it does not mean "pick something sensible". A silent substitution is
//     exactly what this replaced.
//   • A fallback is always SAID OUT LOUD, in plain words, with what went
//     wrong (see explainEngineFailure) — never a quiet swap the Owner meets
//     later as "why does this answer look different".
//
// A failure that qualifies is one where the primary could not answer AT ALL:
// throttled, down, unreachable, retired, unauthorised, or asked to do
// something it cannot. A poor or empty ANSWER is not a failure — falling back
// there would hide a quality problem and pay twice for it.
import {
  readDefaultProviderId,
  readProviderConnections,
  writeDefaultProviderId,
  writeProviderConnections,
  type ProviderConnection,
} from "./connections.js";

/** The capabilities that pick their own engine. Keys in the secrets file. */
export const ENGINE_SLOTS = [
  "chat",
  "text",
  "vision",
  "imageOutput",
  "voice",
  "voiceOutput",
  "ocr",
] as const;

export type EngineSlot = (typeof ENGINE_SLOTS)[number];

export interface EngineChoice {
  provider: string;
  /** Empty = that provider's own pinned default for this job. */
  model?: string;
}

export interface EnginePair {
  primary: EngineChoice | null;
  backup: EngineChoice | null;
}

function backupKey(slot: EngineSlot): string {
  return `${slot}Backup`;
}

// Speaking stores its pick under `engine`, not `provider`, because two of its
// answers are not model accounts at all — this browser's own voice, and the
// voice downloaded onto this machine. That field name is load-bearing (voice.ts
// reads it, and both non-account answers live in it), so the slot layer bends
// to it rather than the other way round.
function slotField(slot: EngineSlot): "provider" | "engine" {
  return slot === "voiceOutput" ? "engine" : "provider";
}

function toChoice(
  entry: ProviderConnection | undefined,
  field: "provider" | "engine" = "provider",
): EngineChoice | null {
  const provider = entry?.[field]?.trim();
  if (!provider || provider === "none") return null;
  const model = entry?.model?.trim();
  return model ? { provider, model } : { provider };
}

// 🔴 CHAT IS A VIEW, NOT A COPY. Chat's main engine has been stored as
// "default provider id + that provider's own model" since long before slots
// existed, and the composer's switcher writes it directly. Giving chat its own
// slot entry would make TWO answers to "which model does chat use" that drift
// apart the moment either one is touched — the thing Oskar asked to be one
// live value (2026-08-16). So chat's primary READS AND WRITES the old storage;
// only its backup, which nothing else knows about, is a slot entry of its own.
function chatPrimary(
  secretsDirectory: string,
  connections: Record<string, ProviderConnection>,
): EngineChoice | null {
  const provider = readDefaultProviderId(secretsDirectory) ?? "codex";
  const model = connections[provider]?.model?.trim();
  return model ? { provider, model } : { provider };
}

// ── Following the main model (Oskar, 2026-09-05) ────────────────────────────
// The main model (the chat slot) is a PRESELECTION, not a job: every other
// row may point at it instead of naming a backend of its own, and a row that
// follows it follows its backup too — "when the main one cannot work, use its
// stand-in at once, without setting one per row". Stored as the provider
// name "main" in the row's own entry, so the Settings row can show "follows"
// while every reader below still gets a real provider.
export const FOLLOW_MAIN = "main";

export interface EnginePairDetail extends EnginePair {
  /** Whether each side is stored as "follow the main model". The primary and
   *  backup above are already resolved to real providers. */
  follows: { primary: boolean; backup: boolean };
}

/** What the file literally holds for one side: nothing, "none", "main", or a
 *  provider name. */
function storedProvider(
  connections: Record<string, ProviderConnection>,
  key: string,
  field: "provider" | "engine",
): string | undefined {
  const value = connections[key]?.[field]?.trim();
  return value ? value : undefined;
}

export function describeEnginePair(
  secretsDirectory: string,
  slot: EngineSlot,
): EnginePairDetail {
  const connections = readProviderConnections(secretsDirectory);
  const field = slotField(slot);
  const main: EnginePair = {
    primary: chatPrimary(secretsDirectory, connections),
    backup: toChoice(connections[backupKey("chat")]),
  };
  if (slot === "chat") {
    return { ...main, follows: { primary: false, backup: false } };
  }
  const rawPrimary = storedProvider(connections, slot, field);
  const rawBackup = storedProvider(connections, backupKey(slot), field);
  // Text is chat and every other written job; it cannot be off, so "nothing
  // chosen" means "follow". Every other row keeps "nothing chosen" = off.
  const primaryFollows =
    rawPrimary === FOLLOW_MAIN || (slot === "text" && rawPrimary === undefined);
  const backupFollows =
    rawBackup === FOLLOW_MAIN ||
    (rawBackup === undefined && (primaryFollows || slot === "text"));
  return {
    primary: primaryFollows ? main.primary : toChoice(connections[slot], field),
    backup: backupFollows
      ? main.backup
      : toChoice(connections[backupKey(slot)], field),
    follows: { primary: primaryFollows, backup: backupFollows },
  };
}

export function readEnginePair(
  secretsDirectory: string,
  slot: EngineSlot,
): EnginePair {
  const { primary, backup } = describeEnginePair(secretsDirectory, slot);
  return { primary, backup };
}

/** Write one side of a slot. null clears it (and clearing the primary clears
 *  the backup too — a stand-in for nothing is not a thing). */
export function writeEngineChoice(
  secretsDirectory: string,
  slot: EngineSlot,
  which: "primary" | "backup",
  choice: EngineChoice | null,
): EnginePair {
  const connections = readProviderConnections(secretsDirectory);
  // The main model is what the others follow; it cannot follow itself.
  if (choice?.provider === FOLLOW_MAIN && slot === "chat") {
    throw new Error("MAIN_CANNOT_FOLLOW_ITSELF");
  }
  // Chat's main engine goes back where it came from (see chatPrimary): the
  // default-provider file, and the model on that provider's own connection.
  // Chat cannot be turned off, so a null here is ignored rather than obeyed —
  // there is no such thing as an app with no model to talk to.
  if (slot === "chat" && which === "primary") {
    if (choice) {
      writeDefaultProviderId(secretsDirectory, choice.provider);
      const next: ProviderConnection = { ...connections[choice.provider] };
      if (choice.model) next.model = choice.model;
      else delete next.model;
      connections[choice.provider] = next;
      writeProviderConnections(secretsDirectory, connections);
    }
    return readEnginePair(secretsDirectory, slot);
  }
  const key = which === "primary" ? slot : backupKey(slot);
  if (!choice) {
    // A row that follows the main model inherits its backup when it has none
    // of its own, and Text follows by default — so "no backup" on those rows
    // has to be written down, or clearing it would read as "inherit".
    const inherits =
      slot === "text" ||
      storedProvider(connections, slot, slotField(slot)) === FOLLOW_MAIN;
    if (which === "backup" && inherits) {
      connections[key] = { ...connections[key], [slotField(slot)]: "none" };
      delete connections[key].model;
    } else {
      delete connections[key];
      if (which === "primary") delete connections[backupKey(slot)];
    }
  } else {
    // The slot entry keeps whatever else lived on it (the Owner's chosen
    // voices, above all) — only the pointer and the model are replaced.
    const next: ProviderConnection = { ...connections[key] };
    next[slotField(slot)] = choice.provider;
    if (choice.model) next.model = choice.model;
    else delete next.model;
    connections[key] = next;
  }
  writeProviderConnections(secretsDirectory, connections);
  return readEnginePair(secretsDirectory, slot);
}

// ── What went wrong, in words the Owner can act on ─────────────────────────

/** Reads a provider failure and says what it MEANS. The raw code rides along
 *  in brackets because it is the thing to search for, but it is never the
 *  whole message: "429" tells the Owner nothing they can do. */
export function explainEngineFailure(
  raw: unknown,
  lang: string,
): { reason: string; code: string } {
  const message = raw instanceof Error ? raw.message : String(raw ?? "");
  const zh = lang === "zh";
  const status = /:(\d{3})(?::|$)/.exec(message)?.[1] ?? "";
  const code = status || (message.split(":")[0] ?? "error");

  if (status === "429") {
    return {
      code,
      reason: zh
        ? "免费额度用完了(每分钟或每天的次数上限)"
        : "its free quota ran out (a per-minute or per-day request limit)",
    };
  }
  if (status === "401" || status === "403") {
    return {
      code,
      reason: zh
        ? "钥匙无效或没有这个权限"
        : "the key was rejected or lacks permission for this",
    };
  }
  if (status === "404") {
    return {
      code,
      reason: zh ? "这个型号已经不提供了" : "that model is no longer offered",
    };
  }
  if (status === "400") {
    return {
      code,
      reason: zh
        ? "这个型号干不了这活(常见于让纯文字模型看图)"
        : "that model cannot do this job (usually a text-only model asked to see)",
    };
  }
  if (status.startsWith("5")) {
    return {
      code,
      reason: zh ? "对方服务器出问题了" : "the provider's own service failed",
    };
  }
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|timeout|aborted/i.test(message)) {
    return {
      code: code || "network",
      reason: zh
        ? "连不上(网络或超时)"
        : "it could not be reached (network or timeout)",
    };
  }
  if (/NOT_CONNECTED|NO_KEY/i.test(message)) {
    return {
      code,
      reason: zh ? "还没有连接" : "it is not connected",
    };
  }
  return {
    code,
    reason: zh ? "这次没能回应" : "it could not answer this time",
  };
}

/** True when the primary failed in a way a stand-in can actually help with:
 *  it could not answer AT ALL. A bad answer is not this. */
export function deservesBackup(raw: unknown): boolean {
  const message = raw instanceof Error ? raw.message : String(raw ?? "");
  return (
    /:(4\d\d|5\d\d)(?::|$)/.test(message) ||
    /fetch failed|ENOTFOUND|ECONNREFUSED|timeout|aborted/i.test(message) ||
    // Speaking's throttle carries the seconds to wait rather than the status,
    // so it needs naming: "three requests a minute, wait eight seconds" is a
    // could-not-answer if anything ever was.
    /RATE_LIMITED/i.test(message) ||
    /NOT_CONNECTED|NO_KEY|EMPTY_RESPONSE/i.test(message)
  );
}

export interface EngineRunNote {
  /** Which engine actually answered. */
  provider: string;
  model: string | null;
  /** Present only when the backup answered: why the primary did not. */
  fellBackFrom?: { provider: string; reason: string; code: string };
}

export interface EngineRunResult<T> {
  value: T;
  note: EngineRunNote;
}

/** Run a job on the slot's primary, and — only if the primary could not
 *  answer at all — on the Owner's chosen backup. The note that comes back
 *  says who answered and why, so every surface can tell the Owner plainly. */
export async function runWithBackup<T>(
  pair: EnginePair,
  attempt: (choice: EngineChoice) => Promise<T>,
  lang: string,
): Promise<EngineRunResult<T>> {
  if (!pair.primary) throw new Error("ENGINE_NOT_CONNECTED");
  try {
    return {
      value: await attempt(pair.primary),
      note: {
        provider: pair.primary.provider,
        model: pair.primary.model ?? null,
      },
    };
  } catch (error) {
    const backup = pair.backup;
    if (!backup || !deservesBackup(error)) throw error;
    // Same job, the Owner's OWN second choice. If this one fails too, its
    // error is what surfaces — the Owner sees the real end of the road.
    const explained = explainEngineFailure(error, lang);
    const value = await attempt(backup);
    return {
      value,
      note: {
        provider: backup.provider,
        model: backup.model ?? null,
        fellBackFrom: {
          provider: pair.primary.provider,
          reason: explained.reason,
          code: explained.code,
        },
      },
    };
  }
}

/** The sentence the Owner reads when a backup answered. Kept here so every
 *  surface says it the same way. */
export function backupNoteSentence(
  note: EngineRunNote,
  displayName: (providerId: string) => string,
  lang: string,
): string | null {
  if (!note.fellBackFrom) return null;
  const from = displayName(note.fellBackFrom.provider);
  const to = displayName(note.provider);
  const toModel = note.model ? ` ${note.model}` : "";
  return lang === "zh"
    ? `${from} ${note.fellBackFrom.reason}(${note.fellBackFrom.code}),这次改用${to}${toModel}。`
    : `${from} ${note.fellBackFrom.reason} (${note.fellBackFrom.code}), so ${to}${toModel} answered this one.`;
}
