# Changelog

User-facing release history for Vaenyx. Each released version here matches a
Git tag and a GitHub Release with the same notes. Day-to-day development
history lives in the commit log.

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
