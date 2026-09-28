// Ported from `DiagramDraw.edge()`/`.edge_label()` (vendor/blockdiag/
// src/blockdiag/drawer.py).
import { collectAllEdges } from "../layout/group-layout.js";
import type { Diagram, DiagramEdge, GroupOrientation } from "../model/elements.js";
import { nodeConnectors } from "./connectors.js";
import { adjustShaftForHeads, edgeHeads } from "./edge-metrics.js";
import {
  flowchartLandscapeHeadshapes,
  flowchartLandscapeLabelbox,
  flowchartLandscapeShaft,
  flowchartPortraitHeadshapes,
  flowchartPortraitLabelbox,
  flowchartPortraitShaft,
} from "./flowchart-edge-metrics.js";
import type { Font } from "./font-metrics.js";
import { landscapeHeadshapes, landscapeLabelbox, landscapeShaft } from "./landscape-edge-metrics.js";
import type { DiagramMetrics } from "./metrics.js";
import { portraitHeadshapes, portraitLabelbox, portraitShaft } from "./portrait-edge-metrics.js";
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

// Ported from `DiagramMetrics.edge()`'s own dispatch: which of the four
// `EdgeMetrics` subclasses (`Landscape`/`Portrait`, each with a
// `Flowchart*` variant) an edge's own group orientation and the
// diagram-wide `edge_layout` pick.
function edgeMetricsFor(edgeLayout: Diagram["edgeLayout"], orientation: GroupOrientation) {
  if (edgeLayout === "flowchart") {
    return orientation === "portrait"
      ? { headshapes: flowchartPortraitHeadshapes, shaft: flowchartPortraitShaft, labelbox: flowchartPortraitLabelbox }
      : {
          headshapes: flowchartLandscapeHeadshapes,
          shaft: flowchartLandscapeShaft,
          labelbox: flowchartLandscapeLabelbox,
        };
  }
  return orientation === "portrait"
    ? { headshapes: portraitHeadshapes, shaft: portraitShaft, labelbox: portraitLabelbox }
    : { headshapes: landscapeHeadshapes, shaft: landscapeShaft, labelbox: landscapeLabelbox };
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
  const orientation = edge.node1.group?.orientation ?? "landscape";
  const { headshapes: headshapesFor, shaft: shaftFor } = edgeMetricsFor(edgeLayout, orientation);

  const node1 = nodeConnectors(metrics, edge.node1, font, fontSize);
  const node2 = nodeConnectors(metrics, edge.node2, font, fontSize);
  const headshapes = headshapesFor(edge);
  const raw = shaftFor(edge, metrics, node1, node2);
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

  const orientation = edge.node1.group?.orientation ?? "landscape";
  const { labelbox: labelboxFor } = edgeMetricsFor(edgeLayout, orientation);

  const labelbox = labelboxFor(edge, metrics);
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
