import type { Difference } from "@spot-battle/shared";
import { deflateSync } from "node:zlib";

function chunk(type: string, body: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length);
  return Buffer.concat([length, Buffer.from(type), body, Buffer.alloc(4)]);
}

function createPng(
  width: number,
  height: number,
  paint?: (x: number, y: number) => [number, number, number],
): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = Buffer.alloc((width * 4 + 1) * height);

  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    for (let x = 0; x < width; x += 1) {
      const offset = row + 1 + x * 4;
      const [red, green, blue] = paint?.(x, y) ?? [240, 240, 240];
      rows[offset] = red;
      rows[offset + 1] = green;
      rows[offset + 2] = blue;
      rows[offset + 3] = 255;
    }
  }

  return Buffer.concat([
    signature,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export function createProblemImageFixture(
  differences: Difference[],
  width = 400,
  height = 200,
): { originalImage: Buffer; renderedImage: string } {
  const originalImage = createPng(width, height);
  const rendered = createPng(width, height, (x, y) => {
    const normalizedX = (x + 0.5) / width;
    const normalizedY = (y + 0.5) / height;
    const changed = differences.some(({ region }) =>
      Math.hypot(normalizedX - region.x, normalizedY - region.y) < region.radius * 0.8,
    );
    return changed ? [20, 60, 220] : [240, 240, 240];
  });

  return {
    originalImage,
    renderedImage: `data:image/png;base64,${rendered.toString("base64")}`,
  };
}
