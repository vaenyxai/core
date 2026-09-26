// H-013 addendum (Oskar, 2026-09-27) · WHEN A RUN IS WAITING FOR THE OWNER.
//
// A run is `waiting_for_owner` only while Vaenyx has asked the Owner a
// structured question (H-009) in that run and it is neither answered nor
// skipped. Nothing else sets it: pending Inbox approvals, held Project lines
// and memory candidates never do. The question hangs off the run's outcome
// message; answering or skipping returns the run to `running`, and the reply
// to that answer settles it (completed, failed, or waiting on a follow-up).
//
// A waiting run's model work has finished, so its `task_runs.status` is
// already 'completed'. The restart reconciler only touches status 'running',
// so a waiting run survives a restart as waiting — never as interrupted.
import type { DatabaseHandle } from "../../db/database.js";

// Added to a background run's instructions. A run is unattended, so it asks
// only when it cannot produce the deliverable without the Owner's choice.
export const RUN_QUESTION_INSTRUCTION = [
  "This run is unattended. Deliver the result without asking whenever a reasonable assumption works, and state the assumption in one line.",
  "Ask the Owner a structured question only when the deliverable genuinely cannot be produced without their choice; the run then waits for their answer.",
].join(" ");

const WAITING_STEPS = ["Started", "Worked on task", "Asked you a question"];
const ANSWERED_STEPS = [...WAITING_STEPS, "Got your answer"];
export const WAITING_STATUS_TEXT =
  "Vaenyx asked you a question. Answer it to continue.";

// The run whose outcome message carries this question.
const RUN_FOR_QUESTION = `progress_outcome_message_id = (
  SELECT assistant_message_id FROM ask_vaenyx_structured_questions WHERE id = ?
)`;

/** The run just asked a question on `messageId`: it now waits for the Owner. */
export function markRunWaitingForOwner(
  database: DatabaseHandle,
  runId: string,
  conversationId: string,
  messageId: string,
  now = new Date().toISOString(),
): void {
  database.sqlite
    .prepare(
      `UPDATE task_runs
       SET progress_state = 'waiting_for_owner',
           progress_conversation_id = ?,
           progress_current_step = 'Waiting for your answer',
           progress_completed_steps_json = ?,
           progress_status_text = ?,
           progress_outcome_message_id = ?,
           progress_revision = progress_revision + 1,
           progress_updated_at = ?
       WHERE id = ?`,
    )
    .run(
      conversationId,
      JSON.stringify(WAITING_STEPS),
      WAITING_STATUS_TEXT,
      messageId,
      now,
      runId,
    );
}

/** Answered or skipped: the waiting run continues. Call inside the claim's
 *  transaction so the answer and the state change land together. */
export function resumeRunAfterAnswer(
  database: DatabaseHandle,
  questionId: string,
  now = new Date().toISOString(),
): void {
  database.sqlite
    .prepare(
      `UPDATE task_runs
       SET progress_state = 'running',
           progress_current_step = 'Continuing with your answer',
           progress_completed_steps_json = ?,
           progress_status_text = 'Got your answer. Continuing.',
           progress_revision = progress_revision + 1,
           progress_updated_at = ?
       WHERE progress_state = 'waiting_for_owner' AND ${RUN_FOR_QUESTION}`,
    )
    .run(JSON.stringify(ANSWERED_STEPS), now, questionId);
}

/** The reply to the answer landed: settle the resumed run on it. A reply that
 *  asks a follow-up question puts the run back to waiting. */
export function settleRunAfterReply(
  database: DatabaseHandle,
  questionId: string,
  replyMessageId: string,
  outcome: "completed" | "failed" | "waiting",
  now = new Date().toISOString(),
): void {
  const settled = {
    completed: {
      state: "completed",
      steps: [...ANSWERED_STEPS, "Result saved"],
      text: "Task completed. The result is ready.",
    },
    failed: {
      state: "failed",
      steps: ANSWERED_STEPS,
      text: "Task failed. Review the safe error and retry when ready.",
    },
    waiting: {
      state: "waiting_for_owner",
      steps: [...ANSWERED_STEPS, "Asked you a question"],
      text: WAITING_STATUS_TEXT,
    },
  }[outcome];
  database.sqlite
    .prepare(
      `UPDATE task_runs
       SET progress_state = ?,
           progress_current_step = ?,
           progress_completed_steps_json = ?,
           progress_status_text = ?,
           progress_outcome_message_id = ?,
           progress_revision = progress_revision + 1,
           progress_updated_at = ?
       WHERE progress_state = 'running' AND ${RUN_FOR_QUESTION}`,
    )
    .run(
      settled.state,
      outcome === "waiting" ? "Waiting for your answer" : null,
      JSON.stringify(settled.steps.slice(0, 12)),
      settled.text,
      replyMessageId,
      now,
      questionId,
    );
}

/** On startup: a run resumed by an answer whose reply was cut off by the
 *  restart cannot finish on its own. Its answer is saved; say so and offer
 *  Retry. Waiting runs are left exactly as they are. */
export function reconcileAnsweredRuns(
  database: DatabaseHandle,
  now = new Date().toISOString(),
): number {
  const result = database.sqlite
    .prepare(
      `UPDATE task_runs
       SET progress_state = 'interrupted',
           progress_current_step = NULL,
           progress_status_text = 'Your answer was saved, but the reply was interrupted by a restart. Retry when ready.',
           progress_revision = progress_revision + 1,
           progress_updated_at = ?
       WHERE status != 'running' AND progress_state IN ('queued', 'running')`,
    )
    .run(now);
  return Number(result.changes ?? 0);
}
