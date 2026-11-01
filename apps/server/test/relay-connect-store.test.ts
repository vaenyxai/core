import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createRelayConnectStore,
  validConnectTarget,
} from "../src/modules/core/relay-connect.js";
const verifier = "v".repeat(43),
  origin = "https://app.example",
  uri = origin + "/connect/return";
const input = {
  version: 1 as const,
  client_name: "Example App",
  client_origin: origin,
  return_uri: uri,
  state: "s".repeat(43),
  code_challenge: createHash("sha256").update(verifier).digest("base64url"),
  code_challenge_method: "S256" as const,
};
function fixture() {
  let now = 1_800_000_000_000,
    recovered = 0;
  const profile = {
    id: "app-one",
    name: "Existing App",
    version: 1,
    enabled: true,
    kind: "relay",
  };
  const store = createRelayConnectStore({
    now: () => now,
    profile: (id) => (id === profile.id ? profile : null),
    token: () => {
      recovered++;
      return "synthetic-key";
    },
  });
  const start = () => store.start(input, origin).request_id;
  const approve = () => store.approve(start(), profile.id).code;
  const exchange = (code: string, extra = {}) =>
    store.exchange(
      {
        version: 1,
        code,
        code_verifier: verifier,
        client_origin: origin,
        return_uri: uri,
        ...extra,
      },
      origin,
    );
  return {
    store,
    start,
    approve,
    exchange,
    profile,
    advance: (ms: number) => {
      now += ms;
    },
    recovered: () => recovered,
  };
}
describe("Owner-confirmed relay handover", () => {
  it("does not permit an origin or disclose a key before explicit approval", () => {
    const f = fixture(),
      id = f.start();
    expect(f.store.permitsExchangeOrigin(origin)).toBe(false);
    expect(f.store.inspect(id)).not.toHaveProperty("state");
    expect(f.recovered()).toBe(0);
    const grant = f.store.approve(id, f.profile.id);
    expect(f.store.permitsExchangeOrigin(origin)).toBe(true);
    expect(f.store.permitsExchangeOrigin(origin + ".evil.test")).toBe(false);
    expect(f.recovered()).toBe(0);
    expect(f.exchange(grant.code)).toMatchObject({
      token: "synthetic-key",
      profile_id: f.profile.id,
      key_version: 1,
    });
    expect(f.recovered()).toBe(1);
    expect(f.store.permitsExchangeOrigin(origin)).toBe(false);
    expect(() => f.exchange(grant.code)).toThrow("RELAY_CONNECT_NOT_FOUND");
  });
  it("binds exact origin, destination and S256 proof, with a bounded proof failure count", () => {
    const f = fixture(),
      code = f.approve();
    expect(() => f.exchange(code, { return_uri: origin + "/other" })).toThrow(
      "ORIGIN_MISMATCH",
    );
    expect(() =>
      f.exchange(code, { client_origin: "https://other.example" }),
    ).toThrow("ORIGIN_MISMATCH");
    for (let i = 0; i < 5; i++)
      expect(() => f.exchange(code, { code_verifier: "x".repeat(43) })).toThrow(
        "PROOF_INVALID",
      );
    expect(() => f.exchange(code)).toThrow("NOT_FOUND");
    expect(f.recovered()).toBe(0);
  });
  it("expires requests and codes, refuses denied/reapproved requests and clears on restart", () => {
    const f = fixture(),
      id = f.start();
    f.advance(300_000);
    expect(() => f.store.inspect(id)).toThrow("EXPIRED");
    const denied = f.start();
    f.store.deny(denied);
    expect(() => f.store.approve(denied, f.profile.id)).toThrow("NOT_FOUND");
    const another = f.start();
    f.store.approve(another, f.profile.id);
    expect(() => f.store.approve(another, f.profile.id)).toThrow("NOT_FOUND");
    const code = f.approve();
    f.advance(60_000);
    expect(f.store.permitsExchangeOrigin(origin)).toBe(false);
    expect(() => f.exchange(code)).toThrow("EXPIRED");
    const next = f.approve();
    f.store.clear();
    expect(() => f.exchange(next)).toThrow("NOT_FOUND");
  });
  it.each(["disabled", "rotated", "wrong-kind"])(
    "refuses %s profiles without recovering a credential",
    (mode) => {
      const f = fixture(),
        code = f.approve();
      if (mode === "disabled") f.profile.enabled = false;
      else if (mode === "rotated") f.profile.version++;
      else f.profile.kind = "method";
      expect(() => f.exchange(code)).toThrow("PROFILE_CHANGED");
      expect(f.recovered()).toBe(0);
    },
  );
  it("rejects unknown profiles and bounds pending requests", () => {
    const f = fixture();
    expect(() => f.store.approve(f.start(), "different-app")).toThrow(
      "PROFILE_CHANGED",
    );
    for (let i = 0; i < 7; i++) f.start();
    expect(() => f.start()).toThrow("LIMIT");
    f.advance(300_000);
    expect(f.start()).toBeTruthy();
  });
  it.each([
    "http://app.example/return",
    "https://app.example.evil.test/return",
    "https://user@app.example/return",
    uri + "?code=x",
    uri + "#x",
  ])("rejects unsafe return target %s", (target) => {
    expect(validConnectTarget(origin, target)).toBe(false);
  });
});
