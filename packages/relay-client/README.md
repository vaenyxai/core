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
