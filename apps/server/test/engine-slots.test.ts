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
  describeEnginePair,
  deservesBackup,
  explainEngineFailure,
  FOLLOW_MAIN,
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

  // Speaking's pick has always lived under `engine`, because two of its
  // answers are not accounts at all (this browser's voice, and the downloaded
  // one). The slot layer writes THAT field for this slot — writing `provider`
  // instead would leave voice.ts reading the old engine forever.
  it("writes Speaking's pick where Speaking reads it, keeping the voice", () => {
    const dir = secrets({ voiceOutput: { engine: "gemini", voice: "Kore" } });
    writeEngineChoice(dir, "voiceOutput", "primary", { provider: "workersai" });
    const raw = JSON.parse(
      readFileSync(join(dir, "model-providers.json"), "utf8"),
    ) as Record<string, { voice?: string; engine?: string }>;
    expect(raw.voiceOutput?.voice).toBe("Kore");
    expect(raw.voiceOutput?.engine).toBe("workersai");
    expect(readEnginePair(dir, "voiceOutput").primary).toEqual({
      provider: "workersai",
    });
  });

  it("reads Speaking's own engine names, and 'none' as nothing chosen", () => {
    expect(
      readEnginePair(
        secrets({ voiceOutput: { engine: "local" } }),
        "voiceOutput",
      ).primary,
    ).toEqual({ provider: "local" });
    expect(
      readEnginePair(
        secrets({ voiceOutput: { engine: "none" } }),
        "voiceOutput",
      ).primary,
    ).toBeNull();
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

// Chat is the one slot with pre-existing storage: the default-provider file
// plus that provider's own model, which the composer's switcher writes
// directly. The slot has to be a VIEW over that, or the app ends up with two
// answers to "which model does chat use" (Oskar, 2026-08-16: 实时统一).
describe("the chat slot is a view over the default backend", () => {
  it("reads the default provider and that provider's model", () => {
    const dir = secrets({ gemini: { apiKey: "k", model: "gemini-3.7-flash" } });
    writeFileSync(
      join(dir, "model-default.json"),
      JSON.stringify({ id: "gemini" }),
      "utf8",
    );
    expect(readEnginePair(dir, "chat").primary).toEqual({
      provider: "gemini",
      model: "gemini-3.7-flash",
    });
  });

  it("writes back to the same two places, so the switcher sees it", () => {
    const dir = secrets({ gemini: { apiKey: "k" }, groq: { apiKey: "k" } });
    writeEngineChoice(dir, "chat", "primary", {
      provider: "groq",
      model: "openai/gpt-oss-120b",
    });
    const chosen = JSON.parse(
      readFileSync(join(dir, "model-default.json"), "utf8"),
    ) as { id: string };
    const connections = JSON.parse(
      readFileSync(join(dir, "model-providers.json"), "utf8"),
    ) as Record<string, { apiKey?: string; model?: string }>;
    expect(chosen.id).toBe("groq");
    expect(connections.groq.model).toBe("openai/gpt-oss-120b");
    // And the key it was connected with is still there.
    expect(connections.groq.apiKey).toBe("k");
    // No second copy of the answer.
    expect(connections.chat).toBeUndefined();
  });

  it("falls back to Codex when nothing has been chosen", () => {
    expect(readEnginePair(secrets(), "chat").primary).toEqual({
      provider: "codex",
    });
  });

  it("keeps chat's backup in its own entry, clearable on its own", () => {
    const dir = secrets({ groq: { apiKey: "k" } });
    writeEngineChoice(dir, "chat", "backup", {
      provider: "groq",
      model: "openai/gpt-oss-120b",
    });
    expect(readEnginePair(dir, "chat").backup).toEqual({
      provider: "groq",
      model: "openai/gpt-oss-120b",
    });
    writeEngineChoice(dir, "chat", "backup", null);
    expect(readEnginePair(dir, "chat").backup).toBeNull();
  });

  it("refuses to turn chat off — there is no app without a model", () => {
    const dir = secrets({ gemini: { apiKey: "k", model: "gemini-3.7-flash" } });
    writeEngineChoice(dir, "chat", "primary", { provider: "gemini" });
    writeEngineChoice(dir, "chat", "primary", null);
    expect(readEnginePair(dir, "chat").primary?.provider).toBe("gemini");
  });
});

describe("following the main model (Oskar, 2026-09-05)", () => {
  function withMain(model = "gemini-3.7-flash"): string {
    const dir = secrets({
      gemini: { apiKey: "k", model },
      groq: { apiKey: "k" },
      mistral: { apiKey: "k" },
    });
    writeFileSync(
      join(dir, "model-default.json"),
      JSON.stringify({ id: "gemini" }),
      "utf8",
    );
    return dir;
  }

  it("resolves a follower to the main model, backup included", () => {
    const dir = withMain();
    writeEngineChoice(dir, "chat", "backup", { provider: "groq" });
    writeEngineChoice(dir, "vision", "primary", { provider: FOLLOW_MAIN });
    expect(describeEnginePair(dir, "vision")).toEqual({
      primary: { provider: "gemini", model: "gemini-3.7-flash" },
      backup: { provider: "groq" },
      follows: { primary: true, backup: true },
    });
    // Change the main model once; the follower moves with it.
    writeEngineChoice(dir, "chat", "primary", { provider: "mistral" });
    expect(readEnginePair(dir, "vision").primary).toEqual({
      provider: "mistral",
    });
  });

  it("lets a follower keep a backup of its own, and a chosen row borrow the main backup", () => {
    const dir = withMain();
    writeEngineChoice(dir, "chat", "backup", { provider: "groq" });
    writeEngineChoice(dir, "vision", "primary", { provider: FOLLOW_MAIN });
    writeEngineChoice(dir, "vision", "backup", { provider: "mistral" });
    expect(describeEnginePair(dir, "vision")).toMatchObject({
      backup: { provider: "mistral" },
      follows: { primary: true, backup: false },
    });
    writeEngineChoice(dir, "ocr", "primary", { provider: "mistral" });
    writeEngineChoice(dir, "ocr", "backup", { provider: FOLLOW_MAIN });
    expect(describeEnginePair(dir, "ocr")).toMatchObject({
      primary: { provider: "mistral" },
      backup: { provider: "groq" },
      follows: { primary: false, backup: true },
    });
  });

  it("Text follows by default, can be pointed elsewhere, and can drop its inherited backup", () => {
    const dir = withMain();
    writeEngineChoice(dir, "chat", "backup", { provider: "groq" });
    expect(describeEnginePair(dir, "text")).toEqual({
      primary: { provider: "gemini", model: "gemini-3.7-flash" },
      backup: { provider: "groq" },
      follows: { primary: true, backup: true },
    });
    writeEngineChoice(dir, "text", "primary", {
      provider: "mistral",
      model: "mistral-small-latest",
    });
    expect(describeEnginePair(dir, "text")).toMatchObject({
      primary: { provider: "mistral", model: "mistral-small-latest" },
      backup: { provider: "groq" },
      follows: { primary: false, backup: true },
    });
    writeEngineChoice(dir, "text", "backup", null);
    expect(describeEnginePair(dir, "text")).toMatchObject({
      backup: null,
      follows: { primary: false, backup: false },
    });
    // Back to following: the inherited backup returns with it.
    writeEngineChoice(dir, "text", "primary", { provider: FOLLOW_MAIN });
    expect(describeEnginePair(dir, "text").follows).toEqual({
      primary: true,
      backup: false,
    });
  });

  it("every other row still means off when nothing is chosen", () => {
    const dir = withMain();
    expect(describeEnginePair(dir, "vision")).toEqual({
      primary: null,
      backup: null,
      follows: { primary: false, backup: false },
    });
  });

  it("refuses to let the main model follow itself", () => {
    const dir = withMain();
    expect(() =>
      writeEngineChoice(dir, "chat", "primary", { provider: FOLLOW_MAIN }),
    ).toThrow("MAIN_CANNOT_FOLLOW_ITSELF");
    expect(() =>
      writeEngineChoice(dir, "chat", "backup", { provider: FOLLOW_MAIN }),
    ).toThrow("MAIN_CANNOT_FOLLOW_ITSELF");
  });
});
