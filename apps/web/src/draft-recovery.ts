export const DRAFT_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;

export type DraftScopeKind = "new" | "conversation" | "task";
export type DraftDeliveryState = "editing" | "uncertain";

export interface DraftScope {
  ownerId: string;
  modeId: string;
  kind: DraftScopeKind;
  scopeId: string | null;
}

export interface DraftAttachment {
  id: string;
  kind: "photo" | "document";
  name: string;
  type: string;
  size: number;
  blob: Blob;
  serverId: string | null;
  pages?: number | null;
  acknowledged?: boolean;
}

export interface ComposerDraft extends DraftScope {
  key: string;
  clientMessageId: string;
  text: string;
  attachments: DraftAttachment[];
  projectId: string | null;
  deliveryState: DraftDeliveryState;
  updatedAt: string;
  attachmentOmittedNames: string[];
}

export interface DraftSaveResult {
  attachmentOmittedNames: string[];
}

const DATABASE_NAME = "vaenyx-device-drafts";
const STORE_NAME = "drafts";

export function draftKey(scope: DraftScope): string {
  return [scope.ownerId, scope.modeId, scope.kind, scope.scopeId ?? "__new__"]
    .map(encodeURIComponent)
    .join("|");
}

export function createComposerDraft(
  scope: DraftScope,
  values?: Partial<
    Pick<
      ComposerDraft,
      | "clientMessageId"
      | "text"
      | "attachments"
      | "projectId"
      | "deliveryState"
      | "updatedAt"
      | "attachmentOmittedNames"
    >
  >,
): ComposerDraft {
  return {
    ...scope,
    key: draftKey(scope),
    clientMessageId: values?.clientMessageId ?? crypto.randomUUID(),
    text: values?.text ?? "",
    attachments: values?.attachments ?? [],
    projectId: values?.projectId ?? null,
    deliveryState: values?.deliveryState ?? "editing",
    updatedAt: values?.updatedAt ?? new Date().toISOString(),
    attachmentOmittedNames: values?.attachmentOmittedNames ?? [],
  };
}

export function isExpiredDraft(
  draft: Pick<ComposerDraft, "updatedAt">,
  now = Date.now(),
): boolean {
  const updated = Date.parse(draft.updatedAt);
  return !Number.isFinite(updated) || now - updated > DRAFT_RETENTION_MS;
}

export function isEmptyDraft(
  draft: Pick<ComposerDraft, "text" | "attachments">,
): boolean {
  return !draft.text.trim() && draft.attachments.length === 0;
}

export function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

export async function persistWithAttachmentFallback(
  draft: ComposerDraft,
  write: (record: ComposerDraft) => Promise<void>,
): Promise<{ record: ComposerDraft; result: DraftSaveResult }> {
  try {
    await write(draft);
    return {
      record: draft,
      result: { attachmentOmittedNames: draft.attachmentOmittedNames },
    };
  } catch (error) {
    if (!isQuotaError(error) || draft.attachments.length === 0) throw error;
    const attachmentOmittedNames = [
      ...new Set([
        ...draft.attachmentOmittedNames,
        ...draft.attachments.map((attachment) => attachment.name),
      ]),
    ];
    const textOnly = {
      ...draft,
      attachments: [],
      attachmentOmittedNames,
    };
    await write(textOnly);
    return {
      record: textOnly,
      result: { attachmentOmittedNames },
    };
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Draft storage could not open."));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  use: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = use(transaction.objectStore(STORE_NAME));
      let result: T;
      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () =>
        reject(request.error ?? new Error("Draft storage request failed."));
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () =>
        reject(
          transaction.error ?? new Error("Draft storage transaction failed."),
        );
    });
  } finally {
    database.close();
  }
}

async function putDraft(draft: ComposerDraft): Promise<void> {
  await withStore("readwrite", (store) => store.put(draft));
}

export async function saveDraft(
  draft: ComposerDraft,
): Promise<DraftSaveResult> {
  const current = { ...draft, updatedAt: new Date().toISOString() };
  if (isEmptyDraft(current)) {
    await deleteDraft(current.key);
    return { attachmentOmittedNames: [] };
  }
  return (await persistWithAttachmentFallback(current, putDraft)).result;
}

export async function loadDraft(
  scope: DraftScope,
): Promise<ComposerDraft | null> {
  const key = draftKey(scope);
  const draft = await withStore<ComposerDraft | undefined>(
    "readonly",
    (store) => store.get(key),
  );
  if (!draft) return null;
  if (isExpiredDraft(draft)) {
    await deleteDraft(key);
    return null;
  }
  return draft;
}

export async function deleteDraft(
  keyOrScope: string | DraftScope,
): Promise<void> {
  const key =
    typeof keyOrScope === "string" ? keyOrScope : draftKey(keyOrScope);
  await withStore("readwrite", (store) => store.delete(key));
}

export async function moveDraft(
  draft: ComposerDraft,
  nextScope: DraftScope,
): Promise<ComposerDraft> {
  const moved = { ...draft, ...nextScope, key: draftKey(nextScope) };
  await saveDraft(moved);
  if (draft.key !== moved.key) await deleteDraft(draft.key);
  return moved;
}

async function deleteMatching(
  matches: (draft: ComposerDraft) => boolean,
): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const request = transaction.objectStore(STORE_NAME).openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        if (matches(cursor.value as ComposerDraft)) cursor.delete();
        cursor.continue();
      };
      request.onerror = () =>
        reject(request.error ?? new Error("Draft cleanup failed."));
      transaction.oncomplete = () => resolve();
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("Draft cleanup failed."));
    });
  } finally {
    database.close();
  }
}

export function clearOwnerDrafts(ownerId: string): Promise<void> {
  return deleteMatching((draft) => draft.ownerId === ownerId);
}

export function clearModeDrafts(modeId: string): Promise<void> {
  return deleteMatching((draft) => draft.modeId === modeId);
}

export function clearConversationDrafts(conversationId: string): Promise<void> {
  return deleteMatching(
    (draft) =>
      draft.kind === "conversation" && draft.scopeId === conversationId,
  );
}

export function clearExpiredDrafts(now = Date.now()): Promise<void> {
  return deleteMatching((draft) => isExpiredDraft(draft, now));
}
