// Ported from `noderenderer/textbox.py`: a label with no border or
// fill of its own - and so no shadow silhouette either (`render_shape`
// only ever draws something for a `background` image, deferred to a
// later step). The original's constructor also reflows its textbox
// around a `background` image, overriding whatever the base `NodeShape`
// already narrowed it to for an `icon` - deferred along with
// `background` itself, so for now `TextBox` narrows for `icon` exactly
// like the base class does (see icon.ts), with no `background` case to
// override it.
import type { DiagramNode } from "../../model/elements.js";
import { textBoxFor } from "../icon.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { RenderMode } from "../render-mode.js";
import type { SvgDocument } from "../svg-document.js";

export function renderTextboxNode(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  node: DiagramNode,
  mode: RenderMode,
): void {
  if (mode.kind === "shadow") return;

  if (node.label !== null) {
    doc.textarea(textBoxFor(metrics, node, nodeBox(metrics, node)), node.label, mode.font, mode.fontSize, {
      fill: node.textcolor,
      halign: "center",
    });
  }
}
