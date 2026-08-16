// Feed or edit, inside a routine's chat: the verdict parser is pure and the
// promise it keeps is the owner's rule — an answer that cannot be read is
// "unsure", never a silent guess either way.
import { describe, expect, it } from "vitest";

import { parseRoutineChatDecision } from "../src/modules/core/routine-intent.js";

describe("parseRoutineChatDecision", () => {
  it("reads the three legal verdicts", () => {
    expect(parseRoutineChatDecision('{"decision":"feed"}')).toBe("feed");
    expect(parseRoutineChatDecision('{"decision":"edit"}')).toBe("edit");
    expect(parseRoutineChatDecision('{"decision":"unsure"}')).toBe("unsure");
  });

  it("reads a fenced or chatty answer", () => {
    expect(parseRoutineChatDecision('```json\n{"decision":"edit"}\n```')).toBe(
      "edit",
    );
    expect(
      parseRoutineChatDecision('Sure — {"decision":"feed"} is my call.'),
    ).toBe("feed");
  });

  it("degrades anything unreadable to unsure — ask, never guess", () => {
    expect(parseRoutineChatDecision("")).toBe("unsure");
    expect(parseRoutineChatDecision("no json here")).toBe("unsure");
    expect(parseRoutineChatDecision('{"decision":"banana"}')).toBe("unsure");
    expect(parseRoutineChatDecision('{"verdict":"feed"}')).toBe("unsure");
  });
});
