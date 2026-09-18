import { describe, expect, it } from "vitest";
import { resolveStorage } from "../../src/config/runtime.js";

describe("explicit storage selection", () => {
  it("never connects to an inherited database in memory mode", () => {
    expect(resolveStorage({ STORAGE_DRIVER: "memory", SUPABASE_DB_URL: "postgres://unused" })).toBe("memory");
  });
  it("rejects production memory and unknown drivers", () => {
    expect(() => resolveStorage({ NODE_ENV: "production", STORAGE_DRIVER: "memory" })).toThrow();
    expect(() => resolveStorage({ STORAGE_DRIVER: "typo" })).toThrow();
  });
  it("requires an explicit database connection by default", () => {
    expect(() => resolveStorage({})).toThrow("SUPABASE_DB_URL");
    expect(resolveStorage({ SUPABASE_DB_URL: "postgres://test" })).toBe("postgres");
  });
});
