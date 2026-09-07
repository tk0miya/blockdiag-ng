// Ported from `noderenderer/textbox.py`: a label with no border or
// fill of its own. The original's constructor also reflows the
// textbox/connectors around a `background` image or `icon`, but both
// are deferred to Step 17 - without them, `TextBox` behaves exactly
// like the base `NodeShape` (default textbox, default `render_shape`
// no-op unless a background image is set).
import type { DiagramNode } from "../../model/elements.js";
import type { Font } from "../font-metrics.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { SvgDocument } from "../svg-document.js";

export function renderTextboxNode(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  font: Font,
  fontSize: number,
  node: DiagramNode,
): void {
  if (node.label !== null) {
    doc.textarea(nodeBox(metrics, node), node.label, font, fontSize, { fill: node.textcolor, halign: "center" });
  }
}
