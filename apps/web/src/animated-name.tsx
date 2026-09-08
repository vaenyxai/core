// THE NAME THAT NEVER SITS STILL (Oskar, 2026-09-08).
//
// The title of the permanent conversation is the agent's name — whatever the
// Owner called it, in whatever language. It keeps moving, and every run is a
// different move: one of the effects below is drawn at random (never the same
// one twice in a row), plays across the characters one after another, rests
// a moment, and the next one is drawn.
//
// Works for any script because the text is cut into GRAPHEMES with the
// browser's own Intl.Segmenter — a Latin letter, a Han character, an emoji
// with its joiners — each becomes one animated span. No library.
//
// A system that asks for reduced motion gets the plain name.
import { useEffect, useMemo, useRef, useState } from "react";

// Each name is a CSS class suffix; the keyframes live in styles.css.
const EFFECTS = [
  "wave",
  "jelly",
  "tilt",
  "glow",
  "flip",
  "rise",
  "swing",
] as const;

type Effect = (typeof EFFECTS)[number];

// Milliseconds between one character starting and the next.
const STAGGER_MS = 70;
// The rest between two runs, drawn afresh each time so the rhythm never
// becomes a metronome.
const REST_MIN_MS = 1200;
const REST_MAX_MS = 3200;

function splitGraphemes(text: string): string[] {
  const Segmenter = (
    Intl as unknown as {
      Segmenter?: new (
        locale?: string,
        options?: { granularity: "grapheme" },
      ) => { segment(input: string): Iterable<{ segment: string }> };
    }
  ).Segmenter;
  if (Segmenter) {
    return [...new Segmenter(undefined, { granularity: "grapheme" }).segment(text)]
      .map((part) => part.segment);
  }
  return Array.from(text);
}

function drawEffect(previous: Effect | null): Effect {
  const pool = EFFECTS.filter((effect) => effect !== previous);
  return pool[Math.floor(Math.random() * pool.length)] ?? EFFECTS[0];
}

function reducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function AnimatedName({ text }: { text: string }) {
  const chars = useMemo(() => splitGraphemes(text), [text]);
  const still = useMemo(reducedMotion, []);
  const [effect, setEffect] = useState<Effect>(() => drawEffect(null));
  // Bumped every run so React re-mounts the spans and the animation restarts
  // even when the same class would otherwise stay put.
  const [run, setRun] = useState(0);
  const restTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (restTimer.current !== null) window.clearTimeout(restTimer.current);
    },
    [],
  );

  if (still || chars.length === 0) {
    return <span className="animated-name animated-name--still">{text}</span>;
  }

  const lastIndex = chars.length - 1;
  const onLastCharDone = () => {
    if (restTimer.current !== null) window.clearTimeout(restTimer.current);
    const rest =
      REST_MIN_MS + Math.floor(Math.random() * (REST_MAX_MS - REST_MIN_MS));
    restTimer.current = window.setTimeout(() => {
      setEffect((current) => drawEffect(current));
      setRun((current) => current + 1);
    }, rest);
  };

  return (
    <span className={`animated-name animated-name--${effect}`}>
      {chars.map((char, index) => (
        <span
          className="animated-name-char"
          key={`${run}-${index}`}
          onAnimationEnd={index === lastIndex ? onLastCharDone : undefined}
          style={{ animationDelay: `${index * STAGGER_MS}ms` }}
        >
          {char === " " ? " " : char}
        </span>
      ))}
    </span>
  );
}
