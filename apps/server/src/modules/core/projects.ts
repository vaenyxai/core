import { randomUUID } from "node:crypto";

import type {
  CreateProjectRequest,
  Project,
  UpdateProjectInstructionsRequest,
  UpdateProjectRequest,
} from "@vaenyx/contracts";

import type { DatabaseHandle } from "../../db/database.js";

const GENERAL_PROJECT_ID = "general";

interface ProjectRow {
  id: string;
  name: string;
  description: string;
  task_count: number;
  memory_count: number;
  thread_count: number;
  chat_thread_count: number;
  task_thread_count: number;
  instructions_manual: string;
  instructions_auto: string;
  instructions_auto_updated_at: string | null;
}

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    taskCount: row.task_count,
    memoryCount: row.memory_count,
    threadCount: row.thread_count,
    chatThreadCount: row.chat_thread_count,
    taskThreadCount: row.task_thread_count,
    instructionsManual: row.instructions_manual,
    instructionsAuto: row.instructions_auto,
    instructionsAutoUpdatedAt: row.instructions_auto_updated_at,
  };
}

const projectSelect = `
  SELECT projects.id, projects.name, projects.description,
    projects.instructions_manual, projects.instructions_auto,
    projects.instructions_auto_updated_at,
    (SELECT COUNT(*) FROM tasks WHERE tasks.project_id = projects.id) AS task_count,
    (SELECT COUNT(*) FROM project_memories WHERE project_memories.project_id = projects.id) AS memory_count,
    (SELECT COUNT(*) FROM vaenyx_threads WHERE vaenyx_threads.project_id = projects.id AND vaenyx_threads.status != 'archived') AS thread_count,
    (SELECT COUNT(*) FROM vaenyx_threads WHERE vaenyx_threads.project_id = projects.id AND vaenyx_threads.kind = 'chat' AND vaenyx_threads.status != 'archived') AS chat_thread_count,
    (SELECT COUNT(*) FROM vaenyx_threads WHERE vaenyx_threads.project_id = projects.id AND vaenyx_threads.kind = 'task' AND vaenyx_threads.status != 'archived') AS task_thread_count
  FROM projects
`;

export function listProjects(
  database: DatabaseHandle,
  modeId: string | null = null,
): Project[] {
  // Sandbox filter (Custom Mode M2): each session sees its own mode's
  // projects only; the seeded projects (mode_id NULL) belong to User Mode.
  return (
    database.sqlite
      .prepare(
        `${projectSelect}
         WHERE ((? IS NULL AND projects.mode_id IS NULL)
            OR projects.mode_id = ?)
         ORDER BY
           CASE WHEN projects.id = ? THEN 1 ELSE 0 END,
           projects.name`,
      )
      .all(modeId, modeId, GENERAL_PROJECT_ID) as unknown as ProjectRow[]
  ).map(toProject);
}

export function createProject(
  database: DatabaseHandle,
  input: CreateProjectRequest,
  modeId: string | null = null,
): Project {
  const id = randomUUID();

  database.sqlite
    .prepare(
      "INSERT INTO projects (id, name, description, mode_id) VALUES (?, ?, ?, ?)",
    )
    .run(id, input.name.trim(), input.description.trim(), modeId);

  return listProjects(database, modeId).find((project) => project.id === id)!;
}

export function updateProject(
  database: DatabaseHandle,
  projectId: string,
  input: UpdateProjectRequest,
): Project {
  const result = database.sqlite
    .prepare("UPDATE projects SET name = ?, description = ? WHERE id = ?")
    .run(input.name.trim(), input.description.trim(), projectId);

  if (result.changes === 0) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  return listProjects(database).find((project) => project.id === projectId)!;
}

// Dual instruction windows (spec §7): either window may be updated on its own;
// "" clears a window. The automatic window's timestamp moves on ANY write to
// it — the Owner editing it is as current as Vaenyx rewriting it. Unsorted
// (the general project) deliberately has no instructions, matching its
// no-shared-memory rule.
export function updateProjectInstructions(
  database: DatabaseHandle,
  projectId: string,
  input: UpdateProjectInstructionsRequest,
): Project {
  if (projectId === GENERAL_PROJECT_ID) {
    throw new Error("PROJECT_INSTRUCTIONS_NOT_SUPPORTED");
  }

  if (input.manual !== undefined) {
    const result = database.sqlite
      .prepare("UPDATE projects SET instructions_manual = ? WHERE id = ?")
      .run(input.manual.trim(), projectId);
    if (result.changes === 0) throw new Error("PROJECT_NOT_FOUND");
  }

  if (input.auto !== undefined) {
    const auto = input.auto.trim();
    const result = database.sqlite
      .prepare(
        `UPDATE projects
         SET instructions_auto = ?,
             instructions_auto_updated_at = ?
         WHERE id = ?`,
      )
      .run(auto, auto === "" ? null : new Date().toISOString(), projectId);
    if (result.changes === 0) throw new Error("PROJECT_NOT_FOUND");
  }

  const project = listProjects(database).find(
    (candidate) => candidate.id === projectId,
  );
  if (!project) throw new Error("PROJECT_NOT_FOUND");
  return project;
}
