// The capability vocabulary and the manifest reader. The rule that earns its
// own test is the one that reads backwards: an unknown name in a manifest
// REFUSES the run, where the same unknown name in routine.json is silently
// dropped. Dropping it here would let an old client run a Method without a
// capability it needed and look fine, which is the bug nobody ever finds.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  CAPABILITIES,
  backendCannotMessage,
  CAPABILITY_DEFAULT_ON,
  capabilityRefusedBy,
  chargeToken,
  decideCapabilities,
  decideTokenCapabilities,
  readModeCapabilities,
  readProfileCapabilities,
  readTokenSpend,
  tokenGrantable,
  tokenGrantRefusedMessage,
  writeProfileCapabilities,
  listCapabilityWaiting,
  missingCapabilities,
  noticeArrivedCapabilities,
  readMethodManifest,
  recordCapabilityWanted,
  refusedCapabilityMessage,
  undeclaredCapabilityMessage,
  writeGlobalCapabilities,
  writeModeCapabilities,
} from "../src/modules/core/capabilities.js";
import { createDatabase, type DatabaseHandle } from "../src/db/database.js";

const directories: string[] = [];
const databases: DatabaseHandle[] = [];

function createTestDatabase(): DatabaseHandle {
  const dataDirectory = mkdtempSync(resolve(tmpdir(), "vaenyx-capdb-test-"));
  directories.push(dataDirectory);
  const database = createDatabase({
    dataDirectory,
    databasePath: join(dataDirectory, "vaenyx.db"),
    backupsDirectory: join(dataDirectory, "backups"),
    migrationsDirectory: resolve("migrations"),
  } as Parameters<typeof createDatabase>[0]);
  databases.push(database);
  return database;
}

// An app key with no Methods on it: this file is about what a key may DO, and
// nothing here needs the Methods it may call.
function makeAppKey(database: DatabaseHandle, id: string): void {
  database.sqlite
    .prepare(
      "INSERT INTO app_profiles (id, name, token_hash, token_prefix) VALUES (?, ?, ?, ?)",
    )
    .run(id, `Key ${id}`, `hash-${id}`, "vaenyx_app_");
}

function methodFolder(manifest: unknown | null): string {
  const directory = mkdtempSync(resolve(tmpdir(), "vaenyx-cap-test-"));
  directories.push(directory);
  if (manifest !== null) {
    writeFileSync(
      join(directory, "manifest.json"),
      typeof manifest === "string" ? manifest : JSON.stringify(manifest),
      "utf8",
    );
  }
  return directory;
}

afterEach(() => {
  for (const database of databases.splice(0)) {
    try {
      database.close();
    } catch {
      // Already closed.
    }
  }
  for (const directory of directories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("capabilities", () => {
  it("is a closed vocabulary of seven", () => {
    expect([...CAPABILITIES]).toEqual([
      "hearing",
      "speaking",
      "vision",
      "drawing",
      "reading",
      "fetching",
      "web",
    ]);
  });

  it("starts on for everything but reaching into the Owner's own folders", () => {
    // No default may switch off a feature the manual describes as working, and
    // that now includes looking things up: a model that cannot check answers
    // today's question from what it memorised, and sounds equally certain
    // either way. The one thing left off is Vaenyx opening the Owner's own
    // files, which has to be a decision somebody made.
    expect(CAPABILITY_DEFAULT_ON.vision).toBe(true);
    expect(CAPABILITY_DEFAULT_ON["hearing"]).toBe(true);
    expect(CAPABILITY_DEFAULT_ON["speaking"]).toBe(true);
    expect(CAPABILITY_DEFAULT_ON.reading).toBe(true);
    expect(CAPABILITY_DEFAULT_ON.drawing).toBe(true);
    expect(CAPABILITY_DEFAULT_ON.web).toBe(true);
    expect(CAPABILITY_DEFAULT_ON.fetching).toBe(false);
  });

  it("reads a named list", () => {
    const directory = methodFolder({ capabilities: ["vision", "reading"] });
    expect(readMethodManifest(directory)).toEqual({
      capabilities: ["vision", "reading"],
      minimumVersion: null,
    });
  });

  it("REFUSES an unknown capability instead of dropping it", () => {
    const directory = methodFolder({ capabilities: ["vision", "telepathy"] });
    expect(() => readMethodManifest(directory)).toThrow(
      "MANIFEST_UNKNOWN_CAPABILITY:telepathy",
    );
  });

  it("migrates the two old booleans without touching the disk", () => {
    const old = methodFolder({
      permissions: { network: true, readFiles: false },
      learning: { enabled: false, captures: [] },
    });
    expect(readMethodManifest(old).capabilities).toEqual(["web"]);

    const both = methodFolder({
      permissions: { network: true, readFiles: true },
    });
    expect(readMethodManifest(both).capabilities).toEqual(["web", "fetching"]);

    // The shape every Method on disk carries today: both false, so nothing.
    const shipped = methodFolder({
      permissions: { network: false, readFiles: false },
      learning: { enabled: false, captures: [] },
    });
    expect(readMethodManifest(shipped).capabilities).toEqual([]);
  });

  it("treats a missing manifest as no capabilities, but an unreadable one as a refusal", () => {
    expect(readMethodManifest(methodFolder(null)).capabilities).toEqual([]);
    expect(() => readMethodManifest(methodFolder("{ not json"))).toThrow(
      "MANIFEST_UNREADABLE",
    );
  });

  it("lets a lower layer narrow, never widen", () => {
    const database = createTestDatabase();
    // A Method may only ever narrow. Web ships on, so switch it off first and
    // a Method declaring it is refused; the rest of its list still runs.
    // Original note: the web is off globally. A Method declaring it is refused, and the
    // reason says which layer refused it.
    writeGlobalCapabilities(database, { web: false });
    const shut = decideCapabilities(database, ["web", "vision"], null);
    expect(shut.allowed).toEqual(["vision"]);
    expect(shut.refused).toEqual([{ capability: "web", reason: "global" }]);

    writeGlobalCapabilities(database, { web: true });
    expect(decideCapabilities(database, ["web"], null).allowed).toEqual(["web"]);

    // A mode may take it away again...
    const modeId = "m1";
    database.sqlite
      .prepare("INSERT INTO modes (id, name, capabilities) VALUES (?, ?, ?)")
      .run(modeId, "Guest", JSON.stringify(["vision"]));
    const inMode = decideCapabilities(database, ["web", "vision"], modeId);
    expect(inMode.allowed).toEqual(["vision"]);
    expect(inMode.refused).toEqual([{ capability: "web", reason: "mode" }]);

    // ...but never give back what the ceiling denies.
    writeGlobalCapabilities(database, { web: false });
    database.sqlite
      .prepare("UPDATE modes SET capabilities = ? WHERE id = ?")
      .run(JSON.stringify(["web", "vision"]), modeId);
    const widened = decideCapabilities(database, ["web"], modeId);
    expect(widened.allowed).toEqual([]);
    expect(widened.refused).toEqual([{ capability: "web", reason: "global" }]);
  });

  it("writes a mode's list as a narrowing, and refuses to write one above the ceiling", () => {
    const database = createTestDatabase();
    const modeId = "m-write";
    database.sqlite
      .prepare("INSERT INTO modes (id, name) VALUES (?, ?)")
      .run(modeId, "Guest");

    // Nothing stored yet: the mode adds no restriction of its own, which is
    // what every mode made before this screen existed still says.
    expect(readModeCapabilities(database, modeId)).toBeNull();

    // The first switch the Owner touches turns the mode explicit — and the
    // change set is a DELTA, so what it did not mention stays.
    const narrowed = writeModeCapabilities(database, modeId, { drawing: false });
    expect(narrowed).not.toContain("drawing");
    expect(narrowed).toContain("vision");
    expect(decideCapabilities(database, ["drawing"], modeId).refused).toEqual([
      { capability: "drawing", reason: "mode" },
    ]);

    // Narrowing is STICKY. The implicit "everything" a fresh mode starts from
    // is everything the CEILING allows, so `fetching` — which ships off — is
    // never written down by a write about something else. Without that, the
    // mode would be handed it by itself the day the global switch moved.
    expect(narrowed).not.toContain("fetching");
    writeGlobalCapabilities(database, { fetching: true });
    expect(decideCapabilities(database, ["fetching"], modeId).refused).toEqual([
      { capability: "fetching", reason: "mode" },
    ]);
    writeGlobalCapabilities(database, { fetching: false });

    // 🔴 A mode may only ever narrow. `fetching` ships off, so switching it on
    // for a mode is a widening — refused rather than stored, because a tick
    // that means nothing today would come alive by itself the day the global
    // switch moved.
    expect(() =>
      writeModeCapabilities(database, modeId, { fetching: true }),
    ).toThrow("MODE_ABOVE_CEILING:fetching");
    expect(readModeCapabilities(database, modeId)).not.toContain("fetching");

    // Switching something OFF is always allowed, whatever the ceiling says.
    expect(
      writeModeCapabilities(database, modeId, { fetching: false }),
    ).not.toContain("fetching");
  });

  it("names the mode layer rather than blaming the global switch", () => {
    const database = createTestDatabase();
    const modeId = "m-reason";
    database.sqlite
      .prepare("INSERT INTO modes (id, name) VALUES (?, ?)")
      .run(modeId, "Guest");
    writeModeCapabilities(database, modeId, { web: false });

    // Web is on globally and off for this mode: the answer must say so. A
    // refusal that blamed the global switch would send somebody who cannot
    // reach Settings off to look for a switch that is already on.
    expect(capabilityRefusedBy(database, "web", modeId)).toBe("mode");
    expect(capabilityRefusedBy(database, "web", null)).toBeNull();
    const message = refusedCapabilityMessage("web", "mode");
    expect(message).toContain("mode you are in");
    expect(message).not.toContain("Settings");

    // And the ceiling still wins when both would refuse: the layer the Owner
    // has to fix FIRST is the one named.
    writeGlobalCapabilities(database, { web: false });
    expect(capabilityRefusedBy(database, "web", modeId)).toBe("global");
  });

  it("records only what does not EXIST, and notices when it arrives", () => {
    const database = createTestDatabase();
    // `fetching` has a word and a chip and no implementation; `web` has all three.
    expect(missingCapabilities(["web", "fetching", "vision"])).toEqual(["fetching"]);

    recordCapabilityWanted(database, ["fetching", "web"]);
    recordCapabilityWanted(database, ["fetching"]);
    const waiting = listCapabilityWaiting(database);
    // `web` exists — wanting it is not waiting for anything to be built, and
    // counting it would poison the priority signal.
    expect(waiting.map((row) => row.capability)).toEqual(["fetching"]);
    expect(waiting[0]?.timesWanted).toBe(2);
    expect(waiting[0]?.arrived).toBe(false);

    // Nothing has arrived while the kernel still lacks it.
    expect(noticeArrivedCapabilities(database)).toEqual([]);
  });

  // Copy pack N4. The wording is shared so it cannot drift; these hold the three
  // things it exists to carry, one assertion each, so a rewrite that quietly
  // drops the stand-in still fails.
  it("names the backend, the stand-in and what the stand-in costs", () => {
    const alone = backendCannotMessage("Gemini", "vision", null);
    expect(alone).toContain("Gemini");
    expect(alone).toContain("look at pictures");
    expect(alone).toContain("nothing was put in its place");

    const stoodIn = backendCannotMessage("Gemini", "reading", {
      by: "this machine (pdf.js)",
      cost: "drawings, tables and layout do not reach the model",
    });
    expect(stoodIn).toContain("this machine (pdf.js) did it instead");
    expect(stoodIn).toContain(
      "drawings, tables and layout do not reach the model",
    );
    // A stand-in is never allowed to look like the real thing succeeding.
    expect(stoodIn).not.toBe(backendCannotMessage("Gemini", "reading", null));
  });

  it("blames Vaenyx for the gap, never the backend, and says it in both languages", () => {
    // "Vaenyx cannot X with Y", not "Y cannot X": web search is missing for
    // most backends because Vaenyx has not wired it up, not because the model
    // is incapable — and a sentence that blames a third party for our own gap
    // is a claim about them we cannot support.
    const english = backendCannotMessage("Groq", "web", null, "en");
    expect(english.startsWith("Vaenyx cannot use the web with Groq")).toBe(true);

    const chinese = backendCannotMessage("Groq", "web", null, "zh");
    expect(chinese).toContain("Groq");
    expect(chinese).toContain("上网");
    expect(chinese).not.toBe(english);
  });

  it("gives the two refusals two different sentences, and never says unsupported", () => {
    const off = refusedCapabilityMessage("fetching", "global");
    const mode = refusedCapabilityMessage("fetching", "mode");
    expect(off).toContain("switched off");
    expect(off).toContain("Settings");
    expect(mode).toContain("mode you are in");
    expect(off).not.toContain("unsupported");
    expect(mode).not.toContain("unsupported");
    expect(off).not.toBe(mode);
  });

  it("never lets a Token carry files, and only carries what it was granted", () => {
    const database = createTestDatabase();
    writeGlobalCapabilities(database, { web: true, fetching: true, vision: true });

    // Even with files switched on globally, declared by the Method AND ticked
    // on the token, it does not travel. This is a property of the code.
    expect(tokenGrantable(["vision", "fetching", "web"])).toEqual([
      "vision",
      "web",
    ]);
    const decided = decideTokenCapabilities(
      database,
      ["vision", "fetching", "web"],
      ["vision", "fetching", "web"],
    );
    expect(decided.allowed).not.toContain("fetching");
    expect(decided.allowed).toEqual(["vision", "web"]);

    // Declared but not granted to this token: not allowed.
    expect(
      decideTokenCapabilities(database, ["vision", "web"], ["vision"]).allowed,
    ).toEqual(["vision"]);

    // And every refusal SAYS so. Both of these used to drop out silently,
    // which made a call that never looked at the picture indistinguishable
    // from one that looked and answered badly.
    expect(decided.refused).toEqual([
      { capability: "fetching", reason: "never-via-token" },
    ]);
    expect(
      decideTokenCapabilities(database, ["vision", "web"], ["vision"]).refused,
    ).toEqual([{ capability: "web", reason: "token" }]);
  });

  it("gives a key nothing until the Owner ticks something", () => {
    const database = createTestDatabase();
    makeAppKey(database, "k1");

    // Empty column = nothing beyond the recipe, which is what every key issued
    // before this screen existed carries. A key never gains reach because a
    // feature arrived.
    expect(readProfileCapabilities(database, "k1")).toEqual([]);
    expect(
      decideTokenCapabilities(
        database,
        ["vision", "reading"],
        readProfileCapabilities(database, "k1"),
      ).allowed,
    ).toEqual([]);

    // Ticked, and it travels. A change set: `reading` is untouched by a write
    // about `vision`, and stays absent.
    expect(writeProfileCapabilities(database, "k1", { vision: true })).toEqual([
      "vision",
    ]);
    expect(
      decideTokenCapabilities(
        database,
        ["vision", "reading"],
        readProfileCapabilities(database, "k1"),
      ).allowed,
    ).toEqual(["vision"]);
  });

  // 🔴 THE ONE MIGRATION THAT HANDS OUT A CAPABILITY, so it gets its own test.
  // "A key starts at nothing" is right for every gate except the door that was
  // already open: the Subscription Door began consulting this column, and every
  // key on a running instance had never had it written. Left alone, an app of
  // the Owner's that had been sending photos for months would be refused at
  // somebody else's end on the next restart, with nobody here to see it.
  it("seeds keys that predate the grant screen with what the door already served", () => {
    const database = createTestDatabase();
    makeAppKey(database, "before");
    // A key the Owner has already been to and deliberately left empty. That is
    // an answer, and re-running the migration must not talk them out of it.
    makeAppKey(database, "answered");
    writeProfileCapabilities(database, "answered", {});

    database.sqlite.exec(
      readFileSync(
        resolve("migrations", "0056_seed_app_key_capabilities.sql"),
        "utf8",
      ),
    );

    // Exactly what ENGINE_CAPABILITIES in core/relay.ts offers — `vision` on
    // both subscriptions, `reading` on Claude's — and nothing else. A call
    // asking for hearing, speaking or drawing has always died at
    // RELAY_CAPABILITY_UNSUPPORTED before any grant was read, so seeding one
    // would hand out something that never worked.
    expect(readProfileCapabilities(database, "before")).toEqual([
      "vision",
      "reading",
    ]);
    expect(readProfileCapabilities(database, "answered")).toEqual([]);

    // A key made afterwards still starts at nothing: the seed only ever touched
    // rows nobody had written, so a new key cannot inherit it.
    makeAppKey(database, "after");
    expect(readProfileCapabilities(database, "after")).toEqual([]);
  });

  it("refuses to write a grant no key may hold, above the ceiling or unapproved", () => {
    const database = createTestDatabase();
    makeAppKey(database, "k2");

    // 🔴 Two gates for `fetching`, not one. The read already strips it, so this
    // is about the WRITE: a stored grant that is silently ignored is a tick the
    // Owner cannot see and cannot take back.
    writeGlobalCapabilities(database, { fetching: true });
    expect(() =>
      writeProfileCapabilities(database, "k2", { fetching: true }),
    ).toThrow("TOKEN_GRANT_REFUSED:never:fetching");
    expect(readProfileCapabilities(database, "k2")).toEqual([]);

    // Above the ceiling: refused rather than stored, exactly like a mode's.
    // It would show as "off for the whole machine" on the very screen that had
    // just accepted it, and come alive by itself the day the switch moved.
    writeGlobalCapabilities(database, { drawing: false });
    expect(() =>
      writeProfileCapabilities(database, "k2", { drawing: true }),
    ).toThrow("TOKEN_GRANT_REFUSED:ceiling:drawing");

    // `web` needs its own approval, so ticking it alongside the rest is not
    // enough — naming it is.
    expect(() =>
      writeProfileCapabilities(database, "k2", { vision: true, web: true }),
    ).toThrow("TOKEN_GRANT_REFUSED:approval:web");
    expect(
      writeProfileCapabilities(
        database,
        "k2",
        { vision: true, web: true },
        ["web"],
      ),
    ).toEqual(["vision", "web"]);

    // Taking something back never needs an approval or a ceiling.
    expect(
      writeProfileCapabilities(database, "k2", { web: false }),
    ).toEqual(["vision"]);
  });

  it("keeps the global switch above a key that was granted the capability", () => {
    const database = createTestDatabase();
    makeAppKey(database, "k3");
    writeProfileCapabilities(database, "k3", { vision: true });

    // The grant stays on the key — the Owner did tick it — but the ceiling is
    // the ceiling: while the machine says no, the key gets nothing, and the
    // refusal blames the switch rather than the key.
    writeGlobalCapabilities(database, { vision: false });
    const decided = decideTokenCapabilities(
      database,
      ["vision"],
      readProfileCapabilities(database, "k3"),
    );
    expect(decided.allowed).toEqual([]);
    expect(decided.refused).toEqual([
      { capability: "vision", reason: "global" },
    ]);

    // And it comes back when the switch does, because the grant was never lost.
    writeGlobalCapabilities(database, { vision: true });
    expect(
      decideTokenCapabilities(
        database,
        ["vision"],
        readProfileCapabilities(database, "k3"),
      ).allowed,
    ).toEqual(["vision"]);
  });

  it("gives the token refusals their own sentences", () => {
    // "Ask the Owner to tick it" is right for one and a lie for the other:
    // nobody can tick `fetching` onto a key, so pointing an app at a grant
    // that cannot exist is worse than saying nothing.
    const notGranted = refusedCapabilityMessage("vision", "token");
    const never = refusedCapabilityMessage("fetching", "never-via-token");
    expect(notGranted).toContain("was not given");
    expect(never).toContain("no app key can ever");
    expect(notGranted).not.toBe(never);
    expect(tokenGrantRefusedMessage(["fetching"], "never")).toContain(
      "can never",
    );
    expect(tokenGrantRefusedMessage(["drawing"], "ceiling")).toContain(
      "Switch it on in Capabilities",
    );
    expect(tokenGrantRefusedMessage(["web"], "approval", "zh")).toContain(
      "单独",
    );
  });

  it("stops a Token at its ceiling before the work, not after the bill", () => {
    const database = createTestDatabase();
    database.sqlite
      .prepare(
        "INSERT INTO app_profiles (id, name, token_hash, token_prefix, spend_limit_cents) VALUES (?, ?, ?, ?, ?)",
      )
      .run("p1", "Estimating", "hash", "vaenyx_app_", 100);

    expect(chargeToken(database, "p1", 60).allowed).toBe(true);
    expect(readTokenSpend(database, "p1").spentCents).toBe(60);
    // 60 + 60 would pass the ceiling, so it is refused and nothing is charged.
    expect(chargeToken(database, "p1", 60).allowed).toBe(false);
    expect(readTokenSpend(database, "p1").spentCents).toBe(60);
    // Exactly on the ceiling is still allowed.
    expect(chargeToken(database, "p1", 40).allowed).toBe(true);
    expect(readTokenSpend(database, "p1").spentCents).toBe(100);
  });

  it("names the capability when one was reached for but never declared", () => {
    expect(undeclaredCapabilityMessage("web")).toContain("use the web");
    expect(undeclaredCapabilityMessage("web")).toContain("never declared");
  });
});
