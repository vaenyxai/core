import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  formatRoutineValue,
  parseRoutineView,
  RoutineResultView,
} from "./routine-result-view";

describe("RoutineResultView", () => {
  it("parses only bounded declarative fields and rejects future versions", () => {
    expect(
      parseRoutineView({
        version: 1,
        fields: [
          { key: "title", as: "title" },
          { key: "evil", as: "html", html: "<script>bad()</script>" },
        ],
      }),
    ).toEqual({ version: 1, fields: [{ key: "title", as: "title" }] });
    expect(parseRoutineView({ version: 2, fields: [] })).toBeNull();
  });

  it("formats currency, dates, units and certainty for the selected locale", () => {
    expect(
      formatRoutineValue(
        47.5,
        { format: "currency", currencyKey: "currency" },
        "en",
        { currency: "AUD" },
      ),
    ).toContain("47.50");
    expect(
      formatRoutineValue(12, { format: "unit", unitKey: "unit" }, "en", {
        unit: "m²",
      }),
    ).toBe("12 m²");
    expect(
      formatRoutineValue("inferred", { format: "certainty" }, "zh", {}),
    ).toBe("推断");
    expect(
      formatRoutineValue("2026-09-03", { format: "date" }, "en", {}),
    ).toContain("2026");
    expect(formatRoutineValue("2026-02-30", { format: "date" }, "en", {})).toBe(
      "2026-02-30",
    );
  });

  it("renders source-linked bilingual tables as text and never executes author HTML", () => {
    const html = renderToStaticMarkup(
      <RoutineResultView
        language="zh"
        output={{
          facts: [
            {
              value: '<img src=x onerror="bad()">',
              evidence: "Receipt photo: line 2",
              certainty: "uncertain",
            },
          ],
        }}
        view={{
          version: 1,
          fields: [
            {
              key: "facts",
              as: "table",
              label: "Facts",
              labelZh: "详情",
              columns: [
                { key: "value", label: "Value", labelZh: "内容" },
                { key: "evidence", label: "Source", labelZh: "依据" },
                {
                  key: "certainty",
                  label: "Certainty",
                  labelZh: "确定性",
                  format: "certainty",
                },
              ],
            },
          ],
        }}
      />,
    );
    expect(html).toContain("详情");
    expect(html).toContain("不确定");
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img");
  });

  it("shows an explicit unknown value instead of inventing missing data", () => {
    const html = renderToStaticMarkup(
      <RoutineResultView
        language="en"
        output={{ currency: "AUD" }}
        view={{
          version: 1,
          fields: [
            {
              key: "total",
              as: "amount",
              label: "Total",
              format: "currency",
              currencyKey: "currency",
              showWhenMissing: true,
            },
          ],
        }}
      />,
    );
    expect(html).toContain("Unknown");
    expect(html).not.toContain("$0");
  });

  it("shows a truthful empty state for an entirely empty declared result", () => {
    const html = renderToStaticMarkup(
      <RoutineResultView
        output={{ warnings: [] }}
        view={{ fields: [{ key: "warnings", as: "bullets" }] }}
      />,
    );
    expect(html).toContain("No result.");
    expect(html).not.toContain("<ul");
  });
});
