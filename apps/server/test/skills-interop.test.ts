import { describe, expect, it } from "vitest";

import {
  buildProvenance,
  exportMethodAsSkill,
  previewSkillImport,
  readFrontmatter,
} from "../src/modules/core/skills-interop.js";

// The value of this importer is the SPECIFIC list of what it dropped. "Some
// features may not work" would leave the Owner to discover the breakage
// themselves, which is the thing copy pack L1 exists to prevent.
describe("Skill import preview", () => {
  const skill = `---
name: Invoice Reader
description: Pulls totals out of invoices.
license: MIT
---

# How to do it

Read the invoice text the user gives you.
Run scripts/extract.py to pull the line items.
Summarise the totals in plain language.
Open C:/invoices/latest.csv and append the result.
`;

  it("names every dropped script and the steps that needed it", () => {
    const preview = previewSkillImport(skill, [
      { path: "scripts/extract.py" },
      { path: "README.md" },
    ]);

    expect(preview.dropped).toContainEqual({
      kind: "script",
      detail: "scripts/extract.py",
      reason: "executable",
    });
    expect(
      preview.dropped.some(
        (item) =>
          item.kind === "step" &&
          item.reason === "runs-a-script" &&
          item.detail.includes("extract.py"),
      ),
    ).toBe(true);
    expect(
      preview.dropped.some(
        (item) => item.kind === "step" && item.reason === "local-file",
      ),
    ).toBe(true);
  });

  it("keeps the instructions that survive and drops the ones that cannot", () => {
    const preview = previewSkillImport(skill, [{ path: "scripts/extract.py" }]);
    expect(preview.recipe).toContain("Read the invoice text");
    expect(preview.recipe).toContain("Summarise the totals");
    expect(preview.recipe).not.toContain("extract.py");
    expect(preview.recipe).not.toContain("C:/invoices/latest.csv");
  });

  it("carries the name, description and licence off the frontmatter", () => {
    const preview = previewSkillImport(skill, [], "https://example.com/skill");
    expect(preview.name).toBe("Invoice Reader");
    expect(preview.description).toBe("Pulls totals out of invoices.");
    expect(preview.license).toBe("MIT");
    expect(preview.source).toBe("https://example.com/skill");
  });

  it("drops nothing when a Skill is instructions only", () => {
    const clean = `---
name: Tidy Notes
---

Rewrite the note as a clean title and bullet points.
Keep the user's own wording where you can.
`;
    const preview = previewSkillImport(clean);
    expect(preview.dropped).toEqual([]);
    expect(preview.recipe).toContain("Rewrite the note");
  });

  it("survives a Skill with no frontmatter at all", () => {
    const preview = previewSkillImport("Just do the thing.");
    expect(preview.name).toBe("Imported Skill");
    expect(preview.recipe).toBe("Just do the thing.");
  });

  it("reads quoted frontmatter values", () => {
    const { fields, body } = readFrontmatter(
      `---\nname: "Quoted Name"\nlicense: 'Apache-2.0'\n---\nbody text`,
    );
    expect(fields.name).toBe("Quoted Name");
    expect(fields.license).toBe("Apache-2.0");
    expect(body).toBe("body text");
  });
});

describe("provenance", () => {
  it("records where it came from, under what licence, and when", () => {
    const provenance = buildProvenance("skill text", "https://x/y", "MIT");
    expect(provenance.source).toBe("https://x/y");
    expect(provenance.license).toBe("MIT");
    expect(provenance.importedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(provenance.originalHash).toHaveLength(64);
  });

  it("hashes the arriving file so the same Skill gives the same hash", () => {
    expect(buildProvenance("same", null, null).originalHash).toBe(
      buildProvenance("same", null, null).originalHash,
    );
  });
});

describe("Skill export", () => {
  it("exports the instructions unchanged", () => {
    const out = exportMethodAsSkill({
      name: "Tidy Notes",
      description: "Cleans up a note.",
      recipe: "Rewrite the note.\nKeep the wording.",
      version: "1.2.0",
      owner: "Someone",
    });
    expect(out).toContain("name: Tidy Notes");
    expect(out).toContain("version: 1.2.0");
    expect(out).toContain("author: Someone");
    expect(out.trimEnd().endsWith("Keep the wording.")).toBe(true);
  });

  it("leaves the author line out when there is no owner", () => {
    const out = exportMethodAsSkill({
      name: "X",
      description: "",
      recipe: "Do it.",
      version: "1.0.0",
      owner: "",
    });
    expect(out).not.toContain("author:");
  });
});
