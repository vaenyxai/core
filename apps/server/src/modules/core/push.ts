// Web Push (Owner request 2026-07-22): notify subscribed devices when a
// scheduled task finishes. Pure-code setup — the VAPID keypair is generated
// locally on first use and stored in the SECRETS directory (never in git,
// userdata or backups). Messages travel through the browser vendors' push
// relays encrypted end-to-end (RFC 8291); the relay sees no content.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import webpush from "web-push";

import type { DatabaseHandle } from "../../db/database.js";

const VAPID_FILENAME = "push-vapid.json";
const VAPID_SUBJECT = "mailto:hello@vaenyx.ai";

let secretsDirectory: string | null = null;

// Presence (Owner request 2026-07-22): pages heartbeat while visible, and a
// scheduled run skips the phone push when someone is actively looking at the
// app — the result is already on their screen. In-memory is enough: the
// scheduler lives in this same process, and after a restart "no heartbeat yet"
// correctly means "nobody is looking".
let lastPresenceAt = 0;

export function notePresence(): void {
  lastPresenceAt = Date.now();
}

// Owner rule (2026-07-23): push only if the result stays UNSEEN for ~30s.
// Wait a beat longer than the 30s heartbeat interval, then push unless any
// visible page heartbeat landed after the run completed — a page that stayed
// open through the wait always produces one; a page closed before or right at
// completion never does, so the phone buzzes.
const UNSEEN_WAIT_MS = 35_000;

export function schedulePresenceAwarePush(
  database: DatabaseHandle,
  payload: { title: string; body: string; url: string },
): void {
  const completedAt = Date.now();
  setTimeout(() => {
    if (lastPresenceAt >= completedAt) return; // someone saw it — stay quiet
    void sendPushToAllDevices(database, payload).catch(() => undefined);
  }, UNSEEN_WAIT_MS).unref?.();
}

export function initPushService(config: { secretsDirectory: string }): void {
  secretsDirectory = config.secretsDirectory;
}

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

function loadOrCreateVapidKeys(): VapidKeys | null {
  if (!secretsDirectory) return null;
  const path = resolve(secretsDirectory, VAPID_FILENAME);
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as VapidKeys;
    if (raw.publicKey && raw.privateKey) return raw;
  } catch {
    // Absent/unreadable: generate below.
  }
  const keys = webpush.generateVAPIDKeys();
  mkdirSync(secretsDirectory, { recursive: true });
  writeFileSync(path, `${JSON.stringify(keys, null, 2)}\n`);
  return keys;
}

export function getPushPublicKey(): string | null {
  return loadOrCreateVapidKeys()?.publicKey ?? null;
}

export function savePushSubscription(
  database: DatabaseHandle,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
): void {
  database.sqlite
    .prepare(
      `INSERT INTO push_subscriptions (endpoint, p256dh, auth, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`,
    )
    .run(
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth,
      new Date().toISOString(),
    );
}

export function removePushSubscription(
  database: DatabaseHandle,
  endpoint: string,
): void {
  database.sqlite
    .prepare("DELETE FROM push_subscriptions WHERE endpoint = ?")
    .run(endpoint);
}

// The last send's outcome, surfaced in Settings → Notifications so a failing
// push is diagnosable instead of silently swallowed.
let lastSendResult: string | null = null;

export function getPushDiagnostics(database: DatabaseHandle): {
  subscriptions: number;
  lastResult: string | null;
} {
  let subscriptions = 0;
  try {
    subscriptions = (
      database.sqlite
        .prepare("SELECT COUNT(*) AS n FROM push_subscriptions")
        .get() as { n: number }
    ).n;
  } catch {
    // Table unavailable; report zero.
  }
  return { subscriptions, lastResult: lastSendResult };
}

// Best-effort broadcast to every subscribed device. Dead subscriptions
// (endpoint gone: 404/410) are pruned as they surface; other failures are
// recorded for the Notifications screen but never break the caller.
export async function sendPushToAllDevices(
  database: DatabaseHandle,
  payload: { title: string; body: string; url: string },
): Promise<string> {
  const keys = loadOrCreateVapidKeys();
  if (!keys) {
    lastSendResult = "No VAPID keys (secrets directory unavailable).";
    return lastSendResult;
  }
  let rows: { endpoint: string; p256dh: string; auth: string }[];
  try {
    rows = database.sqlite
      .prepare("SELECT endpoint, p256dh, auth FROM push_subscriptions")
      .all() as { endpoint: string; p256dh: string; auth: string }[];
  } catch {
    lastSendResult = "Could not read subscriptions.";
    return lastSendResult;
  }
  if (rows.length === 0) {
    lastSendResult = "No devices subscribed.";
    return lastSendResult;
  }

  const body = JSON.stringify(payload);
  let sent = 0;
  let pruned = 0;
  const failures: string[] = [];
  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          body,
          {
            vapidDetails: {
              subject: VAPID_SUBJECT,
              publicKey: keys.publicKey,
              privateKey: keys.privateKey,
            },
            TTL: 3600,
          },
        );
        sent += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          pruned += 1;
          try {
            removePushSubscription(database, row.endpoint);
          } catch {
            // Pruning is best-effort.
          }
        } else {
          failures.push(
            `${statusCode ?? "?"} ${(error as Error).message ?? ""}`.trim(),
          );
        }
      }
    }),
  );
  lastSendResult = `${new Date().toISOString()} — sent ${sent}/${rows.length}${
    pruned ? `, removed ${pruned} expired` : ""
  }${failures.length ? `, failed: ${failures.join("; ").slice(0, 200)}` : ""}`;
  return lastSendResult;
}
