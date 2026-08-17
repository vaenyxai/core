// HOW HARD SHOULD IT THINK — and whether that question exists at all for the
// model in front of you (Oskar, 2026-08-16: 它有不同的 level…这个是不是只存在于
// 聊天模型里面).
//
// The honest answer is three states, not one:
//   "three"  — the model takes low / medium / high
//   "toggle" — the model can only think or not think
//   "none"   — the question does not apply, so nothing is shown
//
// A picker offering Fast / Balanced / Deep to a model with no such setting is
// a control that does nothing: the Owner turns it, nothing changes, and they
// stop trusting the ones that DO work. So the shape is decided by the exact
// (provider, model) actually chosen, and an unknown model gets the provider's
// own default rather than a guess.
//
// Only chat reads this. The other capabilities have no reasoning setting to
// offer — a transcriber, a speech voice and an image model do not think harder
// on request — which is why they show no level control at all.
export type ThinkingLevelShape = "three" | "toggle" | "none";

/** What levels this exact model accepts. Sources: each provider's own API
 *  reference as of 2026-08. Matched on the model id because within one
 *  provider it differs — Groq's gpt-oss takes three, its qwen takes on/off. */
export function thinkingLevelShape(
  providerId: string | null | undefined,
  model: string | null | undefined,
): ThinkingLevelShape {
  const id = (model ?? "").toLowerCase();

  // The two subscription channels: their CLI/SDK takes a reasoning effort.
  if (providerId === "codex" || providerId === "claude-sub") return "three";

  if (providerId === "openai") {
    // The o-series and gpt-5+ reason on request; gpt-4o does not.
    return /^(o\d|gpt-5)/.test(id) ? "three" : "none";
  }
  if (providerId === "anthropic") {
    // Extended thinking is a budget, which we drive as low/medium/high.
    return /sonnet-[45]|opus-[45]/.test(id) ? "three" : "none";
  }
  if (providerId === "gemini") {
    // Gemini 3.x carries thinking_level; 2.x has no such control.
    return /gemini-3/.test(id) ? "three" : "none";
  }
  if (providerId === "groq") {
    if (id.includes("gpt-oss")) return "three";
    // Qwen's reasoning is on or off, with nothing in between.
    if (id.includes("qwen")) return "toggle";
    return "none";
  }
  if (providerId === "grok") return /grok-\d+-mini/.test(id) ? "three" : "none";
  if (providerId === "mistral")
    return id.includes("magistral") ? "toggle" : "none";
  if (providerId === "zhipu") return /glm-4\.[67]/.test(id) ? "toggle" : "none";

  // A local server or anything unrecognised: no claim either way, so no
  // control. Showing one would be inventing a capability on the Owner's
  // behalf, which is the failure this whole file exists to avoid.
  return "none";
}

/** The choices to offer for a shape. "toggle" borrows the same two words the
 *  Owner already reads elsewhere rather than inventing "on/off" for thinking. */
export function thinkingLevelOptions(
  shape: ThinkingLevelShape,
  lang: string,
): { label: string; value: string }[] {
  const zh = lang === "zh";
  if (shape === "three") {
    return [
      { label: zh ? "快" : "Fast", value: "low" },
      { label: zh ? "均衡" : "Balanced", value: "medium" },
      { label: zh ? "深" : "Deep", value: "high" },
    ];
  }
  if (shape === "toggle") {
    return [
      { label: zh ? "快" : "Fast", value: "low" },
      { label: zh ? "深" : "Deep", value: "high" },
    ];
  }
  return [];
}

/** Keep a stored level legal for the model now in front of the Owner: a
 *  toggle model set to "medium" would otherwise show a blank picker. */
export function clampThinkingLevel(
  shape: ThinkingLevelShape,
  level: string | null | undefined,
): string {
  const current = level ?? "medium";
  if (shape === "three") return current;
  if (shape === "toggle") return current === "low" ? "low" : "high";
  return current;
}
