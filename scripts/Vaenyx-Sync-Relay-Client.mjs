// Distribute immutable, locally hosted SDK files; never load remote "latest" in a browser.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const source = path.resolve(import.meta.dirname, "../packages/relay-client");
const names = [
  "client.mjs",
  "connect.mjs",
  "protocol.mjs",
  "vault.mjs",
  "return.mjs",
  "provider-definitions.mjs",
  "provider-wire.mjs",
  "providers.mjs",
  "search.mjs",
  "direct.mjs",
  "routes.mjs",
  "journal.mjs",
];
const target = process.argv[2],
  check = process.argv.includes("--check");
if (!target)
  throw Error(
    "Usage: node scripts/Vaenyx-Sync-Relay-Client.mjs <vendor-directory> [--check]",
  );
const folder = path.resolve(target);
const manifest = { name: "vaenyx-relay-client", version: "1.3.0", files: {} };
for (const name of names) {
  const bytes = fs.readFileSync(path.join(source, name));
  manifest.files[name] = createHash("sha256").update(bytes).digest("hex");
  if (check) {
    if (!fs.readFileSync(path.join(folder, name)).equals(bytes))
      throw Error("SDK differs: " + name);
  } else {
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, name), bytes);
  }
}
const text = JSON.stringify(manifest, null, 2) + "\n";
if (check) {
  if (fs.readFileSync(path.join(folder, "manifest.json"), "utf8") !== text)
    throw Error("SDK manifest differs");
} else fs.writeFileSync(path.join(folder, "manifest.json"), text);
console.log(
  "Vaenyx Relay Client 1.3.0 " + (check ? "verified" : "synchronized"),
);
