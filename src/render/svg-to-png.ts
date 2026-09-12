// Step 22's own PNG output ("SVG→PNG変換パイプライン") - no direct
// Python counterpart to port: the original renders PNG through a wholly
// separate PIL-based backend (`imagedraw/png.py`), but this port already
// has a working, tested SVG renderer, so PNG output here is just that
// same SVG rasterized by `@resvg/resvg-js` (a Rust `resvg` binding)
// instead - a deliberately different architecture, not a port of one.
// The font is
// embedded explicitly at conversion time - `loadSystemFonts: false`
// means rendering never depends on what's installed on the host -
// rather than hardcoding a specific font's own family name here,
// `fontFamily` is passed in by the caller (already resolved once via
// `loadFont()`'s own `Font.familyName`, matching what draws every
// label in the SVG this rasterizes). Set as both the fallback
// (`defaultFontFamily`) and the generic-family mapping
// (`sansSerifFamily`), since this port's own SVG output always emits
// the literal `font-family="sans-serif"` (see svg-document.ts's own
// comment on why), never a real family name.
import { Resvg } from "@resvg/resvg-js";

export function renderPng(svg: string, fontPath: string, fontFamily: string): Buffer {
  const resvg = new Resvg(svg, {
    font: {
      fontFiles: [fontPath],
      loadSystemFonts: false,
      defaultFontFamily: fontFamily,
      sansSerifFamily: fontFamily,
    },
  });
  return resvg.render().asPng();
}
