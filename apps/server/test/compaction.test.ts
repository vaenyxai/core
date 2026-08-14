import { describe, expect, it } from "vitest";

import {
  CHECKPOINT_INSTRUCTION,
  CHECKPOINT_SECTIONS,
  pairSafeCutIndex,
} from "../src/modules/core/ask-vaenyx.js";

type Role = "owner" | "assistant";
const msg = (role: Role) => ({ role });

// Build a conversation as a role string: "oa" = owner then assistant.
const conversation = (pattern: string) =>
  [...pattern].map((ch) => msg(ch === "o" ? "owner" : "assistant"));

describe("pairSafeCutIndex", () => {
  it("keeps everything verbatim while the window is not full", () => {
    expect(pairSafeCutIndex([])).toBe(0);
    expect(pairSafeCutIndex(conversation("oa".repeat(15)))).toBe(0);
  });

  it("cuts exactly at the window edge when it lands on an Owner message", () => {
    // 40 messages alternating owner/assistant: index 10 is an owner message
    // (even indexes are owners), so the raw cut stands.
    const history = conversation("oa".repeat(20));
    expect(history[10]?.role).toBe("owner");
    expect(pairSafeCutIndex(history)).toBe(10);
  });

  it("walks back when the boundary would split an Owner message from its replies", () => {
    // 41 messages: index 11 (raw cut) is an assistant reply, whose owner
    // question sits at index 10 — the cut must move back to the owner so the
    // pair stays whole on the verbatim side. This is exactly the attachment
    // case: the owner message carries the file, the reply interprets it.
    const history = conversation("o" + "ao".repeat(20));
    expect(history[11]?.role).toBe("assistant");
    expect(pairSafeCutIndex(history)).toBe(10);
    expect(history[10]?.role).toBe("owner");
  });

  it("walks back across a whole run of assistant messages", () => {
    // A scheduled task can append several assistant messages in a row; the
    // cut walks past the entire run to the owner message that started it.
    // 39 messages; the raw cut (39 - 30 = 9) lands mid-run at an assistant,
    // and the owner that started the run sits at index 6.
    const history = conversation("oaoaoa" + "o" + "aaaa" + "oa".repeat(14));
    expect(history).toHaveLength(39);
    expect(history[9]?.role).toBe("assistant");
    expect(pairSafeCutIndex(history)).toBe(6);
    expect(history[6]?.role).toBe("owner");
  });

  it("compacts nothing when only assistant messages would remain", () => {
    const history = conversation("a".repeat(40));
    expect(pairSafeCutIndex(history)).toBe(0);
  });
});

describe("CHECKPOINT_INSTRUCTION", () => {
  it("demands every section, in order", () => {
    let lastIndex = -1;
    for (const section of CHECKPOINT_SECTIONS) {
      const index = CHECKPOINT_INSTRUCTION.indexOf(section);
      expect(index, `${section} missing`).toBeGreaterThan(lastIndex);
      lastIndex = index;
    }
    expect(CHECKPOINT_SECTIONS).toHaveLength(6);
  });

  it("carries the three disciplines: empty sections stay, prior checkpoints merge, exact values verbatim", () => {
    expect(CHECKPOINT_INSTRUCTION).toContain('"(none)"');
    expect(CHECKPOINT_INSTRUCTION).toContain("Never drop or rename a section");
    expect(CHECKPOINT_INSTRUCTION).toContain("PRIOR checkpoint");
    expect(CHECKPOINT_INSTRUCTION).toContain(
      "merge everything into this one new checkpoint",
    );
    expect(CHECKPOINT_INSTRUCTION).toContain(
      "numbers, dates, names, amounts and identifiers verbatim",
    );
  });

  it("forbids mentioning the compaction itself", () => {
    expect(CHECKPOINT_INSTRUCTION).toContain(
      "Do not mention this request, the checkpoint itself, or that anything was condensed",
    );
  });
});
