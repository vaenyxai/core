# Vaenyx — User Manual

Everything Vaenyx does, in the order you are likely to need it. One line per
thing: what it is, where to press, what happens.

Read this inside the app: **Settings → Manual**.

---

## Before anything

- Vaenyx runs on **your own computer**. If that computer is off or asleep,
  nothing works — not the phone, not the browser, not the scheduled tasks.
- Your data lives on that computer, under `userdata/`. It is never uploaded
  anywhere by Vaenyx itself.
- The model that answers you is **not** on your computer unless you chose a
  local one. Whatever you type goes to whichever model backend you connected.

---

## 1. Starting and stopping

- **Start it** — double-click `Vaenyx-Start.cmd` in the Vaenyx folder. It also
  starts by itself when the computer boots.
- **Open it** — a browser at `http://127.0.0.1:3000` on that computer, or the
  remote address on your phone (see *Using it away from the computer*).
- **Stop it** — Settings → System → **Stop Vaenyx**. Or close the window that
  the launcher opened.
- **Restart it** — Settings → System → **Restart**. Takes about ten seconds;
  the page reconnects on its own.
- **Sign in** — your Owner name and password, made the first time you ran it.
- **Forgot the password** — there is no reset. Restore from a backup, or start
  a fresh instance. 🔴 This is the one thing nobody can undo for you.

## 2. Updating

- **Check for an update** — Settings → System → **Check for updates**.
- **Install it** — **Download**, then **Restart**. The version number is in the
  bottom-left corner; tap it to see what changed.
- **A banner appears at the bottom** when a newer build is ready. It never
  refreshes by itself while you are typing.

## 3. Chatting

- **Ask anything** — type in the box at the bottom and press **Send**.
- **Speak instead of typing** — the microphone button. Needs a Voice Input
  engine (Settings → AI Settings).
- **Hear the answer** — the ▶ button at the bottom-right of any reply. It reads
  a summary, not the punctuation. Vaenyx speaks back on its own only when you
  spoke to it.
- **Send a photo** — the camera button (take one) or the picture button (choose
  one). The model reads the photo itself; you do not have to describe it.
- **Mark things on a photo** — ask, in your own words, to point something out.
  Dots and names appear on the picture. The layers button on the photo turns the
  marks on and off.
- **Look closer** — tap a photo for fullscreen; pinch to zoom. The marks and the
  layers button come with it.
- **Send a document** — the document button. PDFs only for now.
  - Over ten pages, Vaenyx asks first and tells you the page count, because long
    documents cost real money on a paid model.
- **Stop a reply** — the **Stop** button while it is answering. It stops at once.
- **Switch model or thinking level** — the two pickers under the message box.
  They apply to this conversation only.
- **Rename, archive, delete a chat** — the ⋮ menu at the top of the chat.
- **Unread** — the coloured dot beside a conversation breathes when there is
  something new in it.
- **What it remembers** — the last thirty messages in full, plus a rolling
  summary of everything before that, plus your approved *Vaenyx Me* facts.
- **Looking things up** — it can search the web and read a page when the answer
  depends on current facts, and it tells you when it could not check something
  rather than answering from memory. It still cannot read anything on your
  computer.

## 4. Projects

- **What a project is** — a folder for related chats, with its own standing
  instructions.
- **Make one** — Projects → **New project**.
- **Standing instructions** — Projects → pick one → **Instructions**. Every chat
  in that project starts with them.
- **Put a chat in a project** — the ⋮ menu in the chat → **Move to project**.

## 5. Vaenyx Me

- **What it is** — facts about you that Vaenyx has noticed, which it then uses
  in every chat.
- **Where** — the **Vaenyx Me** screen.
- **Nothing is used until you approve it.** Each candidate has Approve / Reject.
- **Remove one later** — the same screen; delete it.
- **Add one yourself** — the manual form on that screen.

## 6. Methods and Routines

- **Method** — one small job Vaenyx knows how to do, described in plain steps.
- **Routine** — a finished thing you use, made of one or more Methods. It looks
  like a chat that grows extra buttons (Journal, Gallery) as you use it.
- **Make one** — describe the steps in chat. One step becomes a Method, several
  become a Routine. Vaenyx drafts it and offers a test run before saving.
- **Where they live** — the **Library** screen.
- **Edit a recipe** — Library → the Method → **Edit recipe**.
- **Test run** — the same screen. It runs for real but changes nothing.
- **Tags** — rename and group them from the Library screen.
- **Import / export** — Library → **Import Skill** takes a SKILL.md folder;
  each Method can be exported the same way.

## 7. Community

- **Browse what others made** — the **Community** screen.
- **Install** — the Install button on any item. It lands in your Library.
- **Publish your own** — the Publish button on one of your items. Needs a Google
  or GitHub sign-in, because your name goes on it.
- **Pause publishing** — Settings → Sharing. Nothing of yours leaves while it is
  paused.
- **Corrections you make can become shared examples** — always stripped of
  personal detail first, and you can withdraw one afterwards (Settings →
  Sharing → the flywheel list).

## 8. Tasks and schedules

- **One-off task** — ask for something to be done and Vaenyx files it as a task.
- **Scheduled task** — the **Scheduled** screen. Set it to run daily, weekly, or
  on a pattern.
- **See what ran** — the same screen: each run, its result, and how long it took.
- **Cancel or retry** — buttons on the run itself.
- **Talk to a task** — the box at the bottom of a task takes everything the chat
  box takes: a photo, a PDF, something spoken. It is the same conversation
  underneath, so every task already has this, however long ago you made it.
- **Prerequisite** — the computer must be awake at that time. If it was not, the
  run is marked failed with the reason; nothing is silently retried on a
  different model.

## 9. AI Settings — connecting models

- **Where** — Settings → **AI Settings**.
- **Survey button** — asks a connected model what free models exist right now and
  refreshes the list. 🔴 The answer says which model said it and when, because
  free tiers change constantly and models state them wrongly with confidence.
  Check the provider's own site before relying on it.
- **Two groups, never mixed**
  - *Use a subscription you already have* — ChatGPT (Codex CLI) and Claude. Sign
    in once, inside the app. These are **not** free credit; they are your own
    paid subscriptions.
  - *Free API allowance* — pick a provider and paste its key.
- **The Capabilities table is the whole picture** — one row per capability, and
  the row carries both halves: which model does that job, and whether Vaenyx may
  do it at all. Hearing, Speaking, Vision and Drawing each choose their own
  model; Reading and Web ride the main model and say so on the row; Fetching is
  not built yet.
  - **Hearing** *(Voice in)* — speech to text.
  - **Speaking** *(Voice out)* — text to speech.
  - **Vision** *(Picture in)* — looking at a photo.
  - **Drawing** *(Picture out)* — making a picture.
  - **Reading** *(Documents, PDF)* — a document you attached.
  - **Web** *(Web pages)* — going out to the internet.
- **A connected model that cannot do a job is greyed out, not hidden** — so you
  can see it is there and that it is not the tool for this.
- **The main model is chosen once**, in the Models card. Every row that rides it
  re-labels itself to whatever you picked.
- **If an engine stops working** — Vaenyx does not quietly switch to another
  model. It tells you which one failed and why, and you change it here. That is
  deliberate: a silent swap means never knowing who wrote the answer.
- **Add a key where you need it** — the Model keys card takes a key for any
  capable provider, and it joins the same shared pool.

## 10. Subscription Door — lending your subscriptions to your own apps

- **What it is** — Settings → AI Settings → **Subscription Door**. Your other
  apps borrow your ChatGPT and Claude subscriptions through this computer.
- **Why it exists** — those subscriptions can only be used by a machine running
  their command-line tools. Websites and cloud servers cannot.
- **Switch it on** — the toggle. It starts closed.
- **Give an app the address** — the top one (this page's own address). Copy
  button beside it.
- **Who gets in** — only the email addresses you list. Everyone else is refused
  and their app falls back to a free model.
- **What it can do** — text, and reading a picture or PDF. It cannot do voice or
  make pictures; those say so in grey.
- **Files** — apps send a short-lived download link, never the file. Vaenyx
  fetches it only from the hosts you listed, uses it, and deletes it.
- **What is written down** — time, kind of job, which subscription, how long,
  worked or not. 🔴 Never the prompt, the file, or the answer.
- **Test** — a Test button per subscription sends a real request. Green means it
  really worked.
- **Prerequisite** — the app's device must be on your private network. If it is
  not, it cannot even find this door, and falls back on its own.

## 11. Using it away from the computer

- **Address** — the private-network address of your machine. It is the address
  shown in the Subscription Door card.
- **Requirement** — your phone must be on the same private network (Tailscale).
- **Add it to the home screen** — your browser's *Add to Home Screen*. It then
  behaves like an app.
- **Notifications** — Settings → Notifications → allow, then **Test** to prove
  one arrives.

## 12. Backup and restore

- **Back up now** — Settings → Backup → **Create backup**.
- **Automatic backups** — the same screen: off, daily, or weekly, and the hour.
- **Encrypt them** — set a backup password. 🔴 Lose that password and the backup
  cannot be opened by anyone, including you.
- **Where they go** — the destination on that screen; how many are kept is the
  *Keep* setting.
- **Restore** — Settings → Backup → the backup → **Restore**.
  🔴 **Restoring replaces everything you have now. It cannot be undone.**
- **Note** — pushing to GitHub is not a backup, and deploying is not a backup.

## 13. Modes

- **What a mode is** — a restricted way in, for a shared or borrowed device.
- **Make one** — Settings → Modes → **New mode**. Give it a PIN.
- **What it locks** — settings, and the chats outside that mode.
- **Bind a device** — Settings → Modes → Devices, so a given device always opens
  in that mode.
- **Leave a mode** — the badge at the top of the screen.

## 14. Appearance and language

- **Theme** — Settings → Personal. Saved per device.
- **Chat text size** — the same screen.
- **Language** — Settings → Language. Switches the app immediately.
- **Your assistant's name** — Settings → Personal. The instance's own name is
  under AI Settings → Identity.

## 15. Privacy and legal

- **Legal documents** — Settings → Legal. The operative texts, as shipped.
- **What leaves this computer** — whatever you send to a model backend. Vaenyx
  does not claim otherwise, because the backend is your choice.
- **Audit trail** — the Guard screen lists what was allowed and refused.
- **Change your password** — Settings → Personal.
- **Sign every device out** — Settings → Personal → **Log out everywhere**.

---

## When something goes wrong

| What you see | What to do |
|---|---|
| Nothing loads at all | The computer is off or asleep. Wake it. |
| Phone cannot reach it, computer can | The phone is off the private network. Reconnect Tailscale. |
| "Not signed in" on a subscription | Settings → AI Settings → sign in to that one again. |
| An engine fails and nothing else happens | By design. Read which one failed, then pick another engine on that row. |
| Voice button does nothing | No Voice Input engine is set. Settings → AI Settings → Voice in. |
| Photo comes back with no marks | Picture Input has no engine set, or the model found nothing to mark. |
| A PDF asks about pages first | Over ten pages, on purpose. It is telling you the cost before spending it. |
| Your app gets a free model instead of the subscription | The door is closed, the device is off the network, or the address is not on the owner list. |
| A scheduled run failed overnight | The computer slept. The failure and its reason stay on the run. |
| An update banner will not go away | Press it, then Restart. |

---

Manual for **v0.3.1-dev.79** · last updated 2026-07-31.
Keep this file up to date whenever a feature changes.
