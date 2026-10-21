import type { ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendBoundedDiagnostic } from "../../runtime/owner-safe-errors.js";

export interface CodexLoginStart {
  attemptId: string;
  url: string | null;
  detail: string | null;
  cliWindowVisible: boolean;
}
export type CodexLoginPhase = "pending" | "succeeded" | "failed";

// An old healthy credential is not proof that THIS sign-in completed. Track
// the official login process, without reading its credential files.
export class CodexLoginCoordinator {
  #active: { profile: string; response: Promise<CodexLoginStart> } | null =
    null;
  #latest = new Map<string, { attemptId: string; status: CodexLoginPhase }>();

  status(profile: string, attemptId: string): CodexLoginPhase | null {
    const latest = this.#latest.get(profile);
    return latest?.attemptId === attemptId ? latest.status : null;
  }

  start(
    profile: string,
    launch: () => ChildProcess,
    onSuccess: () => void,
    cliWindowVisible: boolean,
  ): Promise<CodexLoginStart> {
    if (this.#active) {
      if (this.#active.profile === profile) return this.#active.response;
      return Promise.reject(new Error("CODEX_LOGIN_BUSY"));
    }
    const attemptId = randomUUID();
    let resolveResponse!: (value: CodexLoginStart) => void;
    const response = new Promise<CodexLoginStart>((resolve) => {
      resolveResponse = resolve;
    });
    this.#active = { profile, response };
    this.#latest.set(profile, { attemptId, status: "pending" });
    let settled = false;
    let finished = false;
    let output = "";
    let child: ChildProcess | undefined;
    let captureTimer: ReturnType<typeof setTimeout> | undefined;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    const settle = (url: string | null, detail: string | null = null) => {
      if (settled) return;
      settled = true;
      clearTimeout(captureTimer);
      resolveResponse({ attemptId, url, detail, cliWindowVisible });
    };
    const finish = (success: boolean, detail: string | null = null) => {
      if (finished) return;
      finished = true;
      clearTimeout(captureTimer);
      clearTimeout(expiryTimer);
      this.#latest.set(profile, {
        attemptId,
        status: success ? "succeeded" : "failed",
      });
      this.#active = null;
      if (success) onSuccess();
      settle(null, detail);
    };
    try {
      child = launch();
      captureTimer = setTimeout(() => settle(null), 8000);
      captureTimer.unref?.();
      expiryTimer = setTimeout(() => {
        finish(false, "CODEX_LOGIN_TIMED_OUT");
        child?.kill();
      }, 5 * 60_000);
      expiryTimer.unref?.();
      const scan = (chunk: unknown) => {
        output = appendBoundedDiagnostic(output, chunk);
        const match = output.match(/https:\/\/[^\s"']+/);
        if (match) settle(match[0].replace(/[).,]+$/, ""));
      };
      child.stdout?.on("data", scan);
      child.stderr?.on("data", scan);
      child.once("error", (error) => finish(false, error.message));
      child.once("exit", (code) => {
        const firstLine = output
          .split(/\r?\n/)
          .map((line) => line.trim())
          .find(Boolean);
        finish(
          code === 0,
          code === 0
            ? null
            : (firstLine?.slice(0, 200) ?? "CODEX_LOGIN_FAILED"),
        );
      });
    } catch (error) {
      finish(
        false,
        error instanceof Error ? error.message : "CODEX_LOGIN_FAILED",
      );
    }
    return response;
  }
}
