import { describe, expect, it } from "vitest";

import {
  DRAFT_RETENTION_MS,
  createComposerDraft,
  draftKey,
  isExpiredDraft,
  persistWithAttachmentFallback,
  type DraftScope,
} from "./draft-recovery";

const scope: DraftScope = {
  ownerId: "owner/a",
  modeId: "mode|home",
  kind: "conversation",
  scopeId: "chat one",
};

describe("device draft recovery", () => {
  it("separates owner, mode, surface and conversation boundaries", () => {
    const base = draftKey(scope);
    expect(base).not.toBe(draftKey({ ...scope, ownerId: "owner/b" }));
    expect(base).not.toBe(draftKey({ ...scope, modeId: "mode/work" }));
    expect(base).not.toBe(draftKey({ ...scope, kind: "task" }));
    expect(base).not.toBe(draftKey({ ...scope, scopeId: "chat two" }));
    expect(base).toContain("owner%2Fa");
  });

  it("expires a draft only after fourteen days", () => {
    const now = Date.parse("2026-09-02T00:00:00.000Z");
    expect(
      isExpiredDraft(
        { updatedAt: new Date(now - DRAFT_RETENTION_MS).toISOString() },
        now,
      ),
    ).toBe(false);
    expect(
      isExpiredDraft(
        { updatedAt: new Date(now - DRAFT_RETENTION_MS - 1).toISOString() },
        now,
      ),
    ).toBe(true);
  });

  it("keeps text and names omitted attachments when device quota is full", async () => {
    const draft = createComposerDraft(scope, {
      text: "Please keep this",
      attachments: [
        {
          id: "photo-1",
          kind: "photo",
          name: "receipt.jpg",
          type: "image/jpeg",
          size: 3,
          blob: new Blob(["abc"], { type: "image/jpeg" }),
          serverId: null,
        },
      ],
    });
    const writes: (typeof draft)[] = [];
    const outcome = await persistWithAttachmentFallback(
      draft,
      async (record) => {
        writes.push(record);
        if (record.attachments.length) {
          throw new DOMException("full", "QuotaExceededError");
        }
      },
    );

    expect(writes).toHaveLength(2);
    expect(outcome.record.text).toBe("Please keep this");
    expect(outcome.record.attachments).toEqual([]);
    expect(outcome.result.attachmentOmittedNames).toEqual(["receipt.jpg"]);
  });
});
