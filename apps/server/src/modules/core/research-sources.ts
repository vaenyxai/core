import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type {
  ResearchFile,
  ResearchSource,
  ResearchRange,
} from "@vaenyx/contracts";
import {
  downloadResearchSource,
  type ResearchDownloader,
} from "./research-fetch.js";
import {
  readResearchDocument,
  type ResearchDocument,
} from "./research-documents.js";
import { renderRelayPdfPages } from "./relay-pdf.js";

export interface ResearchRead {
  source: ResearchSource;
  text: string;
  images: string[];
  range: ResearchRange;
  totalUnits: number;
  pageTexts: Map<number, string>;
}
interface Stored {
  source: ResearchSource;
  body?: Buffer;
  mime?: string;
  document?: ResearchDocument;
  file?: ResearchFile;
  mixedRepresentation?: boolean;
}
export class ResearchSources {
  readonly entries = new Map<string, Stored>();
  downloadedBytes = 0;
  constructor(
    readonly options: {
      files: ResearchFile[];
      urls: string[];
      fileHosts: string[];
      allowedDomains: string[];
      maxBytes: number;
      maxFileBytes: number;
      scratch: string;
      signal: AbortSignal;
      download?: ResearchDownloader;
      visionEnabled?: boolean;
    },
  ) {
    for (const file of options.files) this.add(null, file);
    for (const url of options.urls) this.add(url);
  }
  add(url: string | null, file?: ResearchFile): ResearchSource {
    const existing = [...this.entries.values()].find((entry) =>
      file ? entry.file?.id === file.id : entry.source.url === url,
    );
    if (existing) return existing.source;
    const source: ResearchSource = {
      id: `src-${this.entries.size + 1}`,
      input_file_id: file?.id ?? null,
      url,
      content_hash: null,
      fetched_at: null,
      document_date: null,
      page_count: null,
      read_ranges: [],
      delivered_ranges: [],
      unread_ranges: null,
      coverage: "discovered",
      representation: "unknown",
      truncated: null,
      reason: null,
    };
    this.entries.set(source.id, { source, file });
    return source;
  }
  list(): ResearchSource[] {
    return [...this.entries.values()].map((entry) => entry.source);
  }
  async read(input: {
    file_id?: string;
    url?: string;
    from: number;
    to: number;
    visual: boolean;
  }): Promise<ResearchRead> {
    const entry = [...this.entries.values()].find((item) =>
      input.file_id
        ? item.file?.id === input.file_id
        : item.source.url === input.url,
    );
    if (!entry) throw new Error("source_denied");
    const source = entry.source;
    const previousRepresentation = source.representation;
    try {
      if (!entry.body) {
        const hosts = entry.file
          ? this.options.fileHosts
          : this.options.allowedDomains.length
            ? this.options.allowedDomains
            : null;
        const downloaded = await (
          this.options.download ?? downloadResearchSource
        )(
          entry.file?.url ?? source.url!,
          hosts,
          Math.min(
            this.options.maxFileBytes,
            this.options.maxBytes - this.downloadedBytes,
          ),
          this.options.signal,
          (bytes) => {
            this.downloadedBytes += bytes;
            if (this.downloadedBytes > this.options.maxBytes)
              throw new Error("download_budget_exhausted");
          },
        );
        this.options.signal.throwIfAborted();
        const hash = createHash("sha256").update(downloaded.body).digest("hex");
        if (entry.file?.sha256 && hash !== entry.file.sha256.toLowerCase())
          throw new Error("source_hash_mismatch");
        entry.body = downloaded.body;
        entry.mime =
          downloaded.mime || entry.file?.mime || "application/octet-stream";
        source.content_hash = hash;
        source.fetched_at = downloaded.fetchedAt;
        // A file's signed download link never becomes an output source URL.
      }
      const isImage = entry.mime!.startsWith("image/");
      if (!isImage && !entry.document)
        entry.document = await readResearchDocument(
          entry.body,
          entry.mime!,
          this.options.signal,
        );
      this.options.signal.throwIfAborted();
      source.page_count = isImage ? 1 : entry.document!.pageCount;
      const pdf = source.page_count !== null && !isImage;
      const max = pdf
        ? source.page_count!
        : isImage
          ? 1
          : entry.document!.parts[0]!.length;
      const unit = pdf || isImage ? "page" : "character";
      const { from, to } = input;
      if (
        !Number.isInteger(from) ||
        !Number.isInteger(to) ||
        from < 1 ||
        to < from ||
        to > max
      )
        throw new Error("invalid_read_range");
      const range: ResearchRange = { unit, from, to };
      let text = "";
      let images: string[] = [];
      if (input.visual || isImage) {
        if (this.options.visionEnabled === false)
          throw new Error("vision_capability_off");
        if (!pdf && !isImage) throw new Error("unsupported_visual_source");
        const directory = resolve(this.options.scratch, randomUUID());
        mkdirSync(directory, { recursive: true });
        if (isImage) {
          const { writeFileSync } = await import("node:fs");
          const path = resolve(directory, "input.png");
          writeFileSync(path, entry.body);
          images = [path];
        } else
          images = await renderRelayPdfPages(
            entry.body,
            directory,
            { from, to },
            this.options.signal,
          );
        source.representation = "rendered_page";
        source.reason =
          "Page images were supplied; visual observations are model interpretations.";
      } else {
        text = pdf
          ? entry
              .document!.parts.slice(from - 1, to)
              .map((part, i) => `[page ${from + i}]\n${part}`)
              .join("\n\n")
          : entry.document!.parts[0]!.slice(from - 1, to);
        if (text.length > 32000) throw new Error("read_range_too_large");
        source.representation = entry.document!.representation;
        source.reason = entry.document!.reason;
        if (
          pdf &&
          entry.document!.parts.slice(from - 1, to).some((part) => !part)
        )
          source.reason =
            "Some requested pages have no text layer; use visual reading, or report missing evidence.";
      }
      this.options.signal.throwIfAborted();
      source.read_ranges!.push(range);
      source.delivered_ranges!.push(range);
      // Coverage describes the selected representation only, never model comprehension.
      const ranges = source
        .read_ranges!.filter((r) => r.unit === unit)
        .sort((a, b) => a.from - b.from);
      let end = 0;
      for (const r of ranges) if (r.from <= end + 1) end = Math.max(end, r.to);
      source.coverage = end >= max ? "complete" : "partial";
      source.truncated = false;
      source.unread_ranges = end >= max ? [] : null;
      if (
        entry.mixedRepresentation ||
        (previousRepresentation !== "unknown" &&
          previousRepresentation !== source.representation &&
          source.read_ranges!.length > 1)
      ) {
        entry.mixedRepresentation = true;
        source.representation = "unknown";
        source.coverage = "partial";
        source.reason =
          "Mixed text and visual reads; inspect individual operation ranges, not a whole-document coverage claim.";
      }
      const pageTexts = new Map<number, string>();
      if (pdf && !images.length)
        for (let page = from; page <= to; page++)
          pageTexts.set(page, entry.document!.parts[page - 1]!);
      return { source, text, images, range, totalUnits: max, pageTexts };
    } catch (error) {
      source.coverage = "failed";
      source.reason =
        error instanceof Error && /^[a-z_0-9]+$/.test(error.message)
          ? error.message
          : "read_failed";
      throw error;
    }
  }
}
