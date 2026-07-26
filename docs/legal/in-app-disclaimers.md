# Vaenyx — In-App Contextual Disclaimers (Copy Pack)

> **FINAL v3.0 (2026-07-25).** This document forms part of Vaenyx Legal Set v3.0; current capability and data-flow facts appear only in the dated Current Implementation and Data-Handling Schedule. It is provided for your information and is not legal advice.

| Field | Value |
|---|---|
| Operator | Vae Foundry Pty Ltd |
| Governing law | Victoria, Australia |
| Contact | hello@vaenyx.ai |
| Effective | 26 July 2026 |
| Copy pack version | `legal.copyVersion = "2.6"` |

Placeholders — all resolved 2026-07-25:
- **Operator** = **Vae Foundry Pty Ltd (ACN 700 703 724, ABN 28 700 703 724)**, incorporated 25 July 2026.
- **State** = **Victoria**.
- **Effective date** = **26 July 2026** (set at v2.4, after the feature-existence amendments).

---

## 0. What changed at copy version 2.6

Four strings were corrected against the shipped build, after a verbatim audit of
this pack against `apps/web/src/i18n.tsx` (`node docs/legal/audit-copy.mjs`):

| String | Change | Who was wrong |
|---|---|---|
| D2 `legal.disclaimer.community.install` | "It stays inactive until you enable it" → "It does nothing until you use it" | **This pack.** There is no enable toggle; installed content is declarative and simply sits there until used. |
| G1 `legal.notice.publish` | Adopts the shipped text (CC BY 4.0 grant + permanence sentence) | **This pack**, which had recorded only part of the shipped string. |
| G3 `legal.notice.publish.signIn` | Adopts the shipped text (why a sign-in is needed) | **This pack**, same reason. |
| H3 `legal.notice.restore` | "This can't be undone" → the shipped truth: a safety copy is taken first, so it can be undone | **This pack.** The earlier wording overstated the consequence. |

Three strings still differ, and there the **app** is wrong; they ship at 2.6:

- D2 — the app is missing the "does nothing until you use it" sentence.
- ~~F2 `legal.notice.modelConnect.local`~~ — **withdrawn 2026-07-25: this was a false positive, and the fault was ours.** The app has always shipped the three variants this pack specifies: it tests the address first, says "points at your own machine" only for a confirmed loopback address, renders the `.lan` wording verbatim for an RFC1918 address, and falls back to `.unverified` otherwise. `audit-copy.mjs` reported drift because its label pattern only recognised `- **EN:**`; the loopback line is written `- **EN** (renders only when …): "…"`, so the parser skipped it and compared the parent key against the **next** sub-key's text. The parser now accepts the annotated form. **Lesson for this pack: a tool that reports a false positive is worse than no tool, because it sends someone to "fix" correct code.**
- G3a `legal.consent.publish.overseas` — the app is missing the final sentence, "Consent will be obtained again if the recipient, purpose or consequences materially change." That sentence is a commitment about consent currency, not decoration.

Because a consent-class string (G3a) changes, 2.6 re-triggers acceptance: the
install-time acceptance card and the health acknowledgement are shown again, and
the publish service's accepted-copy floor moves to 2.6.

## 1. Purpose and Scope

1.1 This document is the **B-class layer** of the Vaenyx legal framework: the short, point-of-use notices, disclaimers and consent strings that appear **inside the app at the moment of use**. The long-form documents they link to (Terms of Service, Privacy Policy, Contributor Agreement, Trademark Policy, Third-Party Notices) live in `docs/legal/` and remain the A-class layer. The placement map in `docs/legal-and-disclaimers.md` is superseded, for implementation purposes, by this pack.

1.2 This pack is **ready-to-implement copy**: every string is final wording, bilingual (English + Chinese), keyed for i18n, and annotated with placement and behaviour. Engineering should implement these strings verbatim; any substantive change must be made deliberately under the drafting principles in section 3, must bump the copy pack version (clause 6.4), and must update the EN/ZH pair together.

1.3 Nothing in this pack excludes, restricts or modifies any consumer guarantee, right or remedy under the **Australian Consumer Law (ACL)** or any other law that cannot lawfully be excluded. These strings **inform**; they do not operate as liability exclusions. The formal limitation and ACL carve-out language lives in the Terms of Service (sections 13–15) and prevails over anything here.

## 2. Definitions and Conventions

2.0 **Release scope as at the Effective Date.** This release provides no community-sharing upload, Example attachment, de-identification or preview, or Merit. A current sharing setting is a local preference only and authorises no upload, licence or moral-rights consent. A later capability remains off until marked active, safeguarded, noticed and separately chosen. A string in this pack that refers to any of those capabilities must not be shipped in an active surface until the capability is marked `active` in the Schedule. The sharing-preference strings (A3, I1) record a **local preference only**: they are not a server-side evidence record, not a licence, and not a moral-rights consent.

2.1 **Key names** follow the i18n pattern `legal.<class>.<topic>[.<element>]`, where `<class>` is one of:
- `disclaimer` — a caution about reliance on content;
- `notice` — factual information shown at a point of action or connection;
- `consent` — copy that captures a recorded choice.

2.2 **Behaviour types** (used in each item's "Behaviour" line):
- **Persistent** — always visible in the stated placement; not dismissible.
- **One-time** — shown once per Owner profile, except where an item's behaviour line states it is per profile (C2: each human profile accepts its own gate); dismissal is recorded.
- **Gated acknowledgement** — the feature or action is blocked until the user taps the affirmative button; the acknowledgement is recorded.
- **Point-of-action** — shown every time the stated action is taken.
- **On-demand** — shown whenever its host control (tooltip, picker, label or menu entry) is opened; it travels with that control and cannot be dismissed independently of it.

2.3 **Recording.** Every one-time dismissal, gated acknowledgement and consent choice must be written to local SQLite with: the key name, `legal.copyVersion`, the **rendered language (EN/ZH)**, the profile, and a timestamp. Records stay on the user's device like all other instance data — **except publish-flow acceptances, warranty confirmations and the overseas-storage consent (G2, G2a, G3a)**, which must additionally be recorded **server-side by the operator's publish service** against the publishing account (key name, copy version, rendered language, account identifier, timestamp) so acceptance of the Contributor Agreement can be evidenced; this sits within G3's minimisation scope (managing published content). See Note 7.8 on the evidentiary weight of local-only records and the publish-service schema requirement.

**Flywheel evidence records (each accepted example upload, if sharing ever ships).** The A3 preference is **local only** and is **not** part of any evidence mechanism: it records interest, not authorisation, and no server-side record is made of it. The evidence mechanism below applies only once an upload capability exists and a fresh affirmative choice has been made at that point. Flywheel sharing needs no account, so this evidence is not held against a publishing account; instead, each accepted example upload would record **server-side**, against a pseudonymous random instance identifier (not against a person or a publishing account): the **content hash**; the **accepted ToS version**; the **accepted sharing-copy version** (the A3 `legal.copyVersion`); a **choice / grant-event id**; a **timestamp**; the **pseudonymous random instance id**; the **sharing mode** (Automatic / Review Each / Off) in force; the **sensitive-confirmation flag** (whether a G4 sensitive-ask confirmation was given); and whether the upload came via **automatic, review-each, or sensitive-confirmation**. This is what evidences the CC BY 4.0 licence and the affirmative-choice grant for shared patterns — the A3 local record is the device-side leg, not the only evidence. These evidence fields are not directly identifying, are not derived from personal information or device characteristics, and are used only to evidence the licence/consent and to investigate abuse (see Note 7.8 and the Schedule on their retention and the limits of "non-identifying").

2.4 **"Vaenyx" in UI strings** is the product name and, where a legal person is implied (e.g. "not endorsed by Vaenyx"), refers to Vae Foundry Pty Ltd as defined in the Terms of Service. UI strings deliberately use the product name for readability; the ToS carries the formal identification.

2.5 **Bilingual pairing.** The app ships with a live English/Chinese language switch; each string below is an EN/ZH pair and only the active language's string is rendered. The ZH strings are natural working translations, not word-for-word renderings; as between the two languages, the **English version prevails** to the extent of any inconsistency, consistent with the express prevalence clauses in the ToS (clause 19.8), Core Privacy Policy (clause 14.1), Contributor Agreement (clause 16.7) and Trademark Policy (clause 15.5).

2.6 **Length discipline.** Persistent footers should stay under ~60 characters (EN); banners under ~140; dialog bodies under ~450. The strings below respect these budgets; do not pad them during implementation.

2.7 **Naming bridge** *(labels updated 2026-07-14 to the shipped UI — a bridge-accuracy edit that did not change the substantive copy; the current copy version is set in §0 and the version table, not here)*. The legal documents use the defined term **"Community Library"** for the public catalogue; the product UI labels it **"Community"**, and labels the user's private on-device store the **"Library"** (its GitHub warehouse repository is `vaenyxai/community`). Strings in this pack that predate the relabel may still say "Library" for the catalogue or "My Library" for the on-device store (e.g. I3); they are updated at the pack's next string revision under clause 6.4, not silently.

## 3. Drafting Principles (Binding on Future Edits)

3.1 **Honest, plain, non-scary.** Strings state the risk or fact once, in plain words, without alarmist framing and without hedging away the point.

3.2 **No absolute locality claims.** Because the model backend is pluggable and a cloud provider may receive chat content, no string may ever claim that "nothing leaves your device" or equivalent. Scoped locality statements (e.g. that a *specific* function runs locally) are permitted only where that is true by design.

3.3 **Merit is never money.** Every Merit-related string must preserve the non-monetary characterisation: no cash value; cannot be bought, sold, transferred or redeemed; not a currency, security or financial product. This position is permanent: no spend, perk or exchange path will ever be added.

3.4 **Free product.** No string may reference Vaenyx payments, billing or pricing (none exist). Third-party fees (e.g. a cloud model provider's charges) may and must be flagged as the user's own cost.

3.5 **18+ / general audience.** No string is directed at, or makes statements about, children as users. The sensitive-data category covering family-related content is labelled "family" in the UI (clause 4.G4 note) and is deliberately **wide**: it covers all family-related content, child-related content included — not only the child-related subset — and the sensitive-category recogniser must be built to that full width (Note 7.12). It describes data content, not users, preserving the 18+ posture.

3.6 **Defaults and choices stated honestly.** Flywheel sharing is **off and unavailable**: A3 records interest only, no option is pre-selected or recommended, and nothing can be shared until the capability exists and a fresh affirmative choice is taken at that point. Where a setting genuinely defaults on (the Method Token `sendFeedback` bit), the copy or its immediate surface says so plainly and offers the off switch in the same breath. No dark patterns: where a choice is recorded as consent, no option is pre-selected; a recommended option may be visually highlighted but never pre-ticked; the decline action is one tap and never guilt-worded.

3.7 **No absolute de-identification guarantees.** De-identification is a **process** the engine performs before sharing, not a structurally guaranteed outcome. Strings must describe it as a step taken ("stripped of names, amounts and personal details before sharing") and pair it with the report-and-takedown channel (D4) as the remedy — described honestly as removal **from the Library**, never as erasure everywhere: copies already installed, and traces in the public library's history, forks and mirrors, may persist (see G1), and no string may promise otherwise. No string may promise that shared content can *never* contain personal data unless and until a schema-level structural guarantee (no free-text fields in shared patterns) exists and is documented here. Statements that a *gate exists* remain permitted where the gate is structural **for the content it covers, and the string must carry the recognition condition on its face ("flagged as" / "Vaenyx recognises as") — a detection model is not structural, so bare category claims (e.g. "health content is never shared automatically") are prohibited**.

3.8 **ZH strings are audited as originals.** Only the active language renders (clause 2.5), so every ZH string must satisfy these principles — clauses 3.2 and 3.7 especially — **as a string in its own right**, not as a translation read alongside the English. Absolutes (只会 / 绝不 / 永不) must not appear where the EN is process- or scope-qualified, and acknowledgement wording must not harden into a read-confirmation (use 知悉, not 已阅读). The English-prevails clause is an interpretive tiebreaker between the pair; it does not cure a misleading rendered string, because the consumer was only ever shown one of them.

---

## 4. The Copy Pack (Organised by Placement)

### Part A — First-Run and Install Wizard

**A1 — `legal.disclaimer.aiGeneral.firstRun`**
- **Placement:** First-run welcome screen, above the continue button.
- **EN:** "Vaenyx uses AI. AI can be wrong or out of date — always double-check important information."
- **ZH:** "Vaenyx 使用 AI。AI 可能出错或过时——重要信息请务必自行核对。"
- **Behaviour:** One-time (part of first-run flow; proceeding past the screen is recorded).

**A2 — `legal.notice.firstRun.terms`**
- **Placement:** First-run, directly above the continue button, with "Terms of Service" and "Privacy Policy" as tappable links to the A-class documents.
- **EN:** "By continuing you agree to the Terms of Service and acknowledge the Privacy Policy."
- **ZH:** "继续即表示你同意《服务条款》,并知悉《隐私政策》。"
- **Behaviour:** Gated acknowledgement (the continue tap is the acceptance event and is recorded). The Privacy Policy is a notice, not a contract; the string deliberately says "acknowledge", not "agree to", to avoid bundled consent. The 26 July 2026 of the ToS and Privacy Policy is set no earlier than when this flow ships (the ToS also requires the C2 health gate to be live, and the Core Privacy Policy its clauses 1.4 and 13.2 and Schedule verification).

**A3 — `legal.notice.flywheel.preference`** *(shown beside A2, same screen)*
- **Key change at 2.6:** this card moves from `legal.consent.flywheel.*` to `legal.notice.flywheel.preference.*`. Retire `legal.consent.flywheel.title`, `.body`, `.accept`, `.decline`, `.sensitiveNote` and `.multiUserNote`: they describe an always-ask gate and a multi-user sharing rule for a capability that does not exist, and `.accept` currently reads "Keep Sharing On (Recommended)" — a recommendation to consent to nothing. New keys: `legal.notice.flywheel.preference` for the body text itself — **the bare key, not `.body`**, because this pack's audit compares each block's heading key against the shipped string, so a body parked on a sub-key is a body nobody checks — plus `legal.notice.flywheel.preference.title`, `.interested` and `.notInterested`.
- **Title — EN:** "Community Sharing (Not Available Yet)" / **ZH:** 「社区分享(尚未提供)」
- **EN:** "This version does not upload improvement patterns. You may record whether you are interested in sharing in future, but this preference does not turn sharing on, authorise an upload, or grant consent, a licence or moral-rights consent. A fresh affirmative choice will be required if sharing becomes available."
- **ZH:** "本版本不会上传任何改进模式。你可以记录自己将来是否有意参与分享,但这项偏好不会开启分享,不构成任何上传授权,也不构成同意、许可或精神权利同意。若将来提供分享,届时需要你重新作出一次肯定性选择。"
- **Buttons:** **EN:** "Interested" / "Not interested" — **ZH:** 「有兴趣」/「暂不参与」
- **Behaviour:** **Not a consent-class string and not a server-side evidence record.** The choice is written to local SQLite only. It records interest, not authorisation: it cannot enable a data flow, and it cannot be relied on as the grant event for any later upload, licence or moral-rights consent (Core Privacy Policy clauses 1.4 and 13.1–13.2; Schedule entry `feature.community-sharing.preference-ui`). Neither option is pre-selected, and neither may be described as recommended. **Rationale for the change at 2.6:** while sharing does not exist, a forced *consent* choice asks the user to consent to nothing, and recording it as a consent event manufactures evidence of an authorisation that was never given. The forced-choice decision of 2026-07-05 is preserved where it bites — at the point sharing actually becomes available, which is where the fresh affirmative choice is required.

**B1 — `legal.disclaimer.aiGeneral.composer`**
- **Placement:** Persistent footer line under the chat composer, every chat.
- **EN:** "AI can make mistakes. Check important information."
- **ZH:** "AI 可能出错,重要信息请自行核对。"
- **Behaviour:** Persistent. Never hidden, including in Custom Mode.

**B2 — `legal.notice.modelPicker`**
- **Placement:** Tooltip / info line on the per-chat provider picker (and tier picker, where available). The pluggable provider registry has shipped (Codex CLI, OpenAI-compatible cloud or local, Anthropic, Google Gemini); this string ships with whichever picker surfaces exist in the build.
- **EN:** "This chat uses the provider shown. Cloud providers receive your chat content — including context Vaenyx adds, like memories and project summaries — under their own terms."
- **ZH:** "本对话使用所示的服务商。云端服务商将按其自身条款接收你的聊天内容,包括 Vaenyx 添加的上下文(如记忆与项目摘要)。"
- **Behaviour:** On-demand (visible whenever the picker is opened).

**B3 — `legal.notice.project.autoSummary`**
- **Placement:** The Project instructions panel, on or beside the automatic summary Document (dual-instruction design, locked 2026-07-02).
- **EN:** "Vaenyx keeps an automatic short summary of your preferences for this project and uses it as context in this project's chats. It's stored on this device — you can view, edit or delete it anytime. Nothing enters Vaenyx Me without your approval."
- **ZH:** "Vaenyx 会为此项目自动维护一份你的偏好摘要,并作为本项目对话的上下文使用。它存储在本设备上——你可以随时查看、编辑或删除。未经你的批准,任何内容都不会进入 Vaenyx Me。"
- **Behaviour:** Persistent (visible wherever the automatic summary Document is shown). The storage-locality statement is scoped and true by design (clause 3.2); its *use as context* is deliberately disclosed because that context may reach a cloud provider (see B2/F1). The final sentence ("Nothing enters Vaenyx Me without your approval" / ZH equivalent) is a clause 6.7 feature-existence statement: it renders only while the Vaenyx Me approval gate is structurally verified — no code path writes to Vaenyx Me without an approval record.

**B4 — `legal.notice.method.edit`**
- **Placement:** The confirmation shown in chat before a Method's recipe is rewritten from a conversation, above the apply button and beside the list of changed lines.
- **EN:** "This rewrites what the Method tells the model to do — its steps only. Its inputs, outputs and permissions are unchanged. Apps you granted this Method must be granted it again, because what they were granted has changed. Nothing is published: your Library copy is the only one affected."
- **ZH:** "这只会改写 Method 交给模型的指令(即它的步骤),不会改动它的输入、输出与权限。已授权使用该 Method 的 app 需要重新授权,因为被授权的内容已经变了。这不会发布任何东西:只影响你资源库里的这一份。"
- **Behaviour:** Point-of-action (every recipe edit). The changed lines must be shown as a difference against the current recipe, never as a rewritten whole — an Owner who cannot see what changed cannot meaningfully approve it. Editing is confined to `recipe.md`: `schema.json` and `manifest.json` (the permission declaration) are out of scope for natural-language editing and need an explicit interface of their own. The edit must never publish, and must never be applied without this confirmation.

### Part C — Sensitive-Domain Surfaces

*Standing position (locked 2026-07-03): v1 ships no official health Methods or Routines — none are in the seed library and the operator makes no health claims. General health conversation is not blocked, but it carries the C1 disclaimer and is gated once by C2. **Coverage is detector-dependent:** C1/C2 trigger on health-flagged content, so a missed flag means no banner and no gate — the health flagger must therefore be biased to over-trigger (false positives are cheap; false negatives silently defeat the single highest-risk protection) and must include a keyword/intent union trigger for medication, dosage and treatment terms. Community health content additionally carries the not-endorsed disclaimers (D1/D2). No official health feature may ever ship without prior sign-off from qualified counsel (Note 7.3).*

**C1 — `legal.disclaimer.health.banner`**
- **Placement:** Persistent banner on health-flagged chat results and on any community health Method/Routine view (including medication lists, health records and medication reminders installed from the Library).
- **EN:** "Not medical advice. Never rely on Vaenyx for diagnosis, medication choices or dosage. In an emergency, contact emergency services immediately."
- **ZH:** "这不是医疗建议。切勿依赖 Vaenyx 做诊断、选药或定剂量。紧急情况请立即联系急救服务。"
- **Behaviour:** Persistent, not dismissible. This is the single highest-risk domain; the banner is mandatory wherever health content renders, and continues to show after the C2 gate is accepted.

**C1a — `legal.disclaimer.health.reminderReliability`**
- **Placement:** Persistent note wherever medication reminders are configured or displayed — from any source (a community-installed item or a scheduled Task used for medication) — alongside C1. Required because the real risk on that surface is a reminder failing to fire, and it must be disclosed rather than disclaimed away.
- **EN:** "Reminders can fail or be delayed. Never rely on Vaenyx as your only reminder for critical medication."
- **ZH:** "提醒可能失败或延迟。关键用药切勿只依赖 Vaenyx 提醒。"
- **Behaviour:** Persistent wherever medication reminders are configured or displayed.

**C2 — Health acknowledgement gate** *(required — locked 2026-07-03: a one-time explicit acknowledgement must be obtained before health-related content is used)*

`legal.disclaimer.health.gateTitle`
- **EN:** "Before Discussing Health Topics"
- **ZH:** "谈及健康话题前"

`legal.disclaimer.health.gateBody`
- **EN:** "Vaenyx can discuss health topics, but it is not a medical professional and its output is not medical advice. Never rely on it for diagnosis, medication choices or dosage, or in an emergency — always follow your doctor or pharmacist. Confirm you understand to continue."
- **ZH:** "Vaenyx 可以聊健康话题,但它不是医疗专业人员,其输出也不是医疗建议。切勿依赖它做诊断、选药或定剂量,紧急情况更不可依赖——请始终遵从医生或药剂师的指导。确认已了解后方可继续。"

`legal.disclaimer.health.gateAccept` (button)
- **EN:** "I Understand — Continue"
- **ZH:** "我已了解——继续"

`legal.disclaimer.health.gateCancel` (button)
- **EN:** "Not Now"
- **ZH:** "暂不继续"

- **Behaviour (whole gate):** Gated acknowledgement, **required**, one-time **per profile** (clause 2.2) — each human profile sees and accepts its own gate; an Owner's acceptance does not stand in for other household members. Shown before health-related content is first used by that profile (the profile's first health-flagged chat exchange, or first enable of a community health Method/Routine, whichever comes first); the health-flagged content, chat exchange, or community item remains withheld until the active profile accepts; acceptance recorded with copy version, rendered language, profile and timestamp. Cancelling leaves the content withheld without penalty; after that profile's acceptance, health conversation is not blocked. The C1 banner (and C1a where reminders render) continues to show after acceptance — the gate does not replace them.

**C3 — `legal.disclaimer.finance`**
- **Placement:** Persistent footnote on finance-related Method/Routine views and finance-flagged results (ledgers, quotes, estimates, budgeting).
- **EN:** "Not financial advice. For important money decisions, talk to a qualified adviser."
- **ZH:** "这不是财务建议。重大金钱决定请咨询合格的专业人士。"
- **Behaviour:** Persistent.

**C4 — `legal.disclaimer.tax`**
- **Placement:** Persistent footnote on tax-related Method/Routine views and tax-flagged results.
- **EN:** "Not tax advice. Check important figures with a registered tax agent or accountant."
- **ZH:** "这不是税务建议。重要数字请与注册税务代理或会计师核对。"
- **Behaviour:** Persistent.

**C5 — `legal.disclaimer.legal`**
- **Placement:** Persistent footnote on legal/contract-related Method/Routine views (e.g. lease or contract review) and legal-flagged results.
- **EN:** "Not legal advice. For contracts and legal matters, consult a qualified lawyer."
- **ZH:** "这不是法律意见。合同与法律事务请咨询合格律师。"
- **Behaviour:** Persistent.

### Part D — Library (Browse and Install)

*Naming (clause 2.7): the public catalogue is the Community Library, shown in the product as "Community"; the user's private on-device store is the "Library". Provenance chips mark each item's origin (self-made vs community-installed) and state (private vs published).*

**D1 — `legal.disclaimer.community.browse`**
- **Placement:** Persistent line at the top or footer of the Library browse view.
- **EN:** "Community Methods and Routines are created by community members. They are not endorsed by Vaenyx and are not professional advice; 'Verified' shows only that automated checks passed."
- **ZH:** "社区 Method 与 Routine 由社区成员制作,Vaenyx 不为其背书,也不构成专业建议;'Verified' 仅表示已通过自动检查。"
- **Behaviour:** Persistent. Community health content additionally renders C1 (and the C2 gate applies before first use).

**D2 — `legal.disclaimer.community.install`**
- **Placement:** Install confirmation dialog for any community item, above the install button.
- **EN:** "Created by a community member. It has not been reviewed as professional advice — use it at your own discretion. It does nothing until you use it."
- **ZH:** "由社区成员制作,未经专业建议层面的审核——请自行斟酌使用。你不主动使用,它就不会做任何事。"
- **Behaviour:** Point-of-action (every community install). The final sentence reflects the inert-by-default safety property and must not be removed while that property holds.

**D3 — `legal.disclaimer.community.verifiedMeaning`**
- **Placement:** Tooltip / info popover on the "Verified" label.
- **EN:** "Verified means this version passed Vaenyx's automated checks (schema, format and static scans) — no person has individually reviewed it, and the checks don't test how it behaves. It is still community content, not professional advice."
- **ZH:** "Verified 表示该版本已通过 Vaenyx 的自动检查(schema、格式与静态扫描)——并非有人逐条人工审核,检查也不测试其实际行为。它仍是社区内容,不构成专业建议。"

`legal.disclaimer.community.verifiedShort` (corrective one-liner)
- **EN:** "Verified = automated checks only — no human review."
- **ZH:** "Verified = 仅自动检查——无人工审核。"
- **Placement:** Rendered immediately adjacent to the Verified badge wherever the badge renders outside the browse view (which already carries D1) — **including the D2 install dialog**, where the install decision is actually made and the on-demand tooltip cannot be assumed seen.

- **Behaviour:** Tooltip on-demand (shown wherever the label appears); the short line is persistent with the badge. The word "safety" must not be used to describe these checks while they are schema/format/static only — they do not evaluate behaviour, and the badge must not convey a quality assurance the checks cannot support. Describes the *current* automated mechanism; if any human-review step is ever added to Verified, D1/D3 must be updated before that change ships (Note 7.10). Publishing itself is auto-publish with reactive operator takedown — there is no pre-publication review queue, which is why "Verified" must never be allowed to imply one.

**D4 — `legal.notice.community.report`**
- **Placement:** Every community item's detail page, as a "Report This Method/Routine" entry (menu item or link). The same channel serves reports of personal information appearing in shared examples (clause 3.7) and takedown requests, and must align with the takedown provisions of the ToS and Contributor Agreement.
- **EN:** "Report content that is unsafe, infringing, misleading or contains personal information: hello@vaenyx.ai. Vae Foundry Pty Ltd collects directly from you your email address and the report details you choose to provide, and uses them for triage, investigation, response and legal compliance. Reporting is optional, but without enough information to identify the item and explain the issue we may be unable to act. Reports are handled by email on overseas servers — include only what's needed. The current providers, countries and retention rule are stated in the Current Implementation and Data-Handling Schedule; the Core Privacy Policy explains access, correction and complaints."
- **ZH:** "举报不安全、侵权、误导或含个人信息的内容:hello@vaenyx.ai。Vae Foundry Pty Ltd 会直接从你处收集你的邮箱地址与你选择提供的举报内容,用于分流、调查、答复与遵守法律。举报是可选的;但若信息不足以定位该条目并说明问题,我们可能无法处理。举报邮件在海外服务器上处理——请只写必要信息。当前的服务商、国家与留存规则载于《当前实现与数据处理明细表》;查阅、更正与投诉事宜见《核心隐私政策》。"
- **Behaviour:** On-demand (available from every community item's detail view). Reports are actioned under the operator's takedown discipline — as soon as reasonably practicable, serious-harm material first, and within any period a law or regulator's notice sets — using the publish service's global takedown and ban controls. The email routes via Cloudflare Email Routing to the operator's monitored mailbox on a consumer mail service processed overseas — hence the bracketed overseas-handling line in the string (Note 7.13); an auto-reply states how reports are handled and triage is prompt. The channel must also be visible **outside the app**: the public warehouse repository's README and every publicly rendered item page must carry the same contact (hello@vaenyx.ai) and a one-line takedown statement, because the people most likely to complain (e.g. a person defamed in community content) are not Vaenyx users and will encounter the content on the public surfaces; complaint-receipt timestamps must be logged so the response discipline can be evidenced.

**D4a — the report template** *(one template, two entry points)*

*Why this exists.* The person most likely to need this channel — someone named
in content another person published — is **not a Vaenyx user** and never will be.
So the same template has to work from inside the app and from a public page on
the website, and the public page cannot require an account, an installation, or
anything a distressed stranger on a phone cannot do. An accessible complaints
mechanism is the condition of the digital-intermediary defamation defence; a
mechanism only users can reach fails exactly the case it exists for.

**Subject line — this is what makes reports sortable:**

```
[VAENYX-REPORT] <category> — <item identifier>
```

Categories, fixed: `defamation` · `privacy` · `copyright` · `illegal` · `safety` · `other`

**No reporter name in the subject.** Subject lines show up in notification
previews; there is no reason to put a third party's name there.

**Body template — EN:**

```
Item identifier:
Category:
The specific content complained of (which sentence or section):
Why you say it is a problem:
Your name:
Your contact details:
Your connection to the content (optional):
```

**Body template — ZH:**

```
条目标识:
类别:
被投诉的具体内容(哪一句、哪一段):
为什么认为有问题:
你的姓名:
你的联系方式:
你与该内容的关系(可选):
```

The first six lines are the four things a complaint must identify to be acted on
— who is complaining, what the material is, where it is, and the specific words
said to be a problem. A report carrying them can be actioned without a round of
questions.

**In the app:** the mail client supplies the sender's address in the From header,
so **do not ask for an email address as a field** — a redundant field is one more
reason not to finish. Pre-fill subject and body; the person edits and sends.

**On the public page:** show three routes on one page, because `mailto:` fails
silently for someone using webmail or a phone with no mail client configured —
(a) a mailto button, (b) `hello@vaenyx.ai` in plain text with a copy control,
and (c) the template itself, copyable, so it can be pasted into any mail client.
**No form that posts to a server**: the moment a form submits to us we hold the
reporter's name, address and allegation before any email exists, which is a new
data flow needing its own Schedule entry, collection notice and retention rule.
The published address does the same job with none of that.

**Never required:** a letter from a lawyer, a statutory declaration, a citation
to legislation, proof that the material is unlawful, or an identity document.
Requiring any of them would undermine the accessibility the defence depends on.

**D4b — `community.report.category.defamation`** *(and the five siblings)*

The six category tokens are a **format contract with the subject line**, not
decoration: the token that reaches the mailbox must stay in English so a filter
can match it regardless of the reporter's interface language. The Chinese labels
therefore carry the token alongside the translation. **The label set must map
one-to-one to the six tokens** — adding a seventh category means changing D4a as
well, because the subject-line format is defined there.

- **EN:** "Defamation" — **ZH:** 「诽谤 (defamation)」
- **EN:** "Privacy / personal information" — **ZH:** 「隐私 / 个人信息 (privacy)」
- **EN:** "Copyright" — **ZH:** 「版权 (copyright)」
- **EN:** "Illegal content" — **ZH:** 「违法内容 (illegal)」
- **EN:** "Safety" — **ZH:** 「安全 (safety)」
- **EN:** "Something else" — **ZH:** 「其它 (other)」

The heading and placeholder around the selector (`community.report.category`,
`community.report.categoryPrompt`) are ordinary interface text and are
deliberately **not** in this pack — nothing legal turns on how the question is
phrased.

**D4c — `report.page`** *(the public page at vaenyx.ai/report)*

The page a person reaches who is **not** a Vaenyx user. It carries the same
template as D4a and must not require an account, an installation, or anything a
distressed stranger on a phone cannot do.

- **EN:** "Report content in the Vaenyx Community. Anyone may use this page — you do not need a Vaenyx account, and you do not need to have installed anything. Send the details below to hello@vaenyx.ai. We assess sufficiently detailed reports having regard to apparent urgency, potential harm, the information available to us and applicable legal requirements. We may restrict content or accounts without prior notice. Sending a report does not guarantee removal, restoration, reasons, individual correspondence or any particular outcome, and we do not decide whether reported material is unlawful. Please tell us what is wrong rather than proving it: we do not ask for a lawyer's letter, a statutory declaration, a citation to legislation, or identity documents."
- **ZH:** "举报 Vaenyx 社区中的内容。任何人都可以使用本页 —— 你不需要 Vaenyx 账户,也不需要安装过任何东西。请把下列信息发送至 hello@vaenyx.ai。我们会就足够具体的举报作出评估,并考虑其表面紧急程度、潜在伤害、我们可获得的信息以及适用的法律要求。我们可以不经预先通知限制内容或账号。提交举报不保证移除、恢复、说明理由、个别回复或任何特定结果,我们也不就被举报材料是否违法作出判断。请告诉我们问题在哪,而不是去证明它:我们不要求律师函、statutory declaration、法条引用或身份证件。"

**D4d — `report.page.limits`** *(on the same page, below the template)*

The limits of what removal achieves. This is the sentence that stops the page
becoming a promise, and it has to be on the page rather than in a document
nobody opens.

- **EN:** "What removal can and cannot do: we can remove content from the Vaenyx catalogue and index that installations read, remove the published files, and block that item identifier from being republished. We cannot remove copies held by other people — forks, mirrors, caches, archives and search-engine results are outside our control, and removal here does not make content disappear from the internet. If the material is unlawful, you may have remedies against the person who published it that we cannot provide."
- **ZH:** "移除能做到什么、不能做到什么:我们可以把内容从各安装端读取的 Vaenyx 目录与索引中移除、删除已发布的文件,并阻止该条目标识符被重新发布。我们无法移除他人持有的副本 —— fork、镜像、缓存、存档与搜索引擎结果都在我们控制之外,**在这里移除并不等于该内容从互联网上消失**。若该材料违法,你可能对发布它的人享有我们无法提供的救济。"

**D4e — `method.corrections.copy`** *(corrections waiting to be reviewed)*

An app returned a correction after someone fixed this Method's answer. The
warning matters: a correction carries whatever was actually typed, which may be
a real name, a real amount, a real address. The Owner is about to decide whether
to keep it, and must know that before deciding, not after.

- **EN:** "An app sent these back after someone fixed this Method's answer. Keep one and this Method follows it next time. Read it first — a correction contains whatever was actually typed."
- **ZH:** "有 app 把这些纠正发了回来 —— 是有人改过这个 Method 的答案。保留一条,它下次就照着做。先看清楚:纠正里是当时真实输入的内容。"

**D4f — `method.corrections.locality`** *(shown beside the Keep control)*

**This sentence was written inline in App.tsx.** A representation about where
data goes, living in a component instead of this pack, is invisible to the audit
— which is exactly how the Chinese documents drifted two review rounds behind.
It gets a key so it can be checked.

- **EN:** "Kept examples stay on this computer. Nothing is published, and no app grant is affected."
- **ZH:** "保留的例子只存在这台电脑上,不会发布,也不会影响已授权的 app。"

**Consistency check when this ships:** the release-scope statement says this
release provides no community-sharing upload and no Example attachment on
publication. Keeping a local example is consistent with that only while
"nothing is published" stays literally true. If a later version ever attaches
examples to a publication, this string and the Schedule change together, and the
consent for it is sought at that point.

**D5 — `legal.notice.community.discord`**
- **Placement:** Wherever the app links to the community Discord (e.g. Settings → About, Library footer), adjacent to the link.
- **EN:** "Community discussion happens on Discord, a third-party platform under its own terms. If you join or post in the official Vaenyx server, Discord collects and stores your account details, posts and technical data, and Vae Foundry Pty Ltd administrators can access and use your Discord profile, posts and moderation records to operate and moderate the server. Participation is optional. The Discord platform itself is not operated by Vaenyx. See the Core Privacy Policy and the Current Implementation and Data-Handling Schedule for retention, access, correction and complaints."
- **ZH:** "社区讨论在 Discord 上进行。Discord 是第三方平台,受其自身条款约束。若你加入官方 Vaenyx 服务器或在其中发帖,Discord 会收集并存储你的账户信息、帖子与技术数据;Vae Foundry Pty Ltd 的管理员可以访问并使用你的 Discord 资料、帖子与管理记录,以运营和管理该服务器。参与是可选的。Discord 平台本身并非由 Vaenyx 运营。留存、查阅、更正与投诉事宜,见《核心隐私政策》与《当前实现与数据处理明细表》。"
- **Behaviour:** On-demand (travels with the Discord link). Vaenyx does not self-host a forum; the Discord *platform* is not an Operator Service and Discord's own platform-level moderation applies. The official server, however, is created and administered by the operator: posts in it are subject to the same D4 report channel and takedown discipline, and the server's rules/about text must carry the hello@vaenyx.ai report contact together with the same overseas-handling notice line as D4 (Note 7.13). If the linked server ever ceases to be operator-administered, re-verify this string and clause 6.6 before the link ships.

**D6 — `legal.notice.community.updateAvailable`**
- **Placement:** On an installed community item, wherever a newer published version exists, beside the version numbers and the publisher's own description of the change.
- **EN:** "A newer version of this community item has been published. Updating replaces your installed copy with the publisher's new version; the current one keeps working if you do nothing."
- **ZH:** "该社区条目已发布更新的版本。更新会用发布者的新版本替换你已安装的这一份;你不做任何操作,现在这一份也会继续正常工作。"
- **Behaviour:** Persistent while a newer version exists. **Neutral by construction:** the string states availability, never a recommendation — no "update now", no urgency, no badge implying something is wrong with the installed copy, because Vaenyx would then be vouching for third-party content it has not reviewed. Nothing updates itself: user-side auto-update is prohibited (Note 7.14), so this notice is the only path from a new version to an installed one. Choosing to update runs the ordinary install flow, which means D2 is shown again — an update is a fresh install of someone else's content, and the install-time disclaimer applies to it exactly as it did the first time. Content that must reach installed copies without the user choosing is handled by takedown and index removal (ToS 8.5), which is an operator control, not an author one.

### Part E — Merit and Creator UI

**E1 — `legal.disclaimer.merit`**
- **Placement:** Persistent line wherever a Merit balance or Merit event is displayed (when Merit display ships; no Merit value is displayed in the current build).
- **EN:** "Merit is recognition only — no cash value; it cannot be bought, sold, transferred or redeemed."
- **ZH:** "Merit 只是认可记录——无现金价值,不可购买、出售、转让或兑换。"
- **Behaviour:** Persistent.

**E2 — `legal.disclaimer.merit.creatorPage`**
- **Placement:** Creator/profile page, once, near the Merit summary (when Merit display ships).
- **EN:** "Merit records community recognition of useful contributions. It is not money, a currency, a security or a financial product, and there is nothing to spend."
- **ZH:** "Merit 记录社区对有用贡献的认可。它不是金钱、货币、证券或金融产品,也不存在任何消费用途。"
- **Behaviour:** Persistent.

### Part F — Connections (Model Backend and Remote Access)

**F1 — `legal.notice.modelConnect.cloud`**
- **Placement:** Connect screen when adding any cloud model provider (first-run wizard and Settings → Models; current cloud providers include OpenAI — via Codex CLI or API key — Anthropic and Google Gemini), above the connect button, with a link to the provider's terms where available.
- **EN:** "You're connecting a third-party AI provider. Your messages — plus any context Vaenyx adds, like saved memories, your profile, project summaries and attached files — will be sent to the provider you choose, under its terms, privacy policy and any fees it charges. Vaenyx doesn't control that provider."
- **ZH:** "你正在连接第三方 AI 服务商。你的消息,连同 Vaenyx 添加的上下文(如已保存的记忆、你的档案、项目摘要与附件),将发送给你所选的服务商,受其条款、隐私政策及其收费约束。Vaenyx 无法控制该服务商。"
- **Behaviour:** Point-of-action (every new provider connection); proceeding past the screen is recorded per provider. The context-injection disclosure is mandatory: describing the outbound flow as "prompts only" would understate it.

**F2 — `legal.notice.modelConnect.local`**
- **Placement:** Connect screen when adding a local model backend (any OpenAI-compatible endpoint, e.g. Ollama or LM Studio).
- **EN** (renders only when a technical check confirms the entered address is loopback — this machine itself): "This backend address points at your own machine. Vaenyx sends chats for this backend only to that address, under the model's own licence terms."
- **ZH:** "该后端地址指向你自己的机器。Vaenyx 只会把此后端的聊天发送到该地址,并受模型自身许可条款约束。"

`legal.notice.modelConnect.local.lan` (renders when the check confirms an RFC1918 private-range address that is not loopback)
- **EN:** "This address is on your local network — it may be another machine, not this one. Vaenyx sends chats for this backend only to that address. Make sure the machine it points at is one you control."
- **ZH:** "该地址位于你的本地网络——可能指向另一台机器,而非本机。Vaenyx 只会把此后端的聊天发送到该地址。请确认它指向的是你自己掌控的机器。"

`legal.notice.modelConnect.local.unverified` (fallback when the address cannot be verified as loopback or private-range)
- **EN:** "Vaenyx sends chats for this backend only to the address you entered. Make sure it points at your own machine — a remote address means your chats leave this device."
- **ZH:** "Vaenyx 只会把此后端的聊天发送到你填写的地址。请确认该地址指向你自己的机器——若是远程地址,你的聊天将离开本设备。"

- **Behaviour:** Point-of-action (each local backend connection). The "your own machine" string may render **only after a technical check** that the endpoint address is loopback; an RFC1918 private-range address renders the LAN variant instead — private-range addresses routinely belong to *other* machines (a housemate's PC, an office server, a NAS), so "your own machine" must never render for them, and chats sent to a LAN address do leave this device; where neither check succeeds, the fallback renders. None of the three strings claims chats are "processed locally" or that the model "runs on your own machine": the connect path accepts any OpenAI-compatible URL, and Vaenyx cannot verify what the software behind an address does with the content (even a loopback proxy can forward to a cloud service). Clause 3.2 permits scoped locality statements only where true by design; here truth depends on the user's endpoint, so the strings assert only what Vaenyx itself does.

**F3 — `legal.notice.remoteAccess.enable`**
- **Placement:** The "enable remote access" step (wizard or Settings), above the enable button, with a link to Tailscale's terms.
- **EN:** "Remote access uses Tailscale, a third-party service. You sign in with your own Tailscale account and its terms apply. Once enabled, your Vaenyx instance gets an internet-reachable address — anyone with that address can reach the sign-in screen, and your Vaenyx login is what protects access. Traffic is encrypted in transit; Tailscale states its relays cannot read it."
- **ZH:** "远程访问使用第三方服务 Tailscale。你需用自己的 Tailscale 账号登录,并受其条款约束。开启后,你的 Vaenyx 实例将获得一个互联网可达的地址——任何知道该地址的人都能打开登录页,真正保护访问的是你的 Vaenyx 登录。传输过程加密;Tailscale 表示其中继无法读取内容。"
- **Behaviour:** Gated acknowledgement, one-time (re-shown if remote access is disabled and later re-enabled). Enabling is recorded. The wording deliberately separates *provisioning* (under the user's Tailscale account) from *access control* (the Vaenyx login), because Tailscale Funnel addresses are publicly reachable; and the encryption sentence is attributed to Tailscale rather than asserted as Vaenyx's own guarantee.

**F4 — `legal.notice.remoteAccess.status`**
- **Placement:** Persistent line on the remote-access Settings panel while remote access is on.
- **EN:** "Remote access is on. Your instance has an internet-reachable address; your Vaenyx login protects access."
- **ZH:** "远程访问已开启。你的实例拥有一个互联网可达的地址;访问由你的 Vaenyx 登录保护。"
- **Behaviour:** Persistent while enabled.

### Part G — Publishing and Community Sharing

*Architecture — what publishing does today (verified against the built service): a publication submission sends only the declarative item files, the signed-in account information and the acceptance records identified in the Schedule. It sends **no** local Examples and **no** raw corrections, performs **no** Example de-identification or preview, and records **no** Merit. Those capabilities must not be described in any string, or rendered on any surface, until the Schedule marks them active and every applicable gate is implemented. The service alone holds the credential that writes to the public repository; an installed copy of Vaenyx never holds one. Publishing is auto-publish with reactive operator takedown and ban. No sign-in option confers an advantage, and none requires an account with the host of the public repository.*

**G1 — `legal.notice.publish`**
- **EN:** "Publishing is optional. When you select Publish, Vae Foundry Pty Ltd (hello@vaenyx.ai) collects the declarative item files, your account identifier and chosen public byline, and versioned records of your Contributor Agreement acceptance, warranty confirmation and overseas-publication consent. We use them to publish, attribute, manage and moderate the item and to evidence the applicable rights and choices. Cloudflare, Inc. processes the submission for us on global infrastructure, and GitHub, Inc. in the United States receives only the public item files and byline for worldwide hosting. No local examples or raw corrections are included. Publication is permanent in copies beyond our reach, and the item is licensed to everyone under the Creative Commons Attribution 4.0 licence. Without this information the item will not be published. See the Core Privacy Policy and the Current Implementation and Data-Handling Schedule for retention, access, correction and complaints."
- **ZH:** "发布是可选的。当你点击发布时,Vae Foundry Pty Ltd(hello@vaenyx.ai)会收集该条目的声明式文件、你的账户标识符与你选定的公开署名,以及你对《贡献者协议》的接受、保证确认与海外发布同意的带版本记录。我们用这些信息来发布、署名、管理与审核该条目,并留存相关权利与选择的证据。Cloudflare, Inc. 在全球基础设施上代我们处理该提交;美国的 GitHub, Inc. 仅接收公开的条目文件与署名,用于面向全球的托管。提交中不包含任何本地示例或原始纠错。就我们无法触及的副本而言,发布是永久的;该条目依 Creative Commons Attribution 4.0 许可授予所有人。缺少上述信息则无法完成发布。留存、查阅、更正与投诉事宜,见《核心隐私政策》与《当前实现与数据处理明细表》。"
- **Behaviour:** Shown in the publish confirmation dialog. Must not describe stripping, de-identification or an exact preview of examples — the current publish path sends only recipe, schema, manifest and metadata files.

**G2 — `legal.notice.publish.contributorTerms`**
- **Placement:** Same dialog as G1, small print above the publish button, with "Contributor Agreement" as a tappable link to the A-class document of that exact title.
- **EN:** "By publishing you agree to the Contributor Agreement. Your acceptance is recorded against your publisher account."
- **ZH:** "发布即表示你同意《贡献者协议》。此确认将记录在你的发布者账号下。"
- **Behaviour:** Gated acknowledgement — the acceptance event is the **G2a warranty confirmation plus the publish tap** (Contributor Agreement clause 17 requires a separate, active, never-pre-selected confirmation; the tap alone is not the acceptance), and is recorded (first publish records full acceptance; later publishes record reaffirmation). Per clause 2.3, this acceptance is recorded **both locally and server-side by the publish service** against the publishing account, because the enforceability of the content licence depends on the operator being able to evidence acceptance (see Note 7.8 on the schema requirement). The sentence "Your acceptance is recorded against your publisher account" is a feature-existence statement under clause 6.7: it must not render — and the publish surface must not open — until the server-side acceptance-record table exists.

**G2a — `legal.consent.publish.warranty`** *(publish-time warranty confirmation — Contributor Agreement clause 17)*
- **EN:** "I confirm that I have the rights needed to publish this item, that it contains nothing malicious or harmful, that the Contributor Agreement's warranties are true for this item, and that I give the moral-rights consent in clause 6 for this Contribution."
- **ZH:** "我确认：我拥有发布本项所需的权利；本项不含任何恶意或有害内容；《贡献者协议》的各项保证就本项均属属实；并且我就本项贡献内容给予第 6 条所述的精神权利同意。"
- **Behaviour:** Must be ticked on every publish; never pre-ticked. Recorded server-side with key name, copy version, language, account id, contribution id and timestamp.

**G3 — `legal.notice.publish.signIn`**
- **EN:** "Before sign-in: Vae Foundry Pty Ltd (hello@vaenyx.ai) will receive from Google or GitHub the provider name, stable provider user ID, email and any available account handle; you separately choose your public byline. We create and store account, session and publish-acceptance records with Cloudflare, Inc. on global infrastructure, for authentication, attribution, moderation, security and managing your Published Content. Publishing is optional — without signing in you can browse the Community, but you cannot publish. See the Core Privacy Policy and the Current Implementation and Data-Handling Schedule for recipients, countries, retention, access, correction and complaints."
- **ZH:** "登录前请注意:Vae Foundry Pty Ltd(hello@vaenyx.ai)将从 Google 或 GitHub 接收服务商名称、稳定的服务商用户 ID、邮箱,以及可获得的账户名;你的公开署名由你另行选择。我们会在全球基础设施上,通过 Cloudflare, Inc. 创建并存储账户、会话与发布接受记录,用于身份验证、署名、内容管理、安全与管理你已发布的内容。发布是可选的——不登录也可以浏览社区,但无法发布。接收方、国家、留存、查阅、更正与投诉事宜,见《核心隐私政策》与《当前实现与数据处理明细表》。"
- **Behaviour:** Shown in the sign-in step. Must not mention Merit while Merit is not provided.

**G3a — `legal.consent.publish.overseas`** *(APP 8.2(b) overseas-disclosure consent — the operative condition in Core Privacy Policy clauses 8.4 to 8.6)*
- **EN:** "I consent to Vaenyx disclosing the content I publish and the public byline I choose to GitHub, Inc. in the United States for hosting in the public, worldwide Community Library. If the Privacy Act applies to Vaenyx and I give this consent, APP 8.1 will not apply to this disclosure. If GitHub handles that information in a way that would breach the APPs, Vaenyx will not be accountable under the Privacy Act for that handling and I will not be able to seek redress from Vaenyx under the Privacy Act for it. Other laws or rights may still apply. Publishing is optional. Withdrawal blocks future publication but cannot reverse information already made public. Consent will be obtained again if the recipient, purpose or consequences materially change."
- **ZH:** "我同意 Vaenyx 将我发布的内容及我选定的公开署名披露给美国的 GitHub, Inc.，以存放于面向全球的公开社区库。若《隐私法》适用于 Vaenyx 且我作出本同意，APP 8.1 将不适用于该项披露。若 GitHub 以违反 APPs 的方式处理该信息，Vaenyx 就该处理不在《隐私法》项下承担责任，我也无法就此依《隐私法》向 Vaenyx 寻求救济。其他法律或权利仍可能适用。发布是可选的。撤回同意可阻止今后的发布，但无法撤回已公开的信息。若接收方、目的或后果发生实质变化，将重新取得同意。"
- **Behaviour:** Must be affirmatively ticked before the OAuth redirect; never pre-ticked. Wording changed at copy version 2.5 — consent must be obtained again from any account whose recorded consent predates 2.5.

**G4 — `legal.consent.flywheel.sensitiveAsk`** (dialog body; the always-ask for sensitive categories)
- **Placement:** Modal dialog whenever a candidate shared pattern touches a sensitive category, regardless of the Settings sharing mode.
- **EN:** "This improvement touches a sensitive area (health, family or finance). Patterns Vaenyx recognises as sensitive are never shared automatically. Share this de-identified pattern with the community?"
- **ZH:** "该改进涉及敏感领域(健康、家庭或财务)。被识别为敏感的模式绝不会自动分享。要把这份脱敏后的模式分享给社区吗?"

`legal.consent.flywheel.sensitiveAsk.accept` (button)
- **EN:** "Share"
- **ZH:** "分享"

`legal.consent.flywheel.sensitiveAsk.decline` (button, default focus)
- **EN:** "Don't Share"
- **ZH:** "不分享"

- **Behaviour (whole dialog):** Gated acknowledgement, point-of-action — asked separately every time; there is no "always allow" option for sensitive categories, by design (locked 2026-06-23). Each answer is recorded. Note: "family" is the neutral UI label for the family sensitive-data category, implemented at full width — all family-related content, child-related included (clause 3.5; Note 7.12); it describes data content, not users, preserving the 18+ posture.

**G5 — `legal.notice.publish.localChanges`**
- **Placement:** On a published Method or Routine whose local copy no longer matches the published one, beside the publish control.
- **EN:** "You have changed this since you published it. The community still has the version you published; publishing again replaces it with what is on this device."
- **ZH:** "自你发布之后,你改动过这一份。社区上仍是你当初发布的那个版本;再次发布会用这台设备上的内容替换它。"
- **Behaviour:** Persistent while the local content hash differs from the published one. It states a fact and offers no prompt to act: **an edit must never publish itself.** Every publication is a separate acceptance of the Contributor Agreement in which the publisher warrants their rights, grants the CC BY 4.0 licence and gives the moral-rights consent (clause 17); an automatic republish would make those warranties on the publisher's behalf without their knowledge, and would put half-finished edits into a public history that cannot be recalled (G1 permanence). ToS 7.2(d) requires publication to follow a deliberate act.

### Part H — Backup and Restore

**H1 — `legal.notice.backup`**
- **Placement:** Persistent note on the backup page, above the destination picker.
- **EN:** "Backups contain your private data — chats, memories and files. Store them somewhere safe. Optional encryption is available."
- **ZH:** "备份包含你的私人数据——聊天、记忆与文件。请妥善保管。可选择加密。"
- **Behaviour:** Persistent. The final sentence (EN "Optional encryption is available." / ZH "可选择加密。") renders **only when backup encryption actually exists in the shipping build** (clause 6.7) — it does not exist as at v2.2.

**H2 — `legal.notice.backup.cloudSync`**
- **Placement:** Small print on the backup page, under the destination picker.
- **EN:** "You can point your own cloud-sync service at the backup folder — that's your choice, under that service's terms. Never sync the live Vaenyx data folder itself."
- **ZH:** "你可以让自己的云同步服务同步备份文件夹——这是你自己的选择,受该服务条款约束。切勿同步 Vaenyx 正在使用的实时数据文件夹。"
- **Behaviour:** Persistent.

**H3 — `legal.notice.restore`**
- **Placement:** Restore confirmation dialog, above the restore button.
- **EN:** "Vaenyx will restart to restore this snapshot (about 30 seconds). Your current data is saved as an automatic safety copy first, so you can undo it."
- **ZH:** "Vaenyx 会重启以还原这个快照(约 30 秒)。会先把你当前的数据自动存成一份安全副本,可反悔。"
- **Behaviour:** Point-of-action (every restore); confirm button `legal.notice.restore.confirm` — **EN:** "Restore and Replace" / **ZH:** "恢复并替换". **Corrected at copy version 2.6:** the earlier text said the restore could not be undone. The shipped implementation takes an automatic safety copy of the current data before replacing it, so the earlier wording overstated the consequence. The strings currently ship under the keys `settings.backup.restoreTitle` / `settings.backup.restoreWarn` / `settings.backup.restore`; they move to the `legal.notice.restore` keys so the copy audit can see them.

### Part I — Settings

**I1 — `legal.consent.flywheel.settingsNote`**
- **EN:** "This version does not upload improvement patterns. This setting records a preference only. If community improvement sharing becomes available, it will remain off until you are shown current information and make a fresh affirmative choice."
- **ZH:** "本版本不会上传任何改进模式。此处只是记录一项偏好。若将来提供社区改进分享，它依旧保持关闭，直到向你展示当时的说明并由你重新做出一次肯定性选择。"
- **Behaviour:** Shown in Settings → Sharing beside the three modes.

**I2 — `legal.notice.settings.legalLinks`**
- **Placement:** Settings → About / Legal, as the section intro above links to the A-class documents.
- **EN:** "Terms of Service, Privacy Policy, Contributor Agreement, Trademark Policy and Third-Party Notices apply to Vaenyx. Questions: hello@vaenyx.ai. (Email is handled on overseas servers — include only what's needed.)"
- **ZH:** "Vaenyx 适用《服务条款》《隐私政策》《贡献者协议》《商标政策》与《第三方声明》。如有疑问:hello@vaenyx.ai。(邮件在海外服务器上处理——请只写必要信息。)"
- **Behaviour:** Persistent. Link labels must match the A-class documents' formal titles exactly (clause 6.5).

**I3 — `legal.notice.methodToken.feedback`**
- **Placement:** The `sendFeedback` toggle on a Method Token's settings, shown beside the toggle and each time the user turns it on, above the confirm action. The toggle's default state in the shipping build (currently on for newly issued tokens) must be stated honestly beside it per clause 3.6.
- **EN:** "This allows the app holding this token to send corrections into My Library on this device. Corrections stay on this device; a correction can only become a shared community example after it is de-identified and you explicitly approve it — corrections from apps are never shared automatically, whatever your Sharing setting."
- **ZH:** "开启后,持有此 Token 的应用可以把修正写入本设备上的 My Library。修正只保留在本设备;任何修正要成为社区共享示例,都必须先经脱敏处理并获得你的明确批准——来自应用的修正绝不会自动分享,无论你的 Sharing 设置如何。"
- **Behaviour:** Point-of-action (each enable) and on-demand beside the toggle. The locality statement is scoped and true by design — the feedback endpoint only ingests into the local store. External-app corrections carry an **unconditional Owner-approval gate** (locked 2026-07-05, independent review): regardless of the Settings sharing mode — including Automatic — a correction that arrived through a Method Token is queued for the Owner's explicit approval after de-identification and never auto-shares. The "never shared automatically" claim is origin-based (the token channel is deterministic), so it is a structural gate statement permitted by clause 3.7, not a detector-dependent category claim (clauses 3.2, 3.7).

---

### Part J — The Legal Settings Page

*This page is a plain-language summary of the legal position, shown above the links
to the documents themselves. It was written before the document set existed and was
never brought into this pack, so it drifted: at copy version 2.6 it still called the
documents "placeholders … coming", described **Merit** as though it existed, and named
**Tailscale** as the remote-access provider. Both product facts belong in the Schedule
and the Third-Party Notices, not in a legal summary. These strings are now part of this
pack and are covered by `audit-copy.mjs`.*

**J1 — `settings.legal.copy`** *(intro line under the "Legal" heading)*
- **EN:** "The short notes below summarise the legal position in plain language. The documents linked at the bottom of this page are the ones that actually govern, and the Schedule states what this release actually does."
- **ZH:** "下面几行用大白话概括法律要点。真正具有约束力的是本页底部链接的文件;本次发布实际做了什么,以明细表所载为准。"
- **Behaviour:** Persistent. Must not describe itself as a placeholder: the documents are final and are linked on this page.

**J2 — `settings.legal.docsPending`** — **retire this string.** It reads "Terms of Service · Privacy Policy · Contributor Agreement — coming". They are not coming; they are shipped and linked. Delete the key rather than reword it, so nothing can render it again.

**J3 — `disclaimer.merit`** — **must not render.** Merit is `not-built` in the Schedule, and Terms of Service clause 9.1 states it is not provided at the Effective Date. A summary line describing how Merit works implies it exists. Remove the line from the page; keep the string in this pack for the day the Schedule marks Merit active.
- **EN (held, do not render):** "Merit is a reputation record — no cash value, can't be bought, sold, or exchanged; not a currency or security."
- **ZH (held, do not render):** "Merit 是信誉记录,无现金价值、不可买卖 / 兑换,不是货币、证券或理财产品。"

**J4 — `disclaimer.remote`**
- **EN:** "Remote access is optional and runs through a third-party service using your own account with that provider, under their terms. Third-Party Notices names the provider used by this version."
- **ZH:** "远程访问是可选的,通过第三方服务实现,用你自己在该服务商的账号登录,受其条款约束。本版本使用哪一家,见《第三方声明》。"
- **Behaviour:** Persistent. Naming the provider here would put a changeable vendor fact into the legal layer; the Schedule and Third-Party Notices carry it instead.

**J5 — `disclaimer.model`** *(unchanged in substance; examples are appropriate at a point of use)*
- **EN:** "Connecting a cloud model (e.g. OpenAI, Gemini) follows that provider's terms and any costs are yours. A local model (e.g. Ollama) runs on your own machine."
- **ZH:** "连接云模型(如 OpenAI / Gemini)受其条款约束、费用由你承担;本地模型(如 Ollama)在你自己机器上运行。"

**J6 — `disclaimer.community`, `disclaimer.ai`, `disclaimer.health`, `disclaimer.finance`, `disclaimer.legal`** — already accurate; listed here so the audit covers them.

### Part K — The sharing window *(drafted; nothing here ships until the upload channel exists)*

*Status.* The local half is live: a correction returned by an app becomes a local
example, capped, deletable, outside the content hash. The upload half — how an
example reaches the Method's publisher — is **not built**. This Part is the
wording agreed in advance so the code is written against settled copy rather than
the other way round. Until the Schedule marks the capability active, none of
these strings may render.

**K0 — the principle, and why it holds**

**Automatic to a person, never automatic to the public.**

Sending an example to the Method's publisher shows it to one identified person
and can be undone — the item can be withdrawn, the publisher can be required to
delete it. Putting it in the Community makes it permanent in git history, forks
and mirrors, where nobody can undo anything. The first can be automatic. The
second is always a deliberate act, which is what publishing is.

It follows that **a publisher's own examples do not reach the Community
automatically either** — that would be automatic publication, which is the thing
this rule exists to prevent.

**K1 — the window is a control, not the consent**

This distinction decides whether the design is lawful, so it is stated here
rather than assumed.

Core Privacy Policy clause 7.2 requires consent to be voluntary, informed,
current and specific, with no option pre-selected. **Silence cannot be consent.**
So the 48-hour window is **not** where consent is given. Consent is given once,
at activation, on a surface that describes the whole mechanism: what is sent, to
whom, when, how to stop an item, and that the sensitive categories are always
asked separately. The window is a **safety control exercised under that consent**
— the user's opportunity to catch what the filter missed.

Written that way, "no action means it sends" is the operation of a control, not
an inference of agreement from silence. Written the other way it is neither.

**K2 — where the consent is taken**

**Not by rewriting A3.** A3 today is deliberately *not* a consent: at copy
version 2.6 it left the consent class and became a local interest preference,
because consenting to a capability that does not exist is consenting to nothing.
Rewriting A3 later would reinterpret a click someone made months earlier as
agreement to a mechanism that did not then exist — which Terms of Service clause
7.4 and clause 18.1A forbid in terms.

**A new surface, shown at activation.** This is not a preference; it is our own
Terms requiring it: sharing "stays off until the Schedule marks it active, the
then-current Point-of-Use Notice is shown, and a fresh affirmative choice is
recorded".

**A note on the "one click, then never again" requirement.** That is achievable,
but the click is at **activation**, not at first install of today's version — the
capability does not exist yet, so there is nothing to consent to today. After
that click, the ordinary path is zero interaction.

**K3 — `legal.consent.flywheel.activate`** *(the activation consent; replaces nothing, adds a surface)*

- **EN:** "Corrections you receive can help the person who made this Method improve it. If you turn this on: an example is prepared on this computer, personal details are stripped here before anything leaves, and it waits 48 hours before it is sent to that Method's publisher. During those 48 hours you can remove any of them, and you can turn this off at any time. Health, family and finance content is never sent this way — we ask you separately, every time. Stripping personal details is an automated process and it is not perfect, which is why the 48 hours exist. What is sent goes to the publisher, not to the public: it becomes public only if they choose to include it when they publish. Your contributions carry a **contributor ID** — a permanent code that credits you without naming you. Your name is never attached. The ID is public wherever the example is, cannot be changed, and cannot be recalled from copies made by others; it does not identify you to anyone but us."
- **ZH:** "你收到的纠正,可以帮助制作这个 Method 的人把它改得更好。若你开启:例子在这台电脑上准备好,个人信息在离开本机之前就在本地剥除,然后等待 48 小时才发送给该 Method 的发布者。这 48 小时内你可以撤掉任意一条,也可以随时整个关掉。健康、家庭与财务类内容绝不会经此发送 —— 每一次我们都会单独问你。剥除个人信息是自动化处理,并不完美,48 小时的等待正是为此而设。发出去的内容是给发布者的,不是给公众的:只有当他们在发布时选择收录,它才会公开。你的贡献会带一个**贡献者 ID** —— 一串永久的编号,用来为你记功,但不写出你的名字。你的姓名绝不会被附上。该 ID 在例子出现的任何地方都是公开的,不可更改,也无法从他人所做的副本中收回;除我们之外,它不向任何人指明你是谁。"
- **Behaviour:** Consent class. Shown at activation, never at install of a version without the capability. No option pre-selected; declining as easy as accepting. Records key name, copy version, language, profile and time.

**K4 — no digest, no reminder, no weekly prompt** *(decided 2026-07-26)*

The window is an **undo**, not a review queue. A weekly "8 examples are ready"
prompt turns a safety control into a to-do list, and a to-do list that arrives
every week is a nag people learn to dismiss — which is worse than not having it,
because a dismissed prompt looks like attention was paid.

So: the queue is **visible in the app to anyone who looks for it, and pushed at
nobody**. Default is send. Ordinary interaction count is zero, which is the point.

**K5 — `legal.notice.flywheel.item`** *(on each queued example)*

- **EN:** "Sends in {time}. Remove it if it still contains anything private — the automated check is not perfect."
- **ZH:** "{time} 后发送。若其中仍有私密内容,请撤掉它 —— 自动检查并不完美。"

**K6 — `legal.notice.flywheel.remove`** *(the control)*

- **EN:** "Don't send this one" — **ZH:** 「不要发送这一条」

**K7 — what the receiving publisher is bound to**

An example sent to a publisher may still contain personal information the filter
missed — that is the premise of the window. So the publisher must be bound
before receiving it, and the Contributor Agreement is where that binding lives:
an example received this way may be used to improve that Method and for nothing
else; it must not be republished, disclosed or retained beyond that purpose; and
it must be deleted on request.

**This is the answer to a problem the design does not otherwise solve.** A
publisher may be anywhere in the world, so an automatic send is potentially an
overseas disclosure by us. A consent under APP 8.2(b) must identify the same
recipient, and "whoever published the Method" does not. Binding the publisher
contractually is what makes this reasonable steps under APP 8.1 instead —
combined with on-device stripping, which reduces the exposure without being
claimed to eliminate it.

**Attribution — resolved 2026-07-26: a pseudonymous contributor ID.**

Merit needs to know who contributed; nobody who fixed an answer signed up to be
publicly named. A permanent opaque **contributor ID** satisfies both: it credits
the person, and it identifies them to us and to no one else.

What that means legally, stated plainly because it is easy to get wrong: the ID
is **pseudonymous to the public and personal information to us** — we hold the
mapping to the account, so we treat it as personal information, exactly as the
ban ledger already treats a hashed provider identity (Core Privacy Policy 2.6
states this rule).

Four conditions, without which the pseudonymity does not hold:

1. **The ID is permanent and cannot be reset.** Resetting it would break the
   Merit history that is its whole purpose. So it travels into the public
   repository, forks and mirrors and cannot be recalled — which K3 has to say,
   and does.
2. **The contributor ID and the publisher byline are separate identifiers.** A
   publisher's byline is a self-chosen display name that may be their real name.
   If the two were the same value, or trivially linkable in public data, the ID
   would be a real name with extra steps.
3. **The pseudonym only holds while the content is clean.** An example that still
   contains "my daughter's teacher at St X" identifies the person behind the ID —
   and does so **retrospectively**, for every other contribution carrying that
   ID. This is the strongest argument for keeping the window: the ID lowers the
   default exposure, it does not remove the need to catch a leak.
4. **Merit counts adopted examples, not submitted ones**, and adoption is the
   publisher's decision. Counting submissions would pay people to generate them.

Because the ID names nobody, publishing it is a much smaller act than publishing
a name, and it rides on the activation consent in K3 rather than needing a
separate click. That is what keeps the ordinary path at zero interaction.

**CC BY consequence:** with an ID attached, the attribution condition now has
something to operate on — downstream reuse must retain the contributor ID. Earlier
drafts said shared examples supplied no creator identification and that CC BY's
attribution condition therefore had nothing to operate on. That reasoning is
superseded and must not be reintroduced.

**K8 — G1 when examples can be attached**

G1 currently reads "No local examples or raw corrections are included in the
current publish submission." That sentence is true today and must change on the
day it stops being true — not before. The replacement must state, in the publish
flow: which examples are included, that they become public with the item and are
permanent in copies beyond our reach, and — if attribution is adopted — that each
example carries its contributor's byline, publicly and permanently. It must also
show the exact material proposed for publication before the publisher confirms,
which Terms of Service clause 8.6(b) already requires.

### Part L — Importing a Skill, exporting a Method *(drafted; nothing here ships until the importer exists)*

*Status.* Not built. This Part settles the wording first, because the risk here is
not the capability gap — it is what we say about it, and what a user unknowingly
does with someone else's work.

**L0 — the two problems, in order of seriousness**

**The second problem is the serious one.** The obvious problem is capability: a
Skill may ship executable code, a Method may not (a recipe is text fed to the
model; nothing author-supplied executes). So an import keeps the instructions and
drops the code, and the result can be less capable than the original.

The problem that actually creates liability is different: **a Skill is someone
else's copyrighted work, under its own licence.** Converting it into a Method does
not make it the importer's work. Our publish warranties require a contributor to
own their Contribution or hold the rights to license it — and a person who
imported a Skill, edited it, and pressed Publish may sincerely believe they wrote
it. The warranty is then breached honestly, which helps nobody: the third party's
claim is against us as well as them.

So two notices are needed, at two different moments: **at import**, that this is
someone else's work under its own licence; and **at publish**, that this
particular Method came from an import.

**Technical consequence:** an imported Method must carry its provenance — where
it came from, and the licence it arrived under — so the publish gate can fire. A
notice that depends on the person remembering is not a gate.

**L1 — `legal.notice.skill.import`** *(shown before an import completes)*

- **EN:** "This Skill was written by someone else and stays under its own licence — importing it does not make it yours. Vaenyx keeps the instructions and drops anything that runs as code, because published content here is instructions only, never programs. Steps that depended on that code will not work, and we list them below rather than leave you to discover it. Check the original licence before you rely on this or share it."
- **ZH:** "这个 Skill 是别人写的,并且仍受它自己的许可证约束 —— 导入它不会让它变成你的。Vaenyx 会保留其中的指令,并丢弃任何以代码形式运行的部分,因为这里发布的内容只能是指令,绝不是程序。依赖那些代码的步骤将无法工作,我们会在下面列出来,而不是留给你自己去发现。在依赖它或分享它之前,请先查看原始许可证。"
- **Behaviour:** Gated acknowledgement before the import completes. **Must list the
  dropped steps specifically** — "some features may not work" is not this notice.
  Records the source and the licence string against the imported Method.

**L2 — `legal.notice.skill.importedPublish`** *(shown at publish, only for a Method carrying import provenance)*

- **EN:** "This Method was imported from someone else's Skill. Publishing it here licenses it to the public under CC BY 4.0 and confirms you hold the rights to do that. You may not hold them: the original licence may forbid redistribution, may require attribution you have not given, or may not permit relicensing at all. Check it before you publish. If you are not sure, don't."
- **ZH:** "这个 Method 是从别人的 Skill 导入的。在此发布会依 CC BY 4.0 将它许可给公众,并同时确认你拥有这样做的权利。你可能并不拥有:原始许可证可能禁止再分发、可能要求你尚未给出的署名,或者根本不允许再许可。发布前请先查清。如果不确定,就不要发布。"
- **Behaviour:** Gated acknowledgement, shown **in addition to** the ordinary publish
  confirmations, never instead of them. Fires on provenance, not on the person's
  memory.

**L3 — `legal.notice.skill.export`** *(exporting a Method as a Skill)*

This direction is clean: a Method is instructions already, so nothing is lost and
no capability is implied that does not exist.

- **EN:** "Exported as instructions, which is all a Method ever was — nothing is lost. Whoever receives it is bound by the licence the Method carries, not by anything in Vaenyx."
- **ZH:** "以指令形式导出 —— Method 本来就只是指令,不会有任何损失。收到它的人受该 Method 自带的许可证约束,而不受 Vaenyx 中的任何条款约束。"

**L4 — what must never be said about interoperability**

Terms of Service clause 11.5 states that statements of factual interoperability
with open standards such as Agent Skills are descriptive only. That protects us
**only while we do not overstate it.** So:

- ✗ "Skill compatible", "runs Skills", "works with Skills"
- ✗ any wording implying an imported Skill behaves as it did in its original host
- ✓ "imports the instructions from a Skill"
- ✓ a specific list of what was dropped

**Silently degrading an import while advertising compatibility is misleading
conduct** — and unlike most of what this pack guards against, it would be our own
statement about our own product, which is the least defensible kind.

**L5 — the dropped-item labels** *(four keys, one block each below)*

These four are not labels. **They are the specific list L1 requires**, and L1 says
in terms that "some features may not work" does not discharge it. The wording is
the whole notice: it decides whether a person understands what they just lost.

Each label must appear **against the specific thing found** — the file name, the
step — not as a category heading with a count. "3 x A file that would have run"
tells a person nothing about what their Skill did.

**L5a — `skill.drop.executable`**
- **EN:** "A file that would have run"
- **ZH:** "一个会运行的文件"

**L5b — `skill.drop.runs-a-script`**
- **EN:** "A step that ran one of those files"
- **ZH:** "一个会去运行那些文件的步骤"

**L5c — `skill.drop.local-file`**
- **EN:** "A step that used a file on the other machine"
- **ZH:** "一个用到对方机器上文件的步骤"

**L5d — `skill.drop.external-tool`**
- **EN:** "A step that ran an outside tool"
- **ZH:** "一个会调用外部工具的步骤"

**L6 — `skill.import.copy`** *(the line under the paste box)*

Coding filed this as an operation label. It is not: it promises that we will tell
you **exactly** what could not come across, and exactness is not something the
parser can deliver. It finds four kinds of thing. A Skill may lose something else
— a bundled resource, a reference to a service, an assumption about its host —
and then "exactly" is a false statement about our own product, which is the least
defensible kind.

- **EN:** "Paste a SKILL.md here. Vaenyx keeps its instructions as a new Method and lists what could not come across. The list covers the kinds of thing we can detect; a Skill can depend on something we cannot see, so treat the result as a starting point rather than a finished copy."
- **ZH:** "把 SKILL.md 的内容贴进来。Vaenyx 会把其中的指令保留成一个新的 Method,并列出哪些东西没能带过来。该清单涵盖我们能够识别的种类;一个 Skill 也可能依赖我们看不见的东西,所以请把结果当作起点,而不是一份完成的副本。"

**L7 — `skill.import.nothingLost`** *(shown when the parser finds nothing to drop)*

Same problem, sharper. "Nothing had to be dropped" is a clean bill of health we
cannot issue — it means "nothing we look for was present", which is a different
statement and the only one that is true.

- **EN:** "Nothing we check for was dropped. That is not the same as nothing being lost: a Skill can rely on things we cannot detect from the file alone."
- **ZH:** "我们所检查的项目中,没有任何内容被丢弃。这与「没有任何损失」不是一回事:一个 Skill 可能依赖我们仅凭文件无法察觉的东西。"

**Not in this pack, and correctly so:** `skill.import.title`, `.source`,
`.paste`, `.look`, `.confirm` and `skill.export.action`. They are verbs and
field labels; nothing turns on their wording.

## 5. Placement Summary Matrix

| Key (root) | Surface | Behaviour |
|---|---|---|
| `legal.disclaimer.aiGeneral.firstRun` | First-run welcome | One-time |
| `legal.notice.firstRun.terms` | First-run, ToS/Privacy links | Gated |
| `legal.notice.flywheel.preference.*` (card) | First-run, beside ToS | Local preference only — not a consent, not recorded server-side, neither option pre-selected or recommended |
| `legal.disclaimer.aiGeneral.composer` | Composer footer | Persistent |
| `legal.notice.modelPicker` | Per-chat provider picker | On-demand |
| `legal.notice.project.autoSummary` | Project instructions panel (auto summary) | Persistent |
| `legal.disclaimer.health.banner` | Health-flagged content | Persistent |
| `legal.disclaimer.health.reminderReliability` | Medication-reminder setup and views | Persistent |
| `legal.disclaimer.health.gate*` | Before health content first used | Gated, one-time per profile (**required**) |
| `legal.disclaimer.finance` / `.tax` / `.legal` | Domain features | Persistent |
| `legal.disclaimer.community.browse` / `.install` | Library browse / install | Persistent + point-of-action |
| `legal.disclaimer.community.verifiedMeaning` / `.verifiedShort` | "Verified" label (short line wherever the badge renders, incl. install dialog) | On-demand + persistent with badge |
| `legal.notice.community.report` | Community item detail page | On-demand |
| `legal.notice.community.discord` | Discord link surfaces | On-demand |
| `legal.disclaimer.merit`, `.merit.creatorPage` | Merit / creator UI (when Merit display ships) | Persistent |
| `legal.notice.modelConnect.cloud` / `.local` (loopback), `.local.lan`, `.local.unverified` | Backend connect screens | Point-of-action |
| `legal.notice.remoteAccess.enable` / `.status` | Remote-access enable / Settings | Gated one-time / Persistent |
| `legal.notice.publish`, `.publish.contributorTerms`, `.publish.signIn` | Publish flow | Point-of-action + gated (G2 also recorded server-side) |
| `legal.consent.publish.overseas` | Publish sign-in step (G3a, gates the sign-in buttons) | Gated, one-time per account, never pre-selected (recorded server-side) |
| `legal.consent.publish.warranty` | Publish dialog warranty checkbox (G2a) | Gated, every publish, never pre-selected (recorded server-side) |
| `legal.consent.flywheel.sensitiveAsk` | Sensitive share attempt | Gated, every time |
| `legal.notice.backup`, `.backup.cloudSync`, `.restore` | Backup / restore pages | Persistent + point-of-action |
| `legal.consent.flywheel.settingsNote` | Settings → Sharing | Persistent |
| `legal.notice.settings.legalLinks` | Settings → About / Legal | Persistent |
| `legal.notice.methodToken.feedback` | Method Token `sendFeedback` toggle | Point-of-action + on-demand |

## 6. Implementation Rules

6.1 **Strings are law-adjacent.** These strings ship in the i18n resource files under the keys above. Engineering must not paraphrase, truncate or restyle the substance; visual styling (size, colour, placement within the stated surface) is free within the behaviour constraints.

6.2 **Gates must actually gate.** Where the behaviour is "gated acknowledgement", the underlying feature or action must be technically disabled until the affirmative record exists. A displayed-but-bypassable gate is worse than none.

6.3 **Both languages, always.** Every string ships in EN and ZH together; a key present in one language file and missing in the other is a release blocker.

6.4 **Version discipline — two versions, and only one of them interrupts anyone.**

  **Copy version (`legal.copyVersion`)** — the editorial version. It moves whenever any string changes, including a typo fix or a reworded explanation, and it is what gets recorded against an acknowledgement, so a record always says exactly which text the person was shown. Moving it interrupts nobody.

  **Consent floor (`LEGAL_CONSENT_FLOOR` in the app, `MIN_ACCEPTED_COPY_VERSION` in the publish service)** — the version at or above which a recorded acknowledgement still counts. It moves **only** when a `legal.consent.*` string changes in substance, and it is the only thing that re-asks anyone. Re-asking for something already agreed to is how consent decays into a reflex click, so the floor moves rarely and deliberately.

  **The last substantive consent change was 2.6** (A3 left the consent class; G3a gained the consent-currency sentence). This clause, not a code comment, is the authoritative record of that.

  Any change to a string's substance bumps `legal.copyVersion`. For **`consent`-class strings** (G4, G2a, G3a and G2's acceptance line — **A3 is not one**, see A3), any substantive change **automatically re-triggers** the gate or consent — no materiality judgment applies, because a consent recorded against one wording must never be silently carried forward to different wording on the operator's own say-so. For `notice`- and `disclaimer`-class gated items, the gate re-triggers where the change is material (material = the change could reasonably alter the user's choice; the operator decides and records the reason). Recorded acknowledgements always store the version they were given against.

6.5 **Terminology.** The pack standardises on **"de-identified"** (脱敏). "Anonymized" must not appear in any string or formal document (the A-class set uses "de-identified" throughout). Document names in UI strings and link labels must match the A-class documents' formal titles exactly — the Terms of Service & End User Licence Agreement states in its opening paragraph that it may be referred to as the **"Terms of Service"** (《服务条款》), which is the label A2/I2 use; the contributor document is the **"Contributor Agreement"** (《贡献者协议》) everywhere; "Contributor Terms" must not be used. Product labels follow clause 2.7 ("Library" / "My Library").

6.6 **No coverage creep.** These strings describe the current product only. Phase-two remote access (operator-run NetBird) is intentionally not covered and will require its own notices when it arrives. Discord is covered only by D5, which separates the platform from the server: no string may suggest the operator operates or moderates the Discord *platform*, and no string may deny that the operator runs the official server — D5 acknowledges it, and posts in that server carry the D4 report/takedown discipline (D5 behaviour note).

6.7 **Feature-existence statements ship with the feature.** Any sentence asserting that a capability exists (currently: H1's optional-encryption sentence; G2's sentence "Your acceptance is recorded against your publisher account" — which must not render, and the publish surface must not open, until the publish service's acceptance-record table exists per Note 7.8; B3's sentence "Nothing enters Vaenyx Me without your approval" — which must not render until the Vaenyx Me approval gate is structurally verified, i.e. no code path writes to Vaenyx Me without an approval record; and G3a's overseas consent — the publish sign-in surface must not open until it ships and is recorded per clause 2.3, per Core Privacy Policy clauses 8.4 to 8.6 and Note 7.9) must be conditionally rendered or omitted until that capability is actually present in the shipping build. Shipping the sentence without the feature is a misrepresentation. The same discipline applies to surfaces that do not yet exist (install-time wizard, Merit display, per-chat tier picker): their strings ship when the surface ships.
