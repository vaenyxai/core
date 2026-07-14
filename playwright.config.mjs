// UI smoke test config (npm run test:ui). Boots the production build against a
// throwaway data directory (scripts/ui-smoke-server.mjs) and walks the real
// first-run path in a browser. Requires a prior `npm run build`.
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/ui",
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3198",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/ui-smoke-server.mjs",
    url: "http://127.0.0.1:3198/health",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
