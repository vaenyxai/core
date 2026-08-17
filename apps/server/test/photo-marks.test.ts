// The photo marks tool: where the dot lands. The model is asked for 0-1000
// coordinates and answers in whatever scale it feels like — the live build
// took a correct 0-100 answer and shrank every dot into the top-left tenth of
// the photo (Oskar, 2026-07-29). The scale is now read off the answer, so the
// three scales a model actually uses are tested here rather than trusted.
import { describe, expect, it } from "vitest";

import { parseAnnotations } from "../src/modules/core/vision.js";

// The same two objects — a printer at 30%/39% and a mat at 30%/74% — written
// in each scale a model has been seen to answer in.
const THOUSANDTHS = JSON.stringify([
  { name: "printer", box_2d: [300, 200, 480, 400], point_2d: [390, 300] },
  { name: "mat", box_2d: [680, 150, 800, 450], point_2d: [740, 300] },
]);
const PERCENTS = JSON.stringify([
  { name: "printer", box_2d: [30, 20, 48, 40], point_2d: [39, 30] },
  { name: "mat", box_2d: [68, 15, 80, 45], point_2d: [74, 30] },
]);
const FRACTIONS = JSON.stringify([
  { name: "printer", box_2d: [0.3, 0.2, 0.48, 0.4], point_2d: [0.39, 0.3] },
  { name: "mat", box_2d: [0.68, 0.15, 0.8, 0.45], point_2d: [0.74, 0.3] },
]);

describe("parseAnnotations", () => {
  it("puts the dot in the same place whichever scale the model answered in", () => {
    for (const answer of [THOUSANDTHS, PERCENTS, FRACTIONS]) {
      expect(parseAnnotations(answer)).toEqual([
        { name: "printer", x: 30, y: 39 },
        { name: "mat", x: 30, y: 74 },
      ]);
    }
  });

  it("reads through a markdown fence", () => {
    expect(parseAnnotations(`\`\`\`json\n${PERCENTS}\n\`\`\``)).toHaveLength(2);
  });

  it("falls back to the box centre when the point is off the object", () => {
    const strayPoint = JSON.stringify([
      { name: "printer", box_2d: [300, 200, 500, 400], point_2d: [900, 900] },
    ]);
    expect(parseAnnotations(strayPoint)).toEqual([
      { name: "printer", x: 30, y: 40 },
    ]);
  });

  it("refuses an answer that carries no usable mark", () => {
    expect(() => parseAnnotations("not json")).toThrow(
      "VISION_ANNOTATE_UNPARSEABLE",
    );
    expect(() => parseAnnotations("[]")).toThrow("VISION_ANNOTATE_EMPTY");
    expect(() => parseAnnotations('[{"name":"printer"}]')).toThrow(
      "VISION_ANNOTATE_EMPTY",
    );
  });
});

// Real answers from a real key, 2026-08-16. Both shapes below came back from
// gemini-3.5-flash-lite on the same fridge photo within a minute of each
// other — which is the point: the reply is a hint, not a contract.
describe("parseAnnotations survives what the model actually sends", () => {
  it("reads Google's own `label` field, not only the `name` we asked for", () => {
    const answer = `[
      {"box_2d": [180, 194, 260, 467], "label": "酸奶", "point_2d": [215, 349]},
      {"box_2d": [253, 187, 390, 619], "label": "紫米粥", "point_2d": [337, 417]}
    ]`;
    const marks = parseAnnotations(answer);
    expect(marks.map((mark) => mark.name)).toEqual(["酸奶", "紫米粥"]);
  });

  it("salvages the good marks when the model garbles its own JSON", () => {
    // The measured failure: a closed object followed by a stray fragment.
    // Strict parsing loses all three; salvage keeps the two that are whole.
    const answer = `[
      {"box_2d": [180, 194, 260, 467], "label": "酸奶", "point_2d": [215, 349]},
      {"box_2d": [253, 187, 390, 619], "label": "面包", "point_2d": [337, 417]},
      {"box_2d": [611, 576, 703, 856], "label": "牛奶", "point": [655, 686]}, "point_2d": [139, 874]}
    ]`;
    const marks = parseAnnotations(answer);
    expect(marks.length).toBeGreaterThanOrEqual(2);
    expect(marks.map((mark) => mark.name)).toContain("酸奶");
    expect(marks.map((mark) => mark.name)).toContain("面包");
  });

  it("does not let a brace inside a name end an object early", () => {
    const answer = `[{"label": "a {weird} name", "box_2d": [10, 10, 20, 20], "point_2d": [15, 15]}] oops`;
    expect(parseAnnotations(answer)[0]?.name).toBe("a {weird} name");
  });
});
