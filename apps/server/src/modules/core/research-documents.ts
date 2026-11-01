import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { extractDocumentText } from "./documents.js";

const require = createRequire(import.meta.url);
interface Pdf {
  numPages: number;
  getPage(
    page: number,
  ): Promise<{ getTextContent(): Promise<{ items: { str?: string }[] }> }>;
}
export interface ResearchDocument {
  pageCount: number | null;
  parts: string[];
  representation: "extracted_text" | "html_text";
  reason: string | null;
}
export function htmlResearchText(html: string): string {
  return html
    .replace(
      /<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
      " ",
    )
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_all, code: string) => {
      const n = Number(code);
      return n <= 0x10ffff ? String.fromCodePoint(n) : "";
    })
    .replace(/\s+/g, " ")
    .trim();
}
export async function readResearchDocument(
  body: Buffer,
  mime: string,
  signal: AbortSignal,
): Promise<ResearchDocument> {
  signal.throwIfAborted();
  if (body.subarray(0, 5).toString() === "%PDF-") {
    const pdfjs = (await import(
      pathToFileURL(require.resolve("pdfjs-dist/legacy/build/pdf.mjs")).href
    )) as {
      getDocument(options: unknown): {
        promise: Promise<Pdf>;
        destroy(): Promise<void>;
      };
    };
    const loading = pdfjs.getDocument({
      data: new Uint8Array(body),
      isEvalSupported: false,
      useSystemFonts: false,
    });
    try {
      const pdf = await loading.promise;
      if (pdf.numPages > 600) throw new Error("input_too_large");
      const parts: string[] = [];
      let count = 0;
      for (let page = 1; page <= pdf.numPages; page++) {
        signal.throwIfAborted();
        const content = await (await pdf.getPage(page)).getTextContent();
        const text = content.items
          .map((item) => item.str ?? "")
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        count += text.length;
        if (count > 2_000_000) throw new Error("input_too_large");
        parts.push(text);
      }
      return {
        pageCount: pdf.numPages,
        parts,
        representation: "extracted_text",
        reason:
          "Text layer only; drawings and scanned text require page images.",
      };
    } finally {
      await loading.destroy();
    }
  }
  if (mime === "text/html")
    return {
      pageCount: null,
      parts: [htmlResearchText(body.toString("utf8"))],
      representation: "html_text",
      reason:
        "Static HTML only; scripts, interactive expansion and visual layout were not read.",
    };
  if (!mime.startsWith("text/") && !/officedocument/.test(mime))
    throw new Error("unsupported_document");
  const text = await extractDocumentText(body);
  if (text.includes("-character safety ceiling") || text.length > 2_000_000)
    throw new Error("input_too_large");
  return {
    pageCount: null,
    parts: [text],
    representation: "extracted_text",
    reason: mime.startsWith("text/")
      ? null
      : "Text extraction only; layout and embedded images were not read.",
  };
}
