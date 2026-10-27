import { useId, useState, type ReactNode } from "react";

export function ComposerOptions({
  summary,
  language,
  children,
}: {
  summary: string;
  language: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const zh = language === "zh";
  return (
    <div
      className="composer-options"
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        className="composer-options-toggle"
        aria-expanded={open}
        aria-controls={id}
        aria-label={zh ? "模型与思考设置" : "Model & Thinking Settings"}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{summary}</span>
        <span aria-hidden="true">{open ? "⌄" : "⌃"}</span>
      </button>
      <div
        id={id}
        className={"composer-options-panel" + (open ? " is-open" : "")}
      >
        <div className="composer-options-heading">
          <strong>{zh ? "模型与思考设置" : "Model & Thinking Settings"}</strong>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={zh ? "关闭设置" : "Close Settings"}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
