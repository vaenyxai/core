import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "apps/server/drizzle/**",
      "coverage/**",
      "data/**",
      // Personal data — includes codex-home, where the Codex CLI caches its
      // own plugin code. Never lint the Owner's data directory.
      "userdata/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-undef": "off",
    },
  },
  {
    files: ["**/*.config.js", "**/*.config.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["apps/web/public/sw.js"],
    rules: {
      "no-undef": "off",
    },
  },
  {
    files: ["scripts/**/*.mjs"],
    rules: {
      "no-undef": "off",
    },
  },
  {
    // Playwright UI specs: page.evaluate callbacks run in the BROWSER, where
    // window/document are real — Node-side lint cannot know that.
    files: ["tests/ui/**/*.mjs"],
    rules: {
      "no-undef": "off",
    },
  },
);
