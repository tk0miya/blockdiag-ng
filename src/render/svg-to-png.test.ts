import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderPng } from "./svg-to-png.js";

const FONT_PATH = join(import.meta.dirname, "../../vendor/vlgothic/VL-Gothic-Regular.ttf");
const FONT_FAMILY = "VL Gothic";

// A PNG's own width/height sit at fixed byte offsets in its leading
// IHDR chunk (right after an 8-byte signature and a 4-byte length/4-byte
// "IHDR" tag), regardless of what wrote it - reading them directly here
// avoids depending on this port's own PNG-header reader (images.ts's
// own `readPngSize`, not exported - it exists to size an `icon`/
// `background` image file, not to verify this module's own output).
function pngSize(png: Buffer): { width: number; height: number } {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

describe("renderPng", () => {
  it("renders a real PNG matching the SVG's own declared size", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"></svg>';
    const png = renderPng(svg, FONT_PATH, FONT_FAMILY);
    expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect(pngSize(png)).toEqual({ width: 100, height: 50 });
  });

  it("renders the same input twice byte-for-byte identically", () => {
    // Only within this one process/run - not a cross-host reproducibility
    // guarantee (nothing here spans separate hosts to test that).
    // `loadSystemFonts: false` (this module's own option) is what should
    // make this port's own rendering host-independent, verified only
    // informally (by manual testing on this session's own machine, not
    // by an automated cross-host test).
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40">' +
      '<text x="10" y="20" font-family="sans-serif" font-size="11">Hi</text></svg>';
    const first = renderPng(svg, FONT_PATH, FONT_FAMILY);
    const second = renderPng(svg, FONT_PATH, FONT_FAMILY);
    expect(first).toEqual(second);
  });

  it("actually draws a label's text, not just a blank canvas", () => {
    const blank = renderPng(
      '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"></svg>',
      FONT_PATH,
      FONT_FAMILY,
    );
    const labeled = renderPng(
      '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40">' +
        '<text x="10" y="20" font-family="sans-serif" font-size="11" fill="rgb(0,0,0)">Hello</text></svg>',
      FONT_PATH,
      FONT_FAMILY,
    );
    expect(labeled.equals(blank)).toBe(false);
  });

  it("resolves the generic sans-serif family this port's own SVG output always uses to the given font", () => {
    // If `sansSerifFamily` weren't wired up, resvg would fall back to
    // its own built-in default font for a `font-family="sans-serif"`
    // element (since `loadSystemFonts: false` means it can't fall back
    // to a system one either) - rendering the same text with an
    // explicit, unmapped family name would then look different from
    // the plain "sans-serif" case. Using the font's own real family
    // name directly should look identical to relying on the mapping.
    const viaGeneric = renderPng(
      '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40">' +
        '<text x="10" y="20" font-family="sans-serif" font-size="11" fill="rgb(0,0,0)">Hello</text></svg>',
      FONT_PATH,
      FONT_FAMILY,
    );
    const viaRealName = renderPng(
      `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40">` +
        `<text x="10" y="20" font-family="${FONT_FAMILY}" font-size="11" fill="rgb(0,0,0)">Hello</text></svg>`,
      FONT_PATH,
      FONT_FAMILY,
    );
    expect(viaGeneric).toEqual(viaRealName);
  });
});
