// A small "?" beside a label, holding the sentence that used to sit under it
// as a paragraph (Oskar, 2026-08-17: 界面一定要简洁 — Primary 和 Backup 一看就
// 知道什么意思,根本不需要解释).
//
// The rule this encodes: a settings page is read by someone who already knows
// what they came to change. Explanation belongs one hover away, not in front of
// every reader on every visit. Anything that CANNOT be moved behind the "?" —
// a warning that changes what the Owner would choose — stays on the page.
//
// It opens on hover, on focus, and on tap, because a phone has no hover and a
// tooltip nobody can reach on a phone is a tooltip that does not exist.
import { useEffect, useId, useRef, useState } from "react";

export function Hint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrap = useRef<HTMLSpanElement | null>(null);

  // A tap elsewhere, or Escape, closes it — the same two ways every other
  // transient thing in the app closes.
  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  return (
    <span
      className="hint"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      ref={wrap}
    >
      <button
        aria-describedby={open ? id : undefined}
        aria-label={text}
        className="hint-button"
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((current) => !current)}
        onFocus={() => setOpen(true)}
        type="button"
      >
        ?
      </button>
      {open ? (
        <span className="hint-bubble" id={id} role="tooltip">
          {text}
        </span>
      ) : null}
    </span>
  );
}
