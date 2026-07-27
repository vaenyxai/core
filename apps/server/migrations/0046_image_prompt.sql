-- F5's closing sentence is a promise: "Vaenyx shows you the prompt it sent."
-- The prompt is written by the main model, which can see context the Owner
-- never typed into that message — so the exact sentence that reached the image
-- provider is stored with the reply and shown beside the picture. Kept, or the
-- sentence gets cut; there is no third option (private, 2026-07-27).
ALTER TABLE ask_vaenyx_messages ADD COLUMN image_prompt TEXT;
