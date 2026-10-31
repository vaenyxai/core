import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HouseholdSources } from "./household-sources";
import { HouseholdResult } from "./household-result";
import {
  emptyHousehold,
  fieldSource,
  householdInputKey,
  householdKind,
  readHouseholdInput,
  readHouseholdOutput,
} from "./household-data";
import { suggestedHousehold } from "./suggested-routines";
import type { LibraryRoutineSummary } from "@vaenyx/contracts";
const id = "12345678-1234-1234-1234-123456789012.pdf";
const input = {
  ...emptyHousehold("en"),
  attachments: [
    {
      assetId: id,
      kind: "document" as const,
      name: "notice.pdf",
      role: "notice",
      text: "Picnic on 12 November 2026.",
      annotations: [],
    },
  ],
};
const output = {
  title: "Picnic",
  summary: "A notice",
  fields: [
    {
      label: "Date",
      value: "12 November 2026",
      sourceId: id,
      quote: "12 November 2026",
      uncertain: false,
    },
  ],
  checklist: [],
  checks: [],
};
describe("household modules", () => {
  it("restores source references and treats edits, role changes and removal as stale", () => {
    expect(readHouseholdInput(JSON.parse(JSON.stringify(input)))).toEqual(
      input,
    );
    for (const changed of [
      { ...input, attachments: [] },
      {
        ...input,
        attachments: input.attachments.map((s) => ({ ...s, role: "receipt" })),
      },
      {
        ...input,
        attachments: input.attachments.map((s) => ({
          ...s,
          text: "A different date",
        })),
      },
      { ...input, corrections: { eventDate: "2026-11-13" } },
    ])
      expect(householdInputKey(changed)).not.toBe(householdInputKey(input));
    expect(
      readHouseholdInput({
        ...input,
        attachments: [{ ...input.attachments[0], assetId: "../secret.pdf" }],
      }),
    ).toBeNull();
  });
  it("only matches an exact quote in the named supplied source", () => {
    expect(fieldSource(output.fields[0]!, input)?.name).toBe("notice.pdf");
    expect(
      fieldSource({ ...output.fields[0]!, sourceId: "other" }, input),
    ).toBeNull();
    expect(
      fieldSource({ ...output.fields[0]!, quote: "13 November" }, input),
    ).toBeNull();
    const html = renderToStaticMarkup(
      <HouseholdResult
        kind="notice"
        output={{
          ...output,
          fields: [{ ...output.fields[0]!, quote: "13 November" }],
        }}
        input={input}
        language="en"
      />,
    );
    expect(html).toContain("Check This");
    expect(html).toContain("No matching source quote");
  });
  it("does not render an incomplete or missing result as a completed record", () => {
    expect(readHouseholdOutput({ ...output, fields: [] })).toBeNull();
    expect(
      renderToStaticMarkup(
        <HouseholdResult kind="warranty" output={null} language="en" />,
      ),
    ).toContain("Incomplete result");
  });
  it("separates rear camera capture from multi-file selection", () => {
    const html = renderToStaticMarkup(
      <HouseholdSources
        kind="warranty"
        language="en"
        sources={[]}
        disabled={false}
        onChange={() => {}}
        onRemove={() => {}}
        onBusy={() => {}}
      />,
    );
    const inputs = html.match(/<input[^>]+>/g)!;
    expect(inputs[0]).toContain('capture="environment"');
    expect(inputs[0]).not.toContain("multiple");
    expect(inputs[1]).not.toContain("capture");
    expect(inputs[1]).toContain("multiple");
    expect(inputs[1]).toContain(".pdf");
    expect(html).toContain("Receipt");
    expect(html).toContain("Product Label");
    expect(html).toContain("Manual");
  });
  it("only suggests installed supported modules that remain on the shelf", () => {
    const routine = {
      id: "vaenyx-family-notices",
      view: { version: 1, layout: "family-notices-v1" },
    } as LibraryRoutineSummary;
    expect(suggestedHousehold([routine], [])).toEqual([routine]);
    expect(suggestedHousehold([routine], [routine.id])).toEqual([]);
    expect(
      householdKind({ version: 2, layout: "family-notices-v1" }),
    ).toBeNull();
  });
});
