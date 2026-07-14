// Automatic scheduled backups: checked once a minute alongside the task
// scheduler. Daily = once per calendar day at the configured hour; weekly =
// Sundays at the configured hour. Reuses createBackupNow (the same script as
// the manual button, so destination/retention/encryption all apply) and
// records the outcome for the Settings page.
import type { AppConfig } from "../../config.js";

import {
  readBackupAutoState,
  readBackupConfig,
  writeBackupAutoState,
} from "./backup-config.js";
import { createBackupNow } from "./backups.js";

let running = false;

export function runScheduledBackupIfDue(
  config: AppConfig,
  log: {
    info: (message: string) => void;
    error: (message: string) => void;
  },
): void {
  if (running) return;
  const schedule = readBackupConfig(config).schedule;
  if (!schedule) return;

  const now = new Date();
  if (now.getHours() !== schedule.hour) return;
  if (schedule.cadence === "weekly" && now.getDay() !== 0) return;

  // One run per due day: skip if the last automatic run was today already
  // (covers every minute of the due hour firing the tick).
  const state = readBackupAutoState(config);
  if (state.lastRunAt) {
    const last = new Date(state.lastRunAt);
    if (last.toDateString() === now.toDateString()) return;
  }

  running = true;
  try {
    const result = createBackupNow(config);
    writeBackupAutoState(config, {
      lastRunAt: now.toISOString(),
      lastOk: result.ok,
    });
    if (result.ok) {
      log.info("Scheduled backup completed.");
    } else {
      log.error(`Scheduled backup failed: ${result.output.slice(0, 300)}`);
    }
  } finally {
    running = false;
  }
}
