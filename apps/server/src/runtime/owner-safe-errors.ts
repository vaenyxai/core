import { randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  formatOwnerSafeError,
  ownerSafeErrorCopy,
  type OwnerSafeError,
  type OwnerSafeErrorCode,
} from "@vaenyx/contracts";

export type OwnerErrorContext =
  | "component-install"
  | "forge-test"
  | "model-login"
  | "model-response"
  | "model-startup"
  | "phone-setup"
  | "request"
  | "scheduled-run"
  | "update-launch";

const MAX_CAPTURED_PROCESS_OUTPUT = 16_384;
const MAX_LOG_DETAIL = 8_192;
const PUBLIC_LOG_LOCATION = "userdata/logs/owner-errors.log";
const ANSI_ESCAPE_SEQUENCE = new RegExp(
  `${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`,
  "g",
);
let diagnosticLogPath: string | null = null;

/** An internal refusal with a stable machine code and private diagnostic text.
 * `message` is deliberately code-only: an uncaught instance still cannot leak
 * stderr, a path, a stack, or provider internals into a public response. */
export class OwnerDiagnosticError extends Error {
  readonly diagnostic: string;

  constructor(internalCode: string, diagnostic: unknown = "") {
    super(internalCode);
    this.name = "OwnerDiagnosticError";
    this.diagnostic = String(diagnostic ?? "").slice(
      -MAX_CAPTURED_PROCESS_OUTPUT,
    );
  }
}

export function configureOwnerErrorLog(dataDirectory: string): void {
  diagnosticLogPath = resolve(
    dataDirectory,
    "..",
    "logs",
    "owner-errors.log",
  );
}

export function appendBoundedDiagnostic(
  current: string,
  chunk: unknown,
): string {
  return `${current}${String(chunk ?? "")}`.slice(
    -MAX_CAPTURED_PROCESS_OUTPUT,
  );
}

/** Remove terminal control codes, likely credentials, and local absolute paths
 * before a diagnostic is retained. This is for local logs, never UI copy. */
export function redactDiagnosticText(value: unknown): string {
  return String(value ?? "")
    .replace(ANSI_ESCAPE_SEQUENCE, "")
    .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer <redacted>")
    .replace(
      /\b(authorization|api[-_ ]?key|password|secret|token)\b\s*[:=]\s*[^\s,;]+/gi,
      "$1=<redacted>",
    )
    .replace(/\b(?:sk|rk|pk)-[A-Za-z0-9_-]{8,}\b/gi, "<redacted>")
    .replace(/[A-Za-z]:\\(?:[^\r\n<>:"|?*]+\\)*[^\r\n<>:"|?*]*/g, "<path>")
    .replace(/\/(?:Users|home|var|tmp)\/(?:[^\s'"<>]+\/?)+/g, "<path>")
    .slice(-MAX_LOG_DETAIL);
}

function internalCode(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message.split(/[:\r\n]/, 1)[0] ?? "UNKNOWN";
  }
  return "UNKNOWN";
}

function publicCodeFor(
  error: unknown,
  context: OwnerErrorContext,
): OwnerSafeErrorCode {
  if (context === "component-install") return "VX-COMPONENT-INSTALL";
  if (context === "phone-setup") return "VX-PHONE-CONNECT";
  if (context === "update-launch") return "VX-UPDATE";

  const code = internalCode(error).toUpperCase();
  if (code.includes("BOUNDARY")) return "VX-SAFETY-BOUNDARY";
  if (code.includes("DID_NOT_INSPECT") || code.includes("VERIFY")) {
    return "VX-FORGE-VERIFY";
  }
  if (code.includes("NOT_INSTALLED") || code.includes("COMPONENT_MISSING")) {
    return "VX-MODEL-INSTALL";
  }
  if (
    code.includes("NOT_LOGGED") ||
    code.includes("NOT_SIGNED") ||
    code.includes("NOT_CONNECTED") ||
    code.includes("LOCAL_ONLY_UNAVAILABLE")
  ) {
    return "VX-MODEL-CONNECT";
  }
  if (code.includes("CHATGPT_REQUIRED") || code.includes("AUTH_METHOD")) {
    return "VX-MODEL-AUTH";
  }
  if (code.includes("TIMED_OUT") || code.includes("TIMEOUT")) {
    return "VX-MODEL-TIMEOUT";
  }
  if (code.includes("CANCEL") || code.includes("STOPPED")) {
    return "VX-MODEL-CANCELLED";
  }
  if (
    code.includes("START") ||
    code.includes("EXITED") ||
    code.includes("SESSION_CLOSED")
  ) {
    return "VX-MODEL-START";
  }
  if (context === "forge-test" && code.includes("EMPTY")) {
    return "VX-FORGE-VERIFY";
  }
  if (
    context === "forge-test" ||
    context === "model-login" ||
    context === "model-response" ||
    context === "model-startup" ||
    context === "scheduled-run"
  ) {
    return context === "model-startup" || context === "model-login"
      ? "VX-MODEL-START"
      : "VX-MODEL-RESPONSE";
  }
  return "VX-REQUEST";
}

function privateDetail(error: unknown): string {
  if (error instanceof OwnerDiagnosticError) {
    return error.diagnostic;
  }
  if (error instanceof Error) {
    return [error.name, error.message, error.stack].filter(Boolean).join("\n");
  }
  return String(error ?? "UNKNOWN");
}

function writeDiagnostic(
  diagnosticId: string,
  context: OwnerErrorContext,
  error: unknown,
): void {
  if (!diagnosticLogPath) return;
  const line = JSON.stringify({
    at: new Date().toISOString(),
    context,
    detail: redactDiagnosticText(privateDetail(error)),
    diagnosticId,
    internalCode: internalCode(error),
  });
  try {
    mkdirSync(dirname(diagnosticLogPath), { recursive: true });
    appendFileSync(diagnosticLogPath, `${line}\n`, "utf8");
  } catch {
    // Diagnostics must never replace the original failure with a logging one.
  }
}

export function captureOwnerSafeError(
  error: unknown,
  context: OwnerErrorContext,
  language: "en" | "zh" = "en",
): OwnerSafeError {
  const code = publicCodeFor(error, context);
  const copy = ownerSafeErrorCopy(code, language);
  const diagnosticId = `vx-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
  writeDiagnostic(diagnosticId, context, error);
  return {
    ...copy,
    code,
    dataSafe: true,
    diagnosticId,
  };
}

export function ownerSafeErrorResponse(
  error: unknown,
  context: OwnerErrorContext,
  language: "en" | "zh" = "en",
): { error: string; ownerError: OwnerSafeError } {
  const ownerError = captureOwnerSafeError(error, context, language);
  return {
    error: formatOwnerSafeError(ownerError, language),
    ownerError,
  };
}

export function ownerSafeErrorText(
  error: unknown,
  context: OwnerErrorContext,
  language: "en" | "zh" = "en",
): { ownerError: OwnerSafeError; text: string } {
  const ownerError = captureOwnerSafeError(error, context, language);
  return {
    ownerError,
    text: formatOwnerSafeError(ownerError, language),
  };
}

export { PUBLIC_LOG_LOCATION };
