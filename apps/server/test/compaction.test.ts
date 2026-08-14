import { describe, expect, it } from "vitest";

import {
  CHECKPOINT_INSTRUCTION,
  CHECKPOINT_SECTIONS,
  pairSafeCutIndex,
  windowStartIndex,
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

  it("gives up on a run longer than the walk bound instead of ballooning the window", () => {
    // A scheduled task's thread can hold hundreds of assistant results in a
    // row (review, 2026-08-15). An unbounded walk would retreat past the
    // whole run and ship it all verbatim on every turn. Past the bound, the
    // cut stays at the base index — a run that long is not a pair.
    const history = conversation("o" + "a".repeat(120) + "oa".repeat(5));
    const base = history.length - 30;
    expect(history[base]?.role).toBe("assistant");
    expect(pairSafeCutIndex(history)).toBe(base);
  });

  it("compacts at the base even when only assistant messages surround it", () => {
    const history = conversation("a".repeat(40));
    expect(pairSafeCutIndex(history)).toBe(10);
  });
});

describe("windowStartIndex", () => {
  it("starts the window at the checkpoint's real seam, so nothing sits in neither", () => {
    // Checkpoint covers 20, cut sits at 27 (refresh pending): the window
    // must reach back to 20 or messages 20–26 vanish from both sides.
    expect(windowStartIndex(27, 20)).toBe(20);
    // Fresh checkpoint: seam and cut agree.
    expect(windowStartIndex(30, 30)).toBe(30);
    // A checkpoint that covers MORE than the cut (the cut walked back):
    // start at the cut — overlap is safe, a hole is not.
    expect(windowStartIndex(25, 30)).toBe(25);
  });

  it("bounds the window when compaction keeps failing", () => {
    // Covered stuck at 0 while the conversation grew to 300: the window may
    // not grow without limit — it floors at three full windows back.
    expect(windowStartIndex(270, 0)).toBe(180);
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
