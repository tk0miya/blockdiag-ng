// Ported from `noderenderer/flowchart/database.py`'s `render_vector_shape`
// - a cylinder outline (two arcs joined by straight sides) plus a
// second, separate arc drawn on top as its highlighted "cap" (not drawn
// for the shadow branch - just the outline, shifted). Like
// `roundedbox`/`cloud`, the original's alternate raster
// `render_shape`/`render_shape_background` is out of scope for an
// SVG-only port. A background image is deferred to a later step, same as
// box.ts.
import type { DiagramNode } from "../../model/elements.js";
import type { Box, Point } from "../geometry.js";
import { boxBottomRight, boxTopLeft } from "../geometry.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { RenderMode } from "../render-mode.js";
import { SHADOW_COLOR, shiftShadowPoint } from "../shadow.js";
import type { SvgDocument } from "../svg-document.js";

function outlinePath(topLeft: Point, bottomRight: Point, r: number, halfWidth: number): string {
  return [
    `M ${topLeft.x} ${topLeft.y + r}`,
    `A${halfWidth},${r} 0 0 1 ${bottomRight.x} ${topLeft.y + r}`,
    `L ${bottomRight.x} ${bottomRight.y - r}`,
    `A${halfWidth},${r} 0 0 1 ${topLeft.x} ${bottomRight.y - r}`,
    `L ${topLeft.x} ${topLeft.y + r}`,
  ].join(" ");
}

export function renderFlowchartDatabaseNode(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  node: DiagramNode,
  mode: RenderMode,
): void {
  const box = nodeBox(metrics, node);
  const r = metrics.cellSize;
  const halfWidth = Math.floor(metrics.nodeWidth / 2);
  const topLeft = boxTopLeft(box);
  const bottomRight = boxBottomRight(box);

  if (mode.kind === "shadow") {
    const path = outlinePath(shiftShadowPoint(topLeft), shiftShadowPoint(bottomRight), r, halfWidth);
    doc.path(path, { fill: SHADOW_COLOR, outline: SHADOW_COLOR, filter: mode.filter });
    return;
  }

  doc.path(outlinePath(topLeft, bottomRight, r, halfWidth), {
    fill: node.color,
    outline: node.linecolor,
    style: node.style,
  });

  const cap = [`M ${bottomRight.x} ${topLeft.y + r}`, `A${halfWidth},${r} 0 0 1 ${topLeft.x} ${topLeft.y + r}`].join(
    " ",
  );
  doc.path(cap, { fill: node.color, outline: node.linecolor, style: node.style });

  if (node.label !== null) {
    const textBox: Box = {
      x1: topLeft.x,
      y1: topLeft.y + Math.floor((r * 3) / 2),
      x2: bottomRight.x,
      y2: bottomRight.y - Math.floor(r / 2),
    };
    doc.textarea(textBox, node.label, mode.font, mode.fontSize, { fill: node.textcolor, halign: "center" });
  }
}
