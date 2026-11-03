// Two independent routes. The caller owns durable receipts and trusted budget admission.
import { problem, digest } from "./protocol.mjs";
export function createAIClient({
  vaenyx,
  direct,
  journal,
  reserveFallback,
  settleFallback,
  onSwitch = () => {},
}) {
  if (!journal?.reserve || !journal?.settle)
    throw problem("durable_journal_required");
  async function dispatch(route, request, id) {
    if (!(await journal.reserve(id, { route, at: new Date().toISOString() })))
      throw problem("existing_receipt", { unknown: true });
    try {
      if (route === "vaenyx") {
        try {
          await vaenyx.profile();
        } catch (error) {
          throw problem(error?.code || "unreachable", { unknown: false });
        }
      }
      const result = await (route === "vaenyx"
        ? vaenyx.run({
            ...request,
            engine: undefined,
            model: undefined,
            effort: undefined,
            selection: "configured",
          })
        : direct.run(request));
      await journal.settle(id, {
        state: "completed",
        route,
        engine: result.engine,
        model: result.model,
        routing_revision: result.routing_revision ?? null,
      });
      return result;
    } catch (error) {
      await journal.settle(id, {
        state: error?.unknown === false ? "refused" : "unknown",
        route,
        code: error?.code || "outcome_unknown",
      });
      throw error;
    }
  }
  return {
    run: async ({
      route,
      request,
      requestId,
      fallback = { enabled: false },
    }) => {
      if (!["vaenyx", "direct"].includes(route) || !requestId)
        throw problem("invalid_request", { unknown: false });
      const id = await digest(JSON.stringify(["ai-request", requestId]));
      try {
        return await dispatch(route, request, id);
      } catch (error) {
        if (
          route !== "vaenyx" ||
          error?.unknown !== false ||
          fallback.enabled !== true
        )
          throw error;
        const max = fallback.maxCostCents,
          budget = fallback.budgetCents;
        if (
          !direct ||
          fallback.paidAuthorized !== true ||
          !fallback.request?.model ||
          !Number.isFinite(max) ||
          max <= 0 ||
          !Number.isFinite(budget) ||
          budget < max ||
          typeof reserveFallback !== "function" ||
          typeof settleFallback !== "function"
        )
          throw problem("paid_fallback_not_authorized", { unknown: false });
        const reservation = await reserveFallback({
          requestId: id,
          request: fallback.request,
          maxCostCents: max,
          budgetCents: budget,
        });
        if (
          reservation?.authorized !== true ||
          reservation?.bounded !== true ||
          !reservation.id
        )
          throw problem("paid_fallback_budget_unavailable", { unknown: false });
        const fallbackId = id + ":direct";
        const backupRequest = {
          ...request,
          selection: undefined,
          routing_revision: undefined,
          engine: fallback.request.engine,
          model: fallback.request.model,
          effort: fallback.request.effort,
        };
        try {
          onSwitch({
            from: "vaenyx",
            reason: error.code || "refused",
            to: fallback.request.engine,
            model: fallback.request.model,
          });
          const result = await dispatch("direct", backupRequest, fallbackId);
          await settleFallback(reservation.id, { state: "completed", result });
          return {
            ...result,
            fallback_occurred: true,
            fallback_disclosure:
              "Vaenyx was refused before execution; used " +
              result.engine +
              " / " +
              result.model,
          };
        } catch (next) {
          await settleFallback(reservation.id, {
            state: next?.unknown === false ? "refused" : "unknown",
          });
          throw next;
        }
      }
    },
  };
}
