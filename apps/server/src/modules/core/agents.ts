import type { AgentProfile } from "@vaenyx/contracts";
import type { UpdateAgentProfileNameRequest } from "@vaenyx/contracts";

import type { DatabaseHandle } from "../../db/database.js";

interface AgentProfileRow {
  id: string;
  name: string;
  role: string;
  personality: string;
  voice: string;
  boundaries: string;
  provider_route: string;
  editable: 0 | 1;
  created_at: string;
  updated_at: string;
}

export function listAgentProfiles(database: DatabaseHandle): AgentProfile[] {
  const rows = database.sqlite
    .prepare(
      `SELECT id, name, role, personality, voice, boundaries, provider_route,
              editable, created_at, updated_at
       FROM agent_profiles
       ORDER BY name`,
    )
    .all() as unknown as AgentProfileRow[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    role: row.role,
    personality: row.personality,
    voice: row.voice,
    boundaries: row.boundaries,
    providerRoute: row.provider_route,
    editable: row.editable === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function updateAgentProfileName(
  database: DatabaseHandle,
  id: string,
  input: UpdateAgentProfileNameRequest,
): AgentProfile {
  const name = input.name.trim();

  if (!name) {
    throw new Error("AGENT_PROFILE_NAME_REQUIRED");
  }

  const existing = database.sqlite
    .prepare("SELECT editable FROM agent_profiles WHERE id = ?")
    .get(id) as { editable: 0 | 1 } | undefined;

  if (!existing) {
    throw new Error("AGENT_PROFILE_NOT_FOUND");
  }

  if (existing.editable !== 1) {
    throw new Error("AGENT_PROFILE_NOT_EDITABLE");
  }

  database.sqlite
    .prepare(
      `UPDATE agent_profiles
       SET name = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .run(name, id);

  const profile = listAgentProfiles(database).find((item) => item.id === id);

  if (!profile) {
    throw new Error("AGENT_PROFILE_NOT_FOUND");
  }

  return profile;
}
