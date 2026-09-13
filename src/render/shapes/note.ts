// Ported from `noderenderer/note.py`: a box with its top-right corner
// folded down and inward, like a sticky note. Shadow/background-image
// branches deferred to Step 17, same as box.ts.
import type { DiagramNode } from "../../model/elements.js";
import type { Font } from "../font-metrics.js";
import type { Point } from "../geometry.js";
import { boxBottomLeft, boxBottomRight, boxTopLeft, boxTopRight } from "../geometry.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { SvgDocument } from "../svg-document.js";

export function renderNoteNode(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  font: Font,
  fontSize: number,
  node: DiagramNode,
): void {
  const box = nodeBox(metrics, node);
  const r = metrics.cellSize * 2;
  const topLeft = boxTopLeft(box);
  const topRight = boxTopRight(box);
  const bottomRight = boxBottomRight(box);
  const bottomLeft = boxBottomLeft(box);

  const foldStart: Point = { x: topRight.x - r, y: topRight.y };
  const foldCorner: Point = { x: topRight.x, y: topRight.y + r };

  doc.polygon([topLeft, foldStart, foldCorner, bottomRight, bottomLeft, topLeft], {
    fill: node.color,
    outline: node.linecolor,
    style: node.style,
  });
  doc.line([foldStart, { x: foldStart.x, y: foldCorner.y }, foldCorner], {
    fill: node.linecolor,
    style: node.style,
  });

  if (node.label !== null) {
    doc.textarea(box, node.label, font, fontSize, { fill: node.textcolor, halign: "center" });
  }
}
