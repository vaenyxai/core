# Vaenyx — Terms of Service & End User Licence Agreement

> **Version 3.0 — effective 26 July 2026.** Part of the Vaenyx legal set. Drafted with AI assistance and adopted by the Operator; it is provided for your information and is not legal advice. See [`README.md`](README.md) for how the set fits together, and [`implementation-status.md`](implementation-status.md) for what is actually built in this release.

**Effective date:** 26 July 2026. These Terms take effect from the install-time acceptance flow in which they are first presented; that flow and the clause 12.3 health acknowledgement gate are live in the shipped build.
**Operator:** Vae Foundry Pty Ltd (ACN 700 703 724), a proprietary limited company registered in Victoria, Australia ("**we**", "**us**", "**our**", the "**Operator**").
**Contact:** hello@vaenyx.ai

These Terms of Service and End User Licence Agreement (the "**Terms**"; the document may be referred to, including in the product and in the other Vaenyx legal documents, as the "**Terms of Service**") are a legally binding agreement between you and Vae Foundry Pty Ltd governing your download, installation and use of the Vaenyx software and your use of the limited online services we operate in connection with it. Please read them carefully. Key points are summarised in plain English at the start of some clauses; the full clause text governs.

---

## 1. Acceptance and Eligibility

1.1 **Agreement.** By clicking to accept these Terms when they are presented at installation, or by installing or using the Software or any Operator Service after having had the opportunity to review these Terms, you accept these Terms. If you do not accept these Terms, do not install or use the Software, and uninstall any copy you hold.

1.2 **Age and capacity.** Vaenyx is a general-audience product. It is not directed to children. The 18-or-over requirement in this clause applies to the person who accepts these Terms as the owner of an Instance: by accepting these Terms you represent that you are at least **18 years old** and have legal capacity to enter into this agreement.

1.3 **Your installation, your responsibility.** The Software is self-hosted: you install and operate it on hardware you control. You may permit other persons — who may include members of your household — to access your Instance; they do so under your supervision and on your responsibility (including through any restricted-mode features you configure under clause 3.4), and you are responsible for activity by persons whom you knowingly authorise to use your Instance, to the extent that activity is reasonably within your control. You are not responsible for unauthorised activity occurring despite reasonable security measures, or for our acts or omissions or those of a Third-Party Service.

1.4 **Organisational use.** If you accept these Terms on behalf of an organisation, you represent that you are authorised to bind that organisation, and "you" includes that organisation. The licence in clause 4 extends to that organisation's internal use.

1.5 **Presentation at install.** These Terms are presented at installation. You may also be asked to record a local preference about a capability that is **not available in the current release**. That preference is not a consent: it does not enable sharing, does not authorise an upload, and grants no licence and no moral-rights consent (see clause 7.4). Accepting these Terms and recording that preference are distinct steps.

## 2. Definitions

In these Terms:

- "**ACL**" means the Australian Consumer Law, being Schedule 2 to the *Competition and Consumer Act 2010* (Cth), as applied under that Act and under state and territory fair trading legislation.
- "**Community Content**" means Methods, Routines and related material published to the Community Library by any person, including by us.
- "**Community Library**" means the public catalogue of Methods and Routines that we make available through our distribution infrastructure. The Community Library is shown in the product as "**Community**"; your on-device private store of Methods and Routines is separately shown in the product as the "**Library**" and forms part of your Instance, not of the Community Library.
- "**Instance**" means a copy of the Software installed and operated by you on hardware you control, together with its local data stores.
- "**Merit**" means, if provided by the version of Vaenyx you use, the non-monetary creator-reputation record described in clause 9. As at the Effective Date, Merit is not provided.
- "**Method**" means an atomic, declarative building block used by the Software (a machine-readable recipe or set of instructions, not runnable foreign program code).
- "**Operator Services**" means the limited online services we operate in connection with the Software, being: distribution of the Software; the Community Library catalogue and index (served through our distribution infrastructure, clause 6.4); the publish service and publisher accounts (including sign-in for publishing); the Merit record, if and when Merit is expressly identified as available in the version you use; and, only if and when community improvement sharing is expressly identified as available in the version you use, the improvement-sharing endpoint for that capability. Operator Services do not include hosting or operating your Instance. Operator Services also do not include community discussion venues: community discussion takes place on Discord, a third-party platform operating under its own terms, and the Vaenyx Discord community is not an Operator Service.
- "**Output**" means any content generated by or through the Software, including content generated by an AI model you connect.
- "**Routine**" means a user-facing composition of one or more Methods together with declarative orchestration and its associated local records (including its Journal of inputs and Gallery of results).
- "**Sensitive Categories**" means health, finance, and family (including child-related) content, together with content in any category of "sensitive information" within the meaning of the *Privacy Act 1988* (Cth) (such as racial or ethnic origin, political opinions, religious beliefs or sexual orientation) — see clause 7.4(b). These are product-defined categories for the confirmation gate in clause 7.4(b): they include every Privacy Act sensitive-information category and are wider than that list (finance and much family content are not Privacy Act "sensitive information" but receive the same treatment). The Privacy Policy may describe these categories in more detail, but cannot narrow them or remove the confirmation requirement in clause 7.4(b).
- "**Software**" means the Vaenyx software application and framework we make available, in object or source form, including updates we supply, and its accompanying documentation, but excluding Third-Party Services and excluding content you or third parties create.
- "**Third-Party Service**" means any product or service supplied by someone other than us that you choose to use with the Software, including AI model providers (cloud or local), remote-access providers, identity providers, and community platforms (such as Discord).
- "**Verified**", in relation to Community Content, means only that the content passed our automated format and static checks at the time it was marked as such; it does not mean any person has individually reviewed the content. Wherever the product displays a "Verified" label, the label surface itself carries this qualification (for example, "Verified — automated checks only"), not only these Terms.
- "**Active Data Flow**" means a data flow identified as active for the Software version or Operator Service concerned in the Current Implementation and Data-Handling Schedule.
- "**Current Implementation and Data-Handling Schedule**" (the "**Schedule**") means the dated, version-specific factual schedule we publish for a release of the Software or an Operator Service.
- "**Optional Capability**" means a capability that operates only if it is available in the Software version or Operator Service you use and, where applicable, you choose to enable or invoke it.
- "**Point-of-Use Notice**" means a notice, consent request, contractual acceptance or other disclosure presented at or before a particular collection, use, disclosure, publication or other material action.
- "**Your Data**" means data stored in or processed by your Instance, including your chats, memories, files, settings, and each Routine's Journal and Gallery.

## 3. What Vaenyx Is (and Is Not)

3.0 **Capability status — how to tell what exists.**

  (a) The Software and Operator Services may include Optional Capabilities. An Optional Capability operates only where it is available in the version or service you use and all applicable technical prerequisites, Point-of-Use Notices, choices and legal acceptance steps have been completed.

  (b) A reference in these Terms to a **type or category** of capability, transaction, data flow or risk does not state or promise that any particular capability is available, will be introduced, or will continue. Current availability is stated in the Schedule and in the product interface for the relevant version.

  (c) The Schedule is a factual, version-specific document and is **not part of these Terms**. It cannot amend these Terms, grant us additional rights, reduce your rights, obtain a consent or licence, or itself authorise any collection, use or disclosure.

  (d) A materially expanded data flow or public-release capability must remain disabled until the applicable Privacy Policy material, Schedule entry, Point-of-Use Notice, consent or contractual acceptance, and required technical safeguard are in place.

  (e) **Release scope as at the Effective Date.** This release provides no community-sharing upload, Example attachment, de-identification or preview, or Merit. A current sharing setting is a local preference only and authorises no upload, licence or moral-rights consent. A later capability remains off until marked active, safeguarded, noticed and separately chosen.


3.1 **Free, self-hosted software.** Vaenyx is a free, self-hosted, local-first personal AI agent framework. You install it and run it on your own computer. We charge nothing for it, and the Software contains no billing functionality.

3.2 **We do not host your Instance.** We supply software and the limited Operator Services. We do not operate or monitor your Instance and have no remote access to it. We receive information from your Instance only through an Active Data Flow identified in the Schedule. A preference recorded locally does not activate a data flow and does not cause information to reach us.

3.3 **Local-first, honestly stated.** Your Data is stored on your device; we do not reach into your Instance to collect it, and information reaches us only through an Active Data Flow identified in the Schedule. The Software's model backend is pluggable: if you connect a cloud AI model provider, the content you send in chats goes to **that provider** under **your** relationship with it (clause 6), not to us; if you run a local model, that content stays on your own machine.

3.4 **Configurable restricted modes.** The Software may include, where available in your version, functionally neutral restricted-mode features (such as Custom Mode) that let the owner of an Instance limit what a given mode can access — for example allow/deny lists, time limits, entry and exit PINs, and per-mode sandboxed content — as described in the product documentation for your version. How you configure and use these features on your own Instance is your own decision and your own responsibility.

3.5 **Future changes.** We may add, change or discontinue features of the Software and the Operator Services. The Software is currently free with no billing; if we ever introduce optional paid offerings, they will be governed by separate or clearly identified updated terms, will not apply to you without notice, and will not convert Merit into a means of payment (clause 9).

## 4. Licence Grant (End User Licence)

4.1 **Grant.** Subject to these Terms, we grant you a personal, worldwide, royalty-free, non-exclusive, non-transferable licence to install, run and use the Software on hardware you control, for your personal use or your organisation's internal use.

4.2 **Open-source code licence.** The Software's source code is released under the **MIT Licence** — the LICENSE file distributed with the Software and published in its public source repository. The MIT Licence governs your use, copying, modification and redistribution of that code, and prevails over clause 4.1 for the code. These Terms continue to govern everything the MIT Licence does not address: your use of the Operator Services, Community Content, sharing and publishing, Merit, acceptable use, and the other matters these Terms cover.

4.3 **No private Vaenyx components.** Every component of the Software authored by us is released under the open-source licence described in clause 4.2; there are no privately licensed Vaenyx components. Third-party components remain under their own licences (clause 4.4), and the Vaenyx brand is separately governed by the Trademark Policy (clause 4.5).

4.4 **Third-party components.** The Software includes third-party components licensed under their own terms, including open-source libraries and, if a release bundles one, any third-party client software the installer places on your machine. The third-party providers, authentication options, infrastructure, endpoints and bundled components applicable to the version you use are identified in the current Schedule, the applicable Point-of-Use Notice and the THIRD_PARTY_NOTICES document. Those are factual notices: they are not incorporated into these Terms, and updating them does not amend these Terms unless the change alters a contractual right, obligation or risk allocation. That document states whether any such client is in fact bundled in your version (as at this version, none is: you install the remote-access client yourself and the Software only invokes it). Those terms govern those components.

4.5 **What is not licensed.** Nothing in these Terms or any open-source licence grants you any right to use the Vaenyx name, logo, icon or branding, which are governed by the Trademark Policy (clause 11.3). No IP rights are granted except as expressly stated.

4.6 **Restrictions.** You must not: (a) remove or alter copyright, attribution or licence notices in the Software; (b) misrepresent the origin of the Software or distribute a modified version under the Vaenyx brand; or (c) use the Software in breach of clause 10 (Acceptable Use). Nothing in this clause limits any right you have under an applicable open-source licence or under law that cannot be excluded (including rights relating to interoperability under the *Copyright Act 1968* (Cth)).

4.7 **Updates.** We may make updates available. Updates form part of the Software and are governed by these Terms (or by the open-source licence applicable to the updated component). You choose whether and when to apply updates to your Instance, and you are responsible for the consequences of running outdated versions.

## 5. Self-Hosting: Your Machine, Your Responsibilities

5.1 **Your hardware and environment.** You are responsible for providing and maintaining the hardware, operating system and runtime environment on which your Instance runs, and for ensuring they meet the Software's stated requirements.

5.2 **Security of your Instance.** You are responsible for securing your device and your Instance, including operating-system security, physical access, account credentials, PINs, and any network exposure you configure.

5.3 **Remote access.** The Software can integrate with a third-party remote-access service using **your own** account with that provider. To provide this integration, the Software may install a bundled third-party remote-access client on your machine (including a Windows service), or may invoke a client you have installed yourself; any such client remains a third-party component governed by its own licence and its provider's terms, and using it is your choice. Which provider, client and bundling arrangement apply to your version are factual matters identified in the Schedule and the THIRD_PARTY_NOTICES document. We do not operate the remote-access service, do not carry your traffic, and are not responsible for that provider's availability, security or terms. If we later offer remote access on infrastructure we operate, that is a different arrangement and will have its own terms and privacy treatment before it launches.

  (a) your Instance becomes reachable over the internet through your remote-access account, and you are responsible for deciding to enable it, for securing that account, and for who can reach your Instance;

  (b) the remote-access service is a Third-Party Service governed by its provider's own terms and privacy policy (clause 6); and

  (c) according to the provider's published design, TLS terminates on your machine and the provider's relays do not decrypt your traffic — but we do not control that service and do not warrant its security or availability.

5.4 **Backups.** The Software may include, where available in your version, a backup feature that can take manual and scheduled snapshots of your Instance (database and library) to a destination you choose, with optional encryption and configurable retention, as described in the product documentation for your version. Any such feature is provided as a convenience. **You remain responsible for backing up Your Data**, including configuring the backup feature (or your own alternative), verifying that backups are being created and can be restored, and safeguarding backup files and any encryption keys or passwords. If you choose to synchronise backup snapshot files to a cloud service of your own, that is your decision and your relationship with that service; you should never place the live database itself inside a cloud-sync scope.

5.5 **No hosting obligations.** Because you host the Software yourself, we have no obligation regarding your Instance's uptime, hosting environment or operational recovery. This clause does not limit our responsibility for the Software itself as we supplied it (including updates we supply), including under clause 14. Our only service-level surface is the Operator Services, which we provide on a reasonable-efforts basis.

## 6. Third-Party Services Are Your Own Relationships

6.1 **Your choice, your contract, your cost.** The Software is designed to work with Third-Party Services that **you** select and connect, including:

  (a) **AI model providers** — a cloud provider accessed through an API key or subscription you hold, including subscription-based command-line channels, or a local model runtime exposing a compatible endpoint (for example, Ollama or similar) running on your own device. You may connect one or more providers; where available in your version, you can choose a provider and capability tier for each chat;

  (b) **remote access** — a remote-access service used with your own account with that provider (plans and pricing are the provider's own); and

  (c) **identity for publishing** — a sign-in provider, used only if you choose to publish to the Community Library.

Which providers, options and endpoints apply to your version is a factual matter. The third-party providers, authentication options, infrastructure, endpoints and bundled components applicable to the version you use are identified in the current Schedule, the applicable Point-of-Use Notice and the THIRD_PARTY_NOTICES document. Those are factual notices: they are not incorporated into these Terms, and updating them does not amend these Terms unless the change alters a contractual right, obligation or risk allocation.

6.2 **Their terms govern.** Your use of each Third-Party Service is governed solely by that provider's terms, prices and privacy policy. Any fees, quotas or subscription costs charged by a Third-Party Service are your responsibility. We are not a party to, and are not responsible for, your relationship with any Third-Party Service, and we do not warrant their availability, security, accuracy or continued compatibility with the Software.

6.3 **Data sent to providers.** When you use a cloud AI model provider, the content of the relevant chats and context is transmitted to that provider and handled under its policies. Review your chosen provider's terms before connecting it, particularly if you intend to process sensitive information.

6.4 **Distribution infrastructure.** We use third-party infrastructure to deliver the Software and the Community Library, and the Software reads the published Community Library index from that infrastructure. Which providers and endpoints are used for your version is a factual matter identified in the Schedule and the THIRD_PARTY_NOTICES document. We remain responsible under these Terms for the Operator Services we provide, whatever infrastructure carries them.

## 7. Your Data, Ownership and Privacy

7.1 **You own Your Data.** As between you and us, you retain all right, title and interest in Your Data. Nothing in these Terms transfers ownership of Your Data to us. Your Data lives on your device; you can view, export, and delete it there.

7.2 **What we receive, honestly stated; we never train on Your Data.** We do not use Your Data to train AI models, and we have no remote access to your Instance.

  (a) **Local-only processing.** Information processed and held only by your Instance on hardware you control is not collected or held by us merely because the Software processes it. You control its storage, access, export, correction, deletion, security and backup.

  (b) **What reaches us.** We receive personal information from an Instance only through an Active Data Flow. For each Active Data Flow, the Schedule and the applicable Point-of-Use Notice identify the information involved, the trigger, purpose, recipient, overseas handling and retention rule. We do not maintain a fixed list of channels in these Terms, because the accurate list is version-specific: the Schedule is the authoritative current statement.

  (c) **User-directed third-party processing.** Where you direct the Software to communicate with a third-party service you selected — most commonly an AI model provider — the information you direct to that service is handled under **your** relationship with that provider. That information includes the content of the relevant conversation together with any context the Software assembles for it. We do not receive or control that information merely because the Software facilitates the connection. If you use only a local model, that processing stays on your own device.

  (d) **Public release.** Material is submitted for public release only through an available capability requiring a deliberate action by you, after a Point-of-Use Notice identifying what will leave the device, the intended audience, the attribution treatment, the applicable licence and moral-rights consent, the practical limits on later withdrawal, and any overseas or public disclosure.

  (e) **No bundled consent.** Accepting these Terms, acknowledging the Privacy Policy, installing an update or continuing to use the Software is not consent to a materially expanded collection, use, disclosure or public release. Where consent is required it must be sought separately and must be voluntary, informed, current and specific.

  (f) **Failure of prerequisites.** If the product interface, applicable notice, recorded consent, contractual acceptance or Schedule entry is absent or materially inconsistent with a proposed action, that action must remain disabled.

7.3 **Local improvement.** The Software may automatically use Your Data to improve **your own** Instance (for example, refining your own copies of Methods and maintaining local, owner-viewable and owner-editable summaries used as model context). This processing happens entirely on your device and shares nothing.

7.4 **Community sharing (the "flywheel").** Community-improvement sharing is **not available in the current release**. A sharing preference recorded at installation or in Settings is a local preference only: it authorises no upload, grants no licence and gives no moral-rights consent. If a later release provides sharing, it must remain off until the Schedule marks it active, the then-current Point-of-Use Notice is shown, and a fresh affirmative choice is recorded. Only material actually shared after that fresh choice is governed by paragraphs (a) to (d) below, and any licence and moral-rights consent required for it must be presented and recorded at that activation or at the per-item confirmation. Where sharing has become available and occurs on that basis:

  (a) sharing is designed so that only de-identified improvement patterns — not your raw data — leave your device: de-identification is applied on your device to every example before it is sent. De-identification and classification are automated processes and, like all automated processes, are imperfect: they reduce risk but cannot guarantee that no personal information will ever pass through. If the de-identification gate fails and personal information is shared, we will remove that material from the operator-controlled warehouse as described in clause 8.5 and will notify known mirrors and request its removal; the licences granted under this clause never extended to that personal information (see the de-identification-failure paragraph of this clause 7.4); Core Privacy Policy clause 9.4 describes the full handling protocol and cannot reduce these commitments;

  (b) content our automated classifier identifies as falling within the Sensitive Categories — health, finance, and family (including child-related) content, together with every Privacy Act sensitive-information category, as defined in clause 2 of these Terms — is not shared automatically and requires your separate, explicit confirmation; content the classifier cannot confidently classify is held for your review rather than shared automatically. The classifier is automated and imperfect and may misclassify content; content it misses receives the de-identification protection in clause 7.4(a) but will not have received this confirmation step. The Privacy Policy may describe the Sensitive Categories in more detail but can never narrow them or remove this confirmation requirement;

  (c) shared examples become public as part of the Community Library, and that publication may be effectively permanent (clause 8.6); and

  (d) **licence for shared examples.** So that content that becomes public in the Community Library is licensed, by your affirmative act of turning sharing on (or, for an example confirmed through review-each, by that confirmation) you grant, for each example shared under this clause and from the moment it is shared, the following licences — set out in full here so that their scope is fixed by the version of these Terms you accepted and cannot be broadened by any other document:

    (i) to us, a non-exclusive, perpetual, irrevocable, worldwide, royalty-free licence to host, store, reproduce, adapt (including by de-identification, format normalisation and combination with other material), publish, distribute and communicate the shared example as part of the Community Library and the Operator Services;

    (ii) to each person who receives the shared example through the Community Library, a non-exclusive, perpetual, worldwide, royalty-free licence to use, reproduce and adapt it for use with the Software; and

    (iii) to the public, the Creative Commons Attribution 4.0 International public licence (**CC BY 4.0**).

  These licences correspond to the licences that clause 5 of the Contributor Agreement grants in respect of a published Contribution, and they apply whether or not you ever publish content or accept the Contributor Agreement; if the Contributor Agreement's licence text differs from the text above, the text above governs examples shared under this clause. These licences are irrevocable; their scope is limited only as stated in the de-identification-failure paragraph of this clause (they never extended to material you had no right to license) and they operate alongside the CC BY 4.0 terms.

  **Rights in shared examples.** You warrant that each example shared under this clause from your own use of your Instance is derived from content in which you hold the rights needed to grant these licences. Automatic sharing applies only to your own use of your Instance: for use of your Instance by any other person you permit under clause 1.3, the sharing setting is review-each or off unless you positively confirm, for that person's use, that you hold the rights needed to grant these licences over content derived from it (including any moral rights consent required from that person). You must not enable automatic sharing for another person's use without that confirmation, and any example you confirm through review-each is warranted by you on the same basis as your own.

  **Moral rights consent.** For the purposes of Part IX of the *Copyright Act 1968* (Cth), including section 195AWA, you expressly consent in writing — in relation to works of the following particular description: improvement examples derived from your use of Methods and Routines through your Instance, in the de-identified form generated by the Software for sharing under this clause, in each case of which you are an author — to those works being reproduced, published, communicated and adapted without attribution of authorship, and with the alterations involved in de-identification, format normalisation and combination with other material, in each case by us and by anyone acting under a licence granted under this clause or clause 8.6(e). This consent is presented, and your acknowledgement of it recorded, at the install-time sharing choice (clause 1.5) as a step separate from your acceptance of these Terms, and it is restated at each review-each confirmation in respect of the specific examples then shared. For Contributions you publish, the corresponding moral rights consent is given as part of each publish step under the Contributor Agreement (clause 8.6(c)), not under this paragraph.

  **De-identification failure — scope of licences.** No licence granted under this clause (or under clause 8.6(e)) ever extended to third-party personal information, or to any other material, that the sharer had no right to license: each licence operates only on what the sharer could lawfully grant. If shared or published material is found to contain personal information in breach of clause 7.4(a), we will act under clause 8.5 to remove it from the operator-controlled warehouse and will notify known mirrors and request its removal. Nothing in this paragraph revokes, or qualifies the irrevocability of, any licence over material that was validly licensed.

  Because no creator identification is supplied with shared examples, CC BY 4.0's requirement to retain creator attribution has nothing to operate on; the licence's other conditions — retaining the licence notice and licence URI, and indicating modifications — continue to apply to anyone who reshares the material.

7.5 **Publishing account data.** You do not need any account to use the Software or the Community Library. If you choose to publish, we store only the account information identified in the Schedule and reasonably necessary for authentication, attribution, management and moderation of your published content, security, and evidencing your publish-time acceptance. Your public byline is a display name you choose and can edit; your verified sign-in identity is not published.

7.6 **Privacy Policy and the Schedule.** Our handling of any personal information we actually receive is described in the Vaenyx Core Privacy Policy. The Core Privacy Policy is a notice describing our information-handling practices, not a contract term: at installation you are asked to acknowledge it, not to agree to it, and it is not incorporated into these Terms. If these Terms and the Core Privacy Policy differ in their description of a privacy matter, the Core Privacy Policy's description prevails only to the extent it describes our practices more protectively of you: the Core Privacy Policy can never reduce a protection stated in these Terms, narrow the Sensitive Categories, weaken the confirmation requirement in clause 7.4(b), or widen an Active Data Flow beyond clause 7.2 — any such change can be made only by amending these Terms under clause 18.2. **The Schedule is descriptive only:** it describes Active Data Flows as they are actually implemented; it does not create or widen one, and describing an operational flow accurately does not widen a data channel.

## 8. Community Library and Community Content

8.1 **What it is.** The Community Library lets users share Methods and Routines. Community Content is **declarative only**: recipes and instructions interpreted by the Software, not runnable foreign program code. This is a deliberate safety property of the design.

8.2 **User-generated; not endorsed.** Community Content is created by third parties, except items we expressly publish under our own name (which we supply subject to clause 14). We do not endorse Community Content; any review we perform is limited to the process described in clause 8.4, and **no Community Content is endorsed by us as professional advice of any kind**. You decide what to install and enable, and you use Community Content created by third parties at your own risk.

8.3 **Safety measures are risk-reduction, not guarantees.** We apply safety measures to the Community Library, which may include: binding trust to exact content hashes and pinned model versions; blocking look-alike names and reserving names at submission; time-gated "trusted creator" status that is automatically revoked on identity change; automated per-version safety scanning with a scorecard; keeping newly installed content inert until you enable it, with per-action capability scoping; and immutable versioning with Routines pinning Method versions. These measures **reduce risk but do not guarantee** that any Community Content is safe, accurate, lawful or fit for your purpose, and we do not warrant that they will detect every problem.

8.4 **"Verified" labels.** A "Verified" label means only that the item passed our automated format and static checks at the time of labelling — no person has individually reviewed it — and the label is displayed in the product with that qualification on the label surface itself (for example, "Verified — automated checks only"), not only in these Terms. It is not an endorsement, a guarantee of quality or safety, or professional advice. Unlabelled ("community") items are used entirely at your discretion.

8.5 **Moderation and takedown.** Publishing to the Community Library is not pre-moderated: published items go live after automated checks, without prior human review (clause 8.6). We operate a reactive moderation process through an operator-controlled back office: we may label, re-classify, suspend, remove or take down Community Content, and may revoke Verified status or creator privileges, at any time, including in response to reports; and we may bar a publisher from further publishing (including, where appropriate, taking down that publisher's published items) in accordance with clause 17.2, including without prior notice where clause 17.2(b) applies. This process involves no access by us to your Instance (clause 3.2). To report content, contact hello@vaenyx.ai; email to hello@vaenyx.ai is handled on overseas servers, so include only what is needed for us to act, and avoid attaching personal information where an item link or identifier is enough. A report should identify the content (URL or item identifier), explain what is said to be wrong with it (for a defamation complaint, the imputations complained of), and give the complainant's name and contact details — a report containing these particulars is a duly-made complaint. For a complaint that content is defamatory, a complaint is duly made — and the 7-day period below starts — as soon as we receive, through an accessible complaints mechanism, a written complaint that (a) identifies the plaintiff (the person of or concerning whom the matter is alleged to have been published); (b) identifies the matter complained of and its location well enough for us to locate it (for example, a URL or item identifier); and (c) states that the plaintiff considers the matter to be defamatory of them. This threshold reflects the statutory minimum for a concerns notice under section 31A of the *Defamation Act 2005* (NSW) (and its interstate equivalents); the poster's identity, the specific imputations complained of, the reasons the matter is claimed to be defamatory, and the complainant's further contact details and any supporting evidence are helpful particulars that we may request, but their absence does not delay the start of that 7-day period once a complaint meeting (a)–(c) is received. A report that lacks some of these particulars is still received, triaged and assessed; the particulars affect only whether it is a duly-made complaint for the purposes of this clause. We aim to action valid reports of seriously harmful material of the kind regulated under Australian online-safety law within 24 hours of receipt; that 24-hour aim is a service target, not a guarantee. For duly-made complaints that Community Content is unlawful (including that it is defamatory), we will assess the complaint and take the steps (if any) to remove or disable access to the content that are reasonable in the circumstances, as soon as practicable and in any event within 7 days of receiving the complaint. Where we remove or disable access to a publisher's content in response to a complaint, we will notify the publisher where practicable; the publisher may respond through the same contact channel, we will consider that response, and we may restore content where we are satisfied removal was not warranted. Where published or shared material is found to contain personal information in breach of the de-identification promise (clause 7.4(a)), we will remove that material from the operator-controlled warehouse — including by rewriting repository history where necessary — and will request its removal from known mirrors. Removal from the Community Library does not automatically delete copies already installed on users' devices, although your Instance — acting on the published library index it reads — may locally surface warnings about, or disable, affected items where feasible; this mechanism involves no access by us to your Instance.

8.6 **Publishing.** Everything you create defaults to your private local library (shown in the product as the "Library"). Methods and Routines you create reach the public Community Library only if you explicitly publish them; separately, de-identified improvement examples are shared to the Community Library under clause 7.4 only if you have affirmatively turned that sharing on (and subject to any restriction you set). Publishing:

  (a) **requires sign-in** with a Google or GitHub account, at your choice. You never need a GitHub account to publish — either provider works, and having a GitHub account gives no advantage. Your public byline is a self-chosen, editable display name; your verified sign-in identity remains private (Privacy Policy);

  (b) **occurs through our publish service.** A publication submission contains only the declarative item files, your account identifier, the public byline you choose and the acceptance records identified in the Schedule. It does not include Examples or raw corrections, no Example de-identification or preview is performed on it, and no Merit is recorded for it. Local examples and raw corrections are not sent or published. If a later version permits examples to be attached, that feature will not be enabled until the Software de-identifies them on-device, shows you the exact material proposed for publication, and requires your express approval. Your Instance sends those files to the publish service we operate; that service alone holds the credentials used to write to the public content warehouse — the Software never holds or stores any warehouse write token on your machine. The service validates the submission (declarative-only, path-safety and size checks, and enforcement of the de-identification of examples as a backstop — non-conforming submissions are rejected, not rewritten), stamps your display name into the published item, commits it to the public warehouse repository, and records Merit;

  (c) **is governed by the Contributor Agreement** (incorporated by reference for publishers), including the warranties you confirm as part of each publish step;

  (d) **is not pre-moderated**: your item goes live on publication, subject to the automated checks in (b) and to our reactive moderation and takedown powers (clause 8.5); and

  (e) **licenses the published content publicly.** Only content actually included in a publication submission is licensed on publication. On publication, that content is licensed to the public under **CC BY 4.0**, in addition to the direct licences in clause 5 of the Contributor Agreement. Downstream forks, mirrors and reuse may rely on the CC BY 4.0 licence, which is irrevocable per its terms. As stated in the de-identification-failure paragraph of clause 7.4, no licence granted on publication ever extended to third-party personal information or other material you had no right to license; if published material is found to contain personal information in breach of the de-identification design, we will act under clause 8.5 to remove it and will notify known mirrors.

  **Published content becomes public, and publication may be effectively permanent:** published content and shared examples may be retained in version history, forks, mirrors, caches and user installations, and removal from the Community Library cannot guarantee deletion of all copies (clause 8.5; see also Contributor Agreement clause 10.4 and Core Privacy Policy clauses 7.7, 9.4 and 11).

8.7 **Official Discord server.** The official Vaenyx Discord server is a community venue on Discord, a third-party platform governed by Discord Inc.'s own terms (clause 6.2; as stated in clause 2, it is not an Operator Service). We administer that server. Reports about content in that server may be made to the same address as content reports under clause 8.5 (hello@vaenyx.ai), and, where we have the practical ability to remove the content within that server, the report-and-takedown response targets in clause 8.5 apply to it in the same way.

## 9. Merit — a Non-Monetary Reputation Record

9.1 **Merit is not provided at the Effective Date.** Clauses 9.2 to 9.5 apply only if and while the Schedule marks Merit active. If provided, Merit is a record of creator reputation reflecting the usefulness of contributions, and exists solely as recognition.

9.2 **Merit is never money.** Merit: (a) has **no cash or monetary value**; (b) is **not** a currency, virtual currency, security, derivative, financial product, credit, deposit, or property interest of any kind; (c) cannot be purchased, sold, exchanged, transferred, assigned, pledged, or redeemed — whether for cash, for anything of monetary value, or for anything else; (d) is add-only in the sense that use of the Software never spends or decrements it — there is **no spend operation** (subject only to integrity adjustments under clause 9.3); and (e) confers no ownership, voting, revenue, or other rights against us.

9.3 **Integrity adjustments.** We may recalculate, adjust, suspend or remove Merit at any time to preserve the integrity of the system (for example, to correct errors or address manipulation, fraud, or breach of these Terms or the Contributor Agreement).

9.4 **Earning; no perks, no spending — ever.** Earning Merit requires a verified sign-in. Merit is recognition only, and that position is permanent: there is no path — and none will be added — by which Merit can be spent, redeemed, exchanged, or used to unlock perks, compute allowances, goods, services, or anything else of value. Merit will never be convertible to cash and will never function as a means of payment. We give no commitment that Merit will continue to exist.

9.5 **No compensation.** Contributions are voluntary and unpaid. Merit is not wages, consideration, or compensation for anything.

## 10. Acceptable Use

10.1 You must not use the Software or the Operator Services to:

  (a) violate any applicable law or regulation, or infringe any person's rights (including intellectual property, privacy, and confidentiality);

  (b) create, publish or distribute content that is unlawful, harmful, deceptive or misleading, or that is designed to harass, defraud or exploit any person;

  (c) attack, probe, disrupt or gain unauthorised access to any system, network, account or data belonging to another person, or to the Operator Services;

  (d) circumvent or attempt to circumvent the declarative-only constraint of Community Content, the inert-by-default and capability-scoping controls, safety scanning, or any other safety or integrity measure of the Software or the Operator Services;

  (e) manipulate Merit, reviews, rankings, Verified status, or attribution, or impersonate any person or creator when publishing;

  (f) abuse the publishing service, feedback endpoints, or distribution infrastructure, including by automated bulk submission, scraping at disproportionate volume, or introducing malicious content; or

  (g) misrepresent Output as independently verified fact or as professional advice in circumstances where that misrepresentation could cause harm.

10.2 You are responsible for complying with laws that apply to **your** use of the Software in your circumstances, including privacy and surveillance laws applying to data about other people that you process on your Instance.

10.3 If you breach this clause 10, we may exercise our rights under clauses 8.5 and 17.2 in addition to any other rights we have.

## 11. Intellectual Property and Trademarks

11.1 **Our IP.** We and our licensors retain all intellectual property rights in the Software and the Operator Services. These Terms grant only the licences expressly stated; all other rights are reserved.

11.2 **Your IP and contributors' IP.** You own Your Data (clause 7.1). Contributors retain ownership of their Community Content, which is licensed as described in the Contributor Agreement and under CC BY 4.0 (clause 8.6(e)).

11.3 **Trademarks.** The Vaenyx name, logo and icon are our trademarks. They are currently unregistered: we assert them as unregistered trade marks (using the ™ symbol, never ®), and an Australian trade mark application is planned near launch. They are **not** licensed under these Terms or under any open-source code licence. Use of the brand is governed by the Vaenyx Trademark Policy: in summary, forks and modified distributions must be rebranded; truthful, non-misleading references (such as "compatible with Vaenyx" or "forked from Vaenyx") are permitted; and you must not use the brand in a way that suggests affiliation or endorsement. Vaenyx is not affiliated with any similarly named product.

11.4 **Feedback.** If you give us feedback, suggestions or ideas about the Software or the Operator Services, you grant us a perpetual, irrevocable, worldwide, royalty-free licence to use them without restriction or obligation to you. This clause does not apply to Your Data.

11.5 **Originality and interoperability.** The Software is an original work. Statements of factual interoperability with open standards (such as MCP or Agent Skills) are descriptive only and do not imply affiliation with the stewards of those standards.

## 12. AI Output: Disclaimer and Your Judgment

12.1 **AI can be wrong.** The Software produces Output using AI models. Output is probabilistic and **may be inaccurate, incomplete, out of date, biased, or misleading**, and may vary between models and runs. We do not verify Output.

12.2 **Not professional advice.** Output is provided for general information and assistance only. **Output is not professional advice of any kind — in particular, it is not medical or health advice, legal advice, financial or investment advice, tax advice, or any other advice requiring professional qualification** — and must not be relied on as such. For decisions in these areas, consult a qualified professional.

12.3 **Health — highest risk.** We publish no official health Methods or Routines: the library content we supply under our own name contains none, and we make no health claims for the Software. Do not rely on the Software or any Output for diagnosis, treatment decisions, or medication decisions of any kind. **The Software must never be used to determine, set, or adjust medication or dosage.** General health conversation is not blocked, but health-related content carries a persistent health disclaimer, and before health-related content is used the product requires a one-time explicit acknowledgement of these limits. Community Content addressing health topics is created by third parties and is additionally marked as not endorsed by us (clauses 8.2 and 8.4). In an emergency, contact emergency services immediately (in Australia, call 000). Nothing produced by the Software is a substitute for a qualified health practitioner.

12.4 **Your judgment and your actions.** You must exercise your own judgment before acting on any Output, verify anything important through authoritative sources, and remain responsible for all decisions you make and actions you take (or allow the Software to take on your behalf) based on Output.

12.5 **In-app notices.** Short contextual notices in the product (for example, "AI can be wrong — verify important things") summarise this clause; this clause governs.

## 13. Disclaimers of Warranty

13.1 **Supplied free, as-is.** The Software is supplied free of charge. To the maximum extent permitted by law, and subject to clause 14, the Software, the Operator Services, Community Content and Output are provided **"as is" and "as available"**, without warranties, representations or conditions of any kind, whether express or implied, including any implied warranty of merchantability, fitness for a particular purpose, accuracy, reliability, non-infringement, or uninterrupted or error-free operation.

13.2 **No specific outcomes.** Without limiting clause 13.1 and subject to clause 14, we do not warrant that: (a) the Software will meet your requirements or be compatible with your environment or with any Third-Party Service; (b) Output will be accurate or fit for any purpose; (c) Community Content is safe, accurate or lawful; (d) the Operator Services will be available at any particular time; or (e) backups created by the backup feature will be complete or restorable in your environment — you must verify your own backups (clause 5.4).

13.3 **Open-source components.** Where an open-source licence applicable to a component contains its own warranty disclaimer, that disclaimer applies to that component in addition to this clause.

## 14. Australian Consumer Law — Non-Excludable Rights Preserved

14.1 **Consumer guarantees preserved.** Nothing in these Terms excludes, restricts or modifies, or is intended to exclude, restrict or modify, any consumer guarantee, right or remedy conferred on you by the ACL or by any other applicable law that cannot lawfully be excluded, restricted or modified. Where the ACL applies to a supply under these Terms, our goods and services come with guarantees that cannot be excluded.

14.2 **Permitted limitation (ACL s 64A).** Where a law (including section 64A of the ACL) permits us to limit our liability for failure to comply with a guarantee (other than guarantees as to title, undisturbed possession and undisclosed securities), our liability for that failure is limited, at our option, to:

  (a) in the case of goods — replacing the goods or supplying equivalent goods; repairing the goods; paying the cost of replacing the goods or of acquiring equivalent goods; or paying the cost of having the goods repaired; and

  (b) in the case of services — supplying the services again; or paying the cost of having the services supplied again.

This clause 14.2 does not apply where the goods or services are of a kind ordinarily acquired for personal, domestic or household use or consumption, or where it would not be fair or reasonable for us to rely on it (ACL s 64A(3)); in those cases your ACL remedies apply without the limitation in this clause.

14.3 **Precedence.** This clause 14 prevails over every other provision of these Terms, including clauses 13, 15 and 16, to the extent of any inconsistency.

## 15. Limitation of Liability

15.1 **Excluded loss.** Subject to clauses 14 and 15.3, neither party is liable to the other for loss to the extent that it is indirect and was not reasonably foreseeable when these Terms were accepted. This clause does not exclude or limit loss recoverable under the ACL or the reasonable direct cost of restoring or reconstructing data where its loss or corruption was caused by that party's breach, negligence or wilful misconduct.

15.2 **Caps.** Subject to clauses 14 and 15.3, each party's total aggregate liability to the other arising from any one event or series of related events in connection with these Terms, including liability under clause 16, is limited to AUD $10,000. Each party's total aggregate liability for all events occurring in a Contract Year is limited to AUD $20,000.

Claims arising from the same or substantially the same facts or circumstances are treated as one series of related events. "Contract Year" means each 12-month period beginning on the date you first accept these Terms and each anniversary of that date.

15.3 **What is not limited.** Nothing in this clause 15 excludes or limits:

  (a) any consumer guarantee, right, remedy or liability preserved by clause 14;

  (b) liability that cannot lawfully be excluded or limited;

  (c) either party's liability for fraud or wilful misconduct, or for death or personal injury caused by its negligence;

  (d) either party's liability for knowing infringement of a third party's intellectual-property rights or knowing unlawful disclosure of another person's personal information;

  (e) our liability for misleading or deceptive conduct, false or misleading representations, or unconscionable conduct under the Australian Consumer Law; or

  (f) our liability arising from breach of an express privacy, confidentiality or security obligation under these Terms or applicable law, our negligent or unlawful handling of personal or confidential information that we hold or control, our negligent operation of a publishing, sharing or de-identification process, or our breach of an express removal commitment.

15.4 **Basis of risk allocation.** The allocations of risk in clauses 5, 6, 8, 12, 13 and 15 reflect the following facts: the Software is supplied free of charge, is self-hosted on your own hardware, and interoperates with Third-Party Services you choose. This clause records the factual basis on which we make those allocations; it is not an acknowledgment or admission by you and does not limit any assessment a court or tribunal may make.

## 16. Indemnities

16.1 **By you.** Subject to clauses 14, 15 and 16.3, and to the extent permitted by law, you indemnify us against loss, damage, liability and reasonable costs, including reasonable legal costs, arising from a third-party claim to the extent caused by:

  (a) your deliberate or reckless breach of an acceptable-use obligation or rights warranty in these Terms;

  (b) content you share or publish that you knew was, or were recklessly indifferent to whether it was, unlawful or infringed a third party's rights; or

  (c) your knowingly unlawful use of the Software or an Operator Service.

The indemnity is reduced proportionately to the extent the loss was caused or contributed to by us and does not apply to an honest mistake made in good faith. A claim arising out of or relating to a Contribution is governed by clause 12 of the Contributor Agreement, which prevails to the extent of any inconsistency. The caps in clause 15.2 are single and combined across these Terms and the Contributor Agreement: amounts recovered under either document count towards the same per-event and annual caps.

16.2 **By us.** Subject to clauses 14, 15 and 16.3, and to the extent permitted by law, we indemnify you against loss, damage, liability and reasonable costs, including reasonable legal costs, arising from a third-party claim to the extent caused by:

  (a) our breach of these Terms; or

  (b) our unlawful act or omission or negligence in providing the Software or an Operator Service.

The indemnity is reduced proportionately to the extent the loss was caused or contributed to by you, including through your modification of the Software, combination of it with another product, or breach of these Terms. Liability under this indemnity is subject to clause 15.2 except to the extent clause 14 or 15.3 applies.

16.3 **Conduct of claims.** The indemnified party must notify the indemnifying party promptly; delay reduces the indemnity only to the extent it causes actual prejudice. The indemnifying party may participate in the defence at its own cost. The indemnified party must not admit liability or settle without the indemnifying party's consent, which must not be unreasonably withheld or delayed. Each party must give reasonable cooperation and take reasonable steps to mitigate loss. An indemnity covers only amounts finally awarded by a court, agreed in a settlement consented to under this clause, or reasonably incurred in defending the claim.

## 17. Termination

17.1 **By you.** You may stop using the Software at any time by uninstalling it. These Terms terminate for you when you cease all use and delete your copies (except to the extent an open-source licence independently continues to govern code you retain).

17.2 **By us — Operator Services.** We may suspend or terminate your access to the Operator Services (including publishing, your publisher account, and Merit) if: (a) you materially breach these Terms or the Contributor Agreement and, where the breach can be remedied, fail to remedy it within a reasonable period after notice; (b) suspension is reasonably necessary to protect the integrity or security of the Operator Services or other users; or (c) we discontinue the relevant Operator Service (clause 18.1). Where practicable we will give you notice and the reason.

17.3 **Code licence unaffected.** Code you hold under an open-source licence (clause 4.2) is governed by that licence, which these Terms do not and cannot terminate. Termination under this clause 17 affects your access to the Operator Services and the permissions these Terms grant — not your rights under the MIT Licence.

17.4 **Effect on your Instance.** Termination of Operator Services access does not disable your Instance or delete Your Data: the Software on your own hardware remains yours to run under the licence terms that apply to it (clauses 4.2 and 17.3), subject to these Terms.

17.5 **Survival.** Clauses 2, 4.4–4.6, 7.1, 7.4 (in respect of examples shared before termination, including its licences, warranty, moral rights consent and de-identification-failure paragraph), 9, 11, 12, 13, 14, 15, 16, 17.3, 17.5 and 19, and any other provision that by its nature should survive, survive termination.

## 18. Changes to the Software and to these Terms

18.1 **Changes to the Software and Operator Services.** We may modify, suspend or discontinue part of the Software or Operator Services where reasonably necessary for security, legal, operational or project-sustainability reasons. We will act reasonably and proportionately and, except where urgent action is reasonably necessary or circumstances are outside our reasonable control, give reasonable advance notice of a material suspension or discontinuance. This does not remove Software already installed on your device or affect accrued or non-excludable rights. A change to a capability that remains within these Terms does not require an amendment to these Terms; we must nevertheless update any Schedule entry, Point-of-Use Notice, consent or documentation required to describe the change accurately **before** enabling it.

18.1A **Fresh acceptance for material amendments.** We will seek fresh affirmative acceptance before applying an amendment to these Terms that materially: (a) increases your contractual obligations; (b) expands a licence over Your Data or material you share; (c) reduces an express right or remedy; (d) materially changes an indemnity or liability allocation; or (e) introduces a charge. **Continued use alone is not acceptance of a change described in this clause.** Material you have already shared or published remains governed, as to the licence and moral-rights consent granted at submission, by the wording accepted for that submission; a later amendment does not retrospectively expand that grant without fresh consent.

18.2 **Changes to these Terms.** Subject to clause 18.1A, we may update these Terms from time to time. We will make the updated Terms available in the product and/or the source repository with an updated effective date, and for a material amendment we will give reasonable advance notice. Changes do not apply retroactively. Only for an amendment that is **not** material under clause 18.1A does your use of the Operator Services after its effective date, or your installation of an update released under it, constitute acceptance. An amendment described in clause 18.1A applies to you only after fresh affirmative acceptance.

18.3 **Version record.** We will identify each version of these Terms by its effective date.

## 19. General

19.1 **Governing law and jurisdiction.** These Terms are governed by the laws of Victoria, Australia. Each party submits to the non-exclusive jurisdiction of the courts of Victoria and the courts competent to hear appeals from them. Nothing in this clause limits any non-excludable right you have to bring proceedings under the consumer protection laws of the place where you live.

19.2 **Severability.** If any provision of these Terms is void, unenforceable or illegal, it is severed to the minimum extent necessary, or read down where possible, and the remainder of these Terms continues in force.

19.3 **Entire agreement.** These Terms and, for a publisher, the Contributor Agreement are the entire agreement between you and us about their respective subject matter, and supersede prior understandings about it. The Trademark Policy and any applicable open-source or public-content licence operate independently on their own terms. The Core Privacy Policy, the Current Implementation and Data-Handling Schedule and the THIRD_PARTY_NOTICES document are factual notices and are **not** incorporated into these Terms; nothing in them reduces a protection stated here.

19.4 **Assignment.** We may assign these Terms only to a bona fide successor that agrees in writing to assume our obligations. An assignment must not materially reduce your rights, increase your obligations, expand rights in Your Data or a Contribution, or otherwise materially prejudice you. We will give reasonable advance notice where practicable; if an assignment would materially prejudice you, we must obtain your consent.

19.5 **No waiver.** A failure or delay in exercising a right is not a waiver of it. A waiver is effective only if in writing.

19.6 **No partnership.** Nothing in these Terms creates a partnership, joint venture, employment, or agency relationship between you and us.

19.7 **Notices.** We give notices through the product interface, the source repository, or (for publisher account holders) the contact details associated with your account. You may contact us at hello@vaenyx.ai.

19.8 **Language.** These Terms are drafted in English. Translations (including the Chinese version) are provided for convenience only; **the English version prevails** to the extent of any inconsistency.

19.9 **Interpretation.** Headings are for convenience only. "Including" means "including without limitation". A reference to a statute includes its amendments and replacements.

## 20. Contact

Questions about these Terms, content reports, and legal notices: Vae Foundry Pty Ltd, hello@vaenyx.ai.
