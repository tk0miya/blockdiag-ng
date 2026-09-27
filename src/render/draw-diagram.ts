// Ported from `DiagramDraw` (vendor/blockdiag/src/blockdiag/drawer.py):
// the entry point tying a laid-out `Diagram` to an SVG document. Covers
// background skeleton (`_draw_background()`'s group backgrounds and node
// shadows) plus node rendering (`_draw_elements()`'s node loop,
// `DiagramDraw.node()`) for the shapes ported so far. Edges, group
// borders/labels, icons, and number badges are added in later steps.
// Dispatching a node to its shape's renderer (ported from
// `noderenderer.get(shape)`) lives in shape-registry.ts/shapes/index.ts
// rather than here.
import type { AnyGroup, Diagram, NodeGroup } from "../model/elements.js";
import type { Font } from "./font-metrics.js";
import { collectAllNodes, createDiagramMetrics, type DiagramMetrics, marginBox, nodeBox, pageSize } from "./metrics.js";
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
    rendererFor(node.shape)(doc, metrics, node, font, node.fontsize ?? defaultFontSize, mode);
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
    const mode: RenderMode = { kind: "normal" };
    rendererFor(node.shape)(doc, metrics, node, font, node.fontsize ?? defaultFontSize, mode);
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
