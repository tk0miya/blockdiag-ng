// Ported from `DiagramDraw` (vendor/blockdiag/src/blockdiag/drawer.py):
// the entry point tying a laid-out `Diagram` to an SVG document. Covers
// background skeleton (`_draw_background()`'s group backgrounds and node
// shadows), node rendering (`_draw_elements()`'s node loop,
// `DiagramDraw.node()`) for the shapes ported so far, and edges
// (`draw-edges.ts` - every orientation/`edge_layout` combination the
// original itself supports). Group borders/labels are added in a later
// step.
import type { AnyGroup, Diagram, DiagramNode, NodeGroup } from "../model/elements.js";
import { drawEdges } from "./draw-edges.js";
import type { Font } from "./font-metrics.js";
import { drawIcon } from "./icon.js";
import {
  collectAllNodes,
  createDiagramMetrics,
  type DiagramMetrics,
  marginBox,
  nodeBox,
  pageSize,
  shiftMetrics,
} from "./metrics.js";
import { drawNumberBadge } from "./number-badge.js";
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

// Ported from `NodeShape.render()`: a node's own shape, plus (only for
// the normal, non-shadow pass - matching `render_icon()`/
// `render_label()`/`render_number_badge()`'s own `kwargs.get('shadow')`
// guards) its icon and number badge. Shape-independent, so wired up
// here once rather than per shape.
//
// `stacked` recurses into 2 duplicate copies first - `label`/
// `background` cleared, shifted down-right by decreasing amounts via
// `shiftMetrics()` (so nothing else about their own position changes),
// `isDuplicate=true` so they don't recurse again - drawn before the
// real node, so they end up underneath it: a stack of cards receding
// into the background. This happens for the shadow pass too (each
// duplicate casts its own shadow, at its own shifted position),
// matching the original's own `NodeShape.render()` being reached from
// both `_draw_background()`'s shadow loop and `_draw_elements()`'s
// normal one - neither passes anything that would stop it recursing.
function renderNode(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  node: DiagramNode,
  mode: RenderMode,
  isDuplicate: boolean,
): void {
  if (node.stacked && !isDuplicate) {
    const duplicate: DiagramNode = { ...node, label: "", background: null };
    const r = Math.floor(metrics.cellSize / 2);
    for (const i of [2, 1]) {
      renderNode(doc, shiftMetrics(metrics, r * i, r * i), duplicate, mode, true);
    }
  }

  rendererFor(node.shape)(doc, metrics, node, mode);

  if (mode.kind === "normal") {
    // The original draws the icon between a shape's own fill and its
    // label, so an overlapping label (only possible for a shape that
    // doesn't narrow its own textbox to avoid the icon - see icon.ts)
    // ends up on top of it. Every shape here draws its fill and label
    // together in one call above, so this ends up after both instead -
    // a label overlapping an icon wins there, not here. Deliberately
    // left as a divergence (see README) rather than restructuring every
    // shape to draw its own label separately just for this.
    drawIcon(doc, metrics, node);
    drawNumberBadge(doc, metrics, mode.font, mode.fontSize, node);
  }
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
    renderNode(doc, metrics, node, mode, false);
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
    const fontSize = node.fontsize ?? defaultFontSize;
    const mode: RenderMode = { kind: "normal", font, fontSize };
    renderNode(doc, metrics, node, mode, false);
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
  drawEdges(doc, metrics, diagram, options.font, fontSize);

  return doc.toString(pageSize(metrics, diagram.colwidth, diagram.colheight));
}
