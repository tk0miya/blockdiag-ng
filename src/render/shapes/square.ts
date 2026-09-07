// Ported from `noderenderer/square.py`: a fixed-size square centered on
// the node's own cell, regardless of that node's own `width`/`height`
// override - `r` is derived from the diagram-wide default node size,
// not the node's own (verified against the original: `A [shape =
// square, width = 300]` renders the same 48x48 square as plain `A`).
// Shadow/background-image branches deferred to Step 17, same as box.ts.
import type { DiagramNode } from "../../model/elements.js";
import type { Font } from "../font-metrics.js";
import type { Box } from "../geometry.js";
import { boxCenter } from "../geometry.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { SvgDocument } from "../svg-document.js";

export function renderSquareNode(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  font: Font,
  fontSize: number,
  node: DiagramNode,
): void {
  const r = Math.floor(Math.min(metrics.nodeWidth, metrics.nodeHeight) / 2) + Math.floor(metrics.cellSize / 2);
  const center = boxCenter(nodeBox(metrics, node));
  const box: Box = { x1: center.x - r, y1: center.y - r, x2: center.x + r, y2: center.y + r };

  doc.rectangle(box, { fill: node.color, outline: node.linecolor, style: node.style });
  if (node.label !== null) {
    doc.textarea(box, node.label, font, fontSize, { fill: node.textcolor, halign: "center" });
  }
}
