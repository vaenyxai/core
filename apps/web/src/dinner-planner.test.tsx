import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  dinnerInputKey,
  emptyDinner,
  readDinnerInput,
  readDinnerOutput,
  recognisedIngredients,
} from "./dinner-planner-data";
import { RoutineResultView } from "./routine-result-view";

const example = {
  input: {
    ingredients: "2 eggs, 200 g cooked rice, 1 carrot",
    servings: 2,
    minutes: 20,
    avoid: "Peanuts",
    equipment: "Stovetop and frying pan",
    preferences: "A simple dinner",
    language: "en" as const,
    attachments: [],
  },
  output: {
    status: "ready",
    title: "Carrot & Egg Fried Rice",
    summary:
      "A quick dinner using your eggs, cooked rice and carrot. Check the pantry items before starting.",
    servings: 2,
    minutes: 20,
    ingredients: [
      { name: "Eggs", quantity: "2", source: "available" },
      { name: "Cooked rice", quantity: "200 g", source: "available" },
      { name: "Carrot", quantity: "1, diced", source: "available" },
      { name: "Cooking oil", quantity: "1 tbsp", source: "check" },
      { name: "Salt", quantity: "To taste", source: "check" },
    ],
    steps: [
      "Wash and dice the carrot. Beat the eggs.",
      "Heat the oil in a frying pan. Cook the carrot until tender, then add the eggs and stir until set.",
      "Add the cooked rice and salt. Stir-fry until everything is thoroughly hot, then divide between two bowls.",
    ],
    notes: [
      "Check the oil and any seasonings against the peanut restriction.",
      "Use properly stored cooked rice.",
    ],
  },
  note: "Synthetic example. Quantity estimates are suggestions, not observations from a photo.",
};
describe("Dinner Planner data and result", () => {
  it("requires real ingredients and bounded whole-number values", () => {
    expect(readDinnerInput(emptyDinner("en"))).toBeNull();
    expect(readDinnerInput(example.input)).not.toBeNull();
    expect(readDinnerInput({ ...example.input, servings: 2.5 })).toBeNull();
    expect(readDinnerInput({ ...example.input, minutes: 999 })).toBeNull();
    expect(
      readDinnerInput({
        ...example.input,
        attachments: [{ assetId: "../secret", name: "x", role: "ingredients" }],
      }),
    ).toBeNull();
  });
  it("accepts uploaded photo identifiers and restores reviewed inputs without accepting paths", () => {
    for (const extension of ["jpg", "png", "webp"]) {
      const input = {
        ...example.input,
        attachments: [
          {
            assetId: "9dc99ebe-d89c-47d0-ae56-1a1fcac384a5." + extension,
            name: "ingredients." + extension,
            role: "ingredients",
          },
        ],
      };
      expect(readDinnerInput(input)).toEqual(input);
      expect(readDinnerInput(JSON.parse(JSON.stringify(input)))).toEqual(input);
    }
    for (const assetId of [
      "../secret.jpg",
      "photo.jpg",
      "9dc99ebe-d89c-47d0-ae56-1a1fcac384a5.svg",
      "9dc99ebe-d89c-47d0-ae56-1a1fcac384a5.jpg?other=1",
    ]) {
      expect(
        readDinnerInput({
          ...example.input,
          attachments: [{ assetId, name: "x", role: "ingredients" }],
        }),
      ).toBeNull();
    }
  });
  it("detects any relevant input change without depending on object key order", () => {
    expect(dinnerInputKey(example.input)).not.toBe(
      dinnerInputKey({ ...example.input, avoid: "Eggs" }),
    );
    expect(dinnerInputKey(example.input)).toBe(
      dinnerInputKey({ ...example.input }),
    );
    expect(recognisedIngredients({ ingredients: ["tomato", "rice"] })).toBe(
      "tomato\nrice",
    );
    expect(recognisedIngredients({ ingredients: { unexpected: true } })).toBe(
      "",
    );
  });
  it("rejects incomplete or wrongly typed answers and does not show them as recipes", () => {
    expect(readDinnerOutput({ ...example.output, steps: [] })).toBeNull();
    expect(readDinnerOutput({ ...example.output, servings: "2" })).toBeNull();
    const html = renderToStaticMarkup(
      <RoutineResultView
        output={example.output}
        outputValid={false}
        view={{ layout: "dinner-planner-v1", version: 1 }}
      />,
    );
    expect(html).toContain("incomplete");
    expect(html).not.toContain("Let’s Cook");
  });
  it("renders sources, quantities, shopping checks and ordered steps in both languages, escaping model text", () => {
    const output = { ...example.output, title: "<script>alert(1)</script>" };
    const view = { layout: "dinner-planner-v1", version: 1 };
    const en = renderToStaticMarkup(
      <RoutineResultView output={output} view={view} />,
    );
    const zh = renderToStaticMarkup(
      <RoutineResultView output={output} view={view} language="zh" />,
    );
    expect(en).toContain("Shopping &amp; Pantry Check");
    expect(en).toContain("Available");
    expect(en).toContain('type="checkbox"');
    expect(en).toContain("&lt;script&gt;");
    expect(en).not.toContain("<script>");
    expect(zh).toContain("开始做饭");
  });
});
