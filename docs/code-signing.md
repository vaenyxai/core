# Code signing — the plan of record (2026-08-06)

Why this exists: **Smart App Control hard-blocks unsigned programs with no
"Run anyway"**, it ships ON with brand-new Windows 11 machines — exactly the
computer a non-technical family buys — and Microsoft's own documentation says
a signature from ANY trusted CA, even with zero reputation, turns the hard
block into a warning. So signing moved from "not worth paying for" to "must
do, because a free route exists".

⚠️ Development machines have Smart App Control OFF (it disables itself the
moment developer tooling appears). Never conclude "it works" from this
machine — the hard block only shows on a clean consumer install.

## The chosen route: SignPath Foundation (free, for open source)

Microsoft's documentation points at it by name. Eligibility we already meet:
`vaenyxai/core` is public, MIT-licensed, with published releases. The
publisher on the certificate reads "SignPath Foundation", and every release
needs one human approval in their portal — accepted cost.

Pre-requisite (done 2026-08-06): GitHub could not detect the licence
(`licenseInfo` was empty) because LICENSE carried an appended trademark
notice. LICENSE is now the exact MIT text; the notice lives unchanged in
TRADEMARKS.md; the repo sidebar must show "MIT" before applying — check it
does.

Applying is the operator's act (account creation, the application form, and
each release's approval are human steps). Once approved, the release workflow
gains a signing step for vaenyx-setup.exe (and the zip if their policy signs
archives) between build and publish — SignPath's own GitHub integration, with
its credentials in repo secrets, never in the tree.

## The two routes deliberately NOT taken

- **EV certificates — never.** Microsoft removed EV's instant SmartScreen
  trust in 2024; their own words say the EV premium "no longer has a
  justification" for reputation purposes. Paying for one buys nothing.
- **Azure Trusted Signing — not this round.** Open in Australia, but it
  requires three years of verifiable organisation history (we have one
  month), and it allows THREE application attempts ever — a failed attempt
  is permanent. Revisit when Vae Foundry is three years old; do not burn an
  attempt early.

## Until the signature lands

The interception chain a user hits is THREE gates, and the walkthrough for
all three ships in two places (Read-Me-First.txt in the zip, and the note
under the website's download button): the browser's "not commonly
downloaded" → SmartScreen's "Windows protected your PC" → UAC's
"Publisher: Unknown". Plus the honest Smart App Control caveat: on a machine
where it is ON, there is no "Run anyway" — Windows Security → App & browser
control → Smart App Control: Off is the only path until we ship signed.

Both walkthroughs and this file's SAC caveat come OUT the release after the
first signed installer ships.
