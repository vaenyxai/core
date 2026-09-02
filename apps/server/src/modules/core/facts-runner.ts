// The nightly pass: find conversations that have gone quiet, read what the
// Owner said in them, and put anything durable in the review queue.
//
// This is the one piece that costs a model call, so it is also the one piece
// that must never be on the reply path. It is a timer, it takes a handful of
// conversations at a time, and every failure is a log line.
//
// WHY IT CAN AFFORD TO BE THOROUGH. A cloud assistant pays per token to
// consolidate memory, so it does it rarely and cheaply. This machine is the
// household's own, and at three in the morning it is doing nothing. That is
// the one advantage self-hosting has that is not about privacy, and it is
// worth spending: run often, read carefully, propose conservatively. The only
// hard rule is that none of it may slow down a conversation that is happening.
import type { DatabaseHandle } from "../../db/database.js";
import { getDefaultProvider } from "../models/registry.js";
import { FACT_SLOTS } from "./fact-slots.js";
import {
  extractionPrompt,
  idleConversations,
  markExtractionRun,
  ownerMessagesSince,
  parseProposedFacts,
  queueProposedFacts,
} from "./facts-extract.js";

export interface ExtractionPassResult {
  conversations: number;
  queued: number;
}

/**
 * One pass. Returns what it did so the caller can log it; never throws — a
 * background job that can take the server down with it is worse than one that
 * quietly gets nothing done.
 */
export async function runFactExtractionPass(
  database: DatabaseHandle,
  ownerId: string,
): Promise<ExtractionPassResult> {
  const result: ExtractionPassResult = { conversations: 0, queued: 0 };
  let idle: ReturnType<typeof idleConversations>;
  try {
    idle = idleConversations(database);
  } catch {
    return result;
  }
  if (idle.length === 0) return result;

  let provider;
  try {
    provider = getDefaultProvider();
  } catch {
    // No backend connected yet. Nothing to do, and nothing to complain about:
    // a household that has not connected a model has not lost anything here.
    return result;
  }

  for (const conversation of idle) {
    const lastSeen = database.sqlite
      .prepare(
        `SELECT last_message_id AS lastMessageId FROM fact_extraction_state
          WHERE conversation_id = ?`,
      )
      .get(conversation.conversationId) as unknown as
      | { lastMessageId: string | null }
      | undefined;

    const messages = ownerMessagesSince(
      database,
      conversation.conversationId,
      lastSeen?.lastMessageId ?? null,
    );
    if (messages.length === 0) {
      markExtractionRun(
        database,
        conversation.conversationId,
        conversation.lastMessageId,
      );
      continue;
    }

    try {
      const answer = await provider.sendChat(
        [
          {
            content: extractionPrompt([...FACT_SLOTS], messages),
            role: "owner",
          },
        ],
        undefined,
        // No web, no tools: this turn reads the Owner's own sentences and
        // answers with JSON. Anything it could fetch would be exactly the
        // content this whole design keeps out of long-term memory.
        { allowWeb: false },
      );
      const proposals = parseProposedFacts(answer.answer);
      result.queued += queueProposedFacts(database, {
        conversationId: conversation.conversationId,
        modeId: conversation.modeId,
        ownerId,
        proposals,
        sourceMessages: messages,
      });
      result.conversations += 1;
      markExtractionRun(
        database,
        conversation.conversationId,
        conversation.lastMessageId,
      );
    } catch {
      markExtractionRun(
        database,
        conversation.conversationId,
        lastSeen?.lastMessageId ?? null,
        true,
      );
    }
  }
  return result;
}
