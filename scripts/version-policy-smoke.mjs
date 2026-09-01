import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertDevVersion,
  nextDevVersion,
  nextProductionVersion,
  parseVersion,
} from "./Vaenyx-Version-Policy.mjs";

const root = resolve(import.meta.dirname, "..");

assert.deepEqual(parseVersion("0.4.12.5-dev"), {
  major: 0,
  minor: 4,
  release: 12,
  build: 5,
  isDev: true,
});
assert.equal(nextDevVersion("0.4.12.0"), "0.4.12.1-dev");
assert.equal(nextDevVersion("0.4.12.5-dev"), "0.4.12.6-dev");
assert.equal(nextProductionVersion("0.4.12.5-dev"), "0.4.13.0");
assert.equal(assertDevVersion("0.4.12.1-dev"), "0.4.12.1-dev");
assert.throws(() => nextDevVersion("0.4.12.2"), /fourth segment must be 0/);
assert.throws(() => nextProductionVersion("0.4.12.0"), /tested -dev build/);
assert.throws(() => assertDevVersion("0.4.12.0"), /numbered -dev version/);

const releaseScript = readFileSync(
  resolve(root, "scripts", "Vaenyx-Release.ps1"),
  "utf8",
);
assert.match(releaseScript, /OwnerApproval/);
assert.match(releaseScript, /-cne "RELEASE"/);
assert.match(releaseScript, /next-production/);
assert.doesNotMatch(releaseScript, /\[switch\]\$SkipChecks/);

const deployScript = readFileSync(
  resolve(root, "scripts", "Vaenyx-Deploy-Dev.ps1"),
  "utf8",
);
assert.match(deployScript, /assert-dev/);
assert.match(deployScript, /origin\/main/);
assert.match(deployScript, /Vaenyx-Stop\.ps1/);
assert.match(deployScript, /status\.database\.status -ne "ready"/);

const stopScript = readFileSync(
  resolve(root, "scripts", "Vaenyx-Stop.ps1"),
  "utf8",
);
assert.match(stopScript, /restart-requested\.flag/);
assert.match(stopScript, /Vaenyx is still running/);

const updateScript = readFileSync(
  resolve(root, "scripts", "Vaenyx-Update.ps1"),
  "utf8",
);
assert.match(updateScript, /userdata\\db\\vaenyx\.db/);

console.log("DEV and formal-release policy smoke test passed.");
