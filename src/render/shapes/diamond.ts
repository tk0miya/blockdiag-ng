// Ported from `noderenderer/diamond.py`: a diamond whose four points
// extend `cellsize` beyond the midpoint of each of the node's own box
// edges, with its label inset to the (smaller) box those points'
// midpoints describe. Plus its shadow branch and a `background` image,
// drawn into that same inset box, over the diamond's own fill and under
// its outline (so the outline stays crisp on top of it).
import type { DiagramNode } from "../../model/elements.js";
import type { Font } from "../font-metrics.js";
import type { Box, Point } from "../geometry.js";
import { boxBottom, boxLeft, boxRight, boxTop } from "../geometry.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { RenderMode } from "../render-mode.js";
import { SHADOW_COLOR, shiftShadowPoints } from "../shadow.js";
import type { Connectors, NodeShape } from "../shape-registry.js";
import type { SvgDocument } from "../svg-document.js";

export function renderDiamondNode(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  node: DiagramNode,
  font: Font,
  fontSize: number,
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
    doc.textarea(textBox, node.label, font, fontSize, { fill: node.textcolor, halign: "center" });
  }
}

// Ported from `diamond.py`: the node's own box edge midpoints, each
// pushed further out by `cellsize` - matching the diamond's own drawn
// points above. Also used for `flowchart.condition` (shapes/index.ts),
// which shares this shape's identical geometry.
function diamondConnectors(metrics: DiagramMetrics, node: DiagramNode): Connectors {
  const box = nodeBox(metrics, node);
  const r = metrics.cellSize;
  const top = boxTop(box);
  const right = boxRight(box);
  const bottom = boxBottom(box);
  const left = boxLeft(box);
  return {
    top: { x: top.x, y: top.y - r },
    right: { x: right.x + r, y: right.y },
    bottom: { x: bottom.x, y: bottom.y + r },
    left: { x: left.x - r, y: left.y },
  };
}

// `getTextBox` is `null` for now - diamond.py's own textbox (the inset
// box computed inline in renderDiamondNode()) is added once icon.ts's
// textbox resolution covers shapes beyond the plain box default.
export const diamondShape: NodeShape = {
  render: renderDiamondNode,
  getConnectors: diamondConnectors,
  getTextBox: null,
};
