import { defineConfig } from "@playwright/test";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv();

const PORT = 3105;
const MOCK_OPENAI_PORT = 3106;

/**
 * E2E tests require the local Supabase stack (npx supabase start) and seeded
 * data (npm run seed). The dev server and a deterministic mock OpenAI server
 * are started automatically — no real OpenAI traffic or cost.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  retries: 0,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: `node tests/mocks/openai-server.mjs ${MOCK_OPENAI_PORT}`,
      url: `http://127.0.0.1:${MOCK_OPENAI_PORT}/v1/health`,
      reuseExistingServer: true,
      timeout: 30_000,
      ignoreHTTPSErrors: true,
    },
    {
      command: `npm run dev -- -p ${PORT}`,
      url: `http://localhost:${PORT}/login`,
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        ...process.env,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || "sk-test-mock",
        OPENAI_BASE_URL: `http://127.0.0.1:${MOCK_OPENAI_PORT}/v1`,
        AI_MAX_RUNS_PER_HOUR: "1000",
      },
    },
  ],
});
