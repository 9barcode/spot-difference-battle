import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

// Works from both src/config and dist/config, regardless of pnpm's cwd.
export function loadLocalEnvironment(): void {
  if (process.env.NODE_ENV === "production") return;
  const file = new URL("../../../../.env", import.meta.url);
  if (existsSync(file)) loadEnvFile(file);
}

export function resolveStorage(env: NodeJS.ProcessEnv): "memory" | "postgres" {
  const driver = env.STORAGE_DRIVER?.trim() || "postgres";
  if (driver !== "memory" && driver !== "postgres") throw new Error("STORAGE_DRIVER must be memory or postgres.");
  if (driver === "memory") {
    if (env.NODE_ENV === "production") throw new Error("Memory storage is forbidden in production.");
    return driver;
  }
  if (!env.SUPABASE_DB_URL?.trim()) throw new Error("SUPABASE_DB_URL is required for postgres. Use STORAGE_DRIVER=memory for local image/play tests only.");
  return driver;
}
