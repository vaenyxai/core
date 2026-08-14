// Bilingual documentation pairing check. The repo rule has always been "an
// English doc and its Chinese twin update in the same commit" — but nothing
// verified it, so drift was only a matter of time. This check makes the rule
// executable (idea borrowed from DeepSeek Harness's translation pairing;
// implementation is Vaenyx's own):
//
//   docs/translation-pairs.json lists every EN/ZH doc pair together with the
//   git blob hash of each side as recorded at the last confirmed-consistent
//   state. If either side's bytes no longer match its recorded hash, the pair
//   is out of sync and `npm run check` fails naming the pair and the side
//   that moved. Both languages carry equal authority.
//
// After editing a doc, bring its twin along, then re-record the pair:
//
//   node scripts/Vaenyx-Check-Translations.mjs --write
//
// --write re-records only pairs whose content changed, and prints each one so
// a careless re-record is at least a visible act. The check also scans the
// repo for Chinese docs (*.zh.md / *.zh-CN.md) missing from the manifest, so
// a new pair cannot quietly live outside the rule.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const manifestPath = resolve(projectRoot, "docs", "translation-pairs.json");
const writeMode = process.argv.includes("--write");
const recordCommand = "node scripts/Vaenyx-Check-Translations.mjs --write";

// Same value `git hash-object` computes, without spawning git per file.
function gitBlobHash(buffer) {
  return createHash("sha1")
    .update(`blob ${buffer.length}\0`)
    .update(buffer)
    .digest("hex");
}

function readManifest() {
  if (!existsSync(manifestPath)) {
    console.error(
      "Vaenyx translation check failed: docs/translation-pairs.json is missing.",
    );
    process.exit(1);
  }
  try {
    return JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    console.error(
      "Vaenyx translation check failed: docs/translation-pairs.json is not valid JSON.",
    );
    process.exit(1);
  }
}

// Every Chinese-side doc in the repo, so pairs cannot exist outside the
// manifest. Skips dependency, data and build trees.
const skippedDirectories = new Set([
  ".git",
  ".wrangler",
  "node_modules",
  "userdata",
  "sample-library",
  "dist",
  "coverage",
]);

function findChineseDocs(directory, found) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!skippedDirectories.has(entry.name)) {
        findChineseDocs(resolve(directory, entry.name), found);
      }
      continue;
    }
    if (/\.zh(-CN)?\.md$/i.test(entry.name)) {
      found.push(
        relative(projectRoot, resolve(directory, entry.name)).replaceAll(
          "\\",
          "/",
        ),
      );
    }
  }
  return found;
}

const manifest = readManifest();
const pairs = Array.isArray(manifest.pairs) ? manifest.pairs : [];
const failures = [];

if (writeMode) {
  let recorded = 0;
  for (const pair of pairs) {
    const enPath = resolve(projectRoot, pair.en);
    const zhPath = resolve(projectRoot, pair.zh);
    if (!existsSync(enPath) || !existsSync(zhPath)) {
      failures.push(
        `- ${pair.en} ↔ ${pair.zh}: cannot record — a side is missing on disk.`,
      );
      continue;
    }
    const enBlob = gitBlobHash(readFileSync(enPath));
    const zhBlob = gitBlobHash(readFileSync(zhPath));
    if (enBlob !== pair.enBlob || zhBlob !== pair.zhBlob) {
      pair.enBlob = enBlob;
      pair.zhBlob = zhBlob;
      recorded += 1;
      console.log(`recorded: ${pair.en} ↔ ${pair.zh}`);
    }
  }
  if (failures.length > 0) {
    console.error("Vaenyx translation recording failed:");
    for (const failure of failures) console.error(failure);
    process.exit(1);
  }
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(
    recorded === 0
      ? "Vaenyx translation pairs already recorded; nothing changed."
      : `Vaenyx translation pairing recorded for ${recorded} pair(s); run the check to confirm.`,
  );
  process.exit(0);
}

const manifestZhSides = new Set(pairs.map((pair) => pair.zh));

for (const pair of pairs) {
  const enPath = resolve(projectRoot, pair.en);
  const zhPath = resolve(projectRoot, pair.zh);
  const missing = [pair.en, pair.zh].filter(
    (side) => !existsSync(resolve(projectRoot, side)),
  );
  if (missing.length > 0) {
    failures.push(
      `- ${pair.en} ↔ ${pair.zh}: ${missing.join(" and ")} missing on disk — a pair moves whole (restore the file or update docs/translation-pairs.json).`,
    );
    continue;
  }
  const enChanged = gitBlobHash(readFileSync(enPath)) !== pair.enBlob;
  const zhChanged = gitBlobHash(readFileSync(zhPath)) !== pair.zhBlob;
  if (enChanged && zhChanged) {
    failures.push(
      `- ${pair.en} ↔ ${pair.zh}: both sides changed since the pair was last confirmed. Make sure they say the same thing, then re-record: ${recordCommand}`,
    );
  } else if (enChanged) {
    failures.push(
      `- ${pair.en} ↔ ${pair.zh}: the English side changed alone. Bring the Chinese side along, then re-record: ${recordCommand}`,
    );
  } else if (zhChanged) {
    failures.push(
      `- ${pair.en} ↔ ${pair.zh}: the Chinese side changed alone. Bring the English side along, then re-record: ${recordCommand}`,
    );
  }
}

for (const zhDoc of findChineseDocs(projectRoot, [])) {
  if (!manifestZhSides.has(zhDoc)) {
    failures.push(
      `- ${zhDoc}: Chinese doc with no entry in docs/translation-pairs.json — add the pair there, then record it: ${recordCommand}`,
    );
  }
}

if (failures.length > 0) {
  console.error(
    "Vaenyx translation check failed (English and Chinese docs update together):",
  );
  for (const failure of failures) {
    console.error(failure);
  }
  process.exit(1);
}

console.log(
  `Vaenyx translation check passed (${pairs.length} pairs consistent).`,
);
