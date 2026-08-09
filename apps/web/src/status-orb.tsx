// THE ORB SAYS WHAT IS ACTUALLY HAPPENING, OR IT SAYS "WORKING".
//
// thinking-orbs ships nine animations; Vaenyx uses the ones it can PROVE.
// An animation is a claim — "searching" playing while nothing searches is the
// product lying in pictures — so the mapping below only reaches a specific
// state from a real signal, and everything else collapses to `working`
// (Oskar, 2026-08-09: 没有可靠的具体状态时统一使用 working).
//
// The whole mapping lives in this one file on purpose: no page imports the
// package or its state names directly, so the day a status is added or the
// library changes, there is exactly one place to look.
//
// This is a status indicator, not a brand mark. The moon-ring logo is the
// brand; this is 20px of "something is genuinely running".
import { ThinkingOrb, type OrbState } from "thinking-orbs";

/**
 * Real Vaenyx signals → orb states.
 *
 * The right-hand side of every arrow is justified by the code that emits the
 * left-hand side:
 * - "answering" / "image-generating": the reply (or the picture that IS the
 *   reply) is being generated — `composing`.
 * - "searching" / "connecting" / "listening": mapped 1:1 so that the day a
 *   real emitter exists it lights up — TODAY NOTHING EMITS THEM. Web search
 *   is only known after the reply lands (the "Web search used" chip), the
 *   provider connect flows have their own screens, and the mic never shows
 *   this indicator. Nothing here may fabricate them.
 * - "classifying" / "image-prompt" / "annotating" and anything unknown:
 *   genuinely running, not specifically claimable — `working`.
 */
function orbState(code: string | null, thinking: boolean): OrbState {
  if (code === "answering" || code === "image-generating") return "composing";
  if (code === "searching") return "searching";
  if (code === "connecting") return "connecting";
  if (code === "listening") return "listening";
  // The model's live thinking stream means the reply is being organised.
  if (thinking) return "composing";
  return "working";
}

/**
 * The 20px inline orb that replaced the three bouncing dots.
 *
 * aria-hidden, deliberately: the text beside it already carries aria-live, and
 * a canvas announcing itself on top of that is the same status read twice.
 * Idle never renders this component at all — the indicator only exists while a
 * send is in flight — and the library itself pauses offscreen, in hidden tabs,
 * and under prefers-reduced-motion (verified in its source, not taken from its
 * README).
 */
export function StatusOrb({
  code,
  thinking,
}: {
  code: string | null;
  thinking: boolean;
}) {
  return (
    <ThinkingOrb
      aria-hidden="true"
      size={20}
      state={orbState(code, thinking)}
      // Pinned, not "auto": every Vaenyx theme is a dark variant and
      // data-theme carries ids like "obice" that the library's detector does
      // not recognise, so auto would fall through to the OS setting — and a
      // light-mode OS would paint dark ink on this dark surface.
      theme="dark"
    />
  );
}
