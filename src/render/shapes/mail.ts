// Ported from `noderenderer/mail.py`: a box with an envelope's "flap"
// line drawn across its top, and a label inset below the flap. Plus its
// shadow branch - the flap line is skipped for shadow, same as the
// fold crease in note.ts. Plus a `background` image, drawn into the
// inset-below-the-flap box (like the label), over the box's own fill
// and under its outline (so the outline stays crisp on top of it).
import type { DiagramNode } from "../../model/elements.js";
import type { Box } from "../geometry.js";
import { boxTop, boxTopLeft, boxTopRight } from "../geometry.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { RenderMode } from "../render-mode.js";
import { SHADOW_COLOR, shiftShadowBox } from "../shadow.js";
import type { SvgDocument } from "../svg-document.js";

export function renderMailNode(doc: SvgDocument, metrics: DiagramMetrics, node: DiagramNode, mode: RenderMode): void {
  const box = nodeBox(metrics, node);
  const r = metrics.cellSize * 2;

  if (mode.kind === "shadow") {
    doc.rectangle(shiftShadowBox(box), { fill: SHADOW_COLOR, outline: SHADOW_COLOR, filter: mode.filter });
    return;
  }

  const textBox: Box = { x1: box.x1, y1: box.y1 + r, x2: box.x2, y2: box.y2 };

  if (node.background !== null) {
    doc.rectangle(box, { fill: node.color, outline: node.color });
    doc.image(textBox, node.background);
    doc.rectangle(box, { outline: node.linecolor, style: node.style });
  } else {
    doc.rectangle(box, { fill: node.color, outline: node.linecolor, style: node.style });
  }

  const top = boxTop(box);
  doc.line([boxTopLeft(box), { x: top.x, y: top.y + r }, boxTopRight(box)], {
    fill: node.linecolor,
    style: node.style,
  });

  if (node.label !== null) {
    doc.textarea(textBox, node.label, mode.font, mode.fontSize, { fill: node.textcolor, halign: "center" });
  }
}
