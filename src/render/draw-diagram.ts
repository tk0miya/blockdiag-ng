// Ported from `DiagramDraw` (vendor/blockdiag/src/blockdiag/drawer.py):
// the entry point tying a laid-out `Diagram` to an SVG document. Covers
// background skeleton (`_draw_background()`'s group backgrounds and node
// shadows), node rendering (`_draw_elements()`'s node loop,
// `DiagramDraw.node()`) for the shapes ported so far, edges
// (`draw-edges.ts` - every orientation/`edge_layout` combination the
// original itself supports), and group borders/labels. Dispatching a
// node to its shape's renderer (ported from `noderenderer.get(shape)`)
// lives in shape-registry.ts/shapes/index.ts rather than here.
import type { AnyGroup, Diagram, DiagramNode, NodeGroup } from "../model/elements.js";
import { drawEdges } from "./draw-edges.js";
import type { Font } from "./font-metrics.js";
import { drawIcon } from "./icon.js";
import {
  collectAllNodes,
  coreBox,
  createDiagramMetrics,
  type DiagramMetrics,
  groupLabelBox,
  marginBox,
  nodeBox,
  pageSize,
  shiftMetrics,
} from "./metrics.js";
import { drawNumberBadge } from "./number-badge.js";
import type { RenderMode } from "./render-mode.js";
import { shadowFilter } from "./shadow.js";
import { rendererFor } from "./shape-registry.js";
import { registerBuiltinShapes } from "./shapes/index.js";
import { SvgDocument } from "./svg-document.js";

// Ported from `FontMap.fontsize`/`BASE_FONTSIZE`.
const DEFAULT_FONT_SIZE = 11;

// Runs once at import time, so every shape is registered before
// renderDiagramToSvg() (this module's only entry point) ever calls
// rendererFor().
registerBuiltinShapes();

// Ported from `NodeShape.render()`: a node's own shape, plus (only for
// the normal, non-shadow pass - matching `render_icon()`/
// `render_label()`/`render_number_badge()`'s own `kwargs.get('shadow')`
// guards) its icon and number badge. Shape-independent, so wired up
// here once rather than per shape.
//
// `stacked` recurses into 2 backing copies first - `label`/
// `background` cleared, shifted down-right by decreasing amounts via
// `shiftMetrics()` (so nothing else about their own position changes),
// `isBackingCopy=true` so they don't recurse again - drawn before the
// real node, so they end up underneath it: a stack of cards receding
// into the background. This happens for the shadow pass too (each
// backing copy casts its own shadow, at its own shifted position),
// matching the original's own `NodeShape.render()` being reached from
// both `_draw_background()`'s shadow loop and `_draw_elements()`'s
// normal one - neither passes anything that would stop it recursing.
function drawNode(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  node: DiagramNode,
  font: Font,
  fontSize: number,
  mode: RenderMode,
  isBackingCopy: boolean,
): void {
  if (node.stacked && !isBackingCopy) {
    const backingCopy: DiagramNode = { ...node, label: "", background: null };
    const r = Math.floor(metrics.cellSize / 2);
    for (const i of [2, 1]) {
      drawNode(doc, shiftMetrics(metrics, r * i, r * i), backingCopy, font, fontSize, mode, true);
    }
  }

  rendererFor(node.shape)(doc, metrics, node, font, fontSize, mode);

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
    drawNumberBadge(doc, metrics, font, fontSize, node);
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
    const mode: RenderMode = { kind: "shadow", filter };
    drawNode(doc, metrics, node, font, node.fontsize ?? defaultFontSize, mode, false);
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
    const mode: RenderMode = { kind: "normal" };
    drawNode(doc, metrics, node, font, fontSize, mode, false);
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

// Ported from `DiagramDraw._draw_elements()`'s group-border loop. Only
// `shape == 'line'` groups get an outline here - a `shape == 'box'`
// group's own outline is its filled background above (drawn once, in
// the earlier background pass), not a separate border on top of it.
function drawGroupBorders(doc: SvgDocument, metrics: DiagramMetrics, diagram: Diagram): void {
  for (const group of traverseGroupsPreOrder(diagram)) {
    if (group.shape === "line") {
      doc.rectangle(marginBox(metrics, nodeBox(metrics, group, false)), {
        fill: "none",
        outline: group.color,
        style: group.style,
        thick: group.thick,
      });
    }
  }
}

// Ported from `DiagramDraw.group_label()`: a `separated` group (no
// nodes of its own placed inside it, so no room for a label above it)
// gets its label centered within its own box instead of in the usual
// strip above it. `separated` itself is never set anywhere in this
// port yet (`builder.ts` never computes it - it's tied to a `NodeGroup`
// -extraction feature, `builder.py`'s `_dive_diagram`, out of scope so
// far), so this branch is unreachable through any diagram this port can
// currently build - kept faithfully anyway, since it costs nothing and
// the model field already exists.
function drawGroupLabels(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  diagram: Diagram,
  font: Font,
  defaultFontSize: number,
): void {
  for (const group of traverseGroupsPreOrder(diagram)) {
    if (group.label === null || group.label === "") continue;

    const fontSize = group.fontsize ?? defaultFontSize;
    const box = nodeBox(metrics, group, false);
    const labelBox = group.separated ? coreBox(box) : groupLabelBox(metrics, box);
    doc.textarea(labelBox, group.label, font, fontSize, { fill: group.textcolor });
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
  drawGroupBorders(doc, metrics, diagram);
  drawGroupLabels(doc, metrics, diagram, options.font, fontSize);

  return doc.toString(pageSize(metrics, diagram.colwidth, diagram.colheight));
}
