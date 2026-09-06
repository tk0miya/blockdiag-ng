import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadFont, measureTextWidth } from "./font-metrics.js";

// Expected widths were captured by running the original implementation's
// Pillow-based measurement (PIL.ImageFont.FreeTypeFont.getlength(), used by
// vendor/blockdiag/src/blockdiag/imagedraw/png.py) against the same bundled
// test font. This port's fontkit-based measurement (design-unit advance
// widths, no rendering/hinting) comes within a sub-pixel of Pillow's for
// short strings - see font-metrics.ts's header comment.
const VL_GOTHIC_PATH = join(
  import.meta.dirname,
  "../../vendor/blockdiag/src/blockdiag/tests/VLGothic/VL-Gothic-Regular.ttf",
);

describe("measureTextWidth", () => {
  it("measures a string at a given font size, matching the original to within a sub-pixel", () => {
    // The original (Pillow) measures 61 and 6 for these two cases.
    const font = loadFont(VL_GOTHIC_PATH);
    expect(measureTextWidth(font, "Hello World", 11)).toBe(60.5);
    expect(measureTextWidth(font, "A", 11)).toBe(5.5);
  });

  it("scales linearly with font size", () => {
    const font = loadFont(VL_GOTHIC_PATH);
    const at11 = measureTextWidth(font, "Hello", 11);
    const at22 = measureTextWidth(font, "Hello", 22);
    expect(at22).toBeCloseTo(at11 * 2, 5);
  });

  it("returns 0 for an empty string", () => {
    const font = loadFont(VL_GOTHIC_PATH);
    expect(measureTextWidth(font, "", 11)).toBe(0);
  });
});
