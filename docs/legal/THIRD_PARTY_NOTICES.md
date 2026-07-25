# Vaenyx — Third-Party Notices

> **FINAL v2.4 (2026-07-25).** v2.2 incorporates the second independent legal review round of 2026-07-07. v2.1 incorporated the independent legal review round of 2026-07-05. Prepared by Claude (an AI) in the style of senior Australian technology counsel and adopted as part of the operative Vaenyx legal set under the operator's recorded lean-legal decision (DECISIONS.md, 2026-07-05). It is not legal advice. A one-time professional review of the Contributor Agreement / publishing terms remains recommended before community publishing opens. **v2.4 (2026-07-25)** resolves every placeholder: the Operator is Vae Foundry Pty Ltd (ACN 700 703 724), registered in Victoria, Australia, and the effective date is 26 July 2026.

**Product:** Vaenyx (the exact third-party contents of each release build are fixed by the per-release manifest described in Section 3)
**Operator:** Vae Foundry Pty Ltd (ACN 700 703 724), a proprietary limited company registered in Victoria, Australia
**Contact:** hello@vaenyx.ai
**Effective Date:** 26 July 2026 *(set at the first public release to which these notices attach and that satisfies the manifest-delivery condition in Section 3.4; the Section 3 release manifest for that build must exist and ship before these notices attach to it)*

---

## 1. Purpose and Scope

1.1 This document identifies the third-party software components that are **actually included** in Vaenyx, together with the software and services that Vaenyx **relies on or can connect to but does not include**, and states the licence position of each so far as it is known at the Effective Date.

1.2 This is a factual notices document. It does not grant you any rights in Vaenyx itself, and it does not vary the licence terms of any third-party component: each component listed in this document remains governed by its own licence, as published by its own maintainers, as between you and that component's maintainers. This does not affect any right or remedy you have against the Operator in respect of Vaenyx as supplied to you — see Section 6.

1.3 **Originality statement.** Vaenyx is independently developed. This document lists only third-party **code actually included** in Vaenyx and third-party **services actually relied on or connectable**. It does not, and is not required to, credit projects that are not included in Vaenyx, and no entry in this document should be read as implying that Vaenyx is derived from, based on, or affiliated with any listed or unlisted project. Factual interoperability with open standards (for example the Model Context Protocol (MCP) and the Agent Skills / SKILL.md format) may be stated by Vaenyx where true; interoperability statements are not attribution and do not appear in this notices list.

1.4 In this document:

- **"Included Component"** means third-party software that is installed as a declared dependency of Vaenyx and runs as part of, or is served by, the Vaenyx application.
- **"Connected Software or Service"** means third-party software or an online service that Vaenyx can work with, launch, or connect to, but that is **not** part of the Vaenyx codebase — including software you install yourself and accounts you hold with third parties. Vaenyx does not currently distribute any third-party binary alongside itself; if a future release bundles one, this document will be updated to identify it and its licence position before that release is published.

---

## 2. Included Third-Party Components (Principal List)

2.1 The components in this Section 2 are the **principal** open-source packages declared as runtime dependencies in Vaenyx's dependency manifests as at the Effective Date. Version numbers are the declared manifest ranges; the exact resolved versions are recorded in the repository lockfile and will be captured in the release manifest described in Section 3. The Vaenyx repository is a workspace of four packages — the root workspace, the server application (`apps/server`), the web application (`apps/web`), and the shared contracts package (`packages/contracts`); the root workspace and the internal `@vaenyx/contracts` package declare **no third-party runtime dependencies** of their own beyond those listed below.

2.2 Licences shown as "per upstream" reflect the licence published by the component's own maintainers. Each licence identifier below was verified on 2026-07-05 directly against the `license` declaration and the LICENSE file shipped inside the installed copy of that package; the verbatim licence texts and copyright lines so verified are reproduced in Appendix A. The full dependency tree (including every transitive dependency) is verified separately by the automated licence-collection step described in Section 3 before any public release; where the licence of a transitive dependency is genuinely unknown, the release manifest marks it "licence: see package".

### 2.2.1 Server Runtime (apps/server)

| Component | Version (declared) | Licence (per upstream) | Copyright / origin |
|---|---|---|---|
| fastify | ^5.8.5 | MIT | The Fastify Team — [github.com/fastify/fastify](https://github.com/fastify/fastify) |
| @fastify/cors | ^11.2.0 | MIT | The Fastify Team — [github.com/fastify/fastify-cors](https://github.com/fastify/fastify-cors) |
| @fastify/static | ^9.1.3 | MIT | The Fastify Team — [github.com/fastify/fastify-static](https://github.com/fastify/fastify-static) |
| ajv | ^8.17.1 | MIT | Evgeny Poberezkin — [github.com/ajv-validator/ajv](https://github.com/ajv-validator/ajv) |
| dotenv | ^17.4.2 | BSD-2-Clause | Scott Motte — [github.com/motdotla/dotenv](https://github.com/motdotla/dotenv) |

### 2.2.2 Web Application (apps/web)

| Component | Version (declared) | Licence (per upstream) | Copyright / origin |
|---|---|---|---|
| react | ^19.2.7 | MIT | Meta Platforms, Inc. and affiliates — [github.com/facebook/react](https://github.com/facebook/react) |
| react-dom | ^19.2.7 | MIT | Meta Platforms, Inc. and affiliates — [github.com/facebook/react](https://github.com/facebook/react) |
| react-markdown | ^9.0.1 | MIT | Espen Hovlandsdal — [github.com/remarkjs/react-markdown](https://github.com/remarkjs/react-markdown) |
| remark-gfm | ^4.0.0 | MIT | Titus Wormer — [github.com/remarkjs/remark-gfm](https://github.com/remarkjs/remark-gfm) |

### 2.2.3 Shared Contracts (packages/contracts)

| Component | Version (declared) | Licence (per upstream) | Copyright / origin |
|---|---|---|---|
| @sinclair/typebox | ^0.34.49 | MIT | Haydn Paterson (sinclair) — [github.com/sinclairzx81/typebox](https://github.com/sinclairzx81/typebox) |

2.3 **Transitive dependencies.** Each Included Component may itself depend on further open-source packages. Those transitive dependencies are equally third-party components, each governed by its own licence, and will be enumerated in full in the machine-generated release manifest described in Section 3. This Section 2 lists principal direct dependencies only.

2.4 **Database engine — no bundled SQLite driver.** Vaenyx stores data in SQLite using the **`node:sqlite` module built into the Node.js runtime**. Vaenyx does **not** include any third-party SQLite driver package (in particular, it does not include `better-sqlite3`, and any earlier draft or example suggesting otherwise is superseded). The SQLite library itself is dedicated to the public domain by its authors; it reaches your machine as part of the Node.js runtime you install (see Section 4.8), not as a component distributed by Vaenyx.

2.5 **Development-only tooling (not shipped).** The following tools are used to develop, build, and test Vaenyx but are **not** distributed as part of, and do not run within, the installed application: TypeScript (^6), ESLint (^10) with @eslint/js and typescript-eslint, Prettier, Vitest, Vite (^8) and @vitejs/plugin-react, tsx, concurrently, and TypeScript type-definition packages (`@types/*`, including @types/node, @types/react, and @types/react-dom). Each is governed by its own licence (predominantly MIT or Apache-2.0 per upstream). They are recorded here for completeness and will appear, appropriately classified, in the release manifest.

2.6 **No AI-provider SDKs.** Vaenyx includes no software development kit or client library from any AI model provider (no OpenAI, Anthropic, or Google packages). All model-provider connections described in Section 4.2 are made over each provider's published HTTP API using Vaenyx's own code.

---

## 3. Machine-Generated Release Manifest

3.1 At each public release build, a **complete machine-generated dependency licence manifest** will be produced directly from the dependency manifests and lockfile using an automated licence-collection tool. That manifest will record, for every direct and transitive dependency actually shipped — together with development-only tooling, classified as such — package name, exact resolved version, SPDX licence identifier, copyright notice, source repository link, and (where the licence requires it) the full licence text.

3.2 The release manifest is the complete and authoritative list for the corresponding release. This document lists the **principal** components and explains the overall position; in the event of any difference between this document and the release manifest for a given build, the release manifest prevails as to what that build contains.

3.3 The manifest will be regenerated for every release so that the published notices always match the shipped code. This document will be reviewed at the same time and updated if the principal components change.

3.4 **Delivery of notices — condition of these notices.** Each public release build to which these notices attach includes the release manifest — together with the full licence texts it records where a licence requires them — as a third-party-licences file within the installation, accessible to users from within the application, so that the copyright and permission notices required by the component licences accompany every copy of Vaenyx. These notices do not attach to, and must not be published with, any build for which that manifest has not been generated and shipped in that form; the Effective Date is set only at the first public release that satisfies this condition. Independently of that condition, Appendix A reproduces, unconditionally, the verbatim licence texts and copyright notices of the principal components listed in Section 2, so that if any copy of Vaenyx is ever distributed without its release manifest, those notices still accompany that copy; Appendix A is a fallback for the principal components only and does not replace the manifest requirement for the full dependency tree.

---

## 4. Connected Third-Party Software and Services (Not Included in Vaenyx)

4.1 The software and services in this Section 4 are **not** part of the Vaenyx codebase and are **not** covered by any Vaenyx licence or by these notices, except as expressly stated. Each is provided by its own operator or maintainers, is governed by **its own terms of service, licence, and privacy policy**, and — where applicable — carries **its own fees, which are payable by you to that provider**. Vaenyx itself is free and has no billing; any cost that arises from a Connected Software or Service is a matter between you and that provider. Whether and how you use each Connected Software or Service is your decision.

4.2 **AI model providers (pluggable backend).** Vaenyx's model backend is pluggable: you may connect one or more third-party model providers, or a local model server, and Vaenyx sends your chat traffic to whichever backend you have connected. As at the Effective Date, the connectable channels are:

- **(a) OpenAI via the OpenAI Codex CLI**, using a ChatGPT-subscription login. The Codex CLI is software you install and sign in to yourself; your ChatGPT subscription is yours. This channel authenticates with your own OpenAI / ChatGPT subscription: your use of it is governed by OpenAI's terms applicable to your own subscription, and compliance with those terms is your responsibility — the same position that applies to every Third-Party Service under the Terms of Service (clause 6). Whether any consequence follows for your OpenAI account is determined by OpenAI under its own terms, between you and OpenAI.
- **(b) OpenAI-compatible API endpoints**, whether a cloud service (such as the OpenAI API, using your own API key) or a local server on your own hardware (see Section 4.3).
- **(c) The Anthropic Claude API**, using your own Anthropic API key.
- **(d) The Google Gemini API**, using your own Google API key.

Each provider account, subscription, and API key is yours: your use of a provider is governed by **that provider's own terms and pricing**, and **content you send to a cloud model (including chat content and any context Vaenyx injects with it) leaves your device and is processed by that provider under its own terms, at your cost where its pricing applies**. Whether a particular connection method or subscription plan may be used this way is determined by your provider's own terms; check them before connecting. No provider is a fixed part of Vaenyx, and Vaenyx does not include any provider's code (see Section 2.6).

4.3 **Local model servers (optional).** If you choose to run models locally — for example via Ollama, LM Studio, or a llama.cpp server — you install and run that software yourself on your own device, under its own licence and terms, and you obtain any model weights under their own licences. Vaenyx connects to such software as a generic OpenAI-compatible endpoint: Vaenyx sends your chat content for that channel only to the endpoint address you configure, and does not send that chat content to the Operator or to any cloud provider. Separately, and whichever model backend you use, if you have turned community improvement-sharing on — it is presented at installation as a prominent choice, separate from acceptance of the Terms of Service, that you must make yourself: no option is pre-selected, nothing is shared before you have made the choice, and it can be changed or switched off at any time in Settings — de-identified improvement patterns derived from your use (never your raw chat content) are sent to the Operator's improvement-sharing endpoint, as described in the Terms of Service (clause 7.4) and the Privacy Policy; that transmission is a property of the sharing setting, not of the local model channel. Whether the content remains on your own hardware depends on the server software you run, where it runs, and how you and its maintainers have configured it — that is outside Vaenyx's control. Vaenyx does not include or distribute any local model server or any model weights.

4.4 **Tailscale (optional remote access).** Optional remote access uses Tailscale Funnel. If you choose to enable remote access, you install the official Tailscale client yourself on your own device (its Windows background service is created by Tailscale's own installer), under **Tailscale's own licence and terms of service**; Vaenyx does not download, include, or distribute Tailscale — it only invokes the client you have installed. You sign in with your own Tailscale account (a free tier exists as at the Effective Date; Tailscale's plans and pricing are its own). As at the Effective Date, Tailscale's published Funnel design states that TLS for Funnel connections terminates on your machine and that Funnel relays do not decrypt your traffic; Tailscale's current documentation governs how Funnel works at any later time. Nothing in these notices transfers any right in Tailscale's software or marks.

4.5 **Google and GitHub sign-in (publishing identity only).** Using the Community Library (shown in the product as Community) requires no account. If you choose to **publish** to the Community Library, you sign in with a **Google or GitHub** account via OAuth; the public byline on your published content is a display name you set yourself. Be aware of two things before publishing: the byline is a display name you choose explicitly at first publish — the flow pre-fills a generated pseudonym, **never the name on your Google or GitHub account**, so your real name is published only if you set it as your display name; and the byline you publish under is stamped into the published item's metadata and committed to the public repository's permanent history — changing your display name later affects **future** publications only and does not remove past bylines from the public record (see the Contributor Agreement, clauses 5.4 and 8). Your Google or GitHub account and its use are governed by that provider's own terms and privacy policy; Vaenyx does not include Google's or GitHub's code. Signing in with GitHub is an identity option only — holding a GitHub account gives no publishing advantage and is never required (see Section 4.6).

4.6 **GitHub and Cloudflare (Community Library and publishing infrastructure).** Published Community Library content is stored in a central public GitHub organisation repository ([github.com/vaenyxai/community](https://github.com/vaenyxai/community)). If you publish, **the Operator's publishing service** — which runs as a Cloudflare Worker with a D1 database on Cloudflare's global edge network — receives your submission, runs the automated checks described in the Terms of Service (clauses 8.4 and 8.6 — no human review), and commits it to that repository on your behalf using a single Operator-held bot credential: **an installed copy of Vaenyx never holds a GitHub write token, and you never interact with GitHub directly to publish**. The Operator's handling of your submission and sign-in identity is covered by the Vaenyx Privacy Policy. Contributors retain ownership of the content they publish; each contributor warrants to the Operator that the contribution is their own work or that they otherwise hold the rights needed to license it (Contributor Agreement, clause 7) — the Operator does not verify authorship. Published content is licensed to you under Creative Commons Attribution 4.0 (CC BY 4.0) together with a direct licence — see the Contributor Agreement (clause 5) and the Terms of Service (clause 8.6(e)). CC BY 4.0's attribution and notice conditions apply whenever you share or adapt that content — inside or outside Vaenyx — except to the extent your use is covered by the direct licence (Contributor Agreement, clause 5.3(b)), which lets you use the Library as intended (view, download, run, and adapt for your own use) without needing to rely on CC BY 4.0; publishing your adaptation back to the Community Library is itself governed by the Contributor Agreement. The generated library catalogue/index is served to installs via Cloudflare-hosted static hosting (the app reads the Cloudflare index only, never GitHub directly). GitHub also hosts the Vaenyx framework source repository. Cloudflare additionally provides DNS and email routing for the vaenyx.ai domain, including the contact address given in this document. GitHub and Cloudflare themselves are independent services governed by their own terms; Vaenyx does not include their code.

4.7 **Discord (community venue).** Community discussion around Vaenyx takes place on **Discord**, a third-party platform operated under its own terms of service, community guidelines, and privacy policy. The Discord community is **not** an Operator Service (Terms of Service, clause 2): Vaenyx does not include Discord's code, and a Discord account is never required to use Vaenyx or the Community Library. Content you post there is stored and processed by Discord on Discord's own platform under Discord's own terms; the Operator administers the Vaenyx community within Discord and may moderate, pin, or remove posts under its community rules. The Operator's own service surfaces are limited to software distribution, the Community Library catalogue/index (served via Cloudflare), the publishing service (including publisher accounts and the Merit record), and the improvement-sharing endpoint.

4.8 **Node.js runtime.** Vaenyx runs on the Node.js runtime (version 24 or later), which you install on your own machine. Node.js is distributed by the OpenJS Foundation and contributors under its own licence terms, and itself bundles further components (including the V8 JavaScript engine and the SQLite library exposed as `node:sqlite`), each under its own licence as documented in the Node.js distribution's own licence file. Vaenyx does not distribute Node.js.

4.9 **No endorsement; independence.** Listing a Connected Software or Service here is a statement of fact about what Vaenyx can work with. It does not mean that the provider endorses Vaenyx, that the Operator endorses the provider, or that any affiliation exists, and none should be inferred.

---

## 5. Trademarks

5.1 All third-party names, logos, and marks referred to in this document (including Fastify, React, OpenAI, ChatGPT, Anthropic, Claude, Google, Gemini, Ollama, LM Studio, Tailscale, GitHub, Cloudflare, Discord, Node.js, and SQLite) are the property of their respective owners. Nothing in this document, and no inclusion of any component in Vaenyx, transfers or licenses any trademark right.

5.2 The Vaenyx name, logo, and icon are not third-party components and are not licensed by this document. See the separate Vaenyx Trademark Policy.

---

## 6. Effect of Third-Party Licences; Australian Consumer Law

6.1 Each Included Component is supplied by its maintainers under its own licence, and most such licences state that the component is provided "as is" without warranty. Those disclaimers are the maintainers' own terms and operate according to their tenor **only to the extent permitted by applicable law**.

6.2 Nothing in this document excludes, restricts, or modifies any consumer guarantee, right, or remedy that you have under the *Competition and Consumer Act 2010* (Cth), including the Australian Consumer Law, or under any other applicable law that cannot lawfully be excluded. Any limitation of the Operator's liability is dealt with in the Vaenyx Terms of Service (see its clauses 14 and 15) and operates only to the extent the law allows.

---

## 7. Corrections

7.1 **Corrections to this document.** Reasonable care has been taken to make this document accurate. If you believe a component is misattributed, mislicensed, missing, or wrongly included, please contact the Operator at hello@vaenyx.ai with the subject line "Notices correction". Verified corrections will be made in the next update of this document and, where relevant, in the next release manifest.

7.2 **Reports about Community Library content — a separate channel with its own timeframes.** Reports that content in the Community Library is unlawful, infringing, defamatory, or otherwise objectionable are a different matter from document corrections and are handled under the Terms of Service (clause 8.5), whether or not you are a Vaenyx user. Send them to hello@vaenyx.ai with the subject line "Content report", identifying the content, explaining what is said to be wrong with it, and giving your name and contact details (clause 8.5 states what makes a complaint duly made). Email to hello@vaenyx.ai is handled on overseas servers; include only what is needed for us to act, and avoid attaching personal information where an item link or identifier is enough. As clause 8.5 provides: reports of seriously harmful material of the kind regulated under Australian online-safety law are targeted for action within 24 hours of receipt; and for a duly-made complaint that content is unlawful, the Operator will take reasonable steps to remove or disable access to the content — de-listing it from the library catalogue/index that installs read is the primary and fastest lever, even where copies persist in public git history — as soon as practicable and in any event within 7 days of receiving the complaint. For a **defamation** complaint specifically, that 7-day period starts on receipt of a **written complaint**, made through an accessible complaints mechanism, that (a) identifies the plaintiff (the person of or concerning whom the matter is alleged to have been published); (b) identifies the matter complained of and its location well enough for us to locate it (for example, a URL or item identifier); and (c) states that the plaintiff considers the matter to be defamatory of them. This threshold reflects the statutory minimum for a concerns notice under section 31A of the *Defamation Act 2005* (NSW) (and its interstate equivalents). The poster's identity, the imputations complained of, the reasons the matter is said to be defamatory, and any contact details or supporting evidence are helpful particulars the Operator may request, but their absence does not delay the 7-day clock once a complaint meeting (a)–(c) is received.

---

