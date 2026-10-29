type EditableField = { key: string; as: string; label: string };
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
// The basic editor owns key/type/label only. Keep modular layouts, translated
// labels, columns, formats and fixed footnotes when saving unrelated edits.
export function editedRoutineView(
  base: unknown,
  edited: EditableField[],
): unknown {
  const original = record(base);
  const originals = Array.isArray(original.fields)
    ? original.fields.map(record)
    : [];
  const fields = edited
    .filter((field) => field.key.trim())
    .map((field) => {
      const next = {
        ...originals.find((item) => item.key === field.key.trim()),
        key: field.key.trim(),
        as: field.as,
      } as Record<string, unknown>;
      if (field.label.trim()) next.label = field.label.trim();
      else delete next.label;
      return next;
    });
  return fields.length ? { ...original, fields } : null;
}
export function withDinnerModules(base: unknown): unknown {
  return { ...record(base), version: 1, layout: "dinner-planner-v1" };
}
