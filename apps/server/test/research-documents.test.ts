import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readResearchDocument } from "../src/modules/core/research-documents.js";
import { renderRelayPdfPages } from "../src/modules/core/relay-pdf.js";
function pdf(pages: number): Buffer {
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const kids: string[] = [];
  for (let page = 1; page <= pages; page++) {
    const pageId = objects.length + 1;
    const streamId = pageId + 1;
    kids.push(`${pageId} 0 R`);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 3 0 R >> >> /Contents ${streamId} 0 R >>`,
    );
    const stream =
      page === 40
        ? ""
        : `BT /F1 12 Tf 10 150 Td (Synthetic page ${page}) Tj ET`;
    objects.push(
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    );
  }
  objects[1] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages} >>`;
  let result = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(Buffer.byteLength(result));
    result += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(result);
  result +=
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets
      .slice(1)
      .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
      .join("");
  result += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(result);
}
describe("long research documents", () => {
  it.each([68, 108])(
    "keeps all %i physical pages including blank text pages and the final page",
    async (pages) => {
      const document = await readResearchDocument(
        pdf(pages),
        "application/pdf",
        new AbortController().signal,
      );
      expect(document.pageCount).toBe(pages);
      expect(document.parts).toHaveLength(pages);
      expect(document.parts[39]).toBe("");
      expect(document.parts[pages - 1]).toContain(`page ${pages}`);
    },
  );
  it("renders requested late pages without changing the legacy whole-PDF limit", async () => {
    const directory = mkdtempSync(join(tmpdir(), "research-pdf-test-"));
    try {
      await expect(renderRelayPdfPages(pdf(108), directory)).rejects.toThrow(
        "RELAY_PDF_TOO_MANY_PAGES",
      );
      const pages = await renderRelayPdfPages(pdf(108), directory, {
        from: 107,
        to: 108,
      });
      expect(pages).toHaveLength(2);
      expect(pages[1]).toContain("pdf-page-108.png");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
