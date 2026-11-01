# Temporary Local PDF References

This opt-in research input is for an Owner-approved, finite local test. It does not
grant directory access, memory access, a download server or a cloud file-host exception.
The existing HTTPS file-link path remains the normal file transport.

## Operator And Owner

- Install `local-file-allowlist.json` in the machine's `Vaenyx` application-data
  directory (`PROGRAMDATA`, or the OS temporary directory when unavailable).
  Keep this private file and the PDFs out of Git. The server reads it at startup;
  there is no HTTP API to install, edit or choose its paths.
- The manifest has `version: 1`, `batch_id`, `profile_name`, `client_origin`,
  `task_id`, and `files`. Each file declares `id`, `name`, absolute `path`,
  `sha256`, `original_sha256`, `original_page_count`, `original_from`, `original_to`,
  `page_count`, and `allowed_pages: {from,to}`. Page numbers are one-based and inclusive.
  Names and original-page mappings are operator declarations, not model evidence.
- Only the unique enabled Relay profile with that name can receive the files.
  The origin must be an exact HTTPS origin. Maximum 20 entries; existing Relay byte
  limits still apply. PDF hash, page count and nonredirected path are checked.
- Open `/?local-files=1` as Owner in User Mode. Select eligible IDs and approve.
  No file is selected automatically. Owner endpoints accept IDs only, never paths.
  Every reference expires ten minutes after approval. Revoke the task on this page.
  Restart, App disable and key rotation invalidate existing references.

## App Contract

- `GET /v1/ai/local-files` requires the App's Bearer Model Key, Tailnet and the approved
  `Origin`. It returns `{version:1, grants:[...]}` with no local paths.
- A grant includes `file`, `task_id`, fixed `request_id`, original-page metadata,
  `page_count`, `allowed_pages`, `expires_at`, and `status` (`ready`, `running`,
  `completed`, `failed`, `expired`, `revoked`). It is not a certificate that pages were read.
- `file` contains `id`, `name`, `sha256`, `mime: "application/pdf"` and
  `file_ref: {version:1, token:<opaque>}`. Keep the token ephemeral and out of logs.
- Submit one granted file unchanged to the existing `/v1/ai/run` with
  `capability: "research"`, the granted task/request IDs, explicitly selected model,
  task instructions and the ordinary research budget. Use either `url` or `file_ref`,
  never both. Other capabilities do not accept local references.
- Every tool read, including a cache hit, rechecks scope and expiry. Hash validation
  precedes model work. Original files stay in place; temporary renderings are cleaned
  by the existing research runner. No provider, billing or model fallback changes.
- Identical completed retries within the reference lifetime replay the in-memory
  response. Changed, running and failed attempts are refused. Do not retry unknown
  outcomes or mint replacement tokens for an attempted file. After restart the app
  must retain its own receipt and uncertainty state; server deduplication is ephemeral.
- Source URL and fetch time are `null` for local files. Local bytes consume the input
  byte budget but are not reported as network downloads. Unknown model/usage stays null.
  Output source pages refer to the segment; preserve the supplied original-page mapping.
- Outer failures use `RELAY_LOCAL_FILE_*`; research tool failures use `local_file_*`.
  The caller owns domain interpretation, receipts and memory. File access never loads
  Owner conversations, memory, another App's state or directory listings.
