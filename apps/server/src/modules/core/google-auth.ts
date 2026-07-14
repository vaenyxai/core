// Google sign-in for publishing (library-architecture §16). The Owner links a
// Google identity once; it is used only to attribute the Methods/Routines they
// publish. We request the minimum scope (openid email profile) — never Drive,
// Gmail, etc. The instance password login is unchanged; Google is purely the
// publisher identity, exactly as any future user will use it.

import { randomBytes, randomUUID } from "node:crypto";

import type { GoogleOAuthConfig } from "../../config.js";
import type { DatabaseHandle } from "../../db/database.js";

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

type FetchLike = typeof fetch;

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
}

export interface PublisherIdentityRow {
  id: string;
  owner_id: string | null;
  google_sub: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

// Build the Google consent URL. redirectUri must EXACTLY match one registered on
// the OAuth client (we registered the Tailscale + localhost callbacks).
export function buildGoogleAuthUrl(
  oauth: GoogleOAuthConfig,
  redirectUri: string,
  state: string,
): string {
  const params = new URLSearchParams({
    client_id: oauth.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

// Choose the registered redirect URI whose host matches the request, so local
// (localhost) and remote (Tailscale) both work; default to the first registered.
export function pickRedirectUri(
  oauth: GoogleOAuthConfig,
  requestHost: string | undefined,
): string | null {
  if (oauth.redirectUris.length === 0) return null;
  if (requestHost) {
    const match = oauth.redirectUris.find((uri) => {
      try {
        return new URL(uri).host === requestHost;
      } catch {
        return false;
      }
    });
    if (match) return match;
  }
  return oauth.redirectUris[0] ?? null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const json = Buffer.from(payload, "base64url").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// Exchange the authorization code for tokens, then read the publisher's identity
// from the id_token. The id_token comes straight from Google's token endpoint over
// TLS, so its claims are read directly (no separate userinfo round-trip).
export async function exchangeCodeForProfile(
  oauth: GoogleOAuthConfig,
  code: string,
  redirectUri: string,
  fetchImpl: FetchLike = fetch,
): Promise<GoogleProfile> {
  const body = new URLSearchParams({
    code,
    client_id: oauth.clientId,
    client_secret: oauth.clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const response = await fetchImpl(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!response.ok) {
    throw new Error(`GOOGLE_TOKEN_FAILED:${response.status}`);
  }
  const data = (await response.json()) as { id_token?: string };
  const claims = data.id_token ? decodeJwtPayload(data.id_token) : null;
  const sub = typeof claims?.sub === "string" ? claims.sub : null;
  if (!sub) {
    throw new Error("GOOGLE_NO_IDENTITY");
  }
  const email = typeof claims?.email === "string" ? claims.email : "";
  const name =
    typeof claims?.name === "string" && claims.name.trim()
      ? claims.name
      : email || "Publisher";
  return { sub, email, name };
}

// ── OAuth state (CSRF), bound to the Owner who started the flow ───────────────
export function createOAuthState(
  database: DatabaseHandle,
  ownerId: string,
  redirectUri: string,
): string {
  const state = randomBytes(24).toString("base64url");
  database.sqlite
    .prepare(
      "INSERT INTO google_oauth_states (state, owner_id, redirect_uri) VALUES (?, ?, ?)",
    )
    .run(state, ownerId, redirectUri);
  return state;
}

export interface OAuthStateRow {
  ownerId: string;
  redirectUri: string;
}

// Consume a state (single-use, 10-minute window). Returns null if unknown/expired.
export function takeOAuthState(
  database: DatabaseHandle,
  state: string,
): OAuthStateRow | null {
  const row = database.sqlite
    .prepare(
      `SELECT owner_id, redirect_uri FROM google_oauth_states
       WHERE state = ? AND created_at > datetime('now', '-10 minutes')`,
    )
    .get(state) as { owner_id: string; redirect_uri: string } | undefined;
  database.sqlite
    .prepare("DELETE FROM google_oauth_states WHERE state = ?")
    .run(state);
  return row ? { ownerId: row.owner_id, redirectUri: row.redirect_uri } : null;
}

// Link (or refresh) the Google identity for this Owner, keyed by the stable
// Google subject id.
export function linkPublisherIdentity(
  database: DatabaseHandle,
  ownerId: string,
  profile: GoogleProfile,
): PublisherIdentityRow {
  const existing = database.sqlite
    .prepare("SELECT * FROM publisher_identities WHERE google_sub = ?")
    .get(profile.sub) as PublisherIdentityRow | undefined;
  if (existing) {
    database.sqlite
      .prepare(
        `UPDATE publisher_identities
         SET email = ?, name = ?, owner_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE google_sub = ?`,
      )
      .run(profile.email, profile.name, ownerId, profile.sub);
    return database.sqlite
      .prepare("SELECT * FROM publisher_identities WHERE google_sub = ?")
      .get(profile.sub) as unknown as PublisherIdentityRow;
  }
  const id = randomUUID();
  database.sqlite
    .prepare(
      `INSERT INTO publisher_identities (id, owner_id, google_sub, email, name)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(id, ownerId, profile.sub, profile.email, profile.name);
  return database.sqlite
    .prepare("SELECT * FROM publisher_identities WHERE id = ?")
    .get(id) as unknown as PublisherIdentityRow;
}

export function getPublisherIdentity(
  database: DatabaseHandle,
  ownerId: string,
): PublisherIdentityRow | null {
  const row = database.sqlite
    .prepare(
      `SELECT * FROM publisher_identities
       WHERE owner_id = ? ORDER BY updated_at DESC LIMIT 1`,
    )
    .get(ownerId) as PublisherIdentityRow | undefined;
  return row ?? null;
}
