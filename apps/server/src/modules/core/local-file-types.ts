import type { ResearchFile } from "@vaenyx/contracts";

export interface LocalFileInput {
  id: string;
  name: string;
  path: string;
  sha256: string;
  original_sha256: string;
  original_page_count: number;
  original_from: number;
  original_to: number;
  page_count: number;
  allowed_pages: { from: number; to: number };
}
export interface LocalFileView extends Omit<
  LocalFileInput,
  "path" | "id" | "name" | "sha256"
> {
  file: ResearchFile;
  task_id: string;
  request_id: string;
  expires_at: string;
  status: "ready" | "running" | "completed" | "failed" | "expired" | "revoked";
}
// This resolver is supplied by the authenticated host, never by a JSON caller.
export type LocalFileRead = (
  file: ResearchFile,
  from: number,
  to: number | null,
  maxBytes: number,
  signal: AbortSignal,
) => Promise<{ body: Buffer; mime: string; fetchedAt: null }>;
