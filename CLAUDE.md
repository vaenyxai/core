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

- `npm run check` must pass before any commit (naming/architecture checks,
  lint, typecheck, tests, build).
- Regenerate `THIRD_PARTY_LICENSES.md` with `npm run licenses` when
  dependencies change; it ships with every release.
- Legal/consent UI strings are implemented verbatim from the in-app copy pack
  (`docs/legal/in-app-disclaimers.md`), in both languages, via `apps/web/src/i18n.tsx`.
  Never claim "nothing leaves your device" in UI copy — the model backend is
  pluggable.
- The server binds `127.0.0.1` only; never widen the bind address.
- The "Vaenyx" name and brand assets are not MIT-licensed (see LICENSE and
  `docs/legal/trademark-policy.md`).
