import { describe, expect, it } from "vitest";
import { resolveServerUrl } from "./server-url";

describe("resolveServerUrl", () => {
  it("uses an explicit server URL unchanged", () => {
    expect(resolveServerUrl(" https://api.example.com ", true, "http://192.168.0.20:5173"))
      .toBe("https://api.example.com");
  });

  it("rejects an insecure explicit production server", () => {
    expect(() =>
      resolveServerUrl(
        "http://api.example.com",
        false,
        "https://game.example.com",
      ),
    ).toThrow("https://");
  });

  it("uses the browser host with the development API port", () => {
    expect(resolveServerUrl(undefined, true, "http://192.168.0.20:5173/play"))
      .toBe("http://192.168.0.20:3001");
  });

  it("uses the current origin in production", () => {
    expect(resolveServerUrl(undefined, false, "https://game.example.com/play"))
      .toBe("https://game.example.com");
  });

  it("requires an explicit server for a packaged mini-app origin", () => {
    expect(() =>
      resolveServerUrl(undefined, false, "intoss://spot-battle"),
    ).toThrow("VITE_SERVER_URL");
  });
});
