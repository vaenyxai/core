import type { RoutineViewColumn, RoutineViewField } from "@vaenyx/contracts";

import {
  formatRoutineValue,
  localizedLabel,
  MAX_LIST_ITEMS,
  MAX_TABLE_COLUMNS,
  MAX_TABLE_ROWS,
  safeText,
  type ResultLanguage,
  type ValueRecord,
} from "./routine-result-format";

function RoutineEvidence({
  field,
  language,
  record,
}: {
  field: RoutineViewField;
  language: ResultLanguage;
  record: ValueRecord;
}) {
  const evidence = field.evidenceKey
    ? safeText(record[field.evidenceKey]).trim()
    : "";
  const certainty = field.certaintyKey
    ? formatRoutineValue(
        record[field.certaintyKey],
        { format: "certainty" },
        language,
        record,
      )
    : "";
  if (!evidence && !certainty) return null;
  return (
    <div className="routine-result-evidence">
      {certainty ? (
        <span className="routine-result-certainty">{certainty}</span>
      ) : null}
      {evidence ? (
        <span>
          {language === "zh" ? "依据" : "Source"}: {evidence}
        </span>
      ) : null}
    </div>
  );
}

function RoutineTable({
  field,
  language,
  record,
  rows,
}: {
  field: RoutineViewField;
  language: ResultLanguage;
  record: ValueRecord;
  rows: ValueRecord[];
}) {
  const label = localizedLabel(field, language);
  const columns: RoutineViewColumn[] = (
    field.columns?.length
      ? field.columns
      : Object.keys(rows[0] ?? {})
          .slice(0, MAX_TABLE_COLUMNS)
          .map((key): RoutineViewColumn => ({ key }))
  ).slice(0, MAX_TABLE_COLUMNS);
  return (
    <div className="routine-result-field">
      {field.label || field.labelZh ? (
        <span className="routine-result-key">{label}</span>
      ) : null}
      <div className="routine-result-table-wrap">
        <table className="routine-result-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{localizedLabel(column, language)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${field.key}-${index}`}>
                {columns.map((column) => (
                  <td
                    className={
                      column.format === "certainty"
                        ? "routine-result-certainty-cell"
                        : undefined
                    }
                    key={column.key}
                  >
                    {formatRoutineValue(row[column.key], column, language, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <RoutineEvidence field={field} language={language} record={record} />
    </div>
  );
}

function MissingField({
  field,
  language,
}: {
  field: RoutineViewField;
  language: ResultLanguage;
}) {
  return (
    <p className="routine-result-field">
      <span className="routine-result-key">
        {localizedLabel(field, language)}:{" "}
      </span>
      {language === "zh" ? "未知" : "Unknown"}
    </p>
  );
}

export function DeclaredRoutineField({
  field,
  language,
  record,
}: {
  field: RoutineViewField;
  language: ResultLanguage;
  record: ValueRecord;
}) {
  const value = record[field.key];
  const label = localizedLabel(field, language);
  if (field.as === "title") {
    return (
      <div className="routine-result-field">
        <strong className="routine-result-title">
          {formatRoutineValue(value, field, language, record)}
        </strong>
        <RoutineEvidence field={field} language={language} record={record} />
      </div>
    );
  }
  if (field.as === "bullets") {
    const items = (Array.isArray(value) ? value : [value]).slice(
      0,
      MAX_LIST_ITEMS,
    );
    if (items.length === 0) {
      return field.showWhenMissing ? (
        <MissingField field={field} language={language} />
      ) : null;
    }
    return (
      <div className="routine-result-field">
        {field.label || field.labelZh ? (
          <span className="routine-result-key">{label}</span>
        ) : null}
        <ul>
          {items.map((item, index) => (
            <li key={`${field.key}-${index}`}>{safeText(item)}</li>
          ))}
        </ul>
        <RoutineEvidence field={field} language={language} record={record} />
      </div>
    );
  }
  if (field.as === "table") {
    const rows = (Array.isArray(value) ? value : [])
      .filter(
        (row): row is ValueRecord =>
          row !== null && typeof row === "object" && !Array.isArray(row),
      )
      .slice(0, MAX_TABLE_ROWS);
    return rows.length > 0 ? (
      <RoutineTable
        field={field}
        language={language}
        record={record}
        rows={rows}
      />
    ) : field.showWhenMissing ? (
      <MissingField field={field} language={language} />
    ) : null;
  }
  if (field.as === "amount") {
    return (
      <div className="routine-result-amount">
        <span className="routine-result-amount-value">
          {formatRoutineValue(
            value,
            { ...field, format: field.format ?? "currency" },
            language,
            record,
          )}
        </span>
        <span className="routine-result-amount-label">{label}</span>
        <RoutineEvidence field={field} language={language} record={record} />
      </div>
    );
  }
  if (field.as === "note") {
    return (
      <div className="routine-result-note">
        {field.label || field.labelZh ? (
          <span className="routine-result-note-label">{label}</span>
        ) : null}
        <p>{formatRoutineValue(value, field, language, record)}</p>
        <RoutineEvidence field={field} language={language} record={record} />
      </div>
    );
  }
  return (
    <div className="routine-result-field">
      <p>
        <span className="routine-result-key">{label}: </span>
        {formatRoutineValue(value, field, language, record)}
      </p>
      <RoutineEvidence field={field} language={language} record={record} />
    </div>
  );
}
