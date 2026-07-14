# Vaenyx — In-App Contextual Disclaimers (Copy Pack)

> **FINAL v2.2 (2026-07-07) — In-App Contextual Disclaimers (Copy Pack).** v2.2 incorporates the second independent legal review round of 2026-07-07. v2.1 incorporates the independent legal review round of 2026-07-05 (flywheel sharing consent re-cut as an install-time forced choice; G3a rewritten per-flow with the APP 8.1 effect stated accurately; I3 locked to never-auto-share; C2 retitled; overseas email-handling notices added to the report strings; publication gate added to the Notes section). Prepared by Claude (an AI) in the style of senior Australian technology counsel, and adopted as part of the operative Vaenyx legal set under the operator's recorded lean-legal decision (DECISIONS.md, 2026-07-05). It is not legal advice. A one-time professional review of the Contributor Agreement and publishing terms remains recommended before community publishing opens. Three placeholders ([OPERATOR ENTITY], [STATE], [EFFECTIVE DATE]) resolve mechanically at incorporation/launch, as noted beneath the table below. v2.0 finalises the pack: contact filled (hello@vaenyx.ai), health acknowledgement gate made **required**, publish sign-in updated to Google or GitHub via the operator's publish service, CC BY 4.0 and acceptance recording disclosed in the publish flow, Library / My Library naming bridge added, Discord community notice added, and the notes section trimmed to genuinely open items. A pre-final legal/truth audit (2026-07-05) is folded in: publish-flow de-identification locked to on-device (Part G note / G1), the removal remedy restated as Library takedown rather than erasure (A3/I1/clause 3.7), sensitive-gate and health coverage wording made detector-honest (A3/G4/I1/Part C), ZH strings re-audited as originals (new clause 3.8), the publish-time warranty confirmation added (G2a), local-backend wording made verification-conditional (F2), and byline-permanence and overseas-storage disclosures added (G3). A second audit (2026-07-05, legal + truth lenses) is also folded in: sensitive-category scope pinned to the wide "family" definition with A-class alignment recorded as a flywheel release condition (clause 3.5 / Note 7.12), the APP 8.2(b) overseas-consent string drafted (G3a), I3 made mode-honest, F2 split into loopback / LAN / unverified variants, the multi-user sharing disclosure and auto-downgrade added (A3 / I1 / Note 7.11), the permanence parenthetical extended in A3/I1, the A-class "safety checks" conflict recorded (Note 7.10), D5 reworded platform-vs-server with the D4 discipline extended to the official server, G1 paired with the report remedy, B3's approval-gate sentence added to clause 6.7, G3 accuracy corrections, the G2a label extended to the full warranty certification, and the C2 health gate made per-profile.

| Field | Value |
|---|---|
| Operator | [OPERATOR ENTITY] |
| Governing law | [STATE], Australia |
| Contact | hello@vaenyx.ai |
| Effective | [EFFECTIVE DATE] |
| Copy pack version | `legal.copyVersion = "2.2"` |

Placeholder resolution (the only three permitted across the legal set):
- **[OPERATOR ENTITY]** — resolves to the dedicated Australian proprietary limited company (decided 2026-07-03), to be incorporated before external launch; until incorporation the project is operated by its individual proprietor.
- **[STATE]** — resolves to that company's state or territory of registration.
- **[EFFECTIVE DATE]** — set when the install-time acceptance flow ships; the ToS additionally requires the health acknowledgement gate (C2) to be live, and the Privacy Policy its clause 21.3 verification, before their own [EFFECTIVE DATE] is set.

---

## 1. Purpose and Scope

1.1 This document is the **B-class layer** of the Vaenyx legal framework: the short, point-of-use notices, disclaimers and consent strings that appear **inside the app at the moment of use**. The long-form documents they link to (Terms of Service, Privacy Policy, Contributor Agreement, Trademark Policy, Third-Party Notices) live in `docs/legal/` and remain the A-class layer. The placement map in `docs/legal-and-disclaimers.md` is superseded, for implementation purposes, by this pack.

1.2 This pack is **ready-to-implement copy**: every string is final wording, bilingual (English + Chinese), keyed for i18n, and annotated with placement and behaviour. Engineering should implement these strings verbatim; any substantive change must be made deliberately under the drafting principles in section 3, must bump the copy pack version (clause 6.4), and must update the EN/ZH pair together.

1.3 Nothing in this pack excludes, restricts or modifies any consumer guarantee, right or remedy under the **Australian Consumer Law (ACL)** or any other law that cannot lawfully be excluded. These strings **inform**; they do not operate as liability exclusions. The formal limitation and ACL carve-out language lives in the Terms of Service (sections 13–15) and prevails over anything here.

## 2. Definitions and Conventions

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

**Flywheel evidence records (A3, and each accepted example upload).** The flywheel sharing choice (A3) is also part of the **server-side** evidence mechanism, not a local-only record. Flywheel sharing needs no account, so this evidence is not held against a publishing account; instead, each accepted example upload records **server-side**, against a pseudonymous random instance identifier (not against a person or a publishing account): the **content hash**; the **accepted ToS version**; the **accepted sharing-copy version** (the A3 `legal.copyVersion`); a **choice / grant-event id**; a **timestamp**; the **pseudonymous random instance id**; the **sharing mode** (Automatic / Review Each / Off) in force; the **sensitive-confirmation flag** (whether a G4 sensitive-ask confirmation was given); and whether the upload came via **automatic, review-each, or sensitive-confirmation**. This is what evidences the CC BY 4.0 licence and the affirmative-choice grant for shared patterns — the A3 local record is the device-side leg, not the only evidence. These evidence fields are not directly identifying, are not derived from personal information or device characteristics, and are used only to evidence the licence/consent and to investigate abuse (see Note 7.8 and Privacy Policy §8.3 on their retention and the limits of "non-identifying").

2.4 **"Vaenyx" in UI strings** is the product name and, where a legal person is implied (e.g. "not endorsed by Vaenyx"), refers to [OPERATOR ENTITY] as defined in the Terms of Service. UI strings deliberately use the product name for readability; the ToS carries the formal identification.

2.5 **Bilingual pairing.** The app ships with a live English/Chinese language switch; each string below is an EN/ZH pair and only the active language's string is rendered. The ZH strings are natural working translations, not word-for-word renderings; as between the two languages, the **English version prevails** to the extent of any inconsistency, consistent with the express prevalence clauses in the ToS (clause 19.8), Privacy Policy (clause 21.2), Contributor Agreement (clause 16.7) and Trademark Policy (clause 15.5).

2.6 **Length discipline.** Persistent footers should stay under ~60 characters (EN); banners under ~140; dialog bodies under ~450. The strings below respect these budgets; do not pad them during implementation.

2.7 **Naming bridge** *(labels updated 2026-07-14 to the shipped UI — a bridge-accuracy edit, not a string change; `legal.copyVersion` stays "2.2")*. The legal documents use the defined term **"Community Library"** for the public catalogue; the product UI labels it **"Community"**, and labels the user's private on-device store the **"Library"** (its GitHub warehouse repository is `vaenyxai/community`). Strings in this pack that predate the relabel may still say "Library" for the catalogue or "My Library" for the on-device store (e.g. I3); they are updated at the pack's next string revision under clause 6.4, not silently.

## 3. Drafting Principles (Binding on Future Edits)

3.1 **Honest, plain, non-scary.** Strings state the risk or fact once, in plain words, without alarmist framing and without hedging away the point.

3.2 **No absolute locality claims.** Because the model backend is pluggable and a cloud provider may receive chat content, no string may ever claim that "nothing leaves your device" or equivalent. Scoped locality statements (e.g. that a *specific* function runs locally) are permitted only where that is true by design.

3.3 **Merit is never money.** Every Merit-related string must preserve the non-monetary characterisation: no cash value; cannot be bought, sold, transferred or redeemed; not a currency, security or financial product. This position is permanent: no spend, perk or exchange path will ever be added.

3.4 **Free product.** No string may reference Vaenyx payments, billing or pricing (none exist). Third-party fees (e.g. a cloud model provider's charges) may and must be flagged as the user's own cost.

3.5 **18+ / general audience.** No string is directed at, or makes statements about, children as users. The sensitive-data category covering family-related content is labelled "family" in the UI (clause 4.G4 note) and is deliberately **wide**: it covers all family-related content, child-related content included — not only the child-related subset — and the sensitive-category recogniser must be built to that full width (Note 7.12). It describes data content, not users, preserving the 18+ posture.

3.6 **Defaults and choices stated honestly.** Flywheel sharing has **no default**: it is an install-time forced choice (A3) and nothing is shared until the user chooses. Where a setting genuinely defaults on (the Method Token `sendFeedback` bit), the copy or its immediate surface says so plainly and offers the off switch in the same breath. No dark patterns: where a choice is recorded as consent, no option is pre-selected; a recommended option may be visually highlighted but never pre-ticked; the decline action is one tap and never guilt-worded.

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
- **Behaviour:** Gated acknowledgement (the continue tap is the acceptance event and is recorded). The Privacy Policy is a notice, not a contract; the string deliberately says "acknowledge", not "agree to", to avoid bundled consent. The [EFFECTIVE DATE] of the ToS and Privacy Policy is set no earlier than when this flow ships (the ToS also requires the C2 health gate to be live, and the Privacy Policy its clause 21.3 verification).

**A3 — Flywheel sharing consent card (shown beside A2, same screen, per the 2026-07-05 forced-choice decision, revising 2026-06-23: an explicit sharing choice must be made before the wizard proceeds and nothing is shared until it is made; no option is pre-selected — "Keep Sharing On (Recommended)" may be visually highlighted but is never pre-ticked)**

`legal.consent.flywheel.title`
- **EN:** "Help Improve Shared Methods"
- **ZH:** "帮助改进共享 Method"

`legal.consent.flywheel.body`
- **EN:** "When Vaenyx learns a better way to do something, it can share the improvement pattern with the community. Patterns are stripped of your data, names and amounts before sharing, and are published without your name under the CC BY 4.0 licence. If you ever spot something personal in shared content, report it and Vaenyx will remove it from the Library (copies already downloaded, and traces in the library's public history, forks and mirrors, may persist). Nothing is shared until you choose here — pick an option to continue; you can change your choice anytime in Settings."
- **ZH:** "当 Vaenyx 学到更好的做法时,可以把改进模式分享给社区。模式在分享前会先去除你的数据、姓名与金额,并以 CC BY 4.0 许可、不带你的姓名发布。如果你在共享内容中发现个人信息,可以举报,Vaenyx 会将其从 Library 中移除(他人已下载的副本,以及公共库历史、fork 与镜像中的痕迹,可能仍会保留)。在你做出选择前,不会分享任何内容——请选择一项以继续;之后可随时在 Settings 中更改。"

`legal.consent.flywheel.accept` (button; may carry the recommended-option visual highlight, never pre-ticked)
- **EN:** "Keep Sharing On (Recommended)"
- **ZH:** "保持开启(推荐)"

`legal.consent.flywheel.decline` (button, one tap, equally accessible, never guilt-worded)
- **EN:** "Don't Share"
- **ZH:** "不分享"

`legal.consent.flywheel.sensitiveNote` (small print under the buttons)
- **EN:** "Anything Vaenyx recognises as sensitive (health, family, finance) is never shared automatically — it always asks you first."
- **ZH:** "凡被 Vaenyx 识别为敏感(健康、家庭、财务)的内容,绝不会自动分享——一定会先询问你。"

`legal.consent.flywheel.multiUserNote` (small print under the buttons, with sensitiveNote)
- **EN:** "Automatic sharing is for improvements from your own use. If someone else uses this Vaenyx, use Review Each or Off unless they've agreed and you can confirm you hold the rights to share that example."
- **ZH:** "自动分享仅针对你自己使用所产生的改进。若他人也使用这台 Vaenyx,请改用 Review Each 或 Off,除非对方已同意、且你能确认自己拥有分享该示例所需的权利。"

- **Behaviour (whole card):** Gated acknowledgement — a **forced choice**: the wizard does not proceed, and nothing is shared, until one of the two buttons is tapped; **no option is pre-selected, pre-ticked or focused** — the accept button may carry its "(Recommended)" visual highlight, but the recorded choice is always the user's actual tap; the choice, copy version, rendered language and timestamp are recorded; changeable anytime at Settings → Sharing (see I1). Declining is one equally accessible tap and must not trigger any further prompt. Shared patterns carry the same CC BY 4.0 public licence and direct licence as published content (ToS clause 7.4; Contributor Agreement clause 5); the body sentence above discloses that mechanic at the consent surface, and **making the affirmative sharing choice is itself the grant event for those licences** (ToS clause 7.4(d)) — a materially stronger evidentiary footing than the superseded default-ON model. Because flywheel sharing needs no account, the grant is evidenced by the local record of that affirmative choice **together with the server-side evidence record written for each accepted upload** — content hash, accepted ToS version, accepted sharing-copy version, grant-event id, timestamp, pseudonymous instance id, sharing mode, sensitive-confirmation flag and upload path — against a pseudonymous random instance id, not a person (clause 2.3; Note 7.8); patterns are published unattributed — the ToS clause 7.4 grant expressly covers unattributed publication and includes a conforming moral-rights consent (see Note 7.11). **Multi-user limb:** automatic sharing is scoped to the accepting Owner's own use. On a shared instance the sharing mode is **forced to Review Each or Off** for any profile whose per-profile sharing consent has not been recorded — the target is **per-profile sharing consent, not a profile-count check** (DECISIONS.md 2026-07-07): the Owner may keep Automatic only for their own authored corrections and may not re-enable Automatic for the instance until each other profile in use has given its own recorded sharing consent (after the multiUserNote has rendered), because the ToS 7.4 licence and moral-rights consent are given by the accepting Owner for works of which the Owner is an author and do not themselves cover other household members' authored corrections (Note 7.11). A family sharing a single profile is a case this must also catch — the gate is per-profile consent, not merely "more than one profile exists".

### Part B — Chat and Project Surfaces

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
- **EN:** "Created by a community member. It has not been reviewed as professional advice — use it at your own discretion. It stays inactive until you enable it."
- **ZH:** "由社区成员制作,未经专业建议层面的审核——请自行斟酌使用。安装后保持未启用状态,直到你手动启用。"
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
- **EN:** "Report content that is unsafe, infringing, misleading or contains personal information: hello@vaenyx.ai. (Reports are handled by email on overseas servers — include only what's needed.)"
- **ZH:** "举报不安全、侵权、误导或含个人信息的内容:hello@vaenyx.ai。(举报邮件在海外服务器上处理——请只写必要信息。)"
- **Behaviour:** On-demand (available from every community item's detail view). Reports are actioned under the operator's takedown discipline (target: within 24 hours for serious-harm/eSafety-type reports; within 7 days for defamation complaints; applied nationwide), using the publish service's global takedown and ban controls. The email routes via Cloudflare Email Routing to the operator's monitored mailbox on a consumer mail service processed overseas — hence the bracketed overseas-handling line in the string (Note 7.13); an auto-reply states how reports are handled and triage is prompt. The channel must also be visible **outside the app**: the public warehouse repository's README and every publicly rendered item page must carry the same contact (hello@vaenyx.ai) and a one-line takedown statement, because the people most likely to complain (e.g. a person defamed in community content) are not Vaenyx users and will encounter the content on the public surfaces; complaint-receipt timestamps must be logged so the 24-hour/7-day discipline can be evidenced.

**D5 — `legal.notice.community.discord`**
- **Placement:** Wherever the app links to the community Discord (e.g. Settings → About, Library footer), adjacent to the link.
- **EN:** "Community discussion happens on Discord, a third-party platform under its own terms. Vaenyx runs the official server there; the Discord platform itself is not operated by Vaenyx."
- **ZH:** "社区讨论在 Discord 上进行。Discord 是第三方平台,受其自身条款约束,平台本身并非由 Vaenyx 运营;Vaenyx 在其上运营官方服务器。"
- **Behaviour:** On-demand (travels with the Discord link). Vaenyx does not self-host a forum; the Discord *platform* is not an Operator Service and Discord's own platform-level moderation applies. The official server, however, is created and administered by the operator: posts in it are subject to the same D4 report channel and takedown discipline (24-hour/7-day targets, receipt logging), and the server's rules/about text must carry the hello@vaenyx.ai report contact together with the same overseas-handling notice line as D4 (Note 7.13). If the linked server ever ceases to be operator-administered, re-verify this string and clause 6.6 before the link ships.

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

*Architecture (locked 2026-07-03; service built 2026-07-04): publishing goes through the operator's central publish service (a Cloudflare Worker with a D1 database). **The engine de-identifies attached examples on-device before anything is uploaded** — this is what makes G1's locality sentence and the Privacy Policy's clause 9.2(c) true. The app then sends the declarative content plus the user's signed-in identity; the service alone holds the single GitHub bot token, validates the submission (enforcing de-identification as a backstop: non-conforming submissions are rejected, not silently rewritten server-side), commits to the public warehouse repository (github.com/vaenyxai/community) and records Merit. Publishing is auto-publish with reactive operator takedown and ban. Users never need a GitHub account; having one gives no advantage beyond being a sign-in option.*

**G1 — `legal.notice.publish`**
- **Placement:** Publish confirmation dialog, every publish of a Method or Routine, above the publish button.
- **EN:** "Publishing makes this Method or Routine public, credited to your display name and licensed to everyone under the Creative Commons Attribution 4.0 (CC BY 4.0) licence. Attached examples are stripped of names, amounts and personal details before they leave your device. Publication is effectively permanent: you can request removal later, but copies others have installed — and traces in the public library's history, forks and mirrors — may remain. Spot something personal in the preview or in the Library later? Report it: hello@vaenyx.ai. (Reports are handled by email on overseas servers — include only what's needed.)"
- **ZH:** "发布后,该 Method 或 Routine 将公开,以你的展示名署名,并以 Creative Commons Attribution 4.0(CC BY 4.0)许可授权所有人使用。附带示例在离开你的设备前会先去除姓名、金额与个人信息。发布实际上是永久性的:之后可以申请下架,但他人已安装的副本,以及公共库历史、fork 与镜像中的痕迹,可能仍会保留。如在预览中或之后的 Library 中发现个人信息,请举报:hello@vaenyx.ai。(举报邮件在海外服务器上处理——请只写必要信息。)"
- **Behaviour:** Point-of-action (every publish). The permanence sentence reflects that published content is committed to a public repository whose version history, forks and mirrors are not within the operator's power to erase, and that the CC BY 4.0 licence (Contributor Agreement clause 5) is irrevocable as to copies already made or obtained while published. The display-name byline is stamped server-side by the publish service; the app cannot set an arbitrary byline. **Verified flow (release condition):** the sentence "before they leave your device" is true only if example de-identification runs in the engine on-device and the service never receives raw examples — verify this against the shipped pipeline before any publish surface opens; if stripping ever moves server-side, G1 (EN+ZH), the Part G note, Privacy Policy 9.2(c) and ToS clause 8.6(b) must first be rewritten to disclose the transit honestly (e.g. "sent privately to Vaenyx's publish service, which strips names, amounts and personal details before anything is made public"). The dialog must also show a **preview of the de-identified examples exactly as they will be published** before the publish tap, so the author sees and approves the altered artefact that will carry their byline; if the service ever alters content after upload, a modification notice must be stamped into the committed metadata and express consent to that alteration obtained via the Contributor Agreement (Copyright Act ss 195AW–195AWA; CC BY 4.0 s 3(a)(1)(B)). The report sentence is the clause 3.7 remedy pairing for this surface's de-identification process claim (same channel as D4); the mandatory preview remains the primary control.

**G2 — `legal.notice.publish.contributorTerms`**
- **Placement:** Same dialog as G1, small print above the publish button, with "Contributor Agreement" as a tappable link to the A-class document of that exact title.
- **EN:** "By publishing you agree to the Contributor Agreement. Your acceptance is recorded against your publisher account."
- **ZH:** "发布即表示你同意《贡献者协议》。此确认将记录在你的发布者账号下。"
- **Behaviour:** Gated acknowledgement — the acceptance event is the **G2a warranty confirmation plus the publish tap** (Contributor Agreement clause 17 requires a separate, active, never-pre-selected confirmation; the tap alone is not the acceptance), and is recorded (first publish records full acceptance; later publishes record reaffirmation). Per clause 2.3, this acceptance is recorded **both locally and server-side by the publish service** against the publishing account, because the enforceability of the content licence depends on the operator being able to evidence acceptance (see Note 7.8 on the schema requirement). The sentence "Your acceptance is recorded against your publisher account" is a feature-existence statement under clause 6.7: it must not render — and the publish surface must not open — until the server-side acceptance-record table exists.

**G2a — `legal.consent.publish.warranty`** *(publish-time warranty confirmation — Contributor Agreement clause 17)*
- **Placement:** Same dialog as G1/G2: an un-pre-selected checkbox directly above the publish button; the publish button stays disabled until it is ticked.
- **EN (checkbox label):** "I confirm I have the rights to publish this, it contains nothing malicious or harmful, I agree to the de-identified attached examples being shared publicly, and the Contributor Agreement's warranties are true for this item."
- **ZH:** "我确认我拥有发布此内容的权利,内容不含恶意或有害成分,同意公开分享经脱敏处理的附带示例,并确认《贡献者协议》中的各项保证对本内容均属真实。"
- **Behaviour:** Gated acknowledgement, point-of-action — actively confirmed on **every** publish and never pre-selected (Contributor Agreement clause 17); the publish action is technically blocked until ticked (clause 6.2); each confirmation is recorded locally **and server-side** per clause 2.3, alongside the G2 acceptance. The label's final limb expressly covers the Contributor Agreement's warranties, so the recorded tick evidences the certification the Agreement's clause 17 deems, rather than a narrower three-limb statement.

**G3 — `legal.notice.publish.signIn`**
- **Placement:** The publish sign-in step (Google or GitHub OAuth, via the operator's publish service), shown before authentication, with "Privacy Policy" as a tappable link to the A-class document — so the APP 5 matters (access, correction, complaints) are available at the point Account Data is collected.
- **EN:** "Publishing needs a sign-in with Google or GitHub so your work can be credited to you. Three things happen, all outside Australia: Cloudflare stores Vaenyx's publish-service data (your account details, Merit and service logs); Google or GitHub signs you in and gives Vaenyx a few profile details; and GitHub hosts the public Library where published Methods, Routines and bylines appear. Your public byline is a display name you choose; you can change it anytime for future publishes — bylines on versions already published stay as they were. Your account email stays private. Vaenyx stores only what's needed for attribution, managing your published content, and Merit. Browsing and using the Library needs no account."
- **ZH:** "发布需要用 Google 或 GitHub 登录,以便把作品归到你的名下。会发生三件事,且都在澳大利亚境外:Cloudflare 存储 Vaenyx 发布服务的数据(你的账号信息、Merit 与服务日志);Google 或 GitHub 负责你的登录,并向 Vaenyx 提供少量个人资料;GitHub 托管公共 Library,已发布的 Method、Routine 与署名在其上公开展示。公开署名用的是你自选的展示名,之后的发布可随时换新名——已发布版本上的署名将保持原样。账号邮箱不会公开。Vaenyx 只存储署名、管理你已发布内容及 Merit 所需的信息。浏览和使用 Library 无需账号。"
- **Behaviour:** Point-of-action (each sign-in prompt). **G3 is a NOTICE, not a consent** — it plainly describes all three overseas flows (Cloudflare infrastructure storage; Google/GitHub sign-in supplying limited profile details; GitHub hosting the public Library), matching Privacy Policy §14.1–14.2, so the user sees the whole picture at the sign-in point. It does **not** capture consent; the operative APP 8.2(b) consent is the separate, narrowly scoped G3a checkbox below it, and the three flows are distinct: Cloudflare is infrastructure storage under APP 8.1 reasonable-steps (not consent), the sign-in is inbound collection of profile data by Vaenyx (not a Vaenyx disclosure), and only the GitHub public-warehouse hosting is the overseas disclosure G3a consents to. EN and ZH are deliberately pitched at the same strength ("what's needed" / "所需的信息"); this statement must be verified against the Privacy Policy and the live publish-service field list before community publishing opens (Note 7.9). The overseas-storage sentence is stated as present fact, not contingency, matching Privacy Policy 14.1 (Account Data is held overseas from sign-in).

**G3a — `legal.consent.publish.overseas`** *(APP 8.2(b) overseas-disclosure consent — the operative condition in Privacy Policy clause 14.2)*
- **Placement:** Same sign-in step as G3, directly below it: an un-pre-selected checkbox; the Google/GitHub sign-in buttons stay disabled until it is ticked. Shown before authentication, so the consent precedes the first collection of Account Data.
- **EN (checkbox label):** "I agree to Vaenyx placing the content I publish, and the public byline I choose, into GitHub's public worldwide repository (the Community Library), where anyone can access it. I understand the Australian privacy rule that would make Vaenyx accountable for what an overseas recipient does with information (APP 8.1) may not apply to this disclosure; other laws may still apply."
- **ZH:** "我同意 Vaenyx 把我发布的内容,以及我选择的公开署名,放入 GitHub 的全球公共仓库(即 Community Library),供任何人访问。我了解,原本要求 Vaenyx 为海外接收方处理信息的行为负责的澳大利亚隐私规则(APP 8.1)可能不适用于此项披露;其他法律可能仍然适用。"
- **Behaviour:** Gated acknowledgement, one-time per publishing account (re-triggered on any substantive change, clause 6.4) — never pre-selected; sign-in is technically blocked until ticked (clause 6.2); recorded locally at tick time and server-side against the publishing account as soon as it exists (clause 2.3). This is the express APP 8.2(b) consent on which Privacy Policy clause 14.2 relies, **scoped to a single disclosure**: Vaenyx placing the user's Published Content and chosen public byline into GitHub's public worldwide repository (the Community Library). Its effect is that the APP 8.1 accountability rule (Privacy Act s 16C) does not apply **to that disclosure**. It deliberately does **not** fold in the other two flows the G3 notice describes — Cloudflare's infrastructure storage (handled under APP 8.1 reasonable-steps, Privacy Policy §14.2, not consent) and the Google/GitHub sign-in (inbound collection of profile data by Vaenyx, not a Vaenyx disclosure) — so the consent stays no broader than Privacy Policy §14.2. It states the consequence accurately: it does not claim Australian law as a whole withdraws, only that the APP 8.1 rule may not apply to this GitHub-publication disclosure while other laws may still apply. Privacy Policy clause 14.2 makes it an operative condition — **the publish sign-in surface must not open until this string ships** (clause 6.7; Note 7.9). G3 is the notice covering all three flows and does not substitute for this consent; this consent covers only the GitHub publication.

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
- **EN:** "Restoring replaces your current data with this backup. This can't be undone."
- **ZH:** "恢复将用此备份替换当前数据,且无法撤销。"
- **Behaviour:** Point-of-action (every restore); confirm button `legal.notice.restore.confirm` — **EN:** "Restore and Replace" / **ZH:** "恢复并替换".

### Part I — Settings

**I1 — `legal.consent.flywheel.settingsNote`**
- **Placement:** Settings → Sharing, permanent explanatory text above the mode selector (Automatic / Review Each / Off).
- **EN:** "Sharing sends de-identified improvement patterns to the community. Your data and your local copies stay on this device — only the pattern, stripped of names, amounts and personal details, is shared. Anything Vaenyx recognises as sensitive (health, family, finance) is always asked about separately. Automatic sharing is for improvements from your own use: if someone else uses this Vaenyx, use Review Each or Off unless they've agreed and you can confirm you hold the rights to share that example. If you spot something personal in shared content, report it and Vaenyx will remove it from the Library (copies others have already installed, and traces in the library's public history, forks and mirrors, may persist)."
- **ZH:** "分享会向社区发送经过脱敏处理的改进模式。你的数据与本地副本始终留在本设备——对外分享的只有去除姓名、金额与个人信息后的模式。被 Vaenyx 识别为敏感(健康、家庭、财务)的内容始终单独询问。自动分享仅针对你自己使用所产生的改进:若他人也使用这台 Vaenyx,请改用 Review Each 或 Off,除非对方已同意、且你能确认自己拥有分享该示例所需的权利。如在共享内容中发现个人信息,可以举报,Vaenyx 会将其从 Library 中移除(他人已安装的副本,以及公共库历史、fork 与镜像中的痕迹,可能仍会保留)。"
- **Behaviour:** Persistent. The locality statement is scoped to the user's data and local copies (always local by design) and is permitted under clause 3.2; the de-identification wording follows clause 3.7 (process plus report-and-takedown remedy, no absolute outcome guarantee, no erasure-everywhere promise). On a shared instance the mode is forced to Review Each or Off for any profile without a recorded per-profile sharing consent — the gate is per-profile consent, not a profile-count check (DECISIONS.md 2026-07-07); the Owner may keep Automatic for their own use and re-enable it more widely only once each other profile in use has given its own recorded sharing consent (A3 behaviour note; Note 7.11).

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

## 5. Placement Summary Matrix

| Key (root) | Surface | Behaviour |
|---|---|---|
| `legal.disclaimer.aiGeneral.firstRun` | First-run welcome | One-time |
| `legal.notice.firstRun.terms` | First-run, ToS/Privacy links | Gated |
| `legal.consent.flywheel.*` (card) | First-run, beside ToS | Gated forced choice (no pre-selection; nothing shared until chosen), 1-tap decline |
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

6.4 **Version discipline.** Any change to a string's substance bumps `legal.copyVersion`. For **`consent`-class strings** (the A3 card, G4, G2a, G3a and G2's acceptance line), any substantive change **automatically re-triggers** the gate or consent — no materiality judgment applies, because a consent recorded against one wording must never be silently carried forward to different wording on the operator's own say-so. For `notice`- and `disclaimer`-class gated items, the gate re-triggers where the change is material (material = the change could reasonably alter the user's choice; the operator decides and records the reason). Recorded acknowledgements always store the version they were given against.

6.5 **Terminology.** The pack standardises on **"de-identified"** (脱敏). "Anonymized" must not appear in any string or formal document (the A-class set uses "de-identified" throughout). Document names in UI strings and link labels must match the A-class documents' formal titles exactly — the Terms of Service & End User Licence Agreement states in its opening paragraph that it may be referred to as the **"Terms of Service"** (《服务条款》), which is the label A2/I2 use; the contributor document is the **"Contributor Agreement"** (《贡献者协议》) everywhere; "Contributor Terms" must not be used. Product labels follow clause 2.7 ("Library" / "My Library").

6.6 **No coverage creep.** These strings describe the current product only. Phase-two remote access (operator-run NetBird) is intentionally not covered and will require its own notices when it arrives. Discord is covered only by D5, which separates the platform from the server: no string may suggest the operator operates or moderates the Discord *platform*, and no string may deny that the operator runs the official server — D5 acknowledges it, and posts in that server carry the D4 report/takedown discipline (D5 behaviour note).

6.7 **Feature-existence statements ship with the feature.** Any sentence asserting that a capability exists (currently: H1's optional-encryption sentence; G2's sentence "Your acceptance is recorded against your publisher account" — which must not render, and the publish surface must not open, until the publish service's acceptance-record table exists per Note 7.8; B3's sentence "Nothing enters Vaenyx Me without your approval" — which must not render until the Vaenyx Me approval gate is structurally verified, i.e. no code path writes to Vaenyx Me without an approval record; and G3a's overseas consent — the publish sign-in surface must not open until it ships and is recorded per clause 2.3, per Privacy Policy clause 14.2 and Note 7.9) must be conditionally rendered or omitted until that capability is actually present in the shipping build. Shipping the sentence without the feature is a misrepresentation. The same discipline applies to surfaces that do not yet exist (install-time wizard, Merit display, per-chat tier picker): their strings ship when the surface ships.
