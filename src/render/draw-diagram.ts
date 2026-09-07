// Ported from `DiagramDraw` (vendor/blockdiag/src/blockdiag/drawer.py):
// the entry point tying a laid-out `Diagram` to an SVG document. Covers
// background skeleton (`_draw_background()`'s group loop) plus node
// rendering (`_draw_elements()`'s node loop, `DiagramDraw.node()`) for
// the shapes ported so far. Node shadows (also part of
// `_draw_background()`), edges, group borders/labels, and the rest of
// the node shapes are added in later steps.
import type { AnyGroup, Diagram, DiagramNode, NodeGroup } from "../model/elements.js";
import type { Font } from "./font-metrics.js";
import { collectAllNodes, createDiagramMetrics, type DiagramMetrics, marginBox, nodeBox, pageSize } from "./metrics.js";
import { renderActorNode } from "./shapes/actor.js";
import { renderBeginpointNode } from "./shapes/beginpoint.js";
import { renderBoxNode } from "./shapes/box.js";
import { renderCircleNode } from "./shapes/circle.js";
import { renderCloudNode } from "./shapes/cloud.js";
import { renderDiamondNode } from "./shapes/diamond.js";
import { renderDotsNode } from "./shapes/dots.js";
import { renderEllipseNode } from "./shapes/ellipse.js";
import { renderEndpointNode } from "./shapes/endpoint.js";
import { renderMailNode } from "./shapes/mail.js";
import { renderMinidiamondNode } from "./shapes/minidiamond.js";
import { renderNoneNode } from "./shapes/none.js";
import { renderNoteNode } from "./shapes/note.js";
import { renderRoundedboxNode } from "./shapes/roundedbox.js";
import { renderSquareNode } from "./shapes/square.js";
import { renderTextboxNode } from "./shapes/textbox.js";
import { SvgDocument } from "./svg-document.js";

// Ported from `FontMap.fontsize`/`BASE_FONTSIZE`.
const DEFAULT_FONT_SIZE = 11;

// Ported from `noderenderer.get(shape)`: dispatches a node to its
// shape's renderer. The `flowchart.database`/`input`/`loopin`/
// `loopout`/`terminator` shapes remain - a gap in the original Step 16
// scope discovered only once actually implementing it (like
// `flowchart.condition` was for Step 15, though that one was small
// enough to fix immediately rather than needing its own step - this
// one is split out as Step 16b instead). Unlike the original, which
// would fail obscurely (`None` is not callable) for a shape it doesn't
// recognize, this names the shape so the gap is obvious while it's
// still a port-in-progress limitation rather than a genuinely unknown
// shape.
type NodeRenderer = (
  doc: SvgDocument,
  metrics: DiagramMetrics,
  font: Font,
  fontSize: number,
  node: DiagramNode,
) => void;

const NODE_RENDERERS: Record<string, NodeRenderer> = {
  box: renderBoxNode,
  roundedbox: renderRoundedboxNode,
  square: renderSquareNode,
  none: renderNoneNode,
  textbox: renderTextboxNode,
  circle: renderCircleNode,
  ellipse: renderEllipseNode,
  diamond: renderDiamondNode,
  "flowchart.condition": renderDiamondNode,
  minidiamond: renderMinidiamondNode,
  dots: renderDotsNode,
  cloud: renderCloudNode,
  note: renderNoteNode,
  mail: renderMailNode,
  actor: renderActorNode,
  beginpoint: renderBeginpointNode,
  endpoint: renderEndpointNode,
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
