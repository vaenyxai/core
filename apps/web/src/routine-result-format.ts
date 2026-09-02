import type {
  RoutineView,
  RoutineViewColumn,
  RoutineViewField,
  RoutineViewFormat,
} from "@vaenyx/contracts";

export type ResultLanguage = "en" | "zh";
export type ValueRecord = Record<string, unknown>;

export const MAX_FIELDS = 24;
export const MAX_LIST_ITEMS = 50;
export const MAX_TABLE_ROWS = 50;
export const MAX_TABLE_COLUMNS = 10;
const MAX_TEXT = 4_000;
const FIELD_KINDS = new Set<RoutineViewField["as"]>([
  "title",
  "text",
  "bullets",
  "table",
  "amount",
  "note",
]);
const FORMATS = new Set<RoutineViewFormat>([
  "text",
  "date",
  "number",
  "currency",
  "unit",
  "certainty",
]);

function boundedString(value: unknown, max = MAX_TEXT): string | undefined {
  return typeof value === "string" && value.length <= max ? value : undefined;
}

function optionalKey(value: unknown): string | undefined {
  const key = boundedString(value, 80);
  return key && key.trim() ? key : undefined;
}

function parseColumn(raw: unknown): RoutineViewColumn | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw))
    return null;
  const candidate = raw as ValueRecord;
  const key = optionalKey(candidate.key);
  if (!key) return null;
  const format = FORMATS.has(candidate.format as RoutineViewFormat)
    ? (candidate.format as RoutineViewFormat)
    : undefined;
  const currency = boundedString(candidate.currency, 3);
  const unit = boundedString(candidate.unit, 30);
  return {
    key,
    ...(boundedString(candidate.label, 120) !== undefined
      ? { label: candidate.label as string }
      : {}),
    ...(boundedString(candidate.labelZh, 120) !== undefined
      ? { labelZh: candidate.labelZh as string }
      : {}),
    ...(format ? { format } : {}),
    ...(currency && /^[A-Za-z]{3}$/.test(currency)
      ? { currency: currency.toUpperCase() }
      : {}),
    ...(optionalKey(candidate.currencyKey)
      ? { currencyKey: candidate.currencyKey as string }
      : {}),
    ...(unit ? { unit } : {}),
    ...(optionalKey(candidate.unitKey)
      ? { unitKey: candidate.unitKey as string }
      : {}),
  };
}

// Routine JSON is author data, not trusted UI code. Parse a small declarative
// allowlist and bound every collection before React sees it. Unknown future
// versions deliberately fall back to the automatic renderer.
export function parseRoutineView(raw: unknown): RoutineView | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw))
    return null;
  const candidateView = raw as ValueRecord;
  if (candidateView.version !== undefined && candidateView.version !== 1) {
    return null;
  }
  if (!Array.isArray(candidateView.fields)) return null;

  const fields: RoutineViewField[] = [];
  const seen = new Set<string>();
  for (const rawField of candidateView.fields.slice(0, MAX_FIELDS)) {
    if (
      rawField === null ||
      typeof rawField !== "object" ||
      Array.isArray(rawField)
    ) {
      continue;
    }
    const candidate = rawField as ValueRecord;
    const key = optionalKey(candidate.key);
    const as = candidate.as as RoutineViewField["as"];
    if (!key || seen.has(key) || !FIELD_KINDS.has(as)) continue;
    seen.add(key);

    const format = FORMATS.has(candidate.format as RoutineViewFormat)
      ? (candidate.format as RoutineViewFormat)
      : undefined;
    const currency = boundedString(candidate.currency, 3);
    const unit = boundedString(candidate.unit, 30);
    const columns = Array.isArray(candidate.columns)
      ? candidate.columns
          .slice(0, MAX_TABLE_COLUMNS)
          .map(parseColumn)
          .filter((entry): entry is RoutineViewColumn => entry !== null)
      : [];
    fields.push({
      key,
      as,
      ...(boundedString(candidate.label, 120) !== undefined
        ? { label: candidate.label as string }
        : {}),
      ...(boundedString(candidate.labelZh, 120) !== undefined
        ? { labelZh: candidate.labelZh as string }
        : {}),
      ...(format ? { format } : {}),
      ...(currency && /^[A-Za-z]{3}$/.test(currency)
        ? { currency: currency.toUpperCase() }
        : {}),
      ...(optionalKey(candidate.currencyKey)
        ? { currencyKey: candidate.currencyKey as string }
        : {}),
      ...(unit ? { unit } : {}),
      ...(optionalKey(candidate.unitKey)
        ? { unitKey: candidate.unitKey as string }
        : {}),
      ...(optionalKey(candidate.evidenceKey)
        ? { evidenceKey: candidate.evidenceKey as string }
        : {}),
      ...(optionalKey(candidate.certaintyKey)
        ? { certaintyKey: candidate.certaintyKey as string }
        : {}),
      ...(typeof candidate.showWhenMissing === "boolean"
        ? { showWhenMissing: candidate.showWhenMissing }
        : {}),
      ...(columns.length > 0 ? { columns } : {}),
    });
  }
  return fields.length > 0
    ? {
        ...(candidateView.version === 1 ? { version: 1 as const } : {}),
        fields,
      }
    : null;
}

export function safeText(value: unknown): string {
  if (typeof value === "string") return value.slice(0, MAX_TEXT);
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    try {
      const serialized = JSON.stringify(value);
      return typeof serialized === "string"
        ? serialized.slice(0, MAX_TEXT)
        : "";
    } catch {
      return "";
    }
  }
  return String(value).slice(0, MAX_TEXT);
}

export function localizedLabel(
  item: { key: string; label?: string; labelZh?: string },
  language: ResultLanguage,
): string {
  return language === "zh"
    ? (item.labelZh ?? item.label ?? item.key)
    : (item.label ?? item.key);
}

function linkedString(
  explicit: string | undefined,
  key: string | undefined,
  record: ValueRecord,
): string | undefined {
  if (key) {
    const linked = record[key];
    if (typeof linked === "string" && linked.trim()) return linked.trim();
  }
  return explicit;
}

export function formatRoutineValue(
  value: unknown,
  options: {
    format?: RoutineViewFormat;
    currency?: string;
    currencyKey?: string;
    unit?: string;
    unitKey?: string;
  },
  language: ResultLanguage,
  record: ValueRecord,
): string {
  const unknown = language === "zh" ? "未知" : "Unknown";
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return unknown;
  }
  const locale = language === "zh" ? "zh-CN" : "en-AU";
  const format = options.format ?? "text";

  if (format === "date") {
    const raw = safeText(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw || unknown;
    const date = new Date(`${raw}T00:00:00Z`);
    return Number.isNaN(date.valueOf()) ||
      date.toISOString().slice(0, 10) !== raw
      ? raw
      : new Intl.DateTimeFormat(locale, {
          day: "numeric",
          month: "short",
          timeZone: "UTC",
          year: "numeric",
        }).format(date);
  }

  if (["number", "currency", "unit"].includes(format)) {
    const number = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(number)) return safeText(value) || unknown;
    if (format === "currency") {
      const currency = linkedString(
        options.currency,
        options.currencyKey,
        record,
      )?.toUpperCase();
      if (currency && /^[A-Z]{3}$/.test(currency)) {
        try {
          return new Intl.NumberFormat(locale, {
            currency,
            style: "currency",
          }).format(number);
        } catch {
          // Unknown ISO-like codes degrade to a locale number, never "$".
        }
      }
    }
    const formatted = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 4,
    }).format(number);
    const unit = linkedString(options.unit, options.unitKey, record);
    return format === "unit" && unit ? `${formatted} ${unit}` : formatted;
  }

  if (format === "certainty") {
    const normalized = safeText(value).toLowerCase();
    const labels: Record<string, [string, string]> = {
      confirmed: ["Confirmed", "已确认"],
      inferred: ["Inferred", "推断"],
      uncertain: ["Uncertain", "不确定"],
    };
    return labels[normalized]?.[language === "zh" ? 1 : 0] ?? unknown;
  }
  return safeText(value) || unknown;
}

export function spokenResultText(output: unknown, view?: unknown): string {
  if (output === null || typeof output !== "object" || Array.isArray(output)) {
    return "";
  }
  const record = output as ValueRecord;
  const declared = parseRoutineView(view);
  const parts: string[] = [];
  if (declared) {
    const titleKey = declared.fields.find((field) => field.as === "title")?.key;
    const bulletsKey = declared.fields.find(
      (field) => field.as === "bullets",
    )?.key;
    const title = titleKey ? record[titleKey] : undefined;
    if (typeof title === "string" && title.trim()) parts.push(title.trim());
    const bullets = bulletsKey ? record[bulletsKey] : undefined;
    if (Array.isArray(bullets) && bullets.length > 0) {
      parts.push(bullets.slice(0, 4).map(safeText).join(", "));
    }
  }
  if (parts.length === 0) {
    for (const value of Object.values(record)) {
      if (typeof value === "string" && value.trim()) {
        parts.push(value.trim());
        if (parts.length >= 2) break;
      }
    }
  }
  return parts.join(". ").slice(0, 400);
}
