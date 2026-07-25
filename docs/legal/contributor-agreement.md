# Vaenyx — Contributor Agreement (Community Library)

> **Version 3.0 — effective 26 July 2026.** Part of the Vaenyx legal set. Drafted with AI assistance and adopted by the Operator; it is provided for your information and is not legal advice. See [`README.md`](README.md) for how the set fits together, and [`implementation-status.md`](implementation-status.md) for what is actually built in this release.

**Effective date:** 26 July 2026 — *the acceptance-recording described in clause 17 is in operation.*
**This Agreement is between you (the "Contributor", "you") and** Vae Foundry Pty Ltd (ACN 700 703 724), a proprietary limited company registered in Victoria, Australia (the "**Operator**", "**we**", "**us**"), the operator of the Vaenyx Community Library.

---

## 1. When This Agreement Applies

1.1 **Publishing Only.** This Agreement applies **at the moment you publish** a Method, Routine, Example, or other content to the public Vaenyx Community Library (the "**Library**" — shown in the product as "Community", while your on-device private store appears as the "Library"). By completing the publish step, you accept this Agreement for that Contribution.

1.2 **Local and Private Creation Is Not Covered.** Creating, editing, or using Methods and Routines **privately on your own device requires no agreement** and grants us no rights under this Agreement. Everything you make defaults to your private library, and nothing you make is published under this Agreement unless you explicitly publish it. Separately — and even if you never publish anything or accept this Agreement — where you have made the affirmative community-sharing choice (an explicit choice presented at set-up alongside, but distinct from, acceptance of the Terms of Service, with no option pre-selected, and changeable at any time in Settings; nothing is shared, and sharing does not operate on an installation — including after an upgrade — until you have actually made that choice), de-identified improvement patterns from your private use may be shared publicly and licensed under Terms of Service clause 7.4 (see clause 9).

1.3 **Using the Library Is Not Covered.** Downloading and using community content requires no account and is governed by the Terms of Service, not this Agreement.

1.4 **Each Publish Is a Separate Acceptance.** This Agreement (as in force at the time) applies separately to each Contribution you publish, including each new version.

1.5 **Release scope as at the Effective Date.** This release provides no community-sharing upload, Example attachment, de-identification or preview, or Merit. A current sharing setting is a local preference only and authorises no upload, licence or moral-rights consent. A later capability remains off until marked active, safeguarded, noticed and separately chosen. Accordingly, a clause of this Agreement that describes Examples, sharing uploads or Merit has no present application, and takes effect only if and when the relevant capability is marked active in the Schedule.

## 2. Definitions

- "**Method**" — an atomic, declarative building block published to the Library.
- "**Routine**" — a user-facing product composed of Methods plus declarative orchestration.
- "**Example**" — a de-identified input/output or correction pattern published with, or contributed to, a Method or Routine.
- "**Contribution**" — any Method, Routine, Example, description, metadata, or other content you publish to the Library, including each version of it.
- "**Declarative content**" — recipes, instructions, schemas, and configuration that describe *what* to do; not runnable foreign program code. Declarative-only content is a core safety property of the Library.
- "**Merit**" — if provided by the version of Vaenyx you use, the non-monetary creator-reputation record described in clause 8. As at the Effective Date, Merit is not provided.
- "**Publish Service**" — the operator-hosted central publishing service through which all publishing flows. Your installation sends your Contribution's declarative files and your signed-in identity to the Publish Service; the Publish Service alone holds the credential used to write published content to the public repository. You never write to the public repository yourself and never hold a write credential for it.
- "**Library infrastructure**" — the systems used to store and distribute the Library: the Publish Service, the public repository to which the Publish Service commits on your behalf, and the catalogue and index that installations read. The providers, authentication options, infrastructure and endpoints applicable to the version you use are identified in the current Schedule, the applicable Point-of-Use Notice and the THIRD_PARTY_NOTICES document. Those are factual notices: they are not incorporated into this Agreement, and updating them does not amend this Agreement unless the change alters a contractual right, obligation or risk allocation.

## 3. Who May Publish (Identity)

3.1 **Verified Login Required.** Publishing requires a verified sign-in through one of the sign-in providers offered for your version; the current options are identified in the Schedule and at the sign-in step. Using the Library requires no account; publishing does. No sign-in option confers any advantage over another, and none requires an account with the host of the public repository. Your public byline is a display name you set yourself: the first-publish flow requires you to choose it explicitly and pre-fills a generated pseudonym — never your sign-in account name — so your real name becomes your byline only if you enter it yourself; it is editable at any time for future publishes (see the Schedule entries `flow.publication.signin` and `flow.publication.submission`). **Your byline is public, and permanent in copies beyond our reach** — forks, mirrors, and installed copies (clauses 8.1–8.2 and 10.4); our own repository's history can be corrected only in the exceptional cases in clause 10.4(c). If your display name is your real name when you publish, your real name will be published, stamped into public git history, and carried in CC BY 4.0 attribution worldwide — check your display name before your first publish. What remains private is your verified sign-in identity — provider, account identifier, and email; we store only the minimum account information needed for attribution, published-content management, de-duplication, enforcement, and Merit, as described in the Privacy Policy.

3.2 **Age.** Vaenyx is a general-audience product for people 18 or older. You must be at least 18 and able to enter a binding agreement to publish.

3.3 **No Impersonation.** You must not publish under a name or identity that impersonates, or is likely to be confused with, another person, creator, organisation, or brand. Because the Publish Service stamps your byline from your account's display name at commit time (clause 8.1), your installation cannot attach a byline that differs from your account's display name — but the stamping does not verify that your display name is your real name, or that it is unique. We may block, reset, or require a change to a display name that breaches this clause 3.3, and may apply the look-alike screening in clause 3.4 to display names as well as Contribution names.

3.4 **Names.** Contribution names may be reserved at submission. We may block, refuse, or reassign names that are look-alikes of existing content, that squat on names in bad faith, that misuse the Vaenyx name or logo contrary to the Trademark Policy, or that are misleading. Names of removed Contributions are not released for reuse by other accounts; the account that published a Contribution may reuse its name unless the removal was for safety or legal reasons or for bad-faith conduct. Reserving a name gives you no trademark or other proprietary right in it beyond your Contribution's listing.

3.5 **Trusted Status.** Any "trusted creator" or similar status is time-gated, discretionary, and automatically revoked if the associated identity changes. It is a Library-integrity signal, not a qualification, endorsement, or entitlement.

## 4. What You May Publish (Content Standards)

4.1 **Declarative Content Only.** Contributions must be declarative content. You must not publish runnable foreign program code, or attempt to circumvent, disguise, or smuggle past the declarative-only constraint (for example by encoding executable payloads inside instructions or schemas). The Publish Service validates each submission (declarative-only, path-safe, size-capped) before committing it, but its automated checks do not relieve you of this obligation.

4.2 **No Malicious or Harmful Content.** You must not publish content that is illegal, malicious, deceptive, or harmful, that gives unsafe instructions, or that is designed to damage, exfiltrate from, or take unauthorised control of any system or data.

4.3 **No Personal Information.** Contributions, including Examples, must not contain personal information about any identifiable individual, other than the attribution details described in clause 8 relating to you. Examples must be **de-identified** before publishing. The publish flow's de-identification gate is designed to help de-identify Examples, but it is not guaranteed to catch everything, and you remain responsible for what you publish: review your Contribution and do not publish real names, contact details, financial particulars, health information, or anything else that identifies a person.

4.4 **No Professional Advice.** Contributions are general tools and information, not medical, legal, financial, tax, or other professional advice, and must not be presented as such.

4.5 **Standards Apply to Every Version.** Each new version you publish must independently meet these standards. Methods are immutably versioned in normal operation and Routines pin Method versions; a defective version is not silently edited, only superseded (see clause 10 on removal limits and the exceptional history-purge cases in clause 10.4).

## 5. Licence You Grant

5.1 **You Keep Ownership.** You retain all ownership of your Contribution. This Agreement licenses it; it does not transfer it.

5.2 **Grant to the Operator.** You grant the Operator a worldwide, non-exclusive, royalty-free, perpetual licence — irrevocable to the extent set out in clause 5.4 — to use, host, store, reproduce, adapt, format, index, de-identify, translate, distribute, communicate, publicly display, and make available your Contribution, and to sublicense the foregoing to service providers who operate the Library infrastructure on our behalf, in each case for the purposes of operating, maintaining, securing, improving, and promoting the Library and Vaenyx.

5.3 **Grant to the Public — CC BY 4.0 Plus a Direct Licence.** In addition to clause 5.2:

  (a) **Public licence (CC BY 4.0).** You license your published Contribution to the public under the **Creative Commons Attribution 4.0 International licence (CC BY 4.0)** (https://creativecommons.org/licenses/by/4.0/). Under CC BY 4.0, anyone may copy, redistribute, adapt, remix, and build upon your Contribution, in any medium and for any purpose, provided they give appropriate credit in accordance with that licence. Appropriate credit includes identifying the creator by the display name stamped into the Contribution's published metadata (clause 8.1), **together with the other elements CC BY 4.0 itself requires** — notice of, and a link to, the CC BY 4.0 licence, a link to the material where practicable, retention of any copyright and disclaimer notices, and an indication of any changes made. The stamped display name is the identification-of-creator element only; CC BY 4.0's attribution condition is the legal backbone of the Library's visible-human-credit and Merit features. Where a version's stamped byline and the current catalogue listing differ, crediting the display name in the published metadata of the version used satisfies the identification element (clause 8.2).

  (b) **Direct licence.** You also grant every Vaenyx user, and every person who lawfully accesses the public repository through which the Library is distributed, a worldwide, non-exclusive, royalty-free licence to view, download, store, reproduce, use, run, adapt for their own use, and combine with other content your Contribution, through and as part of the Library — including the rights (such as viewing and forking) that the terms of the public infrastructure require published content to carry. This direct licence operates in addition to, and independently of, CC BY 4.0: a person using the Library as intended does not need to rely on CC BY 4.0.

  (c) **Downstream reliance.** Forks, mirrors, and other downstream copies of the public repository, and adaptations or redistributions of published content made outside Vaenyx, may rely on CC BY 4.0 — to the extent you held the rights licensed (clause 7.1) and subject to the scope limitation below.

  **De-identification failure — scope of licences.** No licence granted under this clause 5 — including CC BY 4.0 and the direct licence — ever extends to another person's personal information included in your Contribution in breach of clause 4.3, or to any other material you had no right to license: each licence operates only on what you could lawfully grant. Downstream reuse of such material is not authorised, and we will act under clause 10 (and Terms of Service clause 8.5) to remove it. Nothing in this paragraph revokes, or qualifies the irrevocability of, any licence over material that was validly licensed. This is the same scope limitation stated in the de-identification-failure paragraphs of Terms of Service clauses 7.4 and 8.6(e).

5.4 **Why Parts of the Grant Are Irrevocable — an Honest Explanation.** The Library is distributed through public infrastructure: published content is committed to a public git repository, versions are immutable, and users install copies onto their own devices. Once published:
  (a) copies of your Contribution will exist in public git history, in forks and mirrors of the public repository, and on the devices of users who installed it; and
  (b) we cannot recall or erase copies in forks, mirrors, or caches, or on users' devices; our own repository's git history is not routinely rewritten, though in exceptional cases (a de-identification failure involving personal information, or content removed as unlawful — clause 10.4) it can be, as described in the Privacy Policy.
Accordingly — subject in every case to the de-identification-failure scope limitation in clause 5.3 (no licence ever extended to another person's personal information, or other material, you had no right to license) and to the extent you held the rights licensed (clause 7.1) — the licences in clauses 5.2 and 5.3 are irrevocable **as to copies made or obtained while the Contribution was published**, and users who installed your Contribution may continue to use their installed copies after removal. In addition, CC BY 4.0 is, by its own terms, granted for the duration of the applicable copyright and cannot be revoked from a person who has received the Contribution under it and complies with it; subject to the same scope limitation and rights limit, anyone who obtained your Contribution while it was published — including forks and mirrors — may continue to rely on CC BY 4.0 after removal. After removal under clause 10, our continuing rights under clause 5.2 are limited to what this reality requires: retaining the Contribution in git history and backups, in forks and mirrors we do not control, in previously shared de-identified Examples, and in users' installed copies. We will not restore a removed Contribution to the live catalogue — except to reverse a removal that we determine was made in error or procured by false or misleading reports (clause 10.1) — and will not actively redistribute or promote removed content. Clause 10 sets out what removal *can* achieve.

5.5 **Free of Charge.** All licences under this Agreement are royalty-free in both directions: users pay nothing to use your Contribution, and we owe you nothing for it (see clause 8.4).

5.6 **Feedback.** If you send us suggestions or feedback about Vaenyx or the Library, we may use them without restriction or obligation to you.

## 6. Moral Rights Consent

6.1 This clause applies to moral rights under Part IX of the *Copyright Act 1968* (Cth) and equivalent laws elsewhere.

6.2 To the extent permitted by law, you **consent** to the Operator, Vaenyx users, and anyone acting under a licence granted under clause 5 (including CC BY 4.0) doing, or omitting to do, the following in relation to your Contribution, whether occurring before or after this consent is given:
  (a) using, reproducing, adapting, versioning, de-identifying, translating, reformatting, combining, or otherwise materially altering it in the ways contemplated by this Agreement (including the flywheel process in clause 9);
  (b) attributing it using the display name associated with your publishing account, or, where a context reasonably does not carry attribution (for example machine-generated indexes, de-identified Examples, or technical metadata), using it without attribution; and
  (c) not consulting you before doing any of the above.

6.3 This consent is given genuinely, without duress or false or misleading statements, for the benefit of the Operator, its successors, licensees, Vaenyx users, and anyone acting under a licence granted under clause 5 (including CC BY 4.0) — mirroring the corresponding consent in Terms of Service clause 7.4. It does not permit attributing your Contribution to someone else as author, and it does not permit presenting material authored by someone else as authored by you: where your Contribution includes third-party material, that material and its authorship must be identified as described in clause 7.1.

## 7. Contributor Warranties

You warrant, for each Contribution and each version of it, that:

7.1 **Rights.** You are the sole author and copyright owner of the Contribution, or you hold all rights, permissions and consents needed to make every grant in clause 5 and every consent in clause 6. You must not include third-party material unless its licence or a written permission expressly permits every applicable clause 5 grant and every relevant author has given a genuine written moral-rights consent covering the acts and omissions in clause 6. For a work of joint authorship, the required rights and consents must come from every relevant co-owner and author. You must identify the material, its author, source, and applicable licence or permission in the Contribution's metadata.

7.2 **No Infringement.** To the best of your knowledge, it does not infringe any person's intellectual property, privacy, confidentiality, contractual, or other rights, and publishing it does not breach any law or any obligation you owe to an employer or other party.

7.3 **No Malicious or Harmful Content.** It complies with clause 4.2.

7.4 **No Personal Information.** It complies with clause 4.3, and any Examples in it are de-identified.

7.5 **Declarative Only.** It complies with clause 4.1.

7.6 **Accuracy of Identity.** The identity and display name under which you publish are yours to use and comply with clause 3.

## 8. Attribution and Merit

8.1 **Visible Human Credit.** Attribution of community content to its human creator is a deliberate feature of the Library. At commit time, the Publish Service stamps the display name on your publishing account into your Contribution's published metadata as its byline; your installation cannot supply a byline different from your account's display name. This stamping does not verify that your display name is your real name or that it is unique — impersonating or misleading display names are dealt with under clauses 3.3–3.4, not by the stamping itself. Your display name is shown with your Contribution in the catalogue and recorded in its published metadata, and it is the identification-of-creator element of the credit CC BY 4.0 requires re-users to give (clause 5.3(a)). The byline identifies you as the Contribution's publisher and, as applicable, author; it does not present third-party material credited under clause 7.1 as your own work. You consent to this display and recording.

8.2 **Attribution Persists in History.** Because attribution is stamped into published, immutably-versioned content, your display name as at each publish will ordinarily remain in public git history even if you later change it or your Contribution is removed (see clause 10.4 for the exceptional cases in which our own repository's history can be purged). You may edit your display name at any time: the new name applies to future publishes, while versions already published keep the byline they were published with unless you re-publish them — re-publishing is the mechanism that updates the stamped credit. Future listings will use your then-current display name where technically feasible. If a version's stamped byline and the current catalogue listing differ, re-users satisfy the identification element of CC BY 4.0 attribution by crediting the display name in the published metadata of the version they use, and crediting either name during such a transition is reasonable attribution for the purposes of clause 5.3(a).

8.3 **Merit Is Non-Monetary — Absolutely.** Merit is a **non-monetary creator-reputation record only**. It has **no cash value**; it **cannot be bought, sold, transferred, exchanged, or redeemed**; it is **not a currency, a security, a financial product, or property with monetary value**; it is add-only; and there is no operation that spends it. Nothing in this Agreement creates any entitlement to money, compute, goods, services, or anything else of value.

8.4 **No Payment, Ever.** Vaenyx charges nothing and has no billing. You are **not paid** for Contributions and no payment, royalty, revenue share, fee, or other compensation is or will become owed to you for any Contribution or for any use of it, however extensive.

## 9. De-Identified Examples and the Flywheel

9.1 Corrections and improvement patterns associated with your Contribution may be **de-identified** and used or shared to improve the relevant Method or Routine (the "flywheel"). Whether they are *shared* is controlled by **your community-sharing setting** — set by an explicit choice you must make when you set up Vaenyx, presented alongside, but distinct from, acceptance of the Terms of Service, with no option pre-selected ("Keep Sharing On (recommended)" may be visually highlighted, but nothing is chosen for you), and changeable at any time in Settings (automatic / review-each / off), as described in Terms of Service clause 7.4 and the Privacy Policy. Nothing is shared, and sharing does not operate on an installation — including after an upgrade — until you have actually made that choice. Nothing in this Agreement overrides that setting: if you have chosen not to share, or have turned sharing off, accepting this Agreement at publish does not turn it back on. Where sharing applies, de-identification is applied to every shared Example regardless of source; the de-identification gate is designed to help remove identifying information but is not guaranteed to catch everything (see clause 4.3).

9.2 Your published Examples become public and are licensed under clause 5 — including CC BY 4.0 — like any other Contribution. Examples shared under the community-sharing setting (whether or not the sharer has ever accepted this Agreement) are licensed under Terms of Service clause 7.4, whose text governs those Examples and carries its own de-identification-failure scope limitation; those licences operate only to the extent of the sharer's actual rights in the Example. Material shared or published without the necessary rights — including another person's personal information carried in breach of the de-identification promise — is to that extent not licensed at all — the remedy for such material is removal under clause 10 and Terms of Service clause 8.5, not any licence.

9.3 You may publish a Method or Routine as recipe-and-schema only, keeping your own tuned Examples private. Only what you actually publish is licensed.

## 10. Removal, Takedown, and Their Honest Limits

10.1 **Auto-Publish; We May Remove.** Publishing is not pre-moderated: a Contribution that passes the Publish Service's automated checks goes live immediately, without human review. Moderation is reactive. We may label, re-classify, de-list, or remove any Contribution, revoke "Verified" or trusted status, and suspend or ban a publishing account (blocking future publishes and, where warranted, removing those of that account's live Contributions implicated in the conduct — or all of them, where the account itself is fraudulent or acting in bad faith), at any time and at our discretion — including for breach of this Agreement, safety concerns, legal requirements, or Library quality. In exercising the removal, suspension, and ban powers we will act proportionately, and — except in urgent cases (safety concerns, legal risk, or suspected malicious, deceptive, or unlawful content, including attempts to circumvent the declarative-only constraint) — we will, where practicable, give you the reason for the action and an opportunity to respond by email to hello@vaenyx.ai; in urgent cases we may act immediately and will give notice where practicable afterwards. You may request a review of any removal, suspension, or ban by emailing hello@vaenyx.ai. This paragraph does not limit labelling, re-classification, or adjustments to "Verified", trusted status, Merit, or other integrity signals. If we determine that a Contribution was removed in error or on the strength of false or misleading reports, we may restore it (clause 5.4). Anyone may report content to hello@vaenyx.ai; a report containing the particulars described in Terms of Service clause 8.5 is a duly-made report, and both windows below run from **receipt** of a duly-made report, wherever it comes from. We aim to action seriously harmful material (of the kind regulated under Australia's *Online Safety Act 2021*) within 24 hours of receipt where reasonably practicable, prioritised ahead of all other reports and in any event actioned as our first priority once we are able to act; this 24-hour aim is a service target, not a guarantee. For duly-made complaints that a Contribution is unlawful, and for complaints that it is defamatory, we will take reasonable steps to remove or disable access to it as soon as practicable and in any event within 7 days of receiving the complaint — the same commitment stated in Terms of Service clause 8.5. For a defamation complaint specifically, the 7-day period starts on receipt of a **written** complaint, made through an accessible complaints mechanism (our complaints channel at hello@vaenyx.ai), that (a) identifies the plaintiff (the person of or concerning whom the matter is alleged to have been published); (b) identifies the matter complained of and its location well enough for us to locate it (for example, a URL or item identifier); and (c) states that the plaintiff considers the matter to be defamatory of them. This threshold reflects the statutory minimum for a concerns notice under section 31A of the *Defamation Act 2005* (NSW) (and its interstate equivalents). This overrides the general "duly-made report" definition above for the 7-day defamation trigger: the poster's identity, the specific imputations complained of, the reasons the matter is said to be defamatory, the complainant's contact details, and any supporting evidence are helpful particulars we may request, but their absence does not delay the start of the 7-day period once a complaint meeting (a)–(c) is received. A complaint lacking some of those particulars is still received, triaged, and assessed.

10.2 **You May Request Removal.** You may ask us at hello@vaenyx.ai to remove your Contribution from the Library. We will action reasonable requests within a reasonable time.

10.3 **What Removal Does.** Removal takes the Contribution out of the live Library catalogue and index, so it is no longer offered to installations for discovery or new installs. Where removal follows a duly-made report that the Contribution is unlawful (including defamatory), or a de-identification failure involving personal information, removal also includes deleting the material from the live tree of our repository and taking the reasonable access-disabling steps for our own repository described in clause 10.4.

10.4 **What Removal Cannot Do — Read This Before Publishing.** Removal **cannot**:
  (a) erase the Contribution from forks, mirrors, or caches of the public repository made while it was published (which may continue to rely on CC BY 4.0 under clause 5.4 — but only to the extent you held the licensed rights, and never over another person's personal information or other material outside the clause 5.3 scope limitation);
  (b) recall copies already installed on users' devices, which those users may keep using under clause 5.3; or
  (c) routinely remove your display name from the published metadata of historical versions (clause 8.2) — though where the byline itself is personal information whose continued publication causes or risks serious harm, we can take the exceptional repository-history steps described below for our own repository, while still being unable to reach forks, mirrors, or installed copies.
Our own repository's git history is not routinely rewritten on removal, but in exceptional cases — a de-identification failure involving personal information, or content removed following a duly-made report that it is defamatory or otherwise unlawful (including material of the kind regulated under the *Online Safety Act 2021*) — we can and will take reasonable steps to rewrite or purge it, or otherwise to disable access to the operator-controlled copy (including by a takedown request to the repository host), as described in the Privacy Policy and Terms of Service clause 8.5; such requests are handled under clause 10.2 and the Privacy Policy. Because copies beyond our reach — forks, mirrors, caches, and installed copies — may persist indefinitely, publishing to the Library is, in practical effect, permanent publication. Do not publish anything you may later need to make private.

10.5 **Scope of decisions.** A decision concerning a particular Contribution is subject to clause 10.1. A material change to or discontinuance of the Library is subject to Terms of Service clause 18.1.

## 11. Your Contribution Is Provided "As Is" (Between You and Users)

11.1 You provide your Contribution "as is". The warranties in clause 7 are given to the Operator only; you give users no warranty of any kind (subject to clause 11.3), and you are not providing professional advice through your Contribution.

11.2 We do not endorse community content as professional advice. Community content dealing with health topics is additionally marked as not endorsed by the Operator. "Verified" means an item passed our automated format and static checks at a point in time (no person has individually reviewed it); it is not a guarantee of quality, safety, or fitness for any purpose.

11.3 **Australian Consumer Law.** Nothing in this Agreement excludes, restricts, or modifies any consumer guarantee, right, or remedy that any person has under the Australian Consumer Law or any other law that cannot lawfully be excluded, restricted, or modified. Clauses 11.1, 11.2, and 12 apply only to the maximum extent permitted by law and subject to this clause 11.3.

## 12. Indemnity

12.1 **Indemnity.** To the extent permitted by law, you indemnify the Operator against loss, damage, liability and reasonable costs, including reasonable legal costs, arising from a third-party claim to the extent it results from a material breach of the Contributor Warranties, infringement of a third party's rights, or inclusion of personal information contrary to this Agreement, but only where you knew or, after taking reasonable care, reasonably ought to have known of the facts constituting the breach, infringement or inclusion. An innocent breach does not trigger this indemnity.

12.2 **Safeguards.** This indemnity, and any claim by us for breach of a Contributor Warranty, is limited to loss that was reasonably foreseeable and is reduced proportionately to the extent the loss was caused or contributed to by us. If you took reasonable care in reviewing your Contribution before publishing, a failure of a de-identification control operated by us counts as loss caused or contributed to by us.

For an indemnity claim, we will notify you promptly, give you the option to participate in the defence at your own cost, not admit liability or settle without your consent, which must not be unreasonably withheld or delayed, and take reasonable steps to mitigate loss.

12.3 **Cap — single and combined with the Terms of Service.** No indemnity or warranty damages apply to an innocent breach. Subject to Terms of Service clauses 14 and 15.3, the single combined caps in Terms of Service clause 15.2 apply to all liability under or in connection with this Agreement: AUD $10,000 for any one event or series of related events, and AUD $20,000 for all events occurring in a Contract Year. Amounts recovered under either document count towards the same per-event and annual caps. Every exclusion from the caps in Terms of Service clause 15.3 applies equally under this Agreement.

12.4 **Australian Consumer Law.** Nothing in this clause limits any consumer guarantee, right or remedy that cannot lawfully be excluded, restricted or modified, or limits the Operator's liability under clauses 14 to 16 of the Terms of Service.

## 13. Relationship

Publishing to the Library does not make you an employee, agent, partner, joint venturer, or representative of the Operator, and does not authorise you to bind the Operator or speak on its behalf. Contributions are voluntary and unpaid (clause 8.4).

## 14. Privacy

Our handling of your publishing-account information — your verified sign-in identity (provider, account identifier, and email or handle, kept private and used for de-duplication and enforcement), your public display name, your published-content records, and Merit — is described in the Vaenyx Privacy Policy. Chats, files, memories, and other instance data on your device are not part of publishing and are not collected through it; only what you publish, or what is shared as a de-identified Example under your community-sharing setting (clause 9), leaves your control under this Agreement.

## 15. Changes to This Agreement

We may update this Agreement from time to time. The version in force when you publish a Contribution governs that Contribution. Material changes will be made available in the product or the public repository before they take effect; continuing to publish after a change takes effect is acceptance of the changed Agreement for subsequent Contributions.

## 16. General

16.1 **Governing Law.** This Agreement is governed by the laws of Victoria, Australia — the same governing law as the Vaenyx Terms of Service — and the parties submit to the non-exclusive jurisdiction of the courts of that place, without limiting any non-excludable rights you have where you live.

16.2 **Relationship to the Terms of Service.** This Agreement supplements the Terms of Service for publishing activity. If they conflict in relation to a Contribution, this Agreement prevails for that Contribution — except that: (a) the licence text in Terms of Service clause 7.4, and its de-identification-failure scope limitation (mirrored in clause 5.3 of this Agreement), govern examples shared under that clause and prevail over this Agreement as to licence scope; and (b) nothing in this Agreement weakens that scope limitation (as applied to published content by Terms of Service clause 8.6(e)) or the takedown commitments in Terms of Service clause 8.5.

16.3 **Severability.** If part of this Agreement is unenforceable, the rest continues in force.

16.4 **No Waiver.** A failure to enforce a right is not a waiver of it.

16.5 **Assignment.** We may assign this Agreement only to a bona fide successor that agrees in writing to assume our obligations. An assignment must not materially reduce your rights, increase your obligations, expand rights in Your Data or a Contribution, or otherwise materially prejudice you. We will give reasonable advance notice where practicable; if an assignment would materially prejudice you, we must obtain your consent.

16.6 **Survival.** Clauses 5, 6, 7, 8.3, 8.4, 10.4, 11, 12, and 16 survive removal of a Contribution and any termination of your publishing access.

16.7 **Language.** This Agreement is drafted in English; a Chinese translation may be provided for convenience. The English version prevails to the extent of any inconsistency.

## 17. Sign-Off (Publish-Time Warranty Confirmation)

The publish step presents a warranty confirmation that you must actively confirm each time you publish — it is never pre-selected. By confirming it and completing the publish step, you certify that:
  (a) you hold the rights needed to publish the Contribution (clause 7.1);
  (b) the Contribution is not malicious or harmful (clauses 4.2 and 7.3); and
  (c) in a version that permits Examples to be attached to a Contribution, every Example included is de-identified as required by clauses 4.3 and 7.4, and you agree that each such Example will be published publicly and licensed under clause 5 (see clause 9.2). The current version does not attach Examples to a Contribution, so this paragraph has no present application;
and that you have read this Agreement, that all of the warranties in clause 7 are true for the Contribution being published, and that you accept this Agreement. The publish step does not complete unless your acceptance is recorded server-side (account identifier, Agreement version, timestamp, and the Contribution's identifier), as described in the Privacy Policy, so that acceptance of this Agreement and the content licences — including the clause 6 moral-rights consent — can be evidenced for each Contribution.

**Contact:** hello@vaenyx.ai
