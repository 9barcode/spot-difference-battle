import { describe, expect, it } from "vitest";
import {
  APPS_IN_TOSS_WEB_ORIGINS,
  LOCAL_DEVELOPMENT_WEB_ORIGIN,
  resolveWebOrigin,
} from "../src/web-origin.js";

describe("development web origin", () => {
  it("rejects a comma-only origin list", () => {
    expect(() => resolveWebOrigin(" , ", "production")).toThrow(
      "at least one exact URL origin",
    );
  });

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
    const productionOrigin = resolveWebOrigin(undefined, "production") as RegExp;
    expect(productionOrigin.test("https://spot-difference-syk.apps.tossmini.com")).toBe(true);
    expect(productionOrigin.test("https://spot-difference-syk.private-apps.tossmini.com")).toBe(true);
    expect(productionOrigin.test("https://evil.example.com")).toBe(false);
    expect(resolveWebOrigin(undefined, "development")).toBe(LOCAL_DEVELOPMENT_WEB_ORIGIN);
  });

  it("supports explicit staging and Apps in Toss production origins", () => {
    const productionOrigin = resolveWebOrigin(
      "https://spot-battle.apps.tossmini.com, https://staging.example.com",
      "production",
    ) as RegExp;
    expect(productionOrigin.test("https://spot-battle.apps.tossmini.com")).toBe(true);
    expect(productionOrigin.test("https://staging.example.com")).toBe(true);
    for (const origin of APPS_IN_TOSS_WEB_ORIGINS) {
      expect(productionOrigin.test(origin)).toBe(true);
    }
    expect(productionOrigin.test("https://evil.example.com")).toBe(false);
  });

  it("allows the Apps in Toss live and QR origins without extra configuration", () => {
    const productionOrigin = resolveWebOrigin(undefined, "production") as RegExp;
    for (const origin of APPS_IN_TOSS_WEB_ORIGINS) {
      expect(productionOrigin.test(origin)).toBe(true);
    }
  });

  it.each([
    "https://spot-battle.apps.tossmini.com/path",
    "https://spot-battle.apps.tossmini.com/",
    "not-a-url",
  ])("rejects a non-origin WEB_ORIGIN entry: %s", (origin) => {
    expect(() => resolveWebOrigin(origin, "production")).toThrow();
  });
});
