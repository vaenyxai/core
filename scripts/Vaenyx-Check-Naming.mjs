import { readdirSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const rootFiles = readdirSync(projectRoot);
const scriptFiles = readdirSync(resolve(projectRoot, "scripts"));

const invalidFiles = [
  ...rootFiles
    .filter((name) => name.endsWith(".cmd") && !name.startsWith("Vaenyx-"))
    .map((name) => name),
  ...scriptFiles
    .filter((name) => name.endsWith(".ps1") && !name.startsWith("Vaenyx-"))
    .map((name) => `scripts/${name}`),
];

if (invalidFiles.length > 0) {
  console.error("Vaenyx user-operation files must start with 'Vaenyx-':");
  for (const file of invalidFiles) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log("Vaenyx naming check passed.");
