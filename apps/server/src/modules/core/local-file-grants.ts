import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { ResearchFile, ResearchRequest } from "@vaenyx/contracts";
import type {
  LocalFileInput,
  LocalFileRead,
  LocalFileView,
} from "./local-file-types.js";
import { readGrantedPdf } from "./local-file-bytes.js";
import { readResearchDocument } from "./research-documents.js";

interface Grant {
  owner: string;
  profile: string;
  keyVersion: number;
  origin: string;
  input: LocalFileInput;
  view: LocalFileView;
  expires: number;
  digest?: string;
  result?: unknown;
}
export class LocalFileGrants {
  private readonly entries = new Map<string, Grant>();
  constructor(
    private readonly profileVersion: (id: string) => number | null,
    private readonly now: () => number = Date.now,
  ) {}
  clear() {
    for (const g of this.entries.values()) {
      g.view.status = "revoked";
      g.result = undefined;
    }
    this.entries.clear();
  }
  private current(g: Grant) {
    if (
      g.view.status === "revoked" ||
      this.profileVersion(g.profile) !== g.keyVersion
    )
      throw new Error("local_file_revoked");
    if (this.now() >= g.expires) throw new Error("local_file_expired");
  }
  permitsOrigin(origin: string) {
    return [...this.entries.values()].some((g) => {
      try {
        this.current(g);
        return g.origin === origin;
      } catch {
        return false;
      }
    });
  }
  list(profile: string, origin: string) {
    return [...this.entries.values()]
      .filter((g) => g.profile === profile && g.origin === origin)
      .map((g) => {
        const view = structuredClone(g.view);
        try {
          this.current(g);
        } catch (error) {
          view.status =
            (error as Error).message === "local_file_expired"
              ? "expired"
              : "revoked";
        }
        return view;
      });
  }
  async register(
    owner: string,
    profile: string,
    origin: string,
    task: string,
    inputs: LocalFileInput[],
    maxBytes: number,
  ) {
    const version = this.profileVersion(profile);
    if (version === null) throw new Error("local_file_profile_denied");
    const url = new URL(origin);
    if (
      url.protocol !== "https:" ||
      url.origin !== origin ||
      url.username ||
      url.password
    )
      throw new Error("local_file_origin_denied");
    if (
      !inputs.length ||
      inputs.length > 20 ||
      new Set(inputs.map((f) => f.id)).size !== inputs.length
    )
      throw new Error("local_file_invalid_manifest");
    for (const f of inputs) {
      if (
        f.original_to - f.original_from + 1 !== f.page_count ||
        f.original_to > f.original_page_count ||
        f.allowed_pages.to > f.page_count ||
        f.allowed_pages.to < f.allowed_pages.from
      )
        throw new Error("local_file_invalid_manifest");
      // Identity/mapping declarations are not inferred from document content.
      const body = await readGrantedPdf(f.path, f.sha256, maxBytes);
      try {
        const doc = await readResearchDocument(
          body,
          "application/pdf",
          AbortSignal.timeout(30000),
        );
        if (doc.pageCount !== f.page_count)
          throw new Error("local_file_page_count_mismatch");
      } finally {
        body.fill(0);
      }
    }
    for (const [token, g] of this.entries)
      if (this.now() > g.expires + 3600000) this.entries.delete(token);
    // Minting a fresh token must not bypass a running/finished attempt. Only an
    // expired, never-used reference may be renewed for this task/file/page scope.
    for (const input of inputs) {
      const previous = [...this.entries.values()].find(
        (g) =>
          g.profile === profile &&
          g.view.task_id === task &&
          g.input.sha256 === input.sha256 &&
          g.input.allowed_pages.from === input.allowed_pages.from &&
          g.input.allowed_pages.to === input.allowed_pages.to,
      );
      if (previous && (previous.digest || this.now() < previous.expires))
        throw new Error("local_file_already_granted");
    }
    if (this.entries.size + inputs.length > 128)
      throw new Error("local_file_limit");
    // Check again after asynchronous inspection, before granting any file.
    if (this.profileVersion(profile) !== version)
      throw new Error("local_file_revoked");
    const expires = this.now() + 600000;
    const grants = inputs.map((input) => {
      const token = randomBytes(32).toString("base64url");
      const { path: _path, id, name, sha256, ...metadata } = input;
      void _path;
      const view: LocalFileView = {
        ...metadata,
        file: {
          id,
          name,
          sha256,
          mime: "application/pdf",
          file_ref: { version: 1, token },
        },
        task_id: task,
        request_id: randomUUID(),
        expires_at: new Date(expires).toISOString(),
        status: "ready",
      };
      this.entries.set(token, {
        owner,
        profile,
        origin,
        keyVersion: version,
        input: structuredClone(input),
        view,
        expires,
      });
      return structuredClone(view);
    });
    return grants;
  }
  revoke(owner: string, task: string) {
    let count = 0;
    for (const g of this.entries.values())
      if (g.owner === owner && g.view.task_id === task) {
        g.view.status = "revoked";
        g.result = undefined;
        count++;
      }
    return count;
  }
  async execute<T>(
    profile: string,
    origin: string,
    research: ResearchRequest,
    files: ResearchFile[],
    body: unknown,
    maxBytes: number,
    work: (read: LocalFileRead) => Promise<T>,
  ): Promise<T> {
    // One local reference per request keeps each attempt and page receipt independent.
    if (files.length !== 1 || !files[0]?.file_ref || files[0].url)
      throw new Error("local_file_invalid_request");
    const file = files[0];
    const g = this.entries.get(file.file_ref!.token);
    if (
      !g ||
      g.profile !== profile ||
      g.origin !== origin ||
      g.view.task_id !== research.task_id ||
      g.view.request_id !== research.request_id ||
      file.id !== g.view.file.id ||
      file.name !== g.view.file.name ||
      file.sha256 !== g.view.file.sha256 ||
      file.mime !== "application/pdf"
    )
      throw new Error("local_file_scope_denied");
    this.current(g);
    const digest = createHash("sha256")
      .update(JSON.stringify(body))
      .digest("hex");
    if (g.digest && g.digest !== digest)
      throw new Error("local_file_request_changed");
    if (g.view.status === "completed") return structuredClone(g.result) as T;
    if (g.view.status !== "ready")
      throw new Error("local_file_" + g.view.status);
    // Atomic claim before any await: concurrent retries cannot run another model.
    g.view.status = "running";
    g.digest = digest;
    let bytes: Buffer | undefined;
    try {
      bytes = await readGrantedPdf(g.input.path, g.input.sha256, maxBytes);
      this.current(g);
      const read: LocalFileRead = async (f, from, to, limit, signal) => {
        signal.throwIfAborted();
        this.current(g);
        if (
          f.file_ref?.token !== file.file_ref!.token ||
          from < g.input.allowed_pages.from ||
          (to ?? from) > g.input.allowed_pages.to ||
          (to !== null && to < from) ||
          !Number.isSafeInteger(from) ||
          (to !== null && !Number.isSafeInteger(to))
        )
          throw new Error("local_file_page_denied");
        if (bytes!.length > limit) throw new Error("download_budget_exhausted");
        return { body: bytes!, mime: "application/pdf", fetchedAt: null };
      };
      const result = await work(read);
      // Revocation/expiry during model work must never release a late response.
      this.current(g);
      g.result = structuredClone(result);
      g.view.status = "completed";
      return result;
    } catch (error) {
      if ((g.view as LocalFileView).status !== "revoked")
        g.view.status = "failed";
      throw error;
    } finally {
      bytes?.fill(0);
    }
  }
}
