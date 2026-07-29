-- Document Reading (Oskar, 2026-07-29): a PDF the Owner fed to a chat rides on
-- the message like a photo does — the file itself, its display name, and the
-- page count the M1 cost gate named before it was read.
ALTER TABLE ask_vaenyx_messages ADD COLUMN document_id TEXT;
ALTER TABLE ask_vaenyx_messages ADD COLUMN document_name TEXT;
ALTER TABLE ask_vaenyx_messages ADD COLUMN document_pages INTEGER;
