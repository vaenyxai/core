# Vaenyx Windows Mini PC 使用指南

这份指南适合不熟悉开发工具的使用者。日常使用时，不需要输入命令。

## 你会看到的文件

| 文件 | 用途 |
| --- | --- |
| `Vaenyx-Start.cmd` | 日常启动 Vaenyx，自动打开 `http://localhost:3000` |
| `Vaenyx-Stop.cmd` | 手动停止 Vaenyx；Settings 页面也有停止按钮 |
| `Vaenyx-Backup.cmd` | 安全备份私人数据库；Vaenyx 运行时也可以备份 |
| `Vaenyx-Restore.cmd` | 从备份恢复；必须先停止 Vaenyx |
| `Vaenyx-Update.cmd` | 先备份，再从私人 GitHub 更新和检查 |
| `Vaenyx-Diagnose.cmd` | 检查 Node、npm、curl、构建、数据库和服务状态 |
| `Vaenyx-Connect-Codex.cmd` | 安装或连接独立 Codex CLI，使用 ChatGPT Subscription Auth |
| `Vaenyx-Repair-Codex-Visual.cmd` | 修复 Codex Desktop 更新后可能出现的视觉检查沙箱问题 |
| `Vaenyx-Start-Development.cmd` | 只有修改源代码时才使用 |

## 第一次启动

1. 双击 `Vaenyx-Start.cmd`。
2. Vaenyx 会先检查 `curl.exe`、Node.js 24+ 和 npm 11+；如果缺东西，会显示 `[Missing]` 或 `[Old]`。
3. 第一次可能需要安装依赖和构建，请稍等；窗口会显示 `[1/4]` 到 `[4/4]` 的进度。
4. 会出现一个自动最小化的 `Vaenyx Service` 窗口；使用 Vaenyx 时保持它最小化即可，不要直接关闭它。
5. 浏览器会自动打开 `http://localhost:3000`。
6. 创建 Owner 名称和密码。

密码只保存在这台机器的私人数据库中。目前没有忘记密码重置功能。

## 日常使用

1. 双击 `Vaenyx-Start.cmd`。
2. 使用完成后，在 Vaenyx 里进入 `Settings`，点击 `Stop Vaenyx`。
3. 看到停止提示后，关闭浏览器页面。

普通启动使用生产模式，网页和服务都由端口 `3000` 提供。端口 `5173`
只用于开发模式。

关闭浏览器页面本身不会可靠停止 Vaenyx，因为刷新、缓存、断网和关页很难
被网页后端准确区分。请使用 `Settings -> Stop Vaenyx`；如果网页打不开，
再双击 `Vaenyx-Stop.cmd` 作为手动备用方法。

启动后不应该长期看到额外的 Node.js 命令窗口。Vaenyx 会把后台日志写入
`userdata/logs/`。如果浏览器没有自动打开，双击 `Vaenyx-Diagnose.cmd` 检查。

如果想把一个想法整理成工作简报，在 Ask 页面选择 `Task Brief`。Vaenyx
会按目标、当前情况、需要的信息、建议步骤、风险和下一步行动生成结构化
简报；这仍然是 Level 0，只提供建议，不会替你执行外部动作。

## 连接 Forge / Codex

1. 双击 `Vaenyx-Connect-Codex.cmd`。
2. 如果尚未安装，它会安装官方独立 Codex CLI。
3. 按官方 Codex 页面使用 ChatGPT 登录。
4. 在 Vaenyx 的 Ask 页面选择 `Forge · Vaenyx read-only`。

Vaenyx 不读取或保存 Codex Token。Forge 第一版只能读取当前 Vaenyx 仓库，
不能修改文件、访问其它项目或使用命令网络工具。外部 App 仍然只能使用
Mock 路线。Forge 必须成功读取至少一个相关仓库文件后，Vaenyx 才会接受
它的答案；没有实际检查、越过仓库范围或尝试使用网络工具时会自动失败。

在 `Settings` 页面中，如果看到：

- `Connected through ChatGPT / Codex Auth`
- `API billing: Not used by Forge route`

表示 Vaenyx 当前使用的是本机官方 Codex 登录路线，不是 OpenAI API Key
扣费路线。未来如果增加 OpenAI API Key Provider，会作为单独选项显示，
不会静默切换。

可以点击 `Run connection test` 做一次真实检查。通过时表示 Forge 已经
用 ChatGPT / Codex Auth 完成一次只读仓库检查；这个测试不会修改文件。

也可以点击 `Send chat test` 发一条短消息。通过时表示 Vaenyx 可以通过
你的 ChatGPT / Codex 登录做一次普通对话。这个测试不会读取文件、修改文件，
也不会把 Token 暴露给浏览器。第一次发送可能会慢一些，因为 Vaenyx 需要
准备本机 Codex bridge；后续短测试会尽量复用这个 bridge，并在页面显示
实际响应时间。

## 备份

1. 双击 `Vaenyx-Backup.cmd`。
2. 看到 `Backup created` 即表示成功。
3. 备份位于 `Vaenyx/private/backups/日期时间/`。

备份包含 Owner、Projects、Tasks、Memory、App Profiles 和审计记录。备份是
私人数据，不要上传到 GitHub、网盘公开链接或发给其他人。

## 恢复

1. 双击 `Vaenyx-Stop.cmd`。
2. 双击 `Vaenyx-Restore.cmd`。
3. 输入要恢复的备份编号。
4. 输入大写 `RESTORE` 确认。
5. 双击 `Vaenyx-Start.cmd`。

恢复前，Vaenyx 会自动为当前数据库再创建一份安全备份。

## 更新

1. 双击 `Vaenyx-Stop.cmd`。
2. 双击 `Vaenyx-Update.cmd`。
3. 更新程序会自动备份、从当前私人 GitHub 仓库下载代码、安装精确依赖并运行发布检查。
4. 完成后双击 `Vaenyx-Start.cmd`。

如果本地源代码有未提交修改，更新会主动停止，避免覆盖修改。

## 出现问题时

1. 双击 `Vaenyx-Stop.cmd`。
2. 双击 `Vaenyx-Diagnose.cmd`。
3. 查看是否出现 `[FAIL]`。
4. 查看 `userdata/logs/` 中最新的 `-error.log`。

诊断报告不会显示密码、Token、Memory 或任务内容。

如果 Codex Desktop 的视觉检查显示 Windows 沙箱错误，不要关闭沙箱。
双击 `Vaenyx-Diagnose.cmd` 可以先检查是否需要修复。需要修复时，再双击
`Vaenyx-Repair-Codex-Visual.cmd`，然后直接重试视觉检查。只有发现 Codex Desktop
更新改坏配置或沙箱程序时才会修改文件，并且修改前会自动备份。修复程序只接受具有有效
OpenAI 数字签名的 Codex 文件。

## 安全边界

- Vaenyx 默认只监听本机 `127.0.0.1:3000`。
- 不需要在 Windows 防火墙中开放 Vaenyx 或端口 `3000`。
- 不要为了排错而关闭防火墙或病毒防护。
- 如果安全软件隔离启动文件，不要信任整个 Vaenyx 文件夹、整个磁盘或整个
  PowerShell。优先使用新的 `Vaenyx-Start.cmd`；如果仍需信任，只信任当前
  Vaenyx 文件夹内的单个明确文件。
- Vaenyx 的日常使用脚本不应依赖隐藏 PowerShell、下载器式启动脚本或宽泛
  白名单；如果看到这类要求，应先修正脚本，而不是放宽安全软件。
- Codex 登录资料由官方独立 Codex CLI 管理；不要把 `.codex/auth.json`
  上传、发送或复制到 Vaenyx。
- App Token 只能放在外部 App 的后端秘密变量中，不能放进浏览器代码。
- `private/`、旧版 `data/`、旧版 `backups/` 和 `.env` 都是私人内容，
  不能提交 GitHub。

## 命名规则

- 给使用者双击的文件统一使用 `Vaenyx-动作.cmd`。
- 对应的 PowerShell 操作脚本统一使用 `scripts/Vaenyx-动作.ps1`。
- 新增同类文件时必须遵守相同前缀，项目检查会自动阻止不一致命名。
