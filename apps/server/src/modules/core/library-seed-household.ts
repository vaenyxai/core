import {
  cpSync,
  existsSync,
  mkdirSync,
  renameSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import type { AppConfig } from "../../config.js";
const ids = ["vaenyx-family-notices", "vaenyx-warranty"];
// Independent once-only markers: never overwrite custom packages or resurrect
// a package the Owner deleted. Stage each complete dependency before the Routine.
export function seedHouseholdRoutines(
  config: AppConfig,
  methods: string,
  routines: string,
): boolean {
  let copied = false;
  for (const id of ids) {
    const marker = resolve(dirname(config.libraryDirectory), `.${id}-v1`);
    if (
      existsSync(marker) ||
      !existsSync(resolve(methods, id)) ||
      !existsSync(resolve(routines, id))
    )
      continue;
    const method = resolve(config.libraryDirectory, id);
    const routine = resolve(config.routinesDirectory, id);
    const sameMethod =
      existsSync(method) &&
      [
        "method.json",
        "schema.json",
        "recipe.md",
        "manifest.json",
        "examples/0001.json",
      ].every((file) => {
        const target = resolve(method, file),
          source = resolve(methods, id, file);
        return (
          existsSync(target) &&
          existsSync(source) &&
          readFileSync(target, "utf8").replace(/\r\n/g, "\n") ===
            readFileSync(source, "utf8").replace(/\r\n/g, "\n")
        );
      });
    if ((!existsSync(method) || sameMethod) && !existsSync(routine)) {
      mkdirSync(config.libraryDirectory, { recursive: true });
      mkdirSync(config.routinesDirectory, { recursive: true });
      const stagedMethod = method + "." + randomUUID() + ".tmp";
      const stagedRoutine = routine + "." + randomUUID() + ".tmp";
      if (!sameMethod)
        cpSync(resolve(methods, id), stagedMethod, { recursive: true });
      cpSync(resolve(routines, id), stagedRoutine, { recursive: true });
      if (!sameMethod) renameSync(stagedMethod, method);
      renameSync(stagedRoutine, routine);
      copied = true;
    }
    mkdirSync(dirname(marker), { recursive: true });
    writeFileSync(marker, new Date().toISOString());
  }
  return copied;
}
