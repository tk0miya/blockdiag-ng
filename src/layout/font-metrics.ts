// Text width calculation, needed by layout to size nodes/groups around
// their labels. Ported from the original's use of Pillow's
// `ImageFont.getlength()` (vendor/blockdiag/src/blockdiag/imagedraw/
// png.py's `ttfont.getsize()`/`getlength()`), which measures a string by
// rendering it with FreeType. This port instead sums each glyph's design
// advance width (via fontkit, a pure JS font parser - no rendering
// engine), scaled from font design units to pixels at the given size.
// That gives the same width to within FreeType's own sub-pixel hinting
// adjustments (e.g. "Hello World" at 11pt in the bundled VL Gothic:
// 60.5px here vs. Pillow's 61.0px) - close enough for layout purposes,
// consistent with this project's general tolerance for exact-pixel
// differences (see the SVG/SSIM comparison policy).
import * as fontkit from "fontkit";

export type Font = fontkit.Font;

export function loadFont(path: string): Font {
  const result = fontkit.openSync(path);
  // A .ttc font collection (e.g. Windows' msgothic.ttc, one of the
  // original's detected fonts) bundles multiple fonts in one file; this
  // just takes the first, since nothing here needs to pick a specific
  // one out of a collection.
  return "fonts" in result ? result.fonts[0] : result;
}

export function measureTextWidth(font: Font, text: string, fontSize: number): number {
  const run = font.layout(text);
  const widthInUnits = run.positions.reduce((sum, position) => sum + position.xAdvance, 0);
  return (widthInUnits / font.unitsPerEm) * fontSize;
}
