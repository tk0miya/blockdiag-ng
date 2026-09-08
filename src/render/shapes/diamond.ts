// Ported from `noderenderer/diamond.py`: a diamond whose four points
// extend `cellsize` beyond the midpoint of each of the node's own box
// edges, with its label inset to the (smaller) box those points'
// midpoints describe. Plus its shadow branch and a `background` image,
// drawn into that same inset box, over the diamond's own fill and under
// its outline (so the outline stays crisp on top of it).
import type { DiagramNode } from "../../model/elements.js";
import type { Box, Point } from "../geometry.js";
import { boxBottom, boxLeft, boxRight, boxTop } from "../geometry.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { RenderMode } from "../render-mode.js";
import { SHADOW_COLOR, shiftShadowPoints } from "../shadow.js";
import type { SvgDocument } from "../svg-document.js";

export function renderDiamondNode(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  node: DiagramNode,
  mode: RenderMode,
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

  if (mode.kind === "shadow") {
    doc.polygon(shiftShadowPoints(connectors), { fill: SHADOW_COLOR, outline: SHADOW_COLOR, filter: mode.filter });
    return;
  }

  const textBox: Box = {
    x1: Math.floor((top.x + left.x) / 2),
    y1: Math.floor((top.y + left.y) / 2),
    x2: Math.floor((right.x + bottom.x) / 2),
    y2: Math.floor((right.y + bottom.y) / 2),
  };

  if (node.background !== null) {
    doc.polygon(connectors, { fill: node.color, outline: node.color });
    doc.image(textBox, node.background);
    doc.polygon(connectors, { outline: node.linecolor, style: node.style });
  } else {
    doc.polygon(connectors, { fill: node.color, outline: node.linecolor, style: node.style });
  }

  if (node.label !== null) {
    doc.textarea(textBox, node.label, mode.font, mode.fontSize, { fill: node.textcolor, halign: "center" });
  }
}
