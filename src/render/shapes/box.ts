// Ported from `noderenderer/box.py`'s `Box` shape: `render_shape`'s
// common case (fill/outline/style) plus the base `NodeShape`'s
// `render_label`, plus its shadow branch (shifted, flat-colored, no
// label - see render-mode.ts). The number badge (`numbered`) and `icon`
// are shape-independent, so they're wired up once in draw-diagram.ts
// (number-badge.ts/icon.ts) rather than here - `box` only narrows its
// own label/background to leave room for an icon (icon.ts's
// `textBoxFor()`), since it's one of the few shapes that doesn't already
// override its own textbox unconditionally (see icon.ts). A
// `background` image draws over the box's own fill and under its
// outline (so the outline stays crisp on top of it). `stacked` is
// deferred to a later step. `rotate`/`label_orientation = "vertical"`
// are deferred too (see text-folder.ts/svg-document.ts).
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

  if (node.background !== null) {
    doc.rectangle(box, { fill: node.color, outline: node.color });
    doc.image(textBoxFor(metrics, node, box), node.background);
    doc.rectangle(box, { outline: node.linecolor, style: node.style });
  } else {
    doc.rectangle(box, { fill: node.color, outline: node.linecolor, style: node.style });
  }

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
