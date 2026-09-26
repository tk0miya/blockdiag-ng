// Ported from `DiagramDraw` (vendor/blockdiag/src/blockdiag/drawer.py):
// the entry point tying a laid-out `Diagram` to an SVG document. Covers
// background skeleton (`_draw_background()`'s group loop) plus node
// rendering (`_draw_elements()`'s node loop, `DiagramDraw.node()`) for
// the shapes ported so far. Node shadows (also part of
// `_draw_background()`), edges, group borders/labels, and the rest of
// the node shapes are added in later steps. Dispatching a node to its
// shape's renderer (ported from `noderenderer.get(shape)`) now lives in
// shape-registry.ts/shapes/index.ts rather than here.
import type { AnyGroup, Diagram, NodeGroup } from "../model/elements.js";
import type { Font } from "./font-metrics.js";
import { collectAllNodes, createDiagramMetrics, type DiagramMetrics, marginBox, nodeBox, pageSize } from "./metrics.js";
import { rendererFor } from "./shape-registry.js";
import { registerBuiltinShapes } from "./shapes/index.js";
import { SvgDocument } from "./svg-document.js";

// Ported from `FontMap.fontsize`/`BASE_FONTSIZE`.
const DEFAULT_FONT_SIZE = 11;

// Runs once at import time, so every shape is registered before
// renderDiagramToSvg() (this module's only entry point) ever calls
// rendererFor().
registerBuiltinShapes();

function drawNodes(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  diagram: Diagram,
  font: Font,
  defaultFontSize: number,
): void {
  for (const node of collectAllNodes(diagram)) {
    rendererFor(node.shape)(doc, metrics, font, node.fontsize ?? defaultFontSize, node);
  }
}

// Ported from `NodeGroup.traverse_groups(preorder=True)`, as used by
// `DiagramDraw.groups`: every group nested anywhere in `group`, each one
// before its own nested groups - so an outer group's background is drawn
// before (and so ends up underneath) any of its own subgroups'.
function traverseGroupsPreOrder(group: AnyGroup): NodeGroup[] {
  const groups: NodeGroup[] = [];
  for (const node of group.nodes) {
    if (node.kind === "group") {
      groups.push(node, ...traverseGroupsPreOrder(node));
    }
  }
  return groups;
}

// Ported from `DiagramDraw._draw_background()`'s group loop. A
// `shape == 'line'` group has no background fill of its own - just the
// outlined border `_draw_elements()` draws later, once groups are drawn.
function drawGroupBackgrounds(doc: SvgDocument, metrics: DiagramMetrics, diagram: Diagram): void {
  for (const group of traverseGroupsPreOrder(diagram)) {
    if (group.shape === "box") {
      doc.rectangle(marginBox(metrics, nodeBox(metrics, group, false)), { fill: group.color, filter: "blur" });
    }
  }
}

export function renderDiagramToSvg(
  diagram: Diagram,
  options: { readonly font: Font; readonly fontSize?: number },
): string {
  const metrics = createDiagramMetrics(diagram);
  const doc = new SvgDocument();

  drawGroupBackgrounds(doc, metrics, diagram);
  drawNodes(doc, metrics, diagram, options.font, options.fontSize ?? DEFAULT_FONT_SIZE);

  return doc.toString(pageSize(metrics, diagram.colwidth, diagram.colheight));
}
