import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

import type { FastifyReply, FastifyRequest } from "fastify";

import type { DatabaseHandle } from "../../db/database.js";

const SESSION_COOKIE = "vaenyx_session";
const SESSION_DAYS = 365;
// Renew at most once a day: only when the stored expiry has fallen more than
// one day behind a fresh full-length expiry.
const SESSION_RENEW_THRESHOLD_MS = (SESSION_DAYS - 1) * 24 * 60 * 60 * 1000;

function sessionExpiry(): string {
  return new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
}

export interface AuthenticatedOwner {
  id: string;
  name: string;
  // Custom Mode (M2): the mode this SESSION is currently switched into;
  // null = User Mode. Read from owner_sessions on every request so the
  // sandbox is enforced server-side.
  modeId: string | null;
}

interface OwnerRow {
  id: string;
  name: string;
  password_hash: string;
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function parseCookie(request: FastifyRequest): string | undefined {
  const cookieHeader = request.headers.cookie;

  if (!cookieHeader) {
    return undefined;
  }

  for (const pair of cookieHeader.split(";")) {
    const [name, ...valueParts] = pair.trim().split("=");

    if (name === SESSION_COOKIE) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return undefined;
}

// The session cookie should be marked Secure whenever the browser reached
// Vaenyx over HTTPS (Tailscale Funnel / Cloudflare terminate TLS and forward
// x-forwarded-proto). It must NOT be Secure for a direct http://localhost
// connection, or the local browser would silently drop the cookie.
export function isSecureRequest(request: FastifyRequest): boolean {
  const forwardedProto = request.headers["x-forwarded-proto"];
  const proto = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto;

  if (proto) {
    return proto.split(",")[0]?.trim().toLowerCase() === "https";
  }

  return request.protocol === "https";
}

// True only for a direct loopback connection with no reverse proxy in front.
// Tailscale Funnel and Cloudflare always add at least one forwarding header,
// so this is how Vaenyx tells "the owner at this machine" from "someone on the
// public internet" even though both arrive at 127.0.0.1.
export function isLocalDirectRequest(request: FastifyRequest): boolean {
  const headers = request.headers;
  const forwarded =
    headers["x-forwarded-for"] ||
    headers["x-forwarded-host"] ||
    headers["x-forwarded-proto"] ||
    headers["forwarded"] ||
    headers["cf-connecting-ip"] ||
    headers["cf-ray"];

  if (forwarded) {
    return false;
  }

  const ip = request.ip;

  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
}

function sessionCookie(
  token: string,
  maxAge: number,
  secure: boolean,
): string {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${maxAge}`,
  ];

  if (secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function ownerExists(database: DatabaseHandle): boolean {
  return Boolean(database.sqlite.prepare("SELECT id FROM owners LIMIT 1").get());
}

export function getOwner(database: DatabaseHandle): AuthenticatedOwner | null {
  const row = database.sqlite
    .prepare("SELECT id, name, NULL AS modeId FROM owners LIMIT 1")
    .get() as AuthenticatedOwner | undefined;

  return row ?? null;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, expectedHex] = stored.split(":");

  if (!salt || !expectedHex) {
    return false;
  }

  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createOwner(
  database: DatabaseHandle,
  name: string,
  password: string,
): AuthenticatedOwner {
  const owner = {
    id: randomUUID(),
    name: name.trim(),
    modeId: null,
  };

  database.sqlite
    .prepare(
      "INSERT INTO owners (id, name, password_hash) VALUES (?, ?, ?)",
    )
    .run(owner.id, owner.name, hashPassword(password));

  return owner;
}

export function findOwnerByPassword(
  database: DatabaseHandle,
  password: string,
): AuthenticatedOwner | null {
  const row = database.sqlite
    .prepare("SELECT id, name, password_hash FROM owners LIMIT 1")
    .get() as OwnerRow | undefined;

  if (!row || !verifyPassword(password, row.password_hash)) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    modeId: null,
  };
}

export function createSession(
  database: DatabaseHandle,
  ownerId: string,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  const token = randomBytes(32).toString("base64url");

  database.sqlite
    .prepare(
      "INSERT INTO owner_sessions (token_hash, owner_id, expires_at) VALUES (?, ?, ?)",
    )
    .run(hashSessionToken(token), ownerId, sessionExpiry());

  reply.header(
    "set-cookie",
    sessionCookie(token, SESSION_DAYS * 24 * 60 * 60, isSecureRequest(request)),
  );
}

export function clearSession(
  database: DatabaseHandle,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  const token = parseCookie(request);

  if (token) {
    database.sqlite
      .prepare("DELETE FROM owner_sessions WHERE token_hash = ?")
      .run(hashSessionToken(token));
  }

  reply.header("set-cookie", sessionCookie("", 0, isSecureRequest(request)));
}

export function authenticateOwner(
  database: DatabaseHandle,
  request: FastifyRequest,
): AuthenticatedOwner | null {
  const token = parseCookie(request);

  if (!token) {
    return null;
  }

  const owner = database.sqlite
    .prepare(
      `SELECT owners.id, owners.name, owner_sessions.mode_id AS modeId
       FROM owner_sessions
       JOIN owners ON owners.id = owner_sessions.owner_id
       WHERE owner_sessions.token_hash = ?
         AND owner_sessions.expires_at > ?`,
    )
    .get(hashSessionToken(token), new Date().toISOString()) as
    | AuthenticatedOwner
    | undefined;

  return owner ?? null;
}

// Point this session at a Custom Mode (or back to User Mode with null).
// The caller has already verified any PIN/password gate.
export function setSessionMode(
  database: DatabaseHandle,
  request: FastifyRequest,
  modeId: string | null,
): boolean {
  const token = parseCookie(request);
  if (!token) {
    return false;
  }
  const result = database.sqlite
    .prepare("UPDATE owner_sessions SET mode_id = ? WHERE token_hash = ?")
    .run(modeId, hashSessionToken(token));
  return result.changes > 0;
}

export function renewSessionOnUse(
  database: DatabaseHandle,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  const token = parseCookie(request);

  if (!token) {
    return;
  }

  // Rolling renewal: any use of a still-valid session pushes the expiry back
  // out to a full session length. The lower bound keeps expired sessions
  // dead; the upper bound makes the write fire at most about once a day.
  const now = Date.now();
  const renewed = database.sqlite
    .prepare(
      "UPDATE owner_sessions SET expires_at = ? WHERE token_hash = ? AND expires_at > ? AND expires_at < ?",
    )
    .run(
      sessionExpiry(),
      hashSessionToken(token),
      new Date(now).toISOString(),
      new Date(now + SESSION_RENEW_THRESHOLD_MS).toISOString(),
    );

  if (renewed.changes > 0) {
    // The browser cookie must move with the database row, or it would expire
    // a fixed 365 days after the last explicit login despite daily use.
    reply.header(
      "set-cookie",
      sessionCookie(
        token,
        SESSION_DAYS * 24 * 60 * 60,
        isSecureRequest(request),
      ),
    );
  }
}

// Invalidate every session for the owner ("log out all devices"). The caller
// can then mint a fresh session for the current device if desired.
export function deleteAllSessions(
  database: DatabaseHandle,
  ownerId: string,
): number {
  const result = database.sqlite
    .prepare("DELETE FROM owner_sessions WHERE owner_id = ?")
    .run(ownerId);

  return Number(result.changes);
}

export function setOwnerPassword(
  database: DatabaseHandle,
  ownerId: string,
  newPassword: string,
): void {
  database.sqlite
    .prepare("UPDATE owners SET password_hash = ? WHERE id = ?")
    .run(hashPassword(newPassword), ownerId);
}
