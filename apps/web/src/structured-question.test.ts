import { describe, expect, it } from "vitest";

import type { AskVaenyxMessage } from "@vaenyx/contracts";

import { questionPart, visibleMessageContent } from "./structured-question.js";

function message(content: string): AskVaenyxMessage {
  return {
    id: "message",
    conversationId: "conversation",
    role: "assistant",
    content,
    status: "completed",
    webSearchUsed: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    parts: [
      {
        type: "structured-question",
        version: 1,
        questionId: "question",
        prompt: "Which route?",
        helpText: null,
        options: [
          { id: "option-1", label: "Scenic" },
          { id: "option-2", label: "Fast" },
        ],
        allowFreeText: true,
        allowSkip: true,
        plainTextFallback: "Which route?\n- Scenic\n- Fast",
        state: { status: "open" },
      },
    ],
  };
}

describe("structured question presentation", () => {
  it("replaces only the exact fallback suffix in the current client", () => {
    const withIntro = message(
      "I need one decision.\n\nWhich route?\n- Scenic\n- Fast",
    );
    expect(questionPart(withIntro)?.questionId).toBe("question");
    expect(visibleMessageContent(withIntro)).toBe("I need one decision.");

    const changed = message("Which route?\n- Scenic\n- Fast\nExtra text");
    expect(visibleMessageContent(changed)).toBe(changed.content);
  });

  it("keeps the ordinary content untouched for clients without a part", () => {
    const plain = message("Plain answer");
    delete plain.parts;
    expect(questionPart(plain)).toBeNull();
    expect(visibleMessageContent(plain)).toBe("Plain answer");
  });
});
