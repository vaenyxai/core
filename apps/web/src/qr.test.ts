import { describe, expect, it } from "vitest";

import {
  encodeQr,
  formatInfoBits,
  qrPenalty,
  qrSvgPath,
  versionInfoBits,
} from "./qr.js";

// Golden vectors pinned from an independent MIT implementation
// (`qrcode-generator` 1.5.0, byte mode, level M), generated once in a
// scratchpad — the library itself does not ship with Vaenyx. Each fixture
// records the mask that implementation chose; the comparison forces the same
// mask so every other stage (data encoding, Reed-Solomon, interleaving,
// placement, format/version bits) must match bit for bit. Mask SELECTION is
// covered separately: any mask with correct format bits scans, so the two
// implementations are allowed to prefer different ones.
const GOLDEN: { text: string; version: number; mask: number; rows: string[] }[] =
  [
    {
      text: "VAENYX",
      version: 1,
      mask: 3,
      rows: [
        "#######.###...#######",
        "#.....#.#.#.#.#.....#",
        "#.###.#...#.#.#.###.#",
        "#.###.#.#####.#.###.#",
        "#.###.#..##...#.###.#",
        "#.....#.......#.....#",
        "#######.#.#.#.#######",
        "........###..........",
        "#.##.###.##...#..#.##",
        "#...#....##.#..#..#..",
        "####.##..##.#####..##",
        "##.###.##.#.##...#.##",
        "####..#.#.##.#..#.##.",
        "........##...#.....##",
        "#######.##...##.##...",
        "#.....#.##.#####.##.#",
        "#.###.#..#.#..#.##.##",
        "#.###.#.#....#.#####.",
        "#.###.#.####.#.......",
        "#.....#..####.##....#",
        "#######.#..##....#...",
      ],
    },
    {
      // A made-up tailnet address in the shape phone access produces — never
      // a real machine's name; a real one would ship in the public repo.
      text: "https://example-pc.taile1234.ts.net",
      version: 3,
      mask: 5,
      rows: [
        "#######..#.#####..#...#######",
        "#.....#.###....#....#.#.....#",
        "#.###.#.####..#.#.#...#.###.#",
        "#.###.#.#.#...####.##.#.###.#",
        "#.###.#...#..###..###.#.###.#",
        "#.....#..######.....#.#.....#",
        "#######.#.#.#.#.#.#.#.#######",
        "........#....#..#............",
        "#.....#.###...#####..##..###.",
        "..####.#...#..##...#.#.##.##.",
        "#....##.#..##..##.#..#.##....",
        ".#..#..####...#.#...#..#.#...",
        ".#.##.####.######.##..##....#",
        ".##..#...###.####..##.###..##",
        "...##.##.#..####.##...#####..",
        "..##.#.##.##.###..##..#.#.#.#",
        ".######...##..#..###.....##..",
        "##...#..##.....##..#..###.###",
        "##....###.#.#####.##..####..#",
        "#....#.##.#.#.###..#.#.......",
        "#...###.##.##....##.#####.###",
        "........##...#.##...#...##...",
        "#######.....#####..##.#.###..",
        "#.....#....###.#..###...#..##",
        "#.###.#...#..#.#..########.##",
        "#.###.#...#.#..####....#.##.#",
        "#.###.#...##.#.#.#...#######.",
        "#.....#..###......##.#.####.#",
        "#######.#..#######.#...##.#..",
      ],
    },
    {
      // Long enough for version 8, which exercises the 18-bit version
      // information blocks and the two-length block split (2x38 + 2x39).
      text: "https://some-machine-name.tail0123456789abcdef.ts.net/?source=phone-onboarding&extra=padding-to-reach-version-seven-or-more-0123456789",
      version: 8,
      mask: 3,
      rows: [
        "#######.##.##..##....#.##.....##.#.###..#.#######",
        "#.....#.#.....#.#...####.##.....###..####.#.....#",
        "#.###.#..#....#.###..#.#.#...####.#.##.##.#.###.#",
        "#.###.#.##.###.##..#.##.##.....#..####.#..#.###.#",
        "#.###.#.....#..##.#.#.#####.#....#.###....#.###.#",
        "#.....#..#####..##...##...###.##...####...#.....#",
        "#######.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#.#######",
        "........#..##.####..###...#.##...########........",
        "#.##.###...#.#..##.##.#########..#...#.#..#..#.##",
        "..#.#..####....#.#.#..####..###.##..##.#.###..##.",
        "...#..##..#..#..###..###...####.###..#.#.###..##.",
        ".##.....###.#.....#..##.#.#..#.####.##.#..#.###..",
        "#.#.######.#..##.##..####.#..###..###...#..#.##..",
        ".#..##..#..##..##.##.##..##....##....###.#..###.#",
        "##.##.######...###.##...#####.#.#....####.######.",
        "#.#....#.##.##..#####.#..#.#.#.....#....###.#...#",
        "...#.#######.......#.....#######..##..####.##.###",
        "###..#.#.#..##.####...###....####.#..#.###..###.#",
        "####..##.######.#.##.###.##.#.###.#######....#..#",
        ".#.#....#..#......###...##.###.#..####.##..#.#.##",
        "#.##..#...#.##.#######...#####....##.......#.#.##",
        "##.###.##...###.##.#.#..###..###...###...######..",
        ".##.########.##...#..###########..###..#######...",
        "....#...#.#..#.#...#..#...#..#..##.###.##...####.",
        ".#.##.#.##.#####..#####.#.#..###..#######.#.###..",
        "...##...##.#.####.#.###...#..#.###....#.#...##..#",
        "....#####.###..#.##..######..##..#.#.##.######...",
        ".#..#..######.###.##....#...#.#.#.#......#...#.#.",
        "#.#...#..#.##.#....#####...#....##...##.#.#...#..",
        "#..##.....###.##.#.#..###....#...###.....##..#..#",
        ".#....##.###...###.#.....#..#..#..##..######..###",
        ".###...##.##..#.##..#...#..#.#..##..#.##..##.#.##",
        "##..######..##...#.##.#.#...##.#.#.......##.##.#.",
        "#.##.#.#...........#.#####....##.#.#...#.#.#.....",
        ".##..###..#.#.###.##....#.#......###.#...#.##....",
        "..#.#...#.#.#.#.#..#.....##..####...#..##.#..###.",
        "#########...###.#.###......#.##....###.#.##.#.###",
        "#....#....#..##...###.#........#.#.#..###..##..##",
        ".#...##.######...##..###......#.#..#.##..#.#####.",
        ".###...##.#######.#...##.#####.###...##.#.......#",
        "###...#.#..#....#.##.#######...####.....#####.#..",
        "........#..###....##.##...#.##..###.#..##...#####",
        "#######.###.#..###....#.#.##.#.#####..#.#.#.###.#",
        "#.....#.###.......###.#...#.##...#.######...##.##",
        "#.###.#......#.#####.######.###...##.#.######..#.",
        "#.###.#.###.#.####.#####.....##.#..###.##.####..#",
        "#.###.#.#.#.##..#....###.###.###..#.#..#.####.###",
        "#.....#..##.#######.###..#..###.#..###...#.#..#..",
        "#######.#...#..######..#.#..#....#..#.##.....####",
      ],
    },
  ];

function toRows(modules: boolean[][]): string[] {
  return modules.map((line) =>
    line.map((dark) => (dark ? "#" : ".")).join(""),
  );
}

// Read the 15 format bits back out of a finished matrix, from either copy.
function readFormatBits(
  modules: boolean[][],
  copy: "main" | "split",
): number {
  const size = modules.length;
  let bits = 0;
  for (let i = 0; i < 15; i += 1) {
    let dark: boolean;
    if (copy === "main") {
      if (i < 6) dark = modules[i]![8]!;
      else if (i < 8) dark = modules[i + 1]![8]!;
      else if (i === 8) dark = modules[8]![7]!;
      else dark = modules[8]![14 - i]!;
    } else {
      dark = i < 8 ? modules[8]![size - 1 - i]! : modules[size - 15 + i]![8]!;
    }
    bits |= (dark ? 1 : 0) << i;
  }
  return bits;
}

describe("qr golden vectors", () => {
  for (const golden of GOLDEN) {
    it(`matches the independent implementation for ${JSON.stringify(golden.text.slice(0, 30))} (v${golden.version})`, () => {
      const qr = encodeQr(golden.text, { mask: golden.mask });
      expect(qr.version).toBe(golden.version);
      expect(qr.size).toBe(golden.version * 4 + 17);
      expect(toRows(qr.modules)).toEqual(golden.rows);
    });
  }
});

describe("qr structure", () => {
  const qr = encodeQr("https://example-pc.taile1234.ts.net");
  const { size, modules } = qr;
  const at = (r: number, c: number) => modules[r]?.[c] === true;

  it("places the three finder patterns with light separators", () => {
    const finderRow = (r: number) =>
      [0, 6].includes(r)
        ? "#######"
        : [1, 5].includes(r)
          ? "#.....#"
          : "#.###.#";
    for (const [top, left] of [
      [0, 0],
      [0, size - 7],
      [size - 7, 0],
    ] as const) {
      for (let r = 0; r < 7; r += 1) {
        const row = Array.from({ length: 7 }, (_v, c) =>
          at(top + r, left + c) ? "#" : ".",
        ).join("");
        expect(row).toBe(finderRow(r));
      }
    }
    // Separator samples: the ring one module outside each finder is light.
    expect(at(7, 0)).toBe(false);
    expect(at(0, 7)).toBe(false);
    expect(at(7, size - 1)).toBe(false);
    expect(at(size - 8, 0)).toBe(false);
  });

  it("places alternating timing patterns", () => {
    for (let i = 8; i < size - 8; i += 1) {
      expect(at(6, i)).toBe(i % 2 === 0);
      expect(at(i, 6)).toBe(i % 2 === 0);
    }
  });

  it("places the always-dark module", () => {
    expect(at(size - 8, 8)).toBe(true);
  });

  it("writes matching, BCH-valid format bits in both copies", () => {
    expect(readFormatBits(modules, "main")).toBe(formatInfoBits(qr.mask));
    expect(readFormatBits(modules, "split")).toBe(formatInfoBits(qr.mask));
    // Unmasked, the top two bits are 00 — error level M.
    const unmasked = formatInfoBits(qr.mask) ^ 0x5412;
    expect((unmasked >> 13) & 0b11).toBe(0b00);
    expect((unmasked >> 10) & 0b111).toBe(qr.mask);
  });

  it("computes the published version-information words", () => {
    // ISO/IEC 18004 annex D table D.1.
    expect(versionInfoBits(7)).toBe(0x07c94);
    expect(versionInfoBits(8)).toBe(0x085bc);
    expect(versionInfoBits(9)).toBe(0x09a99);
    expect(versionInfoBits(10)).toBe(0x0a4d3);
  });

  it("places version information blocks from version 7 up", () => {
    const large = encodeQr("x".repeat(130)); // needs version 8 at level M
    expect(large.version).toBe(8);
    const bits = versionInfoBits(8);
    for (let i = 0; i < 18; i += 1) {
      const dark = ((bits >> i) & 1) === 1;
      expect(large.modules[Math.floor(i / 3)]![large.size - 11 + (i % 3)]).toBe(
        dark,
      );
      expect(large.modules[large.size - 11 + (i % 3)]![Math.floor(i / 3)]).toBe(
        dark,
      );
    }
  });
});

describe("qr mask selection", () => {
  it("chooses the lowest-penalty mask", () => {
    const text = "https://example-pc.taile1234.ts.net";
    const auto = encodeQr(text);
    const chosen = qrPenalty(auto.modules);
    for (let mask = 0; mask < 8; mask += 1) {
      expect(chosen).toBeLessThanOrEqual(
        qrPenalty(encodeQr(text, { mask }).modules),
      );
    }
  });
});

describe("qr capacity", () => {
  it("uses version 1 for short text and grows with the payload", () => {
    expect(encodeQr("VAENYX").version).toBe(1);
    expect(encodeQr("x".repeat(15)).version).toBe(2);
    expect(encodeQr("x".repeat(213)).version).toBe(10);
  });

  it("counts UTF-8 bytes, not characters", () => {
    // 72 Chinese characters = 216 bytes, over the 213-byte version-10 limit.
    expect(() => encodeQr("你".repeat(72))).toThrow(/too long/);
    expect(encodeQr("你".repeat(71)).version).toBe(10);
  });

  it("refuses text beyond version 10", () => {
    expect(() => encodeQr("x".repeat(214))).toThrow(/too long/);
  });
});

describe("qr svg path", () => {
  it("starts with the top-left finder run and stays in bounds", () => {
    const qr = encodeQr("VAENYX");
    const path = qrSvgPath(qr);
    expect(path.startsWith("M0 0h7")).toBe(true);
    expect(path.includes("-0")).toBe(false);
    // Every dark module is covered exactly once: total run length equals the
    // dark-module count.
    let covered = 0;
    for (const match of path.matchAll(/h(\d+)v1/g)) {
      covered += Number(match[1]);
    }
    let dark = 0;
    for (const line of qr.modules) {
      for (const module of line) if (module) dark += 1;
    }
    expect(covered).toBe(dark);
  });
});
