import test from "node:test";
import assert from "node:assert/strict";
import { createBrowserJournal } from "../journal.mjs";
import { createAIClient } from "../routes.mjs";
function fixture() {
  const rows = new Map();
  let pending = Promise.resolve();
  return {
    scope: "opaque-synthetic-authority",
    storage: {
      getItem: (k) => rows.get(k) || null,
      setItem: (k, v) => rows.set(k, v),
    },
    locks: {
      request: (_, fn) => {
        const next = pending.then(fn);
        pending = next.catch(() => {});
        return next;
      },
    },
  };
}
test("unknown dispatch survives a fresh journal and model/key changes; no prompt or key is stored", async () => {
  const f = fixture(),
    journal = createBrowserJournal(f);
  let calls = 0;
  const client = () =>
    createAIClient({
      journal: createBrowserJournal(f),
      vaenyx: {
        profile: async () => ({}),
        run: async () => {
          calls++;
          throw Object.assign(Error("synthetic-timeout"), { unknown: true });
        },
      },
    });
  await assert.rejects(
    client().run({
      route: "vaenyx",
      request: { prompt: "PRIVATE-SYNTHETIC-PROMPT" },
      requestId: "first",
    }),
  );
  await assert.rejects(
    client().run({
      route: "vaenyx",
      request: { model: "changed-model" },
      requestId: "different-id",
    }),
    (e) => e.code === "existing_receipt",
  );
  assert.equal(calls, 1);
  assert.equal(
    JSON.stringify(await journal.list()).includes("PRIVATE-SYNTHETIC"),
    false,
  );
  const [id] = Object.keys(await journal.list());
  await assert.rejects(
    journal.acknowledgeUnknown(id),
    (e) => e.code === "receipt_review_required",
  );
  await journal.acknowledgeUnknown(id, { confirmed: true });
  assert.equal(await journal.reserve("second", { route: "vaenyx" }), true);
});
test("two concurrent browser consumers cannot reserve the same App authority", async () => {
  const f = fixture(),
    a = createBrowserJournal(f),
    b = createBrowserJournal(f);
  const r = await Promise.all([
    a.reserve("one", { route: "vaenyx" }),
    b.reserve("two", { route: "direct" }),
  ]);
  assert.equal(r.filter(Boolean).length, 1);
  await a.settle("one", { state: "completed", model: "synthetic" });
  assert.equal(await b.reserve("two", { route: "direct" }), true);
  const other = createBrowserJournal({
    ...f,
    scope: "separate-synthetic-authority",
  });
  assert.equal(await other.reserve("one", { route: "direct" }), true);
});
test("broken storage or missing atomic browser locks prevents dispatch", async () => {
  assert.throws(
    () =>
      createBrowserJournal({
        scope: "opaque-synthetic-authority",
        storage: {},
        locks: {},
      }),
    (e) => e.unknown === false,
  );
  const f = fixture();
  f.storage.getItem = () => "not json";
  await assert.rejects(
    createBrowserJournal(f).reserve("one", {}),
    (e) => e.code === "storage_unavailable",
  );
});
