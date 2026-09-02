import {
  chmodSync,
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import type { AppConfig } from "../src/config.js";
import { resetLoginThrottle } from "../src/modules/guard/rate-limit.js";

const temporaryDirectories: string[] = [];
const originalCodexCommand = process.env.VAENYX_CODEX_COMMAND;

function createTestConfig(): AppConfig {
  // Production keeps userdata and config as siblings. Give every test the
  // same isolated shape so app-language.ts never reads a shared
  // %TEMP%\config\language.json left by another local instance or QA run.
  const instanceDirectory = mkdtempSync(resolve(tmpdir(), "vaenyx-test-"));
  const dataDirectory = resolve(instanceDirectory, "userdata");
  temporaryDirectories.push(instanceDirectory);

  // The library is COPIED, never pointed at the repo's sample-library. Paths
  // that only ever read were safe to share; the moment one of them writes — a
  // correction becoming an example, a Method being created — a test run edits
  // the files that ship in the download. That happened once (2026-07-26) and
  // the stray example was committed before anyone noticed.
  const libraryRoot = resolve(dataDirectory, "library");
  cpSync(resolve("..", "..", "sample-library"), libraryRoot, {
    recursive: true,
  });

  return {
    corsOrigins: [],
    dataDirectory,
    databasePath: resolve(dataDirectory, "vaenyx.db"),
    host: "127.0.0.1",
    libraryDirectory: resolve(libraryRoot, "methods"),
    routinesDirectory: resolve(libraryRoot, "routines"),
    docsDirectory: resolve("..", "..", "docs"),
    logLevel: "silent",
    migrationsDirectory: resolve("migrations"),
    mode: "test",
    port: 3000,
    version: "0.2.0-dev.3",
    webDistDirectory: resolve(dataDirectory, "missing-web-dist"),
    secretsDirectory: resolve(dataDirectory, "secrets"),
    publish: null,
    googleOAuth: null,
  };
}

async function createOwnerAndSession(
  app: Awaited<ReturnType<typeof buildApp>>,
): Promise<string> {
  const setup = await app.inject({
    method: "POST",
    url: "/v1/setup",
    payload: {
      name: "Oskar",
      password: "private-password",
    },
  });

  return String(setup.headers["set-cookie"]);
}

afterEach(() => {
  resetLoginThrottle();

  if (originalCodexCommand === undefined) {
    delete process.env.VAENYX_CODEX_COMMAND;
  } else {
    process.env.VAENYX_CODEX_COMMAND = originalCodexCommand;
  }

  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

function createFakeCodexCommand(): string {
  const directory = mkdtempSync(resolve(tmpdir(), "vaenyx-fake-codex-"));
  temporaryDirectories.push(directory);
  const scriptPath = resolve(directory, "fake-codex.mjs");
  const commandPath = resolve(
    directory,
    process.platform === "win32" ? "fake-codex.cmd" : "fake-codex",
  );

  writeFileSync(
    scriptPath,
    `
import { createInterface } from "node:readline";

const args = process.argv.slice(2);

if (args.includes("--version")) {
  console.log("codex 0.0.0-test");
  process.exit(0);
}

if (args[0] === "login" && args[1] === "status") {
  console.log("Logged in using ChatGPT");
  process.exit(0);
}

if (!args.includes("app-server")) {
  process.exit(1);
}

const lines = createInterface({ input: process.stdin });
const send = (message) => {
  process.stdout.write(JSON.stringify(message) + "\\n");
};

lines.on("line", (line) => {
  const message = JSON.parse(line);

  if (message.method === "initialize") {
    send({ id: message.id, result: {} });
    return;
  }

  if (message.method === "thread/start") {
    send({ id: message.id, result: { thread: { id: "thread-test" } } });
    return;
  }

  if (message.method === "turn/start") {
    const text = message.params.input[0].text;

    if (text.includes("boundary please")) {
      send({
        method: "item/completed",
        params: { item: { type: "commandExecution" } },
      });
      send({ method: "turn/completed", params: {} });
      return;
    }

    if (text.includes("weather") || text.includes("today")) {
      send({
        method: "item/completed",
        params: { item: { type: "webSearch" } },
      });
    }

    const answer = text.includes("PURPOSE_METADATA_MUST_NOT_REACH_MODEL")
      ? "Conversation purpose leaked into model context."
      : text.includes("Need structured choice") && !text.includes("Scenic")
        ? 'I need one decision.\\n\\n<!--VAENYX_QUESTION_V1:{"prompt":"Which route should I use?","helpText":"You can also type another route.","options":["Scenic","Fast"]}-->'
        : text.includes("First question") && text.includes("Follow up")
          ? "Follow-up saw earlier context."
          : "Vaenyx Chat answered with live context.";

    for (const piece of answer.split(" ")) {
      send({
        method: "item/agentMessage/delta",
        params: { delta: piece + " " },
      });
    }
    send({
      method: "item/completed",
      params: {
        item: {
          phase: "final_answer",
          text: answer,
          type: "agentMessage",
        },
      },
    });
    send({ method: "turn/completed", params: {} });
  }
});
`,
    "utf8",
  );
  if (process.platform === "win32") {
    writeFileSync(
      commandPath,
      `@echo off\r\n"${process.execPath}" "${scriptPath}" %*\r\n`,
      "utf8",
    );
  } else {
    writeFileSync(
      commandPath,
      `#!/bin/sh\nexec "${process.execPath}" "${scriptPath}" "$@"\n`,
      "utf8",
    );
    chmodSync(commandPath, 0o755);
  }

  return commandPath;
}

describe("Vaenyx Gateway foundation", () => {
  it("reports that the process is healthy", async () => {
    const app = await buildApp(createTestConfig());

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("DENY");

    await app.close();
  });

  it("reports the Core and SQLite status", async () => {
    const config = createTestConfig();
    const app = await buildApp(config);

    const response = await app.inject({
      method: "GET",
      url: "/v1/system/status",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      name: "Vaenyx",
      version: "0.2.0-dev.3",
      status: "ready",
      mode: "test",
      database: {
        engine: "sqlite",
        status: "ready",
      },
    });

    await app.close();

    const sqlite = new DatabaseSync(config.databasePath, {
      readOnly: true,
    });
    const migratedTable = sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
      )
      .get("instance_settings");
    sqlite.close();

    expect(migratedTable).toBeDefined();
  });

  it("lets the Owner stop the local server from Settings", async () => {
    const app = await buildApp(createTestConfig());

    const unauthorized = await app.inject({
      method: "POST",
      url: "/v1/system/shutdown",
      payload: {},
    });
    expect(unauthorized.statusCode).toBe(401);

    const sessionCookie = await createOwnerAndSession(app);
    const shutdown = await app.inject({
      method: "POST",
      url: "/v1/system/shutdown",
      headers: { cookie: sessionCookie },
      payload: {},
    });
    expect(shutdown.statusCode).toBe(200);
    expect(shutdown.json().message).toContain("stopping");

    const audit = await app.inject({
      method: "GET",
      url: "/v1/guard/audit",
      headers: { cookie: sessionCookie },
    });
    expect(audit.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "system.shutdown",
          decision: "allowed",
        }),
      ]),
    );

    await app.close();
  });

  it("keeps an actively used session alive by rolling its expiry forward", async () => {
    const config = createTestConfig();
    const app = await buildApp(config);
    const sessionCookie = await createOwnerAndSession(app);

    const fresh = await app.inject({
      method: "GET",
      url: "/v1/workspace",
      headers: { cookie: sessionCookie },
    });
    expect(fresh.statusCode).toBe(200);
    expect(fresh.headers["set-cookie"]).toBeUndefined();

    const day = 24 * 60 * 60 * 1000;
    const stale = new DatabaseSync(config.databasePath);
    stale
      .prepare("UPDATE owner_sessions SET expires_at = ?")
      .run(new Date(Date.now() + 100 * day).toISOString());
    stale.close();

    const renewed = await app.inject({
      method: "GET",
      url: "/v1/workspace",
      headers: { cookie: sessionCookie },
    });
    expect(renewed.statusCode).toBe(200);
    expect(String(renewed.headers["set-cookie"])).toContain("vaenyx_session=");
    expect(String(renewed.headers["set-cookie"])).toContain("Max-Age=31536000");

    const verify = new DatabaseSync(config.databasePath, { readOnly: true });
    const row = verify
      .prepare("SELECT expires_at FROM owner_sessions")
      .get() as { expires_at: string };
    verify.close();
    expect(new Date(row.expires_at).getTime()).toBeGreaterThan(
      Date.now() + 360 * day,
    );

    const kill = new DatabaseSync(config.databasePath);
    kill
      .prepare("UPDATE owner_sessions SET expires_at = ?")
      .run(new Date(Date.now() - 1000).toISOString());
    kill.close();

    const dead = await app.inject({
      method: "GET",
      url: "/v1/workspace",
      headers: { cookie: sessionCookie },
    });
    expect(dead.statusCode).toBe(401);
    expect(dead.headers["set-cookie"]).toBeUndefined();

    await app.close();
  });

  it("creates the first owner, protects the workspace, and completes a Mock Task", async () => {
    const app = await buildApp(createTestConfig());

    const beforeSetup = await app.inject({
      method: "GET",
      url: "/v1/bootstrap/status",
    });
    expect(beforeSetup.json()).toEqual({
      setupRequired: true,
      authenticated: false,
      owner: null,
    });

    const setup = await app.inject({
      method: "POST",
      url: "/v1/setup",
      payload: {
        name: "Oskar",
        password: "private-password",
      },
    });
    const sessionCookie = setup.headers["set-cookie"];

    expect(setup.statusCode).toBe(200);
    expect(sessionCookie).toContain("HttpOnly");
    expect(sessionCookie).toContain("SameSite=Strict");

    const unauthorizedWorkspace = await app.inject({
      method: "GET",
      url: "/v1/workspace",
    });
    expect(unauthorizedWorkspace.statusCode).toBe(401);

    const workspace = await app.inject({
      method: "GET",
      url: "/v1/workspace",
      headers: {
        cookie: sessionCookie,
      },
    });
    expect(workspace.statusCode).toBe(200);
    expect(workspace.json()).toMatchObject({
      owner: {
        name: "Oskar",
      },
      tasks: [],
    });
    expect(workspace.json().projects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "vaenyx",
          name: "Testing Project",
        }),
        expect.objectContaining({
          id: "general",
          name: "General",
        }),
      ]),
    );
    expect(workspace.json().skills).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "general-ask",
          name: "General Ask",
        }),
        expect.objectContaining({
          id: "forge-readonly",
          name: "Forge Read-only Review",
        }),
        expect.objectContaining({
          id: "task-brief",
          name: "Task Brief",
        }),
      ]),
    );
    expect(workspace.json().agents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "vaenyx",
          name: "Vaenyx",
          role: "Owner-facing local coordinator",
          editable: true,
        }),
        expect.objectContaining({
          id: "forge",
          name: "Forge",
          providerRoute: "codex-harness",
          editable: true,
        }),
      ]),
    );
    expect(workspace.json().vaenyxMe).toMatchObject({
      ownerModel: "digital-self",
    });
    expect(workspace.json().vaenyxMe.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "owner-identity",
          status: "not_learned",
          title: "Owner identity",
        }),
        expect.objectContaining({
          id: "communication-style",
          title: "Communication style",
        }),
      ]),
    );

    const task = await app.inject({
      method: "POST",
      url: "/v1/tasks",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        request: "Explain what Vaenyx can do.",
        projectId: "vaenyx",
        skillId: "general-ask",
      },
    });
    expect(task.statusCode).toBe(200);
    expect(task.json()).toMatchObject({
      status: "completed",
      projectName: "Testing Project",
      skillName: "General Ask",
      provider: "mock-provider",
      harness: "mock-harness",
      autonomyLevel: 0,
    });

    const workspaceAfterTask = await app.inject({
      method: "GET",
      url: "/v1/workspace",
      headers: {
        cookie: sessionCookie,
      },
    });
    expect(workspaceAfterTask.json().tasks).toHaveLength(1);
    expect(workspaceAfterTask.json().threads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "task",
          taskId: task.json().id,
          projectId: "vaenyx",
        }),
      ]),
    );

    const logout = await app.inject({
      method: "POST",
      url: "/v1/auth/logout",
      headers: {
        cookie: sessionCookie,
      },
      payload: {},
    });
    expect(logout.statusCode).toBe(200);

    await app.close();
  });

  it("lets the Owner update Vaenyx Agent display names only", async () => {
    const app = await buildApp(createTestConfig());
    const sessionCookie = await createOwnerAndSession(app);

    const unauthorized = await app.inject({
      method: "PUT",
      url: "/v1/agent-profiles/vaenyx/name",
      payload: {
        name: "My Vaenyx",
      },
    });
    expect(unauthorized.statusCode).toBe(401);

    const updated = await app.inject({
      method: "PUT",
      url: "/v1/agent-profiles/vaenyx/name",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        name: "My Vaenyx",
      },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({
      id: "vaenyx",
      name: "My Vaenyx",
      providerRoute: "mock-harness",
      editable: true,
    });

    const workspace = await app.inject({
      method: "GET",
      url: "/v1/workspace",
      headers: {
        cookie: sessionCookie,
      },
    });
    expect(workspace.json().agents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "vaenyx",
          name: "My Vaenyx",
        }),
      ]),
    );

    const audit = await app.inject({
      method: "GET",
      url: "/v1/guard/audit",
      headers: {
        cookie: sessionCookie,
      },
    });
    expect(audit.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "agent_profile.name.update",
          decision: "allowed",
          resourceId: "vaenyx",
        }),
      ]),
    );

    await app.close();
  });

  it("creates a structured Task Brief in Mock mode", async () => {
    const app = await buildApp(createTestConfig());
    const sessionCookie = await createOwnerAndSession(app);

    const task = await app.inject({
      method: "POST",
      url: "/v1/tasks",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        request: "Plan the next real workflow for Vaenyx.",
        projectId: "vaenyx",
        skillId: "task-brief",
      },
    });

    expect(task.statusCode).toBe(200);
    expect(task.json()).toMatchObject({
      status: "completed",
      skillName: "Task Brief",
      provider: "mock-provider",
      harness: "mock-harness",
    });
    expect(task.json().result).toContain("Goal");
    expect(task.json().result).toContain("Current Situation");
    expect(task.json().result).toContain("Needed Information");
    expect(task.json().result).toContain("Suggested Steps");
    expect(task.json().result).toContain("Risks");
    expect(task.json().result).toContain("Next Action");

    await app.close();
  });

  it("keeps Vaenyx Chat behind Owner login and stores local conversations", async () => {
    process.env.VAENYX_CODEX_COMMAND = createFakeCodexCommand();
    const app = await buildApp(createTestConfig());

    const unauthorized = await app.inject({
      method: "GET",
      url: "/v1/ask-vaenyx/conversations",
    });
    expect(unauthorized.statusCode).toBe(401);
    const unauthorizedSearch = await app.inject({
      method: "GET",
      url: "/v1/ask-vaenyx/search?q=weather",
    });
    expect(unauthorizedSearch.statusCode).toBe(401);

    const sessionCookie = await createOwnerAndSession(app);
    const created = await app.inject({
      method: "POST",
      url: "/v1/ask-vaenyx/conversations",
      headers: { cookie: sessionCookie },
      payload: {},
    });

    expect(created.statusCode).toBe(200);
    expect(created.json()).toMatchObject({
      title: "New Vaenyx Chat",
      messageCount: 0,
    });

    const firstReply = await app.inject({
      method: "POST",
      url: `/v1/ask-vaenyx/conversations/${created.json().id}/messages`,
      headers: { cookie: sessionCookie },
      payload: {
        content: "First question: what is the weather today?",
      },
    });

    expect(firstReply.statusCode).toBe(200);
    expect(firstReply.json().conversation).toMatchObject({
      messageCount: 2,
    });
    expect(firstReply.json().messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "owner",
          status: "completed",
          webSearchUsed: false,
        }),
        expect.objectContaining({
          role: "assistant",
          status: "completed",
          webSearchUsed: true,
        }),
      ]),
    );

    const followUp = await app.inject({
      method: "POST",
      url: `/v1/ask-vaenyx/conversations/${created.json().id}/messages`,
      headers: { cookie: sessionCookie },
      payload: {
        content: "Follow up: what did I ask first?",
      },
    });

    expect(followUp.statusCode).toBe(200);
    expect(followUp.json().conversation).toMatchObject({
      messageCount: 4,
    });
    expect(followUp.json().messages[1].content).toBe(
      "Follow-up saw earlier context.",
    );

    const messages = await app.inject({
      method: "GET",
      url: `/v1/ask-vaenyx/conversations/${created.json().id}/messages`,
      headers: { cookie: sessionCookie },
    });
    expect(messages.statusCode).toBe(200);
    expect(messages.json()).toHaveLength(4);

    const search = await app.inject({
      method: "GET",
      url: `/v1/ask-vaenyx/search?q=${encodeURIComponent('"First question"')}`,
      headers: { cookie: sessionCookie },
    });
    expect(search.statusCode).toBe(200);
    expect(search.json().results).toEqual([
      expect.objectContaining({
        conversationId: created.json().id,
        title: expect.any(String),
        archived: false,
        excerpt: expect.stringContaining("First question"),
        highlights: expect.arrayContaining([
          expect.objectContaining({
            start: expect.any(Number),
            end: expect.any(Number),
          }),
        ]),
      }),
    ]);

    const conversations = await app.inject({
      method: "GET",
      url: "/v1/ask-vaenyx/conversations",
      headers: { cookie: sessionCookie },
    });
    expect(conversations.statusCode).toBe(200);
    expect(conversations.json()[0]).toMatchObject({
      id: created.json().id,
      messageCount: 4,
    });

    const project = await app.inject({
      method: "POST",
      url: "/v1/projects",
      headers: { cookie: sessionCookie },
      payload: {
        name: "Conversation project",
        description: "Used to organize local Vaenyx Chat threads.",
      },
    });
    expect(project.statusCode).toBe(200);

    const movedThread = await app.inject({
      method: "PUT",
      url: `/v1/threads/${created.json().id}/project`,
      headers: { cookie: sessionCookie },
      payload: {
        projectId: project.json().id,
      },
    });
    expect(movedThread.statusCode).toBe(200);
    expect(movedThread.json()).toMatchObject({
      kind: "chat",
      conversationId: created.json().id,
      projectId: project.json().id,
      projectName: "Conversation project",
    });

    const pinnedThread = await app.inject({
      method: "PUT",
      url: `/v1/threads/${created.json().id}/status`,
      headers: { cookie: sessionCookie },
      payload: {
        status: "pinned",
      },
    });
    expect(pinnedThread.statusCode).toBe(200);
    expect(pinnedThread.json()).toMatchObject({
      id: created.json().id,
      status: "pinned",
    });

    const workspaceAfterMove = await app.inject({
      method: "GET",
      url: "/v1/workspace",
      headers: { cookie: sessionCookie },
    });
    expect(workspaceAfterMove.json().projects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: project.json().id,
          chatThreadCount: 1,
          threadCount: 1,
        }),
      ]),
    );

    const linkedTask = await app.inject({
      method: "POST",
      url: "/v1/tasks",
      headers: { cookie: sessionCookie },
      payload: {
        request: "Create a task from this Vaenyx Chat.",
        projectId: "vaenyx",
        skillId: "general-ask",
        sourceChatId: created.json().id,
      },
    });
    expect(linkedTask.statusCode).toBe(200);
    expect(linkedTask.json()).toMatchObject({
      sourceChatId: created.json().id,
      sourceChatTitle: expect.any(String),
      threadId: linkedTask.json().id,
      threadStatus: "active",
      threadProjectId: "vaenyx",
      threadProjectName: "Testing Project",
    });

    const workspaceAfterLinkedTask = await app.inject({
      method: "GET",
      url: "/v1/workspace",
      headers: { cookie: sessionCookie },
    });
    expect(workspaceAfterLinkedTask.json().tasks[0]).toMatchObject({
      id: linkedTask.json().id,
      sourceChatId: created.json().id,
      sourceChatTitle: expect.any(String),
      threadStatus: "active",
    });
    expect(workspaceAfterLinkedTask.json().threads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "task",
          taskId: linkedTask.json().id,
          sourceChatId: created.json().id,
        }),
      ]),
    );

    const taskMessages = await app.inject({
      method: "GET",
      url: `/v1/tasks/${linkedTask.json().id}/messages`,
      headers: { cookie: sessionCookie },
    });
    expect(taskMessages.statusCode).toBe(200);
    expect(taskMessages.json()).toEqual([
      expect.objectContaining({
        role: "owner",
        content: "Create a task from this Vaenyx Chat.",
      }),
      expect.objectContaining({
        role: "assistant",
        status: "completed",
      }),
    ]);

    const taskFollowUp = await app.inject({
      method: "POST",
      url: `/v1/tasks/${linkedTask.json().id}/messages`,
      headers: { cookie: sessionCookie },
      payload: {
        content: "For this task, what is the weather today?",
      },
    });
    expect(taskFollowUp.statusCode).toBe(200);
    expect(taskFollowUp.json().conversation).toMatchObject({
      messageCount: 4,
    });
    expect(taskFollowUp.json().messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "assistant",
          status: "completed",
          webSearchUsed: true,
        }),
      ]),
    );

    const conversationsAfterTaskFollowUp = await app.inject({
      method: "GET",
      url: "/v1/ask-vaenyx/conversations",
      headers: { cookie: sessionCookie },
    });
    expect(conversationsAfterTaskFollowUp.statusCode).toBe(200);
    expect(conversationsAfterTaskFollowUp.json()).toHaveLength(1);
    expect(conversationsAfterTaskFollowUp.json()[0]).toMatchObject({
      id: created.json().id,
    });

    const deleteBeforeArchive = await app.inject({
      method: "GET",
      url: `/v1/ask-vaenyx/conversations/${created.json().id}/delete-preview`,
      headers: { cookie: sessionCookie },
    });
    expect(deleteBeforeArchive.statusCode).toBe(409);

    const archived = await app.inject({
      method: "PUT",
      url: `/v1/threads/${created.json().id}/status`,
      headers: { cookie: sessionCookie },
      payload: { status: "archived" },
    });
    expect(archived.statusCode).toBe(200);

    const archivedSearch = await app.inject({
      method: "GET",
      url: "/v1/ask-vaenyx/search?q=weather",
      headers: { cookie: sessionCookie },
    });
    expect(archivedSearch.json().results).toEqual(
      expect.arrayContaining([expect.objectContaining({ archived: true })]),
    );

    const deletePreview = await app.inject({
      method: "GET",
      url: `/v1/ask-vaenyx/conversations/${created.json().id}/delete-preview`,
      headers: { cookie: sessionCookie },
    });
    expect(deletePreview.statusCode).toBe(200);

    const deleted = await app.inject({
      method: "DELETE",
      url: `/v1/ask-vaenyx/conversations/${created.json().id}`,
      headers: { cookie: sessionCookie },
      payload: {
        memoryAction: "keep",
        previewRevision: deletePreview.json().revision,
      },
    });
    expect(deleted.statusCode).toBe(200);

    const conversationsAfterDelete = await app.inject({
      method: "GET",
      url: "/v1/ask-vaenyx/conversations",
      headers: { cookie: sessionCookie },
    });
    expect(conversationsAfterDelete.statusCode).toBe(200);
    expect(conversationsAfterDelete.json()).toHaveLength(0);

    const messagesAfterDelete = await app.inject({
      method: "GET",
      url: `/v1/ask-vaenyx/conversations/${created.json().id}/messages`,
      headers: { cookie: sessionCookie },
    });
    expect(messagesAfterDelete.statusCode).toBe(404);

    const searchAfterDelete = await app.inject({
      method: "GET",
      url: `/v1/ask-vaenyx/search?q=${encodeURIComponent('"First question"')}`,
      headers: { cookie: sessionCookie },
    });
    expect(searchAfterDelete.json()).toEqual({ results: [] });

    await app.close();
  });

  it("accepts each recovered client message id only once", async () => {
    process.env.VAENYX_CODEX_COMMAND = createFakeCodexCommand();
    const app = await buildApp(createTestConfig());
    const sessionCookie = await createOwnerAndSession(app);
    const created = await app.inject({
      method: "POST",
      url: "/v1/ask-vaenyx/conversations",
      headers: { cookie: sessionCookie },
      payload: {},
    });
    const conversationId = created.json().id as string;
    const clientMessageId = "device-draft-chat-1";
    const send = () =>
      app.inject({
        method: "POST",
        url: `/v1/ask-vaenyx/conversations/${conversationId}/messages`,
        headers: { cookie: sessionCookie },
        payload: { content: "Keep this recovered turn once.", clientMessageId },
      });

    expect((await send()).statusCode).toBe(200);
    expect((await send()).statusCode).toBe(200);

    const status = await app.inject({
      method: "GET",
      url: `/v1/ask-vaenyx/conversations/${conversationId}/messages/client/${clientMessageId}`,
      headers: { cookie: sessionCookie },
    });
    expect(status.json()).toMatchObject({
      accepted: true,
      conversationId,
      messageId: expect.any(String),
    });

    const messages = await app.inject({
      method: "GET",
      url: `/v1/ask-vaenyx/conversations/${conversationId}/messages`,
      headers: { cookie: sessionCookie },
    });
    expect(messages.json()).toHaveLength(2);

    const conflict = await app.inject({
      method: "POST",
      url: `/v1/ask-vaenyx/conversations/${conversationId}/messages`,
      headers: { cookie: sessionCookie },
      payload: { content: "Different content.", clientMessageId },
    });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json().error).toContain("different content");

    const task = await app.inject({
      method: "POST",
      url: "/v1/tasks",
      headers: { cookie: sessionCookie },
      payload: {
        request: "Make a recovery test task.",
        projectId: "vaenyx",
        skillId: "general-ask",
      },
    });
    expect(task.statusCode).toBe(200);
    const taskId = task.json().id as string;
    const taskClientMessageId = "device-draft-task-1";
    const sendTask = () =>
      app.inject({
        method: "POST",
        url: `/v1/tasks/${taskId}/messages`,
        headers: { cookie: sessionCookie },
        payload: {
          content: "Keep this task follow-up once.",
          clientMessageId: taskClientMessageId,
        },
      });
    expect((await sendTask()).statusCode).toBe(200);
    expect((await sendTask()).statusCode).toBe(200);

    const taskStatus = await app.inject({
      method: "GET",
      url: `/v1/tasks/${taskId}/messages/client/${taskClientMessageId}`,
      headers: { cookie: sessionCookie },
    });
    expect(taskStatus.json()).toMatchObject({
      accepted: true,
      messageId: expect.any(String),
    });
    const taskMessages = await app.inject({
      method: "GET",
      url: `/v1/tasks/${taskId}/messages`,
      headers: { cookie: sessionCookie },
    });
    expect(taskMessages.json()).toHaveLength(4);

    await app.close();
  });

  it("fails closed when Vaenyx Chat tries to cross the chat boundary", async () => {
    process.env.VAENYX_CODEX_COMMAND = createFakeCodexCommand();
    const app = await buildApp(createTestConfig());
    const sessionCookie = await createOwnerAndSession(app);
    const created = await app.inject({
      method: "POST",
      url: "/v1/ask-vaenyx/conversations",
      headers: { cookie: sessionCookie },
      payload: {},
    });

    const reply = await app.inject({
      method: "POST",
      url: `/v1/ask-vaenyx/conversations/${created.json().id}/messages`,
      headers: { cookie: sessionCookie },
      payload: {
        content: "boundary please",
      },
    });

    expect(reply.statusCode).toBe(200);
    expect(reply.json().messages[1]).toMatchObject({
      role: "assistant",
      status: "failed",
      webSearchUsed: false,
    });
    expect(reply.json().messages[1].content).toContain(
      "Error VX-SAFETY-BOUNDARY · Diagnostic vx-",
    );

    await app.close();
  });

  it("streams a Vaenyx Chat reply over SSE and persists it", async () => {
    process.env.VAENYX_CODEX_COMMAND = createFakeCodexCommand();
    const app = await buildApp(createTestConfig());
    const sessionCookie = await createOwnerAndSession(app);

    const created = await app.inject({
      method: "POST",
      url: "/v1/ask-vaenyx/conversations",
      headers: { cookie: sessionCookie },
      payload: {},
    });
    const conversationId = created.json().id;

    const streamed = await app.inject({
      method: "POST",
      url: `/v1/ask-vaenyx/conversations/${conversationId}/messages/stream`,
      headers: { cookie: sessionCookie },
      payload: { content: "Hello over the stream" },
    });

    expect(streamed.statusCode).toBe(200);
    expect(streamed.headers["content-type"]).toContain("text/event-stream");
    const body = streamed.payload;
    expect(body).toContain("event: owner");
    expect(body).toContain("event: delta");
    expect(body).toContain("event: done");

    const messages = await app.inject({
      method: "GET",
      url: `/v1/ask-vaenyx/conversations/${conversationId}/messages`,
      headers: { cookie: sessionCookie },
    });
    expect(messages.json()).toHaveLength(2);
    expect(messages.json()[1]).toMatchObject({
      role: "assistant",
      status: "completed",
    });

    const unauthorized = await app.inject({
      method: "POST",
      url: `/v1/ask-vaenyx/conversations/${conversationId}/messages/stream`,
      payload: { content: "no cookie" },
    });
    expect(unauthorized.statusCode).toBe(401);

    await app.close();
  });

  it("persists and idempotently resolves structured questions", async () => {
    process.env.VAENYX_CODEX_COMMAND = createFakeCodexCommand();
    const config = createTestConfig();
    let app = await buildApp(config);
    const sessionCookie = await createOwnerAndSession(app);
    const created = await app.inject({
      method: "POST",
      url: "/v1/ask-vaenyx/conversations",
      headers: { cookie: sessionCookie },
      payload: {},
    });
    const conversationId = created.json().id;
    await app.inject({
      method: "POST",
      url: `/v1/ask-vaenyx/conversations/${conversationId}/messages`,
      headers: { cookie: sessionCookie },
      payload: { content: "Warm up" },
    });
    const asked = await app.inject({
      method: "POST",
      url: `/v1/ask-vaenyx/conversations/${conversationId}/messages`,
      headers: { cookie: sessionCookie },
      payload: { content: "Need structured choice" },
    });
    expect(asked.statusCode).toBe(200);
    const questionMessage = asked
      .json()
      .messages.find(
        (message: { role: string }) => message.role === "assistant",
      );
    const question = questionMessage.parts[0];
    expect(questionMessage.content).not.toContain("VAENYX_QUESTION_V1");
    expect(questionMessage.content).toContain("Other: write your own answer");
    expect(question).toMatchObject({
      type: "structured-question",
      version: 1,
      prompt: "Which route should I use?",
      allowFreeText: true,
      allowSkip: true,
      state: { status: "open" },
    });

    const unauthorized = await app.inject({
      method: "POST",
      url: `/v1/ask-vaenyx/conversations/${conversationId}/questions/${question.questionId}/resolve`,
      payload: { kind: "choice", optionId: "option-1" },
    });
    expect(unauthorized.statusCode).toBe(401);
    const invalid = await app.inject({
      method: "POST",
      url: `/v1/ask-vaenyx/conversations/${conversationId}/questions/${question.questionId}/resolve`,
      headers: { cookie: sessionCookie },
      payload: { kind: "choice", optionId: "missing" },
    });
    expect(invalid.statusCode).toBe(400);

    const resolved = await app.inject({
      method: "POST",
      url: `/v1/ask-vaenyx/conversations/${conversationId}/questions/${question.questionId}/resolve`,
      headers: { cookie: sessionCookie },
      payload: { kind: "choice", optionId: "option-1" },
    });
    expect(resolved.statusCode).toBe(200);
    expect(resolved.json().conversation.messageCount).toBe(6);
    const duplicate = await app.inject({
      method: "POST",
      url: `/v1/ask-vaenyx/conversations/${conversationId}/questions/${question.questionId}/resolve`,
      headers: { cookie: sessionCookie },
      payload: { kind: "skip" },
    });
    expect(duplicate.statusCode).toBe(200);
    expect(duplicate.json().conversation.messageCount).toBe(6);

    await app.close();
    app = await buildApp(config);
    const afterRestart = await app.inject({
      method: "GET",
      url: `/v1/ask-vaenyx/conversations/${conversationId}/messages`,
      headers: { cookie: sessionCookie },
    });
    expect(afterRestart.statusCode).toBe(200);
    expect(
      afterRestart
        .json()
        .filter(
          (message: { role: string; content: string }) =>
            message.role === "owner" && message.content === "Scenic",
        ),
    ).toHaveLength(1);
    expect(
      afterRestart
        .json()
        .find((message: { id: string }) => message.id === questionMessage.id)
        .parts[0].state,
    ).toMatchObject({
      status: "resolved",
      kind: "choice",
      optionId: "option-1",
      displayText: "Scenic",
    });
    await app.close();
  });

  it("keeps Conversation identity searchable, persistent, and out of model context", async () => {
    process.env.VAENYX_CODEX_COMMAND = createFakeCodexCommand();
    const config = createTestConfig();
    let app = await buildApp(config);
    const sessionCookie = await createOwnerAndSession(app);
    const created = await app.inject({
      method: "POST",
      url: "/v1/ask-vaenyx/conversations",
      headers: { cookie: sessionCookie },
      payload: {},
    });
    const conversationId = created.json().id;

    const unauthorized = await app.inject({
      method: "PUT",
      url: `/v1/threads/${conversationId}/details`,
      payload: { title: "Private planning", purpose: "Not yours" },
    });
    expect(unauthorized.statusCode).toBe(401);

    const updated = await app.inject({
      method: "PUT",
      url: `/v1/threads/${conversationId}/details`,
      headers: { cookie: sessionCookie },
      payload: {
        title: "  Kitchen   decisions  ",
        purpose:
          "PURPOSE_METADATA_MUST_NOT_REACH_MODEL — compare cabinet quotes.",
      },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({
      title: "Kitchen decisions",
      purpose:
        "PURPOSE_METADATA_MUST_NOT_REACH_MODEL — compare cabinet quotes.",
      projectId: null,
    });

    const answered = await app.inject({
      method: "POST",
      url: `/v1/ask-vaenyx/conversations/${conversationId}/messages`,
      headers: { cookie: sessionCookie },
      payload: { content: "Confirm that ordinary chat still works." },
    });
    expect(answered.statusCode).toBe(200);
    expect(answered.json().messages.at(-1).content).toBe(
      "Vaenyx Chat answered with live context.",
    );
    expect(answered.json().conversation.title).toBe("Kitchen decisions");

    const purposeSearch = await app.inject({
      method: "GET",
      url: `/v1/ask-vaenyx/search?q=${encodeURIComponent('"cabinet quotes"')}`,
      headers: { cookie: sessionCookie },
    });
    expect(purposeSearch.statusCode).toBe(200);
    expect(purposeSearch.json().results[0]).toMatchObject({
      conversationId,
      title: "Kitchen decisions",
      matchField: "purpose",
      purpose:
        "PURPOSE_METADATA_MUST_NOT_REACH_MODEL — compare cabinet quotes.",
    });

    await app.close();
    app = await buildApp(config);
    const workspace = await app.inject({
      method: "GET",
      url: "/v1/workspace",
      headers: { cookie: sessionCookie },
    });
    expect(workspace.statusCode).toBe(200);
    expect(workspace.json().threads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          conversationId,
          title: "Kitchen decisions",
          purpose:
            "PURPOSE_METADATA_MUST_NOT_REACH_MODEL — compare cabinet quotes.",
          projectId: null,
        }),
      ]),
    );

    const cleared = await app.inject({
      method: "PUT",
      url: `/v1/threads/${conversationId}/details`,
      headers: { cookie: sessionCookie },
      payload: { title: "Kitchen decisions", purpose: "" },
    });
    expect(cleared.statusCode).toBe(200);
    expect(cleared.json()).toMatchObject({
      title: "Kitchen decisions",
      purpose: null,
    });
    await app.close();
  });

  it("rejects an incorrect owner password", async () => {
    const app = await buildApp(createTestConfig());

    await app.inject({
      method: "POST",
      url: "/v1/setup",
      payload: {
        name: "Oskar",
        password: "private-password",
      },
    });

    const login = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: {
        password: "wrong-password",
      },
    });

    expect(login.statusCode).toBe(401);
    expect(login.json()).toEqual({
      error: "Incorrect password.",
    });

    await app.close();
  });

  it("blocks remote owner setup but allows local setup", async () => {
    const app = await buildApp(createTestConfig());

    const remote = await app.inject({
      method: "POST",
      url: "/v1/setup",
      headers: { "x-forwarded-for": "203.0.113.5" },
      payload: {
        name: "Intruder",
        password: "intruder-password",
      },
    });
    expect(remote.statusCode).toBe(403);

    const local = await app.inject({
      method: "POST",
      url: "/v1/setup",
      payload: {
        name: "Oskar",
        password: "private-password",
      },
    });
    expect(local.statusCode).toBe(200);

    await app.close();
  });

  it("rate-limits repeated failed owner logins", async () => {
    const app = await buildApp(createTestConfig());
    await app.inject({
      method: "POST",
      url: "/v1/setup",
      payload: { name: "Oskar", password: "private-password" },
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const failed = await app.inject({
        method: "POST",
        url: "/v1/auth/login",
        payload: { password: "wrong-password" },
      });
      expect(failed.statusCode).toBe(401);
    }

    const blocked = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { password: "wrong-password" },
    });
    expect(blocked.statusCode).toBe(429);

    // Even the correct password is refused while the client is locked out.
    const correctButLocked = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { password: "private-password" },
    });
    expect(correctButLocked.statusCode).toBe(429);

    await app.close();
  });

  it("changes the owner password and signs out other devices", async () => {
    const app = await buildApp(createTestConfig());
    const sessionCookie = await createOwnerAndSession(app);

    const wrongCurrent = await app.inject({
      method: "POST",
      url: "/v1/auth/change-password",
      headers: { cookie: sessionCookie },
      payload: {
        currentPassword: "not-the-password",
        newPassword: "a-new-strong-password",
      },
    });
    expect(wrongCurrent.statusCode).toBe(401);

    const changed = await app.inject({
      method: "POST",
      url: "/v1/auth/change-password",
      headers: { cookie: sessionCookie },
      payload: {
        currentPassword: "private-password",
        newPassword: "a-new-strong-password",
      },
    });
    expect(changed.statusCode).toBe(200);
    const newCookie = String(changed.headers["set-cookie"]);
    expect(newCookie).toContain("vaenyx_session=");

    // The original session was invalidated by the password change.
    const oldSession = await app.inject({
      method: "GET",
      url: "/v1/workspace",
      headers: { cookie: sessionCookie },
    });
    expect(oldSession.statusCode).toBe(401);

    // The freshly issued session for this device still works.
    const currentSession = await app.inject({
      method: "GET",
      url: "/v1/workspace",
      headers: { cookie: newCookie },
    });
    expect(currentSession.statusCode).toBe(200);

    // The new password is now the valid one.
    const login = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { password: "a-new-strong-password" },
    });
    expect(login.statusCode).toBe(200);

    await app.close();
  });

  it("signs out every device on logout-all", async () => {
    const app = await buildApp(createTestConfig());
    const sessionCookie = await createOwnerAndSession(app);

    const before = await app.inject({
      method: "GET",
      url: "/v1/workspace",
      headers: { cookie: sessionCookie },
    });
    expect(before.statusCode).toBe(200);

    const logoutAll = await app.inject({
      method: "POST",
      url: "/v1/auth/logout-all",
      headers: { cookie: sessionCookie },
      payload: {},
    });
    expect(logoutAll.statusCode).toBe(200);

    const after = await app.inject({
      method: "GET",
      url: "/v1/workspace",
      headers: { cookie: sessionCookie },
    });
    expect(after.statusCode).toBe(401);

    await app.close();
  });

  it("blocks Forge from projects outside the Vaenyx repository boundary", async () => {
    const app = await buildApp(createTestConfig());
    const sessionCookie = await createOwnerAndSession(app);
    const project = await app.inject({
      method: "POST",
      url: "/v1/projects",
      headers: { cookie: sessionCookie },
      payload: {
        name: "Other project",
        description: "Must remain outside Forge v0.1.",
      },
    });

    const task = await app.inject({
      method: "POST",
      url: "/v1/tasks",
      headers: { cookie: sessionCookie },
      payload: {
        request: "Inspect this other project.",
        projectId: project.json().id,
        executionMode: "forge-readonly",
      },
    });

    expect(task.statusCode).toBe(403);
    expect(task.json().error).toContain("Vaenyx project only");
    await app.close();
  });

  it("fails closed when Forge cannot use a ChatGPT-authenticated Codex CLI", async () => {
    const app = await buildApp(createTestConfig());
    const sessionCookie = await createOwnerAndSession(app);

    const task = await app.inject({
      method: "POST",
      url: "/v1/tasks",
      headers: { cookie: sessionCookie },
      payload: {
        request: "Inspect Vaenyx without changing it.",
        projectId: "vaenyx",
        skillId: "forge-readonly",
        executionMode: "forge-readonly",
      },
    });

    // Forge now runs in the background: creation returns a running task, and the
    // failure lands shortly after. Poll until it reaches a terminal state so the
    // assertion (and teardown) wait for the background run to finish.
    expect(task.statusCode).toBe(200);
    expect(task.json()).toMatchObject({ status: "running", agent: "Forge" });
    const taskId = task.json().id as string;

    let settled = task.json();
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const workspace = await app.inject({
        method: "GET",
        url: "/v1/workspace",
        headers: { cookie: sessionCookie },
      });
      const found = workspace
        .json()
        .tasks.find((candidate: { id: string }) => candidate.id === taskId);
      if (found && found.status !== "running") {
        settled = found;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    expect(settled).toMatchObject({
      status: "failed",
      provider: "openai-subscription-auth",
      harness: "codex-harness",
      agent: "Forge",
    });
    expect(settled.result).toContain("Error VX-MODEL-INSTALL · Diagnostic vx-");
    await app.close();
  });

  it("keeps Vaenyx Me learning behind Owner review", async () => {
    const app = await buildApp(createTestConfig());

    const unauthorized = await app.inject({
      method: "GET",
      url: "/v1/vaenyx-me/candidates",
    });
    expect(unauthorized.statusCode).toBe(401);

    const sessionCookie = await createOwnerAndSession(app);
    const candidatesBefore = await app.inject({
      method: "GET",
      url: "/v1/vaenyx-me/candidates",
      headers: { cookie: sessionCookie },
    });
    expect(candidatesBefore.statusCode).toBe(200);
    expect(candidatesBefore.json()).toEqual([]);

    const candidate = await app.inject({
      method: "POST",
      url: "/v1/vaenyx-me/candidates",
      headers: { cookie: sessionCookie },
      payload: {
        category: "communication",
        title: "Communication style",
        proposedSummary: "The Owner prefers concise explanations.",
        proposedEvidence: "The Owner asked Vaenyx for clear, simple answers.",
        confidence: 80,
      },
    });
    expect(candidate.statusCode).toBe(200);
    expect(candidate.json()).toMatchObject({
      category: "communication",
      status: "pending_review",
      sourceType: "owner_manual",
    });

    const workspaceBeforeApproval = await app.inject({
      method: "GET",
      url: "/v1/workspace",
      headers: { cookie: sessionCookie },
    });
    expect(workspaceBeforeApproval.json().vaenyxMe.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "communication-style",
          status: "not_learned",
        }),
      ]),
    );

    const approved = await app.inject({
      method: "POST",
      url: `/v1/vaenyx-me/candidates/${candidate.json().id}/approve`,
      headers: { cookie: sessionCookie },
      payload: {
        title: "Communication style",
        summary: "The Owner prefers concise, practical explanations.",
        evidence: "Approved by the Owner from visible review evidence.",
        confidence: 85,
        reviewNote: "Edited before approving.",
      },
    });
    expect(approved.statusCode).toBe(200);
    expect(approved.json()).toMatchObject({
      status: "approved",
      proposedSummary: "The Owner prefers concise, practical explanations.",
      reviewNote: "Edited before approving.",
    });

    const workspaceAfterApproval = await app.inject({
      method: "GET",
      url: "/v1/workspace",
      headers: { cookie: sessionCookie },
    });
    expect(workspaceAfterApproval.json().vaenyxMe.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "communication-style",
          status: "approved",
          summary: "The Owner prefers concise, practical explanations.",
          evidence: "Approved by the Owner from visible review evidence.",
          confidence: 85,
        }),
      ]),
    );

    const rejectTarget = await app.inject({
      method: "POST",
      url: "/v1/vaenyx-me/candidates",
      headers: { cookie: sessionCookie },
      payload: {
        category: "preferences",
        title: "Stable preferences",
        proposedSummary: "One message should become a permanent preference.",
        proposedEvidence: "Weak evidence.",
        confidence: 15,
      },
    });
    const rejected = await app.inject({
      method: "POST",
      url: `/v1/vaenyx-me/candidates/${rejectTarget.json().id}/reject`,
      headers: { cookie: sessionCookie },
      payload: {
        reviewNote: "Not enough evidence.",
      },
    });
    expect(rejected.statusCode).toBe(200);
    expect(rejected.json()).toMatchObject({
      status: "rejected",
      reviewNote: "Not enough evidence.",
    });

    const deleteTarget = await app.inject({
      method: "POST",
      url: "/v1/vaenyx-me/candidates",
      headers: { cookie: sessionCookie },
      payload: {
        category: "trust",
        title: "Trust by Project",
        proposedSummary: "Delete this draft.",
        proposedEvidence: "Owner cleanup.",
        confidence: 5,
      },
    });
    const deleted = await app.inject({
      method: "DELETE",
      url: `/v1/vaenyx-me/candidates/${deleteTarget.json().id}`,
      headers: { cookie: sessionCookie },
    });
    expect(deleted.statusCode).toBe(200);

    const candidatesAfter = await app.inject({
      method: "GET",
      url: "/v1/vaenyx-me/candidates",
      headers: { cookie: sessionCookie },
    });
    expect(candidatesAfter.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: candidate.json().id,
          status: "approved",
        }),
        expect.objectContaining({
          id: rejectTarget.json().id,
          status: "rejected",
        }),
      ]),
    );
    expect(JSON.stringify(candidatesAfter.json())).not.toContain(
      deleteTarget.json().id,
    );

    const audit = await app.inject({
      method: "GET",
      url: "/v1/guard/audit",
      headers: { cookie: sessionCookie },
    });
    expect(audit.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "vaenyx_me.candidate.create",
          decision: "allowed",
        }),
        expect.objectContaining({
          action: "vaenyx_me.candidate.approve",
          decision: "allowed",
        }),
        expect.objectContaining({
          action: "vaenyx_me.item.update",
          decision: "allowed",
        }),
        expect.objectContaining({
          action: "vaenyx_me.candidate.reject",
          decision: "allowed",
        }),
        expect.objectContaining({
          action: "vaenyx_me.candidate.delete",
          decision: "allowed",
        }),
      ]),
    );

    await app.close();
  });

  it("returns a simple validation error without exposing internals", async () => {
    const app = await buildApp(createTestConfig());

    const response = await app.inject({
      method: "POST",
      url: "/v1/setup",
      payload: {
        name: "",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "Vaenyx could not understand that request.",
    });

    await app.close();
  });

  it("creates a least-privilege App Profile and rejects out-of-scope App requests", async () => {
    const app = await buildApp(createTestConfig());

    const unauthorizedCreate = await app.inject({
      method: "POST",
      url: "/v1/app-profiles",
      payload: {
        name: "Customer PWA",
        allowedSkillIds: ["general-ask"],
      },
    });
    expect(unauthorizedCreate.statusCode).toBe(401);

    const setup = await app.inject({
      method: "POST",
      url: "/v1/setup",
      payload: {
        name: "Oskar",
        password: "private-password",
      },
    });
    const sessionCookie = setup.headers["set-cookie"];

    const createProfile = await app.inject({
      method: "POST",
      url: "/v1/app-profiles",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        name: "Customer PWA",
        allowedSkillIds: ["general-ask"],
      },
    });
    const created = createProfile.json();

    expect(createProfile.statusCode).toBe(200);
    expect(created.token).toMatch(/^vaenyx_app_/);
    expect(created.profile).toMatchObject({
      name: "Customer PWA",
      allowedSkillIds: ["general-ask"],
      maxAutonomyLevel: 0,
      memoryWritePolicy: "none",
    });

    const profiles = await app.inject({
      method: "GET",
      url: "/v1/app-profiles",
      headers: {
        cookie: sessionCookie,
      },
    });
    expect(profiles.statusCode).toBe(200);
    expect(profiles.json()).toHaveLength(1);
    expect(JSON.stringify(profiles.json())).not.toContain(created.token);

    const invalidToken = await app.inject({
      method: "POST",
      url: "/v1/app/ask",
      headers: {
        authorization: "Bearer vaenyx_app_invalid",
      },
      payload: {
        request: "Try an invalid token.",
      },
    });
    expect(invalidToken.statusCode).toBe(401);

    const disallowedSkill = await app.inject({
      method: "POST",
      url: "/v1/app/ask",
      headers: {
        authorization: `Bearer ${created.token}`,
      },
      payload: {
        request: "Try an unapproved skill.",
        skillId: "admin-skill",
      },
    });
    expect(disallowedSkill.statusCode).toBe(403);

    const validAsk = await app.inject({
      method: "POST",
      url: "/v1/app/ask",
      headers: {
        authorization: `Bearer ${created.token}`,
      },
      payload: {
        request: "Ask from my external PWA.",
      },
    });
    expect(validAsk.statusCode).toBe(200);
    expect(validAsk.json()).toMatchObject({
      source: "app",
      sourceAppId: created.profile.id,
      sourceAppName: "Customer PWA",
      // App Profiles have no project binding; their tasks land in General.
      projectId: "general",
      skillId: "general-ask",
      autonomyLevel: 0,
    });

    const workspace = await app.inject({
      method: "GET",
      url: "/v1/workspace",
      headers: {
        cookie: sessionCookie,
      },
    });
    expect(workspace.json().tasks[0]).toMatchObject({
      source: "app",
      sourceAppName: "Customer PWA",
    });

    const disableProfile = await app.inject({
      method: "POST",
      url: `/v1/app-profiles/${created.profile.id}/disable`,
      headers: {
        cookie: sessionCookie,
      },
      payload: {},
    });
    expect(disableProfile.statusCode).toBe(200);
    expect(disableProfile.json()).toMatchObject({
      id: created.profile.id,
      enabled: false,
    });

    const askAfterDisable = await app.inject({
      method: "POST",
      url: "/v1/app/ask",
      headers: {
        authorization: `Bearer ${created.token}`,
      },
      payload: {
        request: "This request should be blocked.",
      },
    });
    expect(askAfterDisable.statusCode).toBe(401);

    await app.close();
  });

  it("ingests external-app corrections only with the sendFeedback permission", async () => {
    const app = await buildApp(createTestConfig());

    const setup = await app.inject({
      method: "POST",
      url: "/v1/setup",
      payload: { name: "Oskar", password: "private-password" },
    });
    const sessionCookie = setup.headers["set-cookie"];

    // A Method Token WITHOUT sendFeedback cannot post corrections (default off).
    const reader = await app.inject({
      method: "POST",
      url: "/v1/app-profiles",
      headers: { cookie: sessionCookie },
      payload: {
        name: "Reader App",
        kind: "method",
        allowedMethodIds: ["sample-summary"],
      },
    });
    expect(reader.statusCode).toBe(200);
    expect(reader.json().profile.sendFeedback).toBe(false);
    const readerToken = reader.json().token;

    const denied = await app.inject({
      method: "POST",
      url: "/v1/library/methods/sample-summary/feedback",
      headers: { authorization: `Bearer ${readerToken}` },
      payload: { version: "1.0.0", reaction: "confirmed" },
    });
    expect(denied.statusCode).toBe(403);

    // A Method Token WITH sendFeedback may post a correction; we get an ingest id.
    const writer = await app.inject({
      method: "POST",
      url: "/v1/app-profiles",
      headers: { cookie: sessionCookie },
      payload: {
        name: "Estimating App",
        kind: "method",
        allowedMethodIds: ["sample-summary"],
        sendFeedback: true,
      },
    });
    expect(writer.json().profile.sendFeedback).toBe(true);
    const writerToken = writer.json().token;

    const accepted = await app.inject({
      method: "POST",
      url: "/v1/library/methods/sample-summary/feedback",
      headers: { authorization: `Bearer ${writerToken}` },
      payload: {
        version: "1.0.0",
        input: { text: "A long passage to summarise." },
        aiOutput: { summary: "Wrong.", keyPoints: ["a"] },
        correctedOutput: {
          summary: "The right summary.",
          keyPoints: ["a", "b"],
        },
        reaction: "edited",
        note: "Fixed the summary.",
      },
    });
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json().id).toMatch(/[0-9a-f-]{36}/);

    // When the version still matches, a corrected output that violates the
    // method's output schema is rejected.
    const badShape = await app.inject({
      method: "POST",
      url: "/v1/library/methods/sample-summary/feedback",
      headers: { authorization: `Bearer ${writerToken}` },
      payload: {
        version: "1.0.0",
        correctedOutput: { summary: 42 },
        reaction: "edited",
      },
    });
    expect(badShape.statusCode).toBe(400);

    // A version mismatch is stored anyway (no schema check against an old version).
    const oldVersion = await app.inject({
      method: "POST",
      url: "/v1/library/methods/sample-summary/feedback",
      headers: { authorization: `Bearer ${writerToken}` },
      payload: {
        version: "0.0.1",
        correctedOutput: { anything: true },
        reaction: "edited",
      },
    });
    expect(oldVersion.statusCode).toBe(200);
    expect(oldVersion.json().id).toMatch(/[0-9a-f-]{36}/);

    // The intake is audited as a kernel feedback action (allowed + denied).
    const audit = await app.inject({
      method: "GET",
      url: "/v1/guard/audit",
      headers: { cookie: sessionCookie },
    });
    expect(audit.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "library.method.feedback",
          decision: "allowed",
        }),
        expect.objectContaining({
          action: "library.method.feedback",
          decision: "denied",
        }),
      ]),
    );

    await app.close();
  });

  it("auto-relocks grants when the Owner's own method changes; community changes still 409", async () => {
    const config = createTestConfig();
    const app = await buildApp(config);
    const sessionCookie = await createOwnerAndSession(app);

    const created = await app.inject({
      method: "POST",
      url: "/v1/app-profiles",
      headers: { cookie: sessionCookie },
      payload: {
        name: "Estimating App",
        kind: "method",
        allowedMethodIds: ["sample-summary"],
        fetchRecipe: true,
      },
    });
    expect(created.statusCode).toBe(200);
    const token = created.json().token;

    const first = await app.inject({
      method: "GET",
      url: "/v1/library/methods/sample-summary/recipe",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(first.statusCode).toBe(200);
    const firstHash = first.json().contentHash;

    // The Owner edits their own method (origin "self") — here directly on
    // disk, the way an assistant edits files. The issued token must keep
    // working: the lock follows the edit instead of demanding a re-grant.
    const methodDir = resolve(config.libraryDirectory, "sample-summary");
    writeFileSync(
      resolve(methodDir, "recipe.md"),
      "# Summarize\n\nReturn summary as a short bullet array.\n",
      "utf8",
    );

    const afterOwnEdit = await app.inject({
      method: "GET",
      url: "/v1/library/methods/sample-summary/recipe",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(afterOwnEdit.statusCode).toBe(200);
    expect(afterOwnEdit.json().contentHash).not.toBe(firstHash);

    // Same edit on a community-origin method: the re-grant gate holds, because
    // that content does not come from the Owner.
    const meta = JSON.parse(
      readFileSync(resolve(methodDir, "method.json"), "utf8"),
    ) as Record<string, unknown>;
    writeFileSync(
      resolve(methodDir, "method.json"),
      JSON.stringify({ ...meta, origin: "community" }, null, 2),
      "utf8",
    );
    writeFileSync(
      resolve(methodDir, "recipe.md"),
      "# Summarize\n\nA third-party revision the Owner never approved.\n",
      "utf8",
    );

    const afterCommunityEdit = await app.inject({
      method: "GET",
      url: "/v1/library/methods/sample-summary/recipe",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(afterCommunityEdit.statusCode).toBe(409);

    await app.close();
  });

  it("isolates project memory and audits Guard decisions", async () => {
    const config = createTestConfig();
    const app = await buildApp(config);
    const setup = await app.inject({
      method: "POST",
      url: "/v1/setup",
      payload: {
        name: "Oskar",
        password: "private-password",
      },
    });
    const sessionCookie = setup.headers["set-cookie"];

    const sqlite = new DatabaseSync(config.databasePath);
    sqlite
      .prepare("INSERT INTO projects (id, name, description) VALUES (?, ?, ?)")
      .run("private-other", "Private Other", "An isolated test project.");
    sqlite.close();

    const vaenyxMemory = await app.inject({
      method: "POST",
      url: "/v1/memories",
      headers: { cookie: sessionCookie },
      payload: {
        projectId: "vaenyx",
        title: "Vaenyx response style",
        content: "Use clear and concise answers.",
      },
    });
    expect(vaenyxMemory.statusCode).toBe(200);

    const otherMemory = await app.inject({
      method: "POST",
      url: "/v1/memories",
      headers: { cookie: sessionCookie },
      payload: {
        projectId: "private-other",
        title: "Other project secret",
        content: "Never expose this outside Private Other.",
      },
    });
    expect(otherMemory.statusCode).toBe(200);

    const ownerTask = await app.inject({
      method: "POST",
      url: "/v1/tasks",
      headers: { cookie: sessionCookie },
      payload: {
        request: "Use only this project's memory.",
        projectId: "vaenyx",
        skillId: "general-ask",
      },
    });
    expect(ownerTask.json()).toMatchObject({
      memoryUsedCount: 1,
      projectId: "vaenyx",
    });
    expect(ownerTask.json().result).toContain("Vaenyx response style");
    expect(ownerTask.json().result).not.toContain("Other project secret");

    // App Profiles have no project binding and never read project memory, so an
    // app task always reports zero memory used regardless of any past setting.
    const appProfile = await app.inject({
      method: "POST",
      url: "/v1/app-profiles",
      headers: { cookie: sessionCookie },
      payload: {
        name: "External App",
        allowedSkillIds: ["general-ask"],
      },
    });
    const appToken = appProfile.json().token;
    const appTask = await app.inject({
      method: "POST",
      url: "/v1/app/ask",
      headers: { authorization: `Bearer ${appToken}` },
      payload: { request: "Try to use memory." },
    });
    expect(appTask.json().memoryUsedCount).toBe(0);
    expect(appTask.json().result).not.toContain("Vaenyx response style");
    expect(appTask.json().result).not.toContain("Other project secret");

    const deniedAutonomy = await app.inject({
      method: "POST",
      url: "/v1/app/ask",
      headers: { authorization: `Bearer ${appToken}` },
      payload: {
        request: "Try a higher autonomy level.",
        autonomyLevel: 1,
      },
    });
    expect(deniedAutonomy.statusCode).toBe(403);

    const updatedMemory = await app.inject({
      method: "PUT",
      url: `/v1/memories/${vaenyxMemory.json().id}`,
      headers: { cookie: sessionCookie },
      payload: {
        title: "Updated response style",
        content: "Use practical answers.",
      },
    });
    expect(updatedMemory.json()).toMatchObject({
      title: "Updated response style",
      content: "Use practical answers.",
    });

    const deletedMemory = await app.inject({
      method: "DELETE",
      url: `/v1/memories/${vaenyxMemory.json().id}`,
      headers: { cookie: sessionCookie },
    });
    expect(deletedMemory.statusCode).toBe(200);

    const audit = await app.inject({
      method: "GET",
      url: "/v1/guard/audit",
      headers: { cookie: sessionCookie },
    });
    expect(audit.statusCode).toBe(200);
    expect(audit.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "app.task.execute",
          decision: "denied",
          reason: "Requested autonomy exceeds the App Profile limit.",
        }),
        expect.objectContaining({
          action: "memory.delete",
          decision: "allowed",
        }),
      ]),
    );

    await app.close();
  });

  it("manages project workspaces and visible instance settings", async () => {
    const app = await buildApp(createTestConfig());

    const unauthorizedProject = await app.inject({
      method: "POST",
      url: "/v1/projects",
      payload: {
        name: "Private Project",
        description: "Should require Owner login.",
      },
    });
    expect(unauthorizedProject.statusCode).toBe(401);

    const setup = await app.inject({
      method: "POST",
      url: "/v1/setup",
      payload: {
        name: "Oskar",
        password: "private-password",
      },
    });
    const sessionCookie = setup.headers["set-cookie"];

    const created = await app.inject({
      method: "POST",
      url: "/v1/projects",
      headers: { cookie: sessionCookie },
      payload: {
        name: "Auzzie Homes",
        description: "Property and business workspace.",
      },
    });
    expect(created.statusCode).toBe(200);
    expect(created.json()).toMatchObject({
      name: "Auzzie Homes",
      taskCount: 0,
      memoryCount: 0,
    });

    const updated = await app.inject({
      method: "PUT",
      url: `/v1/projects/${created.json().id}`,
      headers: { cookie: sessionCookie },
      payload: {
        name: "Auzzie Homes Operations",
        description: "Updated property and business workspace.",
      },
    });
    expect(updated.json()).toMatchObject({
      name: "Auzzie Homes Operations",
    });

    await app.inject({
      method: "POST",
      url: "/v1/memories",
      headers: { cookie: sessionCookie },
      payload: {
        projectId: created.json().id,
        title: "Project rule",
        content: "Keep this inside the project.",
      },
    });

    const workspace = await app.inject({
      method: "GET",
      url: "/v1/workspace",
      headers: { cookie: sessionCookie },
    });
    expect(workspace.json().projects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.json().id,
          memoryCount: 1,
        }),
      ]),
    );

    const settings = await app.inject({
      method: "GET",
      url: "/v1/settings",
      headers: { cookie: sessionCookie },
    });
    expect(settings.json()).toMatchObject({
      instanceName: "My Vaenyx",
      providerConnection: "not-connected",
      harness: "mock-harness",
      autonomyLevel: 0,
    });

    const updatedSettings = await app.inject({
      method: "PUT",
      url: "/v1/settings",
      headers: { cookie: sessionCookie },
      payload: {
        instanceName: "Oskar's Vaenyx",
      },
    });
    expect(updatedSettings.json().instanceName).toBe("Oskar's Vaenyx");

    await app.close();
  });

  it("runs the Forge connection test behind Owner login and fails closed", async () => {
    const app = await buildApp(createTestConfig());

    const unauthorized = await app.inject({
      method: "POST",
      url: "/v1/settings/forge-test",
      payload: {},
    });
    expect(unauthorized.statusCode).toBe(401);

    const sessionCookie = await createOwnerAndSession(app);
    const test = await app.inject({
      method: "POST",
      url: "/v1/settings/forge-test",
      headers: { cookie: sessionCookie },
      payload: {},
    });

    expect(test.statusCode).toBe(200);
    expect(test.json()).toMatchObject({
      status: "failed",
      check: "Forge read-only repository inspection",
      output: null,
      ownerError: {
        code: "VX-MODEL-INSTALL",
        dataSafe: true,
      },
    });
    expect(test.json().message).toContain(
      "Error VX-MODEL-INSTALL · Diagnostic vx-",
    );

    const unauthorizedChat = await app.inject({
      method: "POST",
      url: "/v1/settings/chat-test",
      payload: {
        prompt: "Say hello.",
      },
    });
    expect(unauthorizedChat.statusCode).toBe(401);

    const emptyChat = await app.inject({
      method: "POST",
      url: "/v1/settings/chat-test",
      headers: { cookie: sessionCookie },
      payload: {
        prompt: "   ",
      },
    });
    expect(emptyChat.statusCode).toBe(400);

    const chat = await app.inject({
      method: "POST",
      url: "/v1/settings/chat-test",
      headers: { cookie: sessionCookie },
      payload: {
        prompt: "Use one sentence to confirm this chat route.",
      },
    });

    expect(chat.statusCode).toBe(200);
    expect(chat.json()).toMatchObject({
      status: "failed",
      check: "ChatGPT Subscription Auth quick chat",
      output: null,
      ownerError: {
        code: "VX-MODEL-INSTALL",
        dataSafe: true,
      },
    });
    expect(chat.json().message).toContain(
      "Error VX-MODEL-INSTALL · Diagnostic vx-",
    );

    const liveDataChat = await app.inject({
      method: "POST",
      url: "/v1/settings/chat-test",
      headers: { cookie: sessionCookie },
      payload: {
        prompt: "比特币现在价格多少",
      },
    });

    expect(liveDataChat.statusCode).toBe(200);
    expect(liveDataChat.json()).toMatchObject({
      status: "blocked",
      check: "ChatGPT Subscription Auth quick chat",
      output: null,
      ownerError: {
        code: "VX-SAFETY-BOUNDARY",
        dataSafe: true,
      },
    });
    expect(liveDataChat.json().message).toContain(
      "Error VX-SAFETY-BOUNDARY · Diagnostic vx-",
    );

    const audit = await app.inject({
      method: "GET",
      url: "/v1/guard/audit",
      headers: { cookie: sessionCookie },
    });
    expect(audit.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "provider.forge_test",
          decision: "denied",
        }),
        expect.objectContaining({
          action: "provider.chat_test",
          decision: "denied",
        }),
      ]),
    );

    await app.close();
  });
});
