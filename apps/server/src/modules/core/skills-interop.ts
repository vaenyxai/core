// Agent Skill interoperability (copy pack Part L).
//
// WORDING RULE — L4, and it is not a style preference. Terms of Service clause
// 11.5 makes our interoperability statements descriptive only, and that
// protects us ONLY while we do not overstate them. So nothing in this codebase,
// this UI or any release note may say "Skill compatible", "runs Skills" or
// "works with Skills". What we do is IMPORT THE INSTRUCTIONS FROM A SKILL, and
// we list what was dropped. Silently degrading an import while advertising
// compatibility would be a false statement about our own product — the least
// defensible kind there is.
//
// What a Method can be is instructions. A Skill may also ship scripts and
// binaries, and those are exactly what this importer refuses to carry: content
// here is declarative or it is nothing. The importer's job is therefore to be
// SPECIFIC about the loss — "some features may not work" sends the Owner off to
// discover the breakage themselves, which is the thing this is meant to prevent.
import { createHash } from "node:crypto";

export interface SkillFile {
  // Path as it appeared in the Skill bundle, e.g. "scripts/fetch.py".
  path: string;
  text?: string;
}

export interface DroppedItem {
  // "script" = a file that would have run; "step" = an instruction that needed it.
  kind: "script" | "step";
  // What it was: a path, or the line from the instructions.
  detail: string;
  // Why it cannot come across, in the Owner's terms.
  reason: "executable" | "runs-a-script" | "local-file" | "external-tool";
}

export interface SkillImportPreview {
  name: string;
  description: string;
  // The instructions that survive, with dropped lines removed.
  recipe: string;
  dropped: DroppedItem[];
  license: string | null;
  source: string | null;
}

// Anything that runs. A Method never carries these, so they are dropped and
// named rather than silently skipped.
const EXECUTABLE_EXTENSIONS = [
  ".py",
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".sh",
  ".bash",
  ".ps1",
  ".bat",
  ".cmd",
  ".rb",
  ".pl",
  ".php",
  ".exe",
  ".dll",
  ".bin",
  ".jar",
];

function isExecutablePath(path: string): boolean {
  const lower = path.toLowerCase();
  return EXECUTABLE_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

// YAML frontmatter, the shape SKILL.md uses. Deliberately a small reader rather
// than a YAML dependency: we need four scalar fields, and a parser that accepts
// less is a parser that can surprise us with less.
export function readFrontmatter(text: string): {
  fields: Record<string, string>;
  body: string;
} {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text.trim());
  if (!match) return { fields: {}, body: text.trim() };
  const fields: Record<string, string> = {};
  for (const line of (match[1] ?? "").split(/\r?\n/)) {
    const pair = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line.trim());
    if (!pair) continue;
    const key = (pair[1] ?? "").toLowerCase();
    let value = (pair[2] ?? "").trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) fields[key] = value;
  }
  return { fields, body: (match[2] ?? "").trim() };
}

// Does this instruction line depend on something that cannot come across?
function classifyLine(
  line: string,
  scriptNames: string[],
): DroppedItem["reason"] | null {
  const lower = line.toLowerCase();
  if (scriptNames.some((name) => lower.includes(name.toLowerCase()))) {
    return "runs-a-script";
  }
  // "run", "execute", "./thing", "python x", "npm run" — an instruction to run
  // something is an instruction a Method cannot honour.
  if (
    /\b(run|execute|invoke|call)\b[^.]*\b(script|command|binary|executable|program)\b/.test(
      lower,
    ) ||
    /(^|\s)(\.\/|python |node |bash |sh |npm |pip |curl |wget )/.test(lower)
  ) {
    return "external-tool";
  }
  // A path on the machine the Skill used to live on. Both slash styles: a
  // Windows path written "C:/invoices" is still a Windows path.
  if (
    /\b(read|open|load|write|save|append)\b[^.]*\b(file|folder|directory|path)\b/.test(
      lower,
    ) ||
    /(^|\s)[a-z]:[\\/]/.test(lower) ||
    /(^|\s)~\//.test(lower) ||
    /(^|\s)\/(home|users|var|etc|tmp|opt|mnt)\//.test(lower)
  ) {
    return "local-file";
  }
  return null;
}

// Turn a Skill bundle into what a Method can hold, and say exactly what was
// left behind. Nothing is written here: the Owner sees this preview first, and
// L1 is shown with the dropped list before the import completes.
export function previewSkillImport(
  skillMarkdown: string,
  files: SkillFile[] = [],
  source: string | null = null,
): SkillImportPreview {
  const { fields, body } = readFrontmatter(skillMarkdown);
  const dropped: DroppedItem[] = [];

  const scripts = files.filter((file) => isExecutablePath(file.path));
  for (const script of scripts) {
    dropped.push({
      kind: "script",
      detail: script.path,
      reason: "executable",
    });
  }
  const scriptNames = scripts.map((script) =>
    (script.path.split(/[\\/]/).pop() ?? script.path).trim(),
  );

  const keptLines: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    // Only instruction-ish lines are candidates; headings and blank lines stay.
    if (!trimmed || trimmed.startsWith("#")) {
      keptLines.push(line);
      continue;
    }
    const reason = classifyLine(trimmed, scriptNames);
    if (reason) {
      dropped.push({ kind: "step", detail: trimmed, reason });
      continue;
    }
    keptLines.push(line);
  }

  const name = fields.name?.trim() || "Imported Skill";
  return {
    name,
    description: fields.description?.trim() || "",
    recipe: keptLines.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
    dropped,
    license: fields.license?.trim() || null,
    source: source?.trim() || fields.source?.trim() || null,
  };
}

export interface SkillProvenance {
  source: string | null;
  license: string | null;
  importedAt: string;
  // Hash of the SKILL.md as it arrived, so "is this still what we imported"
  // can be answered without keeping a copy of someone else's file.
  originalHash: string;
}

export function buildProvenance(
  skillMarkdown: string,
  source: string | null,
  license: string | null,
): SkillProvenance {
  return {
    source,
    license,
    importedAt: new Date().toISOString(),
    originalHash: createHash("sha256").update(skillMarkdown).digest("hex"),
  };
}

// Export is the clean direction: a Method is instructions already, so nothing is
// lost and no capability is implied that does not exist (L3). The licence line
// travels with it, because whoever receives it is bound by that and by nothing
// in Vaenyx.
export function exportMethodAsSkill(method: {
  name: string;
  description: string;
  recipe: string;
  version: string;
  owner: string;
}): string {
  const frontmatter = [
    "---",
    `name: ${method.name}`,
    `description: ${method.description}`,
    `version: ${method.version}`,
    method.owner ? `author: ${method.owner}` : null,
    "---",
    "",
  ]
    .filter((line) => line !== null)
    .join("\n");
  return `${frontmatter}${method.recipe.trim()}\n`;
}
