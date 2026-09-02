export const RELAY_CONTRACT_VERSION = 2;
export const RELAY_CAPABILITY_PROBE_REVISION = "2026-09-03.2";

export interface RelaySearchResult {
  title: string;
  url: string;
  snippet: string;
  published_at: string | null;
}

function hostnameAllowed(hostname: string, allowedDomains: string[]): boolean {
  if (allowedDomains.length === 0) return true;
  const normalized = hostname.toLowerCase();
  return allowedDomains.some((domain) => {
    const expected = domain.trim().toLowerCase().replace(/^\.+/, "");
    return normalized === expected || normalized.endsWith(`.${expected}`);
  });
}

function firstString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

/**
 * Extract only URL-bearing structured tool output. Model prose is never fed
 * into this function, so a citation written by the model cannot masquerade as
 * provider evidence.
 */
export function normalizeSearchEvidence(
  input: unknown,
  options: { allowedDomains?: string[]; maxResults?: number } = {},
): RelaySearchResult[] {
  const allowedDomains = options.allowedDomains ?? [];
  const maxResults = Math.min(20, Math.max(1, options.maxResults ?? 10));
  const found = new Map<string, RelaySearchResult>();
  const seen = new Set<object>();

  const visit = (value: unknown): void => {
    if (found.size >= maxResults || value === null || value === undefined) return;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          visit(JSON.parse(trimmed));
        } catch {
          // Plain tool text is not structured evidence.
        }
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (typeof value !== "object") return;
    if (seen.has(value)) return;
    seen.add(value);
    const record = value as Record<string, unknown>;
    // Codex CLI reports an opened search result as an absolute URL in the
    // web_search action's `query` field. Ordinary search phrases fail URL
    // parsing below, so only an actual HTTP(S) source is admitted.
    const rawUrl = firstString(record, [
      "url",
      "link",
      "source_url",
      "sourceUrl",
      "query",
    ]);
    if (rawUrl) {
      try {
        const parsed = new URL(rawUrl);
        if (
          (parsed.protocol === "https:" || parsed.protocol === "http:") &&
          hostnameAllowed(parsed.hostname, allowedDomains)
        ) {
          parsed.hash = "";
          const url = parsed.toString();
          if (!found.has(url)) {
            found.set(url, {
              title:
                firstString(record, ["title", "name", "page_title", "pageTitle"]) ||
                parsed.hostname,
              url,
              snippet: firstString(record, [
                "snippet",
                "description",
                "text",
                "content",
                "summary",
              ]).slice(0, 2_000),
              published_at:
                firstString(record, [
                  "published_at",
                  "publishedAt",
                  "page_age",
                  "pageAge",
                  "date",
                ]) || null,
            });
          }
        }
      } catch {
        // A provider result with a malformed URL is not auditable evidence.
      }
    }
    for (const nested of Object.values(record)) visit(nested);
  };

  visit(input);
  return [...found.values()].slice(0, maxResults);
}

export function relaySearchPrompt(input: {
  query: string;
  allowedDomains?: string[];
  maxResults?: number;
  language?: string;
  region?: string;
}): string {
  const domains = (input.allowedDomains ?? []).map((value) => value.trim()).filter(Boolean);
  return [
    "Search the live public web for the query below.",
    "Use only the web-search tools. Do not use files, shell, connectors, accounts or local data.",
    `Query: ${JSON.stringify(input.query)}`,
    `Maximum results: ${Math.min(20, Math.max(1, input.maxResults ?? 10))}`,
    domains.length > 0 ? `Allowed domains: ${domains.join(", ")}` : "Allowed domains: any public domain",
    input.language?.trim() ? `Answer language: ${input.language.trim()}` : "",
    input.region?.trim() ? `Region: ${input.region.trim()}` : "",
    "Give a short summary, but the calling application will trust only structured URLs returned by the search tool.",
  ]
    .filter(Boolean)
    .join("\n");
}
