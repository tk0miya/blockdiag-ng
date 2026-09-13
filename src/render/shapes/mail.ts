// Ported from `noderenderer/mail.py`: a box with an envelope's "flap"
// line drawn across its top, and a label inset below the flap.
// Shadow/background-image branches deferred to Step 17, same as
// box.ts.
import type { DiagramNode } from "../../model/elements.js";
import type { Font } from "../font-metrics.js";
import type { Box } from "../geometry.js";
import { boxTop, boxTopLeft, boxTopRight } from "../geometry.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { SvgDocument } from "../svg-document.js";

export function renderMailNode(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  font: Font,
  fontSize: number,
  node: DiagramNode,
): void {
  const box = nodeBox(metrics, node);
  const r = metrics.cellSize * 2;

  doc.rectangle(box, { fill: node.color, outline: node.linecolor, style: node.style });

  const top = boxTop(box);
  doc.line([boxTopLeft(box), { x: top.x, y: top.y + r }, boxTopRight(box)], {
    fill: node.linecolor,
    style: node.style,
  });

  if (node.label !== null) {
    const textBox: Box = { x1: box.x1, y1: box.y1 + r, x2: box.x2, y2: box.y2 };
    doc.textarea(textBox, node.label, font, fontSize, { fill: node.textcolor, halign: "center" });
  }
}
