-- Evolution was an MVP placeholder (an "Owner-approved self-change" proposal
-- queue) that never produced anything: the table has always been empty and the
-- UI/route are removed. The underlying rule — Vanta never changes itself
-- silently; self-changes need Owner approval — is retained in the guardrails and
-- is enforced concretely by Vanta Me review, Autonomy level 0, and Library
-- Verification, so no standalone Evolution surface is needed.
DROP TABLE IF EXISTS evolution_proposals;
