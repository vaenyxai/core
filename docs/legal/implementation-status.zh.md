# Vaenyx — 当前实现与数据处理明细表

> **由 `implementation-status.json` 与 `implementation-status.zh.json` 生成 —— 请勿手工编辑。**
> 明细表版本 **2026-07-27.3** · 自以下日期起生效 **2026-07-26** · 核实于 **2026-07-27**
> 客户端 **0.2.1-dev.32** · 服务端 **vaenyx-core-cloud (migrations 0001-0007)**
> 法律文件集 **v3.1** · 最低法律文件集 **v3.0** · 最低文案版本 **2.8**

## 本明细表的地位

本明细表是就所标识发行版的事实快照。它**不属于《服务条款》的一部分**,不是产品路线图,不是同意,不是许可,也不承诺任何能力将被引入或维持。

只有就所标识发行版被标记为 **active(启用)** 的能力才是可用的。「not-built」「disabled」「backend-only」「local-only」与「manual-only」均不表示该能力现已或将会向用户提供。

本明细表不能扩大核心法律文件所允许的任何收集、使用、披露、许可或授权,也不能减损其中所载的任何保护。若任何必需的告知、同意、合同接受或技术保障缺失,相应能力必须保持关闭。

**第 A 部分**(标题为「当前数据处理明细」)仅作为运营方信息处理实践的当前事实说明并入《隐私政策》。它**不**并入《服务条款》。

## 状态词汇

| 状态 | 含义 |
|---|---|
| `active` | 在本发行版中已建成、已上线,并按所述方式运作。 |
| `available-off` | 已建成但默认关闭,须由用户启用。 |
| `local-only` | 完全在设备上运行;运营方不接收任何内容。 |
| `backend-only` | 服务端已具备,但产品界面尚未上线。 |
| `manual-only` | 只能由运营方手动处理(例如经邮件请求)。 |
| `disabled` | 存在于代码中但被有意关闭。 |
| `not-built` | 尚未建成。文件不得把它描述成已存在。 |
| `external-unverified` | 依赖某项尚未核实的外部事实或合同安排。 |

## 能力

| 能力 | 状态 | 数据离开设备 | 运营方接收 |
|---|---|---|---|
| `feature.community-sharing.preference-ui` | **active** | 否 | 无 |
| `feature.community-sharing.upload-engine` | **available-off** | 是 | 传输途中的一条已去标识化的示例,取走即删 |
| `feature.community-sharing.upload-endpoint` | **not-built** | 否 | 无 |
| `feature.community-sharing.deidentification-pipeline` | **not-built** | — | — |
| `feature.community-sharing.sensitive-category-gate` | **not-built** | — | — |
| `feature.community-sharing.server-evidence-record` | **backend-only** | — | — |
| `feature.publication.core` | **active** | 是 | 声明式文件 + 已登录身份 |
| `feature.publication.example-attachment` | **not-built** | — | — |
| `feature.publication.deidentification-preview` | **not-built** | — | — |
| `feature.merit.record` | **not-built** | — | 无 |
| `feature.community.thanks` | **not-built** | — | 无 |
| `feature.community.ratings` | **not-built** | — | 无 |
| `ops.account.session-expiry` | **active** | — | — |
| `ops.account.expired-session-purge` | **active** | — | — |
| `ops.account.never-published-purge` | **active** | — | — |
| `ops.account.deletion-route` | **manual-only** | — | — |
| `feature.model-provider.connect` | **active** | 是 | 无 |
| `feature.backup` | **active** | 否 | 无 |
| `feature.remote-access` | **available-off** | 是 | 无 |
| `feature.community.discord` | **active** | 是 | 官方服务器内的 Discord 资料、帖子与管理记录 |
| `feature.skill-interop` | **active** | 否 | 无 |
| `feature.pictures.generation` | **available-off** | 是 | 无 |

**`feature.community-sharing.preference-ui`** — 仅记录一项本机偏好。不构成对任何上传的同意。参见 gate.community-sharing.initial。

**`feature.community-sharing.upload-engine`** — **已上线,且默认关闭,除非用户自己打开。** 传输通道已建成并部署;没有启用同意记录(文案包 K3),就不会排队、也不会扫描,而早期版本中记录的那项 Sharing 偏好不能代替它 —— 那项偏好是在「什么都无法离开本机」的年代选择的,因此无法承载对一项当时并不存在的上传行为的同意。
必需的门槛: `legal.consent.flywheel.activate`, `legal.consent.flywheel.receive`, `legal.consent.flywheel.sensitiveAsk`, `flywheel.queue.window`, `flywheel.queue.held`
实现证据: Server enforces, in order: activation record present, publisher receiving switch on (403 if not, so nothing is stored), payload under 32 KB, 20 sends per contributor per day and 5 per contributor per Method per day counted against both the contributor label and a hashed connection, over-limit refused rather than stored. Delivery rows are deleted on collection and expire at 14 days; rate-limiting rows at 7. The instance identifier and consent-event identifier are validated and discarded, never written. Verified in production at dev.21: the capability switch is on, every Part K string renders verbatim at copy 2.7, and a real send completed end to end. The evidence block is now discarded rather than written — a test pins the evidence table at zero rows after an accepted send — so the Schedule's statement that we hold no consent record for a contributing household is true in code and in production, not only in intent.

**`feature.community-sharing.upload-endpoint`** — **标记为启用之前必须先完成:**《服务条款》第 7.4 条已不再载有分享所需的许可、保证与精神权利同意机制(v3.0 删除,因其描述的是并不存在的能力)。这些条款必须重新起草、呈示,并依第 18.1A 条作为实质修订被单独接受。继续使用或安装更新,不得被视为接受。

**`feature.community-sharing.sensitive-category-gate`** — 随上传能力一同交付,不会更早。

**`feature.community-sharing.server-evidence-record`** — D1 表 flywheel_evidence 已存在(migration 0003),但没有任何代码向其写入,因为不存在上传路径。

**`feature.publication.core`** — 发布服务校验的是**形式,不是内容**:允许的声明式文件类型、安全的路径、大小限制、条目标识符的归属,以及已移除条目不得重新发布。它不检查 recipe 写了什么。app 只是客户端,不是边界 —— 已登录的账户可以直接调用该端点 —— 因此任何重要的防护都必须在此强制执行,而我们不就文字含义作任何防护主张。该服务另设有按账户的发布速率上限、由运营方控制的暂停开关,以及一道针对「本会进入公开仓库的联系方式与支付信息」的自动筛查。该筛查只作用于提交内容;其具体检查项与阈值不予公布,我们也不表示它能检出任何特定内容。
发送的文件: `recipe.md`, `schema.json`, `manifest.json (if present)`, `method.json / routine.json with publisher display name stamped as owner`
必需的门槛: `legal.notice.publish`, `legal.notice.publish.contributorTerms`, `legal.consent.publish.warranty`, `legal.notice.publish.signIn`, `legal.consent.publish.overseas`
实现证据: apps/server/src/modules/core/publish.ts collectMethodFiles; core-cloud src/github.ts commitFiles

**`feature.publication.example-attachment`** — 发布路径不发送任何 examples/*.json。不存在示例的去标识化或精确预览。

**`ops.account.session-expiry`** — 会话带有 expires_at,过期后不再通过身份验证。
实现证据: core-cloud src/store.ts sessions table + expiry check

**`ops.account.expired-session-purge`** — 过期的会话记录在到期 30 天后由每日定时清理删除。这 30 天只是缓冲期,用于回答「我为什么被登出了」;会话自到期那一刻起就不再通过任何身份验证。
实现证据: core-cloud src/retention.ts SESSION_GRACE_DAYS + deleteExpiredSessionsBefore; scheduled handler in src/index.ts; cron "17 3 * * *"

**`ops.account.never-published-purge`** — 从未发布过任何内容、且已 90 天未登录的账户,由同一个每日清理删除。有两项有意的豁免:有已发布内容的账户予以保留,因为署名与接受证据必须挂在该账户上;被封禁的账户予以保留,否则删号就能让被封身份重新注册回来。删除账户会级联删除其会话与接受记录。封禁台账与账户之间有意不设外键,因此执法记录在账户删除后仍然存续。
实现证据: core-cloud src/retention.ts DORMANT_ACCOUNT_DAYS + store.ts deleteDormantUnpublishedUsers (banned_at IS NULL, COALESCE(last_sign_in_at, created_at) < cutoff, id NOT IN published_items); migration 0004 adds last_sign_in_at, refreshed at sign-in

**`ops.account.deletion-route`** — 不存在自动删除通道。发往 hello@vaenyx.ai 的请求由运营方直接在 D1 上处理。

**`feature.model-provider.connect`** — 用户指示的第三方处理。提示词以及 Vaenyx 组装的上下文(项目指令、自动摘要的偏好、项目记忆)会到用户所选的服务商,受用户与该服务商之间的关系约束。运营方不接收这些内容。
必需的门槛: `legal.notice.modelConnect.cloud`, `legal.notice.modelConnect.local`, `legal.notice.modelPicker`

**`feature.backup`** — 手动与定时备份、目的地选择、可选 AES-256-GCM 加密、保留最近 N 份。仅本地。

**`feature.remote-access`** — 远程访问在应用之外配置,使用用户自己在该服务商的账户。

**`feature.community.discord`** — 官方 Vaenyx Discord 服务器已上线,由运营方管理。参与是可选的,且需要 Discord 账户 —— Vaenyx 本身从不要求该账户。本界面的应用内告知为文案包字符串 D5;凡产品链接到该服务器之处,均须一并呈示。
必需的门槛: `legal.notice.community.discord`

**`feature.skill-interop`** — 把 Skill 导入为 Method、以及把 Method 导出为 Skill。服务端已建成 —— SKILL.md 解析、逐条列出因依赖代码而被丢弃的具体步骤、把 provenance(来源、到达时的许可证、时间、原文件哈希)写入 method.json 且不进内容哈希(因此记录来源不会迫使所有 app 重新授权)、按 provenance 触发的发布关卡,以及导出端点。导入与导出界面已随 0.2.1-dev.7 上线,能力开关已打开,用户可以进入。两个方向都在本机进行,导入或导出的任何内容都不会到达运营方。当此类 Method 被发布时,provenance 会随之公开 —— 这是有意为之:公开来源与原始许可证,正是履行多数上游许可证所要求的署名。
必需的门槛: `legal.notice.skill.import`, `legal.notice.skill.importedPublish`, `legal.notice.skill.export`
实现证据: Verified on a temporary instance rather than by reading the code: preview listed scripts/extract.py and the step that ran it while keeping the rest, import wrote provenance into method.json, the Method appeared in importedMethodIds so the L2 gate fires on provenance, and export returned the instructions intact. The temporary instance was deleted; the live instance was untouched throughout.

**`feature.pictures.generation`** — Owner 在聊天里要一张图;主模型把该请求改写成一句英文 prompt,发送给 Owner 用自己的 key 连接的图片服务商。生成的图片写入本地 userdata,并纳入本地备份。运营方不在此路径中,不接收任何内容。有两项事实必须披露,因为两者都无法凭直觉猜到:这句 prompt 是由能够看到已保存上下文的主模型写的,因此它可能写进 Owner 并没有打出来的内容;以及该图片服务商可能与聊天服务商并非同一家公司。
必需的门槛: `legal.notice.modelConnect.pictures`
实现证据: The draw option does not exist until an image engine is connected. What the model says about the picture is constrained by construction: generation happens before the model speaks and the result — success, the provider's own failure text, or nothing generated this turn — is injected into its context, so it cannot claim to have drawn something it did not. The F5 promise is kept rather than trimmed: the prompt actually sent is stored and displayed beneath each generated image (dev.32).

## 投诉与合规记录

此处有两套制度重叠,我们有意用一条规则同时满足。《基本在线安全预期》(BOSE)对有害材料的举报与投诉记录设有**五年**保存预期;它本身不是可由法院单独执行的普通义务,但 eSafety 可以通过报告通知、监管调查、不合规机制与公开报告,要求平台说明是否以及如何满足该预期。另一方面,适用于 designated internet service 的《非法材料标准》要求保存为遵守该标准所采取行动的记录,**至少保存至采取行动所在日历年结束后的两年**——这一条是直接的合规要求。把投诉台账统一保存五年,即可同时覆盖两者,无需运行两套系统。

- **投诉台账:** 投诉与处置台账:保存五年。最低字段——收到日期、接收渠道、案件编号、举报人联系方式、URL 或条目标识(或 commit 引用)、投诉类别、投诉摘要、被投诉材料的必要摘录或受限快照、采取的行动、行动时间、是否隐藏/删除/封禁/转介、最终状态,以及是否触发法律保全。
- **合规行动记录:** 合规行动记录:至少保存至采取行动所在日历年结束后的两年。涵盖 Online Safety 风险自评及其各版本、投诉处理流程及其各版本,以及实际实施的筛查、限频与下架控制的记录。
- **附件:** 证据附件不作为常规保存。就诽谤、版权、严重安全或监管事项,保存被投诉材料的受限纯文本快照或精确摘录连同其哈希,以便日后能够证明当时对什么采取了行动、以及为什么。身份证件等高风险附件在完成其所需的核验后即删除或隔离。在判断中未实际使用的附件不予保存。
- **法律保全:** 遇到诉讼威胁、正式关切通知(concerns notice)、法院文件或监管调查时启动法律保全,并就其范围内的材料中止常规删除规则。
- **隐私政策怎么写:** 《隐私政策》只写一般原则——记录仅在为法律、安全、防滥用与运营目的所合理必需的期间内保存。上述具体期限载于本明细表,而不写进政策本身,以免适用标准一变就要修改政策。

## 点位文案

最低文案版本 **2.8** · 同意门槛 **2.6**

两个版本号分开跟踪。**文案版本**在任何字符串改动时都会上升,并被记录在每一次确认里,因此记录总能说明当事人当时看到的是哪一版文字。**同意门槛**只在同意类字符串发生实质变化时上升,而且只有它会重新打扰用户。最近一次实质性的同意变化是 2.6。

**已起草但尚未上线。以下字符串存在于文案包中,并不是产品漏做了 —— 它们所属的界面本身不存在。**

| 字符串 | 为什么尚未上线 |
|---|---|
| `legal.disclaimer.community.verifiedMeaning` | 产品中不存在 Verified 徽章。 |
| `legal.notice.community.discord` | 产品中没有指向 Discord 服务器的入口。服务器本身是运行中的,已记为 flow.community.discord;一旦产品中出现入口,本字符串即须上线。 |
| `legal.disclaimer.merit` | Merit 尚未建成。 |
| `legal.disclaimer.merit.creatorPage` | Merit 尚未建成。 |
| `legal.notice.remoteAccess.status` | 产品中没有远程访问面板。 |
| `legal.consent.flywheel.sensitiveAsk` | 社区分享尚未建成,因此不存在需要同意的敏感内容关卡。 |

**文案审计的局限。** 文案审计比对的是文案包与 app 的字符串表。它不检查某个字符串是否真的被渲染在某个界面上,所以「逐字一致」只说明措辞正确,不说明它出现在屏幕上。字符串可以躺在表里而没有任何界面使用它。

---

# 第 A 部分 —— 当前数据处理明细

*仅作为信息处理的当前事实说明并入《隐私政策》。不并入《服务条款》。*

## 启用的运营方数据流

### `flow.publication.submission`

- **触发方式:** 用户就其选择发布的条目完成发布步骤。
- **来源:** 发布用户的实例。
- **收集方法:** 由用户完成发布步骤所发起,从实例到发布服务的 HTTPS 请求。
- **存放环境:** 发布服务(Cloudflare Worker)及其 D1 数据库;已发布文件被提交到公开的 GitHub 仓库,并通过 Cloudflare 托管的目录提供。
- **关联:** 与发布账户记录(flow.publication.signin)及该次贡献的接受记录相关联。
- **所涉信息:** 声明式条目文件; 发布者显示名称(公开署名); 账户标识符; 接受记录:key 名称、文案版本、语言、账户 id、贡献 id、时间戳
- **主要目的:** 执行用户所请求的发布;留证其对《贡献者协议》的接受;管理已发布内容;内容管理。
- **接收方:** Vae Foundry Pty Ltd 与 Cloudflare, Inc. —— 接收提交内容、发布账户标识符与贡献接受记录; GitHub, Inc. —— 仅接收公开的声明式条目文件与公开署名
- **国家:** 美国; 全球边缘网络
- **海外处理依据:** 就向 GitHub 的公开披露,依 APP 8.2(b) 明示同意;就 Cloudflare 基础设施,依 APP 8.1 合理措施(见下方未核实事项)。
- **留存:** 已发布内容在发布期间留存于运营方控制的发布界面,并可依下架流程移除。仓库历史,以及我们控制之外的副本、fork、镜像、缓存与下载,可能持续存在。发布与接受记录仅在为管理该条目、留证现存许可,或确立、行使、抗辩法律主张所合理必需的期间内保留,并定期复核。

### `flow.publication.signin`

- **触发方式:** 用户为发布而使用 Google 或 GitHub 登录。
- **来源:** 用户自行登录后,其所选身份服务商提供服务商名称、稳定的服务商用户 ID、邮箱与可获得的账户名。公开署名由用户提供。内部账户标识符、会话令牌、账户与会话时间戳,以及关联的发布、接受与内容管理记录,均由运营方生成。
- **收集方法:** 由用户发起的 OAuth 授权码交换;服务商返回所列的资料字段。
- **存放环境:** 发布服务的 D1 数据库(users 与 sessions 表)。
- **关联:** 与该账户的已发布内容及接受记录相关联。不与任何实例数据关联 —— 我们从不接收实例数据。
- **所涉信息:** 服务商名称; 稳定的服务商用户 ID; 邮箱; 可获得时的账户名; 用户选定的公开署名; 由我们生成的内部账户标识符; 会话令牌与到期时间; 账户与会话时间戳; 关联的发布、接受与内容管理记录
- **主要目的:** 身份验证、署名、管理已发布内容、内容管理、留证发布时的接受。
- **接收方:** Vae Foundry Pty Ltd; Cloudflare, Inc.(D1 存储)
- **国家:** 全球边缘网络
- **留存:** 过期的会话记录在到期 30 天后删除。从未发布过、且已 90 天未登录的账户会被删除,连同其会话与接受记录一并删除。有已发布内容的账户在该内容存续期间予以保留,因为署名与「接受了什么」的记录都依赖于它;被封禁的账户予以保留,以免通过重新注册规避封禁。两条规则均由每日定时清理执行。

### `flow.infrastructure.request-metadata`

- **触发方式:** 实例向运营方基础设施发出的任何请求(目录读取、发布服务)。
- **来源:** 由发出请求这一行为自动生成的普通技术信息,来自发出请求的设备。
- **收集方法:** 在请求到达我们运营的基础设施时,于 Cloudflare 边缘生成。
- **存放环境:** Cloudflare 边缘日志;运营方无独立的日志存储。
- **关联:** 不刻意与账户关联。若某请求携带会话令牌,技术上可与账户建立关联;我们不为分析或画像目的建立此类关联。
- **所涉信息:** IP 地址; 时间戳; user-agent 与版本字符串; 普通请求元数据
- **主要目的:** 响应该请求;安全与防滥用。
- **接收方:** Cloudflare, Inc.
- **国家:** 全球边缘网络
- **留存:** 尚未核实。边缘请求日志的留存期由基础设施服务商控制,确切的适用设置尚未核实;在核实并记录于此之前,本数据流保持未核实状态。运营方无独立的请求日志存储。

### `flow.correspondence.email`

- **触发方式:** 有人发信到 hello@vaenyx.ai。
- **来源:** 发送该邮件的人。
- **收集方法:** 发往 hello@vaenyx.ai 的入站邮件,路由至运营方邮箱。
- **存放环境:** 传输途中经 Cloudflare Email Routing;静态存放于运营方邮箱。该邮箱的合同状况见未核实事项。
- **关联:** 仅在发件人自行表明账户时(例如提出查阅、更正或删除请求)才与账户关联。
- **所涉信息:** 发件人邮箱地址; 邮件内容; 任何附件
- **主要目的:** 答复来信;处理举报、投诉与隐私请求。
- **接收方:** Vae Foundry Pty Ltd; 邮箱服务商
- **国家:** 海外
- **海外处理依据:** APP 8.1 合理措施 —— 目前尚未核实,见未核实事项。
- **留存:** 尚无已实现的删除流程。有意不写出固定期限(《核心隐私政策》第 9.6 条)。
- **法律地位:** 此处是否在法律上必须有合同保障,尚未定论。APP 8.1 约束的是 APP 主体;年营业额不超过 300 万澳元的小型企业运营者不属于 APP 主体,除非有例外情形适用。运营方是一家没有营业额的新公司,该豁免很可能适用 —— 但这取决于两个尚未回答的问题:(1) 运营方是否与任何本身受《隐私法》约束的机构构成关联法人(related body corporate),这取决于实际持股结构,而非是否共用董事;(2) 是否有其他例外情形适用。无论答案如何,本政策已声明我们以《澳大利亚隐私原则》为基准,不论其是否在法律上约束我们,因此实务措施两种情况下都会执行。
- **计划采取的措施:** 把邮箱从消费级网页邮箱迁到带双重验证、访问人员受限的商业邮箱;把 privacy@、abuse@、security@ 设为其别名;请发件人不要写入凭据、API key 或完整对话(各举报入口已如此告知);不再需要保留的往来邮件予以删除。已签署的数据处理协议是 APP 8.1 所要求「合理措施」中更强的一种形式,仍是目标 —— 但 APP 8.1 要求的是在具体情形下合理的措施,而不是某一份特定合同。

### `flow.community.discord`

- **触发方式:** 加入官方 Vaenyx Discord 服务器、在其中发帖或互动。
- **来源:** 个人自行参与该服务器。
- **收集方法:** Discord 自有平台;运营方管理员通过 Discord 的管理工具看到资料、帖子与管理上下文。
- **存放环境:** Discord 平台,以及运营方实际创建的任何独立管理记录。
- **关联:** 除非个人自行表明,否则不与 Vaenyx 发布账户关联。
- **所涉信息:** Discord 身份与资料; 服务器内的帖子与附件; 举报与管理操作
- **主要目的:** 运营与管理官方服务器,并处理其中的内容举报。
- **接收方:** Vae Foundry Pty Ltd; Discord, Inc.
- **国家:** 美国; 全球
- **海外处理依据:** 个人依 Discord 自身条款直接与 Discord 交互;运营方的角色是服务器管理。
- **留存:** 平台持有的内容依 Discord 现行条款留存。运营方另行创建的任何管理记录,在不再合理需要时予以销毁或去标识化。

### `flow.improvement.sharing`

- **触发方式:** 用户开启「分享改进」(一次单独、明确的同意),某条纠正进入队列,且 48 小时内用户未将其移除。健康、家人与金钱的内容永不自动进入此通道:它们会被扣下并逐条询问。
- **来源:** 作出贡献的用户的实例。个人信息在该设备上、于任何内容发出之前被剥除;该剥除是自动的、并不完美,且用户可以看到队列中有什么。
- **收集方法:** 由实例向分享端点发出的、无需认证的 HTTPS 请求。发送方没有账号,也不需要账号。
- **存放环境:** 发布服务(Cloudflare Worker)及其 D1 数据库,其角色是管道而非存储。一条投递记录在接收方发布者自己的 app 取走的那一刻即被删除;若 14 天内无人取走,则原样删除、不会被阅读。等待中的内容并非端到端加密:运营方在其等待期间技术上能够读到它 —— 本行之所以出现在这里,正是为了如实披露这一点。
- **关联:** 不与发送方的任何账号关联,因为根本没有账号。它携带一个由发送实例自行生成的贡献者 ID —— 那是一个署名标签,不是凭据;我们刻意不为其做任何登记,也无法由我们把它对应到某个人。
- **所涉信息:** 示例本身:问了什么、返回了什么、用户的纠正,以及一条可选备注; 贡献者 ID(自行生成的署名标签); 该示例所对应 Method 版本的内容哈希; 仅用于限流、且只存在于另一行记录中:贡献者 ID、连接的哈希形式、条目 id 与时间戳
- **主要目的:** 把一条纠正送达发布该 Method 的人,以便其改进它。对该端点进行限流与防滥用。
- **接收方:** Vae Foundry Pty Ltd 与 Cloudflare, Inc. —— 作为传输方,在投递等待期间; 接收方发布者 —— 且仅限该发布者已就该 Method 打开接收开关的情形(《贡献者协议》第 9.4 条)。开关关闭时,发送被拒绝,不存储任何内容。
- **国家:** 全球边缘网络
- **海外处理依据:** 依 APP 8.2(b) 明示同意,于启用步骤取得;该步骤已载明服务器位于澳大利亚境外,以及示例会送达发布者。
- **留存:** 投递记录在接收方取走的那一刻删除;若始终无人取走,则 14 天后过期。删除某个发布者账号,即一并删除寄给它的投递记录。限流记录 7 天后删除。已送达的示例不保留任何副本。
- **法律地位:** 发布者收到的内容,少于经过管道的内容:投递载荷只带示例、贡献者 ID 与内容哈希,不带任何关于它来自何处的信息。发送实例所出示的凭证 —— 其实例标识、同意事件的标识、当时所处的模式 —— 在门口被校验,随后即丢弃。由此产生两个后果,且两者都是有意为之。我们不持有作出贡献的家庭的任何设备标识。我们同样不持有该家庭的同意记录:该记录存放在他们自己的机器上,而我们能够展示的,是这项服务会拒绝什么 —— 那一点在公开源代码中可以看到。

## 仅本地处理(运营方不收集)

- 实例上的全部聊天、记忆、笔记、Method、Routine、Journal 与 Gallery 记录。
- 本地备份快照,包括其可选加密。
- 由获授权的 app 返回到本地实例的纠正,以及由其保留下来的任何示例。app 提交到的是用户自己机器上的 Vaenyx 服务器;纠正的任何内容都不会到达运营方,把它保留为示例也不会发布它、不会改变任何已授予的 app 权限。

## 声明

- **自动化决策:** 无。不存在使用个人信息作出、或作出与之实质且直接相关行为的自动化决策安排。
- **直接营销:** 无。不为直接营销使用或披露个人信息。
- **是否征集敏感信息:** 无。不有意征集敏感信息。

## 未核实事项(如实标注为未核实,而非已满足)

### Cloudflare 数据处理条款 — `verified-with-caveat`

- **查明:** 已核实:Cloudflare 现行客户协议第 6.1 条以引用方式并入其数据处理附录(DPA),未区分套餐层级;该 DPA 自身的适用范围不因司法辖区而异,其义务与我们第 8.2 条所要求者相符。
- **保留:** 第 6.1 条的触发条件仅点名 EU/UK/CCPA,两份文件均未提及澳大利亚。因此本项记为「经核实但有保留」,而非无保留地满足。
- **核实时间:** 2026-07-25
- **所需行动:** 在 Cloudflare 条款发生实质修订时重新核实。若需要确定性,请要求 Cloudflare 以书面确认该 DPA 适用于澳大利亚《隐私法》项下的处理。

### 运营方邮箱 — `external-unverified`

- **问题:** 发往 hello@vaenyx.ai 的来信落入不受经核实数据处理条款约束的邮箱。就该数据流,不存在已核实的 APP 8.1 合同保障。
- **备注:** 不作为绝对的上线阻断项。APP 8.1 是否约束运营方本身,取决于本数据流下记录的小型企业运营者问题;而在其确实适用之处,它要求的是在具体情形下合理的措施,而非某一份特定合同。两种情况下都不可接受的,是声称我们并不具备的保障 —— 故立此条。
- **所需行动:** 回答小型企业运营者与关联法人两个问题(这是运营方的会计师或律师的问题,不是本文件能回答的)。同时推进迁往商业邮箱并争取数据处理协议;若取得,则在此记录实际服务商、接收方、国家、保障措施与删除规则。
