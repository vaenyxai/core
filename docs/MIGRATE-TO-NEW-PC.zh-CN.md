# Vaenyx 换电脑

换到另一台 Windows 电脑，就三件事：旧机备份、新机安装、还原。全程不需要 Git、
命令行，也不用改任何配置文件。安装和备份平时长什么样，见
[WINDOWS-MINI-PC-GUIDE.zh-CN.md](WINDOWS-MINI-PC-GUIDE.zh-CN.md)。

## 什么会跟着走，什么不会

**你的数据会走，装在一个备份文件夹里。** 备份是一个以日期时间命名的文件夹，
里面有：

- `vaenyx.db` —— 数据库：你的聊天、任务、记忆、项目、Owner 登录信息和各项设置。
- `library` —— 你整个 Library 的副本（你自建的和安装来的 Method 与 Routine）。
- `manifest.json` —— 一份简短的内容说明。

**你连的模型不会走 —— 这条请看两遍。** API key、ChatGPT 登录状态和推送密钥对
**不在备份里**。它们放在 Vaenyx 文件夹下的 `private\secrets`，和你在 `userdata\`
里的数据是分开的。所以新电脑到手时是**没有连任何模型**的，需要你在新机上重新
连一次。如果你更想把它们带过去，就自己有意识地把那一个文件夹复制过去 —— 里面是
你的密钥，请按密钥的规格对待。

另外三样东西是**按机器**配的，不会跟着走：开机自启任务、通过 Tailscale 的手机
访问，以及你的备份设置（Backup Folder、Keep Most Recent、Automatic Backup、
Backup Password）。

**如果你设了 Backup Password**，备份文件夹里装的是一个加密文件（AES-256-GCM），
而不是明文的数据库和 Library。请务必留好这个密码：没有它，这个备份**在任何电脑
上都打不开**。

**还原之后，你用的是旧电脑的 Owner 名字和密码登录** —— 因为登录信息就在刚还原
的那个数据库里。

## 旧电脑

1. 打开 Vaenyx，进 **Settings → Backup**，点 **Create Backup Now**。（双击
   `Vaenyx-Backup.cmd` 是一样的效果。）
2. 记下它去了哪里。设过 **Backup Folder** 就在那里；没设就在 Vaenyx 文件夹下的
   `userdata\backups\`。页面上那个列表最上面一条，就是你刚做的这份。
3. 如果你设了 **Backup Password**，现在就把它写下来。新电脑上要输入它，除此之外
   没有任何办法打开这个备份。
4. 停掉 Vaenyx：**Settings → User Settings → Account & Power → Stop Vaenyx**，
   或者双击 `Vaenyx-Stop.cmd`。
5. 移除开机自启：右键 **`Vaenyx-Uninstall-Autostart.cmd`**，选**以管理员身份
   运行**。自启任务是按机器注册的，不移除的话旧电脑每次开机还会把 Vaenyx 拉起来，
   结果就是两台机器各跑一个实例、各存各的数据。
6. 新电脑跑通之前，旧电脑的 Vaenyx 文件夹先别动。它是你的退路。

## 把备份挪过去

把**整个备份文件夹**复制到新电脑，不是只复制那个数据库文件。U 盘、移动硬盘、
家里的共享盘，你惯用哪种都行。

那个文件夹装的是你的私人数据：聊天、记忆、文件。请按对待自己文件的规格保管，
搬完之后把 U 盘里的那份删掉。

## 新电脑

1. 下载 `vaenyx-setup.zip`。
2. 右键点压缩包，选**全部解压缩**，解压到 `C:\` 之类简短普通的位置，会得到一个
   名为 `Vaenyx` 的文件夹。不要放进 OneDrive、Dropbox、Google Drive、iCloud
   Drive —— 安装程序会拒绝这些位置。
3. 打开这个文件夹，双击 **`Vaenyx-Setup.cmd`**，中途别管它，等它跑完。第 5 步的
   Windows 权限弹窗要点同意 —— 那一步是在**这台**机器上注册开机自启。
4. 安装完会打开 `http://localhost:3000`，走完三屏首次设置：
   - **Create Your Vaenyx** —— Owner 名字和密码随便填一个能记住的即可；几分钟后
     的还原会把它们换成你旧机的那套。
   - 接受条款，并选一个分享选项。
   - **Connect Your First Model** —— 点 **Skip For Now**，模型等还原之后再连。
5. 把你的备份文件夹复制到新 Vaenyx 文件夹下的 `userdata\backups\` 里。没有这个
   文件夹就自己建一个。
6. 打开 **Settings → Backup**。如果你的备份是加密的，先把旧机的密码填进
   **Backup Password**，点 **Save Backup Settings**。
7. 这时列表里就会出现你的备份。点它旁边的 **Restore**，确认。大约 30 秒并会重启
   Vaenyx；这台机器上当前的数据会先被存成一份安全副本。
8. 刷新页面，用**旧电脑**的 Owner 名字和密码登录。聊天、项目、Library 应该都在。

## 搬完之后

1. **重新连模型。****Settings → AI Settings → Models** —— 用 ChatGPT 登录，或者
   粘贴一个 API key。没连模型之前什么都跑不起来。
2. **东西都拷完之后,把 `Vaenyx-Setup.cmd` 再跑一次。**复制或移动过来的文件夹会
   带着或继承原来位置的权限,把这台电脑上其他 Windows 账号挡在 `userdata\` 外面的
   那把锁不会跟着文件走 —— 重跑一次安装脚本就补回去了。
3. **确认自启只在新机上。** 新机是安装时注册好的，旧机在上面第 5 步已经移除。
4. **重设备份设置。** Backup Folder、Keep Most Recent、Automatic Backup、Backup
   Password 在新机上都是空的。旧的 Backup Folder 如果指向一个这台机器上不存在的
   盘符，请重新设一个。
5. **手机访问要重做（如果你之前配过）。** Tailscale 是按机器配的：在新电脑上装好
   官方客户端，再运行一次 `Vaenyx-Connect-Tailscale.cmd`。
6. **在新电脑上重新做一次备份**，让这台机器上的第一份备份是你有意做的。
7. 以上全部跑通之后，再去清理旧电脑的 Vaenyx 文件夹 —— 记住删文件夹 = 连里面的
   数据一起删掉。

## 出问题时

- **还原之后更糟了。** 每次还原前，Vaenyx 都会把原有数据存进 `userdata\backups\`
  下一个 `before-restore-…` 文件夹。它会出现在 **Settings → Backup** 列表里，标着
  自动安全副本，还原方式和普通备份完全一样。
- **列表里看不到那个备份。** 检查你复制的是不是整个文件夹（里面要有
  `manifest.json`），以及它是不是**直接**放在 `userdata\backups\` 下，而不是又多
  套了一层。
- **Vaenyx 起不来。** 双击 **`Vaenyx-Diagnose.cmd`**，它会打印一串 `[OK]` /
  `[FAIL]`；再去 `userdata\logs\` 看日志：`vaenyx.log` 是服务做了什么，
  `vaenyx-error.log` 是出了什么错，`setup.log` 是安装记录。重复双击
  `Vaenyx-Setup.cmd` 是安全的：做完的会跳过，缺的会补上。
- **怎么都不行。** 旧电脑原封没动。开机、跑 `Vaenyx-Start.cmd`，你就回到原点了。
