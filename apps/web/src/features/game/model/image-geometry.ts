import type { NormalizedPoint } from "@spot-battle/shared";

export interface BoardRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ImageViewport {
  scale: number;
  pan: NormalizedPoint;
}

export function normalizedPointFromClient(
  clientX: number,
  clientY: number,
  rect: BoardRect,
): NormalizedPoint {
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
  return {
    x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
  };
}

export function clampViewport(viewport: ImageViewport): ImageViewport {
  const scale = Math.min(3, Math.max(1, viewport.scale));
  const maximumPan = (scale - 1) / 2;
  return {
    scale,
    pan: {
      x: Math.min(maximumPan, Math.max(-maximumPan, viewport.pan.x)),
      y: Math.min(maximumPan, Math.max(-maximumPan, viewport.pan.y)),
    },
  };
}