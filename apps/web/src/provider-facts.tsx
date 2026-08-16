// WHAT IT COSTS, and WHO CAN SIGN UP — the two things to know before picking
// a backend, kept beside the choice like the data conditions already are
// (see data-facts.tsx, which answers a different question: what they do with
// your content).
//
// 🔴 Cost is marked PER CAPABILITY, not per provider, because the trap is
// real: Gemini's free tier covers text, pictures-in, hearing, PDFs and
// speaking — and gives NOTHING for making pictures. A household on a free
// Gemini key that picks it for Drawing walks straight into a bill (Oskar,
// 2026-08-07). A single "free" badge on the provider would have said the
// opposite of the truth for that one row.
import type { Lang } from "./i18n";

export interface ProviderCostFacts {
  /** The headline, for the badge beside the name. */
  tier: "free" | "paid" | "mixed" | "subscription" | "local";
  /** Capability ids this provider charges for even on its free tier. */
  paidCapabilities?: string[];
  /** Anything that stops a household signing up at all. */
  eligibility?: { en: string; zh: string };
}

export const PROVIDER_COST_FACTS: Record<string, ProviderCostFacts> = {
  codex: { tier: "subscription" },
  "claude-sub": { tier: "subscription" },
  openai: { tier: "paid" },
  anthropic: { tier: "paid" },
  grok: { tier: "paid" },
  // The one that matters: free for everything except making pictures.
  gemini: { tier: "mixed", paidCapabilities: ["drawing"] },
  groq: { tier: "free" },
  cerebras: { tier: "free" },
  openrouter: { tier: "mixed" },
  workersai: { tier: "free" },
  mistral: { tier: "mixed" },
  zhipu: {
    tier: "free",
    // Checked 2026-08-07: open.bigmodel.cn is the mainland platform, and
    // mainland platforms require a Chinese ID card, a face scan and a Chinese
    // mobile number. Most households cannot open the account at all, so the
    // row says so rather than letting them find out at the sign-up page.
    eligibility: {
      en: "Sign-up needs Chinese ID verification (ID card, face scan, mainland phone number).",
      zh: "注册需要中国实名认证(身份证、人脸、中国手机号)。",
    },
  },
  local: { tier: "local" },
};

export function costBadge(id: string, lang: Lang): string | null {
  const facts = PROVIDER_COST_FACTS[id];
  if (!facts) return null;
  const zh = lang === "zh";
  switch (facts.tier) {
    case "free":
      return zh ? "免费额度" : "Free tier";
    case "paid":
      return zh ? "付费" : "Paid";
    case "mixed":
      return zh ? "部分免费" : "Partly free";
    case "subscription":
      return zh ? "用你的订阅" : "Your subscription";
    case "local":
      return zh ? "本机,免费" : "On this machine, free";
    default:
      return null;
  }
}

/** "This provider charges for THIS job even though it is otherwise free." */
export function capabilityCostsMoney(id: string, capability: string): boolean {
  return Boolean(
    PROVIDER_COST_FACTS[id]?.paidCapabilities?.includes(capability),
  );
}

export function capabilityCostNote(
  id: string,
  capability: string,
  lang: Lang,
): string | null {
  if (!capabilityCostsMoney(id, capability)) return null;
  return lang === "zh" ? "这一项要付费" : "paid for this job";
}

/** Marking a photo is not the same job as describing one (measured on a real
 *  fridge photo, 2026-08-16): every vision backend can LIST what it sees, but
 *  putting each dot on the right object needs a model trained on coordinates.
 *  Gemini is, and its own box format is what the annotate prompt asks for;
 *  Pixtral reads the shelves well and then scatters the dots. The picker says
 *  so, because the Owner meets that difference as "the marks got worse" with
 *  nothing on screen explaining why. */
const ACCURATE_MARK_PROVIDERS = ["gemini", "openai", "zhipu", "claude-sub"];

export function visionMarkNote(id: string, lang: Lang): string | null {
  if (ACCURATE_MARK_PROVIDERS.includes(id)) return null;
  return lang === "zh" ? "标注位置偏" : "marks land roughly";
}
