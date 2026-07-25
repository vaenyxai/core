import { defineConfig } from "vitest/config";

// These are integration tests, not unit tests: each one builds the real Fastify
// app, runs the migrations against a fresh SQLite file, hashes a password with
// the deliberately slow Owner-login hash, and some spawn a child process. On a
// fast desktop that fits inside vitest's 5s default; on a cold shared CI runner
// it does not, and the release build failed on a timeout rather than on a real
// defect (2026-07-26). The budget below is generous on purpose - a test that
// genuinely hangs still fails, just not on a slow machine.
export default defineConfig({
  test: {
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
