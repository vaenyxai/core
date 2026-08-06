// WHAT EACH PROVIDER DOES WITH YOUR CONTENT — copied from their own terms,
// never our judgment (Oskar, 2026-08-06: "我们不替用户选,也永远不承诺服务商
// 不训练 —— 只把条件照抄出来放在旁边,用户自己决定"). This is the product's
// differentiation, not a disclaimer: the label sits beside the choice, and the
// choice stays the user's.
//
// Every entry is a FACT with a date and a source link, taken from the
// provider's published terms as of the date shown. Facts go stale; the
// checkedAt rides along so a reader can judge, and updating this file is a
// re-read of the source, never a paraphrase from memory.
//
// 🔴 The one that must be impossible to miss: the two easiest free options
// (Gemini's free tier, Mistral's free Experiment tier) BOTH train on user
// content by default. We do not exclude them — that is the user's call — but
// nobody expects "my uploaded quote went into a training set", so the trains
// flag is printed on the label, not buried in a link.
import type { Lang } from "./i18n";

export interface ProviderDataFacts {
  /** Does the provider train on your content? Verbatim-faithful summary. */
  trains: "no" | "free-tier-yes" | "opt-out" | "partly";
  en: string;
  zh: string;
  sourceUrl: string;
  checkedAt: string;
}

export const PROVIDER_DATA_FACTS: Record<string, ProviderDataFacts> = {
  gemini: {
    trains: "free-tier-yes",
    en: "Free tier: Google's pricing page marks it \"Used to improve our products: Yes\"; terms add that human reviewers may read submissions and say not to submit sensitive, confidential or personal information. The only way to switch this off is attaching paid billing. Paid tier is marked not used to improve products. (EU/UK/Swiss exemptions exist; Australia has none.)",
    zh: "免费档:Google 定价页逐行标注「用于改进我们的产品:是」;条款写明人工审阅者可能读取,并要求不要向免费服务提交敏感、机密或个人信息。关闭的唯一方式是绑定付费账单。付费档标注为「不用于改进产品」。(欧盟/英国/瑞士有豁免,澳洲没有。)",
    sourceUrl: "https://ai.google.dev/gemini-api/terms",
    checkedAt: "2026-08-06",
  },
  mistral: {
    trains: "free-tier-yes",
    en: "Paid API: not used for training; abuse monitoring retains 30 days. Free \"Experiment\" tier: inputs ARE used for training by default — it must be switched off by hand in their console.",
    zh: "付费 API:不用于训练;滥用监控留存 30 天。免费 Experiment 档:输入默认会被拿去训练 —— 需要在他们的控制台手动关闭。",
    sourceUrl: "https://mistral.ai/terms",
    checkedAt: "2026-08-06",
  },
  groq: {
    trains: "no",
    en: "Service agreement states inputs and outputs are not used for training or fine-tuning without permission; a zero-retention option exists.",
    zh: "服务协议明文:未经许可不得将输入输出用于训练或微调;另有零留存开关。",
    sourceUrl: "https://groq.com/terms-of-use",
    checkedAt: "2026-08-06",
  },
  workersai: {
    trains: "no",
    en: "Cloudflare states plainly it does not train any model on your content and does not make it available to other customers.",
    zh: "Cloudflare 明文:不用你的内容训练任何模型,也不提供给其他客户。",
    sourceUrl: "https://www.cloudflare.com/service-specific-terms-developer-platform/",
    checkedAt: "2026-08-06",
  },
  anthropic: {
    trains: "no",
    en: "Commercial terms: not used for training; default retention of logs is 7 days.",
    zh: "商用协议:不用于训练;默认日志留存 7 天。",
    sourceUrl: "https://www.anthropic.com/legal/commercial-terms",
    checkedAt: "2026-08-06",
  },
  openrouter: {
    trains: "partly",
    en: "Of its free models, the 7 NVIDIA-hosted ones train on your data; account settings carry a separate switch for allowing training providers.",
    zh: "免费模型里由 NVIDIA 托管的 7 个会拿你的数据训练;账号设置里有单独的「允许会训练的 provider」开关。",
    sourceUrl: "https://openrouter.ai/terms",
    checkedAt: "2026-08-06",
  },
};

// The short badge for pickers and rows: loud only where the surprise is.
export function dataFactsBadge(id: string, lang: Lang): string | null {
  const facts = PROVIDER_DATA_FACTS[id];
  if (!facts) return null;
  if (facts.trains === "free-tier-yes") {
    return lang === "zh" ? "免费档会训练" : "free tier trains on your data";
  }
  if (facts.trains === "partly") {
    return lang === "zh" ? "部分会训练" : "some hosts train on your data";
  }
  return null;
}
