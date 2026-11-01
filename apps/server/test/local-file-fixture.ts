import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { LocalFileInput } from "../src/modules/core/local-file-types.js";

export function localFileFixture(directory: string): LocalFileInput {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>",
    "<< /Length 0 >>\nstream\n\nendstream",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((object, index) => {
    const offset = Buffer.byteLength(pdf);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xref = Buffer.byteLength(pdf);
  pdf +=
    "xref\n0 5\n0000000000 65535 f \n" +
    offsets
      .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
      .join("");
  pdf += `trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const path = join(directory, "synthetic.pdf");
  writeFileSync(path, pdf);
  const sha256 = createHash("sha256").update(pdf).digest("hex");
  return {
    id: "segment",
    name: "Synthetic.pdf",
    path,
    sha256,
    original_sha256: sha256,
    original_page_count: 1,
    original_from: 1,
    original_to: 1,
    page_count: 1,
    allowed_pages: { from: 1, to: 1 },
  };
}
