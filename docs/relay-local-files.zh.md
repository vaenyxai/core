# 临时本机 PDF 引用

这是 Owner 明确批准的有限本机研究测试入口，不授予目录、记忆访问，不建立下载服务器，
不增加云端文件域名例外。现有 HTTPS 文件链接仍是正常文件传输方式。

## 操作端与 Owner

- 在机器应用数据目录的 `Vaenyx` 子目录安装 `local-file-allowlist.json`
  （使用 `PROGRAMDATA`，不可用时使用系统临时目录）。私人清单及 PDF 不得进入 Git。
  服务器启动时读取清单；HTTP 不提供安装、编辑清单或选择路径的接口。
- 清单包含 `version: 1`、`batch_id`、`profile_name`、`client_origin`、`task_id`、`files`。
  每项文件声明 `id`、`name`、绝对 `path`、`sha256`、`original_sha256`、
  `original_page_count`、`original_from`、`original_to`、`page_count`、
  `allowed_pages: {from,to}`。页码从 1 开始且包含两端。
  文件名和原件页码映射由操作端声明，不是模型阅读证据。
- 只有名称唯一匹配且已启用的 Relay App 能收到文件。网站必须是精确 HTTPS Origin。
  最多 20 项；既有 Relay 字节上限仍生效。检查 PDF 哈希、页数及无重定向的路径。
- Owner 在 User Mode 打开 `/?local-files=1`，勾选合格文件后批准；不会自动勾选。
  Owner 接口只接受清单 ID，不接受路径。引用自批准起十分钟有效，可在此页撤销任务。
  重启、停用 App 或轮换 Key 会使既有引用失效。

## App 契约

- `GET /v1/ai/local-files` 要求 App 的 Bearer 模型钥匙、Tailnet 和获批 `Origin`。
  返回 `{version:1, grants:[...]}`，不含本机路径。
- 每项授权有 `file`、`task_id`、固定 `request_id`、原件页码元数据、`page_count`、
  `allowed_pages`、`expires_at`、`status`（`ready`、`running`、`completed`、
  `failed`、`expired`、`revoked`）。授权本身不证明已经读过页面。
- `file` 含 `id`、`name`、`sha256`、`mime: "application/pdf"` 和
  `file_ref: {version:1, token:<opaque>}`。引用只临时保留，不写日志。
- 每次向既有 `/v1/ai/run` 原样提交一个授权文件，指定 `capability: "research"`、
  授权任务／请求 ID、明确选择的模型、任务要求及正常研究预算。
  `url` 与 `file_ref` 二选一，不可同时使用；其他能力不接受本机引用。
- 每次工具阅读（含缓存命中）都会复查范围及期限。模型工作前检查文件哈希。
  原件留在原处；临时渲染由现有研究执行器清理。不改变供应商、计费或模型降级规则。
- 有效期内完全相同的已完成请求返回内存回执；改变、执行中或失败的请求会拒绝。
  执行结果未知时不可重试，也不可为已尝试文件换发引用绕过限制。
  重启后 App 必须保留自己的回执及未知状态；服务器去重状态只在内存中。
- 本机文件来源 URL 和抓取时间为 `null`。本机字节消耗输入预算，但不计为网络下载。
  未知型号／用量保持 null。输出页码对应分段，调用方保留原件页码映射。
- 外层错误为 `RELAY_LOCAL_FILE_*`，研究工具错误为 `local_file_*`。
  调用方保存领域解释、回执和记忆；文件读取不会载入 Owner 对话、记忆、其他 App 状态或目录。
