// Ported from `noderenderer/cloud.py`'s `render_vector_shape` - the
// SVG-specific outline (a single "cloud" path built from 8 elliptical
// arcs). Like `roundedbox`, the original's alternate raster
// `render_shape`/`render_shape_background` (composited ellipses and
// rectangles) is out of scope for an SVG-only port. Shadow/
// background-image branches deferred to Step 17, same as box.ts.
import type { DiagramNode } from "../../model/elements.js";
import type { Font } from "../font-metrics.js";
import type { Box, Point } from "../geometry.js";
import { boxTopLeft } from "../geometry.js";
import type { DiagramMetrics } from "../metrics.js";
import { effectiveSize, nodeBox } from "../metrics.js";
import type { SvgDocument } from "../svg-document.js";

// Ported from the `pathdata` calls in `render_vector_shape`: 8
// elliptical bumps outlining a cloud shape, `rx`/`ry` apart.
function cloudPath(topLeft: Point, rx: number, ry: number): string {
  const x = (n: number) => topLeft.x + rx * n;
  const y = (n: number) => topLeft.y + ry * n;
  return [
    `M ${x(2)} ${y(2)}`,
    `A${rx * 2},${ry} 0 0 1 ${x(4)} ${y(1)}`,
    `A${rx * 2},${Math.floor((ry * 3) / 4)} 0 0 1 ${x(9)} ${y(1)}`,
    `A${rx * 2},${ry} 0 0 1 ${x(11)} ${y(2)}`,
    `A${rx * 2},${ry} 0 0 1 ${x(11)} ${y(4)}`,
    `A${rx * 2},${Math.floor((ry * 5) / 2)} 0 0 1 ${x(8)} ${y(4)}`,
    `A${rx * 2},${Math.floor((ry * 5) / 2)} 0 0 1 ${x(5)} ${y(4)}`,
    `A${rx * 2},${Math.floor((ry * 5) / 2)} 0 0 1 ${x(2)} ${y(4)}`,
    `A${rx * 2},${ry} 0 0 1 ${x(2)} ${y(2)}`,
  ].join(" ");
}

export function renderCloudNode(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  font: Font,
  fontSize: number,
  node: DiagramNode,
): void {
  const box = nodeBox(metrics, node);
  const rx = Math.floor(effectiveSize(node.width, metrics.nodeWidth) / 12);
  const ry = Math.floor(effectiveSize(node.height, metrics.nodeHeight) / 5);
  const topLeft = boxTopLeft(box);

  doc.path(cloudPath(topLeft, rx, ry), { fill: node.color, outline: node.linecolor, style: node.style });

  if (node.label !== null) {
    const textBox: Box = {
      x1: topLeft.x + rx * 2,
      y1: topLeft.y + ry,
      x2: topLeft.x + rx * 11,
      y2: topLeft.y + ry * 4,
    };
    doc.textarea(textBox, node.label, font, fontSize, { fill: node.textcolor, halign: "center" });
  }
}
