-- Custom Mode M2: which mode each signed-in device/session is currently in.
-- NULL = User Mode. Lives on the session so every device switches
-- independently and the server can enforce the sandbox on every request.
ALTER TABLE owner_sessions ADD COLUMN mode_id TEXT;
