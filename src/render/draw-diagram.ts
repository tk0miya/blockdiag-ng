// Ported from `DiagramDraw` (vendor/blockdiag/src/blockdiag/drawer.py):
// the entry point tying a laid-out `Diagram` to an SVG document. Only the
// background skeleton so far - a box-shaped group's own background
// rectangle (`_draw_background()`'s group loop). Node/edge shapes and
// group borders/labels (`_draw_elements()`) are added in later steps,
// once there's a shape to draw.
import type { AnyGroup, Diagram, NodeGroup } from "../model/elements.js";
import { createDiagramMetrics, type DiagramMetrics, marginBox, nodeBox, pageSize } from "./metrics.js";
import { SvgDocument } from "./svg-document.js";

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

export function renderDiagramToSvg(diagram: Diagram): string {
  const metrics = createDiagramMetrics(diagram);
  const doc = new SvgDocument();

  drawGroupBackgrounds(doc, metrics, diagram);

  return doc.toString(pageSize(metrics, diagram.colwidth, diagram.colheight));
}
