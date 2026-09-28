// Ported from `FlowchartLandscapeEdgeMetrics`/`FlowchartPortraitEdgeMetrics`
// (vendor/blockdiag/src/blockdiag/metrics.py): small deltas the
// `edge_layout = flowchart` mode adds on top of `Landscape`/
// `PortraitEdgeMetrics` - each only actually diverges from its parent
// for one particular `edge.direction`, delegating to it otherwise.
import type { DiagramEdge } from "../model/elements.js";
import type { Connectors } from "./connectors.js";
import { EdgeLines } from "./edge-lines.js";
import type { HeadDirection } from "./edge-metrics.js";
import { edgeDirection } from "./edge-metrics.js";
import type { Box } from "./geometry.js";
import { boxBottom, boxBottomRight, boxLeft, boxRight, boxTop, boxTopLeft } from "./geometry.js";
import { landscapeHeadshapes, landscapeLabelbox, landscapeShaft } from "./landscape-edge-metrics.js";
import type { DiagramMetrics } from "./metrics.js";
import { nodeBox } from "./metrics.js";
import { portraitHeadshapes, portraitLabelbox, portraitShaft } from "./portrait-edge-metrics.js";

// Ported from `FlowchartLandscapeEdgeMetrics.headshapes`.
export function flowchartLandscapeHeadshapes(edge: DiagramEdge): readonly [HeadDirection | null, HeadDirection | null] {
  if (edgeDirection(edge) !== "right-down") return landscapeHeadshapes(edge);

  let head1: HeadDirection | null = null;
  if (edge.dir === "back" || edge.dir === "both") {
    head1 = edge.hstyle === "manyone" || edge.hstyle === "manymany" ? "rup" : "up";
  }

  let head2: HeadDirection | null = null;
  if (edge.dir === "forward" || edge.dir === "both") {
    head2 = edge.hstyle === "onemany" || edge.hstyle === "manymany" ? "rright" : "right";
  }

  return [head1, head2];
}

// Ported from `FlowchartLandscapeEdgeMetrics._shaft`.
export function flowchartLandscapeShaft(
  edge: DiagramEdge,
  metrics: DiagramMetrics,
  node1: Connectors,
  node2: Connectors,
): EdgeLines {
  if (edgeDirection(edge) !== "right-down") return landscapeShaft(edge, metrics, node1, node2);

  const span = { x: metrics.spanWidth, y: metrics.spanHeight };
  const cell1 = nodeBox(metrics, edge.node1, false);
  const cell2 = nodeBox(metrics, edge.node2, false);

  const shaft = new EdgeLines();
  shaft.moveTo(node1.bottom);

  if (edge.skipped) {
    const cell1Bottom = boxBottom(cell1);
    const cell2Left = boxLeft(cell2);
    shaft.lineTo({ x: cell1Bottom.x, y: cell1Bottom.y + Math.floor(span.y / 2) });
    shaft.lineTo({ x: cell2Left.x - Math.floor(span.x / 4), y: cell1Bottom.y + Math.floor(span.y / 2) });
    shaft.lineTo({ x: cell2Left.x - Math.floor(span.x / 4), y: cell2Left.y });
  } else {
    const cell1Bottom = boxBottom(cell1);
    const cell2Left = boxLeft(cell2);
    shaft.lineTo({ x: cell1Bottom.x, y: cell2Left.y });
  }

  shaft.lineTo(node2.left);
  return shaft;
}

// Ported from `FlowchartLandscapeEdgeMetrics.labelbox`.
export function flowchartLandscapeLabelbox(edge: DiagramEdge, metrics: DiagramMetrics): Box {
  if (edgeDirection(edge) !== "right") return landscapeLabelbox(edge, metrics);

  const span = { x: metrics.spanWidth, y: metrics.spanHeight };
  const cell1 = nodeBox(metrics, edge.node1, false);
  const cell2 = nodeBox(metrics, edge.node2, false);

  if (edge.skipped) {
    const cell1Bottom = boxBottom(cell1);
    const cell1BottomRight = boxBottomRight(cell1);
    return {
      x1: cell1Bottom.x,
      y1: cell1Bottom.y,
      x2: cell1BottomRight.x,
      y2: cell1BottomRight.y + Math.floor(span.y / 2),
    };
  }

  const cell1Bottom = boxBottom(cell1);
  const cell2Left = boxLeft(cell2);
  return { x1: cell1Bottom.x, y1: cell2Left.y - Math.floor(span.y / 2), x2: cell1Bottom.x, y2: cell2Left.y };
}

// Ported from `FlowchartPortraitEdgeMetrics.headshapes`. The forward
// branch's own `hstyle` check is a real bug in the original - it tests
// `self.edge.dir in ('onemany', 'manymany')`, but `dir` only ever holds
// `forward`/`back`/`both`/`none` (the *other* check, just above,
// correctly tests `hstyle`) - so that condition is always false, and
// this head is always the plain `down`, never the open `rdown` variant,
// regardless of `hstyle`. Ported faithfully (bug included) rather than
// silently making it check `hstyle` instead, since that would draw
// something the original never actually draws.
export function flowchartPortraitHeadshapes(edge: DiagramEdge): readonly [HeadDirection | null, HeadDirection | null] {
  if (edgeDirection(edge) !== "right-down") return portraitHeadshapes(edge);

  const head1: HeadDirection | null = edge.dir === "back" || edge.dir === "both" ? "left" : null;
  const head2: HeadDirection | null = edge.dir === "forward" || edge.dir === "both" ? "down" : null;

  return [head1, head2];
}

// Ported from `FlowchartPortraitEdgeMetrics._shaft`.
export function flowchartPortraitShaft(
  edge: DiagramEdge,
  metrics: DiagramMetrics,
  node1: Connectors,
  node2: Connectors,
): EdgeLines {
  if (edgeDirection(edge) !== "right-down") return portraitShaft(edge, metrics, node1, node2);

  const span = { x: metrics.spanWidth, y: metrics.spanHeight };
  const cell1 = nodeBox(metrics, edge.node1, false);
  const cell2 = nodeBox(metrics, edge.node2, false);

  const shaft = new EdgeLines();
  shaft.moveTo(node1.right);

  if (edge.skipped) {
    const cell1Right = boxRight(cell1);
    const cell2TopLeft = boxTopLeft(cell2);
    const cell2Top = boxTop(cell2);
    shaft.lineTo({ x: cell1Right.x + Math.floor((span.x * 3) / 4), y: cell1Right.y });
    shaft.lineTo({ x: cell1Right.x + Math.floor((span.x * 3) / 4), y: cell2TopLeft.y - Math.floor(span.y / 2) });
    shaft.lineTo({ x: cell2Top.x, y: cell2Top.y - Math.floor(span.y / 2) });
  } else {
    const cell1Right = boxRight(cell1);
    const cell2Top = boxTop(cell2);
    shaft.lineTo({ x: cell2Top.x, y: cell1Right.y });
  }

  shaft.lineTo(node2.top);
  return shaft;
}

// Ported from `FlowchartPortraitEdgeMetrics.labelbox`.
export function flowchartPortraitLabelbox(edge: DiagramEdge, metrics: DiagramMetrics): Box {
  const _dir = edgeDirection(edge);
  const span = { x: metrics.spanWidth, y: metrics.spanHeight };
  const cell1 = nodeBox(metrics, edge.node1, false);
  const cell2 = nodeBox(metrics, edge.node2, false);

  if (_dir === "down") {
    const cell2TopLeft = boxTopLeft(cell2);
    const cell2Top = boxTop(cell2);
    return { x1: cell2TopLeft.x, y1: cell2Top.y - Math.floor(span.y / 2), x2: cell2Top.x, y2: cell2Top.y };
  }

  if (_dir === "right") {
    if (edge.skipped) {
      const cell1Bottom = boxBottom(cell1);
      const cell1BottomRight = boxBottomRight(cell1);
      return {
        x1: cell1Bottom.x,
        y1: cell1Bottom.y,
        x2: cell1BottomRight.x,
        y2: cell1BottomRight.y + Math.floor(span.y / 2),
      };
    }

    const cell1Bottom = boxBottom(cell1);
    const cell2Left = boxLeft(cell2);
    return { x1: cell1Bottom.x, y1: cell2Left.y - Math.floor(span.y / 2), x2: cell1Bottom.x, y2: cell2Left.y };
  }

  return portraitLabelbox(edge, metrics);
}
