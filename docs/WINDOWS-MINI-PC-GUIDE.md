# Vaenyx On Windows

A plain-language guide to installing Vaenyx on a Windows PC and living with it
day to day. You never need the command line, Git, or a text editor.

## What This Is

Vaenyx is your household's own AI assistant, running on your own computer. It
keeps your chats, tasks, memories, projects and Methods in a database on that
machine, under `userdata\`. Nothing is uploaded by Vaenyx itself.

Vaenyx has no AI model of its own. It talks to a model you connect — a cloud
provider under your own account, or a local model on your own hardware. What
you send to a connected **cloud** model goes to that provider, under its terms.
Your notes, chats and files stay on this computer; the message you send to a
cloud model does not.

The Vaenyx server listens on `127.0.0.1` port `3000` only — that is, on this
computer and nowhere else. Nothing needs to be opened in your firewall or
router.

## What You Need

- A Windows 10 or 11 PC that stays switched on (a small always-on mini PC is
  ideal).
- About 2 GB of free disk space.
- An internet connection for the install, and afterwards for whichever cloud
  model you connect.
- Nothing else. Vaenyx needs Node.js 24 or newer with npm 11 or newer, and the
  installer puts it there for you if it is missing.

**Where to put the folder.** Somewhere short and plain, like `C:\Vaenyx`. The
installer refuses to run from OneDrive, Dropbox, Google Drive or iCloud Drive:
Vaenyx keeps a live database in the folder, and cloud sync corrupts that kind
of file. A very long path is refused too, and a path with spaces gets a warning.

## Install

1. Download `vaenyx-setup.zip`.
2. Right-click the zip, choose **Extract All**, and extract it somewhere like
   `C:\`. You get a folder named `Vaenyx`.
3. Open that folder and double-click **`Vaenyx-Setup.cmd`**.
4. A black window opens and works through six steps. Leave it alone until it
   finishes.

What the six steps do:

- **[1/6] Checking This Computer** — clears the "downloaded from the internet"
  mark Windows puts on the files, checks the folder location, and reports your
  Windows version and whether Node.js is already installed.
- **[2/6] Making Sure Node.js Is Installed** — if Node.js is missing or too old,
  it installs the official Node.js LTS (about a 30 MB download).
- **[3/6] Downloading What Vaenyx Needs** — the longest step, a few minutes on
  the first run. It needs the internet, and it retries once by itself.
- **[4/6] Preparing Vaenyx** — builds the app from the files you downloaded.
- **[5/6] Starting Vaenyx With Windows** — registers the autostart (see below).
- **[6/6] Starting Vaenyx** — starts the server, waits for it to answer, and
  opens `http://localhost:3000` in your browser.

### The Windows Permission Prompt

Step 5 is the one step that needs Windows permission. It registers a scheduled
task called `VaenyxAutostart` that starts Vaenyx when the computer boots and
starts it again if it ever stops on its own. That is what makes Vaenyx feel
like an appliance instead of a program you have to remember to launch.

(If step 2 also had to install Node.js, Windows asks for permission there too.
That prompt belongs to the official Node.js installer, not to Vaenyx.)

**If you decline the prompt**, nothing is broken. Setup says so, starts Vaenyx
anyway, and finishes. Vaenyx simply will not come back by itself after a
restart — start it with `Vaenyx-Start.cmd` each time. To turn autostart on
later, right-click **`Vaenyx-Install-Autostart.cmd`** and choose **Run As
Administrator**.

If setup stops with an error, it tells you what to fix, and you can safely
double-click `Vaenyx-Setup.cmd` again.

## First Run In The Browser

Three short screens, once only.

1. **Create Your Vaenyx.** Type an owner name and a password (at least 6
   characters), then the password again. This password is stored only on this
   machine. **There is no password recovery today** — if you lose it, you lose
   access to the instance. Write it down somewhere safe.
2. **Terms And Sharing.** You see the AI notice, then a sharing choice titled
   *Help Improve Shared Methods*: **Keep Sharing On (Recommended)** or **Don't
   Share**. You must pick one — **Continue** stays greyed out until you do. You
   can open the Terms of Service and the Privacy Policy right there. Pressing
   **Continue** records that you accepted them.
3. **Connect Your First Model.** Three ways:
   - **Sign In With ChatGPT** — best if you already pay for ChatGPT. No API key;
     you sign in once in the browser.
   - **Paste An API Key** — pick a provider and paste its key. Google Gemini and
     Groq have a free tier and need no credit card; OpenAI and Claude are paid
     keys.
   - **Skip For Now** — look around first and connect later in
     **Settings → AI Settings → Models**.

## Everyday Use

- Vaenyx starts with Windows. To use it, open `http://localhost:3000`.
- If the page does not load, double-click **`Vaenyx-Start.cmd`**. It checks
  Node.js, builds anything missing, starts the server and opens the browser.
  Started this way, a minimized window called *Vaenyx Service* stays open —
  leave it minimized, do not close it.
- To restart or shut it down, go to **Settings → User Settings → Account &
  Power**:
  - **Restart Vaenyx** restarts the local server and reloads the page when it is
    back.
  - **Stop Vaenyx** turns it fully off, and it stays off — even across a
    reboot — until you start it again with `Vaenyx-Start.cmd`.
- Closing the browser tab does **not** stop the server. Use Stop Vaenyx for that.
- `Vaenyx-Stop.cmd` does the same job from outside the app, for when the page
  will not open.

Inside the app you get the Portal (your chats and tasks), Projects, Scheduled
runs, your Library of Methods and Routines, the Community library, Vaenyx Me,
Guard, and Settings — which is also where Modes, Notifications, Backup, Sharing
and Legal live.

## Backups

Two ways to make one:

- Double-click **`Vaenyx-Backup.cmd`**. It works while Vaenyx is running and
  prints `Backup created: ...` when it is done.
- Or open **Settings → Backup** and press **Create Backup Now**.

A backup goes to `userdata\backups\` in a folder named after the date and time,
and contains the database (`vaenyx.db`), a `manifest.json`, and a copy of your
Library. It holds your private data — chats, memories, files — so keep it
somewhere safe and do not share it.

**Settings → Backup** also has:

- **Backup Folder** — a full path to another disk, a USB drive or a NAS, so a
  copy lives off this machine. Leave it empty for the default folder.
- **Keep Most Recent** — how many backups to keep; older ones are removed after
  each new backup. Empty keeps them all.
- **Automatic Backup** — off, daily, or weekly, at an hour you choose.
- **Backup Password** — optional encryption. If you lose this password, those
  backups **cannot** be opened again.
- The list of existing backups, each with a **Restore** button. Restoring takes
  about 30 seconds and restarts Vaenyx; your current data is saved as a safety
  copy first, so you can undo it.

You may point your own cloud-sync service at the *backup folder* if you want an
off-site copy. Never sync the live `userdata\db` folder itself.

Moving to a new computer works the same way: back up on the old PC, install on
the new one, restore. See [MIGRATE-TO-NEW-PC.md](MIGRATE-TO-NEW-PC.md).

## Using It From Your Phone

Vaenyx listens on `127.0.0.1` only, so it is not reachable from your phone by
default — and you should never change that or open port 3000 in your firewall
or router. The supported way in is an authenticated tunnel through your own
Tailscale account, and **Settings → Phone Access** inside Vaenyx sets it all
up with buttons: it installs the official client, opens the sign-in page,
turns the channel on, and ends with a QR code for the phone. Prefer a
console? **`Vaenyx-Connect-Tailscale.cmd`** drives the same commands by hand,
using the client installed under Program Files. Tailscale is a third-party
service under its own terms, you sign in with your own account, and your
Vaenyx owner password is what protects the instance once the address exists.

## When Something Goes Wrong

1. Double-click **`Vaenyx-Diagnose.cmd`**. It prints a list of `[OK]` and
   `[FAIL]` lines — Node.js, npm, curl, the build, the database, and whether the
   server is running. It never prints passwords, keys or your content.
2. Look in `userdata\logs\`:
   - `vaenyx.log` — what the server did.
   - `vaenyx-error.log` — what went wrong.
   - `setup.log` — the full record of every Setup run.
3. Double-click **`Vaenyx-Setup.cmd`** again. Re-running it is safe: it skips
   what is already done and repairs what is missing.

## Uninstall

1. Make a backup first, and copy `userdata\backups\` somewhere off this machine.
   Deleting the folder deletes your data with it.
2. Right-click **`Vaenyx-Uninstall-Autostart.cmd`** and choose **Run As
   Administrator**. This removes the autostart task; it does not stop a running
   Vaenyx.
3. Double-click **`Vaenyx-Stop.cmd`**.
4. Delete the Vaenyx folder.

Node.js stays installed, because other programs may use it. Remove it from
Windows Settings → Apps if you are sure nothing else needs it.
