// Labels may never cover each other (Oskar, 2026-07-29: "标签不能有重叠").
// Two marks on opposite sides of the photo used to be compared by height
// alone, so a left-hand label and a right-hand one could land on the same
// spot. The rule is checked here against the real marks that showed the bug.
import { describe, expect, it } from "vitest";

import { layoutLabels } from "./photo-marks";

// The room photo, exactly as the vision engine returned it.
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

// The fridge photo: ten long English names, the crowded end of the range.
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

// The same width estimate the layout uses, so the test measures what it places.
function boxOf(placed: ReturnType<typeof layoutLabels>[number]) {
  let width = 4.5;
  for (const character of placed.item.name) {
    const code = character.codePointAt(0) ?? 0;
    width += code >= 0x2e80 && code <= 0xffe6 ? 3.4 : 1.9;
  }
  return {
    top: placed.labelY,
    left: placed.toRight ? placed.labelX : placed.labelX - width,
    right: placed.toRight ? placed.labelX + width : placed.labelX,
  };
}

function overlappingPairs(items: typeof ROOM): string[] {
  const placed = layoutLabels(items);
  const clashes: string[] = [];
  for (let a = 0; a < placed.length; a += 1) {
    for (let b = a + 1; b < placed.length; b += 1) {
      const first = boxOf(placed[a]!);
      const second = boxOf(placed[b]!);
      if (
        Math.abs(first.top - second.top) < 9 &&
        first.right > second.left &&
        first.left < second.right
      ) {
        clashes.push(`${placed[a]!.item.name} / ${placed[b]!.item.name}`);
      }
    }
  }
  return clashes;
}

describe("layoutLabels", () => {
  it("never lets two labels cover each other", () => {
    expect(overlappingPairs(ROOM)).toEqual([]);
    expect(overlappingPairs(FRIDGE)).toEqual([]);
  });

  it("keeps every label on the photo", () => {
    for (const items of [ROOM, FRIDGE]) {
      for (const placed of layoutLabels(items)) {
        const box = boxOf(placed);
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(100);
        expect(placed.labelY).toBeGreaterThanOrEqual(0);
        expect(placed.labelY).toBeLessThanOrEqual(100);
      }
    }
  });

  it("returns the marks in the order they came in", () => {
    expect(layoutLabels(ROOM).map((placed) => placed.item.name)).toEqual(
      ROOM.map((item) => item.name),
    );
  });
});
