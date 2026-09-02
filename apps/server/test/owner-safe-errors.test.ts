import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  appendBoundedDiagnostic,
  configureOwnerErrorLog,
  OwnerDiagnosticError,
  ownerSafeErrorResponse,
  redactDiagnosticText,
} from "../src/runtime/owner-safe-errors.js";
import { installComponent } from "../src/modules/core/component-install.js";

const temporaries: string[] = [];

function scratchDataDirectory(): { dataDirectory: string; root: string } {
  const root = mkdtempSync(join(tmpdir(), "vaenyx-safe-error-"));
  temporaries.push(root);
  const dataDirectory = join(root, "db");
  mkdirSync(dataDirectory, { recursive: true });
  configureOwnerErrorLog(dataDirectory);
  return { dataDirectory, root };
}

afterEach(() => {
  while (temporaries.length) {
    rmSync(temporaries.pop() as string, { force: true, recursive: true });
  }
});

describe("owner-safe error boundary", () => {
  it("keeps raw process detail out of the API shape and redacts the local log", () => {
    const { root } = scratchDataDirectory();
    const raw = [
      "\u001b[31mprovider exploded\u001b[0m",
      String.raw`at run (C:\Users\Oskar\private\runner.js:42:9)`,
      "Authorization: Bearer top-secret-bearer",
      "api_key=sk-supersecret123456789",
      "second stderr line",
    ].join("\n");

    const response = ownerSafeErrorResponse(
      new OwnerDiagnosticError("CODEX_EXITED_1", raw),
      "model-response",
      "en",
    );
    const publicJson = JSON.stringify(response);

    expect(response.ownerError.code).toBe("VX-MODEL-START");
    expect(response.ownerError.dataSafe).toBe(true);
    expect(response.ownerError.diagnosticId).toMatch(/^vx-/);
    expect(publicJson).not.toContain("provider exploded");
    expect(publicJson).not.toContain("C:\\Users");
    expect(publicJson).not.toContain("top-secret-bearer");
    expect(publicJson).not.toContain("sk-supersecret");
    expect(publicJson).not.toContain("second stderr line");
    expect(publicJson).not.toContain("\u001b");

    const log = readFileSync(join(root, "logs", "owner-errors.log"), "utf8");
    expect(log).toContain(response.ownerError.diagnosticId);
    expect(log).toContain("CODEX_EXITED_1");
    expect(log).toContain("<path>");
    expect(log).toContain("<redacted>");
    expect(log).not.toContain("C:\\Users");
    expect(log).not.toContain("top-secret-bearer");
    expect(log).not.toContain("sk-supersecret");
    expect(log).not.toContain("\u001b");
  });

  it("bounds accumulated subprocess output and retained diagnostic text", () => {
    const accumulated = appendBoundedDiagnostic("a".repeat(20_000), "tail");
    expect(accumulated.length).toBe(16_384);
    expect(accumulated.endsWith("tail")).toBe(true);
    expect(redactDiagnosticText("x".repeat(20_000)).length).toBe(8_192);
  });

  it("returns the same correlated safe failure when a component cannot start", async () => {
    const { dataDirectory, root } = scratchDataDirectory();
    const blocker = join(root, "not-a-directory");
    writeFileSync(blocker, "blocked", "utf8");

    const result = await installComponent({
      dataDirectory,
      packageName: "unused-in-this-test",
      prefix: join(blocker, "component"),
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected the component install to fail.");
    expect(result.detail).toBe("VX-COMPONENT-INSTALL");
    expect(result.ownerError.code).toBe("VX-COMPONENT-INSTALL");
    expect(JSON.stringify(result)).not.toContain(root);

    const log = readFileSync(join(root, "logs", "owner-errors.log"), "utf8");
    expect(log).toContain(result.ownerError.diagnosticId);
    expect(log).not.toContain(root);
  });
});
