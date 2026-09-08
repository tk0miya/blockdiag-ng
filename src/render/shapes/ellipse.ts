// Ported from `noderenderer/ellipse.py`: an ellipse filling the node's
// whole cell (unlike `circle`, which insets its own bounding box - this
// draws straight into the cell box itself). Its label wraps within a
// narrower inset box instead, so it doesn't run into the ellipse's own
// curve. Plus its shadow branch (the full cell box shifted, same as the
// ellipse itself - not the label's narrower inset box). Plus a
// `background` image, drawn into that same narrower inset box, over the
// ellipse's own fill and under its outline (so the outline stays crisp
// on top of it).
import type { DiagramNode } from "../../model/elements.js";
import type { Font } from "../font-metrics.js";
import type { Box } from "../geometry.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { RenderMode } from "../render-mode.js";
import { SHADOW_COLOR, shiftShadowBox } from "../shadow.js";
import type { NodeShape } from "../shape-registry.js";
import type { SvgDocument } from "../svg-document.js";

export function renderEllipseNode(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  node: DiagramNode,
  font: Font,
  fontSize: number,
  mode: RenderMode,
): void {
  const box = nodeBox(metrics, node);

  if (mode.kind === "shadow") {
    doc.ellipse(shiftShadowBox(box), { fill: SHADOW_COLOR, outline: SHADOW_COLOR, filter: mode.filter });
    return;
  }

  const r = metrics.cellSize;
  const textBox: Box = { x1: box.x1 + r, y1: box.y1 + r, x2: box.x2 - r, y2: box.y2 - r };

  if (node.background !== null) {
    doc.ellipse(box, { fill: node.color, outline: node.color });
    doc.image(textBox, node.background);
    doc.ellipse(box, { outline: node.linecolor, style: node.style });
  } else {
    doc.ellipse(box, { fill: node.color, outline: node.linecolor, style: node.style });
  }

  if (node.label !== null) {
    doc.textarea(textBox, node.label, font, fontSize, { fill: node.textcolor, halign: "center" });
  }
}

// `getConnectors` is `null` - ellipse inherits the plain box default,
// same as box.ts. `getTextBox` stays `null` too: `ellipse.py` always
// overrides `self.textbox` unconditionally (its own inset rectangle,
// computed inline above), so unlike box/roundedbox/textbox/note it
// never narrows for an `icon` - icon.ts existing doesn't unblock this.
// It gets a real getTextBox once connectors.ts exists (Step 18a), at
// the same time as its own getConnectors.
export const ellipseShape: NodeShape = { render: renderEllipseNode, getConnectors: null, getTextBox: null };
