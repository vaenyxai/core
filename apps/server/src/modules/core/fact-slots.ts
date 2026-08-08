// THE SLOT VOCABULARY — a small closed list, deliberately not free-form triples.
//
// A fact is (slot, value). The slot names are fixed here because the whole
// bitemporal design rests on being able to ask "what is the CURRENT value of
// this one thing" and get exactly one answer. Free-form subject-predicate-object
// cannot answer that: "lives at", "home address", "address" and "住址" become
// four unrelated predicates, nothing ever supersedes anything, and the table
// grows contradictions instead of history.
//
// Two families are namespaced rather than enumerated, because their tail is
// genuinely open: `preference:*` (preference:coffee, preference:news_length)
// and `relationship:*` (relationship:daughter). Everything else is a fixed
// name, and an extractor that proposes anything not on this list is refused
// rather than accommodated — a vocabulary that grows on the model's say-so is
// a free-form vocabulary with extra steps.

/** The fixed slots. Lower-case, snake_case, no punctuation but the underscore. */
export const FACT_SLOTS = [
  "allergy",
  "birthday",
  "diet",
  "employer",
  "home_address",
  "medication",
  "occupation",
  "pet",
  "phone",
  "school",
  "vehicle",
  "work_address",
] as const;

/** Slot families whose tail is open: `preference:coffee`, `relationship:son`. */
export const FACT_SLOT_FAMILIES = ["preference", "relationship"] as const;

export type FactSlot = string;

const FIXED = new Set<string>(FACT_SLOTS);
const FAMILIES = new Set<string>(FACT_SLOT_FAMILIES);
const TAIL = /^[a-z][a-z0-9_]{0,39}$/;

/**
 * Is this a slot we accept? Used at every write, including the extractor's,
 * so an invented slot never reaches the table.
 */
export function isKnownFactSlot(slot: string): boolean {
  if (FIXED.has(slot)) return true;
  const colon = slot.indexOf(":");
  if (colon < 1) return false;
  return (
    FAMILIES.has(slot.slice(0, colon)) && TAIL.test(slot.slice(colon + 1))
  );
}

/**
 * Slots whose values are health information. The legal set treats health,
 * family and money as never-automatic, so these are the ones the extractor may
 * propose but never auto-approve, and which the sharing flywheel must not see.
 */
export const SENSITIVE_FACT_SLOTS = new Set<string>([
  "allergy",
  "birthday",
  "medication",
  "diet",
]);

export function isSensitiveFactSlot(slot: string): boolean {
  return SENSITIVE_FACT_SLOTS.has(slot) || slot.startsWith("relationship:");
}

/** What the Owner reads on the Vaenyx Me screen. Bilingual, because every
 *  user-facing string in this product is. */
export const FACT_SLOT_LABELS: Record<string, { en: string; zh: string }> = {
  allergy: { en: "Allergy", zh: "过敏" },
  birthday: { en: "Birthday", zh: "生日" },
  diet: { en: "Diet", zh: "饮食" },
  employer: { en: "Employer", zh: "雇主" },
  home_address: { en: "Home address", zh: "家庭住址" },
  medication: { en: "Medication", zh: "用药" },
  occupation: { en: "Occupation", zh: "职业" },
  pet: { en: "Pet", zh: "宠物" },
  phone: { en: "Phone", zh: "电话" },
  school: { en: "School", zh: "学校" },
  vehicle: { en: "Vehicle", zh: "车辆" },
  work_address: { en: "Work address", zh: "工作地址" },
};

/** A readable name for any slot, including the open families. */
export function factSlotLabel(slot: string, zh: boolean): string {
  const fixed = FACT_SLOT_LABELS[slot];
  if (fixed) return zh ? fixed.zh : fixed.en;
  const colon = slot.indexOf(":");
  if (colon < 1) return slot;
  const family = slot.slice(0, colon);
  const tail = slot.slice(colon + 1).replace(/_/g, " ");
  if (family === "preference") return zh ? `偏好:${tail}` : `Preference: ${tail}`;
  if (family === "relationship") return zh ? `家人:${tail}` : `Relationship: ${tail}`;
  return slot;
}
