import { afterEach, describe, expect, it, vi } from "vitest";
import { preloadPuzzle } from "./game-puzzles";

describe("puzzle image preloading", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
});
