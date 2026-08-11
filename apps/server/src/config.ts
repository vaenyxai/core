import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type VaenyxMode = "development" | "test" | "production";

// Publishing to the community warehouse needs a GitHub token (the backend commits
// on the publisher's behalf) and a Google OAuth client (publisher sign-in). Both
// live in the secrets directory, never in git/OneDrive; null = not configured, in
// which case publishing is simply unavailable.
export interface PublishCredentials {
  githubToken: string;
  warehouseRepo: string;
}

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
}

export interface AppConfig {
  catalogueBaseUrl: string;
  corsOrigins: string[];
  dataDirectory: string;
  databasePath: string;
  backupsDirectory: string;
  repositoryRoot: string;
  host: string;
  libraryDirectory: string;
  routinesDirectory: string;
  docsDirectory: string;
  logLevel: string;
  migrationsDirectory: string;
  mode: VaenyxMode;
  port: number;
  version: string;
  webDistDirectory: string;
  // Where publish/Google credentials are read from (outside git/OneDrive).
  secretsDirectory: string;
  publish: PublishCredentials | null;
  googleOAuth: GoogleOAuthConfig | null;
  // If set (VAENYX_PUBLISH_SERVICE_URL), publishing routes through the operator-
  // hosted core-cloud service: the user signs in there and the service holds the
  // bot token. Null = the operator-direct GitHub path above.
  publishServiceUrl: string | null;
}

function readSecretJson(
  directory: string,
  file: string,
): Record<string, unknown> | null {
  try {
    return JSON.parse(
      readFileSync(resolve(directory, file), "utf8"),
    ) as Record<string, unknown>;
  } catch {
    // Absent or unreadable secret -> feature is simply unavailable.
    return null;
  }
}

function loadPublishCredentials(directory: string): PublishCredentials | null {
  const raw = readSecretJson(directory, "github-publish.json");
  const token = typeof raw?.token === "string" ? raw.token : null;
  const repo = typeof raw?.repo === "string" ? raw.repo : null;
  return token && repo ? { githubToken: token, warehouseRepo: repo } : null;
}

function loadGoogleOAuth(directory: string): GoogleOAuthConfig | null {
  const raw = readSecretJson(directory, "google-oauth.json");
  if (!raw) return null;
  // Accept Google's downloaded "web" client file as-is, or a flat { clientId,
  // clientSecret, redirectUri } shape.
  const web = (raw.web as Record<string, unknown> | undefined) ?? raw;
  const clientId =
    typeof web.client_id === "string"
      ? web.client_id
      : typeof web.clientId === "string"
        ? web.clientId
        : null;
  const clientSecret =
    typeof web.client_secret === "string"
      ? web.client_secret
      : typeof web.clientSecret === "string"
        ? web.clientSecret
        : null;
  if (!clientId || !clientSecret) return null;
  const redirectUris = Array.isArray(web.redirect_uris)
    ? (web.redirect_uris as unknown[]).filter(
        (uri): uri is string => typeof uri === "string",
      )
    : typeof web.redirectUri === "string"
      ? [web.redirectUri]
      : [];
  return { clientId, clientSecret, redirectUris };
}

function readMode(value: string | undefined): VaenyxMode {
  if (value === "production" || value === "test") {
    return value;
  }

  return "development";
}

function readPort(value: string | undefined): number {
  const port = Number.parseInt(value ?? "3000", 10);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("VAENYX_PORT must be an integer between 1 and 65535.");
  }

  return port;
}

function readCorsOrigins(value: string | undefined, mode: VaenyxMode): string[] {
  const developmentOrigins =
    "http://localhost:5173,http://127.0.0.1:5173";

  return (value ?? (mode === "development" ? developmentOrigins : ""))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

// Resolve the first candidate directory that already exists (or, when a `marker`
// is given, the first whose marker file exists). Mirrors scripts/lib/paths.mjs
// so the app and the command-line ops scripts agree on the no-env fallback order.
function firstExistingDir(
  candidates: string[],
  marker?: string,
): string | null {
  for (const candidate of candidates) {
    if (existsSync(marker ? resolve(candidate, marker) : candidate)) {
      return candidate;
    }
  }
  return null;
}

export function loadConfig(): AppConfig {
  const serverRoot = fileURLToPath(new URL("../", import.meta.url));
  const repositoryRoot = resolve(serverRoot, "../..");
  // Personal data lives under userdata/ (2026-07-03 code/data split). Prefer it,
  // but still resolve gracefully on machines that have not migrated yet
  // (userdata -> private/data -> legacy data); a VAENYX_DATA_DIR override (the
  // launcher injects one) always wins.
  const userdataDataDirectory = resolve(repositoryRoot, "userdata", "db");
  const privateDataDirectory = resolve(repositoryRoot, "private", "data");
  const legacyDataDirectory = resolve(repositoryRoot, "data");
  const dataDirectory = process.env.VAENYX_DATA_DIR
    ? resolve(serverRoot, process.env.VAENYX_DATA_DIR)
    : firstExistingDir(
        [userdataDataDirectory, privateDataDirectory, legacyDataDirectory],
        "vaenyx.db",
      ) ?? userdataDataDirectory;
  const mode = readMode(process.env.NODE_ENV);

  const secretsDirectory = process.env.VAENYX_SECRETS_DIR
    ? resolve(serverRoot, process.env.VAENYX_SECRETS_DIR)
    : resolve(repositoryRoot, "private", "secrets");

  return {
    // The community catalogue (Library v2 distribution): the app reads index.json
    // + content from Cloudflare here, never from GitHub directly.
    catalogueBaseUrl:
      process.env.VAENYX_CATALOGUE_URL ?? "https://vaenyx-lib.pages.dev",
    corsOrigins: readCorsOrigins(process.env.VAENYX_CORS_ORIGINS, mode),
    dataDirectory,
    databasePath: resolve(dataDirectory, "vaenyx.db"),
    // Backups live under userdata/backups (the in-app Backup & Restore page and
    // the Vaenyx-Backup scripts read/write here). Falls back to the pre-migration
    // private/backups -> backups locations; VAENYX_BACKUPS_DIR overrides.
    backupsDirectory: process.env.VAENYX_BACKUPS_DIR
      ? resolve(serverRoot, process.env.VAENYX_BACKUPS_DIR)
      : firstExistingDir([
          resolve(repositoryRoot, "userdata", "backups"),
          resolve(repositoryRoot, "private", "backups"),
          resolve(repositoryRoot, "backups"),
        ]) ?? resolve(repositoryRoot, "userdata", "backups"),
    // Repo root: used to locate scripts/backup.mjs + scripts/restore.mjs and the
    // library tree when running backup/restore on the owner's behalf.
    repositoryRoot,
    host: process.env.VAENYX_HOST ?? "127.0.0.1",
    // The runtime Method library lives under userdata/ (the launcher provides
    // VAENYX_LIBRARY_DIR). The repo ships only the neutral demo seed under
    // sample-library/, used as the no-env fallback; declarative recipes/schemas
    // are read from disk at runtime, not bundled into the build.
    libraryDirectory: process.env.VAENYX_LIBRARY_DIR
      ? resolve(serverRoot, process.env.VAENYX_LIBRARY_DIR)
      : resolve(repositoryRoot, "sample-library", "methods"),
    // Routines (Library v2 products) sit beside Methods in the library tree.
    routinesDirectory: process.env.VAENYX_ROUTINES_DIR
      ? resolve(serverRoot, process.env.VAENYX_ROUTINES_DIR)
      : resolve(repositoryRoot, "sample-library", "routines"),
    // docs/ holds the bilingual Glossary the Help page renders (spec-maintained).
    docsDirectory: process.env.VAENYX_DOCS_DIR
      ? resolve(serverRoot, process.env.VAENYX_DOCS_DIR)
      : resolve(repositoryRoot, "docs"),
    logLevel: process.env.VAENYX_LOG_LEVEL ?? "info",
    migrationsDirectory: resolve(
      serverRoot,
      process.env.VAENYX_MIGRATIONS_DIR ?? "./migrations",
    ),
    mode,
    port: readPort(process.env.VAENYX_PORT),
    version: "0.4.3.1-dev",
    webDistDirectory: resolve(
      serverRoot,
      process.env.VAENYX_WEB_DIST ?? "../web/dist",
    ),
    secretsDirectory,
    publish: loadPublishCredentials(secretsDirectory),
    googleOAuth: loadGoogleOAuth(secretsDirectory),
    publishServiceUrl:
      process.env.VAENYX_PUBLISH_SERVICE_URL?.replace(/\/+$/, "") || null,
  };
}
