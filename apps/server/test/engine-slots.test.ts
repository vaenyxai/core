// The two rules the whole primary/backup design rests on (Oskar, 2026-08-16):
// the app never chooses the backup, and a fallback is never silent. Plus the
// line between "could not answer at all" (a stand-in helps) and "answered
// badly" (a stand-in only hides it).
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  backupNoteSentence,
  deservesBackup,
  explainEngineFailure,
  readEnginePair,
  runWithBackup,
  writeEngineChoice,
} from "../src/modules/models/engine-slots.js";

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    try {
      cleanup();
    } catch {
      // Best-effort temp cleanup.
    }
  }
});

function secrets(initial: Record<string, unknown> = {}): string {
  const dir = mkdtempSync(resolve(tmpdir(), "vaenyx-slots-"));
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "model-providers.json"),
    JSON.stringify(initial),
    "utf8",
  );
  return dir;
}

describe("reading and writing a slot", () => {
  it("keeps primary and backup apart, and an empty backup means none", () => {
    const dir = secrets({ gemini: { apiKey: "k" }, mistral: { apiKey: "k" } });
    writeEngineChoice(dir, "vision", "primary", {
      provider: "gemini",
      model: "gemini-3.5-flash-lite",
    });
    expect(readEnginePair(dir, "vision")).toEqual({
      primary: { provider: "gemini", model: "gemini-3.5-flash-lite" },
      backup: null,
    });

    writeEngineChoice(dir, "vision", "backup", { provider: "mistral" });
    const pair = readEnginePair(dir, "vision");
    expect(pair.primary?.model).toBe("gemini-3.5-flash-lite");
    expect(pair.backup).toEqual({ provider: "mistral" });
  });

  it("clearing the primary clears the backup — a stand-in for nothing is nothing", () => {
    const dir = secrets();
    writeEngineChoice(dir, "vision", "primary", { provider: "gemini" });
    writeEngineChoice(dir, "vision", "backup", { provider: "mistral" });
    writeEngineChoice(dir, "vision", "primary", null);
    expect(readEnginePair(dir, "vision")).toEqual({
      primary: null,
      backup: null,
    });
  });

  it("keeps the rest of a slot entry (voice picks) when the pointer changes", () => {
    const dir = secrets({ voiceOutput: { provider: "gemini", voice: "Kore" } });
    writeEngineChoice(dir, "voiceOutput", "primary", { provider: "workersai" });
    const raw = JSON.parse(
      readFileSync(join(dir, "model-providers.json"), "utf8"),
    ) as Record<string, { voice?: string; provider?: string }>;
    expect(raw.voiceOutput?.voice).toBe("Kore");
    expect(raw.voiceOutput?.provider).toBe("workersai");
  });
});

describe("what deserves a stand-in", () => {
  it("counts only failures where nothing could be answered", () => {
    expect(deservesBackup(new Error("VISION_DESCRIBE_FAILED:429"))).toBe(true);
    expect(deservesBackup(new Error("VISION_DESCRIBE_FAILED:503"))).toBe(true);
    expect(deservesBackup(new Error("fetch failed"))).toBe(true);
    expect(deservesBackup(new Error("VISION_NOT_CONNECTED"))).toBe(true);
    // A poor answer is not a failure: standing in would hide it and pay twice.
    expect(deservesBackup(new Error("VISION_ANNOTATE_EMPTY"))).toBe(false);
    expect(deservesBackup(new Error("the answer was rubbish"))).toBe(false);
  });
});

describe("explaining a failure", () => {
  it("says what the code MEANS, and keeps the code to search for", () => {
    expect(explainEngineFailure(new Error("X:429"), "en").reason).toContain(
      "quota",
    );
    expect(explainEngineFailure(new Error("X:429"), "zh").reason).toContain(
      "额度",
    );
    expect(explainEngineFailure(new Error("X:404"), "zh").reason).toContain(
      "不提供",
    );
    expect(explainEngineFailure(new Error("X:400"), "en").reason).toContain(
      "cannot do this job",
    );
    expect(explainEngineFailure(new Error("X:503"), "en").reason).toContain(
      "provider's own service",
    );
    expect(explainEngineFailure(new Error("X:429"), "en").code).toBe("429");
  });
});

describe("running with a backup", () => {
  const gemini = { provider: "gemini", model: "gemini-3.7-flash" };
  const mistral = { provider: "mistral", model: "pixtral-12b-2409" };

  it("uses the primary and says so", async () => {
    const result = await runWithBackup(
      { primary: gemini, backup: mistral },
      async (choice) => `answered by ${choice.provider}`,
      "en",
    );
    expect(result.value).toBe("answered by gemini");
    expect(result.note.fellBackFrom).toBeUndefined();
  });

  it("falls back on a real failure and carries the reason out", async () => {
    const tried: string[] = [];
    const result = await runWithBackup(
      { primary: gemini, backup: mistral },
      async (choice) => {
        tried.push(choice.provider);
        if (choice.provider === "gemini") {
          throw new Error("VISION_DESCRIBE_FAILED:429");
        }
        return "pixtral answer";
      },
      "zh",
    );
    expect(tried).toEqual(["gemini", "mistral"]);
    expect(result.value).toBe("pixtral answer");
    expect(result.note.provider).toBe("mistral");
    expect(result.note.fellBackFrom?.code).toBe("429");
    expect(result.note.fellBackFrom?.reason).toContain("额度");
    expect(
      backupNoteSentence(result.note, (id) => id.toUpperCase(), "zh"),
    ).toContain("GEMINI");
  });

  it("never invents a backup: with none set, the failure surfaces", async () => {
    await expect(
      runWithBackup(
        { primary: gemini, backup: null },
        async () => {
          throw new Error("VISION_DESCRIBE_FAILED:429");
        },
        "en",
      ),
    ).rejects.toThrow("429");
  });

  it("does not stand in for a bad answer", async () => {
    let calls = 0;
    await expect(
      runWithBackup(
        { primary: gemini, backup: mistral },
        async () => {
          calls += 1;
          throw new Error("VISION_ANNOTATE_EMPTY");
        },
        "en",
      ),
    ).rejects.toThrow("EMPTY");
    expect(calls).toBe(1);
  });

  it("surfaces the BACKUP's own failure when both are down", async () => {
    await expect(
      runWithBackup(
        { primary: gemini, backup: mistral },
        async (choice) => {
          throw new Error(choice.provider === "gemini" ? "X:429" : "Y:500");
        },
        "en",
      ),
    ).rejects.toThrow("Y:500");
  });
});
