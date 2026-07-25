# Vaenyx — Current Implementation and Data-Handling Schedule

> **Generated from `implementation-status.json` — do not hand-edit.**
> Schedule version **2026-07-25.2** · effective from **2026-07-26** · verified **2026-07-25**
> Client **0.2.0-dev.173** · Server **vaenyx-core-cloud (migrations 0001-0003)**
> Minimum legal set **v2.5** · minimum copy version **2.5**

## Status of this Schedule

This Schedule is a factual snapshot for the identified release. It is **not part of the Terms of Service**, a product roadmap, a consent, a licence, or a promise that any capability will be introduced or maintained.

A capability is available only where it is marked **active** for the identified release. "not-built", "disabled", "backend-only", "local-only" and "manual-only" do not represent that the capability is or will become available to users.

This Schedule cannot expand any collection, use, disclosure, licence or authority permitted by the Core Legal Instruments, and cannot reduce any protection stated in them. A capability must remain disabled if any required notice, consent, contractual acceptance or technical safeguard is absent.

**Part A**, titled "Current Data-Handling Schedule", is incorporated into the Privacy Policy solely as the current factual description of the Operator's information-handling practices. It is **not** incorporated into the Terms of Service.

## Status vocabulary

| Status | Meaning |
|---|---|
| `active` | Available and in use in the identified release. |
| `available-off` | Shipped but disabled by default; requires an affirmative user action. |
| `local-only` | Operates entirely on the user's device; no Operator collection. |
| `backend-only` | Exists server-side but is not reachable by users. |
| `manual-only` | No automated process; performed by the Operator on request under a documented procedure. |
| `disabled` | Present in code but switched off. |
| `not-built` | Does not exist. No Operator collection, use or disclosure occurs through this capability. |
| `external-unverified` | Depends on a third party whose contractual position has not been verified. |

## Capabilities

| Capability | Status | Data leaves device | Operator receives |
|---|---|---|---|
| `feature.community-sharing.preference-ui` | **active** | no | none |
| `feature.community-sharing.upload-engine` | **not-built** | no | none |
| `feature.community-sharing.upload-endpoint` | **not-built** | no | none |
| `feature.community-sharing.deidentification-pipeline` | **not-built** | — | — |
| `feature.community-sharing.sensitive-category-gate` | **not-built** | — | — |
| `feature.community-sharing.server-evidence-record` | **backend-only** | — | — |
| `feature.publication.core` | **active** | yes | declarative files + signed-in identity |
| `feature.publication.example-attachment` | **not-built** | — | — |
| `feature.publication.deidentification-preview` | **not-built** | — | — |
| `feature.merit.record` | **not-built** | — | none |
| `feature.community.thanks` | **not-built** | — | none |
| `feature.community.ratings` | **not-built** | — | none |
| `ops.account.session-expiry` | **active** | — | — |
| `ops.account.expired-session-purge` | **not-built** | — | — |
| `ops.account.never-published-purge` | **not-built** | — | — |
| `ops.account.deletion-route` | **manual-only** | — | — |
| `feature.model-provider.connect` | **active** | yes | none |
| `feature.backup` | **active** | no | none |
| `feature.remote-access` | **available-off** | yes | none |

**`feature.community-sharing.preference-ui`** — Records a local preference only. Not consent to any upload. See gate.community-sharing.initial.

**`feature.community-sharing.sensitive-category-gate`** — Ships with the upload capability, not before it.

**`feature.community-sharing.server-evidence-record`** — D1 table flywheel_evidence exists (migration 0003) but nothing writes to it, because no upload path exists.

**`feature.publication.core`** — 
Files sent: `recipe.md`, `schema.json`, `manifest.json (if present)`, `method.json / routine.json with publisher display name stamped as owner`
Required gates: `legal.notice.publish`, `legal.consent.publish.warranty`, `legal.notice.publish.signIn`, `legal.consent.publish.overseas`
Evidence: apps/server/src/modules/core/publish.ts collectMethodFiles; core-cloud src/github.ts commitFiles

**`feature.publication.example-attachment`** — The publish path sends no examples/*.json. No de-identification or exact preview of examples exists.

**`ops.account.session-expiry`** — Sessions carry expires_at and cease to authenticate after it passes.
Evidence: core-cloud src/store.ts sessions table + expiry check

**`ops.account.expired-session-purge`** — Expired session rows are not deleted by any job.

**`ops.account.never-published-purge`** — The users table has no last_sign_in_at, so a 90-day since-last-sign-in purge cannot be implemented as previously described.

**`ops.account.deletion-route`** — No automated deletion route exists. Requests to hello@vaenyx.ai are actioned by the Operator directly against D1.

**`feature.model-provider.connect`** — User-Directed Third-Party Processing. Prompts and the context Vaenyx assembles (project instructions, auto-summarised preferences, project memories) go to the provider the user connects. The Operator receives nothing through this flow. Choosing a local model keeps everything on device.
Required gates: `legal.notice.modelConnect.cloud`, `legal.notice.modelConnect.local`, `legal.notice.modelPicker`

**`feature.backup`** — Manual and scheduled backup, destination choice, optional AES-256-GCM encryption, keep-most-recent-N retention. Local only.

**`feature.remote-access`** — Tailscale Funnel, configured outside the app under the user's own Tailscale account.

---

# Part A — Current Data-Handling Schedule

*Incorporated into the Privacy Policy as the current factual description of information handling. Not incorporated into the Terms of Service.*

## Active Operator data flows

### `flow.publication.submission`

- **Trigger:** User completes the publish step for an item they chose to publish.
- **Information:** declarative item files; publisher display name (public byline); account identifier; acceptance record: key name, copy version, language, account id, contribution id, timestamp
- **Primary purpose:** Carry out the publication the user requested; evidence acceptance of the Contributor Agreement; manage published content; moderation.
- **Recipients:** Vae Foundry Pty Ltd; GitHub, Inc.; Cloudflare, Inc.
- **Countries:** United States; global edge network
- **Overseas basis:** APP 8.2(b) express consent for the GitHub public disclosure; APP 8.1 reasonable steps for Cloudflare infrastructure (see unverified item below).
- **Retention:** Published Content: public and permanent beyond Operator control. Account Data: while Published Content exists.

### `flow.publication.signin`

- **Trigger:** User signs in with Google or GitHub in order to publish.
- **Information:** provider; provider user id; email; handle; display name; session token; expiry
- **Primary purpose:** Authentication, attribution, managing published content, moderation, evidencing publish-time acceptance.
- **Recipients:** Vae Foundry Pty Ltd; Cloudflare, Inc. (D1 storage)
- **Countries:** global edge network
- **Retention:** While Published Content exists. No automatic purge for never-published accounts is implemented (see ops.account.never-published-purge).

### `flow.infrastructure.request-metadata`

- **Trigger:** Any request from an Instance to Operator-run infrastructure (catalogue reads, publish service).
- **Information:** IP address; timestamps; user-agent and version strings; ordinary request metadata
- **Primary purpose:** Serving the request; security and abuse prevention.
- **Recipients:** Cloudflare, Inc.
- **Countries:** global edge network
- **Retention:** Per Cloudflare's edge logging defaults; no separate Operator log store.

### `flow.correspondence.email`

- **Trigger:** A person emails hello@vaenyx.ai.
- **Information:** whatever the sender includes; sender address
- **Primary purpose:** Responding to support requests, reports, complaints, access and correction requests.
- **Recipients:** Cloudflare, Inc. (Email Routing); Google LLC (Gmail)
- **Countries:** United States
- **Overseas basis:** APP 8.1 reasonable steps - CURRENTLY UNVERIFIED, see unverifiedItems.
- **Retention:** Deleted or de-identified within 24 months after the matter closes unless a documented legal hold applies.

## Local-only processing (no Operator collection)

- All Instance Data: chats, memories, files, project instruction windows, Journal and Gallery, raw corrections, Method Tokens, the private Library, backups.
- External-application feedback received through a Method Token: written to local SQLite only. No de-identification, Owner preview or external sharing exists for it.

## Declarations

- **Automated decision-making:** None. No program arranged by the Operator uses personal information to make, or do anything substantially and directly related to making, a decision that could reasonably be expected to significantly affect an individual's rights or interests.
- **Direct marketing:** None.
- **Sensitive information solicited:** None.

## Unverified items (stated as unverified, not as met)

### Cloudflare data-processing terms — `verified-with-caveat`

- **Issue:** undefined
- **Action required:** Re-check on material Cloudflare terms revisions. If certainty is needed, ask Cloudflare to confirm in writing that the DPA applies to personal information governed by the Australian Privacy Act.

### Operator mailbox — `external-unverified`

- **Issue:** hello@vaenyx.ai routes to a consumer Gmail account with no data-processing terms. Minimisation, the auto-reply notice and prompt triage supplement but do not replace enforceable contractual safeguards.
- **Action required:** Move the mailbox to a service under data-processing terms, or re-establish the lawful footing for the flow.
