import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ lookup: vi.fn(), request: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: mocks.lookup }));
vi.mock("node:https", () => ({ request: mocks.request }));
import { downloadResearchSource } from "../src/modules/core/research-fetch.js";
beforeEach(() => {
  mocks.lookup
    .mockReset()
    .mockResolvedValue([{ address: "8.8.8.8", family: 4 }]);
  mocks.request.mockReset();
});
function respond(
  status: number,
  headers: Record<string, string>,
  chunks: string[] = [],
) {
  mocks.request.mockImplementationOnce((_url, _options, onResponse) => {
    const req = new EventEmitter() as EventEmitter & {
      end(): void;
      destroy(error: Error): void;
    };
    req.destroy = (error) => {
      req.emit("error", error);
    };
    req.end = () =>
      queueMicrotask(() => {
        const response = new EventEmitter() as EventEmitter & {
          statusCode: number;
          headers: Record<string, string>;
          destroy(): void;
        };
        response.statusCode = status;
        response.headers = headers;
        response.destroy = () => {};
        onResponse(response);
        chunks.forEach((chunk) => response.emit("data", Buffer.from(chunk)));
        response.emit("end");
      });
    return req;
  });
}
describe("research source network boundary without network access", () => {
  it("pins the checked public DNS address for connection", async () => {
    respond(200, { "content-type": "text/plain" }, ["hello"]);
    const consume = vi.fn();
    const result = await downloadResearchSource(
      "https://example.org/a",
      null,
      100,
      new AbortController().signal,
      consume,
    );
    expect(result.body.toString()).toBe("hello");
    expect(consume).toHaveBeenCalledWith(5);
    const options = mocks.request.mock.calls[0]![1];
    const callback = vi.fn();
    options.lookup("example.org", { all: true }, callback);
    expect(callback).toHaveBeenCalledWith(null, [
      { address: "8.8.8.8", family: 4 },
    ]);
  });
  it("rejects any private DNS answer before opening a socket", async () => {
    mocks.lookup.mockResolvedValue([
      { address: "8.8.8.8", family: 4 },
      { address: "10.0.0.1", family: 4 },
    ]);
    await expect(
      downloadResearchSource(
        "https://example.org",
        null,
        100,
        new AbortController().signal,
        () => {},
      ),
    ).rejects.toThrow("source_denied");
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("does not follow a redirect outside a file host allowlist", async () => {
    respond(302, { location: "https://other.example/b" });
    await expect(
      downloadResearchSource(
        "https://example.org/a",
        ["example.org"],
        100,
        new AbortController().signal,
        () => {},
      ),
    ).rejects.toThrow("source_denied");
    expect(mocks.request).toHaveBeenCalledTimes(1);
  });
  it("does not follow a redirect to metadata or loopback", async () => {
    respond(302, { location: "https://169.254.169.254/" });
    await expect(
      downloadResearchSource(
        "https://example.org/a",
        null,
        100,
        new AbortController().signal,
        () => {},
      ),
    ).rejects.toThrow("source_denied");
    expect(mocks.request).toHaveBeenCalledTimes(1);
  });
  it("enforces byte limits even without content-length", async () => {
    respond(200, {}, ["1234", "5678"]);
    await expect(
      downloadResearchSource(
        "https://example.org/a",
        null,
        5,
        new AbortController().signal,
        () => {},
      ),
    ).rejects.toThrow("input_too_large");
  });
});
