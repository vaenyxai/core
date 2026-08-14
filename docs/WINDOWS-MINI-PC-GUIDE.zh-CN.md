# Vaenyx Windows 使用指南

这份指南讲怎么把 Vaenyx 装到一台 Windows 电脑上，以及日常怎么用。全程不需要
命令行、Git，也不用改任何配置文件。

## 这是什么

Vaenyx 是运行在你自己电脑上的家庭 AI 助手。你的聊天、任务、记忆、项目和
Method 都存在这台机器的 `userdata\` 目录里，Vaenyx 自己不会上传任何东西。

Vaenyx 本身不含 AI 模型，它调用你连接的模型 —— 可以是你自己账号下的云端服务
商，也可以是你自己硬件上的本地模型。发给**云端**模型的内容会到达那家服务商，
受其条款约束。也就是说：你的笔记、聊天记录和文件留在这台电脑上；你发给云端模
型的那条消息不留。

Vaenyx 服务只监听 `127.0.0.1` 的 `3000` 端口 —— 只在这台电脑上可访问。不需要
在防火墙或路由器里开放任何端口。

## 你需要什么

- 一台长期开机的 Windows 10 或 11 电脑（小型 mini PC 最合适）。
- 大约 2 GB 空闲磁盘空间。
- 安装时需要联网；之后连云端模型时也需要。
- 其它都不用准备。Vaenyx 需要 Node.js 24 以上和 npm 11 以上，缺了的话安装程序
  会自己装。

**文件夹放哪里**：放在简短、普通的路径下，比如 `C:\Vaenyx`。安装程序会拒绝
OneDrive、Dropbox、Google Drive、iCloud Drive 里的路径 —— Vaenyx 在文件夹里维护
一个实时数据库，云同步会把这类文件搞坏。路径太长同样会被拒绝，路径带空格会给
出警告。

## 安装

1. 下载 `vaenyx-setup.zip`。
2. 右键点压缩包，选**全部解压缩**，解压到 `C:\` 之类的位置，会得到一个名为
   `Vaenyx` 的文件夹。
3. 打开这个文件夹，双击 **`Vaenyx-Setup.cmd`**。
4. 会弹出一个黑色窗口，自动走完六个步骤。中途别管它，等它跑完。

六个步骤分别做什么：

- **[1/6] Checking This Computer** —— 清除 Windows 给下载文件打的"来自互联网"
  标记，检查文件夹位置，报告 Windows 版本以及是否已装 Node.js。
- **[2/6] Making Sure Node.js Is Installed** —— 如果 Node.js 缺失或版本太旧，
  安装官方 Node.js LTS（约 30 MB 下载）。
- **[3/6] Downloading What Vaenyx Needs** —— 最慢的一步，第一次要几分钟。这步
  需要联网，失败会自动重试一次。
- **[4/6] Preparing Vaenyx** —— 用下载来的文件构建应用。
- **[5/6] Starting Vaenyx With Windows** —— 注册开机自启（见下）。
- **[6/6] Starting Vaenyx** —— 启动服务，等它响应，然后在浏览器里打开
  `http://localhost:3000`。

### 那个 Windows 权限弹窗

第 5 步是唯一需要 Windows 授权的一步。它注册一个名为 `VaenyxAutostart` 的计划
任务：开机时启动 Vaenyx，万一它自己停了也会重新拉起来。有了这一步，Vaenyx 才
像个家电，而不是一个你得记得去打开的程序。

（如果第 2 步确实要装 Node.js，那里 Windows 也会弹一次权限窗 —— 那是官方
Node.js 安装程序的弹窗，不是 Vaenyx 的。）

**如果你拒绝了这个弹窗**，也不会坏事。安装程序会提示一句，照样启动 Vaenyx 并
正常收尾，只是重启电脑后它不会自己回来 —— 每次用 `Vaenyx-Start.cmd` 启动即可。
想以后再开自启，右键 **`Vaenyx-Install-Autostart.cmd`**，选**以管理员身份运行**。

安装中途报错也不要紧：它会告诉你要修什么，修完再双击一次 `Vaenyx-Setup.cmd`
是安全的。

## 第一次在浏览器里

只有三屏，一次性。

1. **Create Your Vaenyx**：填一个 Owner 名字和密码（至少 6 位），再输一遍确认。
   这个密码只保存在这台机器上。**目前没有找回密码的功能** —— 丢了就进不去了，
   请写在安全的地方。
2. **条款与分享选择**：先是 AI 提示，然后是一个标题为 *Help Improve Shared
   Methods* 的选择：**Keep Sharing On (Recommended)** 或 **Don't Share**。必须
   二选一 —— 没选之前 **Continue** 是灰的。服务条款和隐私政策可以在这一屏直接
   打开阅读；按 **Continue** 即记录你已接受。
3. **Connect Your First Model**：三条路：
   - **Sign In With ChatGPT** —— 已经付费用 ChatGPT 的话选这个，不需要 API key，
     在浏览器里登录一次即可。
   - **Paste An API Key** —— 选服务商、粘贴 key。Google Gemini 和 Groq 有免费额
     度、不用信用卡；OpenAI 和 Claude 是付费 key。
   - **Skip For Now** —— 先随便逛逛，之后在 **Settings → AI Settings → Models**
     里再连。

## 日常使用

- Vaenyx 随 Windows 启动。要用它，打开 `http://localhost:3000`。
- 页面打不开就双击 **`Vaenyx-Start.cmd`**：它会检查 Node.js、补上缺的构建、启动
  服务并打开浏览器。这样启动时会留一个最小化的 *Vaenyx Service* 窗口 —— 让它
  最小化待着，别关掉。
- 重启或彻底关掉，去 **Settings → User Settings → Account & Power**：
  - **Restart Vaenyx**：重启本机服务，起来后自动刷新页面。
  - **Stop Vaenyx**：彻底关闭，并且会一直保持关闭（重启电脑也一样），直到你用
    `Vaenyx-Start.cmd` 再次启动。
- 关掉浏览器标签页**不会**停止服务，要停请用 Stop Vaenyx。
- `Vaenyx-Stop.cmd` 是同样的事情的应用外做法，用于网页打不开的时候。

应用里有：Portal（你的聊天和任务）、Projects、Scheduled、你自己的 Library
（Method 与 Routine）、Community、Vaenyx Me、Guard，以及 Settings —— Modes、
Notifications、Backup、Sharing、Legal 都在 Settings 里。

## 备份

两种做法：

- 双击 **`Vaenyx-Backup.cmd`**。Vaenyx 运行中也能备份，完成时会打印
  `Backup created: ...`。
- 或者打开 **Settings → Backup**，点 **Create Backup Now**。

备份放在 `userdata\backups\` 下，文件夹名是日期时间，里面有数据库
（`vaenyx.db`）、一个 `manifest.json`，以及你 Library 的副本。备份里是你的私人
数据（聊天、记忆、文件），请妥善保管、不要外发。

**Settings → Backup** 里还有：

- **Backup Folder**：填另一块盘 / U 盘 / NAS 的完整路径，让副本存到本机之外。
  留空 = 用默认文件夹。
- **Keep Most Recent**：保留最近几份；每次新备份成功后自动清理更旧的。留空 =
  全部保留。
- **Automatic Backup**：关 / 每天 / 每周，并可选具体几点。
- **Backup Password**：可选加密。**密码丢了，这些加密备份就永远打不开。**
- 已有备份的列表，每条带 **Restore** 按钮。还原约 30 秒并会重启 Vaenyx；还原前
  会先把当前数据存成一份安全副本，所以可以反悔。

想要异地副本，可以让你自己的云同步服务去同步**备份文件夹**；但绝不要同步正在
使用的 `userdata\db` 目录。

换电脑也是同一套：旧机备份、新机安装、还原。见
[MIGRATE-TO-NEW-PC.zh-CN.md](MIGRATE-TO-NEW-PC.zh-CN.md)。

## 用手机访问

Vaenyx 只监听 `127.0.0.1`，所以手机默认访问不到 —— 这一点不要去改，也绝不要在
防火墙或路由器上开放 3000 端口。受支持的做法是走你自己 Tailscale 账号的带认证
隧道，而 Vaenyx 里的 **设置 → 手机访问** 会用按钮把整套事做完：替你安装官方
客户端、打开登录页、开启通道，最后给手机一个二维码。更喜欢控制台的话，
**`Vaenyx-Connect-Tailscale.cmd`** 可以手动跑同样的命令，用的是装在 Program
Files 下的客户端。Tailscale 是第三方服务、受其条款约束，用你自己的账号登录；
地址开出来之后，真正保护实例的是你的 Vaenyx Owner 密码。

## 出问题时

1. 双击 **`Vaenyx-Diagnose.cmd`**。它会打印一串 `[OK]` / `[FAIL]`：Node.js、
   npm、curl、构建、数据库，以及服务是否在跑。它不会打印密码、key 或你的内容。
2. 去 `userdata\logs\` 看日志：
   - `vaenyx.log` —— 服务做了什么。
   - `vaenyx-error.log` —— 出了什么错。
   - `setup.log` —— 每次安装的完整记录。
3. 再双击一次 **`Vaenyx-Setup.cmd`**。重复运行是安全的：已经完成的会跳过，缺的
   会补上。

## 卸载

1. 先备份，并把 `userdata\backups\` 复制到这台机器之外。删文件夹 = 连数据一起
   删掉。
2. 右键 **`Vaenyx-Uninstall-Autostart.cmd`**，选**以管理员身份运行**。这只是移除
   开机自启任务，不会停止正在运行的 Vaenyx。
3. 双击 **`Vaenyx-Stop.cmd`**。
4. 删掉整个 Vaenyx 文件夹。

Node.js 会留着，因为别的程序可能在用。确定没别的程序需要它，再去 Windows 设置
→ 应用里卸载。
