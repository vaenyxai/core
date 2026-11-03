// Shared bounded transport. Never put provider diagnostics, prompts or credentials in errors.
const messages = {};
export const problem = (code, extra = {}) =>
  Object.assign(new Error(messages[code] || code), { code, ...extra });
export function exactOrigin(value) {
  try {
    const u = new globalThis.URL(value);
    if (
      u.protocol !== "https:" ||
      u.origin !== value ||
      u.username ||
      u.password
    )
      throw 0;
    return u.origin;
  } catch {
    throw problem("invalid_origin");
  }
}
export async function boundedJSON(response, limit = 64000) {
  const reader = response.body?.getReader();
  if (!reader) throw problem("invalid_response");
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const r = await reader.read();
      if (r.done) break;
      size += r.value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw problem("response_too_large");
      }
      chunks.push(r.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  try {
    return JSON.parse(new globalThis.TextDecoder().decode(bytes));
  } catch {
    throw problem("invalid_response");
  }
}
const refusedBeforeRun = new Set([
  "RELAY_TAILNET_REQUIRED",
  "RELAY_KEY_WRONG_KIND",
  "RELAY_OFF",
  "RELAY_PROFILE_NOT_CONNECTED",
  "RELAY_CAPABILITY_OFF",
  "RELAY_CAPABILITY_NOT_GRANTED",
  "RELAY_CAPABILITY_UNSUPPORTED",
  "RELAY_MODEL_INVALID",
  "RELAY_EFFORT_INVALID",
  "RELAY_REQUIREMENT_UNSUPPORTED",
  "RELAY_REQUIREMENT_INVALID",
  "RELAY_ROUTING_REQUIRED",
  "RELAY_ROUTING_CHANGED",
  "RELAY_SELECTION_MANAGED",
  "RELAY_PROFILE_REQUIRED",
  "RELAY_MODEL_NOT_AVAILABLE",
  "RELAY_MODEL_TEST_REQUIRED",
  "RELAY_MODEL_CATALOGUE_UNAVAILABLE",
]);
export function safeFailure(status, body, run = false) {
  const prefix =
    typeof body?.error === "string" ? body.error.split(":")[0] : "";
  const code = /^(RELAY_[A-Z0-9_]+|CODEX_LOGIN_BUSY)$/.test(prefix)
    ? prefix
    : status === 401
      ? "unauthorized"
      : "refused";
  return problem(code, {
    status,
    unknown:
      run &&
      (body?.execution_started === true ||
        (!refusedBeforeRun.has(code) && status !== 401)),
  });
}
export async function requestJSON(
  url,
  init = {},
  {
    fetcher = globalThis.fetch,
    timeoutMs = 10000,
    limit = 64000,
    run = false,
    secret,
  } = {},
) {
  const controller = new globalThis.AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = globalThis.setTimeout(() => {
      controller.abort();
      reject(
        problem(run ? "outcome_unknown" : "unreachable", { unknown: run }),
      );
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      timeout,
      (async () => {
        let response;
        try {
          response = await fetcher(url, {
            ...init,
            cache: "no-store",
            redirect: "error",
            signal: controller.signal,
          });
        } catch {
          throw problem(run ? "outcome_unknown" : "unreachable", {
            unknown: run,
          });
        }
        let body;
        try {
          body = await boundedJSON(response, limit);
        } catch (e) {
          if (run) e.unknown = true;
          throw e;
        }
        if (
          secret &&
          (Array.isArray(secret) ? secret : [secret])
            .filter(Boolean)
            .flatMap((value) => [
              value,
              JSON.stringify(value).slice(1, -1),
              encodeURIComponent(value),
            ])
            .some((value) => JSON.stringify(body).includes(value))
        )
          throw problem("unsafe_response", { unknown: run });
        if (!response.ok) throw safeFailure(response.status, body, run);
        return body;
      })(),
    ]);
  } finally {
    globalThis.clearTimeout(timer);
  }
}
export const digest = async (value) =>
  Array.from(
    new Uint8Array(
      await globalThis.crypto.subtle.digest(
        "SHA-256",
        new globalThis.TextEncoder().encode(value),
      ),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
