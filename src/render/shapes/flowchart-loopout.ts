// Ported from `noderenderer/flowchart/loopout.py`: a box with its
// bottom-right corner notched inward - the mirror image of `loopin`'s
// notch. Plus its shadow branch. A background image is deferred to
// a later step, same as box.ts.
import type { DiagramNode } from "../../model/elements.js";
import type { Box } from "../geometry.js";
import { boxBottomLeft, boxBottomRight, boxTopLeft, boxTopRight } from "../geometry.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { RenderMode } from "../render-mode.js";
import { SHADOW_COLOR, shiftShadowPoints } from "../shadow.js";
import type { SvgDocument } from "../svg-document.js";

export function renderFlowchartLoopoutNode(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  node: DiagramNode,
  mode: RenderMode,
): void {
  const box = nodeBox(metrics, node);
  const xdiff = Math.floor(metrics.nodeWidth / 4);
  const ydiff = Math.floor(metrics.nodeHeight / 4);
  const topLeft = boxTopLeft(box);
  const topRight = boxTopRight(box);
  const bottomRight = boxBottomRight(box);
  const bottomLeft = boxBottomLeft(box);

  const shape = [
    topLeft,
    topRight,
    { x: bottomRight.x, y: bottomRight.y - ydiff },
    { x: bottomRight.x - xdiff, y: bottomRight.y },
    { x: bottomLeft.x + xdiff, y: bottomLeft.y },
    { x: bottomLeft.x, y: bottomLeft.y - ydiff },
    topLeft,
  ];

  if (mode.kind === "shadow") {
    doc.polygon(shiftShadowPoints(shape), { fill: SHADOW_COLOR, outline: SHADOW_COLOR, filter: mode.filter });
    return;
  }

  doc.polygon(shape, { fill: node.color, outline: node.linecolor, style: node.style });

  if (node.label !== null) {
    const textBox: Box = { x1: topLeft.x, y1: topLeft.y, x2: bottomRight.x, y2: bottomRight.y - ydiff };
    doc.textarea(textBox, node.label, mode.font, mode.fontSize, { fill: node.textcolor, halign: "center" });
  }
}
