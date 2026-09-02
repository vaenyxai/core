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
profile. It probes text/structured output, image input, Claude PDF input, and
web search. OpenAI PDF transport is reported as unsupported until implemented.

The Owner UI exposes the same operation as **Test all capabilities**. Its one
**Connect** action copies whichever Owner-side Subscription logins exist into
the app profile; the two engine statuses remain separate.

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

## Other endpoints

- `GET /v1/relay/profile`: calling profile status and non-secret key metadata.
- `POST /v1/relay/profile/login/start`: start the official CLI sign-in.
- `POST /v1/relay/profile/login/complete`: finish/check that sign-in.
- `POST /v1/relay/profile/disconnect`: remove one profile engine login.
- `POST /v1/relay/profile/key/rotate`: atomically replace the Model Key.
- `GET /v1/relay/usage`: Owner-only usage ledger.

No profile status response carries credentials. Relay call logs contain app
id, engine, capability, duration and safe outcome only — never prompts, files,
answers, tokens, local paths or provider diagnostics.
