import {
  MAX_FIELDS,
  MAX_LIST_ITEMS,
  parseRoutineView,
  safeText,
  type ResultLanguage,
  type ValueRecord,
} from "./routine-result-format";
import { DeclaredRoutineField } from "./routine-result-fields";

export {
  formatRoutineValue,
  parseRoutineView,
  spokenResultText,
} from "./routine-result-format";

function ResultActions({
  language,
  onCorrectAndRerun,
  onRerun,
}: {
  language: ResultLanguage;
  onCorrectAndRerun?: () => void;
  onRerun?: () => void;
}) {
  if (!onCorrectAndRerun && !onRerun) return null;
  return (
    <div className="routine-result-actions">
      {onCorrectAndRerun ? (
        <button
          className="text-button"
          onClick={onCorrectAndRerun}
          type="button"
        >
          {language === "zh" ? "纠正并重跑" : "Correct & Rerun"}
        </button>
      ) : null}
      {onRerun ? (
        <button className="text-button" onClick={onRerun} type="button">
          {language === "zh" ? "重跑" : "Rerun"}
        </button>
      ) : null}
    </div>
  );
}

export function RoutineResultView({
  output,
  view,
  language = "en",
  onCorrectAndRerun,
  onRerun,
}: {
  output: unknown;
  view?: unknown;
  language?: ResultLanguage;
  onCorrectAndRerun?: () => void;
  onRerun?: () => void;
}) {
  const noResult = language === "zh" ? "没有结果。" : "No result.";
  if (output === null || output === undefined) {
    return <p className="settings-card-copy">{noResult}</p>;
  }
  if (typeof output !== "object" || Array.isArray(output)) {
    return <p>{safeText(output)}</p>;
  }
  const record = output as ValueRecord;
  const declared = parseRoutineView(view);
  const actions = (
    <ResultActions
      language={language}
      onCorrectAndRerun={onCorrectAndRerun}
      onRerun={onRerun}
    />
  );

  if (declared) {
    const fields = declared.fields.filter((field) => {
      if (field.showWhenMissing) return true;
      const value = record[field.key];
      if (value === null || value === undefined || value === "") return false;
      return !(
        (field.as === "table" || field.as === "bullets") &&
        Array.isArray(value) &&
        value.length === 0
      );
    });
    if (fields.length === 0) {
      return <p className="settings-card-copy">{noResult}</p>;
    }
    return (
      <div className="routine-result">
        {fields.map((field) => (
          <DeclaredRoutineField
            field={field}
            key={field.key}
            language={language}
            record={record}
          />
        ))}
        {actions}
      </div>
    );
  }

  const entries = Object.entries(record).slice(0, MAX_FIELDS);
  if (entries.length === 0) {
    return <p className="settings-card-copy">{noResult}</p>;
  }
  const titleEntry = entries.find(
    ([key, value]) =>
      typeof value === "string" && /title|name|summary|heading/i.test(key),
  );
  return (
    <div className="routine-result">
      {titleEntry ? (
        <strong className="routine-result-title">
          {safeText(titleEntry[1])}
        </strong>
      ) : null}
      {entries
        .filter(([key]) => key !== titleEntry?.[0])
        .map(([key, value]) => (
          <div className="routine-result-field" key={key}>
            {Array.isArray(value) ? (
              <ul>
                {value.slice(0, MAX_LIST_ITEMS).map((item, index) => (
                  <li key={`${key}-${index}`}>{safeText(item)}</li>
                ))}
              </ul>
            ) : value !== null && typeof value === "object" ? (
              <pre>{safeText(value)}</pre>
            ) : (
              <p>
                <span className="routine-result-key">{key}: </span>
                {safeText(value)}
              </p>
            )}
          </div>
        ))}
      {actions}
    </div>
  );
}
