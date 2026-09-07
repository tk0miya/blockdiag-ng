// Ported from `noderenderer/minidiamond.py`: a small, fixed-size
// diamond marker (radius `cellsize`, centered on the node) with its
// label to the right, left-aligned, in the box's upper-right quadrant.
// Shadow branch deferred to Step 17, same as box.ts (this shape has no
// background-image branch to begin with).

import type { DiagramNode } from "../../model/elements.js";
import type { Font } from "../font-metrics.js";
import type { Box, Point } from "../geometry.js";
import { boxCenter, boxRight, boxTop } from "../geometry.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { SvgDocument } from "../svg-document.js";

export function renderMinidiamondNode(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  font: Font,
  fontSize: number,
  node: DiagramNode,
): void {
  const box = nodeBox(metrics, node);
  const r = metrics.cellSize;
  const center = boxCenter(box);
  const top: Point = { x: center.x, y: center.y - r };
  const right: Point = { x: center.x + r, y: center.y };
  const bottom: Point = { x: center.x, y: center.y + r };
  const left: Point = { x: center.x - r, y: center.y };
  const connectors = [top, right, bottom, left, top];

  doc.polygon(connectors, { fill: node.color, outline: node.linecolor, style: node.style });

  if (node.label !== null) {
    const boxTopPoint = boxTop(box);
    const boxRightPoint = boxRight(box);
    const textBox: Box = { x1: boxTopPoint.x, y1: boxTopPoint.y, x2: boxRightPoint.x, y2: boxRightPoint.y };
    doc.textarea(textBox, node.label, font, fontSize, { fill: node.textcolor, halign: "left" });
  }
}
