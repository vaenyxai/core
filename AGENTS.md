# Vaenyx Project Instructions

## Identity

- Vaenyx is a self-hosted, local-first household AI application: React/Vite web
  (`apps/web`) + Fastify server (`apps/server`) + TypeBox contracts
  (`packages/contracts`) + SQLite.
- Repository: public. AI: yes. PWA: no. Uses MSAL: no. Deploy target: the local
  self-restarting Windows service, not a cloud web host.
- The real local production instance runs on `127.0.0.1:3000` under the SYSTEM
  watchdog. Node.js 24+ and npm 11+ are required.
- Code is MIT-licensed, but the Vaenyx name and brand assets are not; follow
  `LICENSE`, `TRADEMARKS.md`, and `docs/legal/trademark-policy.md`.

## Read First

- Read only what the task needs; this section is navigation, not an instruction
  to load every document.
- Product behavior: the relevant part of `docs/user-manual.md`, its Chinese
  twin, and the matching implementation. Release intent: the current entry in
  `CHANGELOG.md`. Setup/operations: `README.md` and the relevant `Vaenyx-*.cmd`
  or `scripts/` file.
- Legal/consent UI work: `docs/legal/in-app-disclaimers.md` plus the exact
  English/Chinese implementation in `apps/web/src/i18n.tsx`.
- Architecture or capability work: inspect the directly affected module and
  its tests before changing it. A task-specific private design document may be
  read only when Oskar explicitly authorizes that exact file.
- Private handoffs, Owner data, other repositories, and other sessions'
  instruction files are not default project sources and must not be scanned.

## Current Snapshot

- Current production version: `v0.4.11.0` (verified 2026-09-01 against
  `apps/server/src/config.ts`, local tag `v0.4.11.0`, `CHANGELOG.md`, and the
  published GitHub Release).
- Updates are transactional from this version onward: code and database
  snapshots precede replacement; migrations run on a candidate copy; startup,
  integrity, foreign-key and health checks gate the switch; failed or
  interrupted switches automatically restore the old code/data pair.
- Repository layout: application code in `apps/`, shared packages in
  `packages/`, backup/diagnosis/licence tooling in `scripts/`, user
  documentation in `docs/`, and neutral demo content only in `sample-library/`.
- `userdata/` is the Owner's private instance state: database, WAL/SHM,
  library, backups, update state and logs. It is gitignored and is never a test
  fixture or source of repository facts.

## Hard Rules

- Absolute no-read boundaries: `userdata/`, every `.env`, and everything under
  the active Windows user's profile (including secret/config stores). Never
  request a bypass.
- This repository is public. Never commit credentials, tokens, real personal
  paths, logs, Owner content, database material, or real user data.
- Port 3000 is production: do not connect to it, occupy it, build in its live
  checkout, stop it, or restart it. Run tests in an isolated worktree with an
  isolated data directory and test/smoke-server mode.
- Code and an approved design document disagreeing is a hard stop: report the
  exact divergence and let Oskar decide which is wrong. An unwritten design
  question is a question, not a finding. Review conclusions stay in chat, not
  in this public repository.
- Legal/consent UI wording comes verbatim from
  `docs/legal/in-app-disclaimers.md` in both languages. Never claim that
  "nothing leaves your device"; the configured model backend may be remote.
- Do not modify operative files under `docs/legal/` unless the task explicitly
  names legal-copy work. Do not copy private handoffs, Owner data, or internal
  strategy into this repository.

## Architecture And Data Boundaries

- The server binds to `127.0.0.1` only; never widen the bind address. Windows
  entry points are the root `Vaenyx-*.cmd` files.
- SQLite is the single authority for instance state. Treat `vaenyx.db`,
  `vaenyx.db-wal`, and `vaenyx.db-shm` as one family. Never copy an open
  database with ordinary filesystem copy, never place it in OneDrive, and
  never use live `userdata` for tests.
- Applied migration files are immutable. Add a new numbered migration instead.
  Update migrations run only on a candidate database behind the global
  instance/update/restore lock; commit only after database-backed health passes.
- Backups use SQLite's online backup API. Restores and update switches require
  exclusive ownership and must retain rollback material until restored startup
  health succeeds.
- **Visual Output Leads.** When a feature has a visual result, make it the most
  prominent output and let text support it; pure-text features may stay text.
- **Never Decide Silently.** Ambiguous product choices require a large,
  unmissable chooser rather than a guess.
- **Dot Points, Never Walls.** Model-generated user-facing text uses short,
  one-per-line points; prompts producing that text say so explicitly.
- **The Owner-Selected Model Drives Capabilities.** A capability uses the model
  selected for its provider in Settings → Models; a pinned default applies only
  when none is selected. If the chosen model cannot do the job, fail aloud with
  the provider's words and never silently substitute another model.

## Commands

- Install: `npm ci`.
- Development (only in an isolated checkout): `npm run dev`.
- Required gate: `npm run check`.
- Focused operational checks: `npm run test:production`, `npm run test:ops`,
  and Windows transactional-update rehearsal `npm run test:update:windows`.
- After editing either translation twin, update both and run
  `node scripts/Vaenyx-Check-Translations.mjs --write`.
- When dependencies change, regenerate the shipped licence manifest with
  `npm run licenses`.
- Release automation is `scripts/Vaenyx-Release.ps1`; run it only from a clean,
  current `main` when the task explicitly authorizes a release.

## Verification And Release

- `npm run check` must pass before every commit; it covers naming,
  architecture, translations, lint, typecheck, tests, and build. Run it in an
  isolated worktree when the main checkout serves production.
- English/Chinese documentation pairs are enforced by
  `docs/translation-pairs.json`. Change both twins in one commit and re-record
  the pair. `docs/user-manual.md` is authoritative and appears in Settings →
  Manual; any described feature change updates it, `docs/user-manual.zh.md`,
  and their version lines in the same commit.
- Dependency changes also update `THIRD_PARTY_LICENSES.md`.
- Before commit, inspect `git status --short` and `git diff --cached`; confirm
  the staged set contains no secret, token, personal path, or user data. Add
  only named files, never `git add .` or `git add -A`.
- `apps/server/src/config.ts` is the version source; released versions also
  require the matching `CHANGELOG.md` entry, tag, GitHub Release and verified
  fixed/versioned assets. Production versions have no suffix. Do not bump or
  release unless the task authorizes it.

## Multi-Agent Conflict Hotspots

- Before any write, run `git status --porcelain`,
  `git worktree list --porcelain`, `git log --all --not main --oneline`, and
  `git fetch origin`; compare local/main/remote before committing and pushing.
- Hard-stop on unfinished or overlapping work. Report the owner/branch,
  overlapping files or interface, risk, recommended resolution, and the exact
  condition needed to resume; never absorb another session's work silently.
- Mandatory isolated-lane hotspots: migrations/schema, auth/security, shared
  contracts, config/version, updater/restore/backup, launchers/service files,
  dependencies, legal copy, release workflow, and Shared Rulesets.
- Parallel writers require separate worktrees under
  `C:\worktrees\core-<agent>-<task>`. Remove the worktree after merge. Remote
  changes touching the same files are a hard stop; non-overlapping changes may
  be rebased only from a clean tree and then retested.

## Shared Rulesets

<!-- SHARED-RULESET:AI-CONNECT VERSION:8 UPDATED:2026-08-07 -->
适用:Identity 声明 `AI: yes` 的项目。凡接大模型的 app,「模型连接」界面按本节做,各 app 不自创另一套。

**一、界面顺序:先选模型,后连接**
- 两段并编号:**「1 · 哪个模型干活」在上,「2 · 能连到哪些」在下**——选择才是决定,连接只是管线。
- **一个选择覆盖全部**:主区**一个下拉**,订阅与各厂商模型同列(optgroup)。第二个下拉**只在有话要说时出现**——所选模型做不了某能力(强制,写明「X 做不了 Y」),或用户点「这项用别的模型」(可点回跟随)。**绝不常驻五个下拉**
- **必须一眼看出「现在用了哪几样」**:每类能力写清用途 + 在用/没用,别让人从一个下拉反推。没功能调用的能力**折叠并标「暂时没用到」,折叠而非删除**。
- **别把「其他选项永远是错的」做成设置**:只要有唯一正确值就写死(如温度固定 precise),不给用户一个能误伤自己的旋钮。
- **PDF 不单列一类**:逐页转图,归「图形进」。

**二、连接模型(界面第二部分)**
- 订阅与免费**分组标题绝不混**,订阅在前——前者不是免费额度,是 Oskar 自己的付费订阅。
- **订阅登录与各厂商 key 平级**(各一行),订阅不做成 key 输入框下的子菜单——同一类东西:能往哪儿打电话。**已连接 / 已登录的行要高亮。**
- **每家厂商一个自己的 key 输入框**,placeholder 写明是谁的;key 前缀只用来提示「贴错行」,**认不出的形状不许拒绝**(前缀表会过期,用户的 key 不会)。
- 只列本 app **连得上**的厂商;略去的要报数量,不静默截断。不可选的选项**灰显 + 写明原因**,不隐藏不删除。
- 「调查」放**最底部**。🔴 免责(谁答的 + 哪天 + 可能有误)**不得与答案分离**:可整块折叠,但**折叠标题本身要带这三样**,展开后完整免责在答案正上方。禁止**只看见答案却看不见免责**。
- 🔴 **调查只提供名单**:能力与第三节的事实一律来自**本地对照表**(模型会编能力表,点亮按钮一点就炸),绝不来自调查。

**三、🔴 钱与隐私,必须标在做选择的地方**
- **免费 / 付费**要标,未知按**付费**处理——误标成免费的代价是一张没人同意过的账单。
- **免费档是否留存并训练**要标,附核对日期与「请到官网确认」;未知一律按**会训练**处理。
- **不得**在帮助文案里写「不用于训练」这类**无条件承诺**——真假取决于当前是哪家哪档,换一把 key 就变假话。

**四、订阅通道 = 两个 CLI 登录点(Vaenyx 提供)**
- Vaenyx(跑在 Oskar 家 Mini PC)对外**只开放两样**:OpenAI(Codex CLI 登录)与 Anthropic(Claude 订阅登录)。**与 Vaenyx 自己在用哪个模型无关**;调用方**明确点名,不存在 "auto"**。
- **只提供两类能力:文字、图形进(读图 / 读 PDF)。声音进 / 声音出 / 图形出两个订阅都不提供**,health 如实报 unsupported,**调用方不得为这三类做订阅通道的界面**。
- **只给 Oskar 本人用**(个人订阅条款,多人共用可能封号)。门在网络层:**必须在 Owner 自己的 tailnet 里**——别人装了 Tailscale 也是他自己的私网,进不来,所以 **app 不写任何身份判断**,连不上自然降级。

**五、backup 一律在调用方,Vaenyx 不做内部降级**
- 最常见的失败是**整台 Mini PC 不在**(关机 / 不在 tailnet),那时它无法替任何人降级。Vaenyx 只做两件事:**干成**,或**诚实报出失败原因**。
- **调用方的 backup 就是它原来那条路**(后端自己的 key,或前端自己填的 key),**不是新加的第二个模型**;后端 Worker 与共用 key **一行都不用改**。
- **决定权必须在前端**:只有前端所在设备可能在 tailnet 里,**云端后端永远连不到 Vaenyx**。
- **免费 / 自带 key 的模型 → 单选无 backup**(它一直在线,偶发失败该重试或报错,不该静默换人);**订阅通道 → 必须有 backup**,预填成现在已在用的那个,不留空。

**六、Test 按钮**
- **测在做选择的地方**:凭据级 Test 只答"通没通";能力验证放在**每个具体选项旁边**,选哪个测哪个。
- ⭐ **主用与 backup 各一个 Test,都能单独点**。只测主用等于没验备胎——真降级那天才发现它也不行。
- **Test = 真发一次那种调用**:不许查表、读配置、信厂商文档、信模型自述。取模型名用**当前屏幕上选中的那个**,不取已保存的旧值(否则刚换的模型会拿到属于旧模型的绿勾)。
- **三种结果不许合并**:① ✓ 成功;② ✗ 失败——显示对方**原话**(从 JSON 挑 message 字段,别糊整个信封);③ — **我们自己还没实现这条路**——灰字,**不是红叉**。绿勾骗人;红叉是把自己没做的赖给对方。
- 按钮执行时 disable + 改文案,结束**必须还原**,不许卡 loading。

**七、降级(调用方必做)**
- 连不上订阅通道 → **自动切到该能力的 backup**,功能继续可用,绝不整体卡死。
- **必须具名告知**:「GPT-4o 连不上(Vaenyx 未响应),已改用 Gemini 2.0 Flash」。**绝不静默切换**,不写笼统的"已改用免费模型"。**后端内部换模型同样算降级**,一样要说出来。
- 健康检查 **3–5 秒超时**即判不可用并立刻切;健康状态**缓存几十秒**,别每次调用都探。
- 若该能力免费路也做不了:明说「此功能需要 Vaenyx 在线,请稍后再试」——**不假装成功、不编答案**。

**八、Vaenyx 自身不做模型 backup**
- 单人自持工具,模型出问题由 Owner 进设置改——自动切换会让人不知道答案是谁给的。代价是**失败信息必须精确到「哪条路、为什么、去哪改」**,并**一键跳到对应设置项**。
- **无人值守的定时任务失败时,原因必须留在任务上可见**,不得静默改用别的模型。

**九、文件:传短命链接,不传文件本体**
- 只发**短命下载链接**(SharePoint / R2,几分钟失效),Vaenyx 自己去下载——文件通常已在云上,手机"先下再传"是双倍流量。
- 上限(文件数 / 单个大小 / 总大小 / 超时)**超限明确报错,不静默截断**;临时文件**用完即删**;日志只记元数据,**不记文件内容**。

## Known Hazards

- Unknown capability names in a manifest must **refuse to run**. This is
  deliberately the opposite of `routine.json`, where unknown fields are
  silently discarded. "Correcting" either behavior without reading its design
  reverses an intentional boundary.
- A clean `vaenyx.db` file is not the whole database while WAL mode is active;
  separating it from `-wal`/`-shm` can lose committed user data.
- A candidate update may migrate only its isolated database. Opening or
  migrating live `userdata` during validation defeats rollback.
- The first update that installed `v0.4.11.0` was executed by the older updater;
  that release intentionally contained no new migration. Transactional update
  protection governs updates launched by `v0.4.11.0` and later.
- The main checkout may look idle while it is serving production. Never infer
  that port 3000 or its files are safe to touch from Git status alone.

## Documentation Map

- Product operation and user-visible behavior: `docs/user-manual.md`
  (authoritative) + `docs/user-manual.zh.md`.
- Release history and What's New: `CHANGELOG.md`; current code version:
  `apps/server/src/config.ts`.
- Setup and deployment facts: `README.md`, root `Vaenyx-*.cmd`, and the directly
  relevant script under `scripts/`.
- Translation pairing state: `docs/translation-pairs.json`.
- Operative legal text and exact UI copy: `docs/legal/`; do not infer product
  architecture from legal wording.
- Code-level architecture: the affected module and its tests. Private design
  documents may clarify intent when explicitly authorized, but are never copied
  here and private handoffs never become permanent project documentation.
