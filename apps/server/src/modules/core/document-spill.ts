// Spill mode for oversized extracted document text (idea ported from
// DeepSeek Harness's spill policy, MIT; all code is Vaenyx's own).
//
// A 30-page OCR'd drawing set or a big PDF used to ride into the context
// whole and get hard-truncated — expensive AND able to cut off exactly the
// page that mattered, silently. Now text over the inline budget is saved
// WHOLE next to the document it came from (documents.ts owns that disk
// side), and the context carries an honest bounded stand-in: the head, the
// tail, and a note saying exactly how much is omitted and how to get any
// part back.
//
// Retrieval is layered by what the backend can actually do — the wording
// never promises what it cannot:
//   • a backend with a live tool loop gets read_document_part (see
//     models/document-tools.ts) and is told to use it;
//   • every other backend is told to ask the Owner which part to show; the
//     next turn serves the named pages (parsePartRequest below). The model
//     is never told it can fetch anything itself.
// This is NOT the Fetching capability: the reader serves the one document
// the Owner already attached to this conversation, resolved server-side
// from the conversation's own rows — the model never names a path or an id.
import { readDocumentText } from "./documents.js";

// How much extracted text may ride a request inline. Above this, spill.
export const DOCUMENT_INLINE_BUDGET_CHARS = 32_000;
// Text with no page/slide markers is served in fixed-size parts instead.
const PLAIN_PART_CHARS = 8_000;

// ── The part catalog: how a saved text divides into retrievable units ──────

export interface DocumentPartCatalog {
  // "pages" for PDF/OCR text ([page N] blocks), "slides" for pptx,
  // "parts" for anything without markers (plain text, docx, xlsx).
  kind: "pages" | "slides" | "parts";
  count: number;
  slice(from: number, to: number): string | null;
}

interface Marker {
  number: number;
  start: number;
}

function findMarkers(text: string, word: string): Marker[] {
  const markers: Marker[] = [];
  const pattern = new RegExp(`^\\[${word} (\\d+)\\]$`, "gm");
  for (const match of text.matchAll(pattern)) {
    markers.push({ number: Number(match[1]), start: match.index ?? 0 });
  }
  return markers;
}

function markerCatalog(
  text: string,
  kind: "pages" | "slides",
  markers: Marker[],
): DocumentPartCatalog {
  return {
    kind,
    count: markers[markers.length - 1]?.number ?? markers.length,
    slice(from, to) {
      const wanted = markers.filter(
        (marker) => marker.number >= from && marker.number <= to,
      );
      const first = wanted[0];
      if (!first) return null;
      const last = wanted[wanted.length - 1] ?? first;
      const after = markers.find((marker) => marker.start > last.start);
      return text.slice(first.start, after ? after.start : text.length).trim();
    },
  };
}

export function catalogDocumentText(text: string): DocumentPartCatalog {
  const pages = findMarkers(text, "page");
  if (pages.length >= 2) return markerCatalog(text, "pages", pages);
  const slides = findMarkers(text, "slide");
  if (slides.length >= 2) return markerCatalog(text, "slides", slides);
  const count = Math.max(1, Math.ceil(text.length / PLAIN_PART_CHARS));
  return {
    kind: "parts",
    count,
    slice(from, to) {
      if (from > count || to < 1) return null;
      const start = snapToCodePoint(
        text,
        (Math.max(1, from) - 1) * PLAIN_PART_CHARS,
      );
      const end = Math.min(to, count) * PLAIN_PART_CHARS;
      return text.slice(
        start,
        end >= text.length ? text.length : snapToCodePoint(text, end),
      );
    },
  };
}

// ── The preview that replaces oversized text in the context ────────────────

const unitWord = (kind: DocumentPartCatalog["kind"]): string =>
  kind === "pages" ? "pages" : kind === "slides" ? "slides" : "parts";

// Which units the omitted middle covers, so the note can name them.
function omittedSpan(
  text: string,
  kind: "pages" | "slides",
  headEnd: number,
  tailStart: number,
): { from: number; to: number } | null {
  const markers = findMarkers(text, kind === "pages" ? "page" : "slide");
  const inside = markers.filter(
    (marker) => marker.start >= headEnd && marker.start < tailStart,
  );
  const first = inside[0];
  const last = inside[inside.length - 1];
  return first && last ? { from: first.number, to: last.number } : null;
}

// A fixed offset can land between the two halves of a surrogate pair (an
// emoji, a rare CJK character); a cut there produces broken characters at
// both boundary edges. Nudging one code unit left keeps the split clean.
function snapToCodePoint(text: string, index: number): number {
  const code = text.charCodeAt(index);
  return index > 0 && code >= 0xdc00 && code <= 0xdfff ? index - 1 : index;
}

export function buildSpillPreview(
  text: string,
  options: { canUseTool: boolean; budget?: number },
): string {
  const budget = options.budget ?? DOCUMENT_INLINE_BUDGET_CHARS;
  if (text.length <= budget) return text;
  const headEnd = snapToCodePoint(text, Math.ceil(budget / 2));
  const tailStart = snapToCodePoint(text, text.length - Math.floor(budget / 2));
  const head = text.slice(0, headEnd);
  const tail = text.slice(tailStart);
  const omitted = text.length - head.length - tail.length;

  const catalog = catalogDocumentText(text);
  const units = unitWord(catalog.kind);
  const span =
    catalog.kind === "parts"
      ? null
      : omittedSpan(text, catalog.kind, headEnd, tailStart);
  const retrieval = options.canUseTool
    ? `Use the read_document_part tool to read any of its ${catalog.count} ${units} you need.`
    : `If a missing part could matter, ask the Owner to name the ${units} to show (for example "${
        units === "pages" ? "第 5–8 页" : `${units} 2–3`
      }") — the named ${units} will arrive with the Owner's next message.`;
  const notice = `(Omitted ${omitted} of ${text.length} characters here${
    span ? `, roughly ${units} ${span.from}–${span.to}` : ""
  }. Nothing is lost: the document's full text is saved on this machine. ${retrieval})`;

  return [head, notice, tail].join("\n\n");
}

// ── The Owner's follow-up ask ("show pages 5–8") ───────────────────────────

export interface PartRequest {
  from: number;
  to: number;
}

// Deliberately narrow: a number tied to a page/slide/part word, in either
// language. A stray number in ordinary talk must not trigger an injection —
// so bare 「张」 is NOT accepted (第3张 usually means the third PHOTO), only
// 「张幻灯片」; and full range phrasing (「第5页到第8页」, "page 5 to page 8")
// is read as the range, never silently narrowed to its first page.
const ZH_RANGE =
  /第\s*(\d+)\s*(?:页|部分|张幻灯片)?\s*(?:[-–—~]|到|至)\s*(?:第\s*)?(\d+)\s*(?:页|部分|张幻灯片)/u;
const ZH_SINGLE = /第\s*(\d+)\s*(?:页|部分|张幻灯片)/u;
const EN_REQUEST =
  /\b(?:pages?|slides?|parts?)\s*(\d+)(?:\s*(?:[-–—~]|to)\s*(?:(?:pages?|slides?|parts?)\s*)?(\d+))?/iu;

export function parsePartRequest(message: string): PartRequest | null {
  const match =
    ZH_RANGE.exec(message) ??
    ZH_SINGLE.exec(message) ??
    EN_REQUEST.exec(message);
  if (!match) return null;
  const first = Number(match[1]);
  const second = match[2] ? Number(match[2]) : first;
  if (!Number.isFinite(first) || first < 1 || second < 1) return null;
  return { from: Math.min(first, second), to: Math.max(first, second) };
}

// ── Serving a part, bounded ────────────────────────────────────────────────

export function sliceDocumentPart(
  text: string,
  from: number,
  to: number,
  budget = DOCUMENT_INLINE_BUDGET_CHARS,
): { label: string; text: string } | null {
  const catalog = catalogDocumentText(text);
  const sliced = catalog.slice(from, to);
  if (sliced === null || !sliced.trim()) return null;
  const units = unitWord(catalog.kind);
  const label =
    from === to
      ? `${units.slice(0, -1)} ${from}`
      : `${units} ${from}–${Math.min(to, catalog.count)}`;
  if (sliced.length <= budget) return { label, text: sliced };
  return {
    label,
    text: `${sliced.slice(0, budget)}\n(Cut at the size limit — ask for fewer ${units} at once.)`,
  };
}

// ── The live reader lent to tool-loop backends ─────────────────────────────

// Like FetchAccess: the LIVE access, passed per call, never looked up by the
// backend itself. It reads only the one document the caller resolved from
// the conversation's own rows — there is no path or id for the model to
// choose, so there is nothing to escape.
export interface DocumentSpillAccess {
  documentName: string | null;
  unit: "pages" | "slides" | "parts";
  count: number;
  // Returns the part's text, or throws DocumentPartError with a sentence fit
  // to show the model verbatim (a refusal is an answer, not a crash).
  read(from: number, to: number): string;
}

export class DocumentPartError extends Error {}

export function createDocumentSpillAccess(
  dataDirectory: string,
  document: { documentId: string; documentName: string | null },
): DocumentSpillAccess | null {
  const text = readDocumentText(dataDirectory, document.documentId);
  if (!text) return null;
  const catalog = catalogDocumentText(text);
  return {
    documentName: document.documentName,
    unit: catalog.kind,
    count: catalog.count,
    read(from, to) {
      if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1) {
        throw new DocumentPartError(
          `Ask for ${unitWord(catalog.kind)} by number, starting at 1.`,
        );
      }
      const part = sliceDocumentPart(text, from, to);
      if (!part) {
        // Two honest refusals, not one lie: pages with no extracted text
        // (a pure drawing, a blank) never got a [page N] marker, so an
        // in-range ask that finds nothing means "nothing was READ there" —
        // which is not the same as "the document has no such page".
        if (from <= catalog.count && to >= 1) {
          throw new DocumentPartError(
            `${unitWord(catalog.kind)} ${from}–${to} exist but produced no text when the document was read (a drawing or blank page has no text layer) — there is nothing saved to show for them.`,
          );
        }
        throw new DocumentPartError(
          `The saved text has ${catalog.count} ${unitWord(catalog.kind)} — ${from}–${to} is outside them.`,
        );
      }
      return part.text;
    },
  };
}
