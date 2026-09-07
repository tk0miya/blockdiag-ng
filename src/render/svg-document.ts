// Ported from `SVGImageDraw`/`SVGImageDrawElement` (vendor/blockdiag/src/
// blockdiag/imagedraw/svg.py): builds the SVG document as a plain string,
// rather than through a DOM-like element-tree library as the original
// does (`imagedraw/simplesvg.py`) - a diagram's whole SVG output is
// static text by the time anything needs it, so there's no need for a
// mutable element tree in between.
import type { Color, LineStyle } from "../model/elements.js";
import type { Font } from "./font-metrics.js";
import { measureTextHeight, measureTextWidth } from "./font-metrics.js";
import type { Box, Point, Size } from "./geometry.js";
import { boxHeight, boxWidth } from "./geometry.js";
import { foldText } from "./text-folder.js";

const WHITE: Color = [255, 255, 255];

// Ported from `svg.py`'s module-level `rgb()`: `"none"` (this port's
// stand-in for the original's untranslated color values, see
// model/elements.ts's `Color` type) passes through unchanged; an actual
// color becomes the `rgb(r,g,b)` CSS form.
function cssColor(color: Color): string {
  return color === "none" ? "none" : `rgb(${color[0]},${color[1]},${color[2]})`;
}

function escapeXmlText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Ported from `svg.py`'s module-level `dasharray()`: a `style`
// attribute's dash pattern, scaled by the line's own thickness (each
// backend does this scaling itself, independently - see model/
// elements.ts's `LineStyle` comment). `null` (no style, or `"solid"`,
// which the original never special-cases either) means a plain solid
// line - no `stroke-dasharray` at all.
function svgDasharray(style: LineStyle | null, thick: number | null): string | null {
  const t = thick ?? 1;
  if (style === null) return null;
  switch (style.type) {
    case "dotted":
      return String(2 * t);
    case "dashed":
      return String(4 * t);
    // A dash of length 0 separated by huge gaps: the original's way of
    // drawing an "invisible" line through a backend (like SVG) that has
    // no separate concept of "no stroke" alongside a real stroke color.
    case "none":
      return `0 ${65535 * t}`;
    case "custom":
      return style.pattern.map((n) => n * t).join(" ");
    case "solid":
      return null;
  }
}

export class SvgDocument {
  private readonly elements: string[] = [];

  // Ported from `rectangle()`. `filter: "blur"` is the soft, blurred
  // backdrop the original always draws behind a box-shaped group (not to
  // be confused with a node's own drop shadow, which is a separate,
  // `shadow_style`-controlled thing added once node shadows are, in
  // Step 17).
  rectangle(
    box: Box,
    options: {
      readonly fill?: Color;
      readonly outline?: Color;
      readonly style?: LineStyle | null;
      readonly filter?: "blur";
    },
  ): void {
    const dasharray = svgDasharray(options.style ?? null, null);
    const filterStyle = options.filter === "blur" ? `filter:url(#filter_blur)` : "";
    const style = [filterStyle].filter((s) => s !== "").join(";");
    this.elements.push(
      `<rect x="${box.x1}" y="${box.y1}" width="${boxWidth(box)}" height="${boxHeight(box)}"` +
        ` fill="${cssColor(options.fill ?? "none")}"` +
        (options.outline !== undefined ? ` stroke="${cssColor(options.outline)}"` : "") +
        (dasharray !== null ? ` stroke-dasharray="${dasharray}"` : "") +
        (style !== "" ? ` style="${style}"` : "") +
        `/>`,
    );
  }

  // Ported from `ellipse()`.
  ellipse(box: Box, options: { readonly fill?: Color; readonly outline?: Color }): void {
    const rx = boxWidth(box) / 2;
    const ry = boxHeight(box) / 2;
    const cx = box.x1 + rx;
    const cy = box.y1 + ry;
    this.elements.push(
      `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${cssColor(options.fill ?? "none")}"` +
        (options.outline !== undefined ? ` stroke="${cssColor(options.outline)}"` : "") +
        `/>`,
    );
  }

  // Ported from `polygon()`, including its own truncation of each point
  // to a whole number (`'%d,%d' % pt`) - unlike every other primitive
  // here, which keeps a coordinate's fractional part.
  polygon(points: readonly Point[], options: { readonly fill?: Color; readonly outline?: Color }): void {
    const pointList = points.map((p) => `${Math.trunc(p.x)},${Math.trunc(p.y)}`).join(" ");
    this.elements.push(
      `<polygon points="${pointList}" fill="${cssColor(options.fill ?? "none")}"` +
        (options.outline !== undefined ? ` stroke="${cssColor(options.outline)}"` : "") +
        `/>`,
    );
  }

  // Ported from `line()`: a polyline drawn as an SVG path (`fill="none"`,
  // just a stroked outline), matching the original's own choice to
  // render every line - straight or jumped-over-a-crossing - as a path.
  line(
    points: readonly Point[],
    options: { readonly fill: Color; readonly thick?: number | null; readonly style?: LineStyle | null },
  ): void {
    const [first, ...rest] = points;
    if (first === undefined) return;
    const dasharray = svgDasharray(options.style ?? null, options.thick ?? null);
    const path = [`M ${first.x} ${first.y}`, ...rest.map((p) => `L ${p.x} ${p.y}`)].join(" ");
    this.elements.push(
      `<path d="${path}" fill="none" stroke="${cssColor(options.fill)}"` +
        (options.thick != null ? ` stroke-width="${options.thick}"` : "") +
        (dasharray !== null ? ` stroke-dasharray="${dasharray}"` : "") +
        `/>`,
    );
  }

  // Ported from `text()`. The original also emits `font-family`/
  // `font-weight`/`font-style` parsed out of the element's `fontfamily`
  // DSL string (e.g. "serif-bold"); that parsing is deferred to Step 20
  // ("style attributes"), so every label renders as plain sans-serif
  // for now.
  text(point: Point, textContent: string, font: Font, fontSize: number, options: { readonly fill: Color }): void {
    const width = measureTextWidth(font, textContent, fontSize);
    const x = point.x + width / 2;
    this.elements.push(
      `<text x="${x}" y="${point.y}" font-family="sans-serif" font-size="${fontSize}" font-weight="normal" font-style="normal"` +
        ` text-anchor="middle" textLength="${width}" fill="${cssColor(options.fill)}">${escapeXmlText(textContent)}</text>`,
    );
  }

  // Ported from `textarea()`. Two things the original does are left out
  // for now, both rare enough to defer rather than build out speculatively:
  // rotated labels (`rotate` != 0, `label_orientation = vertical`), and
  // retrying at 80% font size when nothing fit at all (only reachable
  // from a box too small for even a single character).
  textarea(
    box: Box,
    textContent: string,
    font: Font,
    fontSize: number,
    options: {
      readonly fill: Color;
      readonly halign?: "left" | "center" | "right";
      readonly valign?: "top" | "center" | "bottom";
      readonly outline?: Color;
    },
  ): void {
    const measure = (text: string): Size => ({
      width: measureTextWidth(font, text, fontSize),
      height: measureTextHeight(font, text, fontSize),
    });
    const folded = foldText(box, textContent, measure, { halign: options.halign, valign: options.valign });

    if (options.outline !== undefined) {
      this.rectangle(folded.outlineBox, { fill: WHITE, outline: options.outline });
    }
    for (const line of folded.lines) {
      this.text(line.point, line.text, font, fontSize, { fill: options.fill });
    }
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
