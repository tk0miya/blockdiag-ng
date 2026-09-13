// Ported from `noderenderer/circle.py`: a circle sized to just enclose
// the node's own box (its radius grows with whichever of the box's own
// width/height is smaller - unlike `square`, which always uses the
// diagram-wide default size regardless of the node's own box). Plus its
// shadow branch. A background image is deferred to Step 17c, same as
// box.ts.
import type { DiagramNode } from "../../model/elements.js";
import type { Box } from "../geometry.js";
import { boxCenter, boxHeight, boxWidth } from "../geometry.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { RenderMode } from "../render-mode.js";
import { SHADOW_COLOR, shiftShadowBox } from "../shadow.js";
import type { SvgDocument } from "../svg-document.js";

export function renderCircleNode(doc: SvgDocument, metrics: DiagramMetrics, node: DiagramNode, mode: RenderMode): void {
  const cell = nodeBox(metrics, node);
  const r = Math.floor(Math.min(boxWidth(cell), boxHeight(cell)) / 2) + Math.floor(metrics.cellSize / 2);
  const center = boxCenter(cell);
  const box: Box = { x1: center.x - r, y1: center.y - r, x2: center.x + r, y2: center.y + r };

  if (mode.kind === "shadow") {
    doc.ellipse(shiftShadowBox(box), { fill: SHADOW_COLOR, outline: SHADOW_COLOR, filter: mode.filter });
    return;
  }

  doc.ellipse(box, { fill: node.color, outline: node.linecolor, style: node.style });
  if (node.label !== null) {
    doc.textarea(box, node.label, mode.font, mode.fontSize, { fill: node.textcolor, halign: "center" });
  }
}
