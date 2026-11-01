# App 连接交接

这是可选协议，让 Owner 已有的 Relay App 不用复制模型钥匙即可连接。
它不创建 Profile、不登录订阅、不调用模型、不授予业务访问权、不共享 Owner 记忆，
也不改变现有 Tailnet 边界。身份、规则、数据、型号选择和结果仍由各 App 自己管理。

## 从调用 App 发起

- App 必须使用安全 HTTPS Origin。跳转前，在设备私密存储里保存新生成的随机 state、
  PKCE S256 verifier 和发起时的 App 用户范围。
- state 和 verifier 都是 43–128 字符的 base64url 字符串。
  challenge 为 `BASE64URL(SHA256(ASCII(verifier)))`，固定 43 字符。
  verifier 不能进入网址、确认页、日志或下面的表单。
- 用**顶层表单 POST**（不是 fetch）提交到已配置 Vaenyx Origin 的
  `/v1/relay/connect/start`，类型为 `application/x-www-form-urlencoded`：

| 字段                    | 值                                                             |
| ----------------------- | -------------------------------------------------------------- |
| `version`               | `1`                                                            |
| `client_name`           | 请求方自报名称，最多 80 字符；不是已验证身份                   |
| `client_origin`         | 精确、规范的 HTTPS Origin，例如 `https://app.example`          |
| `return_uri`            | 同一 Origin 下的固定 HTTPS 返回端点；无 query、fragment 或凭据 |
| `state`                 | 新随机 state                                                   |
| `code_challenge`        | S256 challenge                                                 |
| `code_challenge_method` | `S256`                                                         |

浏览器 Origin 必须匹配 `client_origin`，请求必须经 Owner 的 Tailnet 到达。
重复或多余字段会被拒绝。Start 不提供 CORS 读取，也不授权凭据：返回 303，
导航到 `/?connect=<request_id>`。这个不可预测的请求 ID 不是交接码，不能兑换钥匙。
待处理请求五分钟失效；超出资源限制会拒绝新请求。

## Owner 确认与返回

发起该表单的文档必须使用 `Referrer-Policy: strict-origin`。
`no-referrer`（或跨 Origin 的 `same-origin`）会让浏览器表单 POST 的 Origin
变成 `null`，因此被拒绝。只对发起文档设置该策略；仅发送 Origin，不发送路径或查询参数。
Vaenyx 也仅对精确的 `/?connect=<request_id>` HTML 文档设置同一策略，以提交返回表单。
其他文档和 API 响应仍用 `no-referrer`；Origin 校验不会放宽。

Vaenyx 要求 Owner 在 User Mode 登录，显示接收 Origin 和返回地址，
并要求选择一个已启用的现有 Relay App。仅打开页面不会批准。
已拒绝、过期、Profile 改变或已使用的请求不能重复批准。

批准时固定所选 Profile 的 Key 版本。Vaenyx 只把 `code` 和 `state`
通过表单 POST 发到绑定的 `return_uri`。交接码 60 秒失效，不进入网址、
剪贴板、日志或持久请求存储。仅持有尚未过期、经 Owner 批准的交接授权的
精确 Origin 可获得兑换端点的 CORS 响应。

调用 App 的返回端点必须严格限定：校验配置的 Vaenyx Origin、内容类型、长度、
精确字段集合及重复字段；使用 no-store/no-referrer、严格 CSP，不加载第三方资源，
不记录请求正文。跨站表单 POST 不应依赖 SameSite=Strict Cookie 随请求到达。
回到 App Origin 后，**先**复核当前身份和权限、发起范围、state 和待处理有效期，
再兑换。返回动作绝不能建立 App 身份或暗示获得业务资料访问权。

## 浏览器兑换

浏览器从精确获批 Origin 经 Tailnet 直接向 `/v1/relay/connect/exchange`
提交 JSON，省略 credentials，不携带 Cookie：

```json
{
  "version": 1,
  "code": "<single-use-code>",
  "code_verifier": "<original-verifier>",
  "client_origin": "https://app.example",
  "return_uri": "https://app.example/connect/return"
}
```

成功返回 no-store 响应 `{version:1, token, profile_id, profile_name, key_version}`。
token 是已有 App Key，不是订阅登录凭据，也不是新建设备授权。
兑换会核对精确 Origin/返回地址、S256 证明及当前已启用 Relay Profile/Key 版本，
并原子消费交接码。错误 Origin、错误证明、重放、过期、禁用或轮换均不会返回钥匙。
服务重启会清除所有待处理交接。兑换结果未知时不自动重试，应重新明确发起连接。

调用 App 不能把凭据放进源码、云端或共享模型凭据库、网址、日志、明文 localStorage
或 Service Worker 缓存。浏览器本机加密存储必须绑定实际 App 用户/公司范围，
使用时重新校验；明确退出或换账号时清除，保存失败要报告。
浏览器加密不是硬件保险箱，也无法防御同源 XSS。刷新可以复用已保存连接，
清除浏览器存储可能丢失连接。本机断开只清除当前副本；在 Vaenyx 轮换或吊销
既有钥匙，会使该 App Profile 的**所有**副本失效。

机器错误格式为 `{error: "..."}`，包含 `RELAY_TAILNET_REQUIRED`，或前缀
`RELAY_CONNECT_` 加 `INVALID_REQUEST`、`NOT_FOUND`、`EXPIRED`、
`ORIGIN_MISMATCH`、`PROOF_INVALID`、`PROFILE_CHANGED`、`TOKEN_UNAVAILABLE`、
`LIMIT`。Owner 认证与 Custom Mode 限制仍然有效。连接成功不代表型号或研究能力
测试通过；后者仍须通过已有 Relay 契约明确调用验证。
