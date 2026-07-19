import type { Difference } from "@spot-battle/shared";
import sharp from "sharp";

const WIDTH = 1000;
const HEIGHT = 563;

function marker(difference: Difference): string {
  const x = Math.round(difference.region.x * WIDTH);
  const y = Math.round(difference.region.y * HEIGHT);
  const radius = Math.max(12, Math.round(difference.region.radius * WIDTH * 0.72));
  if (difference.kind === "COVER") {
    return `<circle cx="${x}" cy="${y}" r="${radius}" fill="#1e293b"/><text x="${x}" y="${y + 9}" text-anchor="middle" font-size="28" font-weight="700" fill="white">?</text>`;
  }
  if (difference.kind === "COLOR") {
    return `<circle cx="${x}" cy="${y}" r="${radius}" fill="#d946ef" opacity="0.9"/>`;
  }
  return `<circle cx="${x}" cy="${y}" r="${radius}" fill="#facc15" stroke="white" stroke-width="4"/><text x="${x}" y="${y + 9}" text-anchor="middle" font-size="26" fill="#713f12">★</text>`;
}

export async function renderAutoFillOverlay(differences: Difference[]): Promise<string> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">${differences.map(marker).join("")}</svg>`;
  const output = await sharp(Buffer.from(svg)).webp({ quality: 90 }).toBuffer();
  return `data:image/webp;base64,${output.toString("base64")}`;
}
