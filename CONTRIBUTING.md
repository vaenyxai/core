# Contributing to Vaenyx

Thanks for your interest in Vaenyx — a self-hosted, local-first personal agent
framework for households.

## Two different ways to contribute

1. **Code** (this repository): bug fixes, features, docs. Contributions are
   accepted under the repository's MIT License — by submitting a pull request
   you agree your contribution is licensed under the same terms (inbound =
   outbound). No CLA.
2. **Community content** (Methods and Routines): published from inside the app
   through the publish flow, under the Contributor Agreement shown there —
   not through this repository. Community content is licensed CC BY 4.0.

## Development setup

Requirements: Node.js ≥ 24, npm ≥ 11.

```bash
npm ci
npm run dev        # server + web dev servers
npm run check      # naming/architecture checks, lint, typecheck, tests, build
```

`npm run check` must pass before a pull request is reviewed.

## Guidelines

- Keep changes small and focused; one concern per pull request.
- Match the existing code style (Prettier + ESLint are enforced).
- Never claim absolute privacy in UI copy ("nothing leaves your device" is
  banned wording — the model backend is pluggable and a cloud provider may
  receive chat content). Legal/consent strings come only from
  `docs/legal/in-app-disclaimers.md`, verbatim, in both languages.
- Never commit personal data or credentials — see [SECURITY.md](SECURITY.md).
- Regenerate the third-party licence manifest (`npm run licenses`) when
  dependencies change.

## Security issues

Do not open public issues for vulnerabilities — see
[SECURITY.md](SECURITY.md) for the reporting channel.

## Trademark

"Vaenyx" and the Vaenyx brand assets are not covered by the MIT code licence.
Forks and modified distributions must be rebranded — see
`docs/legal/trademark-policy.md`.
