// OUR OWN DROP-DOWN (Oskar, 2026-07-31: "不要出现深色背景的时候是这种白色的
// 选择框"). Every theme in this app is dark and `color-scheme: dark` is already
// on the root, yet Chrome still painted a native <select>'s option list white —
// the popup is drawn by the browser, outside the page, and no stylesheet can
// reach it reliably. So the app draws its own. One component, used wherever a
// choice is made, so this can never come back on some control we add later.
import { useEffect, useRef, useState } from "react";

export interface PickerOption {
  /** Connected, but cannot do this job: shown and unpickable, never hidden. */
  disabled?: boolean;
  label: string;
  value: string;
}

export function Picker({
  ariaLabel,
  disabled = false,
  onChange,
  options,
  value,
}: {
  ariaLabel: string;
  disabled?: boolean;
  onChange: (next: string) => void;
  options: PickerOption[];
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    function onDown(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = options.find((option) => option.value === value);

  return (
    <div className="picker" ref={box}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className="picker-button"
        disabled={disabled}
        onClick={() => setOpen((was) => !was)}
        type="button"
      >
        <span className="picker-value">{current ? current.label : "—"}</span>
        <svg
          aria-hidden="true"
          className="picker-chevron"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="m7 10 5 5 5-5" />
        </svg>
      </button>
      {open ? (
        <div className="picker-menu" role="listbox">
          {options.map((option) => (
            <button
              aria-selected={option.value === value}
              className={
                option.value === value ? "picker-option on" : "picker-option"
              }
              disabled={option.disabled}
              key={option.value}
              onClick={() => {
                setOpen(false);
                if (option.value !== value) onChange(option.value);
              }}
              role="option"
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
