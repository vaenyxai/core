# Changelog

User-facing release history for Vaenyx. Each released version here matches a
Git tag and a GitHub Release with the same notes. Day-to-day development
history lives in the commit log.

## v0.3.3 — 2026-08-07

**Vaenyx is quick again.** On a busy computer it had started answering
seconds late — the models list could take over a minute, and signing in
crawled. The cause was the boot entry Vaenyx registers for itself: Windows
creates those at a low priority, and passes it down to everything they
start, so Vaenyx was quietly last in the queue for the processor whenever
anything else wanted it. It now runs at the same priority as everything
else you use. Two more faults in the same entry are gone with it: Windows
was killing the piece that keeps Vaenyx alive after three days of uptime,
and on a laptop off its charger Vaenyx never started at boot at all. If
something ever does block it again, it now writes down how long for.

**Reading the words in pictures — the new "OCR" switch.** Scans and photos
turn into text: a scanned PDF that used to come back empty is read
properly, and the words printed in a photo reach the model exactly as
written. It runs on an engine built for the job, never the chat model —
a chat model that cannot make out a character invents a plausible one, and
on a quote that is a wrong number in a confident sentence. It is a switch
of its own, because with it on and document reading off, a scan becomes
text on your machine and no model sees it. Drop a scan in with it off and
Vaenyx says so, with a button to turn it on.

**What each provider does with your content, beside the choice.** Every
model connection now carries its provider's own data conditions — quoted
from their terms, dated, with the source linked. Two are worth knowing
before you pick: Gemini's free tier and Mistral's free tier both train on
what you send by default. Vaenyx does not exclude them and does not
promise anything on a provider's behalf; it puts the facts where the
decision is made.

**A repeating task stops repeating itself.** A daily news task was
re-reporting the previous day from the same handful of sources. Each run
is now shown what the last five already delivered, with one instruction:
not again. If something has changed it leads with the change; otherwise it
goes looking for ground the earlier runs missed. On a genuinely quiet day
it says so in a line instead of padding. What you asked for in the task's
own chat — format, length, what to leave out — still carries into every
run.

**Uninstalling really removes it.** Uninstall reported success while
leaving about a gigabyte of build files behind. It now removes them, keeps
your data unless you say otherwise, and every release from here is tested
by installing and uninstalling for real before the download is published.

**On a phone.** Opening a chat or a task lands on the first line of the
newest answer instead of somewhere in its middle. The header gives the
title its room back — history moved off the phone, the schedule marker is
shorter, and the ⋮ sits in the corner where it belongs. The floating
arrow is one round button just above the message box: down to the newest,
up to where it starts, gone three seconds after you stop touching the
screen. Anything that sets Vaenyx working — Run Now, a message, a file —
takes you to the bottom to watch it. And the "+" folds away when you tap
anywhere else.

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
