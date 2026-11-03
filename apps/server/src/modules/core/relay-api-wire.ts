// Bounded transport. Provider prose and keys never appear in public errors.
export type Json = Record<string, unknown>;
export const object = (v: unknown): Json =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {};
export const array = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
export const string = (v: unknown): string => (typeof v === "string" ? v : "");
export class ApiRelayError extends Error {
  constructor(
    code: string,
    public readonly started = false,
    public readonly status = 400,
  ) {
    super(code);
  }
}
export const refuse = (code: string): never => {
  throw new ApiRelayError(code);
};
export async function providerJSON(
  url: string,
  key: string,
  wire: string,
  body: unknown,
  signal: AbortSignal,
  fetcher = globalThis.fetch,
): Promise<Json> {
  let response: Response;
  const started = body !== undefined;
  try {
    response = await fetcher(url, {
      method: started ? "POST" : "GET",
      redirect: "manual",
      signal,
      credentials: "omit",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        ...(wire === "anthropic"
          ? { "x-api-key": key, "anthropic-version": "2023-06-01" }
          : wire === "gemini"
            ? { "x-goog-api-key": key }
            : { authorization: "Bearer " + key }),
      },
      ...(started ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiRelayError(
      signal.aborted ? "RELAY_TIMEOUT" : "RELAY_PROVIDER_UNREACHABLE",
      started,
      502,
    );
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new ApiRelayError(
      "RELAY_PROVIDER_HTTP_" + response.status,
      started,
      response.status === 429 ? 429 : 502,
    );
  }
  const reader = response.body?.getReader();
  if (!reader)
    throw new ApiRelayError("RELAY_PROVIDER_RESPONSE_INVALID", started, 502);
  let size = 0;
  const chunks: Uint8Array[] = [];
  let stop: () => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    stop = () => reject(new ApiRelayError("RELAY_TIMEOUT", started, 502));
    signal.addEventListener("abort", stop, { once: true });
    if (signal.aborted) stop();
  });
  try {
    for (;;) {
      const part = await Promise.race([reader.read(), aborted]);
      if (part.done) break;
      size += part.value.length;
      if (size > 24000000) {
        await reader.cancel();
        throw Error("large");
      }
      chunks.push(part.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const value = JSON.parse(new globalThis.TextDecoder().decode(bytes));
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      JSON.stringify(value).includes(key)
    )
      throw Error("invalid");
    return value;
  } catch {
    await reader.cancel().catch(() => {});
    throw new ApiRelayError(
      signal.aborted ? "RELAY_TIMEOUT" : "RELAY_PROVIDER_RESPONSE_INVALID",
      started,
      502,
    );
  } finally {
    signal.removeEventListener("abort", stop);
    reader.releaseLock();
  }
}
