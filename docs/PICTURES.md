# Pictures — Letting Vaenyx Draw

Vaenyx can generate pictures in chat: ask for one in your own words ("draw a
cartoon cat", "刚才那张不喜欢,再来一张") and the picture appears in the
conversation, stored with your other photos and included in local backups.

This needs a **picture engine** — a separate slot from the vision engine that
*reads* photos, because a model that can look at a picture usually cannot draw
one. With no engine set, Vaenyx will not try: a text model can only *claim* to
have drawn something.

## The free way: Cloudflare Workers AI

Cloudflare's free daily allowance covers roughly **170 pictures a day** — far
more than a household uses. Checked July 2026; free tiers change.

1. Sign in (or sign up, free) at Cloudflare, then open:
   **dash.cloudflare.com → My Profile → API Tokens → Create Token**
2. Use the **Workers AI** template. Name the token something specific, e.g.
   `Vaenyx Pictures (Workers AI)`. Create it and copy the value — Cloudflare
   shows it **only once**. (Lost it? Open the token's `⋯` menu → **Roll** for a
   fresh value.)
3. Copy your **Account ID** too: after signing in it is the long code in the
   address bar — `dash.cloudflare.com/<that code>`.
4. In Vaenyx: **Settings → AI → Pictures (Making Them)** → choose
   **Cloudflare Workers AI — Free** → paste the token and the Account ID →
   **Save Token**. Vaenyx verifies the pair with Cloudflare immediately, so a
   wrong paste fails while you are still looking at the field.
5. Ask for a picture in any chat.

Other engines: **Zhipu BigModel** offers CogView-3-Flash free (sign-up needs a
Chinese phone number); OpenAI and a paid Gemini key also work. A free Gemini
key does **not** — Google gives image models no free quota, however well the
same key reads photos.

## How asking works

You never write "prompts". The same model that answers your chat decides, as
part of its normal reading of each message, whether you are asking for a
picture — including follow-ups like "one more" or "换一张" — and translates
your request into the short English description image models understand. If
generation fails, the reply tells you the provider's actual reason; Vaenyx
never pretends a picture was made.

---

# 图片 — 让 Vaenyx 画图

在聊天里用你自己的话要一张图(「画一只卡通猫」「刚才那张不喜欢,再来一张」),
图会出现在对话里,和你的其它照片存在一起,并进入本地备份。

这需要一个**图片引擎** —— 和「读照片」的视觉引擎是两个独立的槽,因为能看图的
模型通常不会画图。没设引擎时 Vaenyx 不会尝试:纯文字模型只能「声称」画了。

## 免费方案:Cloudflare Workers AI

Cloudflare 的每日免费额度约合 **170 张图/天**,家庭用途绰绰有余。核实于
2026 年 7 月;免费政策会变。

1. 登录(没有就免费注册)Cloudflare,打开:
   **dash.cloudflare.com → My Profile → API Tokens → Create Token**
2. 选 **Workers AI** 模板。给 token 起个具体的名字,例如
   `Vaenyx Pictures (Workers AI)`。创建后复制那串值 —— Cloudflare **只显示
   这一次**。(丢了?在该 token 的 `⋯` 菜单点 **Roll** 换一串新的。)
3. 顺手复制你的 **Account ID**:登录后地址栏里
   `dash.cloudflare.com/<一长串码>` 的那串码就是。
4. 回 Vaenyx:**Settings → AI → Pictures (Making Them)** → 选
   **Cloudflare Workers AI — Free** → 贴 token 和 Account ID →
   **Save Token**。保存时 Vaenyx 会当场向 Cloudflare 验证这一对,贴错了
   立刻报错,不会等到画图才失败。
5. 在任意聊天里要一张图。

其它引擎:**智谱 BigModel** 的 CogView-3-Flash 免费(注册需中国手机号);
OpenAI 和付费 Gemini key 也可用。免费 Gemini key **不行** —— Google 给图片
模型的免费配额是零,哪怕同一把 key 读照片毫无问题。

## 要图的方式

你不需要写「提示词」。回答你聊天的那个主模型,在读每条消息时顺带判断你是不是
在要图 —— 包括「再来一张」这类跟进说法 —— 并把你的话翻成图片模型能懂的简短
英文描述。生成失败时,回复会告诉你服务商的真实原因;Vaenyx 绝不假装画了。
