// Nothing on a marked photo should touch anything else (Oskar, 2026-07-29):
// no dot, no leader line and no name may land on another mark's dot, line or
// name. markCollisions measures the finished arrangement and names every pair
// that touches AND why, so the rule is checked on the geometry, not the intent.
//
// Two of those five ways of touching are absolute and tested as such: a name
// may never cover another name, and a name may never cover another dot — those
// destroy the reading. On a photo carrying ten long names at once there is
// simply no arrangement where nothing crosses; the layout then keeps the two
// absolutes and buys them with the mildest kind of contact it can.
import { describe, expect, it } from "vitest";

import { layoutLabels, markCollisions } from "./photo-marks";

// The room photo, exactly as the vision engine returned it — the one where a
// name printed over a neighbour's dot and line.
const ROOM = [
  { name: "打印机", x: 30, y: 39 },
  { name: "抽屉柜", x: 22, y: 58 },
  { name: "纸箱", x: 56, y: 49 },
  { name: "切割垫", x: 30, y: 74 },
  { name: "移动空调", x: 3, y: 68 },
  { name: "泡沫轴", x: 18, y: 68 },
  { name: "收纳袋", x: 72, y: 45 },
  { name: "窗帘", x: 31, y: 20 },
];

// The fridge photo: ten long English names, two of them on dots sitting right
// at the bottom edge. The crowded end of what the tool is asked to draw.
const FRIDGE = [
  { name: "Wire fruit basket", x: 30, y: 47 },
  { name: "Rice cakes packet", x: 26, y: 73 },
  { name: "Nasal aspirator", x: 57, y: 100 },
  { name: "TV remote", x: 50, y: 38 },
  { name: "Bread in plastic bag", x: 64, y: 90 },
  { name: "Patterned pouch", x: 46, y: 80 },
  { name: "Waffle snacks", x: 21, y: 89 },
  { name: "Paper towel roll", x: 22, y: 29 },
  { name: "Blue cloth", x: 46, y: 51 },
  { name: "White spray bottle", x: 47, y: 100 },
];

// A portrait phone photo in the chat, and a landscape one — the two shapes the
// same percentages have to work in.
const PORTRAIT = { width: 340, height: 453 };
const LANDSCAPE = { width: 340, height: 255 };

const only = (touching: string[], ...kinds: string[]): string[] =>
  touching.filter((entry) => kinds.some((kind) => entry.endsWith(kind)));

describe("photo marks layout", () => {
  it("leaves nothing touching on a normal photo", () => {
    expect(markCollisions(ROOM, PORTRAIT)).toEqual([]);
  });

  it("never lets a name cover another name, however full the photo", () => {
    for (const marks of [ROOM, FRIDGE]) {
      for (const frame of [PORTRAIT, LANDSCAPE]) {
        expect(only(markCollisions(marks, frame), "name on name")).toEqual([]);
      }
    }
  });

  it("keeps names off other dots wherever that is possible at all", () => {
    // Ten long names on one phone-sized photo is past what any arrangement can
    // keep entirely clear; landscape, which is 200px shorter, is past it twice
    // over. These three are inside it.
    expect(only(markCollisions(FRIDGE, PORTRAIT), "name on dot")).toEqual([]);
    expect(only(markCollisions(ROOM, LANDSCAPE), "name on dot")).toEqual([]);
    expect(only(markCollisions(ROOM, PORTRAIT), "name on dot")).toEqual([]);
  });

  it("keeps every label on the photo", () => {
    for (const marks of [ROOM, FRIDGE]) {
      for (const placed of layoutLabels(marks, PORTRAIT)) {
        expect(placed.labelX).toBeGreaterThanOrEqual(0);
        expect(placed.labelX).toBeLessThanOrEqual(100);
        expect(placed.labelY).toBeGreaterThanOrEqual(0);
        expect(placed.labelY).toBeLessThanOrEqual(100);
      }
    }
  });

  it("returns the marks in the order they came in", () => {
    expect(
      layoutLabels(ROOM, PORTRAIT).map((placed) => placed.item.name),
    ).toEqual(ROOM.map((item) => item.name));
  });

  it("survives a single mark and an empty photo", () => {
    expect(layoutLabels([], PORTRAIT)).toEqual([]);
    expect(
      layoutLabels([{ name: "打印机", x: 50, y: 50 }], PORTRAIT),
    ).toHaveLength(1);
  });
});
