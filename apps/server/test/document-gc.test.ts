// Document cleanup: deleting a conversation removes its files from disk
// (unless another conversation still references them), and the boot sweep
// catches whatever any other delete path orphans — age-gated, so an upload
// waiting to be attached is never swept out from under the Owner.
import { existsSync, mkdtempSync, rmSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createDatabase, type DatabaseHandle } from "../src/db/database.js";
import { deleteAskVaenyxConversation } from "../src/modules/core/ask-vaenyx.js";
import {
  removeUnreferencedDocuments,
  sweepOrphanDocuments,
  SWEEP_MINIMUM_AGE_MS,
} from "../src/modules/core/document-gc.js";
import {
  readDocumentText,
  saveDocument,
  saveDocumentText,
} from "../src/modules/core/documents.js";

const directories: string[] = [];
const databases: DatabaseHandle[] = [];

function testDatabase(): { database: DatabaseHandle; dataDirectory: string } {
  const dataDirectory = mkdtempSync(resolve(tmpdir(), "vaenyx-docgc-"));
  directories.push(dataDirectory);
  const database = createDatabase({
    dataDirectory,
    databasePath: join(dataDirectory, "vaenyx.db"),
    backupsDirectory: join(dataDirectory, "backups"),
    migrationsDirectory: resolve("migrations"),
  } as Parameters<typeof createDatabase>[0]);
  databases.push(database);
  database.sqlite
    .prepare(
      `INSERT INTO owners (id, name, password_hash, created_at)
       VALUES ('owner-1', 'Owner', 'x', CURRENT_TIMESTAMP)`,
    )
    .run();
  return { database, dataDirectory };
}

function addConversation(database: DatabaseHandle, id: string): void {
  database.sqlite
    .prepare(
      `INSERT INTO ask_vaenyx_conversations (id, owner_id, title)
       VALUES (?, 'owner-1', 'Chat')`,
    )
    .run(id);
}

function addDocumentMessage(
  database: DatabaseHandle,
  conversationId: string,
  messageId: string,
  documentId: string,
): void {
  database.sqlite
    .prepare(
      `INSERT INTO ask_vaenyx_messages
         (id, conversation_id, role, content, document_id, document_name)
       VALUES (?, ?, 'owner', 'here is a file', ?, 'file.pdf')`,
    )
    .run(messageId, conversationId, documentId);
}

function documentPath(dataDirectory: string, documentId: string): string {
  return resolve(dataDirectory, "documents", documentId);
}

afterEach(() => {
  for (const database of databases.splice(0)) {
    try {
      database.close();
    } catch {
      // Already closed.
    }
  }
  for (const directory of directories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("deleting a conversation deletes its documents", () => {
  it("removes the file and its text sidecar once nothing references them", () => {
    const { database, dataDirectory } = testDatabase();
    const documentId = saveDocument(dataDirectory, Buffer.from("pdf bytes"));
    saveDocumentText(dataDirectory, documentId, "[page 1]\nspilled text");
    addConversation(database, "conv-1");
    addDocumentMessage(database, "conv-1", "msg-1", documentId);

    deleteAskVaenyxConversation(database, "conv-1", "owner-1", dataDirectory);

    expect(existsSync(documentPath(dataDirectory, documentId))).toBe(false);
    expect(readDocumentText(dataDirectory, documentId)).toBeNull();
  });

  it("keeps a document another conversation still references", () => {
    const { database, dataDirectory } = testDatabase();
    const documentId = saveDocument(dataDirectory, Buffer.from("pdf bytes"));
    addConversation(database, "conv-1");
    addConversation(database, "conv-2");
    addDocumentMessage(database, "conv-1", "msg-1", documentId);
    addDocumentMessage(database, "conv-2", "msg-2", documentId);

    deleteAskVaenyxConversation(database, "conv-1", "owner-1", dataDirectory);

    expect(existsSync(documentPath(dataDirectory, documentId))).toBe(true);
  });

  it("without a data directory, deletion still works and the sweep inherits the files", () => {
    const { database, dataDirectory } = testDatabase();
    const documentId = saveDocument(dataDirectory, Buffer.from("pdf bytes"));
    addConversation(database, "conv-1");
    addDocumentMessage(database, "conv-1", "msg-1", documentId);

    deleteAskVaenyxConversation(database, "conv-1", "owner-1");

    expect(existsSync(documentPath(dataDirectory, documentId))).toBe(true);
    // The safety net: old enough + unreferenced = gone at the next boot.
    const later = Date.now() + SWEEP_MINIMUM_AGE_MS + 60_000;
    expect(sweepOrphanDocuments(database, dataDirectory, later)).toBe(1);
    expect(existsSync(documentPath(dataDirectory, documentId))).toBe(false);
  });
});

describe("removeUnreferencedDocuments", () => {
  it("never deletes outside the id pattern", () => {
    const { database, dataDirectory } = testDatabase();
    expect(
      removeUnreferencedDocuments(database, dataDirectory, [
        "../../vaenyx.db",
        "not-a-document.pdf",
      ]),
    ).toBe(0);
    expect(existsSync(join(dataDirectory, "vaenyx.db"))).toBe(true);
  });
});

describe("sweepOrphanDocuments", () => {
  it("removes old orphans, keeps young ones and referenced ones", () => {
    const { database, dataDirectory } = testDatabase();
    const orphanOld = saveDocument(dataDirectory, Buffer.from("old orphan"));
    saveDocumentText(dataDirectory, orphanOld, "spilled");
    const orphanYoung = saveDocument(dataDirectory, Buffer.from("young"));
    const referenced = saveDocument(dataDirectory, Buffer.from("referenced"));
    addConversation(database, "conv-1");
    addDocumentMessage(database, "conv-1", "msg-1", referenced);

    // Age the old orphan and the referenced one past the gate; the young
    // orphan keeps its just-written mtime.
    const past = new Date(Date.now() - SWEEP_MINIMUM_AGE_MS - 60_000);
    utimesSync(documentPath(dataDirectory, orphanOld), past, past);
    utimesSync(documentPath(dataDirectory, referenced), past, past);

    expect(sweepOrphanDocuments(database, dataDirectory)).toBe(1);
    expect(existsSync(documentPath(dataDirectory, orphanOld))).toBe(false);
    expect(readDocumentText(dataDirectory, orphanOld)).toBeNull();
    expect(existsSync(documentPath(dataDirectory, orphanYoung))).toBe(true);
    expect(existsSync(documentPath(dataDirectory, referenced))).toBe(true);
  });

  it("is quiet when the documents directory does not exist", () => {
    const { database, dataDirectory } = testDatabase();
    expect(sweepOrphanDocuments(database, dataDirectory)).toBe(0);
  });
});
