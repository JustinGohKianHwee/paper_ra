import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    // Integration tests are gated at runtime on a running local Supabase.
    include: ["tests/**/*.test.ts"],
  },
});
