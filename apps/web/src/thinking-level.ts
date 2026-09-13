// HOW HARD SHOULD IT THINK — and only where the answer is real.
//
// The levels are the MODEL'S OWN (Oskar, 2026-09-13: 单位跟着他们选). The two
// subscription channels report per model which reasoning efforts they take —
// Codex low…xhigh, Claude low…max, Haiku none — and the picker offers exactly
// those, in the engine's own words. Before that it offered Fast / Balanced /
// Deep everywhere, which hid two real tiers and invented one where none existed.
//
// Every other backend gets no picker: Vaenyx does not pass a reasoning level
// to key-based providers, and a control that changes nothing teaches the Owner
// to distrust the ones that work (Oskar, 2026-08-16).
export const EFFORT_ORDER = ["low", "medium", "high", "xhigh", "max"] as const;
export type Effort = (typeof EFFORT_ORDER)[number];

export interface ModelEfforts {
  id: string;
  efforts: string[];
  isDefault?: boolean;
}

// Per provider id, the rows its live catalogue answered with.
export type EffortCatalogue = Record<string, ModelEfforts[]>;

const CHANNELS_THAT_TAKE_A_LEVEL = new Set(["codex", "claude-sub"]);

function isEffort(value: string): value is Effort {
  return (EFFORT_ORDER as readonly string[]).includes(value);
}

/** The levels this exact model takes, lowest first; empty = show no picker. */
export function effortChoices(
  providerId: string | null | undefined,
  model: string | null | undefined,
  catalogue: EffortCatalogue,
): Effort[] {
  if (!providerId || !CHANNELS_THAT_TAKE_A_LEVEL.has(providerId)) return [];
  const rows = catalogue[providerId];
  if (!rows) return [];
  const id = model?.trim();
  // No pinned model means the engine's own default row: Codex marks one,
  // the Claude SDK names it "default".
  const row = id
    ? rows.find((candidate) => candidate.id === id)
    : (rows.find((candidate) => candidate.isDefault) ??
      rows.find((candidate) => candidate.id === "default"));
  if (!row) return [];
  return EFFORT_ORDER.filter((effort) => row.efforts.includes(effort));
}

const LABELS: Record<Effort, [string, string]> = {
  low: ["Low", "低"],
  medium: ["Medium", "中"],
  high: ["High", "高"],
  xhigh: ["Extra High", "超高"],
  max: ["Max", "最大"],
};

/** The picker's options, in the engine's own words. */
export function effortOptions(
  choices: readonly Effort[],
  lang: string,
): { label: string; value: Effort }[] {
  const zh = lang === "zh";
  return choices.map((effort) => ({
    label: LABELS[effort][zh ? 1 : 0],
    value: effort,
  }));
}

/** Keep a stored level legal for the model now chosen: itself when the model
 *  takes it, else the highest level it has below, else its lowest. */
export function clampEffort(
  choices: readonly Effort[],
  stored: string | null | undefined,
): Effort {
  const wanted: Effort = stored && isEffort(stored) ? stored : "medium";
  if (choices.includes(wanted)) return wanted;
  const wantedRank = EFFORT_ORDER.indexOf(wanted);
  const below = choices.filter(
    (effort) => EFFORT_ORDER.indexOf(effort) <= wantedRank,
  );
  return below[below.length - 1] ?? choices[0] ?? wanted;
}
