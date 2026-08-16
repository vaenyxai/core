# Vaenyx

Self-hosted, local-first personal AI agent framework for households. React/Vite
web (`apps/web`) + Fastify server (`apps/server`) + shared TypeBox contracts
(`packages/contracts`) + SQLite. Node ≥ 24, npm ≥ 11. Windows launcher scripts
are the `Vaenyx-*.cmd` files at the repo root.

## Layout

- Code: `apps/`, `packages/`, `scripts/` (backup/diagnose/licenses tooling).
- User docs: `docs/` (guides, glossary) and `docs/legal/` (operative legal
  texts — the shipped copies; see `docs/legal/README.md`).
- `sample-library/` is the neutral demo seed only.
- **`userdata/` is the owner's private instance data (database, library,
  backups, logs). It is gitignored and must NEVER be committed — no personal
  data, credentials, tokens or logs ever enter this repository.**

## Working rules

- `npm run check` must pass before any commit (naming/architecture/translation
  checks, lint, typecheck, tests, build).
- English/Chinese doc pairs are enforced: `docs/translation-pairs.json` records
  each pair's last confirmed-consistent state. After editing either side,
  update the twin in the same commit, then re-record with
  `node scripts/Vaenyx-Check-Translations.mjs --write`.
- Regenerate `THIRD_PARTY_LICENSES.md` with `npm run licenses` when
  dependencies change; it ships with every release.
- `docs/user-manual.md` (English, authoritative) and `docs/user-manual.zh.md`
  are what the owner reads in Settings → Manual. **Any change to a feature the
  manual describes updates the manual in the same commit**, including the
  version line at its end — a manual that lags is worse than none.
- Legal/consent UI strings are implemented verbatim from the in-app copy pack
  (`docs/legal/in-app-disclaimers.md`), in both languages, via `apps/web/src/i18n.tsx`.
  Never claim "nothing leaves your device" in UI copy — the model backend is
  pluggable.
- The server binds `127.0.0.1` only; never widen the bind address.
- The "Vaenyx" name and brand assets are not MIT-licensed (see LICENSE and
  `docs/legal/trademark-policy.md`).

## Product rules (owner-set, 2026-08-16)

- **Visual output leads.** Whenever a feature touches images or its result
  can be shown visually (Routine results, photo flows, previews), the visual
  is the most prominent part of the output and text supports it. Pure-text
  features are fine as text — but the moment a visual exists, it leads.
- **Never decide silently.** When the app cannot confidently decide something
  on the user's behalf (ambiguous intent, either-way choices), it shows a
  chooser instead of guessing. Chooser text and options must be large and
  unmissable — sized for non-technical family members, never a footnote.
