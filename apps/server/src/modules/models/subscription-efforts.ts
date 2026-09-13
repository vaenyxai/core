// WHICH THINKING LEVELS EACH SUBSCRIPTION MODEL TAKES (Oskar, 2026-09-13:
// 单位跟着他们选). The two subscription channels report their own tiers per
// model — Codex's model/list (low…xhigh), the Claude SDK's supportedModels
// (low…max, none for Haiku). Whenever either catalogue is read, its rows are
// remembered here, and the chat path asks this file which effort to send:
// the Owner's stored level when the model takes it, else the highest level
// the model has below it, else nothing at all for a model with no levels.
//
// No imports on purpose: relay-models.ts, the Codex harness and the Claude
// provider all read this file, and each of them imports one of the others.

export const EFFORT_ORDER = ["low", "medium", "high", "xhigh", "max"] as const;

// What each engine takes when its catalogue has not been read since start.
export const CODEX_EFFORT_TIERS: readonly string[] = [
  "low",
  "medium",
  "high",
  "xhigh",
];
export const CLAUDE_EFFORT_TIERS: readonly string[] = [
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
];

export type SubscriptionChannel = "codex" | "claude-sub";

const known = new Map<string, string[]>();
const defaultRow = new Map<SubscriptionChannel, string>();

/** Remember what a freshly read catalogue said, row by row. */
export function rememberSubscriptionEfforts(
  channel: SubscriptionChannel,
  rows: readonly {
    id: string;
    efforts: readonly string[];
    isDefault?: boolean;
  }[],
): void {
  for (const row of rows) {
    known.set(`${channel}:${row.id}`, [...row.efforts]);
    if (row.isDefault) defaultRow.set(channel, row.id);
  }
}

function rank(effort: string): number {
  return (EFFORT_ORDER as readonly string[]).indexOf(effort);
}

/** The effort to send for this model, or null to send none. */
export function effortForModel(
  channel: SubscriptionChannel,
  model: string | null | undefined,
  wanted: string | null | undefined,
  fallback: readonly string[],
): string | null {
  if (!wanted) return null;
  // No pinned model means the engine's own default row: Codex marks one,
  // the Claude SDK names it "default".
  const id =
    model?.trim() ||
    defaultRow.get(channel) ||
    (channel === "claude-sub" ? "default" : "");
  const tiers = known.get(`${channel}:${id}`) ?? [...fallback];
  if (tiers.length === 0) return null;
  if (tiers.includes(wanted)) return wanted;
  const wantedRank = rank(wanted);
  const below = tiers
    .filter((tier) => rank(tier) >= 0 && rank(tier) <= wantedRank)
    .sort((left, right) => rank(left) - rank(right));
  return below[below.length - 1] ?? tiers[0] ?? null;
}

/** Tests only: forget every remembered catalogue. */
export function resetSubscriptionEffortsForTest(): void {
  known.clear();
  defaultRow.clear();
}
