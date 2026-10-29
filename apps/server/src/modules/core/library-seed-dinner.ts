import { createHash, randomUUID } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import type { AppConfig } from "../../config.js";

const routineId = "vaenyx-dinner-planner";
const methodId = "vaenyx-dinner-dish";
const files = ["method.json", "schema.json", "recipe.md", "manifest.json"];
const originalMethodHash =
  "aa6a2e00f9ecaa81244b95bf3714d5264cd99eca99cab72a7005a2e2b5eff907";
function fingerprint(directory: string): string | null {
  const hash = createHash("sha256");
  for (const file of files) {
    const path = resolve(directory, file);
    if (!existsSync(path)) return null;
    hash.update(
      `${file}\n${readFileSync(path, "utf8")
        .replace(/^\uFEFF/, "")
        .replace(/\r\n/g, "\n")}\n\0`,
    );
  }
  return hash.digest("hex");
}

// The new Method has its own ID. Other Routines keep the old Method and its
// version lock. Never overwrite an Owner Method, recipe, schema or custom flow.
export function upgradeDinnerDish(
  config: AppConfig,
  sampleMethods: string,
): boolean {
  const routinePath = resolve(
    config.routinesDirectory,
    routineId,
    "routine.json",
  );
  const source = resolve(sampleMethods, methodId);
  if (!existsSync(routinePath) || !existsSync(source)) return false;
  let routine;
  try {
    routine = JSON.parse(
      readFileSync(routinePath, "utf8").replace(/^\uFEFF/, ""),
    );
  } catch {
    return false;
  }
  if (!routine || typeof routine !== "object") return false;
  if (
    !isDeepStrictEqual(routine.flow, [
      { id: "plan-dinner", methodId: routineId, from: "journal" },
    ]) ||
    !isDeepStrictEqual(routine.deps, [
      { methodId: routineId, version: "1.0.0" },
    ]) ||
    fingerprint(resolve(config.libraryDirectory, routineId)) !==
      originalMethodHash
  )
    return false;
  const destination = resolve(config.libraryDirectory, methodId);
  if (
    existsSync(destination) &&
    fingerprint(destination) !== fingerprint(source)
  )
    return false;
  if (!existsSync(destination)) {
    const staging = destination + "." + randomUUID() + ".tmp";
    cpSync(source, staging, { recursive: true });
    renameSync(staging, destination);
  }
  // Atomic switch only after the dependency exists; preserve the Owner's title,
  // view, storage, manifest and all history. Startup retry is idempotent.
  routine.flow[0].methodId = methodId;
  routine.deps[0].methodId = methodId;
  routine.version = "1.1.0";
  const temporary = routinePath + "." + randomUUID() + ".tmp";
  writeFileSync(temporary, JSON.stringify(routine, null, 2) + "\n");
  renameSync(temporary, routinePath);
  return true;
}

export function seedDinnerPlanner(
  config: AppConfig,
  sampleMethods: string,
  sampleRoutines: string,
): boolean {
  const upgraded = upgradeDinnerDish(config, sampleMethods);
  const marker = resolve(
    dirname(config.libraryDirectory),
    ".dinner-planner-v1",
  );
  const method = resolve(sampleMethods, methodId);
  const routine = resolve(sampleRoutines, routineId);
  if (existsSync(marker) || !existsSync(method) || !existsSync(routine))
    return upgraded;
  const destinationMethod = resolve(config.libraryDirectory, methodId);
  const destinationRoutine = resolve(config.routinesDirectory, routineId);
  let copied = false;
  if (
    !existsSync(destinationMethod) &&
    !existsSync(destinationRoutine) &&
    !existsSync(resolve(config.libraryDirectory, routineId))
  ) {
    mkdirSync(config.libraryDirectory, { recursive: true });
    mkdirSync(config.routinesDirectory, { recursive: true });
    cpSync(method, destinationMethod, { recursive: true });
    cpSync(routine, destinationRoutine, { recursive: true });
    copied = true;
  }
  mkdirSync(dirname(marker), { recursive: true });
  writeFileSync(marker, new Date().toISOString());
  return copied || upgraded;
}
