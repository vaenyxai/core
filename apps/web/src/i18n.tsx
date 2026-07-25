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

import { fetchSystemStatus } from "./api.js";

export type Lang = "en" | "zh";

const LANG_STORAGE_KEY = "vaenyx.lang";
const DEFAULT_LANG: Lang = "en";

// Seed dictionary. Add keys here as UI strings are migrated; English is the base.
const STRINGS: Record<Lang, Record<string, string>> = {
  en: {
    "title.ask-vaenyx": "Vaenyx Portal",
    "title.projects": "Projects",
    "title.library": "Library",
    "title.community": "Community",
    "community.intro":
      "Methods and Routines published by people everywhere. Installing one copies it into your own Library.",
    "library.tierCommunity": "Community",
    "community.report.routine": "Report This Routine",
    "community.report.method": "Report This Method",
    "community.report.email": "Email hello@vaenyx.ai",
    "title.modes": "Modes",
    "title.settings": "General",
    "title.vaenyx-me": "Vaenyx Me",
    "title.guard": "Guard",
    "title.help": "Help & Glossary",
    "common.back": "← Back",
    "settings.language.title": "Language",
    "settings.language.copy":
      "Choose the app language. Switches instantly and is saved on this device.",
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
      "A plain-language guide to every Vaenyx feature will live here, once the features settle.",
    "disclaimer.ai": "AI can make mistakes — double-check anything important.",
    "disclaimer.health":
      "This isn't medical advice. Follow your doctor for medication, dosage, and diagnosis — don't use this to set doses or replace a doctor.",
    "disclaimer.finance":
      "Not financial or tax advice — check important decisions with a professional.",
    "disclaimer.legal": "Not legal advice.",
    "disclaimer.community":
      "Community Methods/Routines are made by other users and aren't vetted by Vaenyx as professional advice. 'Verified' means automated checks passed — not that a person reviewed it; community items are at your discretion.",
    "disclaimer.merit":
      "Merit is a reputation record — no cash value, can't be bought, sold, or exchanged; not a currency or security.",
    "disclaimer.remote":
      "Remote access uses Tailscale (a third party) under their terms; you sign in with your own account.",
    "disclaimer.model":
      "Connecting a cloud model (e.g. OpenAI, Gemini) follows that provider's terms and any costs are yours. A local model (e.g. Ollama) runs on your own machine.",
    "disclaimer.confirmTitle": "Before you use this",
    "disclaimer.confirmContinue": "I understand — continue",
    "settings.legal.eyebrow": "Legal",
    "settings.legal.title": "Legal",
    "settings.legal.copy":
      "Plain-language placeholders for now — formal Terms, Privacy, and other documents will be linked here once finalised.",
    "settings.legal.docsPending":
      "Terms of Service · Privacy Policy · Contributor Agreement — coming",
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
    "settings.backup.passwordHintOn": "Encryption is ON. Leave empty to keep the current password; type a new one to replace it.",
    "settings.backup.passwordHintOff": "Empty = no encryption. Set a password and new backups become encrypted files.",
    "settings.backup.passwordWarn": "If you lose this password, encrypted backups CANNOT be opened. Write it down somewhere safe.",
    "settings.backup.passwordClear": "Turn encryption off",
    "settings.backup.destination": "Backup folder",
    "settings.backup.destinationHint":
      "Full path. Leave empty for the default folder on this machine; set another disk, USB drive or NAS to keep copies off this machine.",
    "settings.backup.keep": "Keep most recent",
    "settings.backup.keepHint": "Older backups are removed automatically after each new backup. Empty = keep all.",
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
    "apps.token.fetchRecipe.label": "Fetch recipe (Mode B)",
    "apps.token.fetchRecipe.desc":
      "Mode A (default): Run in Vaenyx. Mode B (this box): Run in the third-party app with their own AI model.",
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
    "routine.confirm.copy":
      "Vaenyx read your message and filled these in. Fix anything that's wrong, fill anything missing, then run.",
    "routine.confirm.missing": "Still needed:",
    "routine.confirm.onePerLine": "One per line",
    "routine.confirm.run": "Looks right — run",
    "routine.confirm.cancel": "Cancel",
    "legal.copyVersion": "2.6",
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
    "legal.consent.flywheel.title": "Help Improve Shared Methods",
    "legal.consent.flywheel.body":
      "This version does not upload improvement patterns. This setting records a preference only. If community improvement sharing becomes available, it will remain off until you are shown current information and make a fresh affirmative choice.",
    "legal.consent.flywheel.accept": "Keep Sharing On (Recommended)",
    "legal.consent.flywheel.decline": "Don't Share",
    "legal.consent.flywheel.sensitiveNote":
      "No content is uploaded in this version. If sharing becomes available, anything Vaenyx recognises as sensitive (health, family, finance) is never shared automatically — it always asks you first, and the check can err.",
    "legal.consent.flywheel.multiUserNote":
      "Automatic sharing is for improvements from your own use. If someone else uses this Vaenyx, use Review Each or Off unless they've agreed and you can confirm you hold the rights to share that example.",
    "legal.notice.modelPicker":
      "This chat uses the provider shown. Cloud providers receive your chat content — including context Vaenyx adds, like memories and project summaries — under their own terms.",
    "legal.notice.project.autoSummary":
      "Vaenyx keeps an automatic short summary of your preferences for this project and uses it as context in this project's chats. It's stored on this device — you can view, edit or delete it anytime. Nothing enters Vaenyx Me without your approval.",
    "legal.notice.modelConnect.cloud":
      "You're connecting a third-party AI provider. Your messages — plus any context Vaenyx adds, like saved memories, your profile, project summaries and attached files — will be sent to the provider you choose, under its terms, privacy policy and any fees it charges. Vaenyx doesn't control that provider.",
    "legal.notice.remoteAccess.enable":
      "Remote access uses Tailscale, a third-party service. You sign in with your own Tailscale account and its terms apply. Once enabled, your Vaenyx instance gets an internet-reachable address — anyone with that address can reach the sign-in screen, and your Vaenyx login is what protects access. Traffic is encrypted in transit; Tailscale states its relays cannot read it.",
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
    "legal.notice.community.report":
      "Report content that is unsafe, infringing, misleading or contains personal information: hello@vaenyx.ai. Vae Foundry Pty Ltd collects directly from you your email address and the report details you choose to provide, and uses them for triage, investigation, response and legal compliance. Reporting is optional, but without enough information to identify the item and explain the issue we may be unable to act. Reports are handled by email on overseas servers — include only what's needed. The current providers, countries and retention rule are stated in the Current Implementation and Data-Handling Schedule; the Core Privacy Policy explains access, correction and complaints.",
    "legal.notice.restore":
      "Vaenyx will restart to restore this snapshot (about 30 seconds). Your current data is saved as an automatic safety copy first, so you can undo it.",
    "legal.notice.restore.confirm": "Restore and Replace",
    "legal.consent.flywheel.settingsNote":
      "This version does not upload improvement patterns. This setting records a preference only. If community improvement sharing becomes available, it will remain off until you are shown current information and make a fresh affirmative choice.",
    "legal.notice.modelConnect.local":
      "This backend address points at your own machine. Vaenyx sends chats for this backend only to that address, under the model's own licence terms.",
    "legal.notice.modelConnect.local.lan":
      "This address is on your local network — it may be another machine, not this one. Vaenyx sends chats for this backend only to that address. Make sure the machine it points at is one you control.",
    "legal.notice.modelConnect.local.unverified":
      "Vaenyx sends chats for this backend only to the address you entered. Make sure it points at your own machine — a remote address means your chats leave this device.",
  },
  zh: {
    "title.ask-vaenyx": "Vaenyx 门户",
    "title.projects": "项目",
    "title.library": "资源库",
    "title.community": "社区",
    "community.intro":
      "大家发布的 Method 和 Routine 都在这里,安装即复制进你自己的资源库。",
    "library.tierCommunity": "社区",
    "community.report.routine": "举报此 Routine",
    "community.report.method": "举报此 Method",
    "community.report.email": "发邮件到 hello@vaenyx.ai",
    "title.modes": "模式",
    "title.settings": "通用",
    "title.vaenyx-me": "Vaenyx Me",
    "title.guard": "守卫",
    "title.help": "帮助与术语",
    "common.back": "← 返回",
    "settings.language.title": "语言",
    "settings.language.copy": "选择应用语言。即时切换,保存在本设备。",
    "settings.language.english": "English",
    "settings.language.chinese": "中文",
    "settings.help.eyebrow": "帮助",
    "settings.help.title": "帮助与术语",
    "settings.help.copy": "用大白话解释 Vaenyx 里你看到的每一个东西。",
    "settings.help.open": "打开帮助与术语",
    "settings.manual.eyebrow": "帮助",
    "settings.manual.title": "使用手册",
    "settings.manual.copy": "这里以后会放一份大白话的功能说明书,等功能稳定后再写。",
    "disclaimer.ai": "AI 可能出错,重要的事请自行核对。",
    "disclaimer.health":
      "这不是医疗建议;用药、剂量、诊断请遵医嘱。别用它定剂量或替代医生。",
    "disclaimer.finance": "不是财务 / 税务建议,重要决定请咨询专业人士。",
    "disclaimer.legal": "不是法律意见。",
    "disclaimer.community":
      "社区 Method / Routine 由其他用户制作,Vaenyx 不对其内容作为专业建议背书;「Verified」仅表示已通过自动检查,并非有人逐条审核,社区档请自行斟酌。",
    "disclaimer.merit":
      "Merit 是信誉记录,无现金价值、不可买卖 / 兑换,不是货币、证券或理财产品。",
    "disclaimer.remote":
      "使用 Tailscale(第三方)提供远程连接,受其条款约束;你用自己的账号登录。",
    "disclaimer.model":
      "连接云模型(如 OpenAI / Gemini)受其条款约束、费用由你承担;本地模型(如 Ollama)在你自己机器上运行。",
    "disclaimer.confirmTitle": "使用前请知悉",
    "disclaimer.confirmContinue": "我明白,继续",
    "settings.legal.eyebrow": "法律",
    "settings.legal.title": "法律",
    "settings.legal.copy":
      "目前是大白话占位 —— 正式的服务条款、隐私政策等文档定稿后会链接到这里。",
    "settings.legal.docsPending": "服务条款 · 隐私政策 · 贡献者协议 —— 待定",
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
    "settings.backup.passwordHintOn": "加密已开启。留空 = 保持当前密码;输入新密码即替换。",
    "settings.backup.passwordHintOff": "留空 = 不加密。设了密码后,新备份会打包成加密文件。",
    "settings.backup.passwordWarn": "密码丢失 = 加密备份永远打不开。请把它写在安全的地方。",
    "settings.backup.passwordClear": "关闭加密",
    "settings.backup.destination": "备份文件夹",
    "settings.backup.destinationHint":
      "完整路径。留空 = 本机默认文件夹;填另一块盘 / U 盘 / NAS 可把副本存到本机之外。",
    "settings.backup.keep": "保留最近",
    "settings.backup.keepHint": "每次备份成功后自动清理更旧的备份。留空 = 全部保留。",
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
    "settings.backup.restoring": "还原中… Vaenyx 正在重启。约 30 秒后刷新本页。",
    "settings.backup.cancel": "取消",
    "settings.backup.error": "出了点问题,请重试。",
    "apps.token.externalNote":
      "Token 是给【外部 app】用的。在 Vaenyx 自己的网页里用 Method 不需要 Token —— 打开 Library 直接用即可。",
    "apps.token.fetchRecipe.label": "取走配方(Mode B)",
    "apps.token.fetchRecipe.desc":
      "Mode A(默认):在 Vaenyx 里跑。Mode B(勾这个):在第三方 app 里、用它们自己的 AI 模型跑。",
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
    "routine.confirm.copy":
      "Vaenyx 从你的话里读出了这些。不对的改一改、缺的补一补,然后运行。",
    "routine.confirm.missing": "还缺:",
    "routine.confirm.onePerLine": "一行一个",
    "routine.confirm.run": "没问题,运行",
    "routine.confirm.cancel": "取消",
    "legal.copyVersion": "2.6",
    "legal.disclaimer.aiGeneral.composer": "AI 可能出错,重要信息请自行核对。",
    "legal.disclaimer.community.browse":
      "社区 Method 与 Routine 由社区成员制作,Vaenyx 不为其背书,也不构成专业建议;'Verified' 仅表示已通过自动检查。",
    "legal.disclaimer.health.banner":
      "这不是医疗建议。切勿依赖 Vaenyx 做诊断、选药或定剂量。紧急情况请立即联系急救服务。",
    "legal.disclaimer.finance":
      "这不是财务建议。重大金钱决定请咨询合格的专业人士。",
    "legal.disclaimer.tax":
      "这不是税务建议。重要数字请与注册税务代理或会计师核对。",
    "legal.disclaimer.legal":
      "这不是法律意见。合同与法律事务请咨询合格律师。",
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
    "legal.consent.flywheel.title": "帮助改进共享 Method",
    "legal.consent.flywheel.body":
      "本版本不会上传任何改进模式。此处只是记录一项偏好。若将来提供社区改进分享,它依旧保持关闭,直到向你展示当时的说明并由你重新做出一次肯定性选择。",
    "legal.consent.flywheel.accept": "保持开启(推荐)",
    "legal.consent.flywheel.decline": "不分享",
    "legal.consent.flywheel.sensitiveNote":
      "本版本不会上传任何内容。若将来提供分享功能,凡 Vaenyx 识别为敏感的内容(健康、家庭、财务)绝不会被自动分享——它总会先问你,且该检查可能出错。",
    "legal.consent.flywheel.multiUserNote":
      "自动分享仅针对你自己使用所产生的改进。若他人也使用这台 Vaenyx,请改用 Review Each 或 Off,除非对方已同意、且你能确认自己拥有分享该示例所需的权利。",
    "legal.notice.modelPicker":
      "本对话使用所示的服务商。云端服务商将按其自身条款接收你的聊天内容,包括 Vaenyx 添加的上下文(如记忆与项目摘要)。",
    "legal.notice.project.autoSummary":
      "Vaenyx 会为此项目自动维护一份你的偏好摘要,并作为本项目对话的上下文使用。它存储在本设备上——你可以随时查看、编辑或删除。未经你的批准,任何内容都不会进入 Vaenyx Me。",
    "legal.notice.modelConnect.cloud":
      "你正在连接第三方 AI 服务商。你的消息,连同 Vaenyx 添加的上下文(如已保存的记忆、你的档案、项目摘要与附件),将发送给你所选的服务商,受其条款、隐私政策及其收费约束。Vaenyx 无法控制该服务商。",
    "legal.notice.remoteAccess.enable":
      "远程访问使用第三方服务 Tailscale。你需用自己的 Tailscale 账号登录,并受其条款约束。开启后,你的 Vaenyx 实例将获得一个互联网可达的地址——任何知道该地址的人都能打开登录页,真正保护访问的是你的 Vaenyx 登录。传输过程加密;Tailscale 表示其中继无法读取内容。",
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
    "legal.notice.community.report":
      "举报不安全、侵权、误导或含个人信息的内容:hello@vaenyx.ai。Vae Foundry Pty Ltd 会直接从你处收集你的邮箱地址与你选择提供的举报内容,用于分流、调查、答复与遵守法律。举报是可选的;但若信息不足以定位该条目并说明问题,我们可能无法处理。举报邮件在海外服务器上处理——请只写必要信息。当前的服务商、国家与留存规则载于《当前实现与数据处理明细表》;查阅、更正与投诉事宜见《核心隐私政策》。",
    "legal.notice.restore":
      "Vaenyx 会重启以还原这个快照(约 30 秒)。会先把你当前的数据自动存成一份安全副本,可反悔。",
    "legal.notice.restore.confirm": "恢复并替换",
    "legal.consent.flywheel.settingsNote":
      "本版本不会上传任何改进模式。此处只是记录一项偏好。若将来提供社区改进分享,它依旧保持关闭,直到向你展示当时的说明并由你重新做出一次肯定性选择。",
    "legal.notice.modelConnect.local":
      "该后端地址指向你自己的机器。Vaenyx 只会把此后端的聊天发送到该地址,并受模型自身许可条款约束。",
    "legal.notice.modelConnect.local.lan":
      "该地址位于你的本地网络——可能指向另一台机器,而非本机。Vaenyx 只会把此后端的聊天发送到该地址。请确认它指向的是你自己掌控的机器。",
    "legal.notice.modelConnect.local.unverified":
      "Vaenyx 只会把此后端的聊天发送到你填写的地址。请确认该地址指向你自己的机器——若是远程地址,你的聊天将离开本设备。",
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
  }, []);

  const t = useCallback(
    (key: string) => STRINGS[lang][key] ?? STRINGS.en[key] ?? key,
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
