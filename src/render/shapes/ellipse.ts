// Ported from `noderenderer/ellipse.py`: an ellipse filling the node's
// whole cell (unlike `circle`, which insets its own bounding box - this
// draws straight into the cell box itself). Its label wraps within a
// narrower inset box instead, so it doesn't run into the ellipse's own
// curve. Shadow/background-image branches deferred to Step 17, same as
// box.ts.
import type { DiagramNode } from "../../model/elements.js";
import type { Font } from "../font-metrics.js";
import type { Box } from "../geometry.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { SvgDocument } from "../svg-document.js";

export function renderEllipseNode(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  font: Font,
  fontSize: number,
  node: DiagramNode,
): void {
  const box = nodeBox(metrics, node);
  doc.ellipse(box, { fill: node.color, outline: node.linecolor, style: node.style });

  if (node.label !== null) {
    const r = metrics.cellSize;
    const textBox: Box = { x1: box.x1 + r, y1: box.y1 + r, x2: box.x2 - r, y2: box.y2 - r };
    doc.textarea(textBox, node.label, font, fontSize, { fill: node.textcolor, halign: "center" });
  }
}
