-- One review, many citations (Oskar, 2026-08-12): a proposal seen in several
-- conversations carries every origin — one line of grounds per source, each
-- with the conversation it came from — instead of losing the other side's
-- citation when twins merge. JSON array of {quote, conversationId}; NULL on
-- rows from before this column, which synthesize one entry at read time from
-- proposed_evidence + source_id.
ALTER TABLE vaenyx_me_candidates ADD COLUMN sources_json TEXT;
