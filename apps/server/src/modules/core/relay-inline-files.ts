import { createHash } from "node:crypto";
import type { RelayFileRequest } from "./relay.js";
export const MAX_INLINE_FILE_BYTES = 2 * 1024 * 1024,
  MAX_INLINE_TOTAL_BYTES = 5 * 1024 * 1024;
export function decodeRelayInlineFile(
  file: RelayFileRequest,
  maxFileBytes: number,
): { body: Buffer; mime: string } | null {
  if (file.inline_base64 === undefined) return null;
  if (
    file.url ||
    file.file_ref ||
    !file.mime ||
    !file.sha256 ||
    typeof file.inline_base64 !== "string"
  )
    throw Error("RELAY_INLINE_FILE_INVALID");
  const text = file.inline_base64;
  if (
    text.length >
    4 * Math.ceil(Math.min(MAX_INLINE_FILE_BYTES, maxFileBytes) / 3)
  )
    throw Error("RELAY_FILE_TOO_LARGE");
  if (
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      text,
    ) ||
    !text
  )
    throw Error("RELAY_INLINE_FILE_INVALID");
  const body = Buffer.from(text, "base64");
  if (
    body.toString("base64") !== text ||
    body.length > Math.min(MAX_INLINE_FILE_BYTES, maxFileBytes)
  )
    throw Error("RELAY_INLINE_FILE_INVALID");
  const mime = file.mime;
  const head = body.subarray(0, 12);
  const matches =
    mime === "image/png"
      ? head
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : mime === "image/jpeg"
        ? head[0] === 255 && head[1] === 216 && head[2] === 255
        : mime === "image/webp"
          ? head.subarray(0, 4).toString() === "RIFF" &&
            head.subarray(8, 12).toString() === "WEBP"
          : mime === "image/gif"
            ? ["GIF87a", "GIF89a"].includes(head.subarray(0, 6).toString())
            : mime === "application/pdf"
              ? head.subarray(0, 5).toString() === "%PDF-"
              : false;
  if (!matches) throw Error("RELAY_FILE_TYPE_UNSUPPORTED");
  if (createHash("sha256").update(body).digest("hex") !== file.sha256)
    throw Error("RELAY_FILE_HASH_MISMATCH");
  return { body, mime };
}
