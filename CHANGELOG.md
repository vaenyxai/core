# Changelog

User-facing release history for Vaenyx. Each released version here matches a
Git tag and a GitHub Release with the same notes. Day-to-day development
history lives in the commit log.

## Unreleased (0.2.1-dev line)

Since v0.2.0 the development line has added, among other things: chat-driven
Method editing with visibility notices, picture generation behind an
Owner-connected image engine (including a free Cloudflare Workers AI option)
with the sent prompt shown beside each image, per-slot engine keys, live task
watching (status and the model's thinking while a run works), retry and scroll
fixes, and the in-app legal set updated to v3.1 / copy 2.8. See the commit log
for the full list until these ship in the next tagged release.

## v0.2.0 — 2026-07-25

First public release.

Download `vaenyx-setup.zip`, unzip it, and double-click `Vaenyx-Setup.cmd`
inside the `Vaenyx` folder.

Setup checks the computer, installs Node.js if it is missing, fetches and
builds Vaenyx, offers to start it with Windows, then opens the first-run
wizard. Your notes, chats and files stay on that computer; what you send to a
connected cloud model goes to that provider.

Optional check: the SHA-256 of the download is published as
`vaenyx-setup.zip.sha256` next to the release asset.

## Earlier history

Versions before v0.2.0 were pre-release development builds with no published
releases. That history is not reconstructed here (status: unknown as release
units); it exists as commit history and internal development notes.
