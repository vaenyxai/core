import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import {
  buildSpillPreview,
  catalogDocumentText,
  createDocumentSpillAccess,
  DOCUMENT_INLINE_BUDGET_CHARS,
  DocumentPartError,
  parsePartRequest,
  sliceDocumentPart,
} from "../src/modules/core/document-spill.js";
import {
  hasDocumentText,
  readDocumentText,
  saveDocumentText,
} from "../src/modules/core/documents.js";

// A fake 12-page extraction in the exact shape extractDocumentText and the
// OCR path produce: [page N] blocks joined by blank lines.
const pagedText = Array.from(
  { length: 12 },
  (_, index) =>
    `[page ${index + 1}]\n${`Content of page ${index + 1}. `.repeat(300)}`,
).join("\n\n");

describe("catalogDocumentText", () => {
  it("catalogs [page N] blocks as pages", () => {
    const catalog = catalogDocumentText(pagedText);
    expect(catalog.kind).toBe("pages");
    expect(catalog.count).toBe(12);
    const page7 = catalog.slice(7, 7);
    expect(page7).toContain("[page 7]");
    expect(page7).toContain("Content of page 7.");
    expect(page7).not.toContain("[page 8]");
  });

  it("catalogs [slide N] blocks as slides", () => {
    const deck = "[slide 1]\nHello\n\n[slide 2]\nWorld\n\n[slide 3]\nEnd";
    const catalog = catalogDocumentText(deck);
    expect(catalog.kind).toBe("slides");
    expect(catalog.count).toBe(3);
    expect(catalog.slice(2, 3)).toBe("[slide 2]\nWorld\n\n[slide 3]\nEnd");
  });

  it("serves unmarked text in fixed-size parts", () => {
    const plain = "x".repeat(20_000);
    const catalog = catalogDocumentText(plain);
    expect(catalog.kind).toBe("parts");
    expect(catalog.count).toBe(3);
    expect(catalog.slice(1, 1)).toHaveLength(8_000);
    expect(catalog.slice(3, 3)).toHaveLength(4_000);
    expect(catalog.slice(4, 5)).toBeNull();
  });
});

describe("buildSpillPreview", () => {
  it("keeps head and tail, names the omitted pages, and stays within budget", () => {
    const preview = buildSpillPreview(pagedText, {
      canUseTool: false,
      budget: 4_000,
    });
    expect(preview.length).toBeLessThan(4_600);
    expect(preview).toContain("[page 1]");
    expect(preview).toContain("Content of page 12.");
    expect(preview).toContain("Omitted");
    expect(preview).toMatch(/roughly pages \d+–\d+/);
    expect(preview).toContain("full text is saved on this machine");
  });

  it("offers the tool to tool-loop backends and the Owner route to the rest", () => {
    const withTool = buildSpillPreview(pagedText, {
      canUseTool: true,
      budget: 4_000,
    });
    expect(withTool).toContain("read_document_part");
    const withoutTool = buildSpillPreview(pagedText, {
      canUseTool: false,
      budget: 4_000,
    });
    expect(withoutTool).not.toContain("read_document_part");
    expect(withoutTool).toContain("ask the Owner");
  });

  it("returns small text untouched", () => {
    expect(buildSpillPreview("short", { canUseTool: false })).toBe("short");
  });
});

describe("parsePartRequest", () => {
  it("reads Chinese page asks", () => {
    expect(parsePartRequest("看一下第3页")).toEqual({ from: 3, to: 3 });
    expect(parsePartRequest("第3到5页说了什么")).toEqual({ from: 3, to: 5 });
    expect(parsePartRequest("给我第 12-15 页")).toEqual({ from: 12, to: 15 });
    expect(parsePartRequest("第2部分呢")).toEqual({ from: 2, to: 2 });
  });

  it("reads English page asks", () => {
    expect(parsePartRequest("show me page 9")).toEqual({ from: 9, to: 9 });
    expect(parsePartRequest("what do pages 4-7 say")).toEqual({
      from: 4,
      to: 7,
    });
    expect(parsePartRequest("slide 2 to 4 please")).toEqual({ from: 2, to: 4 });
  });

  it("ignores ordinary numbers so chatter cannot trigger an injection", () => {
    expect(parsePartRequest("我 3 点有空,买 5 个")).toBeNull();
    expect(parsePartRequest("the meeting is at 3")).toBeNull();
    expect(parsePartRequest("")).toBeNull();
  });
});

describe("sliceDocumentPart", () => {
  it("labels a single page and a range", () => {
    expect(sliceDocumentPart(pagedText, 7, 7)?.label).toBe("page 7");
    expect(sliceDocumentPart(pagedText, 4, 6)?.label).toBe("pages 4–6");
  });

  it("returns null outside the document", () => {
    expect(sliceDocumentPart(pagedText, 40, 50)).toBeNull();
  });

  it("cuts an oversized range at the budget with an honest note", () => {
    const part = sliceDocumentPart(pagedText, 1, 12, 2_000);
    expect(part).not.toBeNull();
    expect(part?.text.length).toBeLessThan(2_100);
    expect(part?.text).toContain("ask for fewer");
  });
});

describe("document text sidecar + spill access", () => {
  const dataDirectory = mkdtempSync(join(tmpdir(), "vaenyx-spill-"));
  afterAll(() => rmSync(dataDirectory, { recursive: true, force: true }));
  const documentId = "0f0e0d0c-0b0a-0908-0706-050403020100.pdf";

  it("round-trips the saved text and guards the id pattern", () => {
    expect(hasDocumentText(dataDirectory, documentId)).toBe(false);
    expect(saveDocumentText(dataDirectory, documentId, pagedText)).toBe(true);
    expect(hasDocumentText(dataDirectory, documentId)).toBe(true);
    expect(readDocumentText(dataDirectory, documentId)).toBe(pagedText);
    expect(saveDocumentText(dataDirectory, "..\\evil.pdf", "x")).toBe(false);
    expect(readDocumentText(dataDirectory, "not-a-uuid.pdf")).toBeNull();
  });

  it("lends a reader that serves real parts and refuses with a sentence", () => {
    const access = createDocumentSpillAccess(dataDirectory, {
      documentId,
      documentName: "drawings.pdf",
    });
    expect(access).not.toBeNull();
    expect(access?.unit).toBe("pages");
    expect(access?.count).toBe(12);
    expect(access?.read(7, 7)).toContain("Content of page 7.");
    expect(() => access?.read(90, 95)).toThrowError(DocumentPartError);
    expect(() => access?.read(90, 95)).toThrowError(/has 12 pages/);
  });

  it("returns null for a document that never spilled", () => {
    expect(
      createDocumentSpillAccess(dataDirectory, {
        documentId: "11111111-2222-3333-4444-555555555555.pdf",
        documentName: null,
      }),
    ).toBeNull();
  });
});

describe("DOCUMENT_INLINE_BUDGET_CHARS", () => {
  it("is a sane bound: big enough for a real quote, far below the old hard cut", () => {
    expect(DOCUMENT_INLINE_BUDGET_CHARS).toBeGreaterThanOrEqual(16_000);
    expect(DOCUMENT_INLINE_BUDGET_CHARS).toBeLessThanOrEqual(120_000);
  });
});
