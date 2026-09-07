import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadFont, measureTextHeight, measureTextWidth } from "./font-metrics.js";

// Expected sizes were captured by running the original implementation's
// Pillow-based measurement (PIL.ImageFont.FreeTypeFont.getbbox(), used by
// vendor/blockdiag/src/blockdiag/imagedraw/png.py's textlinesize() since
// Pillow removed the getsize() it used to call) against the same font
// (VL Gothic Regular 2.111, vendored at vendor/vlgothic - byte-identical
// to the copy vendor/blockdiag's own test suite bundles), via a local
// venv. This port's fontkit-based measurement (design-unit glyph
// extents, no rendering/hinting) comes within a sub-pixel of Pillow's
// for short strings - see font-metrics.ts's header comment.
const VL_GOTHIC_PATH = join(import.meta.dirname, "../../vendor/vlgothic/VL-Gothic-Regular.ttf");

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

describe("measureTextHeight", () => {
  it("measures a string's ink extent at a given font size, matching the original to within a sub-pixel", () => {
    // The original measures 8 for both these cases (their ink extents
    // span the same vertical range at this font size and string content).
    const font = loadFont(VL_GOTHIC_PATH);
    expect(measureTextHeight(font, "Hello World", 11)).toBeCloseTo(8.25, 5);
    expect(measureTextHeight(font, "A", 11)).toBeCloseTo(8.14, 2);
  });

  it("returns 0 for an empty string", () => {
    const font = loadFont(VL_GOTHIC_PATH);
    expect(measureTextHeight(font, "", 11)).toBe(0);
  });
});
