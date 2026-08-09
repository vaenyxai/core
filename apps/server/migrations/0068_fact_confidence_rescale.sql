-- SIX SCORES THAT MEANT THE OPPOSITE OF WHAT THEY SAID.
--
-- The fact extractor's prompt never stated a scale, so the model answered "how
-- sure are you" as a probability — 0.9 — and Math.round stored it as 1 on a
-- 0-100 column. Every fact proposal in the live queue sits at exactly 1: not
-- unsure guesses, confident ones wearing the wrong label. The prompt and the
-- parser are fixed; these rows predate the fix and would otherwise carry the
-- lie forever.
--
-- It still matters even though no screen shows the number any more: approving
-- a fact divides this by 100 to become the fact's own stored confidence, so a
-- sure thing would enter the memory table at 0.01 and read as noise to
-- anything that later ranks or prunes by it.
--
-- 90 rather than 100 because the original answers clustered at 0.9. Scoped to
-- pending fact proposals with the impossible value: nothing a person already
-- reviewed is touched, and no real low score (they start at 40) is in range.
UPDATE vaenyx_me_candidates
SET confidence = 90
WHERE proposed_slot IS NOT NULL
  AND confidence <= 1
  AND status = 'pending_review';
