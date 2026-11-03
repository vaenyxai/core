# Vaenyx Relay Client

One dependency-free native ES-module client for all calling apps. The existing
Relay v2 API exposes text, structured output, vision, documents, search and
research through the same endpoints. Implemented capability availability comes
from the Relay catalogue/profile, never from an app-name switch.

- connect.mjs: Owner-approved PKCE handover, current-authority checks and replay protection.
- vault.mjs: encrypted browser storage with stable identity scope, revision and epoch guards.
- protocol.mjs: bounded body deadlines, credential-free requests, safe errors and secret-echo rejection.
- return.mjs: strict shared callback form validation.

The app supplies its client name, return path, HTTPS Relay origin and an
authorize hook which verifies its own signed-in user/company or management
session. App authorization is never inferred from a Relay connection. The
browser store takes an explicit database name and record name; the app retains
its existing namespace so updates preserve saved records.

Business prompts, evidence validation, workflows, model assignment, budgets and
research journals belong to the calling app. The transport accepts any supported
Relay request; it does not encode a property, email or other product workflow.
Unknown execution never implies cancellation or permission to repeat a model call.

Use scripts/Vaenyx-Sync-Relay-Client.mjs to vendor a fixed version into an app's
static module tree and server source tree. Commit the generated manifest. Use
--check in consumer tests to reject drift. Consumers ship local files; no remote
JavaScript or automatic latest-version update is used. Credentials never enter
the SDK source, manifests or synchronization process.

## Two Independent Routes

The local Vaenyx instance owns each Relay App profile's selected engine/model. Use selection: "configured" and send task requirements; GET /v1/relay/routing reports its revision. An explicitly selected old client remains compatible until that App is configured; then it cannot override the Owner's choice.

Direct API uses createDirectClient from direct.mjs, independently of Vaenyx availability. Provider adapters are generated from the same Core TypeScript source with Vaenyx-Build-Relay-Providers.mjs. Never edit generated adapter files. New model IDs are discovered dynamically; protocol changes require a pinned SDK rollout.

createAIClient from routes.mjs requires a durable, scope-bound journal. Automatic paid fallback is off by default. Enabling it also requires a selected compatible Direct API backup, explicit paid authorization, a positive budget/maximum cost and trusted atomic bounded-budget reservation/settlement callbacks. Unknown dispatch outcomes block backup and repeat dispatch. The caller remains responsible for authorization, secret storage, business validation and an honest named-switch UI.
