// Text size measurement, needed to fold a label into lines that fit its
// box (`text-folder.ts`) before rendering it. Ported from the original's
// `ttfont.getsize()`/`getlength()` calls (vendor/blockdiag/src/blockdiag/
// imagedraw/png.py's `textlinesize()`), which measure a string by
// rendering it with FreeType via Pillow. This port instead measures each
// glyph directly (via fontkit, a pure JS font parser - no rendering
// engine): width sums each glyph's design advance, height spans the
// tallest/lowest glyph ink extents actually present in the string: both
// scaled from font design units to pixels at the given size. That gives
// the same width to within FreeType's own sub-pixel hinting adjustments
// (e.g. "Hello World" at 11pt in the bundled VL Gothic: 60.5px here vs.
// Pillow's 61.0px) - close enough, consistent with this project's
// general tolerance for exact-pixel differences (see the SVG/SSIM
// comparison policy).
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

export function measureTextHeight(font: Font, text: string, fontSize: number): number {
  const run = font.layout(text);
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const glyph of run.glyphs) {
    minY = Math.min(minY, glyph.bbox.minY);
    maxY = Math.max(maxY, glyph.bbox.maxY);
  }
  // No glyph contributed any ink (e.g. an empty or whitespace-only
  // string), so there's no extent to measure.
  if (minY > maxY) return 0;
  return ((maxY - minY) / font.unitsPerEm) * fontSize;
}
