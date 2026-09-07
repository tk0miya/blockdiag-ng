// Ported from `noderenderer/diamond.py`: a diamond whose four points
// extend `cellsize` beyond the midpoint of each of the node's own box
// edges, with its label inset to the (smaller) box those points'
// midpoints describe. Shadow/background-image branches deferred to
// Step 17, same as box.ts.
import type { DiagramNode } from "../../model/elements.js";
import type { Font } from "../font-metrics.js";
import type { Box, Point } from "../geometry.js";
import { boxBottom, boxLeft, boxRight, boxTop } from "../geometry.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { SvgDocument } from "../svg-document.js";

export function renderDiamondNode(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  font: Font,
  fontSize: number,
  node: DiagramNode,
): void {
  const box = nodeBox(metrics, node);
  const r = metrics.cellSize;
  const boxTopPoint = boxTop(box);
  const boxRightPoint = boxRight(box);
  const boxBottomPoint = boxBottom(box);
  const boxLeftPoint = boxLeft(box);
  const top: Point = { x: boxTopPoint.x, y: boxTopPoint.y - r };
  const right: Point = { x: boxRightPoint.x + r, y: boxRightPoint.y };
  const bottom: Point = { x: boxBottomPoint.x, y: boxBottomPoint.y + r };
  const left: Point = { x: boxLeftPoint.x - r, y: boxLeftPoint.y };
  const connectors = [top, right, bottom, left, top];

  doc.polygon(connectors, { fill: node.color, outline: node.linecolor, style: node.style });

  if (node.label !== null) {
    const textBox: Box = {
      x1: Math.floor((top.x + left.x) / 2),
      y1: Math.floor((top.y + left.y) / 2),
      x2: Math.floor((right.x + bottom.x) / 2),
      y2: Math.floor((right.y + bottom.y) / 2),
    };
    doc.textarea(textBox, node.label, font, fontSize, { fill: node.textcolor, halign: "center" });
  }
}
