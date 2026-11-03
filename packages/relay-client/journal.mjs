// Durable dispatch metadata only: no prompt, file, key or account address.
// scope must be an opaque digest supplied by the App's authenticated authority.
import { problem } from "./protocol.mjs";
export function createBrowserJournal({
  scope,
  storage = globalThis.localStorage,
  locks = globalThis.navigator?.locks,
}) {
  if (
    typeof scope !== "string" ||
    !/^[-a-zA-Z0-9_:]{16,160}$/.test(scope) ||
    !storage ||
    !locks?.request
  )
    throw problem("durable_journal_unavailable", { unknown: false });
  const key = "vaenyx-receipts:" + scope;
  const transact = async (fn) =>
    locks.request(key, async () => {
      let rows;
      try {
        rows = JSON.parse(storage.getItem(key) || "{}");
      } catch {
        throw problem("storage_unavailable", { unknown: false });
      }
      if (
        !rows ||
        Array.isArray(rows) ||
        typeof rows !== "object" ||
        Object.keys(rows).length > 256
      )
        throw problem("storage_unavailable", { unknown: false });
      const result = fn(rows);
      if (result.write)
        try {
          storage.setItem(key, JSON.stringify(rows));
        } catch {
          throw problem("storage_unavailable", { unknown: true });
        }
      return result.value;
    });
  return {
    reserve: (id, meta) =>
      transact((rows) => {
        if (typeof id !== "string" || !/^[-a-zA-Z0-9_:]{1,180}$/.test(id))
          throw problem("invalid_request", { unknown: false });
        if (
          Object.hasOwn(rows, id) ||
          Object.values(rows).some((r) =>
            ["pending", "unknown"].includes(r.state),
          )
        )
          return { value: false };
        // Keep unresolved receipts forever; prune only oldest completed/refused metadata.
        const old = Object.entries(rows).filter(
          ([, r]) => !["pending", "unknown"].includes(r.state),
        );
        while (Object.keys(rows).length >= 128 && old.length)
          delete rows[old.shift()[0]];
        rows[id] = {
          state: "pending",
          route: meta.route === "direct" ? "direct" : "vaenyx",
          at: new Date().toISOString(),
        };
        return { write: true, value: true };
      }),
    settle: (id, result) =>
      transact((rows) => {
        if (rows[id]?.state !== "pending")
          throw problem("receipt_changed", { unknown: true });
        const state = ["completed", "refused", "unknown"].includes(result.state)
          ? result.state
          : "unknown";
        rows[id] = {
          ...rows[id],
          state,
          code:
            typeof result.code === "string" ? result.code.slice(0, 120) : null,
          engine:
            typeof result.engine === "string"
              ? result.engine.slice(0, 120)
              : null,
          model:
            typeof result.model === "string"
              ? result.model.slice(0, 200)
              : null,
          routing_revision:
            typeof result.routing_revision === "string"
              ? result.routing_revision.slice(0, 120)
              : null,
        };
        return { write: true };
      }),
    list: () =>
      transact((rows) => ({ value: globalThis.structuredClone(rows) })),
    acknowledgeUnknown: (id, { confirmed = false } = {}) =>
      transact((rows) => {
        if (confirmed !== true || rows[id]?.state !== "unknown")
          throw problem("receipt_review_required", { unknown: false });
        rows[id] = {
          ...rows[id],
          state: "acknowledged",
          reviewed_at: new Date().toISOString(),
        };
        return { write: true };
      }),
  };
}
