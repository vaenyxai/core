// Codex App Server accepts local images, not PDF files. This adapter keeps the
// difference inside Vaenyx: a linked PDF is decoded in memory, rendered into
// short-lived page images, and only those page images are handed to Codex.
// No API upload, billing key, browser profile or caller-visible file path is
// involved.
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { createCanvas } from "@napi-rs/canvas";

export const MAX_RELAY_PDF_PAGES = 20;
const MAX_PAGE_LONG_EDGE = 1_800;
const DEFAULT_SCALE = 2;

const require = createRequire(import.meta.url);

interface PdfPage {
  getViewport: (options: { scale: number }) => {
    height: number;
    width: number;
  };
  render: (options: Record<string, unknown>) => { promise: Promise<void> };
}

interface PdfDocument {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
}

interface PdfLoadingTask {
  promise: Promise<PdfDocument>;
  destroy: () => Promise<void>;
}

async function loadPdfJs(): Promise<{
  getDocument: (options: Record<string, unknown>) => PdfLoadingTask;
}> {
  const entry = require.resolve("pdfjs-dist/legacy/build/pdf.mjs");
  return (await import(pathToFileURL(entry).href)) as {
    getDocument: (options: Record<string, unknown>) => PdfLoadingTask;
  };
}

/** Render every page to a bounded PNG and return only paths inside `directory`.
 * The caller owns that scratch directory and deletes it after the model call. */
export async function renderRelayPdfPages(
  pdf: Buffer,
  directory: string,
): Promise<string[]> {
  const pdfjs = await loadPdfJs();
  const standardFonts = pathToFileURL(
    resolve(require.resolve("pdfjs-dist/package.json"), "..", "standard_fonts"),
  ).href.replace(/\/?$/, "/");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdf),
    isEvalSupported: false,
    standardFontDataUrl: standardFonts,
    useSystemFonts: false,
  });

  try {
    const document = await loadingTask.promise;
    if (document.numPages < 1) throw new Error("RELAY_PDF_UNREADABLE");
    if (document.numPages > MAX_RELAY_PDF_PAGES) {
      throw new Error("RELAY_PDF_TOO_MANY_PAGES");
    }

    const paths: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(
        DEFAULT_SCALE,
        MAX_PAGE_LONG_EDGE / Math.max(base.width, base.height),
      );
      const viewport = page.getViewport({ scale });
      const width = Math.max(1, Math.ceil(viewport.width));
      const height = Math.max(1, Math.ceil(viewport.height));
      const canvas = createCanvas(width, height);
      const context = canvas.getContext("2d");
      await page.render({
        background: "#ffffff",
        canvas,
        canvasContext: context,
        viewport,
      }).promise;
      const path = resolve(
        directory,
        `pdf-page-${String(pageNumber).padStart(3, "0")}.png`,
      );
      writeFileSync(path, canvas.toBuffer("image/png"));
      paths.push(path);
    }
    return paths;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "RELAY_PDF_TOO_MANY_PAGES" ||
        error.message === "RELAY_PDF_UNREADABLE")
    ) {
      throw error;
    }
    throw new Error("RELAY_PDF_UNREADABLE", { cause: error });
  } finally {
    await loadingTask.destroy().catch(() => undefined);
  }
}
