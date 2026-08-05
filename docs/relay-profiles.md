# Relay Profiles v1 — a subscription identity per app

The Subscription Door (`/v1/ai/*`) lets the Owner's other apps borrow the
ChatGPT and Claude subscriptions signed in on the Vaenyx machine. Until now the
door had ONE pair of logins — Vaenyx's own — serving every caller. Relay
Profiles gives each app key its own: its own credential directories, its own
sign-in, its own usage line, its own key lifecycle.

Everything here EXTENDS the existing App Profile system (`app_profiles`). There
is no second registry: an app's key is its identity everywhere in Vaenyx.

## The one rule everything follows

**The key is the identity.** Every profile endpoint authenticates with the
app's own `vaenyx_app_…` key and acts on the profile that key belongs to. No
request carries an `appId`; a client cannot name a profile, so one app is
physically unable to reach another's credentials, login, or key. The door's
shared `vaenyx_door_…` key does not work on these endpoints — it has no
profile.

**No credential ever leaves.** Status answers are connected-or-not, timestamps,
the key's version and prefix. There is no export, no reveal, no refresh-token
pass-through of any kind. A leaked app key cannot be exchanged for a
subscription login.

## Credentials on disk

```
userdata/codex-home                      Vaenyx's own (unchanged)
userdata/claude-home                     Vaenyx's own (unchanged)
userdata/profiles/<profileId>/codex-home   the app's ChatGPT login
userdata/profiles/<profileId>/claude-home  the app's Claude login
```

Same mechanism as core (`CODEX_HOME` / `CLAUDE_CONFIG_DIR` env), parameterised
by profile. A profile's calls never read core's directories and never fall back
to them (see modes below). The `~/.codex/auth.json` convenience copy that core
performs on first run is core-only — a profile starts signed out, always.

## Login modes and migration

Every existing profile starts in **`shared-door`** mode: its calls ride the
door's own credentials, exactly as before this feature. Nothing breaks on
upgrade; no client has to change.

The first completed sign-in flips the profile to **`dedicated`**, permanently.
From then on its calls use only its own login, and an engine it has not
connected answers `RELAY_PROFILE_NOT_CONNECTED:<engine>` (503). It never
silently falls back to the door's account: an account switch nobody chose,
billed to somebody who did not choose it, is the one failure this design
refuses to allow.

## Network prerequisite — the tailnet gate

Every door endpoint (`/v1/ai/*` and `/v1/relay/profile*`) requires the request
to arrive **through the tailnet**. Vaenyx sits behind Tailscale; `serve`
(tailnet traffic) injects a `Tailscale-User-Login` header and strips any
client-supplied copy, `funnel` (public traffic) strips it and injects nothing
— verified against the live machine on 2026-08-02, including that a forged
header sent through the public path arrives stripped.

Practical consequences for an app:

- The calling **device** must be on the Owner's tailnet. A device that is not
  gets `403 RELAY_TAILNET_REQUIRED` — a real HTTP answer, **not** a connection
  failure. Show "connect to Tailscale", not "Vaenyx is down" and not "key
  rejected"; all three have different fixes.
- A correct key from the public internet is still refused: the gate runs
  before any key is read. A leaked key alone can no longer reach the door.
- The Vaenyx web UI itself is NOT gated — a phone browser without Tailscale
  still opens the app. Only the door is tailnet-only.

## Endpoints

All under the same CORS policy as `/v1/ai/*`: the `Origin` must be in the
door's `allowedOrigins` list — configured per app origin, never `*`.
Auth header on every call: `Authorization: Bearer vaenyx_app_…`.

### `GET /v1/relay/profile`

The app's own status. Response:

```json
{
  "mode": "shared-door" | "dedicated",
  "engines": [
    { "id": "openai-cli", "connected": false, "connectedAt": null,
      "capabilities": ["text", "vision"] },
    { "id": "claude-cli", "connected": true,
      "connectedAt": "2026-08-02T04:11:09.000Z",
      "capabilities": ["text", "vision", "reading"] }
  ],
  "key": { "version": 2, "createdAt": "…", "rotatedAt": "…",
           "hint": "vaenyx_app_AbCdEf..." },
  "capabilities": ["vision", "reading"]
}
```

`capabilities` is the key's capability grant list (what the Owner ticked on the
Token screen), the same list `/v1/ai/run` enforces.

### `POST /v1/relay/profile/login/start` — body `{ "engine": "openai-cli" | "claude-cli" }`

Starts the OFFICIAL CLI's sign-in inside this profile's own credential
directory. Vaenyx never implements OAuth itself.

- `claude-cli` → `{ "url": "https://claude.com/…" }`. Show the URL to the
  user on any device; claude.com displays a code after sign-in.
- `openai-cli` → `{ "url": …, "detail": … }`. The Codex flow hosts a local
  OAuth callback on the Vaenyx machine, so the URL must be opened by a browser
  that can reach that machine's localhost — practically, a browser on the
  Vaenyx machine itself. `409 CODEX_LOGIN_BUSY` means another sign-in is mid
  flight (the callback port is single-occupancy); retry shortly.

### `POST /v1/relay/profile/login/complete` — body `{ "engine", "code"? }`

- `claude-cli`: `code` required — the code claude.com showed. The official
  process performs the exchange and writes its own credentials.
- `openai-cli`: no code exists; this asks whether the browser flow landed.
  `{ "connected": false }` means not yet.

Success flips the profile to `dedicated` and is audited.

### `POST /v1/relay/profile/disconnect` — body `{ "engine" }`

Deletes that engine's credentials for this profile (the whole per-engine
directory). The profile stays `dedicated` — disconnecting is an explicit act,
not a way back onto the door's account.

### `POST /v1/relay/profile/key/rotate` — empty body

Issues a fresh key bound to this profile, revokes the old one in the same
statement, returns `{ "token", "keyVersion" }`. The token appears in this
response once and is never retrievable again. Store it before answering the
user. If the response is lost mid-flight, the app is locked out and the Owner
re-issues from Vaenyx's Token screen — which is the recovery path, not a bug.

### `GET /v1/relay/usage` — Owner session only, not app keys

This month's spend per app × engine, shown in Settings → Subscription Door.
Call counts always; token counts only where an engine truly reports them
(Claude does, Codex does not) — never estimated.

## Errors an app must distinguish

| Situation | How it looks |
|---|---|
| Device not on the tailnet | `403` `RELAY_TAILNET_REQUIRED` — an answer, not a timeout |
| Vaenyx unreachable | network error / timeout — fall back to your free model |
| Key rejected or revoked | `401` `RELAY_PROFILE_REQUIRED` (profile routes) / `401` on `/v1/ai/run` |
| Owner not in allowed list | `403` `RELAY_NOT_OWNER` |
| Door switched off | `503` `RELAY_OFF` |
| Door's own login missing (shared-door mode) | `503` `RELAY_NOT_SIGNED_IN:<engine>` |
| This profile's login missing (dedicated mode) | `503` `RELAY_PROFILE_NOT_CONNECTED:<engine>` — start a sign-in |
| Capability off on the machine | `403` `RELAY_CAPABILITY_OFF:<capability>` |
| Capability not granted to this key | `403` `RELAY_CAPABILITY_NOT_GRANTED:<capability>` |
| Engine cannot do that job | `400` `RELAY_CAPABILITY_UNSUPPORTED:<engine>:<capability>` |
| Another sign-in mid-flight (Codex) | `409` `CODEX_LOGIN_BUSY` |
| Claude sign-in not started / code wrong | `502` `CLAUDE_LOGIN_NOT_STARTED` / `CLAUDE_LOGIN_CODE_REJECTED` |

## What is logged

Per call: app id, engine, action, result, duration. Never the prompt, never a
file, never an answer, never a token or secret. Login start/complete,
disconnect and key rotation each write their own audit entry (Guard page):
who, when, which profile — a key that can sign in has more power than a key
that can only ask, and its history must be answerable.

## Not in v1

- Network configuration (Tailscale) — separate task, unchanged.
- Owner-side UI for a profile's login state (apps manage their own).
- Turning `shared-door` mode off machine-wide.
