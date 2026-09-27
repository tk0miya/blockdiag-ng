// Ported from `noderenderer/textbox.py`: a label with no border or
// fill of its own - and so no shadow silhouette either (`render_shape`
// only ever draws something for a `background` image, deferred to Step
// 17c). The original's constructor also reflows the textbox/connectors
// around that image or an `icon`, but both are deferred too - without
// them, `TextBox` behaves exactly like the base `NodeShape` (default
// textbox, default `render_shape` no-op).
import type { DiagramNode } from "../../model/elements.js";
import type { Font } from "../font-metrics.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { RenderMode } from "../render-mode.js";
import type { NodeShape } from "../shape-registry.js";
import type { SvgDocument } from "../svg-document.js";

export function renderTextboxNode(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  node: DiagramNode,
  font: Font,
  fontSize: number,
  mode: RenderMode,
): void {
  if (mode.kind === "shadow") return;

  if (node.label !== null) {
    doc.textarea(nodeBox(metrics, node), node.label, font, fontSize, {
      fill: node.textcolor,
      halign: "center",
    });
  }
}

// `getConnectors`/`getTextBox` are `null` for now - textbox's own
// connectors do differ from the plain box default once a `background`
// image or `icon` is set, but both are deferred to Step 17, and its
// connectors override itself is added once connectors.ts exists (Step
// 18a).
export const textboxShape: NodeShape = { render: renderTextboxNode, getConnectors: null, getTextBox: null };
