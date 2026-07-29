// In-app Claude subscription sign-in ("帮用户搞定,点一下弹出网页", Oskar
// 2026-07-29): a standard OAuth authorization-code + PKCE exchange against
// the SAME endpoints, client id, redirect and scope the official CLI's
// `setup-token` uses (endpoints read out of the bundled claude binary,
// 2026-07-29). Driving the CLI's terminal UI under a pty was tried first and
// proved unreliable — the TUI swallowed programmatic input — so the server
// speaks the protocol directly:
//
//   start → generate verifier/state, return the authorize URL (the Owner
//   opens it on ANY device; claude.com shows a code after sign-in)
//   code  → exchange code+verifier at the token endpoint, store the tokens
//
// The stored access token feeds the Agent SDK via CLAUDE_CODE_OAUTH_TOKEN;
// the refresh token lets the channel renew itself without a new sign-in.
// Tokens live only in the local secrets file and never reach the browser.
import { createHash, randomBytes } from "node:crypto";

import {
  readProviderConnections,
  writeProviderConnections,
} from "./connections.js";

// Claude Code's PUBLIC OAuth client id (it is in every sign-in URL the CLI
// prints); nothing secret about it.
const CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const AUTHORIZE_URL = "https://claude.com/cai/oauth/authorize";
const TOKEN_URL = "https://platform.claude.com/v1/oauth/token";
const REDIRECT_URI = "https://platform.claude.com/oauth/code/callback";
const SCOPE = "user:inference";

function base64url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

let pending: { verifier: string; state: string } | null = null;

export function cancelClaudeLogin(): void {
  pending = null;
}

export function startClaudeLogin(): { url: string } {
  const verifier = base64url(randomBytes(48));
  const state = base64url(randomBytes(24));
  pending = { verifier, state };
  const url = `${AUTHORIZE_URL}?${new URLSearchParams({
    code: "true",
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: SCOPE,
    code_challenge: base64url(
      createHash("sha256").update(verifier).digest(),
    ),
    code_challenge_method: "S256",
    state,
  }).toString()}`;
  return { url };
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}

// The callback page shows the code as `code#state`; accept either the full
// string or just the code half.
export async function submitClaudeLoginCode(
  config: { secretsDirectory: string },
  raw: string,
): Promise<void> {
  const active = pending;
  if (!active) throw new Error("CLAUDE_LOGIN_NOT_STARTED");
  const trimmed = raw.trim();
  const [codePart, statePart] = trimmed.split("#");
  if (!codePart) throw new Error("CLAUDE_LOGIN_EMPTY_CODE");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code: codePart,
      state: statePart ?? active.state,
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code_verifier: active.verifier,
    }),
  });
  if (!response.ok) {
    throw new Error(`CLAUDE_LOGIN_EXCHANGE_${response.status}`);
  }
  const data = (await response.json()) as TokenResponse;
  if (!data.access_token) throw new Error("CLAUDE_LOGIN_NO_TOKEN");
  pending = null;

  const connections = readProviderConnections(config.secretsDirectory);
  connections["claude-sub"] = {
    ...connections["claude-sub"],
    apiKey: data.access_token,
    ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
    ...(data.expires_in
      ? {
          expiresAt: new Date(
            Date.now() + data.expires_in * 1000,
          ).toISOString(),
        }
      : {}),
  };
  writeProviderConnections(config.secretsDirectory, connections);
}

// A valid access token for the subscription channel, refreshing through the
// refresh token when the stored one is (nearly) expired. Returns null when
// the channel is not connected.
export async function freshClaudeToken(
  secretsDirectory: string,
): Promise<string | null> {
  const connections = readProviderConnections(secretsDirectory);
  const entry = connections["claude-sub"];
  if (!entry?.apiKey) return null;

  const expiresAt = entry.expiresAt ? Date.parse(entry.expiresAt) : null;
  const nearExpiry =
    expiresAt !== null && expiresAt - Date.now() < 5 * 60_000;
  if (!nearExpiry || !entry.refreshToken) return entry.apiKey;

  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: entry.refreshToken,
        client_id: CLIENT_ID,
      }),
    });
    if (!response.ok) return entry.apiKey;
    const data = (await response.json()) as TokenResponse;
    if (!data.access_token) return entry.apiKey;
    connections["claude-sub"] = {
      ...entry,
      apiKey: data.access_token,
      ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
      ...(data.expires_in
        ? {
            expiresAt: new Date(
              Date.now() + data.expires_in * 1000,
            ).toISOString(),
          }
        : {}),
    };
    writeProviderConnections(secretsDirectory, connections);
    return data.access_token;
  } catch {
    // Network hiccup: try the stored token; a real expiry surfaces as a
    // clear provider error on the call itself.
    return entry.apiKey;
  }
}
