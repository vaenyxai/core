// Office text extraction (Oskar, 2026-08-06): a .docx/.xlsx/.pptx is a ZIP of
// machine-written XML, and Node's zlib can inflate ZIP entries. So instead of
// adopting a dependency chain we do not control, this module owns a minimal
// ZIP reader and three text-only extractors. The deal it implements is stated
// in the manual: the WORDS come out; layout, images and charts are lost.
//
// Deliberate limits, all refused in plain codes rather than half-handled:
// encrypted entries, zip64 archives, unsupported compression methods, and
// anything that inflates past the cap (a zip bomb must die at a size check,
// never in memory).
import { inflateRawSync } from "node:zlib";

// The largest a single inflated XML part may grow. Office XML for even a huge
// real document is a few dozen MB; anything past this is either corrupt or a
// bomb, and the refusal names the honest reason either way.
export const MAX_OFFICE_XML_BYTES = 50 * 1024 * 1024;

// Extraction output cap, matching the plain-text cap in documents.ts: a
// monster spreadsheet must not crowd the whole conversation out of the
// model's window.
const MAX_OFFICE_TEXT_CHARS = 200_000;

export type OfficeKind = "docx" | "xlsx" | "pptx";

// ── Minimal ZIP reader ──────────────────────────────────────────────────────

interface ZipEntry {
  name: string;
  compressionMethod: number;
  encrypted: boolean;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;

// Find the end-of-central-directory record by scanning back from the tail.
// The record is 22 bytes plus a comment of up to 65535, so the scan window is
// bounded; Office writers never add a comment, but a hand-made ZIP might.
function findEndOfCentralDirectory(file: Buffer): number {
  const earliest = Math.max(0, file.length - 22 - 65535);
  for (let offset = file.length - 22; offset >= earliest; offset -= 1) {
    if (file.readUInt32LE(offset) === EOCD_SIGNATURE) return offset;
  }
  throw new Error("OFFICE_UNREADABLE");
}

// Walk the central directory — the ZIP's own table of contents, and the only
// place whose sizes can be trusted (local headers may be zeroed when the
// writer streamed with data descriptors).
export function readZipEntries(file: Buffer): ZipEntry[] {
  const eocd = findEndOfCentralDirectory(file);
  const totalEntries = file.readUInt16LE(eocd + 10);
  const directorySize = file.readUInt32LE(eocd + 12);
  const directoryOffset = file.readUInt32LE(eocd + 16);
  // zip64 is signalled by all-ones sentinels. Files this small never need it,
  // so meeting one means something unusual is going on — refuse plainly
  // rather than implement a second directory format for a case that does not
  // occur in practice.
  if (
    totalEntries === 0xffff ||
    directorySize === 0xffffffff ||
    directoryOffset === 0xffffffff
  ) {
    throw new Error("OFFICE_UNREADABLE");
  }
  if (directoryOffset + directorySize > file.length) {
    throw new Error("OFFICE_UNREADABLE");
  }
  const entries: ZipEntry[] = [];
  let cursor = directoryOffset;
  for (let index = 0; index < totalEntries; index += 1) {
    if (
      cursor + 46 > file.length ||
      file.readUInt32LE(cursor) !== CENTRAL_SIGNATURE
    ) {
      throw new Error("OFFICE_UNREADABLE");
    }
    const flags = file.readUInt16LE(cursor + 8);
    const nameLength = file.readUInt16LE(cursor + 28);
    const extraLength = file.readUInt16LE(cursor + 30);
    const commentLength = file.readUInt16LE(cursor + 32);
    entries.push({
      name: file.toString("utf8", cursor + 46, cursor + 46 + nameLength),
      compressionMethod: file.readUInt16LE(cursor + 10),
      // General-purpose bit 0 marks an encrypted entry. Its NAME is still
      // readable, which is why detection works while extraction refuses.
      encrypted: (flags & 0x1) !== 0,
      compressedSize: file.readUInt32LE(cursor + 20),
      uncompressedSize: file.readUInt32LE(cursor + 24),
      localHeaderOffset: file.readUInt32LE(cursor + 42),
    });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

// Inflate one entry. Sizes come from the central directory; the size cap is
// enforced twice — on the declared size before touching zlib, and by zlib's
// own maxOutputLength in case the declaration lied.
function readZipEntryData(file: Buffer, entry: ZipEntry): Buffer {
  if (entry.encrypted) throw new Error("OFFICE_ENCRYPTED");
  if (entry.uncompressedSize > MAX_OFFICE_XML_BYTES) {
    throw new Error("OFFICE_TOO_LARGE");
  }
  const local = entry.localHeaderOffset;
  if (
    local + 30 > file.length ||
    file.readUInt32LE(local) !== LOCAL_SIGNATURE
  ) {
    throw new Error("OFFICE_UNREADABLE");
  }
  // The local header's name/extra lengths can differ from the central ones
  // (the extra field often does), so the data offset must use ITS numbers.
  const nameLength = file.readUInt16LE(local + 26);
  const extraLength = file.readUInt16LE(local + 28);
  const start = local + 30 + nameLength + extraLength;
  const end = start + entry.compressedSize;
  if (end > file.length) throw new Error("OFFICE_UNREADABLE");
  const data = file.subarray(start, end);
  if (entry.compressionMethod === 0) {
    // Stored, not compressed — a raw copy is the data itself.
    return Buffer.from(data);
  }
  if (entry.compressionMethod === 8) {
    try {
      return inflateRawSync(data, { maxOutputLength: MAX_OFFICE_XML_BYTES });
    } catch (error) {
      const code = (error as { code?: string })?.code ?? "";
      if (code === "ERR_BUFFER_TOO_LARGE") {
        throw new Error("OFFICE_TOO_LARGE", { cause: error });
      }
      throw new Error("OFFICE_UNREADABLE", { cause: error });
    }
  }
  // Methods other than stored/deflate never come out of Office writers.
  throw new Error("OFFICE_UNREADABLE");
}

// ── Detection by content ────────────────────────────────────────────────────

// The old binary Office formats (.doc/.xls/.ppt) are OLE compound files, not
// ZIPs. They are out of scope on purpose — detected only so the refusal can
// name them instead of calling them generically unreadable.
export function isLegacyOfficeDocument(file: Buffer): boolean {
  return (
    file.length >= 8 &&
    file.readUInt32LE(0) === 0xe011cfd0 &&
    file.readUInt32LE(4) === 0xe11ab1a1
  );
}

// Which Office kind a buffer is, decided by CONTENT: the ZIP magic, then
// which marker part exists inside. A renamed file lands in the right pipeline
// or nowhere — the file name is never consulted.
export function detectOfficeKind(file: Buffer): OfficeKind | null {
  if (file.length < 4 || file.readUInt32LE(0) !== LOCAL_SIGNATURE) return null;
  let entries: ZipEntry[];
  try {
    entries = readZipEntries(file);
  } catch {
    // A ZIP we cannot walk is not an Office file we can claim to read; the
    // caller's other detectors (text) get their turn, and the generic
    // refusal covers the rest.
    return null;
  }
  const names = new Set(entries.map((entry) => entry.name));
  if (!names.has("[Content_Types].xml")) return null;
  if (names.has("word/document.xml")) return "docx";
  if (names.has("xl/workbook.xml")) return "xlsx";
  if (names.has("ppt/presentation.xml")) return "pptx";
  return null;
}

// ── XML scanning helpers ────────────────────────────────────────────────────

// These XML parts are machine-written by Office, never by hand, so a regex
// tag scan is honest here: the elements we need (<w:t>, <a:t>, <v>, <row>)
// always appear in the plain open-tag/text/close-tag shape a regex can walk.
// A general XML parser would be defending against inputs that do not occur.

// Decode the five named entities plus numeric character references — the only
// escapes Office XML text nodes contain.
function decodeXmlEntities(text: string): string {
  return text.replace(
    /&(?:amp|lt|gt|quot|apos|#x?[0-9a-fA-F]+);/g,
    (entity) => {
      switch (entity) {
        case "&amp;":
          return "&";
        case "&lt;":
          return "<";
        case "&gt;":
          return ">";
        case "&quot;":
          return '"';
        case "&apos;":
          return "'";
        default: {
          const body = entity.slice(2, -1);
          const codePoint =
            body[0] === "x" || body[0] === "X"
              ? Number.parseInt(body.slice(1), 16)
              : Number.parseInt(body, 10);
          if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
            return entity;
          }
          try {
            return String.fromCodePoint(codePoint);
          } catch {
            return entity;
          }
        }
      }
    },
  );
}

// Read one archive part as UTF-8 text, or null when the part is absent.
function readPartText(
  file: Buffer,
  entries: ZipEntry[],
  name: string,
): string | null {
  const entry = entries.find((candidate) => candidate.name === name);
  if (!entry) return null;
  return readZipEntryData(file, entry).toString("utf8");
}

// ── Word (.docx) ────────────────────────────────────────────────────────────

// Walk one WordprocessingML part in document order: <w:t> runs carry the
// words, </w:p> ends a paragraph (newline), <w:br/> and <w:cr/> break a line,
// and a bare <w:tab/> is a typed tab. The attribute-carrying <w:tab w:val=…/>
// inside paragraph properties is a tab-stop DEFINITION, not a typed tab,
// which is why the tab match insists on no attributes.
function scanWordXml(xml: string): string {
  const pattern =
    /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\s*\/>|<w:(?:br|cr)(?:\s[^>]*)?\/>|<\/w:p>/g;
  let text = "";
  let match: RegExpExecArray | null = pattern.exec(xml);
  while (match) {
    if (match[1] !== undefined) text += decodeXmlEntities(match[1]);
    else if (match[0].startsWith("<w:tab")) text += "\t";
    else text += "\n";
    match = pattern.exec(xml);
  }
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

function extractDocxText(file: Buffer, entries: ZipEntry[]): string {
  const document = readPartText(file, entries, "word/document.xml");
  if (document === null) throw new Error("OFFICE_UNREADABLE");
  const parts = [scanWordXml(document)];
  // Footnotes ride along when the part is present — they are words the body
  // refers to. Headers and footers are NOT chased: they repeat page furniture,
  // and this path has no pages.
  const footnotes = readPartText(file, entries, "word/footnotes.xml");
  if (footnotes !== null) {
    const text = scanWordXml(footnotes);
    if (text) parts.push(`[footnotes]\n${text}`);
  }
  return parts.filter((part) => part.length > 0).join("\n\n");
}

// ── Excel (.xlsx) ───────────────────────────────────────────────────────────

// The shared-strings table: cell text lives HERE, cells hold only an index
// into it. Each <si> may be split into several <t> runs when formatted.
function parseSharedStrings(xml: string | null): string[] {
  if (!xml) return [];
  const strings: string[] = [];
  const itemPattern = /<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g;
  let item: RegExpExecArray | null = itemPattern.exec(xml);
  while (item) {
    const itemBody = item[1] ?? "";
    const runPattern = /<t(?:\s[^>]*)?>([^<]*)<\/t>/g;
    let text = "";
    let run: RegExpExecArray | null = runPattern.exec(itemBody);
    while (run) {
      text += decodeXmlEntities(run[1] ?? "");
      run = runPattern.exec(itemBody);
    }
    strings.push(text);
    item = itemPattern.exec(xml);
  }
  return strings;
}

// One worksheet becomes tab-separated lines: cells in the order the file
// stores them, shared-string cells resolved through the table, numbers taken
// from <v> exactly as written. Number FORMATS (dates, currency) are not
// implemented — the raw value is the honest thing this path can give.
function scanSheetXml(xml: string, sharedStrings: string[]): string {
  const lines: string[] = [];
  const rowPattern = /<row(?:\s[^>]*)?>([\s\S]*?)<\/row>/g;
  let row: RegExpExecArray | null = rowPattern.exec(xml);
  while (row) {
    const rowBody = row[1] ?? "";
    const cells: string[] = [];
    const cellPattern = /<c(\s[^>]*)?>([\s\S]*?)<\/c>/g;
    let cell: RegExpExecArray | null = cellPattern.exec(rowBody);
    while (cell) {
      const attributes = cell[1] ?? "";
      const body = cell[2] ?? "";
      const typeMatch = /\st="([^"]*)"/.exec(attributes);
      const type = typeMatch?.[1] ?? "";
      if (type === "inlineStr") {
        const inline = /<t(?:\s[^>]*)?>([^<]*)<\/t>/.exec(body);
        cells.push(inline ? decodeXmlEntities(inline[1] ?? "") : "");
      } else {
        const value = /<v(?:\s[^>]*)?>([^<]*)<\/v>/.exec(body);
        const raw = value ? decodeXmlEntities(value[1] ?? "") : "";
        if (type === "s") {
          const index = Number.parseInt(raw, 10);
          cells.push(sharedStrings[index] ?? "");
        } else {
          cells.push(raw);
        }
      }
      cell = cellPattern.exec(rowBody);
    }
    if (cells.some((value) => value.length > 0)) {
      lines.push(cells.join("\t"));
    }
    row = rowPattern.exec(xml);
  }
  return lines.join("\n");
}

function extractXlsxText(file: Buffer, entries: ZipEntry[]): string {
  const workbook = readPartText(file, entries, "xl/workbook.xml");
  if (workbook === null) throw new Error("OFFICE_UNREADABLE");
  // Sheet display names, in workbook order. Pairing them with sheetN.xml by
  // index skips the relationship indirection on purpose: Office writes them
  // aligned, and the worst a mismatch can cost is a header label.
  const sheetNames: string[] = [];
  const namePattern = /<sheet\s[^>]*?name="([^"]*)"/g;
  let name: RegExpExecArray | null = namePattern.exec(workbook);
  while (name) {
    sheetNames.push(decodeXmlEntities(name[1] ?? ""));
    name = namePattern.exec(workbook);
  }
  const sharedStrings = parseSharedStrings(
    readPartText(file, entries, "xl/sharedStrings.xml"),
  );
  const sheetname = /^xl\/worksheets\/sheet(\d+)\.xml$/;
  const sheets = entries
    .map((entry) => {
      const match = sheetname.exec(entry.name);
      return match
        ? { entry, order: Number.parseInt(match[1] ?? "", 10) }
        : null;
    })
    .filter((sheet): sheet is { entry: ZipEntry; order: number } => !!sheet)
    .sort((a, b) => a.order - b.order);
  if (sheets.length === 0) throw new Error("OFFICE_UNREADABLE");
  const blocks: string[] = [];
  for (const [index, sheet] of sheets.entries()) {
    const xml = readZipEntryData(file, sheet.entry).toString("utf8");
    const body = scanSheetXml(xml, sharedStrings);
    const label = sheetNames[index] ?? `Sheet ${sheet.order}`;
    blocks.push(body ? `[sheet: ${label}]\n${body}` : `[sheet: ${label}]`);
  }
  return blocks.join("\n\n");
}

// ── PowerPoint (.pptx) ──────────────────────────────────────────────────────

// Slides in deck order, one block per slide, headed "[slide N]" — the same
// convention extractDocumentText already uses for PDF pages, so the model
// meets one shape of document either way.
function extractPptxText(file: Buffer, entries: ZipEntry[]): string {
  const slidePattern = /^ppt\/slides\/slide(\d+)\.xml$/;
  const slides = entries
    .map((entry) => {
      const match = slidePattern.exec(entry.name);
      return match
        ? { entry, order: Number.parseInt(match[1] ?? "", 10) }
        : null;
    })
    .filter((slide): slide is { entry: ZipEntry; order: number } => !!slide)
    .sort((a, b) => a.order - b.order);
  if (slides.length === 0) throw new Error("OFFICE_UNREADABLE");
  const blocks: string[] = [];
  for (const slide of slides) {
    const xml = readZipEntryData(file, slide.entry).toString("utf8");
    const pattern = /<a:t(?:\s[^>]*)?>([^<]*)<\/a:t>|<\/a:p>/g;
    let text = "";
    let match: RegExpExecArray | null = pattern.exec(xml);
    while (match) {
      if (match[1] !== undefined) text += decodeXmlEntities(match[1]);
      else text += "\n";
      match = pattern.exec(xml);
    }
    const body = text.replace(/\n{3,}/g, "\n\n").trim();
    if (body) blocks.push(`[slide ${slide.order}]\n${body}`);
  }
  return blocks.join("\n\n");
}

// ── Entry point ─────────────────────────────────────────────────────────────

// Extract the words from an Office file already known (or suspected) to be
// one. Throws OFFICE_ENCRYPTED / OFFICE_TOO_LARGE / OFFICE_UNREADABLE — the
// caller owns turning those into sentences the Owner can act on.
export function extractOfficeText(file: Buffer): string {
  const kind = detectOfficeKind(file);
  if (!kind) throw new Error("OFFICE_UNREADABLE");
  const entries = readZipEntries(file);
  let text: string;
  if (kind === "docx") text = extractDocxText(file, entries);
  else if (kind === "xlsx") text = extractXlsxText(file, entries);
  else text = extractPptxText(file, entries);
  return text.slice(0, MAX_OFFICE_TEXT_CHARS);
}
