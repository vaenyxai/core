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

## 0. What the installer asks

- **Choose what to download** — the install-location screen carries five plain
  one-line ticks, so you decide instead of waiting for a mystery download:
  your ChatGPT subscription, your Claude subscription, phone access (installs
  Tailscale), and an offline voice for Chinese and for English. Nothing is
  compulsory, and Vaenyx installs and works with none of them ticked.
- **Only Tailscale is on by default** — it is the smallest, and using Vaenyx
  from a phone is part of what it is for. The two subscriptions are off
  because each is about 250 MB and only useful if you already pay for that
  service; leave them off and Vaenyx fetches the right one the first time you
  connect it.
- **Sizes live here, not on that screen.** For the record: Tailscale is about
  37 MB, each subscription channel roughly 250–300 MB, and each voice 60 MB on
  top of a shared 21 MB speech engine — a second language adds 60 MB, not 81.
  All of it comes on top of the installer you already downloaded, and the
  free-disk-space line at the bottom of the page checks the real numbers.
- **Anything you skip is still one click away** later, in Settings — the same
  buttons, the same downloads, no reinstall.
- **The big pieces are fetched after the install, not during it** — the
  subscription channels and voices download on Vaenyx's first start, each one
  shown. That is deliberate: a component that will not download can say so
  without taking the install down with it. **Tailscale is the exception**: it
  installs during setup itself, so the phone step right after can connect
  straight away.
- **Ticking phone access installs Tailscale; it does not connect it.** The
  first run takes you through signing in with your own free Tailscale account
  and shows the QR code for your phone.
- **The first run is a short walk, in order** — create the account (a local
  password, six characters or more; nothing else on that page), connect a
  model (your ChatGPT or Claude subscription, or an API key from the
  drop-down), then set up the phone: install if it is missing, sign in, scan
  the QR. Every fresh account walks these steps — nothing essential is left
  for you to find in Settings later.
- **Not enough disk space** — Vaenyx says so before it starts, names the drive
  and how much is short. It checks two drives when they differ: where Vaenyx
  goes, and the Windows drive the downloads unpack through.

## 0b. What Vaenyx remembers about you

- **Settings → Vaenyx Me → What Vaenyx knows** is the whole list. One line per
  thing, and every line says how it was learned: from a chat, added by you, or
  taken from a page with the address it came from.
- **Nothing is deleted when it changes.** Move house and the old address is not
  erased — it is dated. That is why "where did I live in March" still has an
  answer, and why **History** on any line shows what it replaced.
- **Forget** dates a memory rather than removing the record, so a memory can
  never quietly vanish.
- **Open Sources** on a learned item to see every Conversation or other source
  that supported it. An available Conversation opens at its source message.
  **Exclude future learning** stops that Conversation from creating or
  re-creating candidates, even after restart; it can be allowed again later.
- **Preview forget** shows exactly which learned items would leave current
  Memory and which stay. An item stays when another independent source supports
  it, and old data whose source cannot be proved is labelled **Source
  unavailable** and is never bulk-forgotten on a guess.
- **It asks before it learns.** Once a conversation has been quiet for half an
  hour, Vaenyx reads back what **you** said in it and proposes anything durable.
  Proposals wait in the same review list as everything else and change no answer
  until you approve them.
- **It never learns from a web page.** Vaenyx only reads your own messages when
  it does this, never its own replies — which is where anything fetched from the
  internet would be. If a page says "remember that…", it is ignored. You can
  still record something you read yourself; it is then marked as coming from
  outside, with the address, so you can see who is really making the claim.
- **Passwords, keys and card numbers are never kept**, whatever a conversation
  contained.
- **Search works in Chinese and English**, in the same box.
- **Each mode keeps its own.** What is remembered in one Custom Mode is not
  visible in another, or in User Mode.

## 1. Starting and stopping

- **Start it** — double-click the **Vaenyx** icon on the desktop (the
  installer puts it there), or `Vaenyx-Start.cmd` in the Vaenyx folder — same
  thing. It also starts by itself when the computer boots.
- **Open it** — a browser at `http://127.0.0.1:3000` on that computer, or the
  remote address on your phone (see _Using it away from the computer_).
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
- **If an update cannot finish**, Vaenyx restores the matching old app and old
  data automatically, checks that the restored version can start, and tells you
  what happened. You do not need to repair the database or open PowerShell.

## 3. Chatting

- **Ask anything** — type in the box at the bottom and press **Send**.
- **Enter sends; Shift+Enter makes a new line** — the usual chat convention.
  While typing Chinese, Enter picks the candidate word and never fires the
  message. On a phone, the Send button is the send.
- **An unfinished message survives a reload** — text and selected photo or
  document are kept only in this browser for up to fourteen days. They return
  only in the same account, Mode and Conversation (or task), with a **Draft
  recovered** notice; Vaenyx never sends them by itself. Press **Discard** to
  remove one. A selected attachment is not uploaded until you press **Send**.
  Signing out, or deleting its Mode or Conversation, removes the matching local
  draft. If device storage is full, the text is still kept and the notice names
  any attachment that could not be recovered.
- **Answer a decision with one tap** — when Vaenyx genuinely needs your choice,
  the reply may show two or more large answer buttons. Tap one, type your own
  answer, or press **Skip**. The first answer is the recorded one even after a
  reload or on another device; a double tap cannot submit it twice. Skip stays
  visibly skipped and is never treated as approval. Any action that normally
  needs confirmation still needs that confirmation.
- **Speak instead of typing** — the microphone button. Needs the **Hearing** row
  switched on with an engine (Settings → AI Settings → Capabilities).
- **Hear the answer** — the ▶ button at the bottom-right of any reply. It reads
  a summary, not the punctuation. Vaenyx speaks back on its own only when you
  spoke to it. With **Speaking** switched off (AI Settings → Capabilities) the
  button is not there at all — replaying a voice message you recorded yourself
  still works, because that is your voice, not Vaenyx speaking.
- **Send a photo** — the camera button (take one) or the picture button (choose
  one), always available. The model reads the photo itself; you do not have to
  describe it — a photo with no words at all is a complete message.
- **Mark things on a photo** — ask, in your own words, to point something out.
  Dots and names appear **on the photo you sent** — the reply does not repeat
  the picture. The layers button on the photo turns the marks on and off.
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
  - **Very long text never gets silently cut.** When a document's words are
    too many to hand the model whole, Vaenyx saves the full text on your
    machine and hands over the beginning, the end, and an honest note saying
    which pages sit in between. A model that can use tools (the Claude
    subscription) fetches any pages it needs by itself; on other models,
    just say the pages — "看第 5–8 页" or "show pages 5–8" — and they arrive
    with your next message.
  - **Deleting a chat deletes its files.** Documents attached to a
    conversation are removed from this machine when the conversation is
    deleted (kept if another chat still uses them), and any leftover no chat
    references is cleaned up in the background within a day.
  - With **Reading** switched off (AI Settings → Capabilities) the file is
    refused at the door, and Vaenyx names what stopped it: the switch on that
    row, or the mode you are in, which is not a switch and not one you can
    reach from inside.
- **Stop a reply** — the **Stop** button while it is answering. It stops at once.
- **Switch model or thinking level** — the two pickers under the message box.
  They apply to this conversation only.
- **Name and describe a Conversation** — open its ⋮ menu → **Edit details**.
  The title is required; the optional one-line purpose helps you recognize and
  search for it. Purpose is organization text only — it is never a hidden
  instruction to the model. Clear the purpose field to remove it.
- **Archive or delete a chat** — the ⋮ menu at the top of the chat.
- **Archive makes a conversation quiet without erasing it.** Its history,
  Project, Routine and memory scope stay attached. If it has an active
  Schedule, the confirmation says so and Archive pauses future runs at once
  without losing the cadence, time or timezone. Restore brings the
  Conversation back but leaves that Schedule paused; press **Resume** on the
  task or the **Scheduled** screen when you want it running again.
- **Permanent delete starts in Archived.** Before anything is removed, choose
  either **Delete Conversations only** (keep approved Memory) or **Delete and
  forget identifiable Memory**. Neither is preselected. The preview names what
  will be forgotten and what stays because another or unavailable legacy
  source remains. The chosen transcript and Memory change succeed together or
  neither does. Shared Routines, manual Project Memory, Project instructions
  and Owner connections are never removed by this choice.
- **Search old Conversations** — press **Search Conversations** under **New**
  (or `Ctrl/Cmd + K`), type keywords, or put an exact phrase in double quotes.
  Search checks titles, purposes and messages. Results include active, pinned,
  Inbox and Archived Conversations; tap one to open the match. Search stays on
  this computer and uses no model or cloud service. User Mode can search the
  Modes it supervises; a Custom Mode can search only itself. Opening an
  Archived result does not restore it.
- **Unread** — the coloured dot beside a conversation breathes when there is
  something new in it. Read is read everywhere: open it on the phone and the
  dot goes out on the computer too (the computer notices within a minute, or
  the moment you look at it again).
- **Where a conversation opens** — at the bottom, on the newest message, in
  every conversation. The exception is an unread one: that opens at the
  first message you have not seen, so you read forward from there.
- **What it remembers** — the most recent thirty-odd messages in full (a
  question and its answer are never split apart), plus a structured running
  checkpoint of everything before that, plus your approved _Vaenyx Me_ facts.
- **Looking things up** — whether it really goes and looks depends on which main
  model you are on. Only the ChatGPT (Codex CLI) and Claude subscriptions search
  the web today; every other model answers from what it memorised when it was
  trained, and sounds just as certain when that is out of date. The **Web**
  switch (AI Settings → Capabilities) ships **on**, and switching it off does not
  stop those two searching in an ordinary chat — it stops Methods and app keys.
  Both of those are said on the card itself; _AI Settings_ below has the whole
  of it.
- **Files on your computer** — Vaenyx reads nothing on this computer unless you
  switch **Fetching** on _and_ name the folders it may look in (AI Settings →
  Capabilities → Fetching). Both are needed: the switch on its own, with no
  folder named, still reads nothing at all. Once you have named folders, only
  what is inside them can be opened, text files only — nothing else on the
  machine is offered to a model. It ships switched off with the list empty.

## 4. Projects

- **Projects are optional organization** — start chatting without making or
  choosing one. Every ordinary new Conversation starts in **Unsorted**, which
  has no shared Project Memory or instructions.
- **What a Project is** — a shared context boundary for related Conversations,
  with its own Memory, standing instructions and files. It is not another kind
  of work item.
- **Manage Projects** — Settings → **Organization**. Creation, names,
  instructions and Memory all live there; Vaenyx never creates or renames one
  without your explicit confirmation.
- **Organize an existing Conversation** — its ⋮ menu → **Move to group**.
- **Inbox is separate** — the protected Conversation under **New** is not
  Unsorted and is never filed into a Project.

## 4a. The conversation Vaenyx speaks from

- **Top of the sidebar, under New**, with a moon on it. It is always there and
  it cannot be deleted, archived or duplicated.
- **One per Mode.** A Custom Mode has its own, and nothing crosses between them.
- **A number appears on it** when something needs you, and only then. Opening
  the conversation does not clear it — looking is not the same as handling.
- **Tap the number** to answer the items beside the conversation, without
  leaving it. The chat stays exactly where it was.
- **It is a real chat.** Type in it like any other.
- **Ask to open or change a setting** ("rename the agent", "open phone
  access") and a **Take me there** button appears under the reply. Tapping it
  jumps to the right screen; nothing is ever changed for you, and ignoring the
  button costs nothing.
- **Say "use <a Routine>" in any chat** and the request travels to that
  Routine's own conversation, runs there, and you jump with it. The chat you
  spoke in keeps a one-line receipt saying what went where.

## 5. Vaenyx Me

- **What it is** — facts about you that Vaenyx has noticed, which it then uses
  in every chat.
- **Where** — the **Vaenyx Me** screen.
- **Nothing is used until you approve it.** Each one leads with its grounds —
  a few short points, written in the language of the conversation they came
  from; for a fact, the sentence you actually said — then what Vaenyx made of
  it. Two answers: keep it, or say it is wrong.
- **Every ground line can open its source.** A merged proposal cites each
  conversation it was seen in — one line per origin, each with its own View
  source.
- **A change shows as a change.** When a proposal touches something already
  approved with a different value, the card reads _was → now proposed_ and
  the buttons become **Change it / Keep the old one**. Choosing the new value
  dates the old one into history — never an erasure.
- **Listed by day**, newest first, so it reads like a diary rather than a pile
  of work.
- **Each Mode only ever learns from itself.** Nothing said inside a Custom Mode
  becomes a proposal about you.
- **Remove one later** — the same screen; delete it.
- **Add one yourself** — the manual form on that screen.

## 6. Methods and Routines

- **Method** — one small job Vaenyx knows how to do, described in plain steps.
- **Routine** — a finished thing you use, made of one or more Methods. It looks
  like a chat that grows extra buttons (Journal, Gallery) as you use it. When a
  run was fed a photo, the result leads with that photo — marks and all — and
  the text follows it.
- **A picture of the result** — a Routine can also draw what its outcome looks
  like: the finished dish, the tidied room. Open it in the Library, press
  **Edit**, and write what the picture should show under **Result picture**
  (or just say so in its chat). Every run then leads with a freshly generated
  picture. It needs a drawing model connected; without one the result simply
  arrives as it always did, and nothing ever waits on a picture.
- **Ready-made household results** — Vaenyx includes **Receipt Record**,
  **Warranty & Manual Record**, and **Material Takeoff Check**. Their tables keep
  each important value beside its source and certainty. Receipt records are for
  organisation, not tax/accounting advice; warranty records do not decide your
  legal rights; takeoffs are preliminary and must be checked by a competent
  person before ordering or building.
- **Fix or repeat a result** — on a result made by the current version, press
  **Correct & Rerun** to reopen its original confirmed fields, or **Rerun** to
  repeat the exact input. A correction makes a new Journal entry and Gallery
  result; the old record stays unchanged. Corrections teach only that Routine's
  local input parser and never rewrite its Method.
- **Make one** — describe the steps in chat. One step becomes a Method, several
  become a Routine. Vaenyx drafts it and offers a test run before saving.
- **Improve one** — just say so. In the Routine's own chat, say what should
  change ("give me three options from now on") and Vaenyx tells a change apart
  from content to run on — when it genuinely can't tell, it asks with a big
  two-way choice instead of guessing. Or say it in the main chat ("make the
  dinner planner list what's missing") and Vaenyx jumps to that Routine's
  conversation. Either way you get the same proposal card — a plain-language
  summary and the changed lines, with **Try It First** (a real run that writes
  nothing) and a Confirm button; nothing saves until you confirm. Method edits
  use the exact same card. The Library's **Edit** page remains for hands-on
  fine-tuning. However you change it, it stays the SAME Routine: same chat,
  same history, and old results keep the look they were made with. Vaenyx
  numbers the versions itself. If the behaviour changed, any app keys granted
  to this Routine stop working until you re-grant them under Tokens — never
  silently. Community Routines cannot be edited in place. And when a chat
  conversation builds a new Routine, that conversation becomes the Routine's
  first conversation — keep feeding it right there.
- **Where they live** — the **Library** screen, in four tabs: Routines, Tokens,
  Methods, Community. Each tab says what it is on its own first line, and each
  has the same two buttons above its list: make a new one, or find one in the
  community. The Methods tab has a third, for importing a SKILL.md.
- **Publishing** — the button is on the title row of the dialog, next to the ×.
- **Community** is where your community account lives. You only need it to
  publish — using what other people published needs no account at all.
- **Cards carry the name only** — click one and everything about it opens in
  a dialog: description, steps, tags, version, publishing. The only things
  kept on the outside are the ones that need you to do something: a new
  version, corrections waiting, examples whose answers changed. Close the
  dialog with the ×, or with the back button on a phone.
- **Edit a recipe** — Library → the Method → **Edit recipe**.
- **Corrections waiting for you** — when an app sends back a corrected answer,
  it waits inside that Method until you look at it. The **Methods** tab carries
  the number, and the card says how many. Keeping one turns it into an example
  and takes it off the list for good.
- **After updating a community Method, check it against your own examples.**
  The dialog offers it the moment the update lands. It re-runs up to six of the
  examples you accumulated and compares the answers — the author could not have
  checked this for you, because they tested against their cases and not yours.
  If an answer moved, the card shows a red mark and the previous version is one
  button away. Each example is one real model call, so it only runs when you
  press the button.
- **Editing a Method that came from the community makes your own copy.** Theirs
  is never changed: it stays installed, and it keeps receiving its author's
  updates. Your copy is named by you, credits the original author permanently,
  and from then on its corrections stay on this computer instead of going back
  to that author — they describe your steps, not theirs.
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
    as _off for the whole machine_ and cannot be ticked here at all. One you
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
- **Install** — choose **Install**, review the item, then confirm. The review
  names the Method or Routine, its creator and source, and the exact version
  that will be installed. If the package changes after that review, Vaenyx
  stops and asks you to reopen it instead of installing a different version.
- **Check capabilities before you install or update.** The same review lists
  every capability the item requests. **Ready** means this Vaenyx can provide
  it, **Off in Settings** means you switched it off, and **Unsupported** means
  this build cannot provide it. An update marks capabilities it requests for
  the first time. Installing does not switch anything on, loosen the current
  Mode, or add a missing model connection.
- **Community items do not bring executable Tools or code.** They are
  declarative recipes and orchestration. They can only ask for Tools built or
  reviewed into Vaenyx, and the existing global, Mode and runtime limits still
  decide what happens. **No Capabilities requested** only describes that
  capability list; the ordinary text or other input you supply to the recipe
  is still used when it runs.
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
- **See exactly what would be sent** — open **See exactly what would be sent**
  on any waiting item. That is the actual text that leaves, not a summary of
  it, plus what the stripper masked. The stripper is not perfect, which is why
  the 48-hour wait exists and why this is worth opening.
- **Anything touching health, family or money never goes on its own.** It is
  held and shown to you, and you allow that one item after reading it. There is
  no setting that answers this in advance, on purpose — each one is its own
  decision. Allowing one does not send it early: it still waits out the window
  and you can still pull it back.

## 8. Tasks and schedules

- **One-off task** — ask for something to be done and Vaenyx files it as a task.
- **Scheduled task** — the **Scheduled** screen. Set it to run daily, weekly, or
  on a pattern.
- **Paused Schedules stay visible.** Their saved timing is shown with one
  **Resume** button; restoring an archived Conversation never presses it for
  you.
- **See what ran** — the same screen: each run, its result, and how long it took.
- **Cancel or retry** — buttons on the run itself.
- **Follow long work without keeping the screen open** — the task Conversation
  has one progress card. It shows queued, running, waiting for you, completed,
  failed, cancelled, or interrupted, plus the current and completed steps. The
  same card survives a refresh, restart, or another signed-in device; older
  delayed updates cannot move it backwards. Failed or interrupted work offers
  **Retry**, and completed work can jump to its saved result. The card contains
  short status text only, never private model reasoning or raw logs.
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
  it is made, and replaced, on that card — see _Subscription Door_ below.)
- **Models connects the account; Capabilities picks the model** — the Models
  card asks for the key and nothing else. Which model does which job is asked
  once per job, on the capability row, because the answers differ: the model
  you want for conversation is rarely the one you want reading photos, and one
  shared answer is how a chat model chosen for quality ends up putting every
  photo on its tightest free bucket.
- **Every job has a main model and a backup** — open a capability row and you
  see two lines. Pick the account, then a model from that account's **adopted**
  list — the models you found, tested and chose to use under Models (below).
  The **backup** line is empty until you fill it, and Vaenyx never fills it
  for you.
- **The backup only stands in when the main model could not answer at all** —
  out of free quota, key rejected, model retired, provider down, unreachable.
  A poor answer is not that, and standing in there would only hide it. When
  the backup does answer, the reply ends with one plain sentence saying which
  model stood in, why the main one could not, and the error code — never a
  quiet swap you meet later as "why does this answer look different".
- **The main model is a preselection** — the first row of Capabilities. Every
  other row may **follow the main model** instead of naming a backend: it then
  uses the main model's account and model, and the main model's backup too, so
  changing the main model changes every follower at once. **Text** — chat,
  Routines, Methods, the Journal — is its own row right under it and follows
  the main model unless you point it elsewhere. The switcher under the chat
  box changes that one conversation only; it never changes these rows.
- **Free or paid, marked per job** — every provider carries a badge, and the
  engine lists mark the job that costs money even when the provider is
  otherwise free. Gemini is the one to know: its free tier covers text,
  pictures-in, hearing, PDFs and speaking, and gives nothing for **making**
  pictures — so its entry on the Drawing row says so.
- **What each row would affect** — a capability row says how many Methods
  declared it ("3 Methods use this"), so you can see who would notice before
  you switch it off.
- **Two engines can speak, plus the one on this machine** — Gemini (English and
  Chinese) and Cloudflare Workers AI (**English only** — given Chinese it says
  so rather than mispronouncing it). The voice installed on this machine speaks
  both, costs nothing per use and never leaves the computer.
  - **Gemini's free tier allows three spoken replies a minute** (measured
    against the API, 2026-08-07). A fourth is refused for a few seconds, and
    Vaenyx says how long to wait rather than pretending the day's allowance is
    gone. The voice on this machine has no limit at all.
- **Free models** — the **Free models** button beside the heading shows what was
  found last time; **Ask again** beside it asks your main model again and then
  shows you the new answer. **Careful:** The answer says which model said it and
  when, because free tiers change constantly and models state them wrongly with
  confidence. Check the provider's own site before relying on it.
- **Two groups, never mixed**
  - _Use a subscription you already have_ — ChatGPT (Codex CLI) and Claude.
    They lead the Models card, OpenAI first and Anthropic second, connected or
    not — each with its sign-in right on the card. Sign in once, inside the
    app. These are **not** free credit; they are your own paid subscriptions. Both need a component that is **not** included in the
    download, so the first time you press either sign-in button it fetches one
    first — a minute or so for ChatGPT, about 250 MB for Claude. The installer
    also offers both as a tick, which fetches them during setup instead of
    making you wait at first use; either way, everyone who uses neither
    downloads neither. If the fetch fails
    it says so and retries on the next press; nothing else in Vaenyx is
    affected.
  - _Free API allowance_ — pick a provider and paste its key.
- **The Capabilities table is the whole picture** — one row per capability, and
  the row carries both halves: which model does that job, and whether Vaenyx may
  do it at all. Hearing, Speaking, Vision and Drawing each choose their own
  model; Reading, Fetching and Web ride the main model and say so on the row.
  - **Hearing** _(Voice in)_ — speech to text.
  - **Speaking** _(Voice out)_ — text to speech.
  - **Vision** _(Picture in)_ — looking at a photo.
  - **Drawing** _(Picture out)_ — making a picture.
  - **Reading** _(Documents, PDF)_ — a document you attached.
  - **OCR** _(Text in pictures)_ — turns the words in a scan or a photo into
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
  - **Fetching** _(Files on this machine)_ — opening text files from folders you
    name yourself, in that row's own setup. Text files only, and not large ones.
    Vaenyx opens the file itself, so it works with whichever main model you
    use — the model is handed words and never gets a tool that could reach a
    disk. A PDF still goes
    through the document button in a chat, which is Reading. A Method or a
    Routine cannot use this at all yet.
  - **Web** _(Web pages)_ — going out to the internet.
- **The switch is a ceiling** — anything switched off on a row is out of reach
  of every Method, every mode and every app key, whatever they ask for. Web is
  the one that is not all the way there yet: switching it off stops Methods and
  app keys from searching, but an ordinary chat still looks things up, and the
  card says so on its face.
- **A mode can be narrower than this, never wider** — each Custom Mode has its
  own eight switches under Settings → Modes → **What It May Do**, and they can
  only take away. See _Modes_ below.
- **An app key is narrower still** — every key another app holds has its own
  eight ticks, under Library → Token → **What It May Do**, and starts with none
  of them ticked. Fetching can never be ticked there at all. See _Methods and
  Routines_ above.
- **What is on when you install it** — everything Vaenyx already does on this
  computer: Hearing, Speaking, Vision, Drawing, Reading. **Web is also on**: a
  model that cannot look anything up answers today's question out of last year's
  memory and sounds just as certain, and being confidently wrong is worse than
  reaching the internet. **Fetching is the one that starts off** and stays off
  until you decide otherwise — that is Vaenyx opening your own folders.
- **Two of them explain themselves before you use them** — once each, and both
  buttons in the window are real, so _Switch it off_ really switches it off.
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
- **The main model is chosen once**, on its own row at the top of
  Capabilities (or with **Set As Default** on a Models card). Every row that
  follows it re-labels itself to whatever you picked.
- **If an engine stops working** — Vaenyx does not quietly switch to another
  model. It tells you which one failed and why, and you change it here. That is
  deliberate: a silent swap means never knowing who wrote the answer.
- **If your backend cannot do the thing you asked** — one sentence, the same
  everywhere it happens: _Vaenyx cannot do X with Y_. It names the backend, it
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

- **Find → Test → Use** — every connected Models card has a **Find models**
  button. It asks the account itself which models your login or key may use
  right now (never a stored list) and lists them. **Test** sends one line
  through that exact model and shows what the engine reported answered, how
  long it took and when; only a model that answered gets a **Use** button, and
  models in use are the ones the Capabilities rows and the switcher under the
  chat box offer — a row shows no model picker at all until its account has
  one in use. **Stop using** drops one again. Claude reports its model on
  every answer; Codex echoes the model the thread was set to and refuses one
  your plan does not allow; a key backend reports nothing, so its test shows
  the model as requested. The **Main model quick test** on the Connection card
  still sends one line through the main model exactly as chosen on screen.

## 10. Subscription Door — lending your subscriptions to your own apps

- **Each section folds** — the switch stays in sight; the address, your
  apps, file sources, limits, this month and recent calls each open on their
  own heading.
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
- **What it can do** — a valid Model Key automatically gets every safe ability
  that its selected Subscription engine has passed in a real test: text,
  structured results, image/PDF input and auditable Web Search. There are no
  per-ability switches on a Model Key. Voice, image creation, shell, local
  files, browser sessions, settings and account actions never come through
  this door.
- **Test all capabilities** — runs real Subscription calls and lists each
  engine's current result. A failed or unbuilt ability stays grey with the
  reason; it is never presented as a provider outage. Web Search is green only
  when the CLI returns structured, verifiable source URLs. Image tests use a
  real 256-pixel colour picture. PDF tests print a fresh code inside the file
  and pass only when the selected engine reads that code.
- **Apps choose a model per call** — an app can ask the door for the live
  model list of your logins, test one model before assigning work to it, and
  name that model on each call. Its choice never changes your own main model,
  and one app's choice never changes another's.
- **A Token is not a Model Key** — this door takes Model Keys only. A Method or
  Routine Token from Library → Token knocking here is refused with its own
  answer (`RELAY_KEY_WRONG_KIND`), so you always know which of the two an app
  is holding. The two products never blur: Tokens live on the Tokens screen,
  Model Keys live here.
- **Files** — apps send a short-lived download link, never the file. Vaenyx
  fetches it only from the hosts you listed, uses it, and deletes it. Claude
  reads a PDF directly. For OpenAI, Vaenyx privately turns up to 20 PDF pages
  into temporary pictures and sends those to Codex; no API key, paid API or
  outside converter is used.
- **What is written down** — time, kind of job, which subscription, how long,
  worked or not. **Never** the prompt, the file, or the answer.
- **This month** — the same card shows who spent what this month, per app and
  per subscription: your apps, Vaenyx itself, and — for history — anything the
  retired shared key spent, shown as "Door key". Call counts are always real;
  token counts appear only where an engine truly reports them — never
  estimated.
- **Every app has its own Model Key and its own account** — press **Add App**,
  give it a name, and hand the key over. The key stays on the app's row —
  hidden behind ••••, with Show and Copy beside it. The app then signs
  in with its own ChatGPT or Claude subscription, from inside that app,
  **before** it works: an engine it has not connected gets a clear "not
  connected", never your account by accident. Each app's row here carries its
  tested capability status, a Rotate and a Revoke.
- **Connect once** — each app's row has one **Connect** button. It copies each
  Subscription login currently available on your Owner side into that app's
  profile. OpenAI and Claude stay independent, so one may work while the other
  is signed out. The copies are independent:
  revoking or disconnecting the app never touches your own login. Every
  grant is written to the audit log, and the button greys out — saying why —
  while your own side has no login to copy.
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
  offers the same step). Three lights — _Tailscale installed_, _Signed in_,
  _Phone channel on_ — each with a button that fixes it: Vaenyx installs the
  free Tailscale client, opens its sign-in page, and turns the channel on.
  When all three are green, a QR code appears.
- **The QR code waits for the public side** — before showing it, Vaenyx asks
  public DNS itself whether the address really exists out on the internet.
  While it does not yet, the page says so and keeps rechecking. If Tailscale
  wants its one-time approval first (a tailnet-wide setting called Funnel),
  Vaenyx shows an **Approve It On Tailscale** button — one click on that page,
  once ever, and the recheck turns green by itself.
- **Scan the code** — with the phone's camera, then open the link. The QR code
  is drawn on your own machine by Vaenyx itself; the address is never sent to
  any outside QR or link service.
- **The address is public, your Vaenyx is not** — the channel gives this
  machine an https address anyone could type, but everything behind it asks
  for your Vaenyx password first. The phone needs no Tailscale app for this.
- **Log in on the phone** — with your own Vaenyx account, same as at the
  computer.
- **Add it to the home screen** — iPhone: Safari → Share → _Add to Home
  Screen_. Android: Chrome → top-right menu → _Install app_ (or _Add to Home
  screen_). It then behaves like an app.
- **If the phone cannot open it** — a freshly opened channel can take a minute
  or two to become reachable from the internet. The Phone Access page keeps
  rechecking and shows the QR code once the address is confirmed live; if the
  page could not reach public DNS to check, wait a minute and scan again —
  then only the phone can prove it.
- **If a device that worked suddenly cannot open it** — the waiting page on
  that device diagnoses itself. When it says a public DNS service is
  answering wrongly, it offers a one-tap "ask them to clear it" first
  (Cloudflare's own purge tool; Google's equivalent is a link) — worth one
  try, though it does not always take. The **reliable** fix is the steps
  under it: point that device at the healthy resolver the page names; the
  waiting page then reloads by itself. Vaenyx also watches its own address
  and sends a push warning when a resolver goes wrong.
- **Notifications** — Settings → Notifications → allow, then **Test** to prove
  one arrives.
- **Several results fold into one** — a notification arriving while another is
  still showing becomes a single _Vaenyx (n)_ entry with one item per line.
  Expand it to read them; tapping it opens Vaenyx. Dismiss it and the next
  result starts a fresh, full notification again.
- **No banner while you are looking at it** — a device with Vaenyx open on
  screen shows no notification at all; the result is already in front of you.
  Devices where it is closed or backgrounded still get one.
- **The console route** — `Vaenyx-Connect-Tailscale.cmd` in the Vaenyx folder
  drives the same Tailscale commands by hand. It uses the client installed
  under Program Files.

## 12. Backup and restore

- **Back up now** — Settings → Backup → **Create backup**.
- **Automatic backups** — the same screen: off, daily, or weekly, and the hour.
- **Encrypt them** — set a backup password. **Warning:** Lose that password and
  the backup cannot be opened by anyone, including you.
- **Where they go** — the destination on that screen; how many are kept is the
  _Keep_ setting.
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
    _not_ hand it back to a mode you narrowed — the mode's row shows a switch
    again, still off, and you decide.
  - **Only from User Mode.** From inside a mode you can neither change this list
    nor read it, whether or not "Lock settings" is ticked. That is the point: a
    mode nobody can widen from the inside.
  - **What it looks like from inside** — the thing simply does not happen, and
    Vaenyx says the mode does not allow it. It never tells whoever is holding
    the device to go and change a setting, because they cannot.
- **A device sets its own mode** — enter a mode on the device and it reopens
  there from then on; exit it (Exit PIN, if set) and it reopens in User Mode.
  Settings → Modes → Devices only **reports**: where each device is right
  now, when it was last active, and — where the browser reports one — its
  hardware model. There is nothing to choose there. Devices with the same
  generic label are told apart by picking one up and opening Vaenyx on it:
  it rises to the top saying "active just now" — then give it a name of its
  own. A named device shows its own name under the logo, so you can tell
  from the device too.
- **Forgot a mode's PIN?** From User Mode, edit that mode's card and set a
  new Enter/Exit PIN (or tick Remove to clear it). Only User Mode can — a
  forgotten PIN never locks you out of your own machine.
- **Notifications stay in their mode.** A device only receives the pushes that
  belong to the mode it is bound to: a reply or task result inside a mode
  buzzes that mode's devices, and your own devices hear nothing of it — and
  the other way round. A device bound to no mode counts as yours (User Mode).
- **The mode reports to your main conversation.** The periodic summary you set
  on a mode's card (daily / weekly / monthly) arrives as a message in the
  conversation Vaenyx speaks from — messages, chats, and how many questions
  its rules refused — with a push that just says it is there. Every time the
  rules refuse a question, a note lands there too, immediately, with the
  question and the time. Anything Vaenyx needs to tell you arrives in that
  same conversation.
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
  to the model like anything else you attach. See _Files on your computer_ above.
- **Audit trail** — the Guard screen lists what was allowed and refused.
- **Change your password** — Settings → Personal.
- **Sign every device out** — Settings → Personal → **Log out everywhere**.

---

## When something goes wrong

Vaenyx now keeps technical failures behind an owner-safe boundary. What you
see names what failed, says whether your existing data is safe, and gives the
next useful action — Retry, reconnect the model, open Settings, or check the
local log. Every such message includes a stable error code and a diagnostic
number. If the problem repeats, note those two values; the matching bounded,
redacted detail is stored only on this computer in
`userdata/logs/owner-errors.log`. Raw command output, local paths, access
tokens, terminal control codes, and stack traces are never shown in the app or
sent through its API. You do not need PowerShell to recover: use the action in
the message first.

| What you see                                           | What to do                                                                                                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Nothing loads at all                                   | The computer is off or asleep. Wake it.                                                                                                                |
| Phone cannot reach it, computer can                    | A freshly opened channel needs a minute — wait and retry. Still nothing: Settings → Phone Access, check the three lights.                              |
| A computer cannot open it, a phone on mobile data can  | That computer's DNS, almost always. See _When it is the network, not Vaenyx_ below.                                                                    |
| Stuck on "Starting up… this page will open by itself"  | Only true for about ten seconds. After six the page replaces that line with what is actually wrong — read it.                                          |
| The browser console says `ERR_NAME_NOT_RESOLVED`       | This device could not look the address up. It is DNS, not Vaenyx. Set this device's DNS to `8.8.8.8` — see below.                                      |
| "Not signed in" on a subscription                      | Settings → AI Settings → sign in to that one again.                                                                                                    |
| An engine fails and nothing else happens               | By design. Read which one failed, then pick another engine on that row.                                                                                |
| An error shows `VX-…` and a diagnostic number          | Follow the action in the message. If it repeats, note both values; redacted local detail is in `userdata/logs/owner-errors.log`.                       |
| Voice button does nothing                              | The Hearing row has no engine, or Hearing is switched off. Settings → AI Settings → Capabilities → Hearing.                                            |
| The ▶ button is missing from replies                   | Speaking is switched off. Settings → AI Settings → Capabilities → Speaking.                                                                            |
| "You have that switched off"                           | You did, on that capability's row. Settings → AI Settings → Capabilities, and turn the row back on.                                                    |
| "the mode you are in does not allow it"                | That mode was narrowed, and nothing inside it can widen it. Leave the mode (the badge at the top), then Settings → Modes → that mode → What It May Do. |
| "this app key was not given that"                      | The app knocked with its own Token. Library → Token → that key → What It May Do, and tick it.                                                          |
| "no app key can ever be given that"                    | Fetching, and no key can hold it — not a setting, a rule. Do that job from a chat instead.                                                             |
| Photo comes back with no marks                         | The Vision row has no engine or is switched off, or the model found nothing to mark.                                                                   |
| A PDF asks about pages first                           | Over ten pages, on purpose. It is telling you the cost before spending it.                                                                             |
| Your app gets a free model instead of the subscription | The door is closed, the device is off the network, or the app has not signed in to a subscription yet.                                                 |
| A Relay capability is grey                            | Press **Test all capabilities**. Read `NOT_CONNECTED`, `NOT_PROBED`, the probe failure, or the honest not-implemented reason on that engine.          |
| A scheduled run failed overnight                       | The computer slept. The failure and its reason stay on the run.                                                                                        |
| An update banner will not go away                      | Press it, then Restart.                                                                                                                                |

## When it is the network, not Vaenyx

Vaenyx has been blamed twice for a fault somewhere else. Both times the app,
the tunnel and the models were all healthy, and both times the same page —
"Starting up…" — was the only thing anyone could see. Here is how to tell them
apart in under a minute, and what each one was.

**First, prove where the fault is.** On the computer Vaenyx runs on, open
`http://127.0.0.1:3000`. If that works, **Vaenyx is fine** and the problem is
between your other device and this computer — everything below is about that
gap, and nothing is wrong with the app.

- **The internet's address books briefly said the address did not exist**
  (17 August 2026). Your Vaenyx address lives in a public address book. For a
  few hours the big public lookup services had "no such address" remembered for
  it, while the master copy was correct the whole time. About one lookup in
  three failed, and a browser that hears "no such address" remembers it for
  minutes — so it felt completely dead rather than intermittent.
  - **The tell:** `ERR_NAME_NOT_RESOLVED` or `DNS_PROBE_FINISHED_NXDOMAIN` in
    the browser, while the computer running Vaenyx is plainly fine.
  - **The fix: none needed, and none possible.** Nothing on your side is
    broken, and nothing you change will speed it up — those remembered answers
    expire by themselves, usually within a few hours. Re-publishing the address
    was tried and did not help.
  - **Meanwhile:** on the computer Vaenyx runs on, use `http://127.0.0.1:3000`.
    That never touches the address book at all.
  - **How it was proved**, if it ever needs proving again: ask a name you know
    is good, a name you know is fake, and the address in question — a dozen
    times each. Good name failing 0/12, fake name failing 12/12 and yours
    failing 5/12 is the signature of this, and it rules out your router, your
    network and the app in one pass.

- **A half-finished Tailscale upgrade** (4 August 2026). Vaenyx's own install
  button re-ran the Tailscale installer over a working copy and told Windows
  not to reboot. Windows then sat waiting to swap the network driver, so
  Tailscale's background service could never finish starting and the remote
  address stopped working. Restarting the _service_ could not fix it.
  - **The tell:** the address stops resolving right after anything installed or
    updated Tailscale, and the computer has not been restarted since.
  - **The fix:** restart Windows. Then, if the address still does not open,
    double-click `Vaenyx-Repair-Phone-Access.cmd` — it checks for exactly this
    before touching anything.
  - The cause was ours and is fixed; this entry stays because the same symptom
    follows any interrupted Tailscale update.

**What to expect from the waiting page now.** For the first six seconds it says
Vaenyx is starting up, because a restart really does take about ten. After
that it replaces that line with the real causes, in order, including the DNS
one and the address to type. It remembers across reopens, so a device that can
never connect shows the honest text immediately instead of restarting the
countdown every visit.

---

Manual for **v0.4.12** · last updated 2026-09-05.
Keep this file up to date whenever a feature changes.
