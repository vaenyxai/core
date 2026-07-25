# Moving Vaenyx To A New PC

Moving Vaenyx to another Windows computer is three things: back up on the old
PC, install on the new one, restore. You never need Git, the command line or a
text editor. See [WINDOWS-MINI-PC-GUIDE.md](WINDOWS-MINI-PC-GUIDE.md) for what
installing and backing up look like normally.

## What Moves And What Does Not

**Your data moves, in one backup folder.** A backup is a folder named after the
date and time, and it holds:

- `vaenyx.db` — the database: your chats, tasks, memories, projects, Owner
  sign-in and settings.
- `library` — a copy of your whole Library (your own and installed Methods and
  Routines).
- `manifest.json` — a short description of what is in the folder.

**Your model connections do not move — read this bit twice.** API keys, the
ChatGPT sign-in and the push keypair are not part of a backup. They sit in
`private\secrets` inside the Vaenyx folder, separate from your data in
`userdata\`. So the new PC arrives with **no model connected**, and you connect
it again there. If you would rather carry them over, copy that one folder
across deliberately — it holds your keys, so treat it accordingly.

Three other things are set up per machine and stay behind: the autostart task,
phone access through Tailscale, and your Backup settings (Backup Folder, Keep
Most Recent, Automatic Backup, Backup Password).

**If you use a Backup Password**, the backup folder holds one encrypted file
(AES-256-GCM) instead of the plain database and Library. Keep that password
somewhere safe: without it the backup **cannot** be opened, on any computer.

**After the restore you sign in with the old PC's Owner name and password**,
because the sign-in lives in the database you just restored.

## On The Old PC

1. Open Vaenyx and go to **Settings → Backup**. Press **Create Backup Now**.
   (Double-clicking `Vaenyx-Backup.cmd` does the same job.)
2. Note where it went. If you set a **Backup Folder**, it is there; otherwise it
   is in `userdata\backups\` inside the Vaenyx folder. The newest entry at the
   top of the list on that page is the one you just made.
3. If you have a **Backup Password** set, write it down now. You will need to
   type it on the new PC, and nothing else can open the backup.
4. Stop Vaenyx: **Settings → User Settings → Account & Power → Stop Vaenyx**, or
   double-click `Vaenyx-Stop.cmd`.
5. Remove the autostart: right-click **`Vaenyx-Uninstall-Autostart.cmd`** and
   choose **Run As Administrator**. The autostart task is registered per
   machine, so without this the old PC keeps starting Vaenyx at every boot and
   you end up with two instances collecting two different sets of data.
6. Leave the old Vaenyx folder alone until the new PC is working. It is your
   fallback.

## Move The Backup Across

Copy the **whole backup folder**, not just the database file, to the new
computer. A USB stick, an external drive, a home network share — whatever you
already use is fine.

That folder is your private data: chats, memories, files. Keep it like you would
keep your documents, and delete it from the USB stick once the move is done.

## On The New PC

1. Download `vaenyx-setup.zip`.
2. Right-click the zip, choose **Extract All**, and extract it somewhere short
   and plain like `C:\`. You get a folder named `Vaenyx`. Do not put it in
   OneDrive, Dropbox, Google Drive or iCloud Drive — the installer refuses those.
3. Open that folder and double-click **`Vaenyx-Setup.cmd`**. Leave it alone
   until it finishes. Say yes to the Windows permission prompt at step 5 — that
   is what registers autostart on *this* machine.
4. Setup opens `http://localhost:3000`. Work through the three first-run
   screens:
   - **Create Your Vaenyx** — any Owner name and password will do here; the
     restore replaces them with your old ones a few minutes from now.
   - Accept the terms and pick a sharing option.
   - **Connect Your First Model** — press **Skip For Now**. Models come after
     the restore.
5. Copy your backup folder into `userdata\backups\` inside the new Vaenyx
   folder. Create that folder if it is not there yet.
6. Open **Settings → Backup**. If your backup is encrypted, type the old
   machine's password into **Backup Password** and press **Save Backup
   Settings** first.
7. Your backup now appears in the list. Press **Restore** next to it and
   confirm. It takes about 30 seconds and restarts Vaenyx; the data currently on
   this machine is saved as a safety copy first.
8. Reload the page and sign in with the **old** PC's Owner name and password.
   Your chats, projects and Library should all be there.

## After The Move

1. **Reconnect your models.** **Settings → AI Settings → Models** — sign in with
   ChatGPT, or paste an API key. Nothing works until a model is connected.
2. **Check autostart is on the new machine only.** It was registered during
   setup here, and you removed it on the old PC in step 5 above.
3. **Redo your Backup settings.** Backup Folder, Keep Most Recent, Automatic
   Backup and Backup Password all start empty on a new machine. If your old
   Backup Folder pointed at a drive letter that does not exist here, set a new
   one.
4. **Redo phone access if you had it.** Tailscale is per machine: install the
   official client on the new PC and run `Vaenyx-Connect-Tailscale.cmd` again.
5. **Make a fresh backup** on the new PC, so the first backup here is one you
   made on purpose.
6. Only once all of that works, wipe the old PC's Vaenyx folder — and remember
   deleting the folder deletes the data in it.

## If Something Goes Wrong

- **The restore made things worse.** Before every restore Vaenyx saves what was
  there into a folder named `before-restore-…` in `userdata\backups\`. It shows
  up in the **Settings → Backup** list as an auto safety copy, and you restore
  it the same way as any other backup.
- **The backup does not appear in the list.** Check that you copied the whole
  folder (with `manifest.json` inside it) into `userdata\backups\`, and that it
  sits directly in that folder rather than one level deeper.
- **Vaenyx will not start.** Double-click **`Vaenyx-Diagnose.cmd`** for a list of
  `[OK]` and `[FAIL]` lines, then look in `userdata\logs\`: `vaenyx.log` for what
  the server did, `vaenyx-error.log` for what went wrong, `setup.log` for the
  install. Re-running `Vaenyx-Setup.cmd` is safe — it skips what is done and
  repairs what is missing.
- **Nothing at all works.** The old PC is untouched. Start it, run
  `Vaenyx-Start.cmd`, and you are back where you were.
