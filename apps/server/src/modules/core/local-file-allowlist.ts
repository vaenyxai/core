import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { readFileSync, lstatSync } from "node:fs";
import type { LocalFileInput } from "./local-file-types.js";

const id = Type.String({ minLength: 1, maxLength: 160 });
const hash = Type.String({ pattern: "^[a-f0-9]{64}$" });
const page = Type.Integer({ minimum: 1, maximum: 600 });
const schema = Type.Object(
  {
    version: Type.Literal(1),
    batch_id: id,
    profile_name: id,
    client_origin: id,
    task_id: id,
    files: Type.Array(
      Type.Object(
        {
          id,
          name: Type.String({ minLength: 1, maxLength: 200 }),
          path: Type.String({ minLength: 1, maxLength: 1024 }),
          sha256: hash,
          original_sha256: hash,
          original_page_count: page,
          original_from: page,
          original_to: page,
          page_count: page,
          allowed_pages: Type.Object(
            { from: page, to: page },
            { additionalProperties: false },
          ),
        },
        { additionalProperties: false },
      ),
      { minItems: 1, maxItems: 20 },
    ),
  },
  { additionalProperties: false },
);
export interface LocalFileAllowlist {
  version: 1;
  batch_id: string;
  profile_name: string;
  client_origin: string;
  task_id: string;
  files: LocalFileInput[];
}
// Installed by the local operator only. Requests cannot set this filename,
// add entries, choose paths or modify the bound App, website or task.
export function loadLocalFileAllowlist(
  path?: string,
): LocalFileAllowlist | null {
  if (!path) return null;
  try {
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 131072)
      return null;
    const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (!Value.Check(schema, raw)) return null;
    return raw;
  } catch {
    return null;
  }
}
export function publicLocalFileAllowlist(list: LocalFileAllowlist) {
  return { ...list, files: list.files.map(({ path: _path, ...file }) => {
    void _path;
    return file;
  }) };
}
