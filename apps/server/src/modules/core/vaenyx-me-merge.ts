// THREE PROPOSALS ABOUT THE SAME THING BECOME ONE PROPOSAL.
//
// The scan proposes as it reads, so a habit the Owner shows in four chats
// becomes four separate cards saying roughly the same sentence — and a queue
// that repeats itself teaches the person reading it to stop. Merging runs at
// the scan's own cadence, right after a pass that added anything (Oskar,
// 2026-08-09: "你每一次更新的时候就合并一次"), plus once over the backlog that
// existed before merging did.
//
// THE MERGED ONE REPLACES THE ORIGINALS (Oskar's call, same day). Answering it
// answers the whole group; the originals are not kept expandable underneath.
// They are status-marked rather than hard-deleted, which is invisible to the
// Owner but load-bearing twice over: the scan's "already looked at this
// conversation" check reads source_id off EVERY row regardless of status, so a
// hard delete would invite the scan to re-propose the very thing that was just
// merged away — and the rows remain the only record of what the merge did.
//
// Two kinds share the queue and merge by different rules:
//   • FACTS (proposed_slot set) merge only when slot AND value are identical —
//     pure SQL, no model. Same slot with a DIFFERENT value is a conflict the
//     Owner should see as two items, not something to blend.
//   • TRAITS are judged by the model, because "prefers blunt answers" and
//     "likes it short and direct" match no string comparison. The model only
//     ever GROUPS and REPHRASES; what happens to the groups is decided here,
//     and nothing it says can approve, reject or delete anything.
import type { DatabaseHandle } from "../../db/database.js";

export interface MergeableTrait {
  id: string;
  category: string;
  title: string;
  summary: string;
  evidence: string;
  confidence: number;
}

export interface TraitMergeGroup {
  ids: string[];
  title: string;
  summary: string;
}

/**
 * Read the model's grouping without trusting a character of it.
 *
 * Every rule here is a refusal: unknown ids, ids claimed twice, groups of one,
 * and groups that mix categories are all dropped rather than repaired. A merge
 * pass that does less than it could is a mild inefficiency; one that merges
 * the wrong things rewrites what the Owner is being asked to approve.
 */
export function parseTraitMergeGroups(
  text: string,
  candidates: MergeableTrait[],
): TraitMergeGroup[] {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return [];
  }
  const list = (parsed as { groups?: unknown }).groups;
  if (!Array.isArray(list)) return [];

  const byId = new Map(candidates.map((entry) => [entry.id, entry]));
  const claimed = new Set<string>();
  const groups: TraitMergeGroup[] = [];
  for (const entry of list.slice(0, 10)) {
    const record = entry as Record<string, unknown>;
    const ids = Array.isArray(record.ids)
      ? record.ids.filter(
          (id): id is string => typeof id === "string" && byId.has(id),
        )
      : [];
    const unique = [...new Set(ids)].filter((id) => !claimed.has(id));
    if (unique.length < 2) continue;
    // One group, one category. A "same thing" that spans categories is the
    // model overreaching, not a duplicate.
    const category = byId.get(unique[0] as string)?.category;
    if (!unique.every((id) => byId.get(id)?.category === category)) continue;
    const title =
      typeof record.title === "string" && record.title.trim()
        ? record.title.trim().slice(0, 120)
        : (byId.get(unique[0] as string)?.title ?? "");
    const summary =
      typeof record.summary === "string" && record.summary.trim()
        ? record.summary.trim().slice(0, 2_000)
        : (byId.get(unique[0] as string)?.summary ?? "");
    if (!title || !summary) continue;
    for (const id of unique) claimed.add(id);
    groups.push({ ids: unique, title, summary });
  }
  return groups;
}

/** What the model is asked. Groups only — never verdicts. */
export function traitMergePrompt(candidates: MergeableTrait[]): string {
  return [
    "These are separate pending observations about the same person. Some describe the same underlying thing in different words.",
    "Group ONLY the ones that clearly describe the same thing. Most groups should be no group at all.",
    "For each group, write one merged title and one merged summary that covers all of them.",
    'Reply with ONLY JSON: {"groups":[{"ids":["<id>","<id>"],"title":"<merged>","summary":"<merged>"}]}',
    'No duplicates found? Reply with exactly: {"groups":[]}',
    "",
    ...candidates.map(
      (entry) =>
        `id ${entry.id} [${entry.category}] ${entry.title}: ${entry.summary} (evidence: ${entry.evidence.slice(0, 200)})`,
    ),
  ].join("\n");
}

/**
 * Fold each group into one new pending proposal and retire its members.
 *
 * The merged row's evidence is the members' evidence joined verbatim — the
 * quotes are the part of a proposal that cannot be paraphrased, because they
 * are the Owner's own words and the reason to believe the claim at all.
 */
export function applyTraitMergeGroups(
  database: DatabaseHandle,
  groups: TraitMergeGroup[],
  candidates: MergeableTrait[],
  modeId: string | null,
  ownerId: string,
): number {
  const byId = new Map(candidates.map((entry) => [entry.id, entry]));
  let merged = 0;
  for (const group of groups) {
    const members = group.ids
      .map((id) => byId.get(id))
      .filter((entry): entry is MergeableTrait => entry !== undefined);
    if (members.length < 2) continue;
    const evidence = members
      .map((entry) => entry.evidence.trim())
      .filter(Boolean)
      .join("\n")
      .slice(0, 2_000);
    const confidence = Math.max(...members.map((entry) => entry.confidence));
    const id = `merged-${members[0]!.id}`;
    database.sqlite
      .prepare(
        `INSERT INTO vaenyx_me_candidates (
           id, category, title, proposed_summary, proposed_evidence,
           source_type, source_id, confidence, status, created_by, mode_id
         ) VALUES (?, ?, ?, ?, ?, 'chat_history', NULL, ?, 'pending_review', ?, ?)`,
      )
      .run(
        id,
        members[0]!.category,
        group.title,
        group.summary,
        evidence,
        confidence,
        ownerId,
        modeId,
      );
    // Retired, not erased — see the note at the top for both reasons.
    const marks = database.sqlite.prepare(
      `UPDATE vaenyx_me_candidates SET status = 'deleted'
        WHERE id = ? AND status = 'pending_review'`,
    );
    for (const member of members) marks.run(member.id);
    merged += 1;
  }
  return merged;
}

/**
 * FACT duplicates: identical slot + identical value, newest kept. Pure SQL —
 * "the same fact twice" has an exact definition, so no model gets a say. A
 * same-slot DIFFERENT-value pair is left alone on purpose: that is a conflict
 * for the Owner, and hiding one side of it would be deciding it for them.
 */
export function mergeDuplicateFacts(
  database: DatabaseHandle,
  modeId: string | null,
): number {
  const result = database.sqlite
    .prepare(
      `UPDATE vaenyx_me_candidates SET status = 'deleted'
        WHERE status = 'pending_review'
          AND proposed_slot IS NOT NULL
          AND mode_id IS ?
          AND id NOT IN (
            SELECT id FROM (
              SELECT id, MAX(created_at)
                FROM vaenyx_me_candidates
               WHERE status = 'pending_review'
                 AND proposed_slot IS NOT NULL
                 AND mode_id IS ?
               GROUP BY proposed_slot, proposed_value
            )
          )`,
    )
    .run(modeId, modeId);
  return Number(result.changes ?? 0);
}

/** The pending traits of one Mode, oldest first so merged ids stay stable. */
export function listMergeableTraits(
  database: DatabaseHandle,
  modeId: string | null,
): MergeableTrait[] {
  return database.sqlite
    .prepare(
      `SELECT id, category, title, proposed_summary AS summary,
              proposed_evidence AS evidence, confidence
         FROM vaenyx_me_candidates
        WHERE status = 'pending_review'
          AND proposed_slot IS NULL
          AND mode_id IS ?
        ORDER BY created_at ASC`,
    )
    .all(modeId) as unknown as MergeableTrait[];
}
