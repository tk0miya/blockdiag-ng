// Ported from `noderenderer/flowchart/input.py`: a parallelogram,
// slanted inward at the top. Plus its shadow branch. A background
// image is deferred to a later step, same as box.ts.
import type { DiagramNode } from "../../model/elements.js";
import type { Box } from "../geometry.js";
import { boxBottomLeft, boxBottomRight, boxTopLeft, boxTopRight } from "../geometry.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { RenderMode } from "../render-mode.js";
import { SHADOW_COLOR, shiftShadowPoints } from "../shadow.js";
import type { SvgDocument } from "../svg-document.js";

export function renderFlowchartInputNode(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  node: DiagramNode,
  mode: RenderMode,
): void {
  const box = nodeBox(metrics, node);
  const r = metrics.cellSize * 3;
  const topLeft = boxTopLeft(box);
  const topRight = boxTopRight(box);
  const bottomRight = boxBottomRight(box);
  const bottomLeft = boxBottomLeft(box);

  const shape = [
    { x: topLeft.x + r, y: topLeft.y },
    topRight,
    { x: bottomRight.x - r, y: bottomRight.y },
    bottomLeft,
    { x: topLeft.x + r, y: topLeft.y },
  ];

  if (mode.kind === "shadow") {
    doc.polygon(shiftShadowPoints(shape), { fill: SHADOW_COLOR, outline: SHADOW_COLOR, filter: mode.filter });
    return;
  }

  doc.polygon(shape, { fill: node.color, outline: node.linecolor, style: node.style });

  if (node.label !== null) {
    const textBox: Box = { x1: topLeft.x + r, y1: topLeft.y, x2: bottomRight.x - r, y2: bottomRight.y };
    doc.textarea(textBox, node.label, mode.font, mode.fontSize, { fill: node.textcolor, halign: "center" });
  }
}
