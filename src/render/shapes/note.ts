// Ported from `noderenderer/note.py`: a box with its top-right corner
// folded down and inward, like a sticky note. Plus its shadow branch -
// the fold-crease line is skipped for shadow, same as the flap in
// mail.ts. `icon` narrows the label the same way as box.ts (see
// icon.ts); a background image is deferred to a later step.
import type { DiagramNode } from "../../model/elements.js";
import type { Font } from "../font-metrics.js";
import type { Point } from "../geometry.js";
import { boxBottomLeft, boxBottomRight, boxTopLeft, boxTopRight } from "../geometry.js";
import { textBoxFor } from "../icon.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { RenderMode } from "../render-mode.js";
import { SHADOW_COLOR, shiftShadowPoints } from "../shadow.js";
import type { NodeShape } from "../shape-registry.js";
import type { SvgDocument } from "../svg-document.js";

export function renderNoteNode(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  node: DiagramNode,
  font: Font,
  fontSize: number,
  mode: RenderMode,
): void {
  const box = nodeBox(metrics, node);
  const r = metrics.cellSize * 2;
  const topLeft = boxTopLeft(box);
  const topRight = boxTopRight(box);
  const bottomRight = boxBottomRight(box);
  const bottomLeft = boxBottomLeft(box);

  const foldStart: Point = { x: topRight.x - r, y: topRight.y };
  const foldCorner: Point = { x: topRight.x, y: topRight.y + r };
  const note = [topLeft, foldStart, foldCorner, bottomRight, bottomLeft, topLeft];

  if (mode.kind === "shadow") {
    doc.polygon(shiftShadowPoints(note), { fill: SHADOW_COLOR, outline: SHADOW_COLOR, filter: mode.filter });
    return;
  }

  doc.polygon(note, { fill: node.color, outline: node.linecolor, style: node.style });
  doc.line([foldStart, { x: foldStart.x, y: foldCorner.y }, foldCorner], {
    fill: node.linecolor,
    style: node.style,
  });

  if (node.label !== null) {
    doc.textarea(textBoxFor(metrics, node, box), node.label, font, fontSize, {
      fill: node.textcolor,
      halign: "center",
    });
  }
}

// `getConnectors` is `null` - note.py never overrides `self.connectors`,
// so it inherits the plain box default, same as box.ts. `getTextBox`
// narrows for an `icon` via `textBoxFor()` (see icon.ts) - note is one
// of the shapes that doesn't already override its own textbox
// unconditionally.
export const noteShape: NodeShape = {
  render: renderNoteNode,
  getConnectors: null,
  getTextBox: (metrics, node) => textBoxFor(metrics, node, nodeBox(metrics, node)),
};
