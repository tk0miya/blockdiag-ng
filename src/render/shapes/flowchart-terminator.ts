// Ported from `noderenderer/flowchart/terminator.py`'s
// `render_vector_shape` - a "pill" (straight top/bottom, rounded left
// and right ends). Like `roundedbox`/`cloud`/`database`, the original's
// alternate raster `render_shape`/`render_shape_background` is out of
// scope for an SVG-only port. Shadow/background-image branches
// deferred to Step 17, same as box.ts.
import type { DiagramNode } from "../../model/elements.js";
import type { Font } from "../font-metrics.js";
import type { Box } from "../geometry.js";
import { boxBottomRight, boxTopLeft } from "../geometry.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { SvgDocument } from "../svg-document.js";

export function renderFlowchartTerminatorNode(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  font: Font,
  fontSize: number,
  node: DiagramNode,
): void {
  const box = nodeBox(metrics, node);
  const r = metrics.cellSize * 2;
  const halfHeight = metrics.nodeHeight / 2;
  const insetBox: Box = { x1: box.x1 + r, y1: box.y1, x2: box.x2 - r, y2: box.y2 };
  const topLeft = boxTopLeft(insetBox);
  const bottomRight = boxBottomRight(insetBox);

  const path = [
    `M ${topLeft.x} ${topLeft.y}`,
    `L ${bottomRight.x} ${topLeft.y}`,
    `A${r},${halfHeight} 0 0 1 ${bottomRight.x} ${bottomRight.y}`,
    `L ${topLeft.x} ${bottomRight.y}`,
    `A${r},${halfHeight} 0 0 1 ${topLeft.x} ${topLeft.y}`,
  ].join(" ");
  doc.path(path, { fill: node.color, outline: node.linecolor, style: node.style });

  if (node.label !== null) {
    doc.textarea(insetBox, node.label, font, fontSize, { fill: node.textcolor, halign: "center" });
  }
}
