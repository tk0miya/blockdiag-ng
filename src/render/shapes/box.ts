// Ported from `noderenderer/box.py`'s `Box` shape: `render_shape`'s
// common case (fill/outline/style) plus the base `NodeShape`'s
// `render_label`. `render_shape`'s other two branches - the shadow pass
// and a `background` image - and `render_icon`/`render_number_badge`/
// `stacked` are all deferred to Step 17, a horizontal slice across every
// shape rather than something specific to `box`. `rotate`/
// `label_orientation = "vertical"` are deferred too (see
// text-folder.ts/svg-document.ts).
import type { DiagramNode } from "../../model/elements.js";
import type { Font } from "../font-metrics.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { SvgDocument } from "../svg-document.js";

export function renderBoxNode(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  font: Font,
  fontSize: number,
  node: DiagramNode,
): void {
  const box = nodeBox(metrics, node);
  doc.rectangle(box, { fill: node.color, outline: node.linecolor, style: node.style });

  // A bare `label;` attribute (no value) sets the label to `null` rather
  // than an empty string - the original crashes trying to render this
  // (see README's "Differences from the original").
  if (node.label !== null) {
    doc.textarea(box, node.label, font, fontSize, { fill: node.textcolor, halign: "center" });
  }
}
