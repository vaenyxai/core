# Security Policy

## Reporting a vulnerability

Report security issues to **hello@vaenyx.ai** with the subject line
`Security report`. Please describe the issue and where it appears rather than
attaching sensitive data — the mailbox is handled by email on overseas servers,
so include only what's needed.

We are a small operation: reports are triaged promptly, serious issues first.
Please give us a reasonable window to fix an issue before disclosing it
publicly.

## Design posture

Vaenyx is private-first and fail-closed:

- The server binds to `127.0.0.1` by default. Do not expose a Vaenyx instance
  directly to the public internet; remote access should go through an
  authenticated, encrypted layer (for example Tailscale) with the Vaenyx login
  in front.
- All personal data (database, library, backups, logs) lives on the owner's own
  machine, outside the repository tree.
- Community Library content is **declarative-only** — no executable code is
  installed or run from community items, and installed items are governed by
  content-hash version locks.
- Model provider credentials stay on the owner's machine and are write-only in
  the UI; the browser frontend never receives provider credentials or Codex
  authentication files. Vaenyx never reads, copies, logs, uploads, or stores
  Codex authentication files or access tokens.
- Production request logs redact authorization, cookies, and session response
  headers. Internal server errors are written only to local logs and are not
  returned to the browser.
- Backups contain private instance data. Keep them encrypted or physically
  protected when copied off the machine.

## For contributors: never commit

- `.env` files, provider credentials, API keys, tokens, or auth files
- `userdata/` (database, library, backups, logs, exports) or legacy
  `private/` / `data/` / `backups/` folders
- real memory, projects, tasks, or behaviour logs
- any personal, family, client, or company data

See `docs/privacy-and-git.md` for the full privacy-and-git rules.
