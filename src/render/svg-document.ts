// Ported from `SVGImageDraw`/`SVGImageDrawElement` (vendor/blockdiag/src/
// blockdiag/imagedraw/svg.py): builds the SVG document as a plain string,
// rather than through a DOM-like element-tree library as the original
// does (`imagedraw/simplesvg.py`) - a diagram's whole SVG output is
// static text by the time anything needs it, so there's no need for a
// mutable element tree in between.
import type { Color } from "../model/elements.js";
import type { Size } from "./geometry.js";
import { type Box, boxHeight, boxWidth } from "./geometry.js";

// Ported from `svg.py`'s module-level `rgb()`: `"none"` (this port's
// stand-in for the original's untranslated color values, see
// model/elements.ts's `Color` type) passes through unchanged; an actual
// color becomes the `rgb(r,g,b)` CSS form.
function cssColor(color: Color): string {
  return color === "none" ? "none" : `rgb(${color[0]},${color[1]},${color[2]})`;
}

export class SvgDocument {
  private readonly elements: string[] = [];

  // Ported from `rectangle()`. `filter: "blur"` is the soft, blurred
  // backdrop the original always draws behind a box-shaped group (not to
  // be confused with a node's own drop shadow, which is a separate,
  // `shadow_style`-controlled thing added once node shapes exist).
  rectangle(box: Box, options: { readonly fill: Color; readonly filter?: "blur" }): void {
    const style = options.filter === "blur" ? ` style="filter:url(#filter_blur)"` : "";
    this.elements.push(
      `<rect x="${box.x1}" y="${box.y1}" width="${boxWidth(box)}" height="${boxHeight(box)}" fill="${cssColor(options.fill)}"${style}/>`,
    );
  }

  // Ported from `SVGImageDraw.set_canvas_size()` (the `<svg>` root, its
  // `<title>`, and the Gaussian-blur filter definition every group
  // background references) plus `SVGImageDraw.save()` (which just
  // serializes the tree `set_canvas_size()` and the drawing calls built
  // up). Combined here since, unlike the original, nothing here needs to
  // read the tree back before it's complete. The original also embeds
  // the diagram source as a `<desc>`; left out until a later step
  // actually needs it.
  toString(size: Size): string {
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size.width}" height="${size.height}">` +
      `<defs><filter id="filter_blur"><feGaussianBlur stdDeviation="4.2"/></filter></defs>` +
      `<title>blockdiag</title>` +
      this.elements.join("") +
      `</svg>`
    );
  }
}
