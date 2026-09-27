// Ported from `noderenderer/minidiamond.py`: a small, fixed-size
// diamond marker (radius `cellsize`, centered on the node) with its
// label to the right, left-aligned, in the box's upper-right quadrant.
// Plus its shadow branch (this shape has no background-image branch to
// begin with).
import type { DiagramNode } from "../../model/elements.js";
import type { Font } from "../font-metrics.js";
import type { Box, Point } from "../geometry.js";
import { boxCenter, boxRight, boxTop } from "../geometry.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { RenderMode } from "../render-mode.js";
import { SHADOW_COLOR, shiftShadowPoints } from "../shadow.js";
import type { NodeShape } from "../shape-registry.js";
import type { SvgDocument } from "../svg-document.js";

export function renderMinidiamondNode(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  node: DiagramNode,
  font: Font,
  fontSize: number,
  mode: RenderMode,
): void {
  const box = nodeBox(metrics, node);
  const r = metrics.cellSize;
  const center = boxCenter(box);
  const top: Point = { x: center.x, y: center.y - r };
  const right: Point = { x: center.x + r, y: center.y };
  const bottom: Point = { x: center.x, y: center.y + r };
  const left: Point = { x: center.x - r, y: center.y };
  const connectors = [top, right, bottom, left, top];

  if (mode.kind === "shadow") {
    doc.polygon(shiftShadowPoints(connectors), { fill: SHADOW_COLOR, outline: SHADOW_COLOR, filter: mode.filter });
    return;
  }

  doc.polygon(connectors, { fill: node.color, outline: node.linecolor, style: node.style });

  if (node.label !== null) {
    const boxTopPoint = boxTop(box);
    const boxRightPoint = boxRight(box);
    const textBox: Box = { x1: boxTopPoint.x, y1: boxTopPoint.y, x2: boxRightPoint.x, y2: boxRightPoint.y };
    doc.textarea(textBox, node.label, font, fontSize, { fill: node.textcolor, halign: "left" });
  }
}

// `getConnectors`/`getTextBox` are `null` for now - minidiamond.py's own
// fixed-radius connectors and textbox (computed inline above) are added
// once connectors.ts exists (Step 18a).
export const minidiamondShape: NodeShape = { render: renderMinidiamondNode, getConnectors: null, getTextBox: null };
