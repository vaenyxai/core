// Office text extraction — real fixtures, no fixture files: each test builds
// a genuine little ZIP (local headers, central directory, EOCD, real CRCs)
// with node:zlib, exactly the shape Word/Excel/PowerPoint write. What is
// tested is the deal the manual states: a known sentence goes in, the same
// sentence comes out as words; and the hostile shapes (encrypted entry, zip
// bomb, old binary format, renamed file) are refused with their own codes.
import { crc32, deflateRawSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import {
  extractDocumentText,
  inspectDocument,
} from "../src/modules/core/documents.js";
import {
  MAX_OFFICE_XML_BYTES,
  detectOfficeKind,
  extractOfficeText,
} from "../src/modules/core/office.js";

interface FixtureEntry {
  name: string;
  data: Buffer | string;
  // Hostile-fixture knobs: mark the entry encrypted, or declare a lying
  // uncompressed size in both headers.
  encrypted?: boolean;
  declaredUncompressedSize?: number;
}

// A by-hand ZIP writer: one local header + deflated data per entry, then the
// central directory, then the end record. Deliberately independent of the
// reader under test — it writes the format, the reader parses it.
function makeZip(entries: FixtureEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const nameBytes = Buffer.from(entry.name, "utf8");
    const raw = Buffer.isBuffer(entry.data)
      ? entry.data
      : Buffer.from(entry.data, "utf8");
    const compressed = deflateRawSync(raw);
    const checksum = crc32(raw);
    const uncompressedSize = entry.declaredUncompressedSize ?? raw.length;
    const flags = entry.encrypted ? 0x1 : 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(uncompressedSize, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(flags, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(uncompressedSize, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(Buffer.concat([central, nameBytes]));
    const localRecord = Buffer.concat([local, nameBytes, compressed]);
    localParts.push(localRecord);
    offset += localRecord.length;
  }
  const centralDirectory = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDirectory.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, centralDirectory, eocd]);
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>`;

function makeDocx(overrides?: Partial<FixtureEntry>): Buffer {
  return makeZip([
    { name: "[Content_Types].xml", data: CONTENT_TYPES },
    {
      name: "word/document.xml",
      data: `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:pPr><w:tabs><w:tab w:val="left" w:pos="720"/></w:tabs></w:pPr><w:r><w:t xml:space="preserve">Bring the ladder</w:t></w:r><w:r><w:tab/></w:r><w:r><w:t>on Tuesday &amp; Friday.</w:t></w:r></w:p><w:p><w:r><w:t>Second paragraph.</w:t></w:r></w:p></w:body></w:document>`,
      ...overrides,
    },
    {
      name: "word/footnotes.xml",
      data: `<?xml version="1.0"?><w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:footnote w:id="1"><w:p><w:r><w:t>A footnote sentence.</w:t></w:r></w:p></w:footnote></w:footnotes>`,
    },
  ]);
}

function makeXlsx(): Buffer {
  return makeZip([
    { name: "[Content_Types].xml", data: CONTENT_TYPES },
    {
      name: "xl/workbook.xml",
      data: `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets><sheet name="Budget" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: "xl/sharedStrings.xml",
      data: `<?xml version="1.0"?><sst count="2" uniqueCount="2"><si><t>Timber</t></si><si><t xml:space="preserve">Nails &amp; screws</t></si></sst>`,
    },
    {
      name: "xl/worksheets/sheet1.xml",
      data: `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1"><v>420.5</v></c></row><row r="2"><c r="A2" t="s"><v>1</v></c><c r="B2"><v>36</v></c></row></sheetData></worksheet>`,
    },
  ]);
}

function makePptx(): Buffer {
  return makeZip([
    { name: "[Content_Types].xml", data: CONTENT_TYPES },
    {
      name: "ppt/presentation.xml",
      data: `<?xml version="1.0"?><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>`,
    },
    {
      name: "ppt/slides/slide1.xml",
      data: `<?xml version="1.0"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:p><a:r><a:t>Quarterly plan</a:t></a:r></a:p></p:sld>`,
    },
    {
      name: "ppt/slides/slide2.xml",
      data: `<?xml version="1.0"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:p><a:r><a:t>Fix the roof &amp; the gate</a:t></a:r></a:p></p:sld>`,
    },
  ]);
}

describe("office extraction (docx/xlsx/pptx)", () => {
  it("reads a Word file: runs joined, tabs typed, paragraphs on their own lines, footnotes appended", () => {
    const file = makeDocx();
    expect(detectOfficeKind(file)).toBe("docx");
    const text = extractOfficeText(file);
    // The entity is decoded, the run tab survives, and the tab-stop
    // DEFINITION in paragraph properties did not inject a phantom tab.
    expect(text).toContain("Bring the ladder\ton Tuesday & Friday.");
    expect(text).toContain("Second paragraph.");
    expect(text).toContain("[footnotes]\nA footnote sentence.");
    expect(text.startsWith("Bring the ladder")).toBe(true);
  });

  it("reads an Excel file: sheet-name header, shared strings resolved, rows as tab-separated lines", () => {
    const file = makeXlsx();
    expect(detectOfficeKind(file)).toBe("xlsx");
    const text = extractOfficeText(file);
    expect(text).toContain("[sheet: Budget]");
    expect(text).toContain("Timber\t420.5");
    // A shared string with an entity and a plain number, on the same row.
    expect(text).toContain("Nails & screws\t36");
  });

  it("reads a PowerPoint file: one block per slide, in deck order, headed like PDF pages", () => {
    const file = makePptx();
    expect(detectOfficeKind(file)).toBe("pptx");
    const text = extractOfficeText(file);
    expect(text).toContain("[slide 1]\nQuarterly plan");
    expect(text).toContain("[slide 2]\nFix the roof & the gate");
    expect(text.indexOf("[slide 1]")).toBeLessThan(text.indexOf("[slide 2]"));
  });

  it("lands a renamed file in the right pipeline: content wins, the name is never consulted", async () => {
    // The same bytes an Owner might rename to notes.txt: extraction must give
    // the WORDS, not the raw archive bytes a text pipeline would produce.
    const file = makeDocx();
    const facts = await inspectDocument(file);
    expect(facts.pages).toBe(1);
    const text = await extractDocumentText(file);
    expect(text).toContain("Bring the ladder");
    expect(text).not.toContain("<w:t");
  });

  it("refuses an encrypted entry with its own code", async () => {
    const file = makeDocx({ encrypted: true });
    // The entry NAME is still readable, so the kind is known — which is
    // exactly why the refusal can say "password" instead of "unreadable".
    expect(detectOfficeKind(file)).toBe("docx");
    expect(() => extractOfficeText(file)).toThrow("OFFICE_ENCRYPTED");
    await expect(inspectDocument(file)).rejects.toThrow("DOCUMENT_PASSWORD");
  });

  it("refuses a declared oversize before touching zlib", async () => {
    const file = makeDocx({
      declaredUncompressedSize: MAX_OFFICE_XML_BYTES + 1,
    });
    expect(() => extractOfficeText(file)).toThrow("OFFICE_TOO_LARGE");
    await expect(inspectDocument(file)).rejects.toThrow(
      "DOCUMENT_UNPACKS_TOO_LARGE",
    );
  });

  it("kills a lying zip bomb at the size cap, not in memory", () => {
    // The declared size claims tiny; the deflate stream actually inflates
    // past the cap. zlib's maxOutputLength is the backstop that must hold.
    const file = makeDocx({
      data: Buffer.alloc(MAX_OFFICE_XML_BYTES + 1),
      declaredUncompressedSize: 10,
    });
    expect(() => extractOfficeText(file)).toThrow("OFFICE_TOO_LARGE");
  });

  it("refuses the old binary formats by name", async () => {
    // The OLE compound-file magic that .doc/.xls/.ppt all share.
    const legacy = Buffer.concat([
      Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
      Buffer.alloc(64),
    ]);
    await expect(inspectDocument(legacy)).rejects.toThrow(
      "DOCUMENT_LEGACY_OFFICE",
    );
  });

  it("does not claim a plain ZIP that is no Office file", async () => {
    const zip = makeZip([{ name: "readme.txt", data: "just a zip" }]);
    expect(detectOfficeKind(zip)).toBe(null);
    await expect(inspectDocument(zip)).rejects.toThrow("DOCUMENT_UNREADABLE");
  });
});
