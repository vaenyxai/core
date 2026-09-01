import { readFileSync } from "node:fs";

import { assertInstanceLock } from "./lib/instance-lock.mjs";
import { instanceLockPath } from "./lib/paths.mjs";
import {
  commitDatabaseSwitch,
  createUpdateSnapshot,
  recoverInterruptedSwitch,
  rollbackDatabaseFamilies,
  switchDatabaseFamilies,
  validateDatabase,
} from "./lib/update-transaction.mjs";

const [command, contextFile] = process.argv.slice(2);
if (!command || !contextFile) {
  throw new Error("Update database command and transaction file are required.");
}

assertInstanceLock(instanceLockPath);
const context = JSON.parse(readFileSync(contextFile, "utf8"));
let result;
switch (command) {
  case "snapshot":
    result = await createUpdateSnapshot(context);
    break;
  case "validate-candidate":
    result = validateDatabase(context.candidateDatabase);
    break;
  case "switch":
    result = switchDatabaseFamilies(context);
    break;
  case "rollback":
    result = await rollbackDatabaseFamilies(context);
    break;
  case "recover":
    result = await recoverInterruptedSwitch(context);
    break;
  case "commit":
    result = commitDatabaseSwitch(context);
    break;
  default:
    throw new Error(`Unknown update database command: ${command}`);
}
console.log(JSON.stringify(result));
