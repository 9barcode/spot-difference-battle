import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { renderAutoFillOverlay } from "../src/auto-fill-renderer.js";

describe("renderAutoFillOverlay", () => {
  it("renders server-selected differences as a transparent WebP overlay", async () => {
    const dataUrl = await renderAutoFillOverlay([
      { id: "auto-a", kind: "ADD", region: { x: 0.2, y: 0.3, radius: 0.04 } },
      { id: "auto-b", kind: "COLOR", region: { x: 0.8, y: 0.7, radius: 0.04 } },
    ]);

    expect(dataUrl).toMatch(/^data:image\/webp;base64,/);
    const metadata = await sharp(Buffer.from(dataUrl.split(",")[1]!, "base64")).metadata();
    expect(metadata).toMatchObject({ format: "webp", width: 1000, height: 563, hasAlpha: true });
  });
});
