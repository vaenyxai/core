import { useState, type FormEvent } from "react";

import type {
  AskVaenyxMessage,
  ResolveStructuredQuestionRequest,
  StructuredQuestionPart,
} from "@vaenyx/contracts";

import { useI18n } from "./i18n.js";

export function questionPart(
  message: AskVaenyxMessage,
): StructuredQuestionPart | null {
  return (
    message.parts?.find((part) => part.type === "structured-question") ?? null
  );
}

// content contains the complete plain-text fallback for older clients. The
// current client replaces only that exact stored suffix with the richer card;
// arbitrary model text is never parsed or hidden in the browser.
export function visibleMessageContent(message: AskVaenyxMessage): string {
  const part = questionPart(message);
  if (!part || !message.content.endsWith(part.plainTextFallback)) {
    return message.content;
  }
  return message.content.slice(0, -part.plainTextFallback.length).trimEnd();
}

export function StructuredQuestionCard({
  part,
  busy,
  onResolve,
}: {
  part: StructuredQuestionPart;
  busy: boolean;
  onResolve: (resolution: ResolveStructuredQuestionRequest) => Promise<void>;
}) {
  const { t } = useI18n();
  const [freeText, setFreeText] = useState("");
  const [error, setError] = useState(false);

  async function resolve(resolution: ResolveStructuredQuestionRequest) {
    setError(false);
    try {
      await onResolve(resolution);
      setFreeText("");
    } catch {
      setError(true);
    }
  }

  function submitFreeText(event: FormEvent) {
    event.preventDefault();
    const text = freeText.trim();
    if (!text || busy || part.state.status !== "open") return;
    void resolve({ kind: "free_text", text });
  }

  if (part.state.status === "resolved") {
    return (
      <div
        aria-live="polite"
        className={`structured-question resolved ${
          part.state.kind === "skip" ? "skipped" : ""
        }`}
      >
        <p className="structured-question-prompt">{part.prompt}</p>
        <p className="structured-question-resolution">
          <strong>
            {part.state.kind === "skip"
              ? t("question.skipped")
              : t("question.answered")}
          </strong>{" "}
          {part.state.displayText}
        </p>
      </div>
    );
  }

  return (
    <fieldset className="structured-question" disabled={busy}>
      <legend className="structured-question-prompt">{part.prompt}</legend>
      {part.helpText ? (
        <p className="structured-question-help">{part.helpText}</p>
      ) : null}
      <div className="structured-question-options">
        {part.options.map((option) => (
          <button
            className="structured-question-option"
            key={option.id}
            onClick={() =>
              void resolve({ kind: "choice", optionId: option.id })
            }
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
      {part.allowFreeText ? (
        <form className="structured-question-other" onSubmit={submitFreeText}>
          <label htmlFor={`question-${part.questionId}-answer`}>
            {t("question.other")}
          </label>
          <div className="structured-question-other-row">
            <input
              autoComplete="off"
              id={`question-${part.questionId}-answer`}
              maxLength={1000}
              onChange={(event) => setFreeText(event.target.value)}
              placeholder={t("question.placeholder")}
              value={freeText}
            />
            <button
              className="structured-question-send"
              disabled={!freeText.trim()}
              type="submit"
            >
              {t("question.send")}
            </button>
          </div>
        </form>
      ) : null}
      <div className="structured-question-footer">
        {part.allowSkip ? (
          <button
            className="structured-question-skip"
            onClick={() => void resolve({ kind: "skip" })}
            type="button"
          >
            {t("question.skip")}
          </button>
        ) : null}
        <span aria-live="polite" className="structured-question-status">
          {busy ? t("question.resolving") : error ? t("question.error") : ""}
        </span>
      </div>
    </fieldset>
  );
}
