// Ported from `noderenderer/box.py`'s `Box` shape: `render_shape`'s
// common case (fill/outline/style) plus the base `NodeShape`'s
// `render_label`, plus its shadow branch (shifted, flat-colored, no
// label - see render-mode.ts). A `background` image and
// `render_icon`/`render_number_badge`/`stacked` are deferred to Steps
// 17b-17d, a horizontal slice across every shape rather than something
// specific to `box`. `rotate`/`label_orientation = "vertical"` are
// deferred too (see text-folder.ts/svg-document.ts).
import type { DiagramNode } from "../../model/elements.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { RenderMode } from "../render-mode.js";
import { SHADOW_COLOR, shiftShadowBox } from "../shadow.js";
import type { SvgDocument } from "../svg-document.js";

export function renderBoxNode(doc: SvgDocument, metrics: DiagramMetrics, node: DiagramNode, mode: RenderMode): void {
  const box = nodeBox(metrics, node);

  if (mode.kind === "shadow") {
    doc.rectangle(shiftShadowBox(box), { fill: SHADOW_COLOR, outline: SHADOW_COLOR, filter: mode.filter });
    return;
  }

  doc.rectangle(box, { fill: node.color, outline: node.linecolor, style: node.style });

  // A bare `label;` attribute (no value) sets the label to `null` rather
  // than an empty string - the original crashes trying to render this
  // (see README's "Differences from the original").
  if (node.label !== null) {
    doc.textarea(box, node.label, mode.font, mode.fontSize, { fill: node.textcolor, halign: "center" });
  }
}
