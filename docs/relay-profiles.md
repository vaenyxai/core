# Relay Profiles v2 — one key, every verified safe capability

The Subscription Door (`/v1/ai/*`) lets the Owner's other apps use the
ChatGPT and Claude subscriptions connected on the Vaenyx machine. Each app has
one Model Key and separate per-engine credential directories. The key is the
identity; no request may name another profile.

## Boundaries

- Every endpoint requires a Relay-kind `vaenyx_app_…` key and the Owner
  Tailnet. Public traffic gets `403 RELAY_TAILNET_REQUIRED` before key use.
- OpenAI and Claude logins are independent. A missing login returns
  `503 RELAY_PROFILE_NOT_CONNECTED:<engine>` and never borrows another login.
- A valid Model Key receives every implemented safe capability. There are no
  per-key capability grants or switches.
- The machine-wide Owner safety ceiling still applies to Web, Vision and
  Reading.
- Subscription children receive no shell, file, browser-profile, cookie,
  secret, settings, messaging, purchase or account tools. Their working
  directories are empty jails; settings and MCP servers are not loaded.
- OpenAI and Anthropic API billing environment variables are removed. There is
  no API or cross-engine fallback.
- Linked files must use HTTPS and match the Owner hostname allowlist. Count,
  per-file bytes, total bytes, timeout and per-key calls/minute are bounded.
  Scratch files are removed after every outcome.

## Contract v2

Preferred capability names:

- `text_analysis`
- `structured_output`
- `vision_analysis`
- `document_analysis`
- `web_search`

The v1 aliases `text`, `vision`, `reading` and `web` remain accepted.
`caller` remains accepted but ignored. The key is the caller identity.

`GET /v1/ai/health` and `GET /v1/relay/profile` include
`contract_version: 2`, `capability_probe_revision`, independent login state,
and one `capability_status` entry per engine/capability:

```json
{
  "engine": "openai-cli",
  "login_status": "connected",
  "capability": "web_search",
  "supported": true,
  "available": true,
  "unavailable_reason": null,
  "provider": "openai",
  "model": "actual-model-reported-by-the-engine",
  "last_probe_at": "2026-09-03T00:00:00.000Z"
}
```

`supported` means Vaenyx has a transport for the capability. `available` is
true only after the current probe revision passes on that profile. An
unconnected, unprobed, failed or unimplemented capability stays false with an
exact reason. A successful ordinary Relay call also refreshes that
capability's probe record.

## Probe

`POST /v1/relay/profile/probe` runs real Subscription calls for the calling
profile. Image input is proved with a generated 256×256 picture whose colour
Vaenyx already knows. PDF input is proved with a fresh code printed inside a
generated PDF: Claude receives the PDF document block; OpenAI receives PNG
images rendered locally from the same PDF. A pass therefore proves the
transport and the model actually read the attachment, not merely that it
answered a prompt.

The Owner UI exposes the same operation as **Test all capabilities**. Its one
**Connect** action copies whichever Owner-side Subscription logins exist into
the app profile; the two engine statuses remain separate.

## Image and PDF input

Apps provide one short-lived HTTPS file URL in files. The hostname must be on
the Owner allowlist. For vision_analysis the file must be an image; for
document_analysis it must be a standard, unencrypted PDF.

Claude's Subscription transport sends the PDF as a native document block.
Codex App Server has no PDF input item, so Vaenyx renders every page to a
temporary PNG and sends those pages as localImage items in order. The
conversion is local and temporary; it never uses the OpenAI API, Anthropic
API, a billing key, or an external converter.

OpenAI PDF input is limited to 20 pages per call, with each rendered page
bounded to a 1,800-pixel long edge. Larger documents return
RELAY_PDF_TOO_MANY_PAGES; malformed, encrypted or unrenderable documents
return RELAY_PDF_UNREADABLE. Type mismatches return RELAY_IMAGE_REQUIRED or
RELAY_PDF_REQUIRED.

## Web search

Request:

```json
{
  "task": "competitor-evidence",
  "engine": "openai-cli",
  "capability": "web_search",
  "query": "Australian construction AI adoption 2026",
  "allowed_domains": ["abs.gov.au", "industry.gov.au"],
  "max_results": 5,
  "language": "en",
  "region": "AU"
}
```

Response keeps the common `text`, `engine`, `provider`, `model` and `ms`
fields, then adds `searched_at`, `query`, structured `results`, `citations`,
`fallback_occurred: false`, `fallback_disclosure`, and
`capability_probe_revision`.

Evidence is accepted only when the native Web Search tool ran in the same
turn. Vaenyx accepts structured tool URLs and the same turn's strict JSON
result list; ordinary model prose and JSON from a turn with no search-tool
event are never sources. Results require a valid HTTP(S) URL, are deduped,
merged so later metadata can fill an earlier empty snippet, filtered to
`allowed_domains`, limited to `max_results`, and shaped as `title`, `url`,
`snippet`, `published_at`. If a Subscription CLI cannot return verifiable
URLs, Vaenyx returns
`RELAY_CAPABILITY_UNSUPPORTED:<engine>:web_search:VERIFIABLE_SOURCES_NOT_RETURNED`.

## Model selection (contract revision 2.1)

Additive within v2: `contract_version` stays 2 and every response also
carries `contract_revision: "2.1"`. Old clients keep working unchanged; a
new explicit model request is honoured or refused, never swapped for the
default.

**Catalogue — `GET /v1/relay/models`** (same key and Tailnet rules as
health; `?refresh=1` re-asks the engine). Never a stored list: Codex is asked
`model/list` for the ChatGPT plan behind the profile's login, the Claude SDK
`supportedModels()` for its login. Cached ten minutes per profile;
`verified_at` says when the engine answered.

```json
{
  "contract_version": 2,
  "contract_revision": "2.1",
  "capability_probe_revision": "…",
  "engines": [
    {
      "engine": "openai-cli",
      "login_status": "connected",
      "catalogue_status": "ok",
      "unavailable_reason": null,
      "verified_at": "2026-09-01T12:00:00.000Z",
      "default_model": "gpt-5.5",
      "efforts": ["low", "medium", "high", "xhigh"],
      "models": [
        {
          "id": "gpt-5.4",
          "resolved_id": "gpt-5.4",
          "display_name": "gpt-5.4",
          "default": false,
          "selectable": true,
          "unavailable_reason": null,
          "efforts": ["low", "medium", "high", "xhigh"],
          "default_effort": "medium",
          "input": ["text", "image"],
          "upgrade_to": null,
          "model_reported_by_engine": false,
          "verified": [
            {
              "capability": "structured_output",
              "ok": true,
              "reason": null,
              "actual_model": "gpt-5.4",
              "model_reported_by_engine": false,
              "effort": "low",
              "path": "test",
              "at": "2026-09-01T12:01:00.000Z"
            }
          ]
        }
      ]
    }
  ]
}
```

`selectable: false` rows are listed but refused (`unavailable_reason`).
`verified` holds only evidence gathered by THIS profile, on THIS model, under
the current `capability_probe_revision`; a revision bump retires it all.

**Selecting on a call** — `POST /v1/ai/run` accepts optional `model` (an
`id` or `resolved_id` from the catalogue) and `effort` (one of that
model's `efforts`), valid for that one call only. Nothing in any config file
changes, no other caller's or concurrent task's model changes, Vaenyx's own
main model does not change.

**What comes back** — every run response now carries:

- `requested_model`: what the call asked for, or null.
- `model`: what ran, as far as the engine will say.
- `model_reported_by_engine`: `true` for Claude (the SDK reports the model
  on every assistant message and in `modelUsage`); `false` for Codex.
- `model_evidence`: `"engine_report"`, or for Codex
  `"thread_config_echo_and_turn_completed"` — app-server echoes the thread's
  configured model and fails the turn on a model the plan does not allow
  (live-verified 2026-09-01), but reports no per-turn model. Treat the Codex
  model as configured-and-completed, not measured.
- `effort` / `effort_reported_by_engine`: Codex echoes the spawn-time
  reasoning effort on thread/start (reported: true); Claude accepts the SDK
  effort parameter but reports no applied level (reported: false).

**Per-model test — `POST /v1/relay/models/test`**
`{ "engine", "model", "effort"?, "capability"? }` with capability one of
`text_analysis` (default), `structured_output`, `vision_analysis`. One
real call on that model; the answer is a `RelayModelTestResult` with
`status` ok/failed, the same model-evidence fields as a run, `ms`,
`verified_at`, and both revisions. The evidence lands on that model's
`verified` list in the catalogue. Refusals before the engine is reached come
back as error codes (below); an engine failure is a `failed` result.

**Errors** (all as `{ "error": "<code>" }`):

- `RELAY_MODEL_INVALID:<engine>:<model>` — 400, not in the engine's catalogue.
- `RELAY_EFFORT_INVALID:<engine>[:<model>]:<effort>` — 400, not a tier the
  engine (or that model) offers.
- `RELAY_MODEL_NOT_AVAILABLE:<engine>:<model>` — 404, listed but not
  selectable, or the backend refused it at run time in its own words.
- `RELAY_MODEL_NOT_HONOURED:<engine>:<requested>:<actual>` — 409, the engine
  reported a different model than requested; the answer is discarded.
- `RELAY_MODEL_CATALOGUE_UNAVAILABLE` — 503, the engine did not list.
- `RELAY_PROFILE_NOT_CONNECTED:<engine>` — 503, no login to ask.
- `RELAY_TIMEOUT` — 504, the engine did not finish in time.
- Quota exhaustion surfaces as the engine's own failure code; no API key,
  billing fallback or cross-engine substitute ever runs.

**Isolation** — the Owner's own main model (Settings → Models) and every
app's per-call choice are separate facts; a per-call model touches nothing
stored. Each relay call opens its own ephemeral thread with its own model, so
concurrent calls on one profile never share a choice.

## Other endpoints

- `GET /v1/relay/profile`: calling profile status and non-secret key metadata.
- `GET /v1/relay/models`: the live model catalogue for the calling profile.
- `POST /v1/relay/models/test`: one real call on one model.
- `POST /v1/relay/profile/login/start`: start the official CLI sign-in.
- `POST /v1/relay/profile/login/complete`: finish/check that sign-in.
- `POST /v1/relay/profile/disconnect`: remove one profile engine login.
- `POST /v1/relay/profile/key/rotate`: atomically replace the Model Key.
- `GET /v1/relay/usage`: Owner-only usage ledger.

No profile status response carries credentials. Relay call logs contain app
id, engine, capability, duration and safe outcome only — never prompts, files,
answers, tokens, local paths or provider diagnostics.
