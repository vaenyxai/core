-- One message may carry up to five photos (Oskar, 2026-09-16: 连续拍最多五张
-- 一起发). image_id stays the FIRST photo, so every feature keyed on it —
-- marks, OCR, gallery, routines, the "latest photo" lookups — keeps working
-- unchanged; the second to fifth photos ride here as a JSON array of image ids.
-- NULL = the message has at most one photo.
ALTER TABLE ask_vaenyx_messages ADD COLUMN extra_image_ids TEXT;
