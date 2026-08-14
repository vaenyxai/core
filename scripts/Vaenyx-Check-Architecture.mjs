import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");

// Internal working documents moved to the operator's private repo
// (2026-07-14); files absent from this repo are skipped so the guardrail
// keeps covering whatever is present here.
const filesToScan = [
  "AGENTS.md",
  "CHANGELOG_AI.md",
  "DECISIONS.md",
  "PROJECT_BRIEF.md",
  "README.md",
  "CONTRIBUTING.md",
  "TODO.md",
  "docs/architecture.md",
  "docs/architecture-guardrails.md",
  "docs/chat-handoff.md",
  "docs/MVP-IMPLEMENTATION-PLAN.md",
  "docs/RELEASE-CHECKLIST.md",
  "docs/vaenyx-me-learning-review-flow.md",
  "docs/WINDOWS-MINI-PC-GUIDE.zh-CN.md",
  "docs/glossary.md",
  "packages/contracts/src/workspace.ts",
  "apps/server/src/modules/gateway/routes.ts",
  "apps/web/src/App.tsx",
].filter((file) => existsSync(resolve(projectRoot, file)));

const allowedSeparationWords = [
  "not",
  "no longer",
  "separate",
  "different",
  "does not",
  "isn't",
  "is not",
];

const checks = [
  {
    concept: "Vaenyx Me vs Agent Profiles",
    pattern:
      /\bvaenyx me\b[^.!?\n]*(agent profile|agent profiles|sub agent|sub agents|forge|scribe|scout|lens|vault|ledger|nest|oracle)/iu,
    allowedWhen: allowedSeparationWords,
  },
  {
    concept: "Agent Profiles vs Digital Self",
    pattern:
      /\bagent profiles?\b[^.!?\n]*(digital self|owner traits|owner's inspectable digital self|long-term user model)/iu,
    allowedWhen: allowedSeparationWords,
  },
  {
    concept: "Project vs Agent",
    pattern:
      /\bproject\b[^.!?\n]*(is an agent|agent identity|agent personality)/iu,
    allowedWhen: allowedSeparationWords,
  },
  {
    concept: "Skill vs Agent",
    pattern:
      /\bskill\b[^.!?\n]*(is an agent|agent identity|agent personality)/iu,
    allowedWhen: allowedSeparationWords,
  },
];

function lineAllowed(line, allowedWords) {
  const lower = line.toLowerCase();
  return allowedWords.some((word) => lower.includes(word));
}

const failures = [];

for (const file of filesToScan) {
  const path = resolve(projectRoot, file);
  const content = readFileSync(path, "utf8");
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const check of checks) {
      if (check.pattern.test(line) && !lineAllowed(line, check.allowedWhen)) {
        failures.push({
          file,
          line: index + 1,
          concept: check.concept,
          text: line.trim(),
        });
      }
    }
  });
}

if (failures.length > 0) {
  console.error("Vaenyx architecture guardrail check failed:");
  for (const failure of failures) {
    console.error(
      `- ${failure.file}:${failure.line} [${failure.concept}] ${failure.text}`,
    );
  }
  console.error(
    "Check docs/architecture-guardrails.md and vaenyx-final-architecture-brief-v2.md before changing core meanings.",
  );
  process.exit(1);
}

console.log("Vaenyx architecture guardrail check passed.");
