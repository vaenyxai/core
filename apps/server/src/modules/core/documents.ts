// Document Reading (Oskar, 2026-07-29): a PDF dropped into a chat is read by
// the model the way a person reads it — every page as a picture AND as text.
// That is why it is expensive, and why the M1 gate stands in front of it.
//
// This module owns the local side: storing the file, counting its pages, and
// refusing what cannot be read with a reason the Owner can act on. Nothing
// here talks to a model; the page count exists so the gate can name it.
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  detectOfficeKind,
  extractOfficeText,
  isLegacyOfficeDocument,
} from "./office.js";

const require = createRequire(import.meta.url);

// Provider limits (Anthropic's documented ceilings, 2026-07-29). A file over
// them is refused HERE, with the number, instead of failing mid-request.
export const MAX_DOCUMENT_BYTES = 32 * 1024 * 1024;
export const MAX_DOCUMENT_PAGES = 600;
// At or above this, the Owner is shown the cost gate before anything is spent
// (copy pack M1). A product threshold, not a legal floor: a receipt or a
// two-page quote must not be interrupted, and a gate that fires on everything
// is one people learn to dismiss without reading.
export const DOCUMENT_GATE_PAGES = 10;

// Extraction sanity ceiling. NOT the context bound — that is spill mode's
// job (document-spill.ts): text over the inline budget is saved whole and
// served in parts, so cutting it low here would lose pages spill can serve.
export const MAX_EXTRACTED_TEXT_CHARS = 2_000_000;

const DOCUMENT_ID_PATTERN = /^[0-9a-f-]{36}\.pdf$/;

// Backends that read a PDF the way the M1 copy describes — every page as a
// picture as well as text, via a native document block (probe-verified for
// the Agent SDK, 2026-07-29). Anything else gets locally extracted text, and
// the M1 gate is NOT shown for that path because its sentence would not be
// true of it.
export const DOCUMENT_NATIVE_PROVIDER_IDS = ["claude-sub", "anthropic"];

function documentsDirectory(dataDirectory: string): string {
  return resolve(dataDirectory, "documents");
}

export function saveDocument(dataDirectory: string, file: Buffer): string {
  const id = `${randomUUID()}.pdf`;
  const directory = documentsDirectory(dataDirectory);
  mkdirSync(directory, { recursive: true });
  writeFileSync(resolve(directory, id), file);
  return id;
}

export function readDocument(
  dataDirectory: string,
  documentId: string,
): Buffer | null {
  if (!DOCUMENT_ID_PATTERN.test(documentId)) return null;
  const path = resolve(documentsDirectory(dataDirectory), documentId);
  if (!existsSync(path)) return null;
  try {
    return readFileSync(path);
  } catch {
    return null;
  }
}

// The extracted-text sidecar (spill mode, see document-spill.ts): when a
// document's text is too big to ride the context whole, the WHOLE text is
// saved next to the original — same directory, same id, ".txt" appended —
// so any part of it can be served later. Honest note: documents have no
// delete/GC path at all today, and the sidecar shares that gap — both stay
// on disk until a cleanup feature exists. It holds nothing the original
// file does not already hold, and userdata/ never enters git or a deploy.
function documentTextPath(dataDirectory: string, documentId: string): string {
  return resolve(documentsDirectory(dataDirectory), `${documentId}.txt`);
}

export function saveDocumentText(
  dataDirectory: string,
  documentId: string,
  text: string,
): boolean {
  if (!DOCUMENT_ID_PATTERN.test(documentId)) return false;
  try {
    mkdirSync(documentsDirectory(dataDirectory), { recursive: true });
    writeFileSync(documentTextPath(dataDirectory, documentId), text, "utf8");
    return true;
  } catch {
    return false;
  }
}

export function hasDocumentText(
  dataDirectory: string,
  documentId: string,
): boolean {
  if (!DOCUMENT_ID_PATTERN.test(documentId)) return false;
  return existsSync(documentTextPath(dataDirectory, documentId));
}

export function readDocumentText(
  dataDirectory: string,
  documentId: string,
): string | null {
  if (!DOCUMENT_ID_PATTERN.test(documentId)) return null;
  const path = documentTextPath(dataDirectory, documentId);
  if (!existsSync(path)) return null;
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

// pdf.js in plain Node (probe-verified): page count and per-page text with no
// canvas and no native build. The legacy build is the Node-safe entry point.
async function loadPdfJs(): Promise<{
  getDocument: (options: Record<string, unknown>) => {
    promise: Promise<PdfDoc>;
  };
}> {
  // pathToFileURL, not a hand-built "file:///" template: Windows paths need
  // real encoding, and a template literal makes bundlers warn about an import
  // they cannot resolve statically.
  const path = pathToFileURL(
    require.resolve("pdfjs-dist/legacy/build/pdf.mjs"),
  ).href;
  return (await import(path)) as {
    getDocument: (options: Record<string, unknown>) => {
      promise: Promise<PdfDoc>;
    };
  };
}

interface PdfDoc {
  numPages: number;
  getPage: (page: number) => Promise<{
    getTextContent: () => Promise<{ items: { str?: string }[] }>;
  }>;
}

export interface DocumentFacts {
  pages: number;
  /** A PDF whose pages carry no extractable text: pictures of words. Reading
   *  it at all means OCR — the eighth capability, kept separate on purpose. */
  scanned?: boolean;
}

// One attach button, several kinds behind it (Oskar, 2026-08-06): the split
// lives HERE, not in the UI — a PDF and a text file are different pipelines,
// not different buttons.
export function isPdfDocument(file: Buffer): boolean {
  return file.subarray(0, 5).toString("latin1") === "%PDF-";
}

// Plain text, decided by content rather than extension (a renamed file must
// not sneak a binary through): no NUL byte in the head, and the bytes decode
// as UTF-8 without drowning in replacement characters.
export function isTextDocument(file: Buffer): boolean {
  const head = file.subarray(0, 4096);
  if (head.includes(0)) return false;
  const decoded = head.toString("utf8");
  const bad = (decoded.match(/�/g) ?? []).length;
  return decoded.length > 0 && bad / decoded.length < 0.05;
}

// Read the facts the gate needs. Every failure mode gets its own code so the
// Owner is told what is actually wrong — a password-protected file must never
// look like "something went wrong".
export async function inspectDocument(file: Buffer): Promise<DocumentFacts> {
  if (file.length > MAX_DOCUMENT_BYTES) {
    throw new Error("DOCUMENT_TOO_LARGE");
  }
  // A text file has no pages, so it can never trip the page-cost gate — which
  // is right: the gate exists because a PDF is read as pictures on a paid
  // model, and words alone are the cheap path. Office files (docx/xlsx/pptx)
  // ride the same words path, so they are pages: 1 too — but their extraction
  // runs HERE, at upload time, so a broken, encrypted or bomb-shaped file is
  // refused at the door instead of failing silently mid-chat.
  if (!isPdfDocument(file)) {
    if (detectOfficeKind(file)) {
      try {
        extractOfficeText(file);
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        if (code === "OFFICE_ENCRYPTED") {
          throw new Error("DOCUMENT_PASSWORD", { cause: error });
        }
        if (code === "OFFICE_TOO_LARGE") {
          throw new Error("DOCUMENT_UNPACKS_TOO_LARGE", { cause: error });
        }
        throw new Error("DOCUMENT_UNREADABLE", { cause: error });
      }
      return { pages: 1 };
    }
    // The old binary Office formats are refused by NAME (of the format, never
    // of the file) so the fix — save as PDF or as the modern format — can be
    // said precisely instead of hiding in the generic sentence.
    if (isLegacyOfficeDocument(file)) {
      throw new Error("DOCUMENT_LEGACY_OFFICE");
    }
    if (isTextDocument(file)) return { pages: 1 };
    throw new Error("DOCUMENT_UNREADABLE");
  }
  const pdfjs = await loadPdfJs();
  let doc: PdfDoc;
  try {
    doc = await pdfjs.getDocument({
      data: new Uint8Array(file),
      isEvalSupported: false,
      useSystemFonts: false,
    }).promise;
  } catch (error) {
    const name = (error as { name?: string })?.name ?? "";
    if (name === "PasswordException") {
      throw new Error("DOCUMENT_PASSWORD", { cause: error });
    }
    throw new Error("DOCUMENT_UNREADABLE", { cause: error });
  }
  if (doc.numPages > MAX_DOCUMENT_PAGES) {
    throw new Error("DOCUMENT_TOO_MANY_PAGES");
  }
  // A first-page text probe decides "scanned": a page of prose always yields
  // SOMETHING, a scan yields nothing. Cheap (one page), and honest enough —
  // a mixed document with a text first page reads as text, which is what the
  // extraction path would do with it anyway.
  try {
    const page = await doc.getPage(1);
    const content = await page.getTextContent();
    const probe = content.items
      .map((item) => item.str ?? "")
      .join("")
      .trim();
    // Strictly EMPTY, not merely short: a real scan's text layer yields
    // nothing at all, while a genuine one-word page ("PAGE 1", a cover sheet)
    // yields its word — and calling that a scan would push a readable page
    // through a paid OCR call for nothing.
    if (probe.length === 0) return { pages: doc.numPages, scanned: true };
  } catch {
    return { pages: doc.numPages, scanned: true };
  }
  return { pages: doc.numPages };
}

// Text fallback for backends that cannot take a document natively. Never the
// primary path: it loses everything the page images carry (drawings, tables,
// layout), which is exactly why the M1 copy is only shown for the real path.
export async function extractDocumentText(
  file: Buffer,
  maxPages = MAX_DOCUMENT_PAGES,
): Promise<string> {
  // Office files become their words here — never a native document block, on
  // any backend: the native path is a PDF thing, and pretending a spreadsheet
  // went that way would make the M1 cost sentence a lie. A text file IS its
  // own extraction. The caps here are sanity ceilings only (a 32 MiB file
  // cannot produce more): spill mode (document-spill.ts) is what keeps the
  // model context bounded now, and a low cap HERE would silently cut off
  // pages that spill could otherwise serve on request.
  if (!isPdfDocument(file)) {
    if (detectOfficeKind(file)) return extractOfficeText(file);
    const text = file.toString("utf8");
    // Even the sanity ceiling is never SILENT (the promise the manual
    // makes): when it fires, the text says so, so neither the model nor a
    // saved spill sidecar can mistake the cut for the end of the document.
    return text.length > MAX_EXTRACTED_TEXT_CHARS
      ? `${text.slice(0, MAX_EXTRACTED_TEXT_CHARS)}\n[cut at the ${MAX_EXTRACTED_TEXT_CHARS.toLocaleString("en-US")}-character safety ceiling — the file goes on beyond this]`
      : text;
  }
  const pdfjs = await loadPdfJs();
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(file),
    isEvalSupported: false,
    useSystemFonts: false,
  }).promise;
  const pages: string[] = [];
  const limit = Math.min(doc.numPages, maxPages);
  for (let index = 1; index <= limit; index += 1) {
    const page = await doc.getPage(index);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => item.str ?? "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) pages.push(`[page ${index}]\n${text}`);
  }
  return pages.join("\n\n");
}
