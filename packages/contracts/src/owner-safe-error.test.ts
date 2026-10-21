import { Value } from "@sinclair/typebox/value";
import { describe, expect, it } from "vitest";

import {
  formatOwnerSafeError,
  OwnerSafeErrorSchema,
  ownerSafeErrorCopy,
} from "./owner-safe-error.js";

describe("OwnerSafeError", () => {
  it("has a stable public shape for API and UI use", () => {
    const error = {
      action: "retry" as const,
      code: "VX-MODEL-RESPONSE" as const,
      dataSafe: true as const,
      diagnosticId: "vx-example-1234",
      message: ownerSafeErrorCopy("VX-MODEL-RESPONSE", "en").message,
      retryable: true,
    };

    expect(Value.Check(OwnerSafeErrorSchema, error)).toBe(true);
    expect(formatOwnerSafeError(error, "en")).toContain(
      "Error VX-MODEL-RESPONSE · Diagnostic vx-example-1234",
    );
    expect(formatOwnerSafeError(error, "zh")).toContain(
      "错误 VX-MODEL-RESPONSE · 诊断编号 vx-example-1234",
    );
  });

  it("keeps named model refusals when the browser changes language", () => {
    const error = {
      ...ownerSafeErrorCopy("VX-MODEL-RESPONSE", "en"),
      code: "VX-MODEL-RESPONSE" as const,
      dataSafe: true as const,
      diagnosticId: "vx-test-model-refusal",
      modelRefusal: {
        requestedModel: "chosen-model",
        refusedModel: "refused-model",
      },
    };
    expect(Value.Check(OwnerSafeErrorSchema, error)).toBe(true);
    expect(formatOwnerSafeError(error, "en")).toContain(
      "Codex refused model refused-model (selected: chosen-model)",
    );
    expect(formatOwnerSafeError(error, "zh")).toContain(
      "Codex 拒绝使用模型 refused-model（本次选择：chosen-model）",
    );
  });

  it("gives equivalent English and Chinese remedies", () => {
    const en = ownerSafeErrorCopy("VX-MODEL-CONNECT", "en");
    const zh = ownerSafeErrorCopy("VX-MODEL-CONNECT", "zh");

    expect(en.action).toBe("reconnect");
    expect(zh.action).toBe("reconnect");
    expect(en.retryable).toBe(false);
    expect(zh.retryable).toBe(false);
    expect(en.message).toContain("Settings");
    expect(zh.message).toContain("设置");
  });
});
