// The outbound half of the flywheel, actually leaving the house. flywheel.ts
// decides what may go and holds it in the window; this decides whether the
// moment has come, and hands it to the one hop it makes (core-cloud, which
// passes it to the publisher and keeps nothing).
//
// Four gates, and every one of them can stop a send on its own:
//
//   1. The household turned sharing on and has not turned it off (I1 / K3).
//   2. The item is past its 48-hour window and is not sensitive (flywheel.ts).
//   3. The publisher asked to receive corrections about this Method (K9) —
//      enforced by the service, which answers NOT_RECEIVING, not by us.
//   4. The Method came from the Community. A Method the household wrote itself
//      has no publisher to send anything to.
//
// A failed send stays queued and is tried again. It is never dropped quietly:
// the whole point of the queue is that the Owner can see what is waiting.
import { randomUUID } from "node:crypto";

import type { DatabaseHandle } from "../../db/database.js";

import { listDue, markSent, getContributorId } from "./flywheel.js";
import { listLegalAcknowledgements } from "./legal-records.js";
import { getMethodProvenance } from "./methods.js";

export interface SendOutcome {
  attempted: number;
  sent: number;
  refused: number;
  failed: number;
}

/** The pseudonymous instance id that rides the evidence record. Deliberately
 *  NOT the contributor id: that one is a credit label the Owner can see and
 *  quote, this one exists only so the operator can tell two consent records
 *  apart when investigating. Random, and never derived from anything about the
 *  machine or the person. */
export function getInstanceId(database: DatabaseHandle): string {
  const read = () =>
    (
      database.sqlite
        .prepare(
          "SELECT value FROM instance_settings WHERE key = 'flywheel_instance_id'",
        )
        .get() as { value: string } | undefined
    )?.value ?? null;
  const existing = read();
  if (existing) return existing;
  const id = randomUUID();
  database.sqlite
    .prepare(
      `INSERT INTO instance_settings (key, value, updated_at)
       VALUES ('flywheel_instance_id', ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO NOTHING`,
    )
    .run(id);
  return read() ?? id;
}

interface AckRow {
  keyName: string;
  copyVersion: string;
  choice: string | null;
  createdAt: string;
}

/** The household's live sharing choice, and the record that evidences it.
 *  No record reads as off: nothing is shared until someone chooses to.
 *
 *  TWO records are required, and this is the important part. The old Sharing
 *  setting was chosen when nothing could leave the machine — it cannot now be
 *  read as agreement to upload, because that is not what anyone was shown. So
 *  sending also needs the activation record (K3), taken on a surface that
 *  describes the whole mechanism. Until that exists this returns off, whatever
 *  the older setting says. */
export function readSharingChoice(acks: AckRow[]): {
  mode: "automatic" | "review-each" | "off";
  copyVersion: string;
  grantEventId: string;
  activated: boolean;
} {
  const row = acks.find((ack) => ack.keyName === "legal.consent.flywheel");
  const activation = acks.find(
    (ack) => ack.keyName === "legal.consent.flywheel.activate",
  );
  const activated = activation?.choice === "accept";
  const choice = row?.choice ?? null;
  const setting =
    choice === "accept" || choice === "automatic"
      ? "automatic"
      : choice === "review-each"
        ? "review-each"
        : "off";
  return {
    mode: activated ? setting : "off",
    // The activation record is the one that authorises an upload, so it is the
    // one the evidence has to name.
    copyVersion: activation?.copyVersion ?? row?.copyVersion ?? "",
    grantEventId: activation
      ? `${activation.keyName}@${activation.createdAt}`
      : "",
    activated,
  };
}

/** Vaenyx has one Owner; their id is what the consent records are filed under.
 *  Read rather than passed, because the sweep runs on a timer with no request
 *  behind it. */
export function ownerProfileId(database: DatabaseHandle): string | null {
  const row = database.sqlite
    .prepare("SELECT id FROM owners ORDER BY rowid LIMIT 1")
    .get() as { id: string } | undefined;
  return row?.id ?? null;
}

export function readOwnerAcks(database: DatabaseHandle): AckRow[] {
  const ownerId = ownerProfileId(database);
  if (!ownerId) return [];
  return listLegalAcknowledgements(database, ownerId).map((ack) => ({
    keyName: ack.keyName,
    copyVersion: ack.copyVersion,
    choice: ack.choice,
    createdAt: ack.createdAt,
  }));
}

/** A Method the household wrote itself has no publisher to write to; only one
 *  installed from the Community does. */
export function communityItemIdFor(
  libraryDirectory: string,
  methodId: string,
): string | null {
  const meta = getMethodProvenance(libraryDirectory, methodId);
  return meta?.origin === "community" ? methodId : null;
}

/** Everything the sweep needs, gathered from the instance itself. The tick and
 *  the Send Now button call this same function, so there is one answer to
 *  "what would be sent" rather than two that can drift. */
export async function sweepFlywheel(
  database: DatabaseHandle,
  config: { publishServiceUrl: string | null; libraryDirectory: string },
  fetchImpl?: typeof fetch,
): Promise<SendOutcome> {
  const acks = readOwnerAcks(database);
  return sendDueExamples(database, {
    serviceUrl: config.publishServiceUrl,
    acks,
    // Which Terms this household accepted. The install acceptance is the same
    // event under an older key on instances set up before the key was split.
    tosVersion:
      acks.find((ack) => ack.keyName === "legal.consent.terms")?.copyVersion ??
      acks.find((ack) => ack.keyName === "legal.consent.install")?.copyVersion ??
      "unknown",
    communityItemId: (methodId) =>
      communityItemIdFor(config.libraryDirectory, methodId),
    fetchImpl,
  });
}

export interface SendDependencies {
  serviceUrl: string | null;
  acks: AckRow[];
  tosVersion: string;
  /** Which of the queued Methods came from the Community, and under what id
   *  there. A Method with no community origin has no publisher to write to. */
  communityItemId: (methodId: string) => string | null;
  fetchImpl?: typeof fetch;
  nowMs?: number;
}

export async function sendDueExamples(
  database: DatabaseHandle,
  deps: SendDependencies,
): Promise<SendOutcome> {
  const outcome: SendOutcome = { attempted: 0, sent: 0, refused: 0, failed: 0 };
  if (!deps.serviceUrl) return outcome;

  const sharing = readSharingChoice(deps.acks);
  // Off means off. Review-each does not sweep either: those items wait for the
  // Owner to send them one at a time, which is what choosing it asked for.
  if (sharing.mode !== "automatic") return outcome;

  const due = listDue(database, deps.nowMs ?? Date.now());
  if (due.length === 0) return outcome;

  const doFetch = deps.fetchImpl ?? fetch;
  const contributorId = getContributorId(database);
  const instanceId = getInstanceId(database);

  for (const item of due) {
    const communityId = deps.communityItemId(item.methodId);
    if (!communityId) continue;
    outcome.attempted += 1;
    try {
      const response = await doFetch(`${deps.serviceUrl}/flywheel/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "method",
          itemId: communityId,
          contributorId,
          example: { input: item.input, output: item.output, note: item.note },
          evidence: {
            contentHash: item.methodId,
            tosVersion: deps.tosVersion,
            sharingCopyVersion: sharing.copyVersion,
            grantEventId: sharing.grantEventId,
            instanceId,
            sharingMode: sharing.mode,
            sensitiveConfirmed: false,
            uploadPath: "automatic",
          },
        }),
      });
      if (response.ok) {
        markSent(database, item.id);
        outcome.sent += 1;
        continue;
      }
      if (response.status === 403 || response.status === 400) {
        // The publisher does not want these, or the service will not take this
        // shape. Retrying changes nothing, so the item stops being queued —
        // but it is marked sent, not deleted, so the Owner's own copy stays.
        markSent(database, item.id);
        outcome.refused += 1;
        continue;
      }
      // Rate limited, paused, or the service is having a bad day: leave it
      // queued and come back to it.
      outcome.failed += 1;
    } catch {
      // Offline. Exactly the same answer: it waits.
      outcome.failed += 1;
    }
  }

  return outcome;
}
