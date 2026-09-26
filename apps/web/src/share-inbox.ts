// H-012 · SHARE TO VAENYX (Android, Oskar 2026-09-19).
//
// Android lists Vaenyx in the system Share sheet (manifest `share_target`).
// The service worker receives that POST, keeps the payload in THIS device's
// IndexedDB — never in Cache Storage — and opens the app on /?share=<id>. The
// app then asks the Owner which Conversation it belongs to (recent, search or
// new) and turns it into an ordinary unsent draft there. Nothing is sent: the
// Owner reviews it and presses Send, and the normal upload path validates it
// then like any other attachment.
//
// The payload waits here until a signed-in Owner has placed it or discarded
// it, so a share made while signed out continues after sign-in. It lands only
// in the Mode the device is in, because the picker lists that Mode's
// Conversations and the draft is saved under that Mode.
//
// 🔴 sw.js writes this same database with the same names; keep them in step.
export const SHARE_DATABASE_NAME = "vaenyx-share-inbox";
export const SHARE_STORE_NAME = "shares";
// A share nobody placed is dropped after this long.
export const SHARE_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;

export interface SharedFile {
  name: string;
  type: string;
  size: number;
  blob: Blob;
}

export interface PendingShare {
  id: string;
  createdAt: string;
  title: string;
  text: string;
  url: string;
  files: SharedFile[];
}

// What the composer already takes, and nothing more: up to five photos and
// one document per message (the document picker's own list).
export const SHARE_MAX_PHOTOS = 5;
const DOCUMENT_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
const DOCUMENT_EXTENSIONS = /\.(pdf|txt|md|markdown|docx|xlsx|pptx)$/i;

export interface SharePlan {
  text: string;
  photos: SharedFile[];
  document: SharedFile | null;
  refused: { name: string; reason: "type" | "photo-limit" | "one-document" }[];
}

function isPhoto(file: SharedFile): boolean {
  return file.type.startsWith("image/");
}

function isDocument(file: SharedFile): boolean {
  return DOCUMENT_TYPES.has(file.type) || DOCUMENT_EXTENSIONS.test(file.name);
}

/**
 * Sort a shared payload into what one message can carry: the words (title,
 * text and link, without repeating one another), up to five photos and one
 * document. Everything else is named with the reason, so the Owner hears
 * what was left out instead of finding it silently gone.
 */
export function planShare(share: PendingShare): SharePlan {
  let parts: string[] = [];
  for (const part of [share.title, share.text, share.url]) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    // Already said by an earlier part: skip it. Says an earlier part and
    // more (the text repeating the title): it replaces that part.
    if (parts.some((existing) => existing.includes(trimmed))) continue;
    parts = parts.filter((existing) => !trimmed.includes(existing));
    parts.push(trimmed);
  }
  const photos: SharedFile[] = [];
  let document: SharedFile | null = null;
  const refused: SharePlan["refused"] = [];
  for (const file of share.files) {
    if (isPhoto(file)) {
      if (photos.length < SHARE_MAX_PHOTOS) photos.push(file);
      else refused.push({ name: file.name, reason: "photo-limit" });
    } else if (isDocument(file)) {
      if (!document) document = file;
      else refused.push({ name: file.name, reason: "one-document" });
    } else {
      refused.push({ name: file.name, reason: "type" });
    }
  }
  return { text: parts.join("\n"), photos, document, refused };
}

export function isExpiredShare(share: PendingShare, now = Date.now()): boolean {
  const created = Date.parse(share.createdAt);
  return Number.isNaN(created) || now - created > SHARE_RETENTION_MS;
}

function openShareDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SHARE_DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SHARE_STORE_NAME)) {
        database.createObjectStore(SHARE_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  use: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openShareDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(SHARE_STORE_NAME, mode);
      const request = use(transaction.objectStore(SHARE_STORE_NAME));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

/** Every share still waiting to be placed, oldest first; old ones removed. */
export async function listPendingShares(now = Date.now()): Promise<PendingShare[]> {
  if (typeof indexedDB === "undefined") return [];
  const all = (await withStore("readonly", (store) => store.getAll())) as
    | PendingShare[]
    | undefined;
  const shares = all ?? [];
  for (const share of shares.filter((item) => isExpiredShare(item, now))) {
    await deletePendingShare(share.id);
  }
  return shares
    .filter((item) => !isExpiredShare(item, now))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function deletePendingShare(id: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  await withStore("readwrite", (store) => store.delete(id));
}
