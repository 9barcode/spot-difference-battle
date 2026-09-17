import { afterEach, describe, expect, it, vi } from "vitest";
import { createGamePuzzleVisuals, preloadPuzzle } from "./catalog";

describe("puzzle image preloading", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("keeps every puzzle on Git assets when the canary URL is absent", () => {
    const visuals = createGamePuzzleVisuals("");
    expect(visuals["home-office"].originalSrc).not.toMatch(/^https?:/);
    expect(visuals["home-office"].modifiedSrc).not.toMatch(/^https?:/);
  });

  it("routes only both home-office images through the configured Worker", () => {
    const visuals = createGamePuzzleVisuals("https://canary.example/");
    expect(visuals["home-office"].originalSrc).toBe(
      "https://canary.example/puzzles/home-office/2026-08-28.2/runtime/original.webp",
    );
    expect(visuals["home-office"].modifiedSrc).toBe(
      "https://canary.example/puzzles/home-office/2026-08-28.2/runtime/modified.webp",
    );
    for (const [puzzleId, puzzle] of Object.entries(visuals)) {
      if (puzzleId === "home-office") continue;
      expect(puzzle.originalSrc).not.toMatch(/^https?:/);
      expect(puzzle.modifiedSrc).not.toMatch(/^https?:/);
    }
  });

  it.each([
    "not-a-url",
    "http://canary.example",
    "https://user:password@canary.example",
    "https://canary.example/path",
    "https://canary.example?target=other",
    "https://canary.example#fragment",
  ])("rejects an unsafe or malformed canary URL: %s", (url) => {
    expect(() => createGamePuzzleVisuals(url)).toThrow("VITE_R2_CANARY_BASE_URL");
  });

  it("allows local HTTP only for local Worker development", () => {
    expect(createGamePuzzleVisuals("http://127.0.0.1:8787")["home-office"].originalSrc).toBe(
      "http://127.0.0.1:8787/puzzles/home-office/2026-08-28.2/runtime/original.webp",
    );
  });

  it("reuses one load promise for repeated requests of the same puzzle", async () => {
    const loadedSources: string[] = [];

    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      set src(value: string) {
        loadedSources.push(value);
        queueMicrotask(() => this.onload?.());
      }
    }

    vi.stubGlobal("Image", FakeImage);

    const first = preloadPuzzle("winter-cabin");
    const second = preloadPuzzle("winter-cabin");

    expect(second).toBe(first);
    await first;
    expect(loadedSources).toHaveLength(2);
  });

  it("mixes Worker and Git sources when current and next puzzles use different delivery", async () => {
    vi.stubEnv("VITE_R2_CANARY_BASE_URL", "https://canary.example");
    vi.resetModules();
    const loadedSources: string[] = [];
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(value: string) {
        loadedSources.push(value);
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("Image", FakeImage);
    const canaryCatalog = await import("./catalog");
    await Promise.all([
      canaryCatalog.preloadPuzzle("home-office"),
      canaryCatalog.preloadPuzzle("winter-cabin"),
    ]);
    expect(loadedSources).toContain(
      "https://canary.example/puzzles/home-office/2026-08-28.2/runtime/original.webp",
    );
    expect(loadedSources).toContain(
      "https://canary.example/puzzles/home-office/2026-08-28.2/runtime/modified.webp",
    );
    expect(loadedSources).toHaveLength(4);
    expect(loadedSources.filter((source) => !source.startsWith("https://canary.example"))).toHaveLength(2);
  });

  it("removes failed preloads from the cache so the existing retry can run", async () => {
    let shouldFail = true;
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => shouldFail ? this.onerror?.() : this.onload?.());
      }
    }
    vi.stubGlobal("Image", FakeImage);
    await expect(preloadPuzzle("home-office")).rejects.toThrow("이미지를 불러오지 못했습니다");
    shouldFail = false;
    await expect(preloadPuzzle("home-office")).resolves.toBeUndefined();
  });
});
