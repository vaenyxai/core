import { randomUUID } from "node:crypto";

import type {
  CreateProjectMemoryRequest,
  ProjectMemory,
  UpdateProjectMemoryRequest,
} from "@vaenyx/contracts";

import type { DatabaseHandle } from "../../db/database.js";

const GENERAL_PROJECT_ID = "general";

interface MemoryRow {
  id: string;
  project_id: string;
  project_name: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

function toMemory(row: MemoryRow): ProjectMemory {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name,
    kind: "project",
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const memorySelect = `
  SELECT project_memories.*, projects.name AS project_name
  FROM project_memories
  JOIN projects ON projects.id = project_memories.project_id
`;

export function listProjectMemories(
  database: DatabaseHandle,
  projectId?: string,
  modeId: string | null = null,
): ProjectMemory[] {
  if (projectId === GENERAL_PROJECT_ID) {
    return [];
  }

  // Sandbox filter (Custom Mode M2): memories stay inside the mode that
  // wrote them; User Mode (null) sees only User-Mode memories.
  const modeClause = `((? IS NULL AND project_memories.mode_id IS NULL)
        OR project_memories.mode_id = ?)`;
  const rows = projectId
    ? database.sqlite
        .prepare(
          `${memorySelect}
           WHERE project_memories.project_id = ?
             AND ${modeClause}
           ORDER BY project_memories.updated_at DESC`,
        )
        .all(projectId, modeId, modeId)
    : database.sqlite
        .prepare(
          `${memorySelect}
           WHERE project_memories.project_id != ?
             AND ${modeClause}
           ORDER BY project_memories.updated_at DESC`,
        )
        .all(GENERAL_PROJECT_ID, modeId, modeId);

  return (rows as unknown as MemoryRow[]).map(toMemory);
}

export function createProjectMemory(
  database: DatabaseHandle,
  input: CreateProjectMemoryRequest,
  modeId: string | null = null,
): ProjectMemory {
  if (input.projectId === GENERAL_PROJECT_ID) {
    throw new Error("GENERAL_PROJECT_MEMORY_DISABLED");
  }

  const project = database.sqlite
    .prepare("SELECT id FROM projects WHERE id = ?")
    .get(input.projectId);

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  database.sqlite
    .prepare(
      `INSERT INTO project_memories (
        id, project_id, title, content, created_at, updated_at, mode_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.projectId,
      input.title.trim(),
      input.content.trim(),
      now,
      now,
      modeId,
    );

  return listProjectMemories(database, undefined, modeId).find(
    (memory) => memory.id === id,
  )!;
}

export function updateProjectMemory(
  database: DatabaseHandle,
  memoryId: string,
  input: UpdateProjectMemoryRequest,
): ProjectMemory {
  const result = database.sqlite
    .prepare(
      `UPDATE project_memories
       SET title = ?, content = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(input.title.trim(), input.content.trim(), new Date().toISOString(), memoryId);

  if (result.changes === 0) {
    throw new Error("MEMORY_NOT_FOUND");
  }

  return listProjectMemories(database).find((memory) => memory.id === memoryId)!;
}

export function deleteProjectMemory(
  database: DatabaseHandle,
  memoryId: string,
): ProjectMemory {
  const memory = listProjectMemories(database).find((item) => item.id === memoryId);

  if (!memory) {
    throw new Error("MEMORY_NOT_FOUND");
  }

  database.sqlite.prepare("DELETE FROM project_memories WHERE id = ?").run(memoryId);
  return memory;
}
