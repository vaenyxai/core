// The Update button next to the Free-option lines (Oskar, 2026-07-27). Free
// tiers move faster than releases: the shipped lines were verified by hand on a
// date that is printed next to them, and this lets the Owner ask their own main
// model for something fresher whenever they like.
//
// Honesty rule: what the model says is stored AS the model's answer — labelled
// with its name and the date — never blended into the hand-verified lines. The
// model may be wrong or stale; the label is what keeps that the model's problem
// to be judged, not a claim Vaenyx made.
import type { DatabaseHandle } from "../../db/database.js";
import type { ModelProvider } from "../models/provider.js";

export interface FreePickItem {
  text: string;
  checkedAt: string;
  source: string;
}

export interface FreePicks {
  items: {
    voiceIn?: FreePickItem;
    voiceOut?: FreePickItem;
    vision?: FreePickItem;
    image?: FreePickItem;
  };
}

const SETTING_KEY = "free_picks";

export function getFreePicks(database: DatabaseHandle): FreePicks | null {
  const row = database.sqlite
    .prepare("SELECT value FROM instance_settings WHERE key = ?")
    .get(SETTING_KEY) as { value: string } | undefined;
  if (!row?.value) return null;
  try {
    return JSON.parse(row.value) as FreePicks;
  } catch {
    return null;
  }
}

const PROMPT = `You maintain a self-hosted household AI app. For each of these four jobs, name the currently BEST free option (genuinely free tier, no card where possible) in ONE short sentence each, at most 90 characters: which provider/product and the one thing to know (limit, sign-up catch).

Jobs:
1. voiceIn — speech to text for a chat mic button
2. voiceOut — text to speech for reading replies aloud
3. vision — describing a user's photo
4. image — generating a picture from a prompt

Answer ONLY with JSON, no prose around it:
{"voiceIn":"...","voiceOut":"...","vision":"...","image":"..."}`;

/** Ask the main model and store its answer, labelled as its answer. */
export async function refreshFreePicks(
  database: DatabaseHandle,
  provider: ModelProvider,
): Promise<FreePicks> {
  const result = await provider.sendChat([
    { role: "owner", content: PROMPT },
  ]);
  const text = result.answer ?? "";
  // The model was told JSON-only, but fences and prose happen; dig the object
  // out rather than failing a whole button press on a markdown habit.
  const match = /\{[\s\S]*\}/.exec(text);
  if (!match) throw new Error("FREE_PICKS_NO_JSON");
  const parsed = JSON.parse(match[0]) as Record<string, unknown>;

  const checkedAt = new Date().toISOString();
  // Whether the backend actually searched the web is part of the label: an
  // answer from a model's memory and one from a live search age differently.
  const source = result.webSearchUsed
    ? `${provider.name}, web search`
    : provider.name;
  const item = (value: unknown): FreePickItem | undefined =>
    typeof value === "string" && value.trim()
      ? {
          text: value.trim().slice(0, 160),
          checkedAt,
          source,
        }
      : undefined;

  const picks: FreePicks = {
    items: {
      voiceIn: item(parsed.voiceIn),
      voiceOut: item(parsed.voiceOut),
      vision: item(parsed.vision),
      image: item(parsed.image),
    },
  };
  if (
    !picks.items.voiceIn &&
    !picks.items.voiceOut &&
    !picks.items.vision &&
    !picks.items.image
  ) {
    throw new Error("FREE_PICKS_EMPTY");
  }

  database.sqlite
    .prepare(
      `INSERT INTO instance_settings (key, value, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
    )
    .run(SETTING_KEY, JSON.stringify(picks));
  return picks;
}
