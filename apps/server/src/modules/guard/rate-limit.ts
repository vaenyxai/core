import type { FastifyRequest } from "fastify";

// Lightweight in-memory login throttle. Vaenyx is a single-owner system on one
// machine, so an in-process Map is enough: it resets on restart, which is
// acceptable for a brute-force speed bump. Keyed by the real client (the
// forwarded IP when behind Tailscale Funnel / Cloudflare, else the socket IP)
// so a remote attacker is throttled without locking out the local owner.

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;

interface AttemptRecord {
  count: number;
  firstAt: number;
  blockedUntil: number;
}

const attempts = new Map<string, AttemptRecord>();

export function loginClientKey(request: FastifyRequest): string {
  const forwardedFor = request.headers["x-forwarded-for"];
  const raw = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;

  if (raw) {
    const first = raw.split(",")[0]?.trim();

    if (first) {
      return first;
    }
  }

  return request.ip || "unknown";
}

// Returns remaining lockout in seconds, or 0 if the key may attempt a login.
export function loginBlockedSeconds(key: string, now: number = Date.now()): number {
  const record = attempts.get(key);

  if (record && record.blockedUntil > now) {
    return Math.ceil((record.blockedUntil - now) / 1000);
  }

  return 0;
}

export function recordLoginFailure(key: string, now: number = Date.now()): void {
  const record = attempts.get(key);

  if (!record || now - record.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now, blockedUntil: 0 });
    return;
  }

  record.count += 1;

  if (record.count >= MAX_ATTEMPTS) {
    record.blockedUntil = now + BLOCK_MS;
  }
}

export function recordLoginSuccess(key: string): void {
  attempts.delete(key);
}

// Exposed for tests so they can reset the shared module state.
export function resetLoginThrottle(): void {
  attempts.clear();
}
