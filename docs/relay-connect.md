# App Connection Handover

This optional protocol connects an Owner's existing Relay App without copying
its Model Key. It does not create profiles, sign in subscriptions, invoke models,
grant business access, share Owner memory or change the existing Tailnet boundary.
Other apps keep their own identities, rules, data, model choices and results.

## Start From The Calling App

- Use a secure HTTPS app origin. Save a fresh random state, a PKCE S256 verifier
  and the initiating app-user scope privately on the device before navigation.
- State and verifier must each be 43–128 base64url characters. The challenge is
  `BASE64URL(SHA256(ASCII(verifier)))`, exactly 43 characters. Never put the verifier
  in a URL, the confirmation page, logs or the form below.
- Submit a **top-level form POST**, not fetch, to the configured Vaenyx origin's
  `/v1/relay/connect/start`, using `application/x-www-form-urlencoded`:

| Field                   | Value                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `version`               | `1`                                                                                 |
| `client_name`           | Requester's display name, up to 80 characters; not verified identity                |
| `client_origin`         | Exact canonical HTTPS origin, for example `https://app.example`                     |
| `return_uri`            | Fixed HTTPS return endpoint on that exact origin; no query, fragment or credentials |
| `state`                 | Fresh random state                                                                  |
| `code_challenge`        | S256 challenge                                                                      |
| `code_challenge_method` | `S256`                                                                              |

The browser Origin must match `client_origin`; the request must arrive over the
Owner's Tailnet. Duplicate/extra fields are refused. Start has no CORS access and
does not authorize a credential: it responds with 303 to `/?connect=<request_id>`.
This unpredictable request ID is not a handover code and cannot redeem a key.
Pending requests expire after five minutes; resource limits reject excess starts.

## Owner Confirmation And Return

Vaenyx requires an authenticated Owner in User Mode, displays the receiving
origin and return address, and requires selection of an enabled existing Relay
App. Opening the page does not approve it. Denial, expiry, changed profile or a
consumed request cannot be retried as an approval.

Approval snapshots the selected profile's key version. Vaenyx submits only
`code` and `state` to the bound `return_uri` by form POST. The code expires after
60 seconds and is never in a URL, clipboard, log or persisted request store.
Only an exact origin with a live Owner-approved grant gets exchange CORS access.

The receiving app must keep this return endpoint narrow: validate the configured
Vaenyx Origin, content type, size, exact field set and duplicate fields; use
no-store/no-referrer, strict CSP and no third-party resources or body logging.
Do not depend on a SameSite=Strict cookie accompanying the cross-site form POST.
Once back on the app origin, revalidate its current identity and permissions,
the initiating scope, state and pending expiry **before** exchanging. The return
must never create an app identity or imply business-data access.

## Browser Exchange

The browser sends JSON directly to `/v1/relay/connect/exchange` with credentials
omitted (no cookies), from the exact approved app origin over Tailnet:

```json
{
  "version": 1,
  "code": "<single-use-code>",
  "code_verifier": "<original-verifier>",
  "client_origin": "https://app.example",
  "return_uri": "https://app.example/connect/return"
}
```

On success the no-store response is
`{version:1, token, profile_id, profile_name, key_version}`. The token is the
existing App Key, not a subscription login or a new per-device authorization.
Exchange checks the exact origin/return address, S256 proof and fresh enabled
Relay profile/key version, and consumes the code atomically. A wrong origin,
wrong proof, replay, expiry, disable or key rotation never returns a key.
Restart discards all pending handovers. An unknown exchange outcome is not
automatically retried; start a new explicit connection instead.

Calling apps must keep credentials out of their code, cloud/shared model vaults,
URLs, logs, plaintext localStorage and Service Worker caches. A browser-local
encrypted store must bind the app's actual user/company scope and recheck it on
use; clear on explicit sign-out/account changes and report storage failure.
Browser encryption is not a hardware vault and cannot defeat same-origin XSS.
Refreshing may reuse a saved connection; clearing browser storage may remove it.
Disconnecting locally only clears that copy. Existing key rotation/revocation in
Vaenyx invalidates **all** copies for the App Profile.

Machine errors use `{error: "..."}` with `RELAY_TAILNET_REQUIRED` or
`RELAY_CONNECT_` followed by `INVALID_REQUEST`, `NOT_FOUND`, `EXPIRED`,
`ORIGIN_MISMATCH`, `PROOF_INVALID`, `PROFILE_CHANGED`, `TOKEN_UNAVAILABLE` or
`LIMIT`. Owner authentication/Custom Mode restrictions remain in force. No
successful connection implies that a chosen model or research capability was
tested; those still require explicit calls through the existing Relay contract.
