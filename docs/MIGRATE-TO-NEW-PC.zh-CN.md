# Vaenyx 换电脑迁移指南

这份指南用于把 Vaenyx 从旧电脑迁移到新电脑。

核心原则：

- GitHub 只负责源代码。
- 私人数据不要上传 GitHub。
- 新电脑要重新登录 Codex / ChatGPT，不要复制 `.codex/auth.json`。
- 最安全的迁移方式是：旧电脑备份，新电脑恢复备份。

## 旧电脑：准备备份

1. 打开 Vaenyx，进入 `Settings`，点击 `Stop Vaenyx`。
2. 双击 `Vaenyx-Backup.cmd`。
3. 看到 `Backup created: ...` 后，记下这个备份文件夹路径。

新版本默认备份位置：

```text
Vaenyx/private/backups/日期时间/
```

旧版本可能在：

```text
Vaenyx/backups/日期时间/
```

备份文件夹里应该至少有：

```text
vaenyx.db
manifest.json
```

只复制这一整个备份文件夹即可。不要复制 `node_modules/`、`dist/`、日志、
Codex 登录文件或浏览器缓存。

## 新电脑：准备环境

1. 安装 Node.js 24 或更新版本。
2. 安装 Git。
3. 登录你的 GitHub。
4. 从你的私人 GitHub repo clone Vaenyx。

示例：

```bash
git clone <你的 Vaenyx 私人 repo 地址>
```

然后进入 Vaenyx 文件夹。

## 新电脑：恢复私人数据

1. 在 Vaenyx 文件夹里创建：

```text
private/backups/
```

2. 把旧电脑复制来的整个备份文件夹放进去。

最终类似：

```text
Vaenyx/private/backups/2026-06-07Txx-xx-xx-xxx/
  vaenyx.db
  manifest.json
```

3. 双击 `Vaenyx-Restore.cmd`。
4. 选择刚复制的备份编号。
5. 输入大写 `RESTORE` 确认。
6. 双击 `Vaenyx-Start.cmd`。

## 新电脑：重新连接 Codex / ChatGPT

1. 双击 `Vaenyx-Connect-Codex.cmd`。
2. 按页面提示登录你的 ChatGPT / Codex 账号。
3. 打开 Vaenyx 的 `Settings`。
4. 先点 `Run connection test`。
5. 再点 `Send chat test`，用一句简单问题测试。

不要复制这些文件：

```text
C:\Users\<你>\.codex\auth.json
C:\Users\<你>\.codex\
OpenAI / Codex 本地登录缓存
```

这些属于新电脑自己的登录状态。

## Private 文件结构

从现在开始，Vaenyx 的私人运行文件集中放在：

```text
private/
  data/
  backups/
  logs/
  exports/
```

这整个 `private/` 目录不会上传 GitHub。GitHub 只会保留
`private/README.md` 这个说明文件。

为了保护旧电脑数据，Vaenyx 仍然兼容旧路径：

```text
data/
backups/
```

如果旧电脑已经有 `data/vaenyx.db`，Vaenyx 会继续使用它，不会强行搬走。
新电脑或新安装默认使用 `private/data`。

## 上传 GitHub 前检查

正常情况下只需要看：

```text
git status --short
```

不应该出现：

```text
private/data/
private/backups/
private/logs/
data/vaenyx.db
backups/
.env
*.log
```

如果出现这些，先停下来，不要 commit。
