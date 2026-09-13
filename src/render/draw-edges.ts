// Ported from `DiagramDraw.edge()`/`.edge_label()` (vendor/blockdiag/
// src/blockdiag/drawer.py), restricted for now to a `landscape`-
// oriented group under the default (non-`flowchart`) `edge_layout` -
// `PortraitEdgeMetrics` and the `Flowchart*EdgeMetrics` variants are
// later steps (18b/18c). An edge whose group doesn't match this yet
// throws, naming it, rather than silently drawing it wrong - the same
// "unsupported, not unknown" approach `draw-diagram.ts`'s `rendererFor`
// takes for a node shape.
import { collectAllEdges } from "../layout/group-layout.js";
import type { Diagram, DiagramEdge } from "../model/elements.js";
import { nodeConnectors } from "./connectors.js";
import { adjustShaftForHeads, edgeHeads } from "./edge-metrics.js";
import type { Font } from "./font-metrics.js";
import { landscapeHeadshapes, landscapeLabelbox, landscapeShaft } from "./landscape-edge-metrics.js";
import type { DiagramMetrics } from "./metrics.js";
import type { SvgDocument } from "./svg-document.js";

const BLACK = [0, 0, 0] as const;
const WHITE = [255, 255, 255] as const;

// Ported from `DiagramDraw.edges` (the `for edge in self.edges` guard
// every one of `_draw_elements`'s three edge-related loops shares): a
// `style = "none"` edge draws nothing at all - not its shaft, its
// head(s), or its label.
function drawableEdges(diagram: Diagram): DiagramEdge[] {
  return collectAllEdges(diagram).filter((edge) => edge.style === null || edge.style.type !== "none");
}

function requireLandscapeNormal(edgeLayout: Diagram["edgeLayout"], edge: DiagramEdge): void {
  if (edgeLayout === "flowchart") {
    throw new Error("edge_layout 'flowchart' is not yet supported");
  }
  if (edge.node1.group?.orientation !== "landscape") {
    throw new Error("'portrait' group orientation is not yet supported");
  }
}

// Ported from `DiagramDraw.edge()`: an edge's own shaft (one or more
// polylines - a skipped edge bends around whatever it detours past) and
// arrow-head(s) (a `generalization`/`aggregation` `hstyle` draws an
// unfilled, white-backed head; every other `hstyle` - including none -
// fills it with the edge's own color).
function drawEdge(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  edgeLayout: Diagram["edgeLayout"],
  edge: DiagramEdge,
  font: Font,
  fontSize: number,
): void {
  requireLandscapeNormal(edgeLayout, edge);

  const node1 = nodeConnectors(metrics, edge.node1, font, fontSize);
  const node2 = nodeConnectors(metrics, edge.node2, font, fontSize);
  const headshapes = landscapeHeadshapes(edge);
  const raw = landscapeShaft(edge, metrics, node1, node2);
  const shaft = adjustShaftForHeads(raw, headshapes, metrics.cellSize);

  for (const line of shaft.polylines) {
    doc.line(line, { fill: edge.color, thick: edge.thick, style: edge.style });
  }

  const heads = edgeHeads(headshapes, node1, node2, metrics.cellSize, edge.hstyle);
  for (const head of heads) {
    if (edge.hstyle === "generalization" || edge.hstyle === "aggregation") {
      doc.polygon(head, { outline: edge.color, fill: WHITE });
    } else {
      doc.polygon(head, { outline: edge.color, fill: edge.color });
    }
  }
}

// Ported from `DiagramDraw.edge_label()`. `outline` is `self.fill`
// (`DiagramDraw.__init__`'s own default, `(0, 0, 0)`/black) - always
// black in practice, since nothing in this port yet exposes a way to
// configure it (it's a `DiagramDraw` constructor kwarg, not a diagram
// attribute); hardcoded here rather than threaded through for a value
// that's never actually been anything else.
function drawEdgeLabel(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  edgeLayout: Diagram["edgeLayout"],
  edge: DiagramEdge,
  font: Font,
  fontSize: number,
): void {
  if (edge.label === null || edge.label === "") return;
  requireLandscapeNormal(edgeLayout, edge);

  const labelbox = landscapeLabelbox(edge, metrics);
  doc.textarea(labelbox, edge.label, font, fontSize, { fill: edge.textcolor, outline: BLACK });
}

// Ported from `DiagramDraw._draw_elements()`'s two edge loops (shafts+
// heads, then labels - a separate pass so every edge's own label ends
// up drawn over every edge's own line, not just its own).
export function drawEdges(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  diagram: Diagram,
  font: Font,
  defaultFontSize: number,
): void {
  const edges = drawableEdges(diagram);

  for (const edge of edges) {
    drawEdge(doc, metrics, diagram.edgeLayout, edge, font, edge.fontsize ?? defaultFontSize);
  }
  for (const edge of edges) {
    drawEdgeLabel(doc, metrics, diagram.edgeLayout, edge, font, edge.fontsize ?? defaultFontSize);
  }
}
