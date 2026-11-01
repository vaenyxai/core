import { createHash } from "node:crypto";
import { lstat, open, realpath } from "node:fs/promises";
import { isAbsolute, normalize, parse, dirname } from "node:path";

// Only an Owner's exact path is accepted, never a directory, glob, URL or lookup.
// Reject redirects/reparse symlinks in every component and common secret stores.
export async function readGrantedPdf(
  path: string,
  expectedHash: string,
  maxBytes: number,
) {
  if (
    !isAbsolute(path) ||
    normalize(path) !== path ||
    !/\.pdf$/i.test(path) ||
    /(?:^|[\\/])(?:userdata|\.git|\.ssh|\.aws|\.codex|\.claude|secrets|\.env[^\\/]*)(?:[\\/]|$)/i.test(
      path,
    ) ||
    [...path].some((c) => c.charCodeAt(0) < 32) ||
    path.startsWith("\\\\") ||
    path.slice(2).includes(":")
  )
    throw new Error("local_file_path_denied");
  for (let part = path; part !== parse(part).root; part = dirname(part)) {
    const stat = await lstat(part);
    if (stat.isSymbolicLink()) throw new Error("local_file_path_denied");
  }
  const canonical = await realpath(path);
  if (canonical.toLowerCase() !== path.toLowerCase())
    throw new Error("local_file_path_denied");
  const handle = await open(path, "r");
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size < 5 || stat.size > maxBytes)
      throw new Error("local_file_size_denied");
    // Bounded reads even if the original grows while it is being read.
    const buffer = Buffer.alloc(stat.size + 1);
    let bytes = 0;
    while (bytes < buffer.length) {
      const result = await handle.read(
        buffer,
        bytes,
        buffer.length - bytes,
        bytes,
      );
      if (!result.bytesRead) break;
      bytes += result.bytesRead;
    }
    const after = await handle.stat();
    if (
      bytes !== stat.size ||
      after.size !== stat.size ||
      after.mtimeMs !== stat.mtimeMs
    )
      throw new Error("local_file_changed");
    const body = buffer.subarray(0, bytes);
    if (
      body.subarray(0, 5).toString() !== "%PDF-" ||
      createHash("sha256").update(body).digest("hex") !==
        expectedHash.toLowerCase()
    )
      throw new Error("local_file_hash_mismatch");
    return body;
  } finally {
    await handle.close();
  }
}
