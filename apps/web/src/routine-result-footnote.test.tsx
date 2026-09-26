// H-014 addendum (Oskar, 2026-09-27): each first-party result shows exactly
// its fixed legal footnote, in both languages, and nothing the model or a
// Community author wrote can reach the footnote.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { parseRoutineView, RoutineResultView } from "./routine-result-view";

const FOOTNOTES = {
  "legal.disclaimer.tax": {
    en: "Not tax advice. Check important figures with a registered tax agent or accountant.",
    zh: "这不是税务建议。重要数字请与注册税务代理或会计师核对。",
  },
  "legal.disclaimer.legal": {
    en: "Not legal advice. For contracts and legal matters, consult a qualified lawyer.",
    zh: "这不是法律意见。合同与法律事务请咨询合格律师。",
  },
  "legal.disclaimer.quantities": {
    en: "Quantities may be wrong. Before ordering or building, have a competent person check each one against the current drawings and site.",
    zh: "数量可能有误。下单或施工前,请由懂行的人对照最新图纸和现场逐项核对。",
  },
} as const;

// A result saved before the change still carries the model-written line.
const LEGACY_OUTPUT = {
  title: "Corner Grocer",
  disclaimer: "MODEL-WRITTEN: organisational record only.",
  humanCheckRequired: "MODEL-WRITTEN: check every quantity.",
};

function render(view: unknown, language: "en" | "zh"): string {
  return renderToStaticMarkup(
    <RoutineResultView language={language} output={LEGACY_OUTPUT} view={view} />,
  );
}

describe("fixed result footnotes", () => {
  it("shows exactly the fixed footnote for each result type, in both languages", () => {
    for (const [key, text] of Object.entries(FOOTNOTES)) {
      const view = {
        version: 1,
        footnote: key,
        fields: [{ key: "title", as: "title" }],
      };
      for (const language of ["en", "zh"] as const) {
        const html = render(view, language);
        expect(html).toContain(text[language]);
        expect(html.match(/routine-result-footnote/g)).toHaveLength(1);
        // An older result's model-written line never shows.
        expect(html).not.toContain("MODEL-WRITTEN");
      }
    }
  });

  it("accepts only an allowlisted legal key, never free text", () => {
    const smuggled = parseRoutineView({
      version: 1,
      footnote: "Trust us, this is professional advice.",
      fields: [{ key: "title", as: "title" }],
    });
    expect(smuggled).toEqual({
      version: 1,
      fields: [{ key: "title", as: "title" }],
    });
    expect(
      parseRoutineView({
        footnote: "legal.disclaimer.health.banner",
        fields: [{ key: "title", as: "title" }],
      })?.footnote,
    ).toBeUndefined();
    expect(
      render(
        { footnote: "Community text", fields: [{ key: "title", as: "title" }] },
        "en",
      ),
    ).not.toContain("routine-result-footnote");
  });
});
