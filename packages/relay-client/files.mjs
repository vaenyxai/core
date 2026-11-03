// Already-held file bytes; bounded input to the same private App API, no upload service.
import { problem } from "./protocol.mjs";
export async function inlineFile({ name, mime, base64 }) {
  if (
    typeof name !== "string" ||
    !name ||
    name.length > 200 ||
    ![
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
      "application/pdf",
    ].includes(mime) ||
    typeof base64 !== "string" ||
    base64.length > 2796204 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      base64,
    )
  )
    throw problem("RELAY_INLINE_FILE_INVALID", { unknown: false });
  let data;
  try {
    data = Uint8Array.from(globalThis.atob(base64), (c) => c.charCodeAt(0));
  } catch {
    throw problem("RELAY_INLINE_FILE_INVALID", { unknown: false });
  }
  if (!data.length || data.length > 2097152)
    throw problem("RELAY_FILE_TOO_LARGE", { unknown: false });
  const hash = await globalThis.crypto.subtle.digest("SHA-256", data);
  return {
    name,
    mime,
    inline_base64: base64,
    sha256: Array.from(new Uint8Array(hash), (v) =>
      v.toString(16).padStart(2, "0"),
    ).join(""),
  };
}
