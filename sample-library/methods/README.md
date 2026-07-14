# Vaenyx Library — Methods (folder contract)

A **Method** is a self-contained folder here. The Vaenyx server reads it at
runtime (no build step, nothing compiled in) and runs it **declaratively**: the
recipe is fed to the selected model backend as text. Author-supplied code is
**never** executed — that is the safety guarantee.

The folder name **is** the method id (e.g. `sample-summary/` → id `sample-summary`).
Use a short kebab-case id.

## Layout

```
<method-id>/
  method.json      identity        (required)
  recipe.md        instructions    (required, plain text — never code)
  schema.json      input + output  (required)
  manifest.json    permissions     (optional, defaults to none)
  examples/
    0001.json      few-shot + test (optional, recommended)
    0002.json
```

### method.json
```json
{
  "name": "Human Name",
  "description": "One line. This is what progressive disclosure loads for every method — write it precisely so matching is accurate.",
  "version": "1.0.0",
  "category": "estimating"
}
```

### recipe.md
Plain-text instructions for the model: what to do, the rules, edge cases. No
code. This is the "human-readable how". Keep the output-format talk light — the
runtime appends the output schema and the worked examples automatically.

### schema.json
Two JSON Schemas (MCP-style) under `input` and `output`:
```json
{
  "input":  { "type": "object", "required": ["..."], "properties": { } },
  "output": { "type": "object", "required": ["..."], "properties": { } }
}
```
- `input` validates the caller's request body `input` before the model runs.
- `output` validates the model's structured answer; the run reports `outputValid`.
- Standard JSON Schema keywords (type / properties / required / items / enum /
  number bounds / string length …). Validation runs on Ajv draft-07; a `$schema`
  line is ignored, and an unknown `"format"` is advisory (won't fail) in Phase 1.

### manifest.json (optional)
Declares permissions and the behaviour-learning policy (default-deny). Loaded
and returned today; per-method enforcement of tool access is a later phase.
```json
{
  "permissions": { "network": false, "readFiles": false },
  "learning": { "enabled": false, "captures": [] }
}
```

### examples/*.json
Each example is **both** a few-shot demonstration and a future regression test:
```json
{
  "input":  { },
  "output": { },
  "note":   "why this is the right answer (optional)",
  "source": "synthetic | owner-correction (optional)",
  "time":   "2026-06-16 (optional)"
}
```
`input` and `output` are required; the rest is metadata. The runtime feeds up to
the first few (sorted by filename) as worked examples. **Use synthetic /
de-identified data here** — real correction data lives only in local SQLite.

## Versioning (content lock)

An App Profile that is granted a method pins a **content hash** of
`method.json + recipe.md + schema.json + manifest.json` (examples are NOT
hashed, so the flywheel can grow them freely). If you change any of those four,
the hash changes and apps must be re-granted — so **bump `version` whenever you
change behaviour**.

## Running a method

1. Owner grants it to an App Profile (`allowedMethodIds`) — that records the lock.
2. The app calls `POST /v1/library/methods/<id>/run` with its `vaenyx_app_*` token
   and body `{ "input": { … } }`.
3. Vaenyx verifies token → allowlist → version lock → input schema → runs the
   model → validates output → returns `{ output, outputValid, raw, … }`.

Owner-only inspection: `GET /v1/methods` (summaries), `GET /v1/methods/:id` (full).
