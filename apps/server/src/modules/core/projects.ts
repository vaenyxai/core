import { randomUUID } from "node:crypto";

import type {
  CreateProjectRequest,
  Project,
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
  };
}

const projectSelect = `
  SELECT projects.id, projects.name, projects.description,
    (SELECT COUNT(*) FROM tasks WHERE tasks.project_id = projects.id) AS task_count,
    (SELECT COUNT(*) FROM project_memories WHERE project_memories.project_id = projects.id) AS memory_count,
    (SELECT COUNT(*) FROM vaenyx_threads WHERE vaenyx_threads.project_id = projects.id AND vaenyx_threads.status != 'archived') AS thread_count,
    (SELECT COUNT(*) FROM vaenyx_threads WHERE vaenyx_threads.project_id = projects.id AND vaenyx_threads.kind = 'chat' AND vaenyx_threads.status != 'archived') AS chat_thread_count,
    (SELECT COUNT(*) FROM vaenyx_threads WHERE vaenyx_threads.project_id = projects.id AND vaenyx_threads.kind = 'task' AND vaenyx_threads.status != 'archived') AS task_thread_count
  FROM projects
`;

export function listProjects(database: DatabaseHandle): Project[] {
  return (
    database.sqlite
      .prepare(
        `${projectSelect}
         ORDER BY
           CASE WHEN projects.id = ? THEN 1 ELSE 0 END,
           projects.name`,
      )
      .all(GENERAL_PROJECT_ID) as unknown as ProjectRow[]
  ).map(toProject);
}

export function createProject(
  database: DatabaseHandle,
  input: CreateProjectRequest,
): Project {
  const id = randomUUID();

  database.sqlite
    .prepare("INSERT INTO projects (id, name, description) VALUES (?, ?, ?)")
    .run(id, input.name.trim(), input.description.trim());

  return listProjects(database).find((project) => project.id === id)!;
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
