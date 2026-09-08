// Ported from `noderenderer/square.py`: a fixed-size square centered on
// the node's own cell, regardless of that node's own `width`/`height`
// override - `r` is derived from the diagram-wide default node size,
// not the node's own (verified against the original: `A [shape =
// square, width = 300]` renders the same 48x48 square as plain `A`).
// Plus its shadow branch and a `background` image, drawn over the
// shape's own fill and under its outline (so the outline stays crisp on
// top of it).
import type { DiagramNode } from "../../model/elements.js";
import type { Box } from "../geometry.js";
import { boxCenter } from "../geometry.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { RenderMode } from "../render-mode.js";
import { SHADOW_COLOR, shiftShadowBox } from "../shadow.js";
import type { SvgDocument } from "../svg-document.js";

export function renderSquareNode(doc: SvgDocument, metrics: DiagramMetrics, node: DiagramNode, mode: RenderMode): void {
  const r = Math.floor(Math.min(metrics.nodeWidth, metrics.nodeHeight) / 2) + Math.floor(metrics.cellSize / 2);
  const center = boxCenter(nodeBox(metrics, node));
  const box: Box = { x1: center.x - r, y1: center.y - r, x2: center.x + r, y2: center.y + r };

  if (mode.kind === "shadow") {
    doc.rectangle(shiftShadowBox(box), { fill: SHADOW_COLOR, outline: SHADOW_COLOR, filter: mode.filter });
    return;
  }

  if (node.background !== null) {
    doc.rectangle(box, { fill: node.color, outline: node.color });
    doc.image(box, node.background);
    doc.rectangle(box, { outline: node.linecolor, style: node.style });
  } else {
    doc.rectangle(box, { fill: node.color, outline: node.linecolor, style: node.style });
  }
  if (node.label !== null) {
    doc.textarea(box, node.label, mode.font, mode.fontSize, { fill: node.textcolor, halign: "center" });
  }
}
