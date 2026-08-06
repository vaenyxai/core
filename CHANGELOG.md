# Changelog

User-facing release history for Vaenyx. Each released version here matches a
Git tag and a GitHub Release with the same notes. Day-to-day development
history lives in the commit log.

## v0.3.2 — 2026-08-06

**The first sign-in works on a clean machine.** Pressing "Sign In With
ChatGPT" on a computer that never had the ChatGPT component now installs it
by itself — the button says "preparing the sign-in, about a minute" and then
carries on. The raw Windows error it used to print is gone for good: anything
that fails now says what happened in plain words, in your language, with the
same button as the retry.

**Getting past Windows' warnings.** An unsigned new download trips up to
three Windows gates; the read-me in the zip and the note under the website's
download button now walk through all three. A free code signature (SignPath
Foundation, for open source) is being applied for — once it ships, the
warnings and the walkthroughs both go away.

## v0.3.1 — 2026-08-06

**A real installer.** One vaenyx-setup.exe: pick a language, pick a folder,
watch it install, finish with Vaenyx open in the browser and a Vaenyx icon on
the desktop. Upgrading installs over the top and never touches your data;
uninstalling asks whether to keep it, and keeps it unless you say otherwise.
The zip download remains for anyone who prefers it — now just two files at the
top, the setup and a read-me whose first item walks past the Windows
SmartScreen box. First installs no longer need a restart: the one bug that made
a fresh machine say "Vaenyx did not start" until you rebooted is fixed at its
root.

**Vaenyx on your phone.** The first-run wizard ends with "want it on your
phone?", and Settings has a permanent Phone access section: three lights that
really check (private network installed / signed in / tunnel up), each with a
one-tap fix, then your phone address and a QR code — generated on your own
machine, never by an outside service. Scan it, sign in, add to the home screen,
and Vaenyx opens like an app in its own window.

**Word, Excel and PowerPoint.** The attach button now reads .docx, .xlsx and
.pptx beside PDFs and text files — words only (layout, images and charts are
not carried over; anything visual is still best saved as PDF). The old
.doc/.xls/.ppt formats are refused with the same advice, in plain words.

**Each app has its own Model Key.** Your other apps stop sharing one door key:
each gets its own Model Key from the Subscription Door panel, signs in to its
own subscription from inside itself, and spends its own account — never
Vaenyx's. The door now answers only from inside your private network: a leaked
key alone can no longer reach it from the internet. A This-month table on the
same panel shows who spent what, per app and per subscription.

**The capability switches mean it.** Anything switched off in AI Settings →
Capabilities is now really refused everywhere it could happen, in your own
language, and every refusal is written into the Guard page. Each capability row
carries its own model choice and a Test button that really performs the thing
once and reports plainly: it worked, it failed in the other side's own words,
or it is not built yet. Vaenyx can also open text files from folders you name —
switched off until you name them, and never available to any app key.

## v0.3.0 — 2026-07-27

**Pictures.** Ask for a picture in chat, in your own words, and Vaenyx makes
one — including follow-ups like "one more". A free option exists (Cloudflare
Workers AI, roughly 170 pictures a day); paste its token straight into
Settings → AI → Picture Output. The exact prompt that was sent to the image
provider is shown under every generated picture, and Vaenyx never claims a
picture was made when one wasn't.

**Engines.** The AI settings page is now four plain sections — Voice Input,
Voice Output, Picture Input, Picture Output. Each slot picks from whatever
you have signed in to, keys can be added right where they are needed, every
section carries a dated free recommendation, and an Update Free Options
button asks your own main model what is free right now (clearly labelled as
its answer, not ours).

**Watch it work.** While a reply is being made, the chat shows what is
happening — a status line for steps like generating a picture, and the
model's own thinking where the backend streams it. Task runs show the same
while you watch them. Everything vanishes once the reply lands.

**Community sharing, live.** With your explicit consent (off by default),
a correction you make to an installed Method can be sent to its publisher so
they can fix it for everyone. Corrections wait 48 hours in a visible list you
can remove them from; health, family and money are never sent automatically;
publishers only receive if they opted in; and your contributions carry a
permanent contributor ID that credits you without naming you.

**Getting around.** Refreshing stays on the page you were on; notification
taps open the exact chat or task directly; conversations open at their end;
pulling down inside a chat refreshes just that chat; archived chats live in
one window with multi-select restore and delete; Discord has its own page;
Library and Community share one layout; and the moon-embrace mark replaces
the letter V.

**Scheduled tasks.** Retry on a failed run re-runs the task itself (and moves
the status), and runs produce the deliverable — never a restatement of their
own settings.

In-app legal set v3.1, copy version 2.9.

## v0.2.0 — 2026-07-25

First public release.

Download `vaenyx-setup.zip`, unzip it, and double-click `Vaenyx-Setup.cmd`
inside the `Vaenyx` folder.

Setup checks the computer, installs Node.js if it is missing, fetches and
builds Vaenyx, offers to start it with Windows, then opens the first-run
wizard. Your notes, chats and files stay on that computer; what you send to a
connected cloud model goes to that provider.

Optional check: the SHA-256 of the download is published as
`vaenyx-setup.zip.sha256` next to the release asset.

## Earlier history

Versions before v0.2.0 were pre-release development builds with no published
releases. That history is not reconstructed here (status: unknown as release
units); it exists as commit history and internal development notes.
