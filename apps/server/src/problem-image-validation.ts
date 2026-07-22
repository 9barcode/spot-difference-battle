import { inflateSync } from "node:zlib";
import type { Difference } from "@spot-battle/shared";

interface DecodedImage {
  width: number;
  height: number;
  pixels: Uint8Array;
}

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const MIN_CHANGED_PIXEL_RATIO = 0.015;
const MIN_REGION_LIFT = 0.012;
const PIXEL_DELTA_THRESHOLD = 54;

function paeth(left: number, above: number, upperLeft: number): number {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  return aboveDistance <= upperLeftDistance ? above : upperLeft;
}

function decodePng(data: Buffer): DecodedImage {
  if (!data.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error("PNG_SIGNATURE");
  }

  let offset = PNG_SIGNATURE.length;
  let width = 0;
  let height = 0;
  let colorType = -1;
  let bitDepth = 0;
  let interlace = 0;
  const idat: Buffer[] = [];

  while (offset + 12 <= data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.toString("ascii", offset + 4, offset + 8);
    const bodyStart = offset + 8;
    const bodyEnd = bodyStart + length;
    if (bodyEnd + 4 > data.length) throw new Error("PNG_TRUNCATED");
    const body = data.subarray(bodyStart, bodyEnd);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      bitDepth = body[8]!;
      colorType = body[9]!;
      interlace = body[12]!;
    } else if (type === "IDAT") {
      idat.push(body);
    } else if (type === "IEND") {
      break;
    }
    offset = bodyEnd + 4;
  }

  if (!width || !height || bitDepth !== 8 || ![2, 6].includes(colorType) || interlace !== 0) {
    throw new Error("PNG_UNSUPPORTED");
  }

  const channels = colorType === 6 ? 4 : 3;
  const rowBytes = width * channels;
  const inflated = inflateSync(Buffer.concat(idat));
  if (inflated.length !== (rowBytes + 1) * height) throw new Error("PNG_SIZE");

  const raw = new Uint8Array(rowBytes * height);
  for (let y = 0; y < height; y += 1) {
    const sourceOffset = y * (rowBytes + 1);
    const filter = inflated[sourceOffset]!;
    const rowOffset = y * rowBytes;
    for (let x = 0; x < rowBytes; x += 1) {
      const value = inflated[sourceOffset + 1 + x]!;
      const left = x >= channels ? raw[rowOffset + x - channels]! : 0;
      const above = y > 0 ? raw[rowOffset - rowBytes + x]! : 0;
      const upperLeft = y > 0 && x >= channels ? raw[rowOffset - rowBytes + x - channels]! : 0;
      const predictor =
        filter === 0 ? 0 :
        filter === 1 ? left :
        filter === 2 ? above :
        filter === 3 ? Math.floor((left + above) / 2) :
        filter === 4 ? paeth(left, above, upperLeft) :
        (() => { throw new Error("PNG_FILTER"); })();
      raw[rowOffset + x] = (value + predictor) & 255;
    }
  }

  if (channels === 4) return { width, height, pixels: raw };
  const rgba = new Uint8Array(width * height * 4);
  for (let source = 0, target = 0; source < raw.length; source += 3, target += 4) {
    rgba[target] = raw[source]!;
    rgba[target + 1] = raw[source + 1]!;
    rgba[target + 2] = raw[source + 2]!;
    rgba[target + 3] = 255;
  }
  return { width, height, pixels: rgba };
}

function dataUrlToBuffer(image: string): Buffer {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(image);
  if (!match) throw new Error("PNG_DATA_URL");
  return Buffer.from(match[1]!, "base64");
}

function sourcePixel(source: DecodedImage, targetX: number, targetY: number, targetWidth: number, targetHeight: number): number {
  const x = Math.min(source.width - 1, Math.max(0, Math.round(((targetX + 0.5) * source.width) / targetWidth - 0.5)));
  const y = Math.min(source.height - 1, Math.max(0, Math.round(((targetY + 0.5) * source.height) / targetHeight - 0.5)));
  return (y * source.width + x) * 4;
}

function contains(difference: Difference, x: number, y: number): boolean {
  const dx = x - difference.region.x;
  const dy = y - difference.region.y;
  return dx * dx + dy * dy <= difference.region.radius * difference.region.radius;
}

export function validateProblemImageCoordinates(
  originalImage: Buffer,
  renderedImage: string,
  differences: Difference[],
): void {
  const original = decodePng(originalImage);
  const rendered = decodePng(dataUrlToBuffer(renderedImage));
  if (rendered.width < 320 || rendered.height < 180 || rendered.width > 2000 || rendered.height > 2000) {
    throw new Error("INVALID_DIMENSIONS");
  }

  const regionTotals = differences.map(() => 0);
  const regionChanged = differences.map(() => 0);
  let outsideTotal = 0;
  let outsideChanged = 0;

  for (let y = 0; y < rendered.height; y += 1) {
    for (let x = 0; x < rendered.width; x += 1) {
      const normalizedX = (x + 0.5) / rendered.width;
      const normalizedY = (y + 0.5) / rendered.height;
      const regions = differences
        .map((difference, index) => contains(difference, normalizedX, normalizedY) ? index : -1)
        .filter((index) => index >= 0);
      const renderedOffset = (y * rendered.width + x) * 4;
      const originalOffset = sourcePixel(original, x, y, rendered.width, rendered.height);
      const delta =
        Math.abs(rendered.pixels[renderedOffset]! - original.pixels[originalOffset]!) +
        Math.abs(rendered.pixels[renderedOffset + 1]! - original.pixels[originalOffset + 1]!) +
        Math.abs(rendered.pixels[renderedOffset + 2]! - original.pixels[originalOffset + 2]!);
      const changed = delta >= PIXEL_DELTA_THRESHOLD;

      if (regions.length === 0) {
        outsideTotal += 1;
        if (changed) outsideChanged += 1;
      } else {
        for (const index of regions) {
          regionTotals[index]! += 1;
          if (changed) regionChanged[index]! += 1;
        }
      }
    }
  }

  const outsideRatio = outsideTotal ? outsideChanged / outsideTotal : 0;
  for (let index = 0; index < differences.length; index += 1) {
    const ratio = regionTotals[index] ? regionChanged[index]! / regionTotals[index]! : 0;
    if (ratio < MIN_CHANGED_PIXEL_RATIO || ratio < outsideRatio + MIN_REGION_LIFT) {
      throw new Error(`${index + 1}번 정답 좌표 주변에 실제 이미지 변경이 없습니다.`);
    }
  }
}
