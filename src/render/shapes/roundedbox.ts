// Ported from `noderenderer/roundedbox.py`'s `render_vector_shape` -
// the SVG-specific outline (a single rounded-rectangle path), plus its
// shadow branch. The original's `render_shape`/`render_shape_background`/
// `render_shape_outline` build the same look out of ellipses and
// rectangles instead, for raster backends with no path support; this
// port only ever targets SVG, so that alternate, more complex path
// isn't ported. A background image is deferred to Step 17c, same as
// box.ts.
import type { DiagramNode } from "../../model/elements.js";
import type { Box } from "../geometry.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { RenderMode } from "../render-mode.js";
import { SHADOW_COLOR, shiftShadowBox } from "../shadow.js";
import type { SvgDocument } from "../svg-document.js";

// Ported from `pathdata`'s calls in `render_vector_shape`: a rectangle
// with its four corners replaced by a quarter-circle arc of radius `r`.
function roundedRectPath(box: Box, r: number): string {
  return [
    `M ${box.x1 + r} ${box.y1}`,
    `L ${box.x2 - r} ${box.y1}`,
    `A${r},${r} 0 0 1 ${box.x2} ${box.y1 + r}`,
    `L ${box.x2} ${box.y2 - r}`,
    `A${r},${r} 0 0 1 ${box.x2 - r} ${box.y2}`,
    `L ${box.x1 + r} ${box.y2}`,
    `A${r},${r} 0 0 1 ${box.x1} ${box.y2 - r}`,
    `L ${box.x1} ${box.y1 + r}`,
    `A${r},${r} 0 0 1 ${box.x1 + r} ${box.y1}`,
  ].join(" ");
}

export function renderRoundedboxNode(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  node: DiagramNode,
  mode: RenderMode,
): void {
  const box = nodeBox(metrics, node);

  if (mode.kind === "shadow") {
    const path = roundedRectPath(shiftShadowBox(box), metrics.cellSize);
    doc.path(path, { fill: SHADOW_COLOR, outline: SHADOW_COLOR, filter: mode.filter });
    return;
  }

  doc.path(roundedRectPath(box, metrics.cellSize), { fill: node.color, outline: node.linecolor, style: node.style });
  if (node.label !== null) {
    doc.textarea(box, node.label, mode.font, mode.fontSize, { fill: node.textcolor, halign: "center" });
  }
}
