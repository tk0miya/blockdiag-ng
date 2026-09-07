// Ported from `DiagramDraw` (vendor/blockdiag/src/blockdiag/drawer.py):
// the entry point tying a laid-out `Diagram` to an SVG document. Covers
// background skeleton (`_draw_background()`'s group backgrounds and node
// shadows) plus node rendering (`_draw_elements()`'s node loop,
// `DiagramDraw.node()`) for the shapes ported so far. Edges, group
// borders/labels, icons, and number badges are added in later steps.
import type { AnyGroup, Diagram, DiagramNode, NodeGroup } from "../model/elements.js";
import type { Font } from "./font-metrics.js";
import { collectAllNodes, createDiagramMetrics, type DiagramMetrics, marginBox, nodeBox, pageSize } from "./metrics.js";
import type { RenderMode } from "./render-mode.js";
import { shadowFilter } from "./shadow.js";
import { renderActorNode } from "./shapes/actor.js";
import { renderBeginpointNode } from "./shapes/beginpoint.js";
import { renderBoxNode } from "./shapes/box.js";
import { renderCircleNode } from "./shapes/circle.js";
import { renderCloudNode } from "./shapes/cloud.js";
import { renderDiamondNode } from "./shapes/diamond.js";
import { renderDotsNode } from "./shapes/dots.js";
import { renderEllipseNode } from "./shapes/ellipse.js";
import { renderEndpointNode } from "./shapes/endpoint.js";
import { renderFlowchartDatabaseNode } from "./shapes/flowchart-database.js";
import { renderFlowchartInputNode } from "./shapes/flowchart-input.js";
import { renderFlowchartLoopinNode } from "./shapes/flowchart-loopin.js";
import { renderFlowchartLoopoutNode } from "./shapes/flowchart-loopout.js";
import { renderFlowchartTerminatorNode } from "./shapes/flowchart-terminator.js";
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
// shape's renderer. Every shape from `setup.py`'s
// `[blockdiag_noderenderer]` entry points (including the `noderenderer/
// flowchart/` node shapes, distinct from the `edge_layout = flowchart`
// mode deferred to Step 18) is ported now - unlike the original, which
// would fail obscurely (`None` is not callable) for a shape it doesn't
// recognize, this names the shape so the gap is obvious while it's
// still a port-in-progress limitation rather than a genuinely unknown
// shape.
type NodeRenderer = (doc: SvgDocument, metrics: DiagramMetrics, node: DiagramNode, mode: RenderMode) => void;

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
  "flowchart.database": renderFlowchartDatabaseNode,
  "flowchart.input": renderFlowchartInputNode,
  "flowchart.loopin": renderFlowchartLoopinNode,
  "flowchart.loopout": renderFlowchartLoopoutNode,
  "flowchart.terminator": renderFlowchartTerminatorNode,
};

function rendererFor(shape: string): NodeRenderer {
  const renderer = NODE_RENDERERS[shape];
  if (renderer === undefined) {
    throw new Error(`node shape not yet supported: ${shape}`);
  }
  return renderer;
}

// Ported from `DiagramDraw._draw_background()`'s node loop: every
// node's shadow, drawn before (so ends up underneath) anything from
// `drawNodes()` below - a node whose own color is the literal `"none"`
// casts none, and `shadow_style = "none"` turns shadows off for the
// whole diagram.
function drawNodeShadows(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  diagram: Diagram,
  font: Font,
  defaultFontSize: number,
): void {
  if (diagram.shadowStyle === "none") return;
  const filter = shadowFilter(diagram.shadowStyle);

  for (const node of collectAllNodes(diagram)) {
    if (node.color === "none") continue;
    const mode: RenderMode = { kind: "shadow", font, fontSize: node.fontsize ?? defaultFontSize, filter };
    rendererFor(node.shape)(doc, metrics, node, mode);
  }
}

function drawNodes(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  diagram: Diagram,
  font: Font,
  defaultFontSize: number,
): void {
  for (const node of collectAllNodes(diagram)) {
    const mode: RenderMode = { kind: "normal", font, fontSize: node.fontsize ?? defaultFontSize };
    rendererFor(node.shape)(doc, metrics, node, mode);
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

  const fontSize = options.fontSize ?? DEFAULT_FONT_SIZE;
  drawGroupBackgrounds(doc, metrics, diagram);
  drawNodeShadows(doc, metrics, diagram, options.font, fontSize);
  drawNodes(doc, metrics, diagram, options.font, fontSize);

  return doc.toString(pageSize(metrics, diagram.colwidth, diagram.colheight));
}
