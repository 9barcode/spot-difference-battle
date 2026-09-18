import { defineConfig } from "@playwright/test";

const webPort = 4173;
const serverPort = 3101;
const databaseE2E = process.env.E2E_STORAGE_DRIVER === "postgres";
if (databaseE2E && !process.env.SUPABASE_DB_URL?.trim()) {
  throw new Error("Database E2E requires an isolated development SUPABASE_DB_URL.");
}
const gameSceneId = process.env.GAME_SCENE_ID ?? "";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 40_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    headless: true,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  webServer: [
    {
      command: "pnpm --filter @spot-battle/server build && pnpm --filter @spot-battle/server start",
      url: `http://127.0.0.1:${serverPort}/health`,
      reuseExistingServer: false,
      env: {
        HOST: "127.0.0.1",
        PORT: String(serverPort),
        WEB_ORIGIN: `http://127.0.0.1:${webPort}`,
        GAME_SCENE_ID: gameSceneId,
        STORAGE_DRIVER: databaseE2E ? "postgres" : "memory",
        PUZZLE_CATALOG_SOURCE: databaseE2E ? "database" : "code",
      },
    },
    {
      command: `pnpm --filter @spot-battle/web exec vite --host 127.0.0.1 --port ${webPort} --strictPort`,
      url: `http://127.0.0.1:${webPort}`,
      reuseExistingServer: false,
      env: {
        VITE_SERVER_URL: `http://127.0.0.1:${serverPort}`,
      },
    },
  ],
});
