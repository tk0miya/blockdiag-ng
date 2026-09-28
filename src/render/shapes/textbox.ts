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
import type { Font } from "../font-metrics.js";
import { textBoxFor } from "../icon.js";
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
    doc.textarea(textBoxFor(metrics, node, nodeBox(metrics, node)), node.label, font, fontSize, {
      fill: node.textcolor,
      halign: "center",
    });
  }
}

// `getConnectors` is still `null` - textbox's own connectors do differ
// from the plain box default once a `background` image or `icon` is
// set, but that override itself is added once connectors.ts exists
// (Step 18a). `getTextBox` narrows for an `icon`, same as box.ts.
export const textboxShape: NodeShape = {
  render: renderTextboxNode,
  getConnectors: null,
  getTextBox: (metrics, node) => textBoxFor(metrics, node, nodeBox(metrics, node)),
};
