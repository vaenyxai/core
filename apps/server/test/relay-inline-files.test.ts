import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { decodeRelayInlineFile } from "../src/modules/core/relay-inline-files.js";
const data = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
const file = {
  name: "synthetic.png",
  mime: "image/png",
  sha256: createHash("sha256").update(data).digest("hex"),
  inline_base64: data.toString("base64"),
};
describe("bounded App inline files", () => {
  it("decodes only exact hashed type-matched bytes without network access", () => {
    expect(decodeRelayInlineFile(file, 1024)?.body.equals(data)).toBe(true);
    expect(
      decodeRelayInlineFile(
        { name: "remote", url: "https://example.test/file" },
        1024,
      ),
    ).toBeNull();
  });
  it("rejects mixed sources, invalid data, changed hashes, MIME spoofing and configured size overruns", () => {
    for (const patch of [
      { url: "https://example.test/file" },
      { file_ref: { version: 1 as const, token: "synthetic" } },
      { sha256: "0".repeat(64) },
      { mime: "application/pdf" },
      { inline_base64: "A===" },
      { inline_base64: "" },
      { sha256: null },
    ]) {
      expect(() => decodeRelayInlineFile({ ...file, ...patch }, 1024)).toThrow(
        /RELAY_/,
      );
    }
    expect(() => decodeRelayInlineFile(file, 4)).toThrow(
      "RELAY_FILE_TOO_LARGE",
    );
  });
});
