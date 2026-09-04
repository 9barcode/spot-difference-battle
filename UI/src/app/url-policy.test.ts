import { describe, expect, it } from "vitest";
import { requireHttpsAssetUrl, requireHttpsUrl } from "./url-policy";

describe("requireHttpsUrl", () => {
  it("returns a normalized HTTPS origin", () => {
    expect(requireHttpsUrl("https://game.example.com/", "SERVER_URL")).toBe(
      "https://game.example.com",
    );
  });

  it.each([
    "http://game.example.com",
    "https://user:pass@game.example.com",
    "https://game.example.com/socket",
    "https://game.example.com?debug=1",
    "not-a-url",
  ])("rejects an unsafe or non-origin URL: %s", (value) => {
    expect(() => requireHttpsUrl(value, "SERVER_URL")).toThrow();
  });
});

describe("requireHttpsAssetUrl", () => {
  it("accepts an HTTPS asset path", () => {
    expect(
      requireHttpsAssetUrl(
        "https://static.example.com/apps/icon.png?v=2",
        "AIT_ICON_URL",
      ),
    ).toBe("https://static.example.com/apps/icon.png?v=2");
  });

  it.each([
    "http://static.example.com/icon.png",
    "https://user:pass@static.example.com/icon.png",
    "https://static.example.com/icon.png#preview",
    "not-a-url",
  ])("rejects an unsafe asset URL: %s", (value) => {
    expect(() => requireHttpsAssetUrl(value, "AIT_ICON_URL")).toThrow();
  });
});
