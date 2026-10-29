import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DinnerInputs } from "./dinner-inputs";
import { DinnerJournalContent } from "./dinner-journal";
import {
  emptyDinner,
  readDinnerInput,
  simpleDinnerInput,
} from "./dinner-planner-data";
vi.mock("./i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
const photo = {
  assetId: "9dc99ebe-d89c-47d0-ae56-1a1fcac384a5.jpg",
  name: "test.jpg",
  role: "ingredients" as const,
  annotations: [{ name: "Tomato", x: 25, y: 50 }],
};
describe("Simple Dinner", () => {
  it("renders one ingredient module with no confirmation checkbox or extra conditions", () => {
    const html = renderToStaticMarkup(
      <DinnerInputs
        conversationId="test"
        language="en"
        draft={{
          ...emptyDinner("en"),
          ingredients: "eggs",
          attachments: [photo],
        }}
        disabled={false}
        visionReady
        onReading={() => {}}
        onChange={() => {}}
        onPhoto={() => {}}
      />,
    );
    expect(html.match(/<fieldset/g)).toHaveLength(1);
    expect(html).not.toContain('type="checkbox"');
    expect(html).not.toContain('type="number"');
    expect(html).not.toContain("I checked");
    expect(html).not.toContain("Make It Fit Tonight");
    expect(html).toContain("Enlarge Photo");
  });
  it("does not send hidden constraints restored from an older dinner", () => {
    const old = {
      ...emptyDinner("en"),
      ingredients: "eggs",
      servings: 6,
      minutes: 90,
      avoid: "Peanuts",
      equipment: "Oven",
      preferences: "Dinner party",
      attachments: [photo],
    };
    const input = simpleDinnerInput(old);
    expect(input).not.toHaveProperty("servings");
    expect(input).not.toHaveProperty("minutes");
    expect(input.avoid).toBe("");
    expect(readDinnerInput(input)).not.toBeNull();
    expect(input.attachments[0]?.annotations).toEqual(photo.annotations);
  });
  it("round trips photo labels, rejects invalid coordinates, and shows old history constraints only when present", () => {
    const input = {
      ...emptyDinner("en"),
      ingredients: "Tomato",
      attachments: [photo],
    };
    expect(readDinnerInput(JSON.parse(JSON.stringify(input)))).toEqual(input);
    expect(
      readDinnerInput({
        ...input,
        attachments: [
          { ...photo, annotations: [{ name: "bad", x: -1, y: 50 }] },
        ],
      }),
    ).toBeNull();
    const html = renderToStaticMarkup(
      <DinnerJournalContent input={input} language="en" />,
    );
    expect(html).toContain("Enlarge Photo");
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("Servings");
  });
});
