# Vaenyx — Current Implementation and Data-Handling Schedule

> **Generated from `implementation-status.json` — do not hand-edit.**
> Schedule version **2026-07-29.1** · effective from **2026-07-26** · verified **2026-07-29**
> Client **0.2.1-dev.44** · Server **vaenyx-core-cloud (migrations 0001-0007)**
> Legal set **v3.1** · minimum legal set **v3.0** · minimum copy version **2.9**

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
| `feature.community-sharing.upload-engine` | **available-off** | yes | one de-identified example in transit, deleted on collection |
| `feature.community-sharing.upload-endpoint` | **active** | no | one de-identified example in transit, deleted on collection |
| `feature.community-sharing.deidentification-pipeline` | **available-off** | — | — |
| `feature.community-sharing.sensitive-category-gate` | **available-off** | — | — |
| `feature.community-sharing.server-evidence-record` | **backend-only** | — | — |
| `feature.publication.core` | **active** | yes | declarative files + signed-in identity |
| `feature.publication.example-attachment` | **not-built** | — | — |
| `feature.publication.deidentification-preview` | **not-built** | — | — |
| `feature.merit.record` | **not-built** | — | none |
| `feature.community.thanks` | **not-built** | — | none |
| `feature.community.ratings` | **not-built** | — | none |
| `ops.account.session-expiry` | **active** | — | — |
| `ops.account.expired-session-purge` | **active** | — | — |
| `ops.account.never-published-purge` | **active** | — | — |
| `ops.account.deletion-route` | **manual-only** | — | — |
| `feature.model-provider.connect` | **active** | yes | none |
| `feature.backup` | **active** | no | none |
| `feature.remote-access` | **available-off** | yes | none |
| `feature.community.discord` | **active** | yes | Discord profile, posts and moderation records for the official server |
| `feature.skill-interop` | **active** | no | none |
| `feature.pictures.generation` | **available-off** | yes | none |

**`feature.community-sharing.preference-ui`** — Records a local preference only. Not consent to any upload. See gate.community-sharing.initial.

**`feature.community-sharing.upload-engine`** — Live and off unless the user turns it on. The transport is built and deployed; nothing queues or scans without the activation consent record (copy pack K3), and the Sharing preference recorded in earlier versions does not stand in for it — that preference was chosen when nothing could leave the machine, so it cannot carry consent to an upload that did not then exist.
Required gates: `legal.consent.flywheel.activate`, `legal.consent.flywheel.receive`, `legal.consent.flywheel.sensitiveAsk`, `flywheel.queue.window`, `flywheel.queue.held`
Evidence: Server enforces, in order: activation record present, publisher receiving switch on (403 if not, so nothing is stored), payload under 32 KB, 20 sends per contributor per day and 5 per contributor per Method per day counted against both the contributor label and a hashed connection, over-limit refused rather than stored. Delivery rows are deleted on collection and expire at 14 days; rate-limiting rows at 7. The instance identifier and consent-event identifier are validated and discarded, never written. Verified in production at dev.21: the capability switch is on, every Part K string renders verbatim at copy 2.7, and a real send completed end to end. The evidence block is now discarded rather than written — a test pins the evidence table at zero rows after an accepted send — so the Schedule's statement that we hold no consent record for a contributing household is true in code and in production, not only in intent. The 2.9 consent floor is enforced in three places that must agree - client, server and the publish service secret - and a test pins the behaviour that matters: an activation recorded under copy 2.8 leaves sharing OFF, so a 2.8-era acceptance cannot be reused for a mechanism it never described.

**`feature.community-sharing.upload-endpoint`** — The server side of improvement sharing (Part K), live at the publish service. It validates the evidence a sending instance presents and then discards it; refuses sends marked as made with sharing off; refuses where the publisher has not switched receiving on, storing nothing; enforces the 32 KB size cap and per-contributor rate limits, refusing over-limit sends rather than storing them; and holds a delivery only until it is collected or expires unread at 14 days.
Evidence: Deployed to production; a real send completed end to end at client dev.21. A test pins the evidence table at zero rows after an accepted send.

**`feature.community-sharing.deidentification-pipeline`** — Runs on the contributing user's device before anything is queued: personal details are stripped automatically, and the queue shows the result, so the user is the last check. Automatic and imperfect, and described as such everywhere it is mentioned (K3). Operates only when the user has turned sharing on.
Evidence: Part of the dev.21 production end-to-end send. The shipped K3 consent describes it, and shipped copy is audited verbatim against behaviour.

**`feature.community-sharing.sensitive-category-gate`** — Health, family and money content never enters the automatic path: it is held out of the queue and asked about individually, every time (K12 hold, G4 ask). Doing nothing means the item is not sent. Meaningful only while sharing is on — with sharing off, nothing queues at all.
Evidence: K12 and the G4 ask string ship in the audited string table at copy 2.7 and later; the held state was part of the dev.21 verified build.

**`feature.community-sharing.server-evidence-record`** — D1 table flywheel_evidence exists (migration 0003) but nothing writes to it, because no upload path exists.

**`feature.publication.core`** — The publish service validates shape, not content: permitted declarative file kinds, safe paths, size limits, item-id ownership, and that a removed item cannot be republished. It does not inspect what a recipe says. The app is a client, not a boundary — a signed-in account can call the endpoint directly — so any protection that matters must be enforced here, and no protection over the meaning of the words is claimed. The service applies a per-account publish rate limit, an operator-controlled pause switch, and an automated screen for contact and payment details that would otherwise reach a public repository. The screen operates on the submission only; its checks and thresholds are not published, and it is not represented as detecting anything in particular.
Files sent: `recipe.md`, `schema.json`, `manifest.json (if present)`, `method.json / routine.json with publisher display name stamped as owner`
Required gates: `legal.notice.publish`, `legal.notice.publish.contributorTerms`, `legal.consent.publish.warranty`, `legal.notice.publish.signIn`, `legal.consent.publish.overseas`
Evidence: apps/server/src/modules/core/publish.ts collectMethodFiles; core-cloud src/github.ts commitFiles

**`feature.publication.example-attachment`** — The publish path sends no examples/*.json. No de-identification or exact preview of examples exists.

**`ops.account.session-expiry`** — Sessions carry expires_at and cease to authenticate after it passes.
Evidence: core-cloud src/store.ts sessions table + expiry check

**`ops.account.expired-session-purge`** — Expired session rows are deleted 30 days after they expire, by a daily scheduled sweep. The 30 days is a grace period only, to leave room to answer "why was I signed out"; an expired session authenticates nothing from the moment it expires.
Evidence: core-cloud src/retention.ts SESSION_GRACE_DAYS + deleteExpiredSessionsBefore; scheduled handler in src/index.ts; cron "17 3 * * *"

**`ops.account.never-published-purge`** — An account that has never published anything and has not signed in for 90 days is deleted by the same daily sweep. Two deliberate exemptions: an account with Published Content is kept, because the byline and the acceptance evidence have to stay attached to it; and a banned account is kept, because deleting it would let a banned identity return by signing up again. Deleting an account cascades to its sessions and its acceptance records. The ban ledger has no foreign key to the account, so an enforcement record survives deletion by design.
Evidence: core-cloud src/retention.ts DORMANT_ACCOUNT_DAYS + store.ts deleteDormantUnpublishedUsers (banned_at IS NULL, COALESCE(last_sign_in_at, created_at) < cutoff, id NOT IN published_items); migration 0004 adds last_sign_in_at, refreshed at sign-in

**`ops.account.deletion-route`** — No automated deletion route exists. Requests to hello@vaenyx.ai are actioned by the Operator directly against D1.

**`feature.model-provider.connect`** — User-Directed Third-Party Processing. Prompts and the context Vaenyx assembles (project instructions, auto-summarised preferences, project memories) go to the provider the user connects. The Operator receives nothing through this flow. Choosing a local model keeps everything on device.
Required gates: `legal.notice.modelConnect.cloud`, `legal.notice.modelConnect.local`, `legal.notice.modelPicker`

**`feature.backup`** — Manual and scheduled backup, destination choice, optional AES-256-GCM encryption, keep-most-recent-N retention. Local only.

**`feature.remote-access`** — Tailscale Funnel, configured outside the app under the user's own Tailscale account.

**`feature.community.discord`** — The official Vaenyx Discord server is live and administered by the Operator. Participation is optional and requires a Discord account, which Vaenyx never requires. The in-product notice for this surface is copy pack string D5; it must ship wherever the product links to the server.
Required gates: `legal.notice.community.discord`

**`feature.skill-interop`** — Importing a Skill as a Method and exporting a Method as a Skill. The server side is built — SKILL.md parsing, enumeration of the specific steps dropped because they depended on code, provenance (source, licence on arrival, time, original file hash) written into method.json outside the content hash so recording it does not force every app grant to be re-granted, the publish gate that fires on provenance, and the export endpoint. The import and export screens shipped in 0.2.1-dev.7 and the capability switch is on, so a user can reach it. Both directions are local; nothing about an import or export reaches the Operator. Provenance does become public when such a Method is published, and that is intended — publishing the source and the original licence is what discharges the attribution most upstream licences require.
Required gates: `legal.notice.skill.import`, `legal.notice.skill.importedPublish`, `legal.notice.skill.export`
Evidence: Verified on a temporary instance rather than by reading the code: preview listed scripts/extract.py and the step that ran it while keeping the rest, import wrote provenance into method.json, the Method appeared in importedMethodIds so the L2 gate fires on provenance, and export returned the instructions intact. The temporary instance was deleted; the live instance was untouched throughout.

**`feature.pictures.generation`** — Owner asks for a picture in chat; the main model rewrites the request as one English prompt and sends it to an image provider the Owner connected with their own key. The generated image is written to local userdata and included in local backups. The Operator is not in this path and receives nothing. Two facts are disclosed because neither is guessable: the prompt is written by the main model, which can see saved context, so it may word things the Owner never typed; and the image provider may be a different company from the chat provider.
Required gates: `legal.notice.modelConnect.pictures`
Evidence: The draw option does not exist until an image engine is connected. What the model says about the picture is constrained by construction: generation happens before the model speaks and the result — success, the provider's own failure text, or nothing generated this turn — is injected into its context, so it cannot claim to have drawn something it did not. The F5 promise is kept rather than trimmed: the prompt actually sent is stored and displayed beneath each generated image (dev.32).

## Complaint and compliance records

Two regimes overlap here and are deliberately satisfied by one rule. The Basic Online Safety Expectations carry a five-year record-keeping expectation for reports and complaints about harmful material; it is not a directly enforceable obligation in itself, but eSafety can require an explanation of whether and how it is met, through a reporting notice, an investigation, or the non-compliance and public-reporting mechanisms. Separately, the industry standard applying to a designated internet service requires records of the steps taken to comply, kept until at least the end of the second year after the calendar year in which the step was taken — that one is a direct compliance requirement. Keeping the complaint ledger for five years satisfies both without running two systems.

- **Complaint ledger:** Complaint and disposition ledger: five years. Fields kept — date received, channel, case reference, reporter contact details, URL or item identifier, category, summary of the complaint, the necessary extract or limited snapshot of the material complained of, action taken, time of action, whether the item was hidden, removed, the account banned or the matter referred, final status, and whether a legal hold applies.
- **Compliance-step records:** Records of compliance steps: at least until the end of the second year after the calendar year in which the step was taken. Covers the Online Safety risk self-assessment and its versions, the complaint-handling process and its versions, and records of the filtering, rate-limiting and takedown controls actually implemented.
- **Attachments:** Evidence attachments are not kept as a matter of course. For a defamation, copyright, serious safety or regulatory matter, a limited plaintext snapshot or exact extract of the material complained of is kept together with its hash, so that what was acted on and why can be shown later. Identity documents and other high-risk attachments are deleted or isolated once the verification they were needed for is complete. An attachment that played no part in the decision is not kept.
- **Legal hold:** A legal hold is started on a litigation threat, a formal concerns notice, a court document, or a regulatory investigation, and suspends the ordinary deletion rules for the material within its scope.
- **What the Policy says:** The Privacy Policy states the general principle only — records are kept for as long as reasonably necessary for legal, safety, abuse-prevention and operational purposes. The periods above live here, not in the Policy, so that a change in the applicable standard does not require a policy amendment.

## Point-of-use copy

Copy version **2.9** · consent floor **2.9**

Two versions are tracked separately. The copy version moves whenever any string changes and is what gets recorded against an acknowledgement, so a record always says which text the person was shown. The consent floor moves only when a consent-class string changes in substance, and only the floor re-asks anyone. The last substantive consent change was 2.6. The floor moved to 2.9 on 2026-07-27: K3 gained the sentence saying each correction leaves on its own after 48 hours unless removed. Recording a default mode of 'automatic' against that consent is only honest if the consent screen said the sending is automatic, and at 2.8 it did not. Anyone who accepted under 2.8 is asked again.

**Drafted but not shipped.** These strings exist in the copy pack and are not missing from the product — the surface they belong to does not exist.

| String | Why it is not shipped |
|---|---|
| `legal.disclaimer.community.verifiedMeaning` | No Verified badge exists in the product. |
| `legal.notice.community.discord` | The product does not link to the Discord server. The server itself is live and is recorded as flow.community.discord; this string ships if and when a link appears in the product. |
| `legal.disclaimer.merit` | Merit is not built. |
| `legal.disclaimer.merit.creatorPage` | Merit is not built. |
| `legal.notice.remoteAccess.status` | There is no remote-access panel in the product. |
| `legal.consent.flywheel.sensitiveAsk` | Community sharing is not built, so there is no sensitive-content gate to consent to. |

**Limit of the copy audit.** The copy audit compares the copy pack against the app's string table. It does not check that a string is actually rendered on a surface, so "matches verbatim" means the wording is right, not that the wording is on screen. A string can sit in the table with no interface using it.

---

# Part A — Current Data-Handling Schedule

*Incorporated into the Privacy Policy as the current factual description of information handling. Not incorporated into the Terms of Service.*

## Active Operator data flows

### `flow.publication.submission`

- **Trigger:** User completes the publish step for an item they chose to publish.
- **Source:** The publishing user's Instance.
- **Collection method:** HTTPS request from the Instance to the publish service, initiated by the user completing the publish step.
- **Holding environment:** Publish service (Cloudflare Worker) and its D1 database; published files are committed to the public GitHub repository and served via the Cloudflare-hosted catalogue.
- **Linking:** Linked to the publishing account record (flow.publication.signin) and to the acceptance record for that contribution.
- **Information:** declarative item files; publisher display name (public byline); account identifier; acceptance record: key name, copy version, language, account id, contribution id, timestamp
- **Primary purpose:** Carry out the publication the user requested; evidence acceptance of the Contributor Agreement; manage published content; moderation.
- **Recipients:** Vae Foundry Pty Ltd and Cloudflare, Inc. — the submission, the publishing-account identifier and the contribution acceptance records; GitHub, Inc. — only the public declarative item files and the public byline
- **Countries:** United States; global edge network
- **Overseas basis:** APP 8.2(b) express consent for the GitHub public disclosure; APP 8.1 reasonable steps for Cloudflare infrastructure (see unverified item below).
- **Retention:** Published Content remains on Operator-controlled publication surfaces while published and may be removed under the takedown process. Repository history, and copies, forks, mirrors, caches and downloads outside our control, may persist. Publication and acceptance records are retained only while reasonably necessary to administer the item, evidence extant licences, or establish, exercise or defend legal claims, and are reviewed periodically.

### `flow.publication.signin`

- **Trigger:** User signs in with Google or GitHub in order to publish.
- **Source:** The identity provider the user chooses supplies the provider name, stable provider user ID, email and any available account handle, following the user's own sign-in action. The user supplies the public byline. The Operator generates the internal account identifier, session token, account and session timestamps, and any linked publication, acceptance and moderation records.
- **Collection method:** OAuth authorisation code exchange initiated by the user; the provider returns the profile fields listed.
- **Holding environment:** Publish service D1 database (users and sessions tables).
- **Linking:** Linked to that account's Published Content and acceptance records. Not linked to any Instance Data, which we never receive.
- **Information:** provider name; stable provider user ID; email; account handle where available; public byline chosen by the user; internal account identifier generated by us; session token and expiry; account and session timestamps; linked publication, acceptance and moderation records
- **Primary purpose:** Authentication, attribution, managing published content, moderation, evidencing publish-time acceptance.
- **Recipients:** Vae Foundry Pty Ltd; Cloudflare, Inc. (D1 storage)
- **Countries:** global edge network
- **Retention:** Expired session rows are deleted 30 days after expiry. An account that has never published and has not signed in for 90 days is deleted, together with its sessions and acceptance records. An account with Published Content is kept while that content stands, because attribution and the record of what was accepted depend on it; a banned account is kept so that a ban cannot be escaped by signing up again. Both rules run on a daily scheduled sweep.

### `flow.infrastructure.request-metadata`

- **Trigger:** Any request from an Instance to Operator-run infrastructure (catalogue reads, publish service).
- **Source:** The requesting device, automatically, as ordinary technical information generated by making the request.
- **Collection method:** Generated at the Cloudflare edge when a request reaches infrastructure we operate.
- **Holding environment:** Cloudflare edge logging; no separate Operator log store.
- **Linking:** Not deliberately linked to an account. Where a request carries a session token it is technically capable of being associated with an account; we do not build such linkages for analytics or profiling.
- **Information:** IP address; timestamps; user-agent and version strings; ordinary request metadata
- **Primary purpose:** Serving the request; security and abuse prevention.
- **Recipients:** Cloudflare, Inc.
- **Countries:** global edge network
- **Retention:** Not yet verified. The retention period for edge request logs is controlled by the infrastructure provider and the exact applicable setting has not been verified; this flow stays unverified until it is verified and recorded here. The Operator maintains no separate request-log store.

### `flow.correspondence.email`

- **Trigger:** A person emails hello@vaenyx.ai.
- **Source:** The person who sends the email.
- **Collection method:** Inbound email to hello@vaenyx.ai, routed to the Operator mailbox.
- **Holding environment:** Cloudflare Email Routing in transit; the Operator mailbox at rest. See unverifiedItems for the mailbox's contractual position.
- **Linking:** Linked to an account only where the sender identifies one, for example to make an access, correction or deletion request.
- **Information:** whatever the sender includes; sender address
- **Primary purpose:** Responding to support requests, reports, complaints, access and correction requests.
- **Recipients:** Cloudflare, Inc. (Email Routing); Google LLC (Gmail)
- **Countries:** United States
- **Overseas basis:** APP 8.1 reasonable steps - CURRENTLY UNVERIFIED, see unverifiedItems.
- **Retention:** No implemented deletion process. A fixed period is deliberately not stated (Core Privacy Policy clause 9.6).
- **Legal position:** Whether a contractual safeguard is legally required here is not settled. APP 8.1 binds an APP entity; a small business operator with annual turnover of $3 million or less is not an APP entity unless an exclusion applies. The Operator is a new company with no turnover, so the exemption is likely to apply — but that turns on two questions that have not been answered: (1) whether the Operator is a related body corporate of any organisation that is itself covered by the Privacy Act, which depends on the actual shareholding, not on shared directorship; and (2) whether any other exclusion applies. Independently of the answer, this Policy states that we apply the Australian Privacy Principles as our baseline whether or not they legally bind us, so the practical steps are taken either way.
- **Planned steps:** Move the mailbox off consumer webmail to a business mailbox with two-factor authentication and restricted access; keep privacy@, abuse@ and security@ as aliases of it; ask senders not to include credentials, API keys or full conversations (already stated at every report entry point); delete correspondence that no longer needs to be kept. A signed data-processing agreement is the stronger form of the reasonable steps APP 8.1 would require, and remains the target — but APP 8.1 calls for steps reasonable in the circumstances, not one particular instrument.

### `flow.community.discord`

- **Trigger:** Joining, posting or interacting in the official Vaenyx Discord server.
- **Source:** The individual's own participation in the server.
- **Collection method:** Discord's own platform; Operator administrators see profile, posts and moderation context through Discord's administration tools.
- **Holding environment:** Discord's platform, plus any separate moderation record the Operator actually creates.
- **Linking:** Not linked to a Vaenyx publishing account unless the individual identifies one.
- **Information:** Discord identity and profile; posts and attachments in the server; reports and moderation actions
- **Primary purpose:** Operating and moderating the official server and handling reports about content in it.
- **Recipients:** Vae Foundry Pty Ltd; Discord, Inc.
- **Countries:** United States; global
- **Overseas basis:** The individual deals with Discord directly under Discord's own terms; the Operator's role is server administration.
- **Retention:** Under Discord's current terms for platform-held content. Any separate Operator moderation record is destroyed or de-identified when no longer reasonably required.

### `flow.improvement.sharing`

- **Trigger:** The user turns on sharing improvements (a separate, explicit consent), a correction is queued, and 48 hours pass without the user removing it. Health, family and money content never enters this path automatically: it is held and asked about individually.
- **Source:** The contributing user's Instance. Personal details are removed on that device before anything is sent; the removal is automatic and imperfect, and the user is shown what is queued.
- **Collection method:** Unauthenticated HTTPS request from the Instance to the sharing endpoint. There is no account on the sending side and none is required.
- **Holding environment:** The publish service (Cloudflare Worker) and its D1 database, as a pipe rather than a store. A delivery row is deleted the moment the recipient publisher's own app collects it, and is deleted unread if nobody collects it within 14 days. The waiting payload is not encrypted end-to-end: the Operator is technically able to read it while it waits, and the Privacy Policy's disclosure of that is the whole reason this line appears here.
- **Linking:** Not linked to any account on the sending side, because there is none. Carries a contributor ID the sending Instance generates for itself — a credit label, not a credential, deliberately not registered with us and not resolvable to a person by us.
- **Information:** the example: what was asked, what came back, the user's correction, and an optional note; the contributor ID (self-generated credit label); the content hash of the Method version the example relates to; for rate limiting only, and only in a separate row: the contributor ID, a hashed form of the connection, the item id and a timestamp
- **Primary purpose:** Deliver one correction to the person who published the Method so they can improve it. Rate-limit and prevent abuse of the endpoint.
- **Recipients:** Vae Foundry Pty Ltd and Cloudflare, Inc. — as the transport, for as long as the delivery waits; the receiving publisher — and only where that publisher has switched receiving on for that Method (Contributor Agreement 9.4). Where the switch is off, the send is refused and nothing is stored.
- **Countries:** global edge network
- **Overseas basis:** APP 8.2(b) express consent, obtained at the activation step, which states that the server is outside Australia and that examples reach the publisher.
- **Retention:** A delivery is deleted at the moment the recipient collects it, and expires after 14 days if it is never collected. Deleting a publisher's account deletes the deliveries addressed to it. Rate-limiting rows are deleted after 7 days. No copy of a delivered example is kept.
- **Legal position:** What the publisher receives is less than what passes through: the delivery payload carries the example, the contributor ID and the content hash, and nothing about where it came from. The evidence the sending Instance presents — its instance identifier, the identifier of the consent event, the mode it was in — is checked at the door and then discarded. Two consequences follow, and both are deliberate. We hold no device identifier for a contributing household. We also hold no record of that household's consent: the record lives on their own machine, and what we can show is what the service refuses, which is visible in public source.

## Local-only processing (no Operator collection)

- All Instance Data: chats, memories, files, project instruction windows, Journal and Gallery, raw corrections, Method Tokens, the private Library, backups.
- External-application feedback received through a Method Token: written to local SQLite only. No de-identification, Owner preview or external sharing exists for it.
- Corrections returned by a permitted app to the local instance, and any example kept from one. The app posts to the user's own Vaenyx server on their own machine; nothing about a correction reaches the Operator, and keeping one as an example does not publish it or alter any app grant.

## Declarations

- **Automated decision-making:** None. No program arranged by the Operator uses personal information to make, or do anything substantially and directly related to making, a decision that could reasonably be expected to significantly affect an individual's rights or interests.
- **Direct marketing:** None.
- **Sensitive information solicited:** None.

## Unverified items (stated as unverified, not as met)

### Cloudflare data-processing terms — `verified-with-caveat`

- **Finding:** VERIFIED. The Cloudflare self-serve subscription agreement (last updated 12 Sep 2025) clause 6.1 states that Cloudflare handles Personal Data in compliance with the Cloudflare Data Processing Addendum, which is hereby incorporated by reference into the Agreement. The DPA is jurisdiction-agnostic on its own terms: it applies where Cloudflare processes Personal Data as a Processor and that data is subject to Applicable Data Protection Laws, defined as all laws applicable to the processing under the Main Agreement. Its obligations cover processing on written instructions, equivalent subprocessor protections with 30-day notice, appropriate technical and organisational measures, breach notification without undue delay, deletion or return on termination, and audit rights - which match the reasonable steps described in Core Privacy Policy clause 8.2. Incorporation applies to free and self-serve tiers; clause 6.1 draws no tier distinction.
- **Caveat:** The incorporation trigger in clause 6.1 of the main agreement is framed around EU/UK Data Protection Laws and the CCPA, and neither document mentions Australia or the Privacy Act. The DPA own scope clause is broader and on a reasonable reading covers Australian personal information, but the point is not put beyond doubt by the trigger wording.
- **Verified:** 2026-07-25
- **Action required:** Re-check on material Cloudflare terms revisions. If certainty is needed, ask Cloudflare to confirm in writing that the DPA applies to personal information governed by the Australian Privacy Act.

### Operator mailbox — `external-unverified`

- **Issue:** Correspondence to hello@vaenyx.ai lands in a mailbox that is not under verified data-processing terms. No verified APP 8.1 contractual safeguard exists for this flow.
- **Note:** Not treated as an absolute launch blocker. Whether APP 8.1 binds the Operator at all depends on the small-business-operator question recorded against this flow; and where it does bind, it requires reasonable steps in the circumstances rather than a specific contract. What is not acceptable either way is claiming a safeguard we do not have — hence this entry.
- **Action required:** Answer the small-business-operator and related-body-corporate questions (a question for the Operator's accountant or a lawyer, not for this document). In parallel, move to a business mailbox and pursue a data-processing agreement; if one is obtained, record the actual provider, recipients, countries, safeguards and deletion rule here.

### Subscription-login model channels — `external-unverified`

- **Issue:** The default chat backend signs in with the user's own ChatGPT subscription through the Codex CLI rather than an API key. Whether a provider's consumer subscription may be used through a third-party product is the provider's call, and the answer is not the same at both providers. Anthropic has published one: subscription credentials were barred from third-party tools in April 2026 and then re-permitted through a separate, metered Agent SDK credit allowance — a defined path, and one that has moved twice in three months. OpenAI has published nothing. Asked directly whether a modified Codex CLI or a separately distributed application may authenticate this way, the maintainers answered that the terms are permissive and that legal advice is a good idea. That is not a permission, and the ChatGPT terms separately restrict automated or programmatic use.
- **Note:** This entry is about the Operator's own conduct, not the user's. The Terms already place every third-party service in the user's hands — their choice, their contract, their fees — and that holds for an API key the user pastes in. It does less work where the Operator writes the integration that drives a consumer subscription: what a provider prohibits there is the product, and a user's acceptance of our Terms cannot license our code. Hence a recorded unverified item rather than reliance on the contractual allocation alone.
- **Action required:** Obtain a written answer from OpenAI on whether an application distributed to other people may authenticate through Sign in with ChatGPT, each user using their own subscription. Until one exists, this entry stands and no material may describe the channel as approved, endorsed, or covered by the provider. If a channel to Anthropic is ever built, use the published Agent SDK credit path rather than a subscription token, and describe it as a metered monthly allowance rather than as included in the subscription.
