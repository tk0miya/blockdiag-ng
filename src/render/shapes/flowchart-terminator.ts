// Ported from `noderenderer/flowchart/terminator.py`'s
// `render_vector_shape` - a "pill" (straight top/bottom, rounded left
// and right ends), plus its shadow branch. Like
// `roundedbox`/`cloud`/`database`, the original's alternate raster
// `render_shape`/`render_shape_background` is out of scope for an
// SVG-only port. A background image is deferred to a later step, same as
// box.ts.
import type { DiagramNode } from "../../model/elements.js";
import type { Box } from "../geometry.js";
import { boxBottomRight, boxTopLeft } from "../geometry.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { RenderMode } from "../render-mode.js";
import { SHADOW_COLOR, shiftShadowBox } from "../shadow.js";
import type { SvgDocument } from "../svg-document.js";

function pillPath(box: Box, r: number, halfHeight: number): string {
  const topLeft = boxTopLeft(box);
  const bottomRight = boxBottomRight(box);
  return [
    `M ${topLeft.x} ${topLeft.y}`,
    `L ${bottomRight.x} ${topLeft.y}`,
    `A${r},${halfHeight} 0 0 1 ${bottomRight.x} ${bottomRight.y}`,
    `L ${topLeft.x} ${bottomRight.y}`,
    `A${r},${halfHeight} 0 0 1 ${topLeft.x} ${topLeft.y}`,
  ].join(" ");
}

export function renderFlowchartTerminatorNode(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  node: DiagramNode,
  mode: RenderMode,
): void {
  const box = nodeBox(metrics, node);
  const r = metrics.cellSize * 2;
  const halfHeight = metrics.nodeHeight / 2;
  const insetBox: Box = { x1: box.x1 + r, y1: box.y1, x2: box.x2 - r, y2: box.y2 };

  if (mode.kind === "shadow") {
    const path = pillPath(shiftShadowBox(insetBox), r, halfHeight);
    doc.path(path, { fill: SHADOW_COLOR, outline: SHADOW_COLOR, filter: mode.filter });
    return;
  }

  doc.path(pillPath(insetBox, r, halfHeight), { fill: node.color, outline: node.linecolor, style: node.style });

  if (node.label !== null) {
    doc.textarea(insetBox, node.label, mode.font, mode.fontSize, { fill: node.textcolor, halign: "center" });
  }
}
