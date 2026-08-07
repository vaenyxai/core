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

- **Start it** — double-click the **Vaenyx** icon on the desktop (the
  installer puts it there), or `Vaenyx-Start.cmd` in the Vaenyx folder — same
  thing. It also starts by itself when the computer boots.
- **Open it** — a browser at `http://127.0.0.1:3000` on that computer, or the
  remote address on your phone (see *Using it away from the computer*).
- **Stop it** — Settings → System → **Stop Vaenyx**. Or close the window that
  the launcher opened.
- **Restart it** — Settings → System → **Restart**. Takes about ten seconds;
  the page reconnects on its own.
- **Sign in** — your Owner name and password, made the first time you ran it.
- **Forgot the password** — there is no reset. Restore from a backup, or start
  a fresh instance. **Warning:** This is the one thing nobody can undo for you.
- **Remove Vaenyx** — Windows Settings → Apps → **Vaenyx** → Uninstall (if you
  used the installer). It asks whether to keep your data; keeping it is the
  default, so installing again later brings everything back.

## 2. Updating

- **Check for an update** — Settings → System → **Check for updates**.
- **Install it** — **Download**, then **Restart**. The version number is in the
  bottom-left corner, and what changed is on the update card itself.
- **A banner appears at the bottom** when a newer build is ready. It never
  refreshes by itself while you are typing.

## 3. Chatting

- **Ask anything** — type in the box at the bottom and press **Send**.
- **Speak instead of typing** — the microphone button. Needs the **Hearing** row
  switched on with an engine (Settings → AI Settings → Capabilities).
- **Hear the answer** — the ▶ button at the bottom-right of any reply. It reads
  a summary, not the punctuation. Vaenyx speaks back on its own only when you
  spoke to it. With **Speaking** switched off (AI Settings → Capabilities) the
  button is not there at all — replaying a voice message you recorded yourself
  still works, because that is your voice, not Vaenyx speaking.
- **Send a photo** — the camera button (take one) or the picture button (choose
  one). The model reads the photo itself; you do not have to describe it.
- **Mark things on a photo** — ask, in your own words, to point something out.
  Dots and names appear on the picture. The layers button on the photo turns the
  marks on and off.
- **Look closer** — tap a photo for fullscreen; pinch to zoom. The marks and the
  layers button come with it.
- **Send a document** — the document button. It takes PDFs, plain-text files
  (.txt, .md) and Word, Excel or PowerPoint files (.docx, .xlsx, .pptx); one
  button, and Vaenyx sorts out how each kind is read. From an Office file the
  **words** are read — layout, pictures and charts are not — so if the point
  of the file is visual, save it as PDF, which is read as pictures. The old
  formats (.doc, .xls, .ppt) are not readable — save as PDF or as the modern
  format and send that.
  - Over ten pages, Vaenyx asks first and tells you the page count, because long
    documents cost real money on a paid model.
  - With **Reading** switched off (AI Settings → Capabilities) the file is
    refused at the door, and Vaenyx names what stopped it: the switch on that
    row, or the mode you are in, which is not a switch and not one you can
    reach from inside.
- **Stop a reply** — the **Stop** button while it is answering. It stops at once.
- **Switch model or thinking level** — the two pickers under the message box.
  They apply to this conversation only.
- **Rename, archive, delete a chat** — the ⋮ menu at the top of the chat.
- **Unread** — the coloured dot beside a conversation breathes when there is
  something new in it.
- **What it remembers** — the last thirty messages in full, plus a rolling
  summary of everything before that, plus your approved *Vaenyx Me* facts.
- **Looking things up** — whether it really goes and looks depends on which main
  model you are on. Only the ChatGPT (Codex CLI) and Claude subscriptions search
  the web today; every other model answers from what it memorised when it was
  trained, and sounds just as certain when that is out of date. The **Web**
  switch (AI Settings → Capabilities) ships **on**, and switching it off does not
  stop those two searching in an ordinary chat — it stops Methods and app keys.
  Both of those are said on the card itself; *AI Settings* below has the whole
  of it.
- **Files on your computer** — Vaenyx reads nothing on this computer unless you
  switch **Fetching** on *and* name the folders it may look in (AI Settings →
  Capabilities → Fetching). Both are needed: the switch on its own, with no
  folder named, still reads nothing at all. Once you have named folders, only
  what is inside them can be opened, text files only — nothing else on the
  machine is offered to a model. It ships switched off with the list empty.

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
- **Test run** — the same screen. It runs for real but changes nothing. If the
  Method reached for something it did not get, the result says so above the
  output and names which of the three layers said no.
- **Tags** — rename and group them from the Library screen.
- **Import / export** — Library → **Import Skill** takes a SKILL.md folder;
  each Method can be exported the same way.
- **Let another app use one** — Library → **Token**. A Token is an app key: one
  of your other apps holds it and can then call the Routine or the Methods you
  granted it, and nothing else.
- **What a key may do** — the key's card, **What It May Do**. The same eight
  capabilities as AI Settings, in the same order, with a tick each. A new key
  starts with **nothing** ticked — it may run the recipe you granted it and no
  more — and the card says what it may do without opening anything.
  - **Fetching can never be given to a key.** The row says so rather than
    quietly disappearing. Reaching into your own files on another program's
    behalf is not something a key carries, whatever it asks for.
  - **Web takes its own approval** — a separate press, not the same tick as the
    rest, because a key that can reach the internet can make this machine
    somebody else's way onto it. You can take it back with the switch.
  - **The ceiling still wins.** A capability switched off in AI Settings shows
    as *off for the whole machine* and cannot be ticked here at all. One you
    granted before it was switched off stays on the key, does nothing while the
    machine says no, and works again the moment you switch it back on.
  - **Only from User Mode**, like the other two layers.
  - **What the app is told** — if a Method asks for something the key was not
    given, the run still happens without it and the answer names the capability
    and says which of the three said no. It is never silently dropped, so a
    refusal cannot be mistaken for a poor answer.
- **Keys you already made** — every key made before this existed has nothing
  ticked, so nothing gained reach on its own. Tick what each app actually needs.

## 7. Community

- **Browse what others made** — the **Community** screen.
- **Install** — the Install button on any item. It lands in your Library.
- **Publish your own** — the Publish button on one of your items. Needs a Google
  or GitHub sign-in, because your name goes on it.
- **If it needs something Vaenyx cannot do yet** — publishing is refused, and the
  Method stays here and keeps working for you. A Method that cannot run on this
  computer cannot run on anybody else's either. Vaenyx then **asks** whether it
  may write down that the missing thing was wanted. What gets written down is
  the name of the capability and a count — nothing about the Method, nothing
  about its recipe, nothing else from this computer — and it stays on this
  machine; when an update finally brings that capability, Vaenyx knows it was
  waiting and tells you. Saying no writes nothing and changes nothing else.
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
- **A repeating task does not repeat itself.** Each run is shown what its last
  five runs already gave you, with one order: do not deliver it again. If
  something there has changed, it leads with what changed; otherwise it goes
  looking for ground the earlier runs missed — other sources, other corners of
  the subject. On a genuinely quiet day it says so in a line rather than
  padding with what you have already read. Anything you asked for in the
  task's own chat (format, length, what to leave out) still carries into every
  run; it is only the content that has to be new.
- **Prerequisite** — the computer must be awake at that time. If it was not, the
  run is marked failed with the reason; nothing is silently retried on a
  different model.

## 9. AI Settings — capabilities and models

- **Where** — Settings → **AI Settings**. Two cards, and the split between them
  never moves: **Capabilities** is what Vaenyx may do, which model does each job,
  and a **Test** to see that it really does; **Models** is where a model gets
  connected. Every provider API key is pasted in Models, without exception. (An
  app's **Model Key** is a different thing: it opens the Subscription Door, and
  it is made, and replaced, on that card — see *Subscription Door* below.)
- **Which model, not just which provider** — connect a provider, then open it
  in Models and press **List available models**. Vaenyx asks that provider,
  with your own key, what it will accept, and offers the answer as a list — so
  you pick the current name instead of guessing between the versions. Nothing
  is stored: the list is asked for again whenever you want it. Backends with
  no list to ask (ChatGPT via Codex, the Claude subscription, a local server)
  say so and keep the typed box.
- **Free or paid, marked per job** — every provider carries a badge, and the
  engine lists mark the job that costs money even when the provider is
  otherwise free. Gemini is the one to know: its free tier covers text,
  pictures-in, hearing, PDFs and speaking, and gives nothing for **making**
  pictures — so its entry on the Drawing row says so.
- **What each row would affect** — a capability row says how many Methods
  declared it ("3 Methods use this"), so you can see who would notice before
  you switch it off.
- **Free models** — the **Free models** button beside the heading shows what was
  found last time; **Ask again** beside it asks your main model again and then
  shows you the new answer. **Careful:** The answer says which model said it and
  when, because free tiers change constantly and models state them wrongly with
  confidence. Check the provider's own site before relying on it.
- **Two groups, never mixed**
  - *Use a subscription you already have* — ChatGPT (Codex CLI) and Claude. Sign
    in once, inside the app. These are **not** free credit; they are your own
    paid subscriptions.
  - *Free API allowance* — pick a provider and paste its key.
- **The Capabilities table is the whole picture** — one row per capability, and
  the row carries both halves: which model does that job, and whether Vaenyx may
  do it at all. Hearing, Speaking, Vision and Drawing each choose their own
  model; Reading, Fetching and Web ride the main model and say so on the row.
  - **Hearing** *(Voice in)* — speech to text.
  - **Speaking** *(Voice out)* — text to speech.
  - **Vision** *(Picture in)* — looking at a photo.
  - **Drawing** *(Picture out)* — making a picture.
  - **Reading** *(Documents, PDF)* — a document you attached.
  - **OCR** *(Text in pictures)* — turns the words in a scan or a photo into
    text, on a dedicated OCR engine (Mistral OCR), never the main model — a
    chat model that cannot make out a character invents a plausible one, and
    numbers on a quote turn into money. Reading a scanned PDF is OCR plus
    Reading together, which is why they are separate switches: with only OCR
    on, a scan becomes text for your own eyes and no model sees it. Dropping a
    scan in with OCR off gets a plain sentence and a turn-it-on button, not a
    silent empty answer. Photos work the same way: when OCR is on, the exact
    words in a photo you attach are machine-read by the same engine and handed
    to the model alongside the picture, so a photo of a page and a scan of the
    same page read identically — each photo is one small metered OCR call.
  - **Fetching** *(Files on this machine)* — opening text files from folders you
    name yourself, in that row's own setup. Text files only, and not large ones.
    Vaenyx opens the file itself, so it works with whichever main model you
    use — the model is handed words and never gets a tool that could reach a
    disk. A PDF still goes
    through the document button in a chat, which is Reading. A Method or a
    Routine cannot use this at all yet.
  - **Web** *(Web pages)* — going out to the internet.
- **The switch is a ceiling** — anything switched off on a row is out of reach
  of every Method, every mode and every app key, whatever they ask for. Web is
  the one that is not all the way there yet: switching it off stops Methods and
  app keys from searching, but an ordinary chat still looks things up, and the
  card says so on its face.
- **A mode can be narrower than this, never wider** — each Custom Mode has its
  own eight switches under Settings → Modes → **What It May Do**, and they can
  only take away. See *Modes* below.
- **An app key is narrower still** — every key another app holds has its own
  eight ticks, under Library → Token → **What It May Do**, and starts with none
  of them ticked. Fetching can never be ticked there at all. See *Methods and
  Routines* above.
- **What is on when you install it** — everything Vaenyx already does on this
  computer: Hearing, Speaking, Vision, Drawing, Reading. **Web is also on**: a
  model that cannot look anything up answers today's question out of last year's
  memory and sounds just as certain, and being confidently wrong is worse than
  reaching the internet. **Fetching is the one that starts off** and stays off
  until you decide otherwise — that is Vaenyx opening your own folders.
- **Two of them explain themselves before you use them** — once each, and both
  buttons in the window are real, so *Switch it off* really switches it off.
  - **Web** — the words your model searches for leave this machine. They go out
    through that model's own backend, and a search company on the far end
    receives them; Vaenyx does not choose that company and never contacts it
    itself. The model writes those words, so they can say things you did not
    type. Because Web ships on, this is shown the first time you open the card
    rather than waiting for a switch you may never touch.
  - **Fetching** — the part people miss is not that Vaenyx can read a file. It is
    that **the words in that file are handed to whichever model is answering**,
    exactly like anything you type into a chat; if that model is a cloud one,
    they leave this machine. Vaenyx opens the file, never the model, it reads
    nothing until you name a folder, and no app key can ever be given this.
- **What one call costs** — on the card, above the switches. Vaenyx charges
  nothing and never will; what gets spent is your own model connection. A
  **subscription you already pay for** (ChatGPT via Codex CLI, Claude) costs
  nothing extra per call — you are using the allowance you already bought, and it
  runs out rather than billing you. A **metered API key** (OpenAI, Anthropic,
  Gemini, Groq and the rest) bills you per call, by how much went through it, and
  looking at a photo and reading a document cost the most, because pictures are
  dearer than words and a document is read as pictures too. **Nothing at all**
  for the voice on this machine and for any local model, because those run here.
  Opening a file is free too — but the words inside it are then handed to
  whichever model answers, so the file is free and the answer costs whatever
  that model costs. No prices are printed: they are the provider's,
  they change, and a stale number of ours would be worse than none.
- **Every row is the same shape** — the drawing, the name, which model does it,
  a **Test**, an arrow for that row's own settings, and the switch.
- **Test a row** — every row has a **Test** button that really does that one
  job once, against something whose answer is already known, and says which of
  three things happened: it worked, it failed in the failing side's own words,
  or that path is not built. Hearing and Speaking are tested by this device
  rather than by the server, because nothing on the server can listen or speak:
  Hearing records three seconds from your microphone and shows what came back,
  Speaking says one line out loud. Hold the button to see what one press costs,
  because some of them spend real money.
- **A connected model that cannot do a job is greyed out, not hidden** — so you
  can see it is there and that it is not the tool for this.
- **The main model is chosen once**, in the **Models** card below this one —
  **Set As Default**. Every row that rides the main model re-labels itself to
  whatever you picked.
- **If an engine stops working** — Vaenyx does not quietly switch to another
  model. It tells you which one failed and why, and you change it here. That is
  deliberate: a silent swap means never knowing who wrote the answer.
- **If your backend cannot do the thing you asked** — one sentence, the same
  everywhere it happens: *Vaenyx cannot do X with Y*. It names the backend, it
  names what could not be done, and **when something else did the job instead it
  names that too, and what it cost you**. Two of those happen every day: a model
  that cannot open a PDF is handed words this machine pulled out of the file, so
  drawings, tables and layout never reach it; a model that cannot see a photo is
  handed another model's description of it. Both are useful, and neither is the
  real thing — so neither is allowed to pass as it.
- **A model is added in one place** — the **Models** card below, and nowhere
  else. A key belongs to the model, not to the job you bought it for, so it
  joins one shared pool: connect a provider once and every row that provider
  can serve may choose it. A capability row only ever chooses.
- **Cloudflare Workers AI (free pictures)** — pick **Workers AI (Cloudflare)**
  from **Add a Model** in the Models card. It asks for two things, because a
  token made from Cloudflare's Workers AI template cannot say which account it
  belongs to: the **token** (Cloudflare dashboard → My Profile → API Tokens →
  Create Token → Workers AI template) and the **Account ID**, which is in the
  address bar once you are signed in — `dash.cloudflare.com/<that long code>`.
  Vaenyx checks the pair with a real call before saving it, so a wrong one says
  so while you are still looking at the field. The same connection can also
  answer chats. Connecting it does **not** change which model draws: that stays
  whatever the Drawing row says, and only an empty row fills itself. Once it is
  connected you can re-save either field on its own — correcting an Account ID
  does not mean fetching the token again.
- **A voice on this machine (free, offline)** — the bottom of the **Models**
  card, **Download Local Voice**. It is about 150 MB, once, and it puts a
  neural voice on this computer: no key, no per-use cost, works with no
  internet. Chinese and English voices are both included. Watch the progress
  bar there; when it lands, the Speaking row switches to it by itself. The same
  block removes the download again, and asks you once before it does. Which of
  the voices reads a reply is chosen on the **Speaking** row instead — that is
  how the job sounds, not what is installed. There are more voices than the two
  that come with it, and **picking one you do not have yet starts its own ~60 MB
  download**: the option says so, and the progress shows on the Speaking row
  where you started it.

- **What each provider does with your content** — every model card, and the
  engine lists, carry the provider's own terms beside the choice: whether it
  trains on what you send, for how long it keeps it, and a dated link to the
  source. Copied from their terms, never our judgment — the call stays yours.
  The one worth knowing cold: the two easiest free options (Gemini's free
  tier, Mistral's free tier) **both train on what you send them by default**.

## 10. Subscription Door — lending your subscriptions to your own apps

- **What it is** — Settings → AI Settings → **Subscription Door**. Your other
  apps borrow your ChatGPT and Claude subscriptions through this computer.
- **Why it exists** — those subscriptions can only be used by a machine running
  their command-line tools. Websites and cloud servers cannot.
- **Switch it on** — the toggle. It starts closed.
- **Give an app the address** — the top one (this page's own address). Copy
  button beside it.
- **Who gets in** — only an app holding a **Model Key** you issued here, calling
  from a device on your private network. There is no address list to keep: the
  key is the identity.
- **What it can do** — text, and reading a picture or PDF. These two
  subscriptions do no voice and make no pictures, and **Fetching** and **Web**
  never come through this door at all, whatever is ticked anywhere — so each
  app's row here shows only the ticks this door can actually serve.
- **A Token is not a Model Key** — this door takes Model Keys only. A Method or
  Routine Token from Library → Token knocking here is refused with its own
  answer (`RELAY_KEY_WRONG_KIND`), so you always know which of the two an app
  is holding. The two products never blur: Tokens live on the Tokens screen,
  Model Keys live here.
- **Files** — apps send a short-lived download link, never the file. Vaenyx
  fetches it only from the hosts you listed, uses it, and deletes it.
- **What is written down** — time, kind of job, which subscription, how long,
  worked or not. **Never** the prompt, the file, or the answer.
- **This month** — the same card shows who spent what this month, per app and
  per subscription: your apps, Vaenyx itself, and — for history — anything the
  retired shared key spent, shown as "Door key". Call counts are always real;
  token counts appear only where an engine truly reports them — never
  estimated.
- **Every app has its own Model Key and its own account** — press **Add App**,
  give it a name, and hand the key over; it is shown once. The app then signs
  in with its own ChatGPT or Claude subscription, from inside that app,
  **before** it works: an engine it has not connected gets a clear "not
  connected", never your account by accident. Each app's row here carries its
  capability ticks, a Rotate and a Revoke.
- **The old shared key is retired.** Every app carries its own Model Key; a
  call on the old shared one is simply refused.
- **Prerequisite** — the app's device must be on your private network, and now
  the door itself checks: a request from outside the tailnet is refused with a
  clear answer (RELAY_TAILNET_REQUIRED), **even with a correct key**. A leaked
  key alone can no longer reach your subscriptions from the internet. The
  Vaenyx web page itself is not affected — a phone browser without Tailscale
  still opens it.

## 11. Using it away from the computer

- **The guided way** — Settings → **Phone Access** (the end of the first run
  offers the same step). Three lights — *Tailscale installed*, *Signed in*,
  *Phone channel on* — each with a button that fixes it: Vaenyx installs the
  free Tailscale client, opens its sign-in page, and turns the channel on.
  When all three are green, a QR code appears.
- **Scan the code** — with the phone's camera, then open the link. The QR code
  is drawn on your own machine by Vaenyx itself; the address is never sent to
  any outside QR or link service.
- **The address is public, your Vaenyx is not** — the channel gives this
  machine an https address anyone could type, but everything behind it asks
  for your Vaenyx password first. The phone needs no Tailscale app for this.
- **Log in on the phone** — with your own Vaenyx account, same as at the
  computer.
- **Add it to the home screen** — iPhone: Safari → Share → *Add to Home
  Screen*. Android: Chrome → top-right menu → *Install app* (or *Add to Home
  screen*). It then behaves like an app.
- **If the phone cannot open it** — a freshly opened channel can take a minute
  or two to become reachable from the internet. Wait a minute and scan again.
  The computer cannot confirm the public side itself — only the phone can
  prove it.
- **Notifications** — Settings → Notifications → allow, then **Test** to prove
  one arrives.
- **The console route** — `Vaenyx-Connect-Tailscale.cmd` in the Vaenyx folder
  drives the same Tailscale commands by hand. It uses the client installed
  under Program Files.

## 12. Backup and restore

- **Back up now** — Settings → Backup → **Create backup**.
- **Automatic backups** — the same screen: off, daily, or weekly, and the hour.
- **Encrypt them** — set a backup password. **Warning:** Lose that password and
  the backup cannot be opened by anyone, including you.
- **Where they go** — the destination on that screen; how many are kept is the
  *Keep* setting.
- **Restore** — Settings → Backup → the backup → **Restore**.
  **Warning: restoring replaces everything you have now. It cannot be undone.**
- **Note** — pushing to GitHub is not a backup, and deploying is not a backup.

## 13. Modes

- **What a mode is** — a restricted way in, for a shared or borrowed device.
- **Make one** — Settings → Modes → **New mode**. Give it a PIN.
- **What it locks** — settings, the chats outside that mode, and — if you say so
  — what Vaenyx may do at all while somebody is inside it.
- **What this mode may do** — on the mode's card, **What It May Do**. The same
  eight capabilities as AI Settings, in the same order, with a switch each.
  Switch off what a borrowed device has no business doing: a mode that may not
  draw, may not look at photos, and may never open your files.
  - **Web is the one to be careful with.** It carries exactly the same gap it
    has in AI Settings: switching Web off for a mode stops Methods and app keys
    from searching, but an ordinary chat inside that mode still looks things up.
    Do not hand a device over believing that switch cuts it off from the
    internet. "Local model only", in the same mode's settings, does.
  - **A mode only ever narrows.** It cannot be given something the instance has
    switched off. Those rows show **off for the whole machine** instead of a
    switch, because a switch there would be a switch that does nothing.
  - **It stays narrow.** Turning a capability back on for the whole machine does
    *not* hand it back to a mode you narrowed — the mode's row shows a switch
    again, still off, and you decide.
  - **Only from User Mode.** From inside a mode you can neither change this list
    nor read it, whether or not "Lock settings" is ticked. That is the point: a
    mode nobody can widen from the inside.
  - **What it looks like from inside** — the thing simply does not happen, and
    Vaenyx says the mode does not allow it. It never tells whoever is holding
    the device to go and change a setting, because they cannot.
- **Bind a device** — Settings → Modes → Devices, so a given device always opens
  in that mode.
- **Leave a mode** — the badge at the top of the screen.
- **Modes you already made** — a mode you made before this existed adds no
  restriction of its own until you open **What It May Do** and switch something
  off. Nothing changed underneath you.

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
- **Your own files** — none of them, unless you switched **Fetching** on and
  named the folders yourself; then a file from one of those folders can be sent
  to the model like anything else you attach. See *Files on your computer* above.
- **Audit trail** — the Guard screen lists what was allowed and refused.
- **Change your password** — Settings → Personal.
- **Sign every device out** — Settings → Personal → **Log out everywhere**.

---

## When something goes wrong

| What you see | What to do |
|---|---|
| Nothing loads at all | The computer is off or asleep. Wake it. |
| Phone cannot reach it, computer can | A freshly opened channel needs a minute — wait and retry. Still nothing: Settings → Phone Access, check the three lights. |
| "Not signed in" on a subscription | Settings → AI Settings → sign in to that one again. |
| An engine fails and nothing else happens | By design. Read which one failed, then pick another engine on that row. |
| Voice button does nothing | The Hearing row has no engine, or Hearing is switched off. Settings → AI Settings → Capabilities → Hearing. |
| The ▶ button is missing from replies | Speaking is switched off. Settings → AI Settings → Capabilities → Speaking. |
| "You have that switched off" | You did, on that capability's row. Settings → AI Settings → Capabilities, and turn the row back on. |
| "the mode you are in does not allow it" | That mode was narrowed, and nothing inside it can widen it. Leave the mode (the badge at the top), then Settings → Modes → that mode → What It May Do. |
| "this app key was not given that" | The app knocked with its own Token. Library → Token → that key → What It May Do, and tick it. |
| "no app key can ever be given that" | Fetching, and no key can hold it — not a setting, a rule. Do that job from a chat instead. |
| Photo comes back with no marks | The Vision row has no engine or is switched off, or the model found nothing to mark. |
| A PDF asks about pages first | Over ten pages, on purpose. It is telling you the cost before spending it. |
| Your app gets a free model instead of the subscription | The door is closed, the device is off the network, or the app has not signed in to a subscription yet. |
| Your app gets `RELAY_CAPABILITY_NOT_GRANTED` | That capability is not ticked on the app's Model Key. Settings → AI Settings → Subscription Door → that app's row, and tick it. |
| A scheduled run failed overnight | The computer slept. The failure and its reason stay on the run. |
| An update banner will not go away | Press it, then Restart. |

---

Manual for **v0.3.5-dev.4** · last updated 2026-08-07.
Keep this file up to date whenever a feature changes.
