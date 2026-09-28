// Ported from `noderenderer/circle.py`: a circle sized to just enclose
// the node's own box (its radius grows with whichever of the box's own
// width/height is smaller - unlike `square`, which always uses the
// diagram-wide default size regardless of the node's own box). Plus its
// shadow branch and a `background` image, drawn over the shape's own
// fill and under its outline (so the outline stays crisp on top of it).
import type { DiagramNode } from "../../model/elements.js";
import type { Font } from "../font-metrics.js";
import type { Box } from "../geometry.js";
import { boxCenter, boxHeight, boxWidth } from "../geometry.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { RenderMode } from "../render-mode.js";
import { SHADOW_COLOR, shiftShadowBox } from "../shadow.js";
import type { Connectors, NodeShape } from "../shape-registry.js";
import type { SvgDocument } from "../svg-document.js";

export function renderCircleNode(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  node: DiagramNode,
  font: Font,
  fontSize: number,
  mode: RenderMode,
): void {
  const cell = nodeBox(metrics, node);
  const r = Math.floor(Math.min(boxWidth(cell), boxHeight(cell)) / 2) + Math.floor(metrics.cellSize / 2);
  const center = boxCenter(cell);
  const box: Box = { x1: center.x - r, y1: center.y - r, x2: center.x + r, y2: center.y + r };

  if (mode.kind === "shadow") {
    doc.ellipse(shiftShadowBox(box), { fill: SHADOW_COLOR, outline: SHADOW_COLOR, filter: mode.filter });
    return;
  }

  if (node.background !== null) {
    doc.ellipse(box, { fill: node.color, outline: node.color });
    doc.image(box, node.background);
    doc.ellipse(box, { outline: node.linecolor, style: node.style });
  } else {
    doc.ellipse(box, { fill: node.color, outline: node.linecolor, style: node.style });
  }
  if (node.label !== null) {
    doc.textarea(box, node.label, font, fontSize, { fill: node.textcolor, halign: "center" });
  }
}

// Ported from `circle.py`: a circle enclosing the node's own box
// (radius grows with the box's own possibly-custom width/height, unlike
// `square`'s connectors - see square.ts). Connectors sit at that
// circle's own top/right/bottom/left, same as its drawn outline.
function circleConnectors(metrics: DiagramMetrics, node: DiagramNode): Connectors {
  const box = nodeBox(metrics, node);
  const r = Math.floor(Math.min(boxWidth(box), boxHeight(box)) / 2) + Math.floor(metrics.cellSize / 2);
  const center = boxCenter(box);
  return {
    top: { x: center.x, y: center.y - r },
    right: { x: center.x + r, y: center.y },
    bottom: { x: center.x, y: center.y + r },
    left: { x: center.x - r, y: center.y },
  };
}

// `getTextBox` is `null` for now - circle.py's own textbox (the same
// circle `getConnectors` describes) is added once icon.ts's textbox
// resolution covers shapes beyond the plain box default.
export const circleShape: NodeShape = { render: renderCircleNode, getConnectors: circleConnectors, getTextBox: null };
