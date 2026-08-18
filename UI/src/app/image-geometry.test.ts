import { describe, expect, it } from "vitest";
import { clampViewport, normalizedPointFromClient } from "./image-geometry.js";

describe("image board geometry", () => {
  it("maps a click through the transformed image rectangle", () => {
    const point = normalizedPointFromClient(250, 325, {
      left: 50,
      top: 25,
      width: 400,
      height: 600,
    });
    expect(point).toEqual({ x: 0.5, y: 0.5 });
  });

  it("clamps points and pan so the zoomed image keeps covering the board", () => {
    expect(normalizedPointFromClient(-10, 500, { left: 0, top: 0, width: 200, height: 200 }))
      .toEqual({ x: 0, y: 1 });
    expect(clampViewport({ scale: 2, pan: { x: 2, y: -2 } }))
      .toEqual({ scale: 2, pan: { x: 0.5, y: -0.5 } });
    expect(clampViewport({ scale: 1, pan: { x: 0.2, y: 0.2 } }))
      .toEqual({ scale: 1, pan: { x: 0, y: 0 } });
  });
});