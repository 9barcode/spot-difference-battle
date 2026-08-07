import { describe, expect, it } from "vitest";
import type { Difference } from "@spot-battle/shared";
import { deflateSync } from "node:zlib";
import { validateProblemImageCoordinates } from "./problem-image-validation.js";

function chunk(type: string, body: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length);
  return Buffer.concat([length, Buffer.from(type), body, Buffer.alloc(4)]);
}

function createPng(width: number, height: number, paint?: (x: number, y: number) => [number, number, number]): Buffer {
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

function createPngFromCompressedRows(width: number, height: number, compressedRows: Buffer): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    signature,
    chunk("IHDR", header),
    chunk("IDAT", compressedRows),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const differences: Difference[] = [
  { id: "a", kind: "COLOR", region: { x: 0.2, y: 0.25, radius: 0.08 } },
  { id: "b", kind: "COLOR", region: { x: 0.5, y: 0.5, radius: 0.08 } },
  { id: "c", kind: "COLOR", region: { x: 0.8, y: 0.75, radius: 0.08 } },
];

function createProblemImageFixture(): { originalImage: Buffer; renderedImage: string } {
  const originalImage = createPng(400, 200);
  const rendered = createPng(400, 200, (x, y) => {
    const normalizedX = (x + 0.5) / 400;
    const normalizedY = (y + 0.5) / 200;
    return differences.some(({ region }) =>
      Math.hypot(normalizedX - region.x, normalizedY - region.y) < region.radius * 0.8,
    ) ? [20, 60, 220] : [240, 240, 240];
  });
  return {
    originalImage,
    renderedImage: `data:image/png;base64,${rendered.toString("base64")}`,
  };
}

describe("validateProblemImageCoordinates", () => {
  it("accepts changes located at every submitted answer", () => {
    const fixture = createProblemImageFixture();
    expect(() => validateProblemImageCoordinates(fixture.originalImage, fixture.renderedImage, differences)).not.toThrow();
  });


  it("rejects oversized dimensions before inflating PNG data", () => {
    const forged = createPngFromCompressedRows(2001, 180, deflateSync(Buffer.alloc(1)));
    const rendered = `data:image/png;base64,${forged.toString("base64")}`;
    expect(() => validateProblemImageCoordinates(createPng(400, 200), rendered, differences))
      .toThrow("INVALID_DIMENSIONS");
  });

  it("caps decompression at the size declared by the PNG header", () => {
    const width = 320;
    const height = 180;
    const expectedBytes = (width * 4 + 1) * height;
    const forged = createPngFromCompressedRows(
      width,
      height,
      deflateSync(Buffer.alloc(expectedBytes + 1)),
    );
    const rendered = `data:image/png;base64,${forged.toString("base64")}`;
    expect(() => validateProblemImageCoordinates(createPng(400, 200), rendered, differences))
      .toThrow();
  });

  it("rejects an answer coordinate with no image change", () => {
    const fixture = createProblemImageFixture();
    const forged = differences.map((difference, index) =>
      index === 2 ? { ...difference, region: { ...difference.region, x: 0.65, y: 0.2 } } : difference,
    );
    expect(() => validateProblemImageCoordinates(fixture.originalImage, fixture.renderedImage, forged))
      .toThrow("3번 정답 좌표 주변에 실제 이미지 변경이 없습니다.");
  });

  it("rejects an unchanged problem image", () => {
    const original = createPng(400, 200);
    const rendered = `data:image/png;base64,${original.toString("base64")}`;
    expect(() => validateProblemImageCoordinates(original, rendered, differences)).toThrow();
  });
});
