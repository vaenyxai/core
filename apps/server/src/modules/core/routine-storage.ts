// Vaenyx Library v2 — Routine local storage: Journal + Gallery.
//
// Each Routine keeps two private, on-device-only stores (docs/library-architecture
// §14): the Journal (raw entries the family feeds in) and the Gallery (generated
// results to revisit). Both live in the local SQLite DB and are NEVER uploaded.
//
// Step ① is the data model only: these are the CRUD primitives. They take an
// optional chatId so step ② can bind a Routine run to its Chat (accumulate = one
// persistent Chat); until then chatId is null. Gallery stores STRUCTURED output
// (the result JSON), never rendered text, so the view layer can render and
// re-render it later.

import { randomUUID } from "node:crypto";

import type {
  RoutineGalleryItem,
  RoutineJournalEntry,
} from "@vaenyx/contracts";

import type { DatabaseHandle } from "../../db/database.js";

// SQLite's CURRENT_TIMESTAMP is "YYYY-MM-DD HH:MM:SS" in UTC — no T, no Z.
// Chat messages carry real ISO strings, and the chat timeline string-sorts
// the two together: the space sorts before "T", so every run's rows landed
// ABOVE every same-day message, at the wrong displayed hour (Oskar,
// 2026-08-16 screenshot: a 20:44 run shown as "10:44 am" above the 7 pm
// notes). Rows normalise to ISO UTC on the way OUT; the DB stays as it is.
function isoTimestamp(raw: string): string {
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)
    ? `${raw.replace(" ", "T")}Z`
    : raw;
}

interface JournalRow {
  id: string;
  routine_id: string;
  chat_id: string | null;
  content: string;
  created_at: string;
  image_id: string | null;
  // From the LEFT JOIN on image_annotations (absent on the by-id lookup).
  annotation_items?: string | null;
  // The marks as CONFIRMED for this row, frozen at write time.
  annotations_snapshot: string | null;
}

interface GalleryRow {
  id: string;
  routine_id: string;
  chat_id: string | null;
  step_id: string | null;
  output: string;
  output_valid: 0 | 1;
  created_at: string;
  // Edit Routine v1: the view this result was made under (NULL = made before
  // any view change; renders with the current view) and the executionHash of
  // the routine revision that produced it.
  view_snapshot: string | null;
  routine_hash: string | null;
  // Visual-first (owner rule, 2026-08-16): the photo the run was fed, so the
  // result card can lead with it. Marks ride via the LEFT JOIN below.
  image_id: string | null;
  annotation_items?: string | null;
  // The marks as CONFIRMED for this row, frozen at write time.
  annotations_snapshot: string | null;
  // The GENERATED picture of this result, when the Routine asked for one.
  result_image_id: string | null;
}

function toJournalEntry(row: JournalRow): RoutineJournalEntry {
  let imageAnnotations: RoutineJournalEntry["imageAnnotations"] = null;
  // The row's OWN snapshot wins over the live join: marks belong to the run
  // they were confirmed for, so editing a photo's marks later cannot rewrite
  // what a past run showed (owner, 2026-08-16). No snapshot = a row from
  // before this, which keeps reading the live marks as it always did.
  const rawAnnotations = row.annotations_snapshot ?? row.annotation_items;
  if (rawAnnotations) {
    try {
      const parsed = JSON.parse(rawAnnotations) as unknown;
      if (Array.isArray(parsed)) {
        imageAnnotations = parsed as NonNullable<
          RoutineJournalEntry["imageAnnotations"]
        >;
      }
    } catch {
      // A corrupt row just means no overlay.
    }
  }
  return {
    id: row.id,
    routineId: row.routine_id,
    chatId: row.chat_id,
    content: JSON.parse(row.content),
    createdAt: isoTimestamp(row.created_at),
    imageId: row.image_id ?? null,
    imageAnnotations,
  };
}

function toGalleryItem(row: GalleryRow): RoutineGalleryItem {
  let viewSnapshot: unknown = undefined;
  if (row.view_snapshot !== null && row.view_snapshot !== undefined) {
    try {
      viewSnapshot = JSON.parse(row.view_snapshot) as unknown;
    } catch {
      viewSnapshot = undefined;
    }
  }
  let imageAnnotations: RoutineGalleryItem["imageAnnotations"] = null;
  // The row's OWN snapshot wins over the live join: marks belong to the run
  // they were confirmed for, so editing a photo's marks later cannot rewrite
  // what a past run showed (owner, 2026-08-16). No snapshot = a row from
  // before this, which keeps reading the live marks as it always did.
  const rawAnnotations = row.annotations_snapshot ?? row.annotation_items;
  if (rawAnnotations) {
    try {
      const parsed = JSON.parse(rawAnnotations) as unknown;
      if (Array.isArray(parsed)) {
        imageAnnotations = parsed as NonNullable<
          RoutineGalleryItem["imageAnnotations"]
        >;
      }
    } catch {
      // A corrupt row just means no overlay.
    }
  }
  return {
    id: row.id,
    routineId: row.routine_id,
    chatId: row.chat_id,
    stepId: row.step_id,
    output: JSON.parse(row.output),
    outputValid: row.output_valid === 1,
    createdAt: isoTimestamp(row.created_at),
    ...(viewSnapshot !== undefined ? { viewSnapshot } : {}),
    routineHash: row.routine_hash ?? null,
    imageId: row.image_id ?? null,
    imageAnnotations,
    resultImageId: row.result_image_id ?? null,
  };
}

// The marks a photo carries right now. Read at run time so they can be
// frozen onto that run's rows — after which editing the photo's marks moves
// only future runs, never the record of past ones.
export function readStoredAnnotations(
  database: DatabaseHandle,
  imageId: string,
): unknown {
  const row = database.sqlite
    .prepare(`SELECT items FROM image_annotations WHERE image_id = ?`)
    .get(imageId) as { items: string } | undefined;
  if (!row?.items) return null;
  try {
    const parsed = JSON.parse(row.items) as unknown;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function addJournalEntry(
  database: DatabaseHandle,
  input: {
    routineId: string;
    chatId?: string | null;
    content: unknown;
    imageId?: string | null;
    // The marks as confirmed for THIS run, frozen onto the row.
    imageAnnotations?: unknown;
  },
): RoutineJournalEntry {
  const id = randomUUID();
  database.sqlite
    .prepare(
      `INSERT INTO routine_journal (id, routine_id, chat_id, content, image_id, annotations_snapshot)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.routineId,
      input.chatId ?? null,
      JSON.stringify(input.content ?? null),
      input.imageId ?? null,
      input.imageAnnotations ? JSON.stringify(input.imageAnnotations) : null,
    );

  const row = database.sqlite
    .prepare("SELECT * FROM routine_journal WHERE id = ?")
    .get(id) as unknown as JournalRow;
  return toJournalEntry(row);
}

export function listJournalEntries(
  database: DatabaseHandle,
  routineId: string,
  chatId?: string | null,
): RoutineJournalEntry[] {
  // Photos bring their stored marks along, so a journal photo keeps its
  // overlay when the chat reopens (same join as chat messages).
  const select = `SELECT j.*, a.items AS annotation_items
                  FROM routine_journal j
                  LEFT JOIN image_annotations a ON a.image_id = j.image_id`;
  const rows = (chatId === undefined
    ? database.sqlite
        .prepare(
          `${select} WHERE j.routine_id = ?
             ORDER BY j.created_at DESC, j.id DESC`,
        )
        .all(routineId)
    : database.sqlite
        .prepare(
          `${select} WHERE j.routine_id = ? AND j.chat_id IS ?
             ORDER BY j.created_at DESC, j.id DESC`,
        )
        .all(routineId, chatId)) as unknown as JournalRow[];
  return rows.map(toJournalEntry);
}

// Confirm-card corrections -> parse flywheel (③): the Owner's confirmed-correct
// input for a message, saved so recent ones can be fed back as few-shot into
// future parses. Local + private — never uploaded, rides the local backup.
export interface RoutineParseExample {
  message: string;
  input: unknown;
}

export function addParseExample(
  database: DatabaseHandle,
  input: {
    routineId: string;
    message: string;
    input: unknown;
    // The step-1 input-schema revision this correction was made under (Edit
    // Routine v1); null keeps pre-edit behaviour.
    inputSchemaRev?: string | null;
  },
): void {
  database.sqlite
    .prepare(
      `INSERT INTO routine_parse_examples (id, routine_id, message, input, input_schema_rev)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      randomUUID(),
      input.routineId,
      input.message,
      JSON.stringify(input.input ?? null),
      input.inputSchemaRev ?? null,
    );
}

export function listParseExamples(
  database: DatabaseHandle,
  routineId: string,
  limit: number,
  // With a revision, only examples made under the SAME step-1 input schema
  // are served (plus unstamped NULL rows, which only still exist while the
  // schema has never changed — the first schema-changing save stamps them).
  inputSchemaRev?: string | null,
): RoutineParseExample[] {
  const rows = (inputSchemaRev === undefined
    ? database.sqlite
        .prepare(
          `SELECT message, input FROM routine_parse_examples WHERE routine_id = ?
             ORDER BY created_at DESC, id DESC LIMIT ?`,
        )
        .all(routineId, limit)
    : database.sqlite
        .prepare(
          `SELECT message, input FROM routine_parse_examples
             WHERE routine_id = ? AND (input_schema_rev IS ? OR input_schema_rev IS NULL)
             ORDER BY created_at DESC, id DESC LIMIT ?`,
        )
        .all(routineId, inputSchemaRev, limit)) as unknown as {
    message: string;
    input: string;
  }[];
  return rows.map((row) => ({
    message: row.message,
    input: JSON.parse(row.input) as unknown,
  }));
}

// ── Edit Routine v1: history stamping ──────────────────────────────────────

// A view change is about to land: every gallery row that never recorded its
// view was made under the OLD one — stamp it so old results keep their look
// and never borrow the new layout.
export function stampGalleryViewSnapshots(
  database: DatabaseHandle,
  routineId: string,
  oldView: unknown,
): void {
  database.sqlite
    .prepare(
      `UPDATE routine_gallery SET view_snapshot = ?
       WHERE routine_id = ? AND view_snapshot IS NULL`,
    )
    .run(JSON.stringify(oldView ?? null), routineId);
}

// A step-1 input-schema change is about to land: unstamped parse examples
// were corrections for the OLD field shape — stamp them with the old
// revision so the new schema's parses never read them as few-shot.
export function stampParseExampleRevisions(
  database: DatabaseHandle,
  routineId: string,
  oldRev: string,
): void {
  database.sqlite
    .prepare(
      `UPDATE routine_parse_examples SET input_schema_rev = ?
       WHERE routine_id = ? AND input_schema_rev IS NULL`,
    )
    .run(oldRev, routineId);
}

export function addGalleryItem(
  database: DatabaseHandle,
  input: {
    routineId: string;
    chatId?: string | null;
    stepId?: string | null;
    output: unknown;
    outputValid?: boolean;
    // Edit Routine v1: pin the view and routine revision this result was
    // made under, so a later edit cannot re-dress old results.
    viewSnapshot?: unknown;
    routineHash?: string | null;
    // Visual-first: the photo the run was fed, so the card can lead with it.
    imageId?: string | null;
    // The marks as confirmed for THIS run, frozen onto the row.
    imageAnnotations?: unknown;
  },
): RoutineGalleryItem {
  const id = randomUUID();
  database.sqlite
    .prepare(
      `INSERT INTO routine_gallery (id, routine_id, chat_id, step_id, output, output_valid, view_snapshot, routine_hash, image_id, annotations_snapshot)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.routineId,
      input.chatId ?? null,
      input.stepId ?? null,
      JSON.stringify(input.output ?? null),
      input.outputValid === false ? 0 : 1,
      "viewSnapshot" in input
        ? JSON.stringify(input.viewSnapshot ?? null)
        : null,
      input.routineHash ?? null,
      input.imageId ?? null,
      input.imageAnnotations ? JSON.stringify(input.imageAnnotations) : null,
    );

  const row = database.sqlite
    .prepare(
      `SELECT g.*, a.items AS annotation_items
       FROM routine_gallery g
       LEFT JOIN image_annotations a ON a.image_id = g.image_id
       WHERE g.id = ?`,
    )
    .get(id) as unknown as GalleryRow;
  return toGalleryItem(row);
}

// The generated picture arrives AFTER the result row (the result must never
// wait on an image provider), so it attaches to the row it belongs to.
export function setGalleryResultImage(
  database: DatabaseHandle,
  galleryItemId: string,
  resultImageId: string,
): void {
  database.sqlite
    .prepare(`UPDATE routine_gallery SET result_image_id = ? WHERE id = ?`)
    .run(resultImageId, galleryItemId);
}

export function listGalleryItems(
  database: DatabaseHandle,
  routineId: string,
  chatId?: string | null,
): RoutineGalleryItem[] {
  // The fed photo's stored marks ride along (same join as journal rows), so
  // a result card can lead with the marked photo — visual first.
  const select = `SELECT g.*, a.items AS annotation_items
                  FROM routine_gallery g
                  LEFT JOIN image_annotations a ON a.image_id = g.image_id`;
  const rows = (chatId === undefined
    ? database.sqlite
        .prepare(
          `${select} WHERE g.routine_id = ?
             ORDER BY g.created_at DESC, g.id DESC`,
        )
        .all(routineId)
    : database.sqlite
        .prepare(
          `${select} WHERE g.routine_id = ? AND g.chat_id IS ?
             ORDER BY g.created_at DESC, g.id DESC`,
        )
        .all(routineId, chatId)) as unknown as GalleryRow[];
  return rows.map(toGalleryItem);
}
