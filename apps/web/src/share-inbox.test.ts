// H-012 · what a shared payload becomes in one unsent draft.
import { describe, expect, it } from "vitest";

import {
  isExpiredShare,
  planShare,
  SHARE_MAX_PHOTOS,
  type PendingShare,
  type SharedFile,
} from "./share-inbox.js";

function file(name: string, type: string): SharedFile {
  return { name, type, size: 10, blob: new Blob(["x"], { type }) };
}

function share(overrides: Partial<PendingShare>): PendingShare {
  return {
    id: "s1",
    createdAt: new Date().toISOString(),
    title: "",
    text: "",
    url: "",
    files: [],
    ...overrides,
  };
}

describe("placing a shared payload", () => {
  it("takes a PDF from a mail app as the message's document", () => {
    const plan = planShare(
      share({ title: "School notice", files: [file("excursion.pdf", "application/pdf")] }),
    );
    expect(plan.document?.name).toBe("excursion.pdf");
    expect(plan.photos).toEqual([]);
    expect(plan.text).toBe("School notice");
    expect(plan.refused).toEqual([]);
  });

  it("joins title, text and link without repeating them", () => {
    const plan = planShare(
      share({
        title: "Term dates",
        text: "Term dates https://school.example.test/terms",
        url: "https://school.example.test/terms",
      }),
    );
    expect(plan.text).toBe("Term dates https://school.example.test/terms");
  });

  it("keeps up to five photos and one document, and names what was left out", () => {
    const photos = Array.from({ length: SHARE_MAX_PHOTOS + 1 }, (_, index) =>
      file(`photo-${index}.jpg`, "image/jpeg"),
    );
    const plan = planShare(
      share({
        files: [
          ...photos,
          file("a.pdf", "application/pdf"),
          file("b.docx", ""),
          file("clip.mp4", "video/mp4"),
        ],
      }),
    );
    expect(plan.photos).toHaveLength(SHARE_MAX_PHOTOS);
    expect(plan.document?.name).toBe("a.pdf");
    expect(plan.refused).toEqual([
      { name: "photo-5.jpg", reason: "photo-limit" },
      { name: "b.docx", reason: "one-document" },
      { name: "clip.mp4", reason: "type" },
    ]);
  });

  it("drops a share nobody placed after fourteen days", () => {
    const now = Date.parse("2026-09-26T00:00:00.000Z");
    expect(
      isExpiredShare(share({ createdAt: "2026-09-20T00:00:00.000Z" }), now),
    ).toBe(false);
    expect(
      isExpiredShare(share({ createdAt: "2026-09-01T00:00:00.000Z" }), now),
    ).toBe(true);
  });
});
