// The automatic half of the Project dual instruction design (spec §7, locked
// 2026-07-02): after chat rounds complete inside a project, Vaenyx rewrites a
// short Document of the Owner's preferences / facts / requirements for that
// project. The Document is REWRITTEN each time (not appended), is injected
// into the project's chat context, and the Owner can view, edit or delete it
// in the Projects panel. Runs fire-and-forget after the reply is already
// stored — a summary failure can never break a chat.
//
// Cadence is an engine parameter: VAENYX_PROJECT_SUMMARY_EVERY_ROUNDS
// (default: every 3 completed rounds per project).
import type { DatabaseHandle } from "../../db/database.js";
import { resolveProvider } from "../models/registry.js";

const DEFAULT_EVERY_ROUNDS = 3;
const MAX_SUMMARY_LENGTH = 8000;
const MAX_SOURCE_MESSAGES = 24;
const MAX_SOURCE_MESSAGE_LENGTH = 1500;

// One rewrite at a time per project — a slow model plus a chatty Owner must
// not stack concurrent rewrites of the same Document.
const runningProjects = new Set<string>();

function summaryCadence(): number {
  const raw = Number.parseInt(
    process.env.VAENYX_PROJECT_SUMMARY_EVERY_ROUNDS ?? "",
    10,
  );
  if (Number.isInteger(raw) && raw >= 1 && raw <= 50) return raw;
  return DEFAULT_EVERY_ROUNDS;
}

function buildSummaryPrompt(
  projectName: string,
  currentDocument: string,
  transcript: string,
): string {
  return [
    `You maintain a short standing Document about the "${projectName}" project for a personal assistant.`,
    "The Document records ONLY durable, reusable knowledge about how the user wants this project handled: their preferences, standing requirements, and stable facts (names, formats, currencies, tone, constraints).",
    "Rewrite the whole Document now, folding in anything new from the recent conversation below. Keep what is still true, drop what was superseded, and merge duplicates.",
    "Rules: plain text bullet points, at most 20 bullets, no headings, no commentary, no transcript quotes, never include passwords or secrets. If nothing durable is known yet, reply with the single word: EMPTY",
    "",
    "Current Document:",
    currentDocument.trim() === "" ? "(empty)" : currentDocument.trim(),
    "",
    "Recent conversation:",
    transcript,
  ].join("\n");
}

// Called after every completed assistant round in a project-bound chat.
// Increments the project's round counter; when the cadence is reached, resets
// it and rewrites the Document in the background.
export function noteProjectRoundCompleted(
  database: DatabaseHandle,
  conversationId: string,
  providerId: string | null,
): void {
  const row = database.sqlite
    .prepare(
      `SELECT projects.id AS project_id, projects.name AS project_name,
              projects.instructions_auto, projects.instructions_auto_rounds
       FROM vaenyx_threads
       JOIN projects ON projects.id = vaenyx_threads.project_id
       WHERE vaenyx_threads.conversation_id = ?
         AND projects.id != 'general'
       LIMIT 1`,
    )
    .get(conversationId) as
    | {
        project_id: string;
        project_name: string;
        instructions_auto: string;
        instructions_auto_rounds: number;
      }
    | undefined;
  if (!row) return;

  const rounds = row.instructions_auto_rounds + 1;
  if (rounds < summaryCadence()) {
    database.sqlite
      .prepare("UPDATE projects SET instructions_auto_rounds = ? WHERE id = ?")
      .run(rounds, row.project_id);
    return;
  }

  database.sqlite
    .prepare("UPDATE projects SET instructions_auto_rounds = 0 WHERE id = ?")
    .run(row.project_id);

  if (runningProjects.has(row.project_id)) return;
  runningProjects.add(row.project_id);
  void rewriteProjectDocument(
    database,
    row.project_id,
    row.project_name,
    row.instructions_auto,
    conversationId,
    providerId,
  ).finally(() => {
    runningProjects.delete(row.project_id);
  });
}

async function rewriteProjectDocument(
  database: DatabaseHandle,
  projectId: string,
  projectName: string,
  currentDocument: string,
  conversationId: string,
  providerId: string | null,
): Promise<void> {
  try {
    const messages = database.sqlite
      .prepare(
        `SELECT role, content FROM ask_vaenyx_messages
         WHERE conversation_id = ? AND status = 'completed'
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .all(conversationId, MAX_SOURCE_MESSAGES) as {
      role: string;
      content: string;
    }[];
    if (messages.length === 0) return;

    const transcript = messages
      .reverse()
      .map((message) => {
        const speaker = message.role === "owner" ? "User" : "Assistant";
        const content =
          message.content.length > MAX_SOURCE_MESSAGE_LENGTH
            ? `${message.content.slice(0, MAX_SOURCE_MESSAGE_LENGTH)}...`
            : message.content;
        return `${speaker}: ${content}`;
      })
      .join("\n");

    const result = await resolveProvider(providerId).sendChat(
      [
        {
          role: "owner",
          content: buildSummaryPrompt(projectName, currentDocument, transcript),
        },
      ],
      undefined,
      { reasoningEffort: "low" },
    );

    const answer = result.answer.trim();
    if (!answer || answer === "EMPTY") return;

    database.sqlite
      .prepare(
        `UPDATE projects
         SET instructions_auto = ?, instructions_auto_updated_at = ?
         WHERE id = ?`,
      )
      .run(
        answer.slice(0, MAX_SUMMARY_LENGTH),
        new Date().toISOString(),
        projectId,
      );
  } catch {
    // Background rewrite only — the next due round tries again. The Owner
    // always sees the Document's real state (and timestamp) in Projects.
  }
}
