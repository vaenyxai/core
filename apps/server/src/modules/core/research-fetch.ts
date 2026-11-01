import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";

export function publicResearchAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a! >= 224 ||
      (a === 100 && b! >= 64 && b! <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b! >= 16 && b! <= 31) ||
      (a === 192 && [0, 168].includes(b!)) ||
      (a === 198 && [18, 19, 51].includes(b!)) ||
      (a === 203 && b === 0)
    );
  }
  // Conservative global-unicast IPv6 only; no mapped IPv4 or transition ranges.
  return (
    isIP(address) === 6 &&
    /^[23]/i.test(address) &&
    !/^(2001:(?:0:|db8:|2:|10:|20:)|2002:)/i.test(address)
  );
}
export function researchUrl(raw: string, hosts: string[] | null): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("source_denied");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443")
  )
    throw new Error("source_denied");
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (isIP(host) && !publicResearchAddress(host))
    throw new Error("source_denied");
  if (
    hosts !== null &&
    !hosts.some((value) => {
      const domain = value.trim().toLowerCase().replace(/^\.+/, "");
      return domain && (host === domain || host.endsWith(`.${domain}`));
    })
  )
    throw new Error("source_denied");
  url.hash = "";
  return url;
}
export interface ResearchDownload {
  body: Buffer;
  mime: string;
  url: string;
  fetchedAt: string;
}
export type ResearchDownloader = (
  url: string,
  hosts: string[] | null,
  limit: number,
  signal: AbortSignal,
  consume: (bytes: number) => void,
) => Promise<ResearchDownload>;

/** Every redirect is checked and each HTTPS connection is pinned to a checked DNS answer. */
export const downloadResearchSource: ResearchDownloader = async (
  raw,
  hosts,
  limit,
  signal,
  consume,
) => {
  let url = researchUrl(raw, hosts);
  for (let redirects = 0; redirects <= 5; redirects++) {
    signal.throwIfAborted();
    const addresses = await lookup(url.hostname.replace(/^\[|\]$/g, ""), {
      all: true,
    });
    signal.throwIfAborted();
    if (
      !addresses.length ||
      addresses.some((a) => !publicResearchAddress(a.address))
    )
      throw new Error("source_denied");
    const selected = addresses[0]!;
    const result = await new Promise<ResearchDownload | URL>(
      (resolve, reject) => {
        const req = request(
          url,
          {
            signal,
            headers: {
              "accept-encoding": "identity",
              "user-agent": "Vaenyx Research",
            },
            lookup: (_host, options, callback) =>
              options.all
                ? callback(null, [selected])
                : callback(null, selected.address, selected.family),
          },
          (response) => {
            const status = response.statusCode ?? 0;
            if (
              [301, 302, 303, 307, 308].includes(status) &&
              response.headers.location
            ) {
              response.destroy();
              try {
                resolve(
                  researchUrl(
                    new URL(response.headers.location, url).href,
                    hosts,
                  ),
                );
              } catch (error) {
                reject(error);
              }
              return;
            }
            if (status < 200 || status >= 300) {
              response.destroy();
              reject(new Error(`source_http_${status}`));
              return;
            }
            if (
              response.headers["content-encoding"] &&
              response.headers["content-encoding"] !== "identity"
            ) {
              response.destroy();
              reject(new Error("unsupported_encoding"));
              return;
            }
            if (Number(response.headers["content-length"] ?? 0) > limit) {
              response.destroy();
              reject(new Error("input_too_large"));
              return;
            }
            let bytes = 0;
            const chunks: Buffer[] = [];
            response.on("data", (chunk: Buffer) => {
              try {
                bytes += chunk.byteLength;
                consume(chunk.byteLength);
                if (bytes > limit) throw new Error("input_too_large");
                chunks.push(chunk);
              } catch (error) {
                req.destroy(error as Error);
              }
            });
            response.on("error", reject);
            response.on("end", () =>
              resolve({
                body: Buffer.concat(chunks),
                mime: (response.headers["content-type"] ?? "")
                  .split(";")[0]!
                  .toLowerCase(),
                url: url.href,
                fetchedAt: new Date().toISOString(),
              }),
            );
          },
        );
        req.on("error", reject);
        req.end();
      },
    );
    if (!(result instanceof URL)) return result;
    url = result;
  }
  throw new Error("redirect_limit");
};
