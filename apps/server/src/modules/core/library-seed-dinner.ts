import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { AppConfig } from "../../config.js";

// Product packages arrive once on existing installations too. Occupying either
// half of the pair means the Owner owns it; never install or replace the other.
export function seedDinnerPlanner(
  config: AppConfig,
  sampleMethods: string,
  sampleRoutines: string,
): boolean {
  const id = "vaenyx-dinner-planner";
  const marker = resolve(
    dirname(config.libraryDirectory),
    ".dinner-planner-v1",
  );
  const method = resolve(sampleMethods, id);
  const routine = resolve(sampleRoutines, id);
  if (existsSync(marker) || !existsSync(method) || !existsSync(routine))
    return false;
  const destinationMethod = resolve(config.libraryDirectory, id);
  const destinationRoutine = resolve(config.routinesDirectory, id);
  let copied = false;
  if (!existsSync(destinationMethod) && !existsSync(destinationRoutine)) {
    mkdirSync(config.libraryDirectory, { recursive: true });
    mkdirSync(config.routinesDirectory, { recursive: true });
    cpSync(method, destinationMethod, { recursive: true });
    cpSync(routine, destinationRoutine, { recursive: true });
    copied = true;
  }
  mkdirSync(dirname(marker), { recursive: true });
  writeFileSync(marker, new Date().toISOString());
  return copied;
}
