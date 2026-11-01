import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ResearchRequest } from "@vaenyx/contracts";
import { LocalFileGrants } from "../src/modules/core/local-file-grants.js";
import { readGrantedPdf } from "../src/modules/core/local-file-bytes.js";
import { ResearchSources } from "../src/modules/core/research-sources.js";
import { localFileFixture } from "./local-file-fixture.js";

describe("temporary local file grants", () => {
  let directory: string,
    input: ReturnType<typeof localFileFixture>,
    store: LocalFileGrants;
  let now: number, version: number | null;
  const origin = "https://app.example",
    limit = 100000;
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "vaenyx-local-file-test-"));
    input = localFileFixture(directory);
    now = Date.now();
    version = 1;
    store = new LocalFileGrants(
      (id) => (id === "app" ? version : null),
      () => now,
    );
  });
  afterEach(() => rmSync(directory, { recursive: true, force: true }));
  const grant = () =>
    store
      .register("owner", "app", origin, "task", [input], limit)
      .then((g) => g[0]!);
  it("returns no paths and binds profile, origin, task, request and immutable file metadata", async () => {
    const g = await grant();
    expect(JSON.stringify(store.list("app", origin))).not.toContain(directory);
    expect(store.list("other", origin)).toEqual([]);
    expect(store.list("app", "https://other.example")).toEqual([]);
    const research = {
      task_id: g.task_id,
      request_id: g.request_id,
    } as ResearchRequest;
    const work = vi.fn(async () => "unused");
    for (const [profile, website, r, file] of [
      ["other", origin, research, g.file],
      ["app", "https://other.example", research, g.file],
      ["app", origin, { ...research, task_id: "other" }, g.file],
      ["app", origin, { ...research, request_id: "other" }, g.file],
      ["app", origin, research, { ...g.file, sha256: "a".repeat(64) }],
    ] as const)
      await expect(
        store.execute(profile, website, r, [file], {}, limit, work),
      ).rejects.toThrow("local_file_scope_denied");
    expect(work).not.toHaveBeenCalled();
  });
  it("claims once, rejects concurrent/changed retries and replays completed results without a model", async () => {
    const g = await grant(),
      research = {
        task_id: g.task_id,
        request_id: g.request_id,
      } as ResearchRequest;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const work = vi.fn(async () => {
      await gate;
      return { answer: "synthetic" };
    });
    const run = () =>
      store.execute(
        "app",
        origin,
        research,
        [g.file],
        { task: "same" },
        limit,
        work,
      );
    const pending = run();
    await expect(run()).rejects.toThrow("local_file_running");
    release();
    await pending;
    expect(await run()).toEqual({ answer: "synthetic" });
    expect(work).toHaveBeenCalledTimes(1);
    await expect(
      store.execute(
        "app",
        origin,
        research,
        [g.file],
        { task: "changed" },
        limit,
        work,
      ),
    ).rejects.toThrow("local_file_request_changed");
    await expect(grant()).rejects.toThrow("local_file_already_granted");
  });
  it.each(["expiry", "revoke", "rotation", "restart"])(
    "fails closed after %s",
    async (cause) => {
      const g = await grant(),
        research = {
          task_id: g.task_id,
          request_id: g.request_id,
        } as ResearchRequest;
      if (cause === "expiry") now += 600000;
      if (cause === "revoke") store.revoke("owner", "task");
      if (cause === "rotation") version = 2;
      if (cause === "restart") store.clear();
      const work = vi.fn();
      await expect(
        store.execute("app", origin, research, [g.file], {}, limit, work),
      ).rejects.toThrow(/local_file_/);
      expect(work).not.toHaveBeenCalled();
    },
  );
  it("checks page scope and expiry on cached reads without inventing network bytes or fetch time", async () => {
    const g = await grant(),
      research = {
        task_id: g.task_id,
        request_id: g.request_id,
      } as ResearchRequest;
    await expect(
      store.execute(
        "app",
        origin,
        research,
        [g.file],
        {},
        limit,
        async (localRead) => {
          const sources = new ResearchSources({
            files: [g.file],
            urls: [],
            fileHosts: [],
            allowedDomains: [],
            maxBytes: limit,
            maxFileBytes: limit,
            scratch: directory,
            signal: new AbortController().signal,
            localRead,
          });
          const read = { file_id: g.file.id, from: 1, to: 1, visual: false };
          await sources.read(read);
          expect(sources.downloadedBytes).toBe(0);
          expect(sources.list()[0]).toMatchObject({
            url: null,
            fetched_at: null,
            page_count: 1,
            content_hash: input.sha256,
          });
          await expect(sources.read({ ...read, to: 2 })).rejects.toThrow(
            "local_file_page_denied",
          );
          now += 600000;
          await expect(sources.read(read)).rejects.toThrow(
            "local_file_expired",
          );
          return "late";
        },
      ),
    ).rejects.toThrow("local_file_expired");
  });
  it("refuses changed files before model work and does not rerun a failed attempt", async () => {
    const g = await grant(),
      research = {
        task_id: g.task_id,
        request_id: g.request_id,
      } as ResearchRequest;
    writeFileSync(input.path, "%PDF-changed");
    const work = vi.fn();
    const run = () =>
      store.execute("app", origin, research, [g.file], {}, limit, work);
    await expect(run()).rejects.toThrow("local_file_hash_mismatch");
    await expect(run()).rejects.toThrow("local_file_failed");
    expect(work).not.toHaveBeenCalled();
  });
  it("refuses wrong page declarations, byte overflows, sensitive paths and redirected directories", async () => {
    await expect(
      store.register(
        "owner",
        "app",
        origin,
        "task",
        [{ ...input, page_count: 2, original_to: 2, original_page_count: 2 }],
        limit,
      ),
    ).rejects.toThrow("local_file_page_count_mismatch");
    await expect(readGrantedPdf(input.path, input.sha256, 5)).rejects.toThrow(
      "local_file_size_denied",
    );
    await expect(
      readGrantedPdf(
        join(directory, "userdata", "file.pdf"),
        input.sha256,
        limit,
      ),
    ).rejects.toThrow("local_file_path_denied");
    const real = join(directory, "real"),
      alias = join(directory, "alias");
    mkdirSync(real);
    const nested = localFileFixture(real);
    symlinkSync(real, alias, process.platform === "win32" ? "junction" : "dir");
    await expect(
      readGrantedPdf(join(alias, "synthetic.pdf"), nested.sha256, limit),
    ).rejects.toThrow("local_file_path_denied");
  });
});
