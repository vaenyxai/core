import type { ImageAnnotationItem } from "@vaenyx/contracts";
export type HouseholdKind = "notice" | "warranty";
export type HouseholdSource = {
  assetId: string;
  name: string;
  role: string;
  kind: "image" | "document";
  text: string;
  annotations: ImageAnnotationItem[];
};
export type HouseholdInput = {
  sourceText: string;
  language: "en" | "zh";
  attachments: HouseholdSource[];
  corrections: Record<string, string>;
};
export type HouseholdOutput = {
  title: string;
  summary: string;
  fields: {
    label: string;
    value: string;
    sourceId: string;
    quote: string;
    uncertain: boolean;
  }[];
  checklist: string[];
  checks: string[];
};
export const householdScenes = {
  notice: {
    id: "vaenyx-family-notices",
    layout: "family-notices-v1",
    name: "Family Notices",
    zh: "家庭通知",
    icon: "▤",
    action: ["Organise Notice", "整理通知"],
    hint: [
      "Add a notice. See dates, places and what to prepare.",
      "放入通知，看清时间、地点和准备事项。",
    ],
    roles: [["notice", "Notice", "通知"]],
    corrections: [
      ["eventDate", "Date", "日期", "date"],
      ["eventTime", "Time", "时间", "time"],
      ["place", "Place", "地点", "text"],
    ],
  },
  warranty: {
    id: "vaenyx-warranty",
    layout: "warranty-v1",
    name: "Warranty",
    zh: "保修",
    icon: "◇",
    action: ["Organise Records", "整理资料卡"],
    hint: [
      "Keep a receipt, product label and manual together.",
      "把收据、产品铭牌和说明书放在一起。",
    ],
    roles: [
      ["receipt", "Receipt", "收据"],
      ["label", "Product Label", "产品铭牌"],
      ["manual", "Manual", "说明书"],
    ],
    corrections: [
      ["product", "Product", "物品", "text"],
      ["model", "Model", "型号", "text"],
      ["purchased", "Purchase Date", "购买日期", "date"],
      ["seller", "Seller", "商家", "text"],
    ],
  },
} as const;
export function householdKind(view: unknown): HouseholdKind | null {
  if (!record(view) || view.version !== 1) return null;
  return view.layout === "family-notices-v1"
    ? "notice"
    : view.layout === "warranty-v1"
      ? "warranty"
      : null;
}
export function record(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
const bounded = (v: unknown, n: number): v is string =>
  typeof v === "string" && v.length <= n;
export function emptyHousehold(language: "en" | "zh"): HouseholdInput {
  return { sourceText: "", language, attachments: [], corrections: {} };
}
export function readHouseholdInput(v: unknown): HouseholdInput | null {
  if (!record(v)) return null;
  v = { language: "en", attachments: [], corrections: {}, ...v };
  if (
    !record(v) ||
    !bounded(v.sourceText, 12000) ||
    !["en", "zh"].includes(String(v.language)) ||
    !record(v.corrections) ||
    Object.keys(v.corrections).length > 10 ||
    !Object.values(v.corrections).every((x) => bounded(x, 500)) ||
    !Array.isArray(v.attachments) ||
    v.attachments.length > 5
  )
    return null;
  if (
    !v.attachments.every(
      (s) =>
        record(s) &&
        bounded(s.name, 200) &&
        bounded(s.role, 30) &&
        bounded(s.text, 12000) &&
        typeof s.assetId === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$/.test(
          s.assetId,
        ) &&
        ["image", "document"].includes(String(s.kind)) &&
        Array.isArray(s.annotations) &&
        s.annotations.length <= 30 &&
        s.annotations.every(
          (a) =>
            record(a) &&
            bounded(a.name, 200) &&
            typeof a.x === "number" &&
            a.x >= 0 &&
            a.x <= 100 &&
            typeof a.y === "number" &&
            a.y >= 0 &&
            a.y <= 100,
        ),
    )
  )
    return null;
  return v as HouseholdInput;
}
export function readHouseholdOutput(v: unknown): HouseholdOutput | null {
  if (
    !record(v) ||
    !bounded(v.title, 200) ||
    !v.title.trim() ||
    !bounded(v.summary, 1000) ||
    !Array.isArray(v.fields) ||
    !v.fields.length ||
    v.fields.length > 24
  )
    return null;
  if (
    !v.fields.every(
      (f) =>
        record(f) &&
        bounded(f.label, 120) &&
        bounded(f.value, 1500) &&
        bounded(f.sourceId, 100) &&
        bounded(f.quote, 1500) &&
        typeof f.uncertain === "boolean",
    )
  )
    return null;
  if (
    ![v.checklist, v.checks].every(
      (a) =>
        Array.isArray(a) && a.length <= 20 && a.every((x) => bounded(x, 800)),
    )
  )
    return null;
  return v as HouseholdOutput;
}
export function hasHouseholdText(input: HouseholdInput): boolean {
  return !!(
    input.sourceText.trim() || input.attachments.some((s) => s.text.trim())
  );
}
export function householdInputKey(input: HouseholdInput): string {
  return JSON.stringify([
    input.sourceText,
    input.language,
    Object.entries(input.corrections).sort(),
    input.attachments.map((s) => [s.assetId, s.role, s.text]),
  ]);
}
export function fieldSource(
  field: HouseholdOutput["fields"][number],
  input: HouseholdInput | null,
) {
  if (!input || !field.quote.trim()) return null;
  const source =
    field.sourceId === "typed"
      ? {
          name: input.language === "zh" ? "输入的文字" : "Typed Text",
          text: input.sourceText,
        }
      : field.sourceId === "corrections"
        ? {
            name: input.language === "zh" ? "你的更正" : "Your Corrections",
            text: Object.values(input.corrections).join("\n"),
          }
        : input.attachments.find((s) => s.assetId === field.sourceId);
  const normal = (s: string) => s.normalize("NFKC").replace(/\s+/g, " ").trim();
  return source && normal(source.text).includes(normal(field.quote))
    ? {
        name: source.name,
        text: source.text,
        attachment: input.attachments.find((s) => s.assetId === field.sourceId),
      }
    : null;
}
