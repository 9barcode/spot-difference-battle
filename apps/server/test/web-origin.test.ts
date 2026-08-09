import { describe, expect, it } from "vitest";
import { LOCAL_DEVELOPMENT_WEB_ORIGIN, resolveWebOrigin } from "../src/web-origin.js";

describe("development web origin", () => {
  it.each([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://10.0.0.12:5173",
    "http://172.16.4.9:5173",
    "http://172.31.255.20:5173",
    "http://192.168.0.25:5173",
  ])("allows %s", (origin) => {
    expect(LOCAL_DEVELOPMENT_WEB_ORIGIN.test(origin)).toBe(true);
  });

  it.each([
    "https://192.168.0.25:5173",
    "http://192.169.0.25:5173",
    "http://172.32.0.1:5173",
    "http://example.com:5173",
    "http://192.168.0.25:3001",
  ])("rejects %s", (origin) => {
    expect(LOCAL_DEVELOPMENT_WEB_ORIGIN.test(origin)).toBe(false);
  });

  it("keeps explicit and production policies", () => {
    expect(resolveWebOrigin(" https://game.example.com ", "development")).toBe("https://game.example.com");
    expect(resolveWebOrigin(undefined, "production")).toBeUndefined();
    expect(resolveWebOrigin(undefined, "development")).toBe(LOCAL_DEVELOPMENT_WEB_ORIGIN);
  });
});
