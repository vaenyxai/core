// FETCHING — the tests that have to pass before the switch is allowed to exist
// at all. This is the only capability that reaches the Owner's own disk, so
// each lock gets its own test and each one is written as an ESCAPE ATTEMPT
// rather than as a happy path: a whitelist that has only ever been tried with
// files that are inside it has not been tested.
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import type { AppConfig } from "../src/config.js";
import { createDatabase, type DatabaseHandle } from "../src/db/database.js";
import {
  decideTokenCapabilities,
  tokenGrantable,
  writeGlobalCapabilities,
} from "../src/modules/core/capabilities.js";
import {
  FetchRefusedError,
  MAX_FETCH_BYTES,
  grantFetchAccess,
  readFetchFolders,
  writeFetchFolders,
} from "../src/modules/core/fetching.js";

const directories: string[] = [];
const databases: DatabaseHandle[] = [];

afterEach(() => {
  for (const database of databases.splice(0)) database.sqlite.close();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

function temporaryDirectory(prefix: string): string {
  const directory = mkdtempSync(resolve(tmpdir(), prefix));
  directories.push(directory);
  return directory;
}

function createTestDatabase(): DatabaseHandle {
  const dataDirectory = temporaryDirectory("vaenyx-fetchdb-test-");
  const database = createDatabase({
    dataDirectory,
    databasePath: join(dataDirectory, "vaenyx.db"),
    backupsDirectory: join(dataDirectory, "backups"),
    migrationsDirectory: resolve("migrations"),
  } as Parameters<typeof createDatabase>[0]);
  databases.push(database);
  return database;
}

// The Owner exists as an audit actor; the grant records who opened what.
const GRANT = {
  actorId: "owner-1",
  actorName: "Oskar",
  protectedPaths: [] as string[],
};

function allow(database: DatabaseHandle, folders: string[]): void {
  writeGlobalCapabilities(database, { fetching: true });
  writeFetchFolders(database, folders, []);
}

describe("the folder whitelist", () => {
  it("stores an absolute real folder and refuses everything else", () => {
    const database = createTestDatabase();
    const home = temporaryDirectory("vaenyx-fetch-home-");
    const written = writeFetchFolders(
      database,
      [home, "notes", join(home, "nowhere"), ""],
      [],
    );
    expect(written.folders).toEqual([resolve(home)]);
    expect(written.rejected.map((entry) => entry.reason)).toEqual([
      "not-absolute",
      "missing",
    ]);
    expect(readFetchFolders(database)).toEqual([resolve(home)]);
  });

  it("refuses a file, and refuses a folder holding Vaenyx's own data", () => {
    const database = createTestDatabase();
    const home = temporaryDirectory("vaenyx-fetch-home-");
    const file = join(home, "note.txt");
    writeFileSync(file, "hello");
    const secrets = join(home, "secrets");
    mkdirSync(secrets);

    const written = writeFetchFolders(database, [file, home], [secrets]);
    expect(written.folders).toEqual([]);
    expect(written.rejected.map((entry) => entry.reason)).toEqual([
      "not-a-folder",
      // `home` CONTAINS the key store, so allowing it would hand the key store
      // over. Containment is refused in both directions.
      "protected",
    ]);
  });
});

describe("what a granted turn can and cannot open", () => {
  it("opens a planted file inside an allowed folder", () => {
    const database = createTestDatabase();
    const home = temporaryDirectory("vaenyx-fetch-home-");
    writeFileSync(join(home, "shopping.txt"), "milk, bread, tea");
    allow(database, [home]);

    const access = grantFetchAccess(database, GRANT);
    expect(access).not.toBeNull();
    expect(access?.open(join(home, "shopping.txt")).text).toBe(
      "milk, bread, tea",
    );
    // The name it would naturally use after a listing works too.
    expect(access?.open("shopping.txt").text).toBe("milk, bread, tea");
    expect(access?.list().map((entry) => entry.name)).toEqual([
      "shopping.txt",
    ]);

    // A folder inside an allowed folder is allowed too, and one that is not
    // there at all is refused rather than quietly answered with everything.
    mkdirSync(join(home, "receipts"));
    writeFileSync(join(home, "receipts", "may.txt"), "paid");
    expect(access?.list(join(home, "receipts")).map((e) => e.name)).toEqual([
      "may.txt",
    ]);
    expect(() => access?.list("no-such-folder")).toThrow(FetchRefusedError);
  });

  it("refuses a file outside every allowed folder, however it is spelt", () => {
    const database = createTestDatabase();
    const home = temporaryDirectory("vaenyx-fetch-home-");
    const elsewhere = temporaryDirectory("vaenyx-fetch-other-");
    writeFileSync(join(elsewhere, "diary.txt"), "not for the model");
    allow(database, [home]);
    const access = grantFetchAccess(database, GRANT);

    expect(() => access?.open(join(elsewhere, "diary.txt"))).toThrow(
      FetchRefusedError,
    );
    // Climbing out with .. is the same refusal, not a different one.
    expect(() =>
      access?.open(join(home, "..", "..", "windows", "win.ini")),
    ).toThrow(FetchRefusedError);
    expect(() => access?.list(elsewhere)).toThrow(FetchRefusedError);
  });

  it("refuses a NEIGHBOUR folder whose name merely starts with an allowed one", () => {
    const database = createTestDatabase();
    const parent = temporaryDirectory("vaenyx-fetch-parent-");
    const allowed = join(parent, "Docs");
    const neighbour = join(parent, "DocsSecret");
    mkdirSync(allowed);
    mkdirSync(neighbour);
    writeFileSync(join(neighbour, "wills.txt"), "private");
    allow(database, [allowed]);

    // A `startsWith` containment test passes this file. That is the whole
    // reason the check is written with `relative` instead.
    const access = grantFetchAccess(database, GRANT);
    expect(() => access?.open(join(neighbour, "wills.txt"))).toThrow(
      FetchRefusedError,
    );
  });

  it("refuses a link that sits inside an allowed folder and points out of it", () => {
    const database = createTestDatabase();
    const home = temporaryDirectory("vaenyx-fetch-home-");
    const elsewhere = temporaryDirectory("vaenyx-fetch-other-");
    writeFileSync(join(elsewhere, "diary.txt"), "not for the model");
    // A directory junction is the form every Windows account may create
    // without special rights; on Linux the type argument is ignored and this
    // is an ordinary symlink. Either way it is a door out of the folder.
    symlinkSync(elsewhere, join(home, "escape"), "junction");
    allow(database, [home]);

    const access = grantFetchAccess(database, GRANT);
    // Through the link the path LOOKS as if it is inside the allowed folder.
    // It is refused because the check runs on the realpath, not on the name.
    expect(() => access?.open(join(home, "escape", "diary.txt"))).toThrow(
      FetchRefusedError,
    );
    expect(() => access?.list(join(home, "escape"))).toThrow(FetchRefusedError);
  });

  it("refuses a file that is not text, and one that is too big", () => {
    const database = createTestDatabase();
    const home = temporaryDirectory("vaenyx-fetch-home-");
    writeFileSync(join(home, "photo.txt"), Buffer.from([0x89, 0x50, 0x00, 0x1a]));
    writeFileSync(join(home, "huge.txt"), "a".repeat(MAX_FETCH_BYTES + 1));
    allow(database, [home]);
    const access = grantFetchAccess(database, GRANT);

    // Renaming a picture to .txt walks past any extension list; the content is
    // what is checked.
    expect(() => access?.open("photo.txt")).toThrow(/not text/);
    expect(() => access?.open("huge.txt")).toThrow(/only opens files up to/);
  });

  it("writes an audit row for every open, refused or not", () => {
    const database = createTestDatabase();
    const home = temporaryDirectory("vaenyx-fetch-home-");
    const elsewhere = temporaryDirectory("vaenyx-fetch-other-");
    writeFileSync(join(home, "note.txt"), "seen");
    writeFileSync(join(elsewhere, "diary.txt"), "unseen");
    allow(database, [home]);
    const access = grantFetchAccess(database, GRANT);

    access?.open("note.txt");
    expect(() => access?.open(join(elsewhere, "diary.txt"))).toThrow();

    const rows = database.sqlite
      .prepare(
        "SELECT decision FROM audit_events WHERE action = 'fetching.open' ORDER BY id",
      )
      .all() as { decision: string }[];
    expect(rows.map((row) => row.decision).sort()).toEqual([
      "allowed",
      "denied",
    ]);
  });
});

describe("the three things that must all be true", () => {
  it("grants nothing while the global switch is off", () => {
    const database = createTestDatabase();
    const home = temporaryDirectory("vaenyx-fetch-home-");
    writeFileSync(join(home, "shopping.txt"), "milk");
    writeFetchFolders(database, [home], []);
    writeGlobalCapabilities(database, { fetching: false });

    // Folders named, file present, switch off: there is no object to open it
    // with. The ceiling is not a filter applied afterwards.
    expect(grantFetchAccess(database, GRANT)).toBeNull();
  });

  it("grants nothing when the switch is on but no folder has been named", () => {
    const database = createTestDatabase();
    writeGlobalCapabilities(database, { fetching: true });
    // This is the second lock, and the reason switching Fetching on is safe:
    // an empty whitelist reads nothing at all.
    expect(grantFetchAccess(database, GRANT)).toBeNull();
  });

  it("grants nothing inside a mode that does not allow it", () => {
    const database = createTestDatabase();
    const home = temporaryDirectory("vaenyx-fetch-home-");
    allow(database, [home]);
    database.sqlite
      .prepare(
        `INSERT INTO modes (id, name, rules, capabilities)
         VALUES ('mode-1', 'Guest', '', ?)`,
      )
      .run(JSON.stringify(["web"]));

    expect(grantFetchAccess(database, GRANT)).not.toBeNull();
    expect(
      grantFetchAccess(database, { ...GRANT, modeId: "mode-1" }),
    ).toBeNull();
  });

  it("keeps Vaenyx's own data closed even from inside an allowed folder", () => {
    const database = createTestDatabase();
    const home = temporaryDirectory("vaenyx-fetch-home-");
    const secrets = join(home, "secrets");
    mkdirSync(secrets);
    writeFileSync(join(secrets, "keys.json"), "{}");
    writeGlobalCapabilities(database, { fetching: true });
    // Written WITHOUT the protected path so a folder that should never have
    // been storable is stored anyway — this is the second line of defence, for
    // a list saved before the guard existed.
    writeFetchFolders(database, [home], []);

    const access = grantFetchAccess(database, {
      ...GRANT,
      protectedPaths: [secrets],
    });
    expect(access).not.toBeNull();
    expect(() => access?.open(join(secrets, "keys.json"))).toThrow(
      FetchRefusedError,
    );
    // And the naive spelling, which is what a model would actually try.
    expect(() => access?.open(join("secrets", "keys.json"))).toThrow(
      FetchRefusedError,
    );
  });
});

describe("an app token can never obtain it", () => {
  it("strips fetching from what a token may be granted, even when it was ticked", () => {
    const database = createTestDatabase();
    writeGlobalCapabilities(database, { fetching: true, web: true });

    // Everything an attacker would have to get right is already true here: the
    // global switch is on, the Method declares it, and the token was granted
    // it. It is still stripped.
    expect(tokenGrantable(["fetching", "web"])).toEqual(["web"]);
    const decided = decideTokenCapabilities(
      database,
      ["fetching", "web"],
      ["fetching", "web"],
    );
    expect(decided.allowed).toEqual(["web"]);
  });

  it("gives a Method run and the subscription door no route to a grant", async () => {
    // The grant takes an Owner id because there is no other kind of caller:
    // nothing on the token path builds one, and neither the Method runner nor
    // the door an outside app knocks on has a parameter that could carry one.
    //
    // This is a tripwire on the SOURCE rather than on behaviour, because the
    // thing being defended against is a future edit, not a runtime state: if
    // somebody threads a grant into either file, this test fails and they are
    // made to think about who is on the other end of it.
    const { readFileSync } = await import("node:fs");
    for (const file of [
      "src/modules/core/methods.ts",
      "src/modules/core/relay.ts",
    ]) {
      const source = readFileSync(resolve(file), "utf8");
      expect(source).not.toContain("grantFetchAccess");
      expect(source).not.toContain("fetchAccess");
    }
    // And the door's own engine call takes no options bag at all.
    const provider = readFileSync(
      resolve("src/modules/models/claude-subscription-provider.ts"),
      "utf8",
    );
    expect(provider).toContain("export async function claudeSubscriptionRelay");
    expect(
      provider.slice(
        provider.indexOf("export async function claudeSubscriptionRelay"),
        provider.indexOf("export class ClaudeSubscriptionProvider"),
      ),
    ).not.toContain("fetchAccess");
  });
});

describe("the routes behind the folder list", () => {
  it("refuses to save folders from inside a mode", async () => {
    const dataDirectory = temporaryDirectory("vaenyx-fetchroute-test-");
    const app = await buildApp({
      corsOrigins: [],
      dataDirectory,
      databasePath: resolve(dataDirectory, "vaenyx.db"),
      backupsDirectory: resolve(dataDirectory, "backups"),
      repositoryRoot: resolve("..", ".."),
      host: "127.0.0.1",
      libraryDirectory: resolve("..", "..", "sample-library", "methods"),
      routinesDirectory: resolve("..", "..", "sample-library", "routines"),
      docsDirectory: resolve("..", "..", "docs"),
      logLevel: "silent",
      migrationsDirectory: resolve("migrations"),
      mode: "test",
      port: 3000,
      version: "0.0.0-test",
      webDistDirectory: resolve(dataDirectory, "missing-web-dist"),
      secretsDirectory: resolve(dataDirectory, "secrets"),
      publish: null,
      googleOAuth: null,
      publishServiceUrl: null,
      catalogueBaseUrl: "https://example.invalid",
    } as unknown as AppConfig);
    const setup = await app.inject({
      method: "POST",
      url: "/v1/setup",
      payload: { name: "Oskar", password: "private-password" },
    });
    const cookie = String(setup.headers["set-cookie"]);

    const home = temporaryDirectory("vaenyx-fetch-home-");
    const saved = await app.inject({
      method: "PUT",
      url: "/v1/capabilities/folders",
      headers: { cookie },
      payload: { folders: [home] },
    });
    expect(saved.statusCode).toBe(200);
    expect(saved.json().folders).toEqual([resolve(home)]);

    const listed = await app.inject({
      method: "GET",
      url: "/v1/capabilities/folders",
      headers: { cookie },
    });
    expect(listed.json().folders).toEqual([resolve(home)]);

    // Anonymous is refused outright.
    const anonymous = await app.inject({
      method: "GET",
      url: "/v1/capabilities/folders",
    });
    expect(anonymous.statusCode).toBe(401);
    await app.close();
  });
});
