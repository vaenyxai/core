import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type {
  RelayConnectStart,
  RelayConnectExchange,
  RelayConnectRequestView,
} from "@vaenyx/contracts";

export class RelayConnectError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number = 400,
  ) {
    super(code);
  }
}
const refuse = (code: string, status = 400): never => {
  throw new RelayConnectError("RELAY_CONNECT_" + code, status);
};
const digest = (text: string) =>
  createHash("sha256").update(text).digest("base64url");
const equal = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export function validConnectTarget(origin: string, returnUri: string): boolean {
  try {
    const source = new URL(origin),
      target = new URL(returnUri);
    return (
      source.protocol === "https:" &&
      source.origin === origin &&
      target.origin === origin &&
      target.href === returnUri &&
      !target.username &&
      !target.password &&
      !target.search &&
      !target.hash &&
      !Array.from(returnUri).some(character => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127)
    );
  } catch {
    return false;
  }
}
export interface ConnectProfile {
  id: string;
  name: string;
  version: number;
  enabled: boolean;
  kind: string;
}
interface Pending {
  input: RelayConnectStart;
  id: string;
  expires: number;
  status: "pending" | "approved" | "denied";
}
interface Grant {
  request: Pending;
  profile: ConnectProfile;
  expires: number;
  failures: number;
}

// Ephemeral handover only. Restart loses outstanding requests, never changes an App Key.
// No model invocation, Owner memory, business content or durable credential store here.
export function createRelayConnectStore(options: {
  profile: (id: string) => ConnectProfile | null;
  token: (id: string) => string | null;
  now?: () => number;
}) {
  const now = options.now ?? Date.now;
  const pending = new Map<string, Pending>(),
    grants = new Map<string, Grant>();
  const prune = () => {
    for (const [id, entry] of pending)
      if (entry.expires <= now()) pending.delete(id);
    for (const [id, entry] of grants)
      if (entry.expires <= now()) grants.delete(id);
  };
  const view = (entry: Pending): RelayConnectRequestView => ({
    version: 1,
    request_id: entry.id,
    client_name: entry.input.client_name,
    client_origin: entry.input.client_origin,
    return_uri: entry.input.return_uri,
    expires_at: new Date(entry.expires).toISOString(),
    status: entry.status,
  });
  const find = (id: string) => {
    const entry = pending.get(id);
    if (!entry) return refuse("NOT_FOUND", 404);
    if (entry.expires <= now()) {
      pending.delete(id);
      return refuse("EXPIRED", 410);
    }
    return entry;
  };
  return {
    start(input: RelayConnectStart, origin: string) {
      if (input.client_origin !== origin) return refuse("ORIGIN_MISMATCH", 403);
      if (!validConnectTarget(origin, input.return_uri))
        return refuse("INVALID_REQUEST");
      prune();
      if (
        pending.size >= 128 ||
        [...pending.values()].filter((p) => p.input.client_origin === origin)
          .length >= 8
      )
        return refuse("LIMIT", 429);
      const entry: Pending = {
        input: { ...input },
        id: randomBytes(32).toString("base64url"),
        expires: now() + 300_000,
        status: "pending",
      };
      pending.set(entry.id, entry);
      return {
        version: 1 as const,
        request_id: entry.id,
        expires_at: new Date(entry.expires).toISOString(),
        authorization_path: "/?connect=" + entry.id,
      };
    },
    inspect(id: string) {
      return view(find(id));
    },
    permitsExchangeOrigin(origin: string) {
      return [...grants.values()].some(
        (grant) =>
          grant.expires > now() && grant.request.input.client_origin === origin,
      );
    },
    deny(id: string) {
      const entry = find(id);
      if (entry.status !== "pending") return refuse("NOT_FOUND", 409);
      entry.status = "denied";
      return view(entry);
    },
    approve(id: string, profileId: string) {
      const entry = find(id);
      if (entry.status !== "pending") return refuse("NOT_FOUND", 409);
      const profile = options.profile(profileId);
      if (!profile?.enabled || profile.kind !== "relay")
        return refuse("PROFILE_CHANGED", 409);
      const code = randomBytes(32).toString("base64url");
      entry.status = "approved";
      grants.set(digest(code), {
        request: entry,
        profile: { ...profile },
        expires: now() + 60_000,
        failures: 0,
      });
      return {
        code,
        state: entry.input.state,
        return_uri: entry.input.return_uri,
      };
    },
    exchange(input: RelayConnectExchange, origin: string) {
      const key = digest(input.code),
        grant = grants.get(key);
      if (!grant) return refuse("NOT_FOUND", 404);
      if (grant.expires <= now()) {
        grants.delete(key);
        return refuse("EXPIRED", 410);
      }
      const request = grant.request.input;
      if (
        origin !== request.client_origin ||
        input.client_origin !== origin ||
        input.return_uri !== request.return_uri
      )
        return refuse("ORIGIN_MISMATCH", 403);
      if (!equal(digest(input.code_verifier), request.code_challenge)) {
        if (++grant.failures >= 5) grants.delete(key);
        return refuse("PROOF_INVALID", 403);
      }
      // Check, consume and recover are synchronous: concurrent exchanges cannot both win.
      grants.delete(key);
      const profile = options.profile(grant.profile.id);
      if (
        !profile?.enabled ||
        profile.kind !== "relay" ||
        profile.version !== grant.profile.version
      )
        return refuse("PROFILE_CHANGED", 409);
      let token: string | null;
      try {
        token = options.token(profile.id);
      } catch {
        return refuse("TOKEN_UNAVAILABLE", 409);
      }
      if (!token) return refuse("TOKEN_UNAVAILABLE", 409);
      return {
        version: 1 as const,
        token,
        profile_id: profile.id,
        profile_name: profile.name,
        key_version: profile.version,
      };
    },
    clear() {
      pending.clear();
      grants.clear();
    },
  };
}
