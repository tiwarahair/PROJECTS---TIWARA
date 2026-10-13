/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist", sourcemap: true },
  // other sessions' git worktrees live under .claude/worktrees; their edits shouldn't reload this app
  server: { watch: { ignored: ["**/.claude/**"] } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // other sessions' git worktrees live under .claude/worktrees
    exclude: [...configDefaults.exclude, ".claude/**"],
    css: false,
    // full-page UI tests can take several seconds when every file runs in parallel
    testTimeout: 15_000,
    // Points at the local stack; tests never reach it (no session is stored).
    env: {
      VITE_SUPABASE_URL: "http://127.0.0.1:54321",
      VITE_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
    },
  },
});
