// Ported from `noderenderer/textbox.py`: a label with no border or
// fill of its own - and so no shadow silhouette either (`render_shape`
// only ever draws something for a `background` image, deferred to Step
// 17c). The original's constructor also reflows the textbox/connectors
// around that image or an `icon`, but both are deferred too - without
// them, `TextBox` behaves exactly like the base `NodeShape` (default
// textbox, default `render_shape` no-op).
import type { DiagramNode } from "../../model/elements.js";
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
    doc.textarea(nodeBox(metrics, node), node.label, mode.font, mode.fontSize, {
      fill: node.textcolor,
      halign: "center",
    });
  }
}
