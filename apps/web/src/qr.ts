// Self-contained QR encoder (byte mode, error level M, versions 1-10).
//
// This exists so the phone-onboarding QR is generated ON THIS MACHINE: the
// instance URL identifies the owner's private tailnet address, and sending it
// to an external QR or short-link service would be a privacy incident. No
// dependency, no network — just the ISO/IEC 18004 algorithm: byte-mode data
// encoding, Reed-Solomon error correction over GF(256), block interleaving,
// the zigzag module placement, and mask selection by penalty scoring.
//
// Correctness is proven in qr.test.ts two ways: structural checks (finder,
// timing, dark module, format/version bits) and golden-vector fixtures pinned
// from an independent MIT implementation (`qrcode-generator`, generated once
// in a scratchpad — the library itself does not ship).

// ── Tables ────────────────────────────────────────────────────────────────

// Error-correction layout at level M, versions 1-10 (ISO 18004 table 9):
// how many EC codewords protect each block, and the data-codeword length of
// each block. Version 8+ split into blocks of two different lengths.
const EC_LAYOUT: { ecPerBlock: number; blocks: number[] }[] = [
  { ecPerBlock: 10, blocks: [16] },
  { ecPerBlock: 16, blocks: [28] },
  { ecPerBlock: 26, blocks: [44] },
  { ecPerBlock: 18, blocks: [32, 32] },
  { ecPerBlock: 24, blocks: [43, 43] },
  { ecPerBlock: 16, blocks: [27, 27, 27, 27] },
  { ecPerBlock: 18, blocks: [31, 31, 31, 31] },
  { ecPerBlock: 22, blocks: [38, 38, 39, 39] },
  { ecPerBlock: 22, blocks: [36, 36, 36, 37, 37] },
  { ecPerBlock: 26, blocks: [43, 43, 43, 43, 44] },
];

// Alignment-pattern centre coordinates per version (ISO 18004 annex E).
const ALIGNMENT: number[][] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 52],
];

// ── Galois field GF(256), primitive polynomial 0x11D ─────────────────────

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
{
  let value = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = value;
    GF_LOG[value] = i;
    value <<= 1;
    if (value & 0x100) value ^= 0x11d;
  }
  // Doubled so products of two logs never need a modulo before lookup.
  for (let i = 255; i < 512; i += 1) GF_EXP[i] = GF_EXP[i - 255] ?? 0;
}

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[(GF_LOG[a] ?? 0) + (GF_LOG[b] ?? 0)] ?? 0;
}

// Reed-Solomon generator polynomial of the requested degree: the product of
// (x - α^i) for i = 0..degree-1, coefficients highest power first.
function rsGenerator(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i += 1) {
    const next = new Array<number>(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j += 1) {
      const coefficient = poly[j] ?? 0;
      next[j] = (next[j] ?? 0) ^ gfMul(coefficient, GF_EXP[i] ?? 1);
      next[j + 1] = (next[j + 1] ?? 0) ^ coefficient;
    }
    // The product above builds coefficients lowest power first; flip back.
    poly = next;
  }
  return poly.reverse();
}

// Polynomial division remainder = the EC codewords for one block.
function rsEncode(data: number[], degree: number): number[] {
  const generator = rsGenerator(degree);
  const remainder = new Array<number>(degree).fill(0);
  for (const byte of data) {
    const factor = (remainder.shift() ?? 0) ^ byte;
    remainder.push(0);
    for (let i = 0; i < degree; i += 1) {
      remainder[i] =
        (remainder[i] ?? 0) ^ gfMul(generator[i + 1] ?? 0, factor);
    }
  }
  return remainder;
}

// ── BCH-protected format and version information ─────────────────────────

// 15-bit format info: EC level M (00) + mask id, BCH(15,5) remainder, then
// the fixed XOR mask from the spec so the field is never all-zero.
export function formatInfoBits(mask: number): number {
  const data = mask & 0b111; // level M contributes 00 as the top two bits
  let remainder = data << 10;
  for (let bit = 14; bit >= 10; bit -= 1) {
    if (remainder & (1 << bit)) remainder ^= 0x537 << (bit - 10);
  }
  return ((data << 10) | remainder) ^ 0x5412;
}

// 18-bit version info for versions 7+, BCH(18,6) with generator 0x1F25.
export function versionInfoBits(version: number): number {
  let remainder = version << 12;
  for (let bit = 17; bit >= 12; bit -= 1) {
    if (remainder & (1 << bit)) remainder ^= 0x1f25 << (bit - 12);
  }
  return (version << 12) | remainder;
}

// ── Data encoding ─────────────────────────────────────────────────────────

function byteCapacity(version: number): number {
  const layout = EC_LAYOUT[version - 1];
  if (!layout) return 0;
  const dataCodewords = layout.blocks.reduce((sum, size) => sum + size, 0);
  // Mode indicator (4 bits) + character count (8 bits up to version 9,
  // 16 bits from version 10).
  const headerBits = 4 + (version <= 9 ? 8 : 16);
  return Math.floor((dataCodewords * 8 - headerBits) / 8);
}

function buildCodewords(bytes: Uint8Array, version: number): number[] {
  const layout = EC_LAYOUT[version - 1];
  if (!layout) throw new Error("QR version out of range.");
  const dataCodewords = layout.blocks.reduce((sum, size) => sum + size, 0);

  // Bit stream: byte-mode indicator, length, payload, terminator, padding.
  const bits: number[] = [];
  const push = (value: number, count: number) => {
    for (let i = count - 1; i >= 0; i -= 1) bits.push((value >> i) & 1);
  };
  push(0b0100, 4);
  push(bytes.length, version <= 9 ? 8 : 16);
  for (const byte of bytes) push(byte, 8);
  const capacityBits = dataCodewords * 8;
  push(0, Math.min(4, capacityBits - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j += 1) byte = (byte << 1) | (bits[i + j] ?? 0);
    data.push(byte);
  }
  // Alternating pad codewords from the spec fill the remainder.
  const pads = [0xec, 0x11];
  for (let i = 0; data.length < dataCodewords; i += 1) {
    data.push(pads[i % 2] ?? 0xec);
  }

  // Split into blocks, compute EC per block, then interleave column-wise:
  // first codeword of every block, second of every block, and so on.
  const blocks: number[][] = [];
  const ecBlocks: number[][] = [];
  let offset = 0;
  for (const size of layout.blocks) {
    const block = data.slice(offset, offset + size);
    offset += size;
    blocks.push(block);
    ecBlocks.push(rsEncode(block, layout.ecPerBlock));
  }
  const interleaved: number[] = [];
  const longest = Math.max(...layout.blocks);
  for (let i = 0; i < longest; i += 1) {
    for (const block of blocks) {
      const codeword = block[i];
      if (codeword !== undefined) interleaved.push(codeword);
    }
  }
  for (let i = 0; i < layout.ecPerBlock; i += 1) {
    for (const block of ecBlocks) {
      const codeword = block[i];
      if (codeword !== undefined) interleaved.push(codeword);
    }
  }
  return interleaved;
}

// ── Matrix construction ───────────────────────────────────────────────────

export interface QrMatrix {
  size: number;
  version: number;
  mask: number;
  /** modules[row][column], true = dark. */
  modules: boolean[][];
}

interface Grid {
  size: number;
  modules: boolean[][];
  /** Function-pattern cells the data zigzag and the mask must skip. */
  reserved: boolean[][];
}

function set(grid: Grid, row: number, col: number, dark: boolean): void {
  const line = grid.modules[row];
  const reservedLine = grid.reserved[row];
  if (!line || !reservedLine) return;
  line[col] = dark;
  reservedLine[col] = true;
}

function placeFinder(grid: Grid, top: number, left: number): void {
  // 7x7 finder with its one-module light separator ring.
  for (let r = -1; r <= 7; r += 1) {
    for (let c = -1; c <= 7; c += 1) {
      const row = top + r;
      const col = left + c;
      if (row < 0 || row >= grid.size || col < 0 || col >= grid.size) continue;
      const dark =
        r >= 0 &&
        r <= 6 &&
        c >= 0 &&
        c <= 6 &&
        (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
      set(grid, row, col, dark);
    }
  }
}

function buildFunctionPatterns(version: number): Grid {
  const size = version * 4 + 17;
  const grid: Grid = {
    size,
    modules: Array.from({ length: size }, () =>
      new Array<boolean>(size).fill(false),
    ),
    reserved: Array.from({ length: size }, () =>
      new Array<boolean>(size).fill(false),
    ),
  };

  placeFinder(grid, 0, 0);
  placeFinder(grid, 0, size - 7);
  placeFinder(grid, size - 7, 0);

  // Alignment patterns first, skipping the three finder corners. They go in
  // before the timing pattern because from version 7 some of them sit ON the
  // timing lines — their own modules keep the alternation consistent there.
  const centres = ALIGNMENT[version - 1] ?? [];
  for (const row of centres) {
    for (const col of centres) {
      if (grid.reserved[row]?.[col]) continue;
      for (let r = -2; r <= 2; r += 1) {
        for (let c = -2; c <= 2; c += 1) {
          const dark =
            Math.max(Math.abs(r), Math.abs(c)) !== 1;
          set(grid, row + r, col + c, dark);
        }
      }
    }
  }

  // Timing patterns: alternating modules along row 6 and column 6.
  for (let i = 8; i < size - 8; i += 1) {
    const dark = i % 2 === 0;
    if (!grid.reserved[6]?.[i]) set(grid, 6, i, dark);
    if (!grid.reserved[i]?.[6]) set(grid, i, 6, dark);
  }

  // Reserve the format-information areas (filled per-mask later) and place
  // the always-dark module above the bottom-left finder.
  for (let i = 0; i < 8; i += 1) {
    set(grid, 8, i <= 5 ? i : i + 1, false);
    set(grid, i <= 5 ? i : i + 1, 8, false);
    set(grid, 8, size - 1 - i, false);
    set(grid, size - 1 - i, 8, false);
  }
  set(grid, 8, 8, false);
  set(grid, size - 8, 8, true);

  // Version information blocks for versions 7+.
  if (version >= 7) {
    const bits = versionInfoBits(version);
    for (let i = 0; i < 18; i += 1) {
      const dark = ((bits >> i) & 1) === 1;
      set(grid, Math.floor(i / 3), size - 11 + (i % 3), dark);
      set(grid, size - 11 + (i % 3), Math.floor(i / 3), dark);
    }
  }
  return grid;
}

// The zigzag data placement: two-module columns from the right edge upward
// and downward alternately, skipping the vertical timing column entirely.
function placeData(grid: Grid, codewords: number[]): void {
  const { size } = grid;
  let bitIndex = 0;
  const nextBit = () => {
    const codeword = codewords[bitIndex >> 3] ?? 0;
    const bit = ((codeword >> (7 - (bitIndex & 7))) & 1) === 1;
    bitIndex += 1;
    return bit;
  };
  let upward = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right = 5;
    for (let step = 0; step < size; step += 1) {
      const row = upward ? size - 1 - step : step;
      for (const col of [right, right - 1]) {
        if (grid.reserved[row]?.[col]) continue;
        const line = grid.modules[row];
        if (line) line[col] = nextBit();
      }
    }
    upward = !upward;
  }
}

const MASKS: ((row: number, col: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function applyMask(grid: Grid, mask: number): boolean[][] {
  const condition = MASKS[mask];
  if (!condition) throw new Error("QR mask out of range.");
  return grid.modules.map((line, row) =>
    line.map((dark, col) =>
      grid.reserved[row]?.[col] ? dark : dark !== condition(row, col),
    ),
  );
}

// Format info goes in twice; bit 14 (most significant) sits next to the
// top-left finder's corner at (8,0) and at the bottom of the bottom-left
// finder's right edge — the layout every scanner expects.
function drawFormatInfo(
  modules: boolean[][],
  size: number,
  mask: number,
): void {
  const bits = formatInfoBits(mask);
  for (let i = 0; i < 15; i += 1) {
    const dark = ((bits >> i) & 1) === 1;
    // Copy around the top-left finder. Bit 8 sits at column 7 because the
    // timing column (6) splits the row-8 run.
    if (i < 6) modules[i]![8] = dark;
    else if (i < 8) modules[i + 1]![8] = dark;
    else if (i === 8) modules[8]![7] = dark;
    else modules[8]![14 - i] = dark;
    // Split copy: top-right row and bottom-left column.
    if (i < 8) modules[8]![size - 1 - i] = dark;
    else modules[size - 15 + i]![8] = dark;
  }
}

// ── Mask evaluation (ISO 18004 section 8.8.2 penalty rules) ──────────────

export function qrPenalty(modules: boolean[][]): number {
  const size = modules.length;
  const at = (r: number, c: number) => modules[r]?.[c] === true;
  let penalty = 0;

  // Rule 1: runs of five or more same-coloured modules in a row or column.
  for (let axis = 0; axis < 2; axis += 1) {
    for (let i = 0; i < size; i += 1) {
      let run = 1;
      for (let j = 1; j <= size; j += 1) {
        const current = j < size && (axis === 0 ? at(i, j) : at(j, i));
        const previous = axis === 0 ? at(i, j - 1) : at(j - 1, i);
        if (j < size && current === previous) {
          run += 1;
        } else {
          if (run >= 5) penalty += 3 + (run - 5);
          run = 1;
        }
      }
    }
  }

  // Rule 2: every 2x2 block of a single colour.
  for (let r = 0; r < size - 1; r += 1) {
    for (let c = 0; c < size - 1; c += 1) {
      const dark = at(r, c);
      if (at(r, c + 1) === dark && at(r + 1, c) === dark && at(r + 1, c + 1) === dark) {
        penalty += 3;
      }
    }
  }

  // Rule 3: the finder-like 1:1:3:1:1 pattern with four light modules on
  // either side, horizontally or vertically.
  const finder = [true, false, true, true, true, false, true];
  const lights = [false, false, false, false];
  const before = [...lights, ...finder];
  const after = [...finder, ...lights];
  for (let axis = 0; axis < 2; axis += 1) {
    for (let i = 0; i < size; i += 1) {
      for (let j = 0; j + 11 <= size; j += 1) {
        for (const pattern of [before, after]) {
          let match = true;
          for (let k = 0; k < 11; k += 1) {
            const value = axis === 0 ? at(i, j + k) : at(j + k, i);
            if (value !== pattern[k]) {
              match = false;
              break;
            }
          }
          if (match) {
            penalty += 40;
            break;
          }
        }
      }
    }
  }

  // Rule 4: deviation of the dark-module proportion from 50%.
  let dark = 0;
  for (const line of modules) for (const module of line) if (module) dark += 1;
  const percent = (dark * 100) / (size * size);
  penalty += 10 * Math.floor(Math.abs(percent - 50) / 5);
  return penalty;
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Encode text as a QR symbol (UTF-8 bytes, error level M, version 1-10).
 * A mask can be forced for testing; normally the lowest-penalty mask wins.
 */
export function encodeQr(text: string, options?: { mask?: number }): QrMatrix {
  const bytes = new TextEncoder().encode(text);
  let version = 0;
  for (let candidate = 1; candidate <= 10; candidate += 1) {
    if (bytes.length <= byteCapacity(candidate)) {
      version = candidate;
      break;
    }
  }
  if (version === 0) {
    throw new Error(
      `Text is too long for a QR code up to version 10 (${bytes.length} bytes, limit ${byteCapacity(10)}).`,
    );
  }

  const grid = buildFunctionPatterns(version);
  placeData(grid, buildCodewords(bytes, version));

  const candidates =
    options?.mask === undefined
      ? [0, 1, 2, 3, 4, 5, 6, 7]
      : [options.mask];
  let best: { mask: number; modules: boolean[][]; penalty: number } | null =
    null;
  for (const mask of candidates) {
    const modules = applyMask(grid, mask);
    drawFormatInfo(modules, grid.size, mask);
    const penalty = qrPenalty(modules);
    if (!best || penalty < best.penalty) best = { mask, modules, penalty };
  }
  if (!best) throw new Error("QR mask selection failed.");
  return {
    size: grid.size,
    version,
    mask: best.mask,
    modules: best.modules,
  };
}

/**
 * One SVG path covering every dark module, one unit per module, origin at the
 * symbol's top-left corner. Render inside an <svg> whose viewBox adds the
 * four-module quiet zone the spec asks for.
 */
export function qrSvgPath(qr: QrMatrix): string {
  const parts: string[] = [];
  for (let row = 0; row < qr.size; row += 1) {
    const line = qr.modules[row];
    if (!line) continue;
    let col = 0;
    while (col < qr.size) {
      if (!line[col]) {
        col += 1;
        continue;
      }
      // Merge horizontal runs so the path stays small.
      let end = col;
      while (end < qr.size && line[end]) end += 1;
      parts.push(`M${col} ${row}h${end - col}v1h-${end - col}z`);
      col = end;
    }
  }
  return parts.join("");
}
