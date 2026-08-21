// Lightweight in-app i18n: a language state (en/zh) + a string lookup table.
// Real-time switch (React context re-renders), per-device memory (localStorage,
// like the theme), default English. UI strings migrate into STRINGS gradually —
// any key not yet translated falls back to English, then to the key itself, so
// un-migrated text just stays as-is. Long-form content (e.g. the Glossary) does
// NOT live here; it is rendered from its own markdown files.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { fetchSystemStatus, setAppLanguage } from "./api.js";
import { isKeyRenderable } from "./capabilities.js";

export type Lang = "en" | "zh";

const LANG_STORAGE_KEY = "vaenyx.lang";
const DEFAULT_LANG: Lang = "en";

// Seed dictionary. Add keys here as UI strings are migrated; English is the base.
const STRINGS: Record<Lang, Record<string, string>> = {
  en: {
    "title.ask-vaenyx": "Vaenyx Portal",
    "title.projects": "Projects",
    "title.scheduled": "Scheduled",
    "title.library": "Library",
    "title.community": "Community",
    "community.intro":
      "Methods and Routines published by people everywhere. Installing one copies it into your own Library.",
    "library.tierCommunity": "Community",
    "community.discord.link": "Join the community on Discord →",
    "community.report.routine": "Report This Routine",
    "community.report.method": "Report This Method",
    "community.report.email": "Email hello@vaenyx.ai",
    "community.report.category": "What is the problem?",
    "community.report.categoryPrompt": "Choose one…",
    "community.report.category.defamation": "Defamation",
    "community.report.category.privacy": "Privacy / personal information",
    "community.report.category.copyright": "Copyright",
    "community.report.category.illegal": "Illegal content",
    "community.report.category.safety": "Safety",
    "community.report.category.other": "Something else",
    "title.modes": "Modes",
    "title.settings": "General",
    "title.vaenyx-me": "Vaenyx Me",
    "title.guard": "Guard",
    "title.discord": "Discord",
    "title.help": "Help & Glossary",
    "common.back": "← Back",
    "settings.language.title": "Language",
    "settings.language.copy":
      "Choose the app language. Switches instantly; notifications follow it too.",
    "settings.language.english": "English",
    "settings.language.chinese": "中文",
    "settings.help.eyebrow": "Help",
    "settings.help.title": "Help & Glossary",
    "settings.help.copy":
      "Plain, short definitions of everything you see in Vaenyx.",
    "settings.help.open": "Open Help & Glossary",
    "settings.manual.eyebrow": "Help",
    "settings.manual.title": "Manual",
    "settings.manual.copy":
      "Everything Vaenyx does: what it is, where to press, what happens.",
    "disclaimer.ai": "AI can make mistakes — double-check anything important.",
    "disclaimer.health":
      "This isn't medical advice. Follow your doctor for medication, dosage, and diagnosis — don't use this to set doses or replace a doctor.",
    "disclaimer.finance":
      "Not financial or tax advice — check important decisions with a professional.",
    "disclaimer.legal": "Not legal advice.",
    "disclaimer.community":
      "Community Methods/Routines are made by other users and aren't vetted by Vaenyx as professional advice. 'Verified' means automated checks passed — not that a person reviewed it; community items are at your discretion.",
    "disclaimer.remote":
      "Remote access is optional and runs through a third-party service using your own account with that provider, under their terms. Third-Party Notices names the provider used by this version.",
    "disclaimer.model":
      "Connecting a cloud model (e.g. OpenAI, Gemini) follows that provider's terms and any costs are yours. A local model (e.g. Ollama) runs on your own machine.",
    "disclaimer.confirmTitle": "Before you use this",
    "disclaimer.confirmContinue": "I understand — continue",
    "settings.legal.eyebrow": "Legal",
    "settings.legal.title": "Legal",
    "settings.legal.copy":
      "The short notes below summarise the legal position in plain language. The documents linked at the bottom of this page are the ones that actually govern, and the Schedule states what this release actually does.",
    "settings.backup.tab": "Backup",
    "settings.backup.eyebrow": "Data protection",
    "settings.backup.title": "Backup & Restore",
    "settings.backup.copy":
      "Save a snapshot of your Vaenyx — your settings, chats, tokens, and your own Methods & Routines — or roll back to an earlier one. Backups are plain files kept on this machine only: never uploaded, no GitHub, no account or login needed.",
    "settings.backup.schedule": "Automatic backup",
    "settings.backup.scheduleOff": "Off",
    "settings.backup.scheduleDaily": "Daily",
    "settings.backup.scheduleWeekly": "Weekly (Sundays)",
    "settings.backup.scheduleHour": "At (hour)",
    "settings.backup.lastAuto": "Last automatic backup",
    "settings.backup.lastAutoNever": "Not yet run.",
    "settings.backup.lastAutoOk": "succeeded",
    "settings.backup.lastAutoFail": "FAILED — check the destination drive",
    "settings.backup.password": "Backup password (optional encryption)",
    "settings.backup.passwordHintOn":
      "Encryption is ON. Leave empty to keep the current password; type a new one to replace it.",
    "settings.backup.passwordHintOff":
      "Empty = no encryption. Set a password and new backups become encrypted files.",
    "settings.backup.passwordWarn":
      "If you lose this password, encrypted backups CANNOT be opened. Write it down somewhere safe.",
    "settings.backup.passwordClear": "Turn encryption off",
    "settings.backup.destination": "Backup folder",
    "settings.backup.destinationHint":
      "Full path. Leave empty for the default folder on this machine; set another disk, USB drive or NAS to keep copies off this machine.",
    "settings.backup.keep": "Keep most recent",
    "settings.backup.keepHint":
      "Older backups are removed automatically after each new backup. Empty = keep all.",
    "settings.backup.saveConfig": "Save backup settings",
    "settings.backup.configSaved": "Backup settings saved.",
    "legal.notice.backup.cloudSync":
      "You can point your own cloud-sync service at the backup folder — that's your choice, under that service's terms. Never sync the live Vaenyx data folder itself.",
    "settings.backup.create": "Create backup now",
    "settings.backup.creating": "Creating backup…",
    "settings.backup.created": "Backup created.",
    "settings.backup.refresh": "Refresh",
    "settings.backup.empty": "No backups yet. Create your first one above.",
    "settings.backup.loading": "Loading backups…",
    "settings.backup.restore": "Restore",
    "settings.backup.safety": "Auto safety copy",
    "settings.backup.methodsLabel": "Methods",
    "settings.backup.routinesLabel": "Routines",
    "settings.backup.dbOnly": "Database only",
    "settings.backup.restoreTitle": "Restore this backup?",
    "settings.backup.restoring":
      "Restoring… Vaenyx is restarting. Reload this page in about 30 seconds.",
    "settings.backup.cancel": "Cancel",
    "settings.backup.error": "Something went wrong. Please try again.",
    "apps.token.externalNote":
      "A Token is for an external app. You don't need a Token to use Methods inside Vaenyx's own web app — just open the Library.",
    // TYPE A / TYPE B are the names the Owner uses when he talks to a
    // developer, so they are the names on screen. The consequence sentence
    // stays underneath: the label is what you say out loud, the sentence is
    // what you actually decide on.
    "apps.token.fetchRecipe.label": "Fetch recipe (Type B)",
    "apps.token.fetchRecipe.desc":
      "Type A (default): Run in Vaenyx. Type B (this box): Run in the third-party app with their own AI model.",
    "apps.token.sendFeedback.label": "Send corrections",
    "apps.token.sendFeedback.desc":
      "Let this external app send users' corrections back to Vaenyx to feed the flywheel, so the method gets better. The app must already be allowed to use that method.",
    "publish.title": "Publish to community",
    "publish.intro":
      "Share this Method so other families can find and install it. Your private correction data is never shared.",
    "publish.notConfigured": "Publishing isn't set up on this server yet.",
    "publish.signin": "Sign in with Google to publish",
    "publish.signedInAs": "Signed in as",
    "publish.button": "Publish to community",
    "publish.republish": "Publish update",
    "publish.published": "Published",
    "publish.publishing": "Publishing…",
    "publish.done": "Published to the community library.",
    "help.loading": "Loading…",
    "help.empty": "No help content yet.",
    "help.error": "Vaenyx could not load the help page.",
    "routine.confirm.title": "Check the details",
    // The card IS the fields; a sentence explaining that they are fields was
    // the longest thing on it (Oskar, 2026-08-18: 提示语言有点长了).
    "routine.confirm.copy": "Fix anything wrong, then run.",
    "routine.confirm.missing": "Still needed:",
    "routine.confirm.onePerLine": "One per line",
    "routine.confirm.run": "Run",
    "routine.confirm.cancel": "Cancel",
    // The editorial version of the copy pack (clause 6.4). It had drifted to
    // 2.6 here while the app recorded 3.0 against every acknowledgement, so a
    // record said one thing and this table another; both now say 3.1, which is
    // the version that ships Part N.
    "legal.copyVersion": "3.1",
    "legal.disclaimer.aiGeneral.composer":
      "AI can make mistakes. Check important information.",
    "legal.disclaimer.community.browse":
      "Community Methods and Routines are created by community members. They are not endorsed by Vaenyx and are not professional advice; 'Verified' shows only that automated checks passed.",
    "legal.disclaimer.health.banner":
      "Not medical advice. Never rely on Vaenyx for diagnosis, medication choices or dosage. In an emergency, contact emergency services immediately.",
    "legal.disclaimer.finance":
      "Not financial advice. For important money decisions, talk to a qualified adviser.",
    "legal.disclaimer.tax":
      "Not tax advice. Check important figures with a registered tax agent or accountant.",
    "legal.disclaimer.legal":
      "Not legal advice. For contracts and legal matters, consult a qualified lawyer.",
    "legal.disclaimer.health.reminderReliability":
      "Reminders can fail or be delayed. Never rely on Vaenyx as your only reminder for critical medication.",
    "legal.disclaimer.health.gateTitle": "Before Discussing Health Topics",
    "legal.disclaimer.health.gateBody":
      "Vaenyx can discuss health topics, but it is not a medical professional and its output is not medical advice. Never rely on it for diagnosis, medication choices or dosage, or in an emergency — always follow your doctor or pharmacist. Confirm you understand to continue.",
    "legal.disclaimer.health.gateAccept": "I Understand — Continue",
    "legal.disclaimer.health.gateCancel": "Not Now",
    "legal.notice.backup":
      "Backups contain your private data — chats, memories and files. Store them somewhere safe. Optional encryption is available.",
    "legal.notice.settings.legalLinks":
      "Terms of Service, Privacy Policy, Contributor Agreement, Trademark Policy and Third-Party Notices apply to Vaenyx. Questions: hello@vaenyx.ai. (Email is handled on overseas servers — include only what's needed.)",
    "legal.disclaimer.aiGeneral.firstRun":
      "Vaenyx uses AI. AI can be wrong or out of date — always double-check important information.",
    "legal.notice.firstRun.terms":
      "By continuing you agree to the Terms of Service and acknowledge the Privacy Policy.",
    "legal.notice.flywheel.preference.title":
      "Community Sharing (Not Available Yet)",
    "legal.notice.flywheel.preference":
      "This version does not upload improvement patterns. You may record whether you are interested in sharing in future, but this preference does not turn sharing on, authorise an upload, or grant consent, a licence or moral-rights consent. A fresh affirmative choice will be required if sharing becomes available.",
    "legal.notice.flywheel.preference.interested": "Interested",
    "legal.notice.flywheel.preference.notInterested": "Not interested",
    "legal.notice.modelPicker":
      "This chat uses the provider shown. Cloud providers receive your chat content — including context Vaenyx adds, like memories and project summaries — under their own terms.",
    "legal.notice.project.autoSummary":
      "Vaenyx keeps an automatic short summary of your preferences for this project and uses it as context in this project's chats. It's stored on this device — you can view, edit or delete it anytime. Nothing enters Vaenyx Me without your approval.",
    "legal.notice.modelConnect.cloud":
      "You're connecting a third-party AI provider. Your messages — plus any context Vaenyx adds, like saved memories, your profile, project summaries and attached files — will be sent to the provider you choose, under its terms, privacy policy and any fees it charges. Vaenyx doesn't control that provider.",
    "legal.notice.remoteAccess.enable":
      "Remote access uses Tailscale, a third-party service. You sign in with your own Tailscale account and its terms apply. Once enabled, your Vaenyx instance gets an internet-reachable address — anyone with that address can reach the sign-in screen, and your Vaenyx login is what protects access. Traffic is encrypted in transit; Tailscale states its relays cannot read it.",
    "legal.notice.remoteAccess.status":
      "This Vaenyx has an internet-reachable address. Anyone who knows it reaches the sign-in screen, and your Vaenyx password is what protects everything behind it.",
    "legal.notice.methodToken.feedback":
      "This allows the app holding this token to send corrections into My Library on this device. Corrections stay on this device; a correction can only become a shared community example after it is de-identified and you explicitly approve it — corrections from apps are never shared automatically, whatever your Sharing setting.",
    "legal.notice.publish":
      "Publishing is optional. When you select Publish, Vae Foundry Pty Ltd (hello@vaenyx.ai) collects the declarative item files, your account identifier and chosen public byline, and versioned records of your Contributor Agreement acceptance, warranty confirmation and overseas-publication consent. We use them to publish, attribute, manage and moderate the item and to evidence the applicable rights and choices. Cloudflare, Inc. processes the submission for us on global infrastructure, and GitHub, Inc. in the United States receives only the public item files and byline for worldwide hosting. No local examples or raw corrections are included. Publication is permanent in copies beyond our reach, and the item is licensed to everyone under the Creative Commons Attribution 4.0 licence. Without this information the item will not be published. See the Core Privacy Policy and the Current Implementation and Data-Handling Schedule for retention, access, correction and complaints.",
    "legal.notice.publish.contributorTerms":
      "By publishing you agree to the Contributor Agreement. Your acceptance is recorded against your publisher account.",
    "legal.consent.publish.warranty":
      "I confirm that I have the rights needed to publish this item, that it contains nothing malicious or harmful, that the Contributor Agreement's warranties are true for this item, and that I give the moral-rights consent in clause 6 for this Contribution.",
    "legal.notice.publish.signIn":
      "Before sign-in: Vae Foundry Pty Ltd (hello@vaenyx.ai) will receive from Google or GitHub the provider name, stable provider user ID, email and any available account handle; you separately choose your public byline. We create and store account, session and publish-acceptance records with Cloudflare, Inc. on global infrastructure, for authentication, attribution, moderation, security and managing your Published Content. Publishing is optional — without signing in you can browse the Community, but you cannot publish. See the Core Privacy Policy and the Current Implementation and Data-Handling Schedule for recipients, countries, retention, access, correction and complaints.",
    "legal.consent.publish.overseas":
      "I consent to Vaenyx disclosing the content I publish and the public byline I choose to GitHub, Inc. in the United States for hosting in the public, worldwide Community Library. If the Privacy Act applies to Vaenyx and I give this consent, APP 8.1 will not apply to this disclosure. If GitHub handles that information in a way that would breach the APPs, Vaenyx will not be accountable under the Privacy Act for that handling and I will not be able to seek redress from Vaenyx under the Privacy Act for it. Other laws or rights may still apply. Publishing is optional. Withdrawal blocks future publication but cannot reverse information already made public. Consent will be obtained again if the recipient, purpose or consequences materially change.",
    "legal.disclaimer.community.install":
      "Created by a community member. It has not been reviewed as professional advice — use it at your own discretion. It does nothing until you use it.",
    // D4c/D4d: the public report page's copy. It renders on vaenyx.ai/report,
    // not in the app — it lives here so the copy audit can hold the website to
    // the same wording as everything else.
    "report.page":
      "Report content in the Vaenyx Community. Anyone may use this page — you do not need a Vaenyx account, and you do not need to have installed anything. Send the details below to hello@vaenyx.ai. We assess sufficiently detailed reports having regard to apparent urgency, potential harm, the information available to us and applicable legal requirements. We may restrict content or accounts without prior notice. Sending a report does not guarantee removal, restoration, reasons, individual correspondence or any particular outcome, and we do not decide whether reported material is unlawful. Please tell us what is wrong rather than proving it: we do not ask for a lawyer's letter, a statutory declaration, a citation to legislation, or identity documents.",
    "report.page.limits":
      "What removal can and cannot do: we can remove content from the Vaenyx catalogue and index that installations read, remove the published files, and block that item identifier from being republished. We cannot remove copies held by other people — forks, mirrors, caches, archives and search-engine results are outside our control, and removal here does not make content disappear from the internet. If the material is unlawful, you may have remedies against the person who published it that we cannot provide.",
    "method.corrections.locality":
      "Kept examples stay on this computer. Nothing is published, and no app grant is affected.",
    // Part K — the flywheel's upload half. GATED: none of these may render
    // until the Schedule marks the capability active (see capabilities.ts).
    "legal.notice.flywheel.item":
      "Sends in {time}. Remove it if it still contains anything private — the automated check is not perfect.",
    "legal.notice.flywheel.remove": "Don't send this one",
    // Part L — Skill import/export. GATED (see capabilities.ts).
    "legal.notice.skill.import":
      "This Skill was written by someone else and stays under its own licence — importing it does not make it yours. Vaenyx keeps the instructions and drops anything that runs as code, because published content here is instructions only, never programs. Steps that depended on that code will not work, and we list them below rather than leave you to discover it. Check the original licence before you rely on this or share it.",
    "legal.notice.skill.importedPublish":
      "This Method was imported from someone else's Skill. Publishing it here licenses it to the public under CC BY 4.0 and confirms you hold the rights to do that. You may not hold them: the original licence may forbid redistribution, may require attribution you have not given, or may not permit relicensing at all. Check it before you publish. If you are not sure, don't.",
    "legal.notice.skill.export":
      "Exported as instructions, which is all a Method ever was — nothing is lost. Whoever receives it is bound by the licence the Method carries, not by anything in Vaenyx.",
    "legal.notice.method.edit":
      "This rewrites what the Method tells the model to do — its steps only. Its inputs, outputs and permissions are unchanged. Apps you granted this Method must be granted it again, because what they were granted has changed. Nothing is published: your Library copy is the only one affected.",
    "method.edit.apply": "Apply These Changes",
    // Editing somebody else's Method does not edit it. It makes your own copy,
    // permanently crediting them — which is what CC BY 4.0 asks for, and what
    // keeps corrections flowing to the author of the recipe that produced them.
    "method.fork.notice":
      "This Method came from the community, so your change is saved as your own copy. Theirs stays exactly as it is and keeps receiving their updates. Your copy carries their name permanently, and from now on its corrections stay here instead of going back to them.",
    "method.fork.name": "Name your copy",
    "method.fork.credit": 'Adapted from "{id}" by {author}',
    "method.fork.credit.unknown": 'Adapted from "{id}"',
    // Part L surfaces. "Import the instructions from a Skill" — never
    // "Skill compatible" or "runs Skills" (L4).
    "threads.bulk.count": "{n} selected",
    "threads.bulk.archive": "Archive",
    "threads.bulk.delete": "Delete",
    "threads.bulk.clear": "Clear",
    "threads.archived": "Archived",
    "threads.newInProject": "New chat in this project",
    "threads.archived.empty": "Nothing archived yet.",
    "threads.archived.restore": "Restore",
    "photo.add": "Add a photo",
    "photo.take": "Take a photo",
    "photo.choose": "Choose an existing photo",
    "photo.marks.make": "Mark Items",
    "photo.marks.hide": "Hide Marks",
    "photo.marks.show": "Show Marks",
    "document.add": "Add a document",
    "document.pages": "{n} pages",
    "document.gate.title": "Before this is read",
    "document.gate.read": "Read the whole file",
    "document.gate.cancel": "Not now",
    // Copy pack M1, verbatim. {n} is replaced with the file's REAL page count
    // — never a placeholder, never a guess: naming the file in front of them
    // is the whole point of the gate.
    "legal.gate.document.pageCost":
      "This file has {n} pages. Every page is read as a picture as well as text, so a document this size can cost more in a single question than hundreds of ordinary chats. That cost is yours — it goes through the model connection you set up.\n\nIf you only need part of it, split the file and send just those pages. It costs a fraction, and the answer is usually better, because the model isn't looking through pages you didn't ask about.",
    "marks.add": "+ Add Mark",
    "marks.addCancel": "Cancel Adding",
    "marks.addHint": "Tap the photo where the new mark goes.",
    "marks.editHint": "Tap a label to rename or remove it.",
    "marks.delete": "Remove",
    "marks.done": "Done",
    "routine.open.title": "About this Routine",
    "routine.open.steps": "What it does, step by step",
    "routine.open.start": "Start this Routine",
    "routine.open.mode.oneShot": "Answers each message on its own",
    "routine.open.mode.accumulate": "Builds up over the conversation",
    "routine.open.uses": "Built from",
    "routine.open.from.journal": "works from what you send",
    "routine.open.from.previous": "works from the previous step's result",
    "routine.open.from.static": "works from a fixed input",
    "skill.import.title": "Import the instructions from a Skill",
    // L6: NOT "exactly". The parser recognises four kinds of thing; a Skill can
    // lose a bundled resource, a reference to a service, an assumption about its
    // host — and promising exactness would be a false statement about our own
    // product, which is the least defensible kind there is.
    "skill.import.copy":
      "Paste a SKILL.md here. Vaenyx keeps its instructions as a new Method and lists what could not come across. The list covers the kinds of thing we can detect; a Skill can depend on something we cannot see, so treat the result as a starting point rather than a finished copy.",
    "skill.import.source": "Where it came from (a link, optional)",
    "skill.import.paste": "Paste the contents of SKILL.md",
    "skill.import.choose": "Choose a SKILL.md file",
    "skill.import.drop": "Or drop a SKILL.md file here.",
    "skill.import.look": "See what would be imported",
    "skill.import.confirm": "Import as a Method",
    // L7: "nothing was dropped" would be a clean bill of health we cannot
    // issue. What is true is "nothing we look for was present".
    "skill.import.nothingLost":
      "Nothing we check for was dropped. That is not the same as nothing being lost: a Skill can rely on things we cannot detect from the file alone.",
    "skill.export.action": "Export as a Skill",
    "skill.drop.executable": "A file that would have run",
    "skill.drop.runs-a-script": "A step that ran one of those files",
    "skill.drop.local-file": "A step that used a file on the other machine",
    "skill.drop.external-tool": "A step that ran an outside tool",
    "method.examples.title": "What this Method has learnt",
    "method.examples.copy":
      "Corrections become examples automatically, and this Method follows the most recent ones. They stay on this computer — nothing is published, and no app grant is affected. Remove any you would rather it did not learn from.",
    "method.examples.remove": "Remove",
    "method.examples.you": "You",
    "method.corrections.title": "Corrections waiting",
    "method.corrections.copy":
      "An app sent these back after someone fixed this Method's answer. Keep one and this Method follows it next time. Read it first — a correction contains whatever was actually typed.",
    "method.corrections.corrected": "Corrected answer",
    "method.corrections.keep": "Keep as an example",
    "method.corrections.kept": "Kept",
    "legal.notice.publish.localChanges":
      "You have changed this since you published it. The community still has the version you published; publishing again replaces it with what is on this device.",
    "legal.notice.community.updateAvailable":
      "A newer version of this community item has been published. Updating replaces your installed copy with the publisher's new version; the current one keeps working if you do nothing.",
    "community.update.action": "Update",
    "community.update.versions": "Installed {installed} · published {latest}",
    "settings.community.pauseTitle": "Pause Community Publishing",
    "settings.community.pauseCopy":
      "Operator only. While publishing is paused the service refuses every publish, including yours. Use it to stop abuse in progress.",
    "settings.community.paused": "Publishing is paused",
    "settings.community.live": "Publishing is open",
    "settings.community.pauseOverride":
      "Set by service configuration; the switch here cannot override it.",
    "legal.notice.community.discord":
      "Community discussion happens on Discord, a third-party platform under its own terms. If you join or post in the official Vaenyx server, Discord collects and stores your account details, posts and technical data, and Vae Foundry Pty Ltd administrators can access and use your Discord profile, posts and moderation records to operate and moderate the server. Participation is optional. The Discord platform itself is not operated by Vaenyx. See the Core Privacy Policy and the Current Implementation and Data-Handling Schedule for retention, access, correction and complaints.",
    "legal.notice.community.report":
      "Report content that is unsafe, infringing, misleading or contains personal information: hello@vaenyx.ai. Vae Foundry Pty Ltd collects directly from you your email address and the report details you choose to provide, and uses them for triage, investigation, response and legal compliance. Reporting is optional, but without enough information to identify the item and explain the issue we may be unable to act. Reports are handled by email on overseas servers — include only what's needed. The current providers, countries and retention rule are stated in the Current Implementation and Data-Handling Schedule; the Core Privacy Policy explains access, correction and complaints.",
    "legal.notice.restore":
      "Vaenyx will restart to restore this snapshot (about 30 seconds). Your current data is saved as an automatic safety copy first, so you can undo it.",
    "legal.notice.restore.confirm": "Restore and Replace",
    "legal.consent.flywheel.activate":
      "Turn on sharing improvements?\nWhen you correct something a Method got wrong, Vaenyx can send that one correction to the person who published the Method, so they can fix it for everyone who uses it.\n**What goes:** the example itself — what was asked, what came back, and what you corrected — plus a contributor ID that credits you without naming you. **What does not go:** your name, your files, your other chats, or anything else on this computer.\nPersonal details are removed on this computer before anything leaves it. That is done automatically by a program, and it is not perfect. Read what you are sending — you are the last check.\n**Where it goes:** to our server first, which holds it only until the publisher's own app collects it and deletes it at that moment. Anything nobody collects within 14 days is deleted unread. Our server is outside Australia, and we can read what is waiting on it. Publishers receive examples only if they have asked to.\n**Once an example is sent, it cannot be recalled.** You can stop future sends at any time, and turning this off stops everything from then on.\n**How they go:** each correction waits 48 hours in a list you can see, and then goes on its own unless you remove it. If you would rather approve each one yourself, you can switch to that at any time.\nHealth, family and money are never sent automatically. Vaenyx asks you about those separately, every time.\nThis is off unless you turn it on now.",
    "legal.consent.flywheel.receive.label":
      "Send me corrections from people who install this, so I can improve it. What arrives is someone else's material: use it only to improve this Method, don't pass it on, and delete it if asked. You can change this later.",
    "legal.consent.flywheel.receive":
      "Receive examples for this Method? When someone corrects an answer this Method gave, an example can be sent to you to improve it. It arrives with personal details stripped on the sender's device — automatically, and imperfectly, so treat what arrives as someone's real material. If you accept: use it only to improve this Method, don't pass it on, and delete it when asked. Off unless you choose it, and you can change this any time.",
    "legal.consent.flywheel.sensitiveAsk":
      "This improvement touches a sensitive area (health, family or finance). Patterns Vaenyx recognises as sensitive are never shared automatically. Share this de-identified pattern with the community?",
    "legal.notice.flywheel.contributorId":
      "Your contributor ID. It credits your contributions without naming you, and it is the same ID every time so credit accumulates. It appears publicly wherever a contribution of yours is published, and it cannot be changed or recalled. Quote it if you ever ask us about your contributions.",
    "flywheel.queue.window":
      "Waiting to be sent — nothing here has left this computer yet. Anything still here in 48 hours goes out. Remove what you don't want sent, or turn sharing off to stop all of it. The wait is a chance to change your mind, not what makes this allowed: you allowed it when you turned sharing on, and you can turn it off again whenever you like.",
    "flywheel.queue.held":
      "Held back — this looks like it touches health, family or money. Vaenyx never sends these automatically. Open it, read it, and decide on this one by itself. If you do nothing, it is not sent.",
    "legal.notice.modelConnect.pictures":
      "You're connecting a third-party image provider. What gets sent is a single English prompt, written by your main model from what you asked for — not your memories, profile, project summaries or attached files, and not the rest of the conversation. It goes to the provider you choose, under its terms, privacy policy and any fees it charges. Because your main model writes that prompt, it can word things you did not type, so Vaenyx shows you the prompt it sent.",
    "legal.notice.freeOptions.modelAnswer":
      "Answered by {model} on {date}{, with web search}. This is the model's answer, not ours, and not checked by anyone — prices and free tiers change, and models get them wrong. Check the provider's own pricing page before you rely on it.",
    "legal.consent.flywheel.settingsNote":
      "This version does not upload improvement patterns. This setting records a preference only. If community improvement sharing becomes available, it will remain off until you are shown current information and make a fresh affirmative choice.",
    "legal.notice.modelConnect.local":
      "This backend address points at your own machine. Vaenyx sends chats for this backend only to that address, under the model's own licence terms.",
    "legal.notice.modelConnect.local.lan":
      "This address is on your local network — it may be another machine, not this one. Vaenyx sends chats for this backend only to that address. Make sure the machine it points at is one you control.",
    "legal.notice.modelConnect.local.unverified":
      "Vaenyx sends chats for this backend only to the address you entered. Make sure it points at your own machine — a remote address means your chats leave this device.",
    // Copy pack Part N, verbatim. Paragraphs are separated by \n\n and rendered
    // as separate lines; the renderer strips ** the way the M1 gate does.
    "legal.notice.capability.cost.title": "What one call costs",
    "legal.notice.capability.cost":
      "Vaenyx charges nothing, and never will. What gets spent is your own model connection.\n\nA subscription you already pay for — Codex CLI (ChatGPT), Claude (Subscription) — costs nothing extra per call. You are using the allowance you already bought, and it runs out rather than billing you.\n\nA metered API key — OpenAI, Anthropic, Gemini, Groq and the rest — bills you per call, by how much went through it. Looking at a photo and reading a document cost the most: pictures are dearer than words, and a document is read as pictures too.\n\nNothing at all — the voice on this machine, opening files on this machine, and any local model — because those run here.\n\nNo prices are printed here. They are the provider's, they change, and a number of ours that has gone stale is worse than none. Only the provider's own pricing page is right.",
    "legal.notice.capability.web.title": "Before Vaenyx searches the web",
    // "never sees" was in the first draft and is not sayable: with the Claude
    // backend the search runs inside an SDK stream that passes through this
    // process, so not reading it is a choice in code rather than a structural
    // fact. Vaenyx making no request of its own to a search company IS
    // structural, and is what the Owner actually needs to know.
    "legal.notice.capability.web":
      "With this on, your main model can look things up while it answers. What leaves this machine is the words it searches for: they go out through that model's own backend, and a search company on the far end receives them. Vaenyx does not choose that company and never contacts it itself. The model writes those words, so they can say things you did not type. Only the Codex CLI (ChatGPT) and Claude (Subscription) backends really search today; the rest answer from memory whether this is on or off.",
    "legal.notice.capability.fetching.title": "Before Vaenyx opens your files",
    "legal.notice.capability.fetching":
      "Vaenyx can open text files from folders you name here, and nowhere else. Vaenyx opens them, not the model — the model is never given a tool that can touch a disk.\n\nBut what it reads is handed to whichever model is answering. The words in that file go to that model exactly like anything you type into a chat, and if that model is a cloud one they leave this machine.\n\nIt reads nothing until you name a folder. And no app key can ever be given this, whatever it asks for.",
    // One pair of buttons for both notices: the decline really switches the
    // capability off, so neither is a wall to click past (pack N1 behaviour).
    "legal.notice.capability.keep": "Leave it on",
    "legal.notice.capability.turnOff": "Switch it off",
    "legal.consent.capability.wanted.title": "Vaenyx cannot do this yet",
    "legal.consent.capability.wanted":
      "This Method needs something Vaenyx cannot do yet, so it cannot be shared. It stays here and keeps working for you.\n\nVaenyx can write down that it was wanted. What gets written down is the name of the missing capability and a count — nothing about this Method, nothing about its recipe, nothing else from this computer — and it stays on this machine. When an update finally brings that capability, this machine knows it was waiting and tells you.\n\nSay no and nothing is written down. Nothing else changes either way.",
    "legal.consent.capability.wanted.accept": "Write it down",
    "legal.consent.capability.wanted.decline": "No, don't",
  },
  zh: {
    "title.ask-vaenyx": "Vaenyx 门户",
    "title.projects": "项目",
    // Kept in English, like Vaenyx Me: the Chinese copy elsewhere already calls
    // this page "Scheduled", and one page must not have two names.
    "title.scheduled": "Scheduled",
    "title.library": "资源库",
    "title.community": "社区",
    "community.intro":
      "大家发布的 Method 和 Routine 都在这里,安装即复制进你自己的资源库。",
    "library.tierCommunity": "社区",
    "community.discord.link": "在 Discord 上加入社区 →",
    "community.report.routine": "举报此 Routine",
    "community.report.method": "举报此 Method",
    "community.report.email": "发邮件到 hello@vaenyx.ai",
    "community.report.category": "问题属于哪一类?",
    "community.report.categoryPrompt": "请选择…",
    "community.report.category.defamation": "诽谤 (defamation)",
    "community.report.category.privacy": "隐私 / 个人信息 (privacy)",
    "community.report.category.copyright": "版权 (copyright)",
    "community.report.category.illegal": "违法内容 (illegal)",
    "community.report.category.safety": "安全 (safety)",
    "community.report.category.other": "其它 (other)",
    "title.modes": "模式",
    "title.settings": "通用",
    "title.vaenyx-me": "Vaenyx Me",
    "title.guard": "守卫",
    "title.discord": "Discord",
    "title.help": "帮助与术语",
    "common.back": "← 返回",
    "settings.language.title": "语言",
    "settings.language.copy": "选择应用语言。即时切换,通知也跟着走。",
    "settings.language.english": "English",
    "settings.language.chinese": "中文",
    "settings.help.eyebrow": "帮助",
    "settings.help.title": "帮助与术语",
    "settings.help.copy": "用大白话解释 Vaenyx 里你看到的每一个东西。",
    "settings.help.open": "打开帮助与术语",
    "settings.manual.eyebrow": "帮助",
    "settings.manual.title": "使用手册",
    "settings.manual.copy":
      "Vaenyx 能做的每一件事:是什么、在哪点、点完会怎样。",
    "disclaimer.ai": "AI 可能出错,重要的事请自行核对。",
    "disclaimer.health":
      "这不是医疗建议;用药、剂量、诊断请遵医嘱。别用它定剂量或替代医生。",
    "disclaimer.finance": "不是财务 / 税务建议,重要决定请咨询专业人士。",
    "disclaimer.legal": "不是法律意见。",
    "disclaimer.community":
      "社区 Method / Routine 由其他用户制作,Vaenyx 不对其内容作为专业建议背书;「Verified」仅表示已通过自动检查,并非有人逐条审核,社区档请自行斟酌。",
    "disclaimer.remote":
      "远程访问是可选的,通过第三方服务实现,用你自己在该服务商的账号登录,受其条款约束。本版本使用哪一家,见《第三方声明》。",
    "disclaimer.model":
      "连接云模型(如 OpenAI / Gemini)受其条款约束、费用由你承担;本地模型(如 Ollama)在你自己机器上运行。",
    "disclaimer.confirmTitle": "使用前请知悉",
    "disclaimer.confirmContinue": "我明白,继续",
    "settings.legal.eyebrow": "法律",
    "settings.legal.title": "法律",
    "settings.legal.copy":
      "下面几行用大白话概括法律要点。真正具有约束力的是本页底部链接的文件;本次发布实际做了什么,以明细表所载为准。",
    "settings.backup.tab": "备份",
    "settings.backup.eyebrow": "数据保护",
    "settings.backup.title": "备份与还原",
    "settings.backup.copy":
      "为你的 Vaenyx 存一个快照(设置、聊天、Token,以及你自建的 Method 和 Routine),或回退到之前的某个快照。备份就是本机上的普通文件:绝不上传、不用 GitHub、不需账号或登录。",
    "settings.backup.schedule": "自动备份",
    "settings.backup.scheduleOff": "关",
    "settings.backup.scheduleDaily": "每天",
    "settings.backup.scheduleWeekly": "每周(周日)",
    "settings.backup.scheduleHour": "时间(点)",
    "settings.backup.lastAuto": "最近一次自动备份",
    "settings.backup.lastAutoNever": "尚未运行。",
    "settings.backup.lastAutoOk": "成功",
    "settings.backup.lastAutoFail": "失败——请检查目的地磁盘",
    "settings.backup.password": "备份密码(可选加密)",
    "settings.backup.passwordHintOn":
      "加密已开启。留空 = 保持当前密码;输入新密码即替换。",
    "settings.backup.passwordHintOff":
      "留空 = 不加密。设了密码后,新备份会打包成加密文件。",
    "settings.backup.passwordWarn":
      "密码丢失 = 加密备份永远打不开。请把它写在安全的地方。",
    "settings.backup.passwordClear": "关闭加密",
    "settings.backup.destination": "备份文件夹",
    "settings.backup.destinationHint":
      "完整路径。留空 = 本机默认文件夹;填另一块盘 / U 盘 / NAS 可把副本存到本机之外。",
    "settings.backup.keep": "保留最近",
    "settings.backup.keepHint":
      "每次备份成功后自动清理更旧的备份。留空 = 全部保留。",
    "settings.backup.saveConfig": "保存备份设置",
    "settings.backup.configSaved": "备份设置已保存。",
    "legal.notice.backup.cloudSync":
      "你可以让自己的云同步服务同步备份文件夹——这是你自己的选择,受该服务条款约束。切勿同步 Vaenyx 正在使用的实时数据文件夹。",
    "settings.backup.create": "立即备份",
    "settings.backup.creating": "备份中…",
    "settings.backup.created": "备份完成。",
    "settings.backup.refresh": "刷新",
    "settings.backup.empty": "还没有备份。点上面创建第一个。",
    "settings.backup.loading": "正在加载备份…",
    "settings.backup.restore": "还原",
    "settings.backup.safety": "自动安全副本",
    "settings.backup.methodsLabel": "个 Method",
    "settings.backup.routinesLabel": "个 Routine",
    "settings.backup.dbOnly": "仅数据库",
    "settings.backup.restoreTitle": "还原这个备份?",
    "settings.backup.restoring":
      "还原中… Vaenyx 正在重启。约 30 秒后刷新本页。",
    "settings.backup.cancel": "取消",
    "settings.backup.error": "出了点问题,请重试。",
    "apps.token.externalNote":
      "Token 是给【外部 app】用的。在 Vaenyx 自己的网页里用 Method 不需要 Token —— 打开 Library 直接用即可。",
    "apps.token.fetchRecipe.label": "取走配方(Type B)",
    "apps.token.fetchRecipe.desc":
      "Type A(默认):在 Vaenyx 里跑。Type B(勾这个):在第三方 app 里、用它们自己的 AI 模型跑。",
    "apps.token.sendFeedback.label": "回传纠错",
    "apps.token.sendFeedback.desc":
      "让这个外部 app 把用户的纠错回传给 Vaenyx、喂飞轮,让配方越用越好。需该 app 已获授权使用对应 method。",
    "publish.title": "发布到社区",
    "publish.intro":
      "把这个 Method 分享出去,其他家庭就能找到并安装。你的私人纠错数据不会被分享。",
    "publish.notConfigured": "本服务器还没配置发布功能。",
    "publish.signin": "用 Google 登录以发布",
    "publish.signedInAs": "已登录:",
    "publish.button": "发布到社区",
    "publish.republish": "发布更新",
    "publish.published": "已发布",
    "publish.publishing": "发布中…",
    "publish.done": "已发布到社区库。",
    "help.loading": "加载中…",
    "help.empty": "暂无帮助内容。",
    "help.error": "Vaenyx 无法加载帮助页面。",
    "routine.confirm.title": "确认信息",
    "routine.confirm.copy": "不对的改一改,然后运行。",
    "routine.confirm.missing": "还缺:",
    "routine.confirm.onePerLine": "一行一个",
    "routine.confirm.run": "运行",
    "routine.confirm.cancel": "取消",
    "legal.copyVersion": "3.1",
    "legal.disclaimer.aiGeneral.composer": "AI 可能出错,重要信息请自行核对。",
    "legal.disclaimer.community.browse":
      "社区 Method 与 Routine 由社区成员制作,Vaenyx 不为其背书,也不构成专业建议;'Verified' 仅表示已通过自动检查。",
    "legal.disclaimer.health.banner":
      "这不是医疗建议。切勿依赖 Vaenyx 做诊断、选药或定剂量。紧急情况请立即联系急救服务。",
    "legal.disclaimer.finance":
      "这不是财务建议。重大金钱决定请咨询合格的专业人士。",
    "legal.disclaimer.tax":
      "这不是税务建议。重要数字请与注册税务代理或会计师核对。",
    "legal.disclaimer.legal": "这不是法律意见。合同与法律事务请咨询合格律师。",
    "legal.disclaimer.health.reminderReliability":
      "提醒可能失败或延迟。关键用药切勿只依赖 Vaenyx 提醒。",
    "legal.disclaimer.health.gateTitle": "谈及健康话题前",
    "legal.disclaimer.health.gateBody":
      "Vaenyx 可以聊健康话题,但它不是医疗专业人员,其输出也不是医疗建议。切勿依赖它做诊断、选药或定剂量,紧急情况更不可依赖——请始终遵从医生或药剂师的指导。确认已了解后方可继续。",
    "legal.disclaimer.health.gateAccept": "我已了解——继续",
    "legal.disclaimer.health.gateCancel": "暂不继续",
    "legal.notice.backup":
      "备份包含你的私人数据——聊天、记忆与文件。请妥善保管。可选择加密。",
    "legal.notice.settings.legalLinks":
      "Vaenyx 适用《服务条款》《隐私政策》《贡献者协议》《商标政策》与《第三方声明》。如有疑问:hello@vaenyx.ai。(邮件在海外服务器上处理——请只写必要信息。)",
    "legal.disclaimer.aiGeneral.firstRun":
      "Vaenyx 使用 AI。AI 可能出错或过时——重要信息请务必自行核对。",
    "legal.notice.firstRun.terms":
      "继续即表示你同意《服务条款》,并知悉《隐私政策》。",
    "legal.notice.flywheel.preference.title": "社区分享(尚未提供)",
    "legal.notice.flywheel.preference":
      "本版本不会上传任何改进模式。你可以记录自己将来是否有意参与分享,但这项偏好不会开启分享,不构成任何上传授权,也不构成同意、许可或精神权利同意。若将来提供分享,届时需要你重新作出一次肯定性选择。",
    "legal.notice.flywheel.preference.interested": "有兴趣",
    "legal.notice.flywheel.preference.notInterested": "暂不参与",
    "legal.notice.modelPicker":
      "本对话使用所示的服务商。云端服务商将按其自身条款接收你的聊天内容,包括 Vaenyx 添加的上下文(如记忆与项目摘要)。",
    "legal.notice.project.autoSummary":
      "Vaenyx 会为此项目自动维护一份你的偏好摘要,并作为本项目对话的上下文使用。它存储在本设备上——你可以随时查看、编辑或删除。未经你的批准,任何内容都不会进入 Vaenyx Me。",
    "legal.notice.modelConnect.cloud":
      "你正在连接第三方 AI 服务商。你的消息,连同 Vaenyx 添加的上下文(如已保存的记忆、你的档案、项目摘要与附件),将发送给你所选的服务商,受其条款、隐私政策及其收费约束。Vaenyx 无法控制该服务商。",
    "legal.notice.remoteAccess.enable":
      "远程访问使用第三方服务 Tailscale。你需用自己的 Tailscale 账号登录,并受其条款约束。开启后,你的 Vaenyx 实例将获得一个互联网可达的地址——任何知道该地址的人都能打开登录页,真正保护访问的是你的 Vaenyx 登录。传输过程加密;Tailscale 表示其中继无法读取内容。",
    "legal.notice.remoteAccess.status":
      "这台 Vaenyx 有一个互联网可达的地址。任何知道它的人都能打开登录页,后面的一切由你的 Vaenyx 密码保护。",
    "legal.notice.methodToken.feedback":
      "开启后,持有此 Token 的应用可以把修正写入本设备上的 My Library。修正只保留在本设备;任何修正要成为社区共享示例,都必须先经脱敏处理并获得你的明确批准——来自应用的修正绝不会自动分享,无论你的 Sharing 设置如何。",
    "legal.notice.publish":
      "发布是可选的。当你点击发布时,Vae Foundry Pty Ltd(hello@vaenyx.ai)会收集该条目的声明式文件、你的账户标识符与你选定的公开署名,以及你对《贡献者协议》的接受、保证确认与海外发布同意的带版本记录。我们用这些信息来发布、署名、管理与审核该条目,并留存相关权利与选择的证据。Cloudflare, Inc. 在全球基础设施上代我们处理该提交;美国的 GitHub, Inc. 仅接收公开的条目文件与署名,用于面向全球的托管。提交中不包含任何本地示例或原始纠错。就我们无法触及的副本而言,发布是永久的;该条目依 Creative Commons Attribution 4.0 许可授予所有人。缺少上述信息则无法完成发布。留存、查阅、更正与投诉事宜,见《核心隐私政策》与《当前实现与数据处理明细表》。",
    "legal.notice.publish.contributorTerms":
      "发布即表示你同意《贡献者协议》。此确认将记录在你的发布者账号下。",
    "legal.consent.publish.warranty":
      "我确认:我拥有发布本项所需的权利;本项不含任何恶意或有害内容;《贡献者协议》的各项保证就本项均属属实;并且我就本项贡献内容给予第 6 条所述的精神权利同意。",
    "legal.notice.publish.signIn":
      "登录前请注意:Vae Foundry Pty Ltd(hello@vaenyx.ai)将从 Google 或 GitHub 接收服务商名称、稳定的服务商用户 ID、邮箱,以及可获得的账户名;你的公开署名由你另行选择。我们会在全球基础设施上,通过 Cloudflare, Inc. 创建并存储账户、会话与发布接受记录,用于身份验证、署名、内容管理、安全与管理你已发布的内容。发布是可选的——不登录也可以浏览社区,但无法发布。接收方、国家、留存、查阅、更正与投诉事宜,见《核心隐私政策》与《当前实现与数据处理明细表》。",
    "legal.consent.publish.overseas":
      "我同意 Vaenyx 将我发布的内容及我选定的公开署名披露给美国的 GitHub, Inc.,以存放于面向全球的公开社区库。若《隐私法》适用于 Vaenyx 且我作出本同意,APP 8.1 将不适用于该项披露。若 GitHub 以违反 APPs 的方式处理该信息,Vaenyx 就该处理不在《隐私法》项下承担责任,我也无法就此依《隐私法》向 Vaenyx 寻求救济。其他法律或权利仍可能适用。发布是可选的。撤回同意可阻止今后的发布,但无法撤回已公开的信息。若接收方、目的或后果发生实质变化,将重新取得同意。",
    "legal.disclaimer.community.install":
      "由社区成员制作,未经专业建议层面的审核——请自行斟酌使用。你不主动使用,它就不会做任何事。",
    "report.page":
      "举报 Vaenyx 社区中的内容。任何人都可以使用本页 —— 你不需要 Vaenyx 账户,也不需要安装过任何东西。请把下列信息发送至 hello@vaenyx.ai。我们会就足够具体的举报作出评估,并考虑其表面紧急程度、潜在伤害、我们可获得的信息以及适用的法律要求。我们可以不经预先通知限制内容或账号。提交举报不保证移除、恢复、说明理由、个别回复或任何特定结果,我们也不就被举报材料是否违法作出判断。请告诉我们问题在哪,而不是去证明它:我们不要求律师函、statutory declaration、法条引用或身份证件。",
    "report.page.limits":
      "移除能做到什么、不能做到什么:我们可以把内容从各安装端读取的 Vaenyx 目录与索引中移除、删除已发布的文件,并阻止该条目标识符被重新发布。我们无法移除他人持有的副本 —— fork、镜像、缓存、存档与搜索引擎结果都在我们控制之外,**在这里移除并不等于该内容从互联网上消失**。若该材料违法,你可能对发布它的人享有我们无法提供的救济。",
    "method.corrections.locality":
      "保留的例子只存在这台电脑上,不会发布,也不会影响已授权的 app。",
    "legal.notice.flywheel.item":
      "{time} 后发送。若其中仍有私密内容,请撤掉它 —— 自动检查并不完美。",
    "legal.notice.flywheel.remove": "不要发送这一条",
    "legal.notice.skill.import":
      "这个 Skill 是别人写的,并且仍受它自己的许可证约束 —— 导入它不会让它变成你的。Vaenyx 会保留其中的指令,并丢弃任何以代码形式运行的部分,因为这里发布的内容只能是指令,绝不是程序。依赖那些代码的步骤将无法工作,我们会在下面列出来,而不是留给你自己去发现。在依赖它或分享它之前,请先查看原始许可证。",
    "legal.notice.skill.importedPublish":
      "这个 Method 是从别人的 Skill 导入的。在此发布会依 CC BY 4.0 将它许可给公众,并同时确认你拥有这样做的权利。你可能并不拥有:原始许可证可能禁止再分发、可能要求你尚未给出的署名,或者根本不允许再许可。发布前请先查清。如果不确定,就不要发布。",
    "legal.notice.skill.export":
      "以指令形式导出 —— Method 本来就只是指令,不会有任何损失。收到它的人受该 Method 自带的许可证约束,而不受 Vaenyx 中的任何条款约束。",
    "legal.notice.method.edit":
      "这只会改写 Method 交给模型的指令(即它的步骤),不会改动它的输入、输出与权限。已授权使用该 Method 的 app 需要重新授权,因为被授权的内容已经变了。这不会发布任何东西:只影响你资源库里的这一份。",
    "method.edit.apply": "应用这些改动",
    "method.fork.notice":
      "这个 Method 来自社区,所以你的改动会存成你自己的副本。对方那一份原样保留,也会继续收到作者的更新。你的副本会永久标注作者,并且从现在起,它的修正只留在本机,不再回传给作者。",
    "method.fork.name": "给你的副本起个名字",
    "method.fork.credit": "改自 {author} 的「{id}」",
    "method.fork.credit.unknown": "改自「{id}」",
    "threads.bulk.count": "已选 {n} 个",
    "threads.bulk.archive": "归档",
    "threads.bulk.delete": "删除",
    "threads.bulk.clear": "取消选择",
    "threads.archived": "已归档",
    "threads.newInProject": "在这个项目里新建对话",
    "threads.archived.empty": "还没有归档的对话。",
    "threads.archived.restore": "取回",
    "photo.add": "添加照片",
    "photo.take": "拍照",
    "photo.choose": "从相册选择",
    "photo.marks.make": "标注物品",
    "photo.marks.hide": "隐藏标注",
    "photo.marks.show": "显示标注",
    "document.add": "添加文档",
    "document.pages": "{n} 页",
    "document.gate.title": "读取之前",
    "document.gate.read": "读取整份文件",
    "document.gate.cancel": "先不要",
    "legal.gate.document.pageCost":
      "这份文件有 {n} 页。**每一页都会被当成一张图来读**,不只是读文字 —— 所以这么厚的文件,问一次的花费可能超过几百次普通对话。这笔钱是你的:它走你自己配置的模型连接。\n\n如果你只需要其中一部分,**把文件拆开,只发那几页**。花费只是零头,而且答案通常更准 —— 模型不用在你没问的页里翻。",
    "marks.add": "+ 添加标注",
    "marks.addCancel": "取消添加",
    "marks.addHint": "在照片上点一下要标的位置。",
    "marks.editHint": "点标签可以改名字或删除。",
    "marks.delete": "删除",
    "marks.done": "完成",
    "routine.open.title": "关于这个 Routine",
    "routine.open.steps": "它会一步一步做什么",
    "routine.open.start": "开始使用",
    "routine.open.mode.oneShot": "每条消息各自独立回答",
    "routine.open.mode.accumulate": "在这段对话里逐步累积",
    "routine.open.uses": "由这些 Method 组成",
    "routine.open.from.journal": "处理你发来的内容",
    "routine.open.from.previous": "处理上一步的结果",
    "routine.open.from.static": "使用固定的输入",
    "skill.import.title": "导入 Skill 里的指令",
    "skill.import.copy":
      "把 SKILL.md 的内容贴进来。Vaenyx 会把其中的指令保留成一个新的 Method,并列出哪些东西没能带过来。该清单涵盖我们能够识别的种类;一个 Skill 也可能依赖我们看不见的东西,所以请把结果当作起点,而不是一份完成的副本。",
    "skill.import.source": "来源(链接,可选)",
    "skill.import.paste": "粘贴 SKILL.md 的内容",
    "skill.import.choose": "选择 SKILL.md 文件",
    "skill.import.drop": "也可以把 SKILL.md 文件拖进这里。",
    "skill.import.look": "看看会导入什么",
    "skill.import.confirm": "导入为 Method",
    "skill.import.nothingLost":
      "我们所检查的项目中,没有任何内容被丢弃。这与「没有任何损失」不是一回事:一个 Skill 可能依赖我们仅凭文件无法察觉的东西。",
    "skill.export.action": "导出为 Skill",
    "skill.drop.executable": "一个会运行的文件",
    "skill.drop.runs-a-script": "一个会去运行那些文件的步骤",
    "skill.drop.local-file": "一个用到对方机器上文件的步骤",
    "skill.drop.external-tool": "一个会调用外部工具的步骤",
    "method.examples.title": "这个 Method 学到的东西",
    "method.examples.copy":
      "纠正会自动变成例子,这个 Method 会照着最近的几条做。它们只存在这台电脑上:不会发布,也不影响已授权的 app。不想让它学的,删掉就行。",
    "method.examples.remove": "删除",
    "method.examples.you": "你",
    "method.corrections.title": "待处理的纠正",
    "method.corrections.copy":
      "有 app 把这些纠正发了回来 —— 是有人改过这个 Method 的答案。保留一条,它下次就照着做。先看清楚:纠正里是当时真实输入的内容。",
    "method.corrections.corrected": "修正后的答案",
    "method.corrections.keep": "保留为例子",
    "method.corrections.kept": "已保留",
    "legal.notice.publish.localChanges":
      "自你发布之后,你改动过这一份。社区上仍是你当初发布的那个版本;再次发布会用这台设备上的内容替换它。",
    "legal.notice.community.updateAvailable":
      "该社区条目已发布更新的版本。更新会用发布者的新版本替换你已安装的这一份;你不做任何操作,现在这一份也会继续正常工作。",
    "community.update.action": "更新",
    "community.update.versions": "已安装 {installed} · 已发布 {latest}",
    "settings.community.pauseTitle": "暂停社区发布",
    "settings.community.pauseCopy":
      "仅运营方可见。暂停期间,发布服务会拒绝所有人的发布请求,包括你自己的。用于在滥用发生时立即止血。",
    "settings.community.paused": "发布已暂停",
    "settings.community.live": "发布正常开放",
    "settings.community.pauseOverride":
      "当前由服务配置设定,此处的开关无法覆盖。",
    "legal.notice.community.discord":
      "社区讨论在 Discord 上进行。Discord 是第三方平台,受其自身条款约束。若你加入官方 Vaenyx 服务器或在其中发帖,Discord 会收集并存储你的账户信息、帖子与技术数据;Vae Foundry Pty Ltd 的管理员可以访问并使用你的 Discord 资料、帖子与管理记录,以运营和管理该服务器。参与是可选的。Discord 平台本身并非由 Vaenyx 运营。留存、查阅、更正与投诉事宜,见《核心隐私政策》与《当前实现与数据处理明细表》。",
    "legal.notice.community.report":
      "举报不安全、侵权、误导或含个人信息的内容:hello@vaenyx.ai。Vae Foundry Pty Ltd 会直接从你处收集你的邮箱地址与你选择提供的举报内容,用于分流、调查、答复与遵守法律。举报是可选的;但若信息不足以定位该条目并说明问题,我们可能无法处理。举报邮件在海外服务器上处理——请只写必要信息。当前的服务商、国家与留存规则载于《当前实现与数据处理明细表》;查阅、更正与投诉事宜见《核心隐私政策》。",
    "legal.notice.restore":
      "Vaenyx 会重启以还原这个快照(约 30 秒)。会先把你当前的数据自动存成一份安全副本,可反悔。",
    "legal.notice.restore.confirm": "恢复并替换",
    "legal.consent.flywheel.activate":
      "要开启「分享改进」吗?\n当你纠正了某个 Method 出错的地方,Vaenyx 可以把这一条纠正发送给发布该 Method 的人,让他为所有使用者修好它。\n**会发出去的:**这条示例本身 —— 问了什么、返回了什么、你把它纠正成了什么 —— 外加一个为你记功但不写出你名字的贡献者 ID。**不会发出去的:**你的姓名、你的文件、你其它的聊天,以及这台电脑上的任何其它内容。\n个人信息会在**这台电脑上**、在任何内容离开之前被剥除。这是由程序自动完成的,并不完美。请你自己看一眼要发出去的东西 —— 你是最后一道检查。\n**它会去哪里:**先到我们的服务器,而服务器只保存到发布者自己的 app 来取走为止,取走的那一刻即删除。14 天内无人取走的,原样删除、不会被阅读。我们的服务器在澳大利亚境外,且我们能够读到正在等待中的内容。只有主动要求接收的发布者才会收到示例。\n**示例一经发出便无法收回。**你可以随时停止此后的发送;关掉此项,从那一刻起就什么都不再发送。\n**它们怎么发出去:**每一条纠正会在一个你看得到的列表里等待 48 小时,之后便自行发出 —— 除非你把它移除。若你更愿意逐条自己批准,随时可以切换成那种方式。\n健康、家人与金钱的内容永远不会自动发送。Vaenyx 每一次都会就这些内容单独询问你。\n**此项默认关闭**,除非你现在就把它打开。",
    "legal.consent.flywheel.receive.label":
      "把安装了这个 Method 的人所做的纠正发给我,好让我改进它。收到的是**别人的**材料:只能用它改进这个 Method、不要转给别人、被要求时删除。此设置以后可以更改。",
    "legal.consent.flywheel.receive":
      "要为这个 Method 接收示例吗?当有人纠正了这个 Method 给出的答案,相关示例可以发送给你,用于改进它。它在发送方的设备上就已剥除个人信息 —— 是自动完成的,并不完美,所以请把收到的东西当作某个人的真实材料来对待。若你接受:只用它改进这个 Method、不要转给别人、被要求时删除。**默认关闭**,除非你自己选择开启;随时可以更改。",
    "legal.consent.flywheel.sensitiveAsk":
      "该改进涉及敏感领域(健康、家庭或财务)。被识别为敏感的模式绝不会自动分享。要把这份脱敏后的模式分享给社区吗?",
    "legal.notice.flywheel.contributorId":
      "你的贡献者 ID。它为你的贡献记功,但不写出你的名字;每次都是同一个 ID,所以功劳会累积。凡是你的贡献被公开发布的地方,它都会公开显示,且无法更改、无法收回。若你日后要就自己的贡献询问我们,请报上这个 ID。",
    "flywheel.queue.window":
      "等待发送 —— 这里的内容都还没有离开这台电脑。48 小时后仍在此处的,会被发送出去。把你不想发的移除,或者直接关掉分享、让全部内容都不发送。这段等待是给你反悔的机会,**并不是**这件事被允许的依据:允许它的是你开启分享时所作的选择,而你随时可以再把它关掉。",
    "flywheel.queue.held":
      "已扣下 —— 这一条看起来涉及健康、家人或金钱。Vaenyx 永远不会自动发送这类内容。请打开它、读一遍,然后单独就这一条作出决定。你什么都不做,它就不会被发送。",
    "legal.notice.modelConnect.pictures":
      "你正在连接第三方图片服务商。发送出去的是**一句英文 prompt**,由你的主模型根据你的要求写成 —— 不包含你的记忆、档案、项目摘要或附件,也不包含对话的其余部分。它会发送给你所选的服务商,受其条款、隐私政策及其收费约束。由于这句 prompt 是主模型写的,它可能写进你并没有打出来的内容,因此 Vaenyx 会把实际发送的 prompt 显示给你看。",
    "legal.notice.freeOptions.modelAnswer":
      "由 {model} 于 {date} 作答{,已联网搜索}。这是模型的答案,不是我们的答案,也没有经过任何人核实 —— 价格与免费额度会变,模型也会答错。在你据此作出决定之前,请到该服务商自己的价格页面上确认。",
    "legal.consent.flywheel.settingsNote":
      "本版本不会上传任何改进模式。此处只是记录一项偏好。若将来提供社区改进分享,它依旧保持关闭,直到向你展示当时的说明并由你重新做出一次肯定性选择。",
    "legal.notice.modelConnect.local":
      "该后端地址指向你自己的机器。Vaenyx 只会把此后端的聊天发送到该地址,并受模型自身许可条款约束。",
    "legal.notice.modelConnect.local.lan":
      "该地址位于你的本地网络——可能指向另一台机器,而非本机。Vaenyx 只会把此后端的聊天发送到该地址。请确认它指向的是你自己掌控的机器。",
    "legal.notice.modelConnect.local.unverified":
      "Vaenyx 只会把此后端的聊天发送到你填写的地址。请确认该地址指向你自己的机器——若是远程地址,你的聊天将离开本设备。",
    "legal.notice.capability.cost.title": "问一次到底花多少钱",
    "legal.notice.capability.cost":
      "Vaenyx 自己不收费,以后也不会收。花出去的,是你自己的模型连接。\n\n你已经在付的订阅 —— Codex CLI (ChatGPT)、Claude(订阅)—— 每次调用不额外花钱。你用的是已经买下的额度,用完就是用完,不会另外向你收费。\n\n按量计费的 API key —— OpenAI、Anthropic、Gemini、Groq 等等 —— 按次计费,按走过去的量算。看图和读文档最贵:图比文字贵,而文档也是当成图来读的。\n\n完全不花钱 —— 本机语音、打开这台机器上的文件、以及任何本地模型 —— 因为它们就在这里跑。\n\n这里不写价格。价格是服务商的,会变,而我们写下的一个过期数字比不写更糟。只有服务商自己的价格页面是准的。",
    "legal.notice.capability.web.title": "在 Vaenyx 上网搜索之前",
    "legal.notice.capability.web":
      "开着这一项,主模型在回答时可以上网查。离开这台机器的,是它拿去搜的那几个词:它们经由该模型自己的后台发出去,最终由另一端的一家搜索公司收到。这家公司不是 Vaenyx 选的,Vaenyx 自己也不会去联系它。这几个词是模型自己写的,所以里面可能出现你并没有打出来的内容。今天真的会搜的只有 Codex CLI (ChatGPT) 和 Claude(订阅);其余的模型开不开都只能凭记忆回答。",
    "legal.notice.capability.fetching.title": "在 Vaenyx 打开你的文件之前",
    "legal.notice.capability.fetching":
      "Vaenyx 只能打开你在这里点名的文件夹里的文字文件,别处一律不行。打开文件的是 Vaenyx 自己,不是模型 —— 模型手上从来没有能碰硬盘的工具。\n\n但读到的东西会交给正在回答的那个模型。文件里的字会送到那个模型那里,和你自己在聊天里打进去的内容一模一样;如果那是云端模型,它们就离开了这台机器。\n\n在你点名文件夹之前,它一个字也读不到。而且任何 app 钥匙都永远拿不到这一项,不管它怎么要。",
    "legal.notice.capability.keep": "就这样开着",
    "legal.notice.capability.turnOff": "把它关掉",
    "legal.consent.capability.wanted.title": "这一项 Vaenyx 还做不到",
    "legal.consent.capability.wanted":
      "这个 Method 需要 Vaenyx 还做不到的东西,所以没法分享出去。它会留在这里,照常给你用。\n\nVaenyx 可以把「有人要过这一项」记下来。记下的只有那项能力的名字和一个次数 —— 不包括这个 Method 的任何内容、不包括它的配方、也不包括这台电脑上的任何别的东西 —— 而且只留在本机。等哪次更新真的把这项能力做出来了,这台机器知道它一直在等,会告诉你一声。\n\n你说不,就什么都不记。不管选哪个,别的都不会有任何变化。",
    "legal.consent.capability.wanted.accept": "记下来",
    "legal.consent.capability.wanted.decline": "不用记",
  },
};

function readStoredLang(): Lang {
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === "en" || stored === "zh") return stored;
  } catch {
    // localStorage may be unavailable; fall through to the default.
  }
  return DEFAULT_LANG;
}

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

function hasStoredLang(): boolean {
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    return stored === "en" || stored === "zh";
  } catch {
    return false;
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang);

  // First open on a device that has never chosen: follow the language the
  // installer spoke. Never overrides a choice the Owner has made.
  useEffect(() => {
    if (hasStoredLang()) return;
    let active = true;
    void fetchSystemStatus()
      .then((status) => {
        if (!active || !status.installLanguage) return;
        setLangState(status.installLanguage);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // Persisting is best-effort; the choice still applies this session.
    }
    // And the instance learns it, so a phone notification is written in the
    // same language as the app that shows it (Oskar, 2026-08-22).
    void setAppLanguage(next).catch(() => undefined);
  }, []);

  // A gated key returns nothing at all until its capability is on. Enforced
  // here rather than in each component: copy that describes a mechanism which
  // does not exist is a false statement about the software, and "nothing
  // renders it today" is an accident waiting for the next component.
  const t = useCallback(
    (key: string) =>
      isKeyRenderable(key)
        ? (STRINGS[lang][key] ?? STRINGS.en[key] ?? key)
        : "",
    [lang],
  );

  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, t }),
    [lang, setLang, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n must be used within a LanguageProvider.");
  }
  return value;
}
