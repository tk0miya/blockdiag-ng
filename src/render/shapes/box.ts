// Ported from `noderenderer/box.py`'s `Box` shape: `render_shape`'s
// common case (fill/outline/style) plus the base `NodeShape`'s
// `render_label`, plus its shadow branch (shifted, flat-colored, no
// label - see render-mode.ts). The number badge (`numbered`) and `icon`
// are shape-independent, so they're wired up once in draw-diagram.ts
// (number-badge.ts/icon.ts) rather than here - `box` only narrows its
// own label to leave room for an icon (icon.ts's `textBoxFor()`), since
// it's one of the few shapes that doesn't already override its own
// textbox unconditionally (see icon.ts). A `background` image and
// `stacked` are deferred to later steps. `rotate`/
// `label_orientation = "vertical"` are deferred too (see
// text-folder.ts/svg-document.ts).
import type { DiagramNode } from "../../model/elements.js";
import { textBoxFor } from "../icon.js";
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
    doc.textarea(textBoxFor(metrics, node, box), node.label, mode.font, mode.fontSize, {
      fill: node.textcolor,
      halign: "center",
    });
  }
}
