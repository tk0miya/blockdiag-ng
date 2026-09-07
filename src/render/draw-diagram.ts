// Ported from `DiagramDraw` (vendor/blockdiag/src/blockdiag/drawer.py):
// the entry point tying a laid-out `Diagram` to an SVG document. Covers
// background skeleton (`_draw_background()`'s group loop) plus node
// rendering (`_draw_elements()`'s node loop, `DiagramDraw.node()`) for
// the one shape ported so far (`box`). Node shadows (also part of
// `_draw_background()`), edges, group borders/labels, and the rest of
// the node shapes are added in later steps.
import type { AnyGroup, Diagram, DiagramNode, NodeGroup } from "../model/elements.js";
import type { Font } from "./font-metrics.js";
import { collectAllNodes, createDiagramMetrics, type DiagramMetrics, marginBox, nodeBox, pageSize } from "./metrics.js";
import { renderBoxNode } from "./shapes/box.js";
import { SvgDocument } from "./svg-document.js";

// Ported from `FontMap.fontsize`/`BASE_FONTSIZE`.
const DEFAULT_FONT_SIZE = 11;

// Ported from `noderenderer.get(shape)`: dispatches a node to its
// shape's renderer. Only `box` is ported so far (Steps 14-16 add the
// rest) - unlike the original, which would fail obscurely (`None` is not
// callable) for a shape it doesn't recognize, this names the shape so
// the gap is obvious while it's still a port-in-progress limitation
// rather than a genuinely unknown shape.
type NodeRenderer = (
  doc: SvgDocument,
  metrics: DiagramMetrics,
  font: Font,
  fontSize: number,
  node: DiagramNode,
) => void;

const NODE_RENDERERS: Record<string, NodeRenderer> = {
  box: renderBoxNode,
};

function drawNodes(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  diagram: Diagram,
  font: Font,
  defaultFontSize: number,
): void {
  for (const node of collectAllNodes(diagram)) {
    const renderer = NODE_RENDERERS[node.shape];
    if (renderer === undefined) {
      throw new Error(`node shape not yet supported: ${node.shape}`);
    }
    renderer(doc, metrics, font, node.fontsize ?? defaultFontSize, node);
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
