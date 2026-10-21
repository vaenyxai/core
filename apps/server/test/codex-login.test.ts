import { EventEmitter } from "node:events";
import type { ChildProcess } from "node:child_process";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CodexLoginCoordinator } from "../src/modules/harness/codex-login.js";

function fixture() {
  const child = Object.assign(new EventEmitter(), {
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    kill: vi.fn(),
  });
  const login = new CodexLoginCoordinator();
  const launch = vi.fn(() => child as unknown as ChildProcess);
  const onSuccess = vi.fn();
  return { child, login, launch, onSuccess };
}
afterEach(() => vi.useRealTimers());
describe("Codex reconnect lifecycle", () => {
  it("waits for the official process to finish, even after returning its URL", async () => {
    const { child, login, launch, onSuccess } = fixture();
    const pending = login.start("core", launch, onSuccess, false);
    child.stdout.write("Open https://auth.openai.com/synthetic\n");
    const result = await pending;
    expect(result.url).toBe("https://auth.openai.com/synthetic");
    expect(login.status("core", result.attemptId)).toBe("pending");
    expect(onSuccess).not.toHaveBeenCalled();
    child.emit("exit", 0);
    expect(login.status("core", result.attemptId)).toBe("succeeded");
    expect(onSuccess).toHaveBeenCalledOnce();
  });
  it("coalesces repeated presses and excludes competing profile logins", async () => {
    const { child, login, launch, onSuccess } = fixture();
    const first = login.start("core", launch, onSuccess, false);
    expect(login.start("core", launch, onSuccess, false)).toBe(first);
    await expect(
      login.start("other", launch, onSuccess, false),
    ).rejects.toThrow("CODEX_LOGIN_BUSY");
    expect(launch).toHaveBeenCalledOnce();
    child.emit("exit", 0);
    const result = await first;
    expect(login.status("other", result.attemptId)).toBeNull();
  });
  it("never turns a failed login into success or returns its diagnostics via status", async () => {
    const { child, login, launch, onSuccess } = fixture();
    const pending = login.start("core", launch, onSuccess, false);
    child.stderr.write("synthetic private diagnostic\n");
    child.emit("exit", 1);
    const result = await pending;
    expect(login.status("core", result.attemptId)).toBe("failed");
    expect(onSuccess).not.toHaveBeenCalled();
    const next = login.start("core", launch, onSuccess, false);
    child.emit("exit", 0);
    expect(login.status("core", result.attemptId)).toBeNull();
    await next;
  });
  it("keeps a slow-starting login pending then releases the callback port on timeout", async () => {
    vi.useFakeTimers();
    const { child, login, launch, onSuccess } = fixture();
    const pending = login.start("core", launch, onSuccess, false);
    await vi.advanceTimersByTimeAsync(8000);
    const result = await pending;
    expect(result.url).toBeNull();
    expect(login.status("core", result.attemptId)).toBe("pending");
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(login.status("core", result.attemptId)).toBe("failed");
    expect(child.kill).toHaveBeenCalledOnce();
    child.emit("exit", 0);
    expect(onSuccess).not.toHaveBeenCalled();
  });
  it("handles spawn errors and clears the busy state", async () => {
    const { child, login, launch, onSuccess } = fixture();
    const pending = login.start("core", launch, onSuccess, false);
    child.emit("error", new Error("spawn failed"));
    const result = await pending;
    expect(login.status("core", result.attemptId)).toBe("failed");
    const next = login.start("core", launch, onSuccess, false);
    child.emit("exit", 0);
    await expect(next).resolves.toHaveProperty("detail", null);
  });
});
