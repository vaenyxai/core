export const DINNER_LAYOUT = "dinner-planner-v1";

export type DinnerPhoto = {
  assetId: string;
  name: string;
  role: "ingredients";
};
export type DinnerInput = {
  ingredients: string;
  servings: number;
  minutes: number;
  avoid: string;
  equipment: string;
  preferences: string;
  language: "en" | "zh";
  attachments: DinnerPhoto[];
};
export type DinnerOutput = {
  status: "ready" | "needs-input";
  title: string;
  summary: string;
  servings: number;
  minutes: number;
  ingredients: {
    name: string;
    quantity: string;
    source: "available" | "buy" | "check";
  }[];
  steps: string[];
  notes: string[];
};

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function text(value: unknown, max: number, empty = false): value is string {
  return (
    typeof value === "string" &&
    value.length <= max &&
    (empty || value.trim().length > 0)
  );
}
function integer(value: unknown, min: number, max: number): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}
function strings(
  value: unknown,
  max: number,
  length: number,
): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= max &&
    value.every((item) => text(item, length))
  );
}
export function isDinnerView(view: unknown): boolean {
  return record(view) && view.version === 1 && view.layout === DINNER_LAYOUT;
}
export function readDinnerInput(raw: unknown): DinnerInput | null {
  if (!record(raw)) return null;
  const value: Record<string, unknown> = {
    avoid: "",
    equipment: "",
    preferences: "",
    language: "en",
    attachments: [],
    ...raw,
  };
  if (
    !record(value) ||
    !text(value.ingredients, 6000) ||
    !integer(value.servings, 1, 12) ||
    !integer(value.minutes, 10, 180) ||
    !text(value.avoid, 2000, true) ||
    !text(value.equipment, 1000, true) ||
    !text(value.preferences, 2000, true) ||
    !["en", "zh"].includes(String(value.language)) ||
    !Array.isArray(value.attachments) ||
    value.attachments.length > 5 ||
    !value.attachments.every(
      (p) =>
        record(p) &&
        text(p.assetId, 100) &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/.test(
          p.assetId,
        ) &&
        text(p.name, 200, true) &&
        p.role === "ingredients",
    )
  )
    return null;
  return value as DinnerInput;
}
export function readDinnerOutput(value: unknown): DinnerOutput | null {
  if (
    !record(value) ||
    !["ready", "needs-input"].includes(String(value.status)) ||
    !text(value.title, 160) ||
    !text(value.summary, 800) ||
    !integer(value.servings, 1, 12) ||
    !integer(value.minutes, 1, 180) ||
    !strings(value.steps, 12, 1000) ||
    !strings(value.notes, 8, 500) ||
    !Array.isArray(value.ingredients) ||
    value.ingredients.length > 30 ||
    !value.ingredients.every(
      (item) =>
        record(item) &&
        text(item.name, 120) &&
        text(item.quantity, 120) &&
        ["available", "buy", "check"].includes(String(item.source)),
    ) ||
    (value.status === "ready" &&
      (!value.steps.length || !value.ingredients.length))
  )
    return null;
  return value as DinnerOutput;
}
export function emptyDinner(language: "en" | "zh"): DinnerInput {
  return {
    ingredients: "",
    servings: 2,
    minutes: 30,
    avoid: "",
    equipment: "",
    preferences: "",
    language,
    attachments: [],
  };
}
export function dinnerInputKey(input: DinnerInput): string {
  return JSON.stringify([
    input.ingredients.trim(),
    input.servings,
    input.minutes,
    input.avoid.trim(),
    input.equipment.trim(),
    input.preferences.trim(),
    input.language,
    input.attachments.map((p) => p.assetId),
  ]);
}
export function recognisedIngredients(parsed: Record<string, unknown>): string {
  const value = parsed.ingredients;
  return typeof value === "string"
    ? value.trim().slice(0, 6000)
    : Array.isArray(value)
      ? value
          .filter((v): v is string => typeof v === "string")
          .join("\n")
          .slice(0, 6000)
      : "";
}
