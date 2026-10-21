import {
  OwnerDiagnosticError,
  OwnerModelSelectionError,
} from "../../runtime/owner-safe-errors.js";

// Both Codex transports must reject a failed/interrupted turn, even if it
// emitted a partial answer. Only provider messages, never stderr, are classified.
export function codexTurnFailure(
  params: unknown,
  model = "unknown",
): Error | undefined {
  const turn = (
    params as
      | { turn?: { status?: string; error?: { message?: unknown } } }
      | undefined
  )?.turn;
  if (turn?.status === "interrupted") return new Error("CODEX_TURN_CANCELLED");
  if (turn?.status !== "failed") return undefined;
  const detail =
    typeof turn.error?.message === "string" ? turn.error.message : "";
  if (
    /model .* is not supported|not supported when using Codex|unsupported model/i.test(
      detail,
    )
  ) {
    return new OwnerModelSelectionError(model, detail);
  }
  if (
    /token.*(expired|revoked)|refresh.*token|unauthorized|authentication|sign in|log in|401/i.test(
      detail,
    )
  ) {
    return new OwnerDiagnosticError("CODEX_NOT_LOGGED_IN", detail);
  }
  return new OwnerDiagnosticError("CODEX_TURN_FAILED", detail);
}
