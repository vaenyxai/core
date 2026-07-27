# Vaenyx

**A self-hosted, local-first personal AI agent for your household.** Vaenyx
runs on your own machine: your chats, memory, projects, tasks and files stay in
a local SQLite database under your control, and you choose which AI model
backend it talks to — a cloud provider under your own account, or a local model
on your own hardware.

> Status: pre-1.0, under active development. Interfaces and data formats may
> still change between versions.

## Install from the release zip (recommended)

1. Download `vaenyx-setup.zip` from the
   [latest release](https://github.com/vaenyxai/core/releases/latest).
2. Unzip it anywhere and double-click **`Vaenyx-Setup.cmd`**. It walks you
   through setup and starts Vaenyx; afterwards the app keeps itself up to date
   from inside Settings.
3. Open `http://localhost:3000` in your browser.

Cloning this repository with git also works (see below) and is the right path
for development — but note that a git checkout deliberately does **not**
self-update from releases; it updates with `git pull`. The release zip is the
install every guide and the website assume.

## What it does

- **Chat + projects + memory** — a personal assistant that keeps its context on
  your machine, organised into projects with reviewable memory.
- **Pluggable model backends** — OpenAI (Codex CLI or API key), Anthropic
  Claude, Google Gemini, or any OpenAI-compatible local endpoint (Ollama,
  LM Studio); pick a default and switch per chat.
- **Methods & Routines** — declarative building blocks (Methods) composed into
  ready-to-use products (Routines) that run locally: feed one something, it
  runs its steps and keeps a log.
- **Community Library** — browse and install Methods/Routines shared by the
  community; publish your own under a display name you choose. Community
  content is declarative-only: installing it never installs or runs code.
- **Scheduled tasks** — recurring runs with history, retry and cancel.
- **Backup & restore** — one-click snapshots of your database and library,
  stored locally.

## Privacy posture

Your instance's data lives in `userdata/` on your machine and is never
committed or uploaded by Vaenyx. Chats you send to a **cloud** model provider
do reach that provider under its own terms — that routing is your choice, per
chat. Using the Community Library needs no account; publishing uses a Google or
GitHub sign-in, with a self-chosen public display name. The formal terms,
privacy policy and contributor terms live in [`docs/legal/`](docs/legal/) and
inside the app under Settings → Legal.

## Run it (Windows)

Requirements: Node.js ≥ 24, npm ≥ 11.

1. Double-click `Vaenyx-Start.cmd`.
2. Open `http://localhost:3000` if the browser does not open automatically.
3. Stop from Settings → Stop Vaenyx (or `Vaenyx-Stop.cmd`).

`Vaenyx-Backup.cmd` snapshots your data; `Vaenyx-Update.cmd` updates from the
configured Git remote. See the
[Windows guide](docs/WINDOWS-MINI-PC-GUIDE.zh-CN.md) and the
[migration guide](docs/MIGRATE-TO-NEW-PC.zh-CN.md).

The server binds to `127.0.0.1` only. For phone access use an authenticated
tunnel (e.g. Tailscale) — never expose the port directly to the internet.

## Develop

```bash
npm ci
npm run dev      # Fastify server + Vite web dev servers
npm run check    # lint, typecheck, tests, build
```

Stack: React/Vite web app · Fastify server · shared TypeBox contracts ·
SQLite. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

Code: [MIT](LICENSE). Third-party dependencies:
[THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) (regenerated every release).
The "Vaenyx" name and brand assets are **not** MIT-licensed — see the
[Trademark Policy](docs/legal/trademark-policy.md); forks must rebrand.
Community-published content is CC BY 4.0 under the Contributor Agreement.

Security reports: [SECURITY.md](SECURITY.md).
