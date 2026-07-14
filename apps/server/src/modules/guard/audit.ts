import { randomUUID } from "node:crypto";

import type { AuditEvent } from "@vaenyx/contracts";

import type { DatabaseHandle } from "../../db/database.js";

export interface AuditInput {
  actorType: "owner" | "app" | "system";
  actorId?: string | null;
  actorName: string;
  action: string;
  decision: "allowed" | "denied";
  reason: string;
  projectId?: string | null;
  resourceType: string;
  resourceId?: string | null;
}

interface AuditRow {
  id: string;
  actor_type: "owner" | "app" | "system";
  actor_name: string;
  action: string;
  decision: "allowed" | "denied";
  reason: string;
  project_id: string | null;
  project_name: string | null;
  resource_type: string;
  resource_id: string | null;
  created_at: string;
}

export function recordAudit(database: DatabaseHandle, input: AuditInput): void {
  database.sqlite
    .prepare(
      `INSERT INTO audit_events (
        id, actor_type, actor_id, actor_name, action, decision, reason,
        project_id, resource_type, resource_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      randomUUID(),
      input.actorType,
      input.actorId ?? null,
      input.actorName,
      input.action,
      input.decision,
      input.reason,
      input.projectId ?? null,
      input.resourceType,
      input.resourceId ?? null,
    );
}

export function listAuditEvents(database: DatabaseHandle): AuditEvent[] {
  const rows = database.sqlite
    .prepare(
      `SELECT audit_events.*, projects.name AS project_name
       FROM audit_events
       LEFT JOIN projects ON projects.id = audit_events.project_id
       ORDER BY audit_events.created_at DESC
       LIMIT 200`,
    )
    .all() as unknown as AuditRow[];

  return rows.map((row) => ({
    id: row.id,
    actorType: row.actor_type,
    actorName: row.actor_name,
    action: row.action,
    decision: row.decision,
    reason: row.reason,
    projectId: row.project_id,
    projectName: row.project_name,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    createdAt: row.created_at,
  }));
}
