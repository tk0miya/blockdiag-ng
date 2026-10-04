// Ported from `LandscapeEdgeMetrics` (vendor/blockdiag/src/blockdiag/
// metrics.py): edge routing for a `landscape`-oriented group (the
// default - top-to-bottom rows, left-to-right columns), the routing
// `edge_layout = flowchart` also builds on for every direction except
// `right-down` (a later step's small delta on top of this one).
import type { DiagramEdge } from "../model/elements.js";
import type { Connectors } from "./connectors.js";
import { EdgeLines } from "./edge-lines.js";
import type { HeadDirection } from "./edge-metrics.js";
import { edgeDirection } from "./edge-metrics.js";
import type { Box } from "./geometry.js";
import {
  boxBottom,
  boxBottomLeft,
  boxBottomRight,
  boxLeft,
  boxRight,
  boxTop,
  boxTopLeft,
  boxTopRight,
} from "./geometry.js";
import type { DiagramMetrics } from "./metrics.js";
import { nodeBox } from "./metrics.js";

// Ported from `LandscapeEdgeMetrics.headshapes`: which end(s) grow an
// arrowhead, and which of the 8 `HeadDirection`s each one points in -
// `edge.dir` (`"forward"`/`"back"`/`"both"`/`"none"`) selects whether
// there's a head at all on each end, `edge.direction` (this edge's own
// geometric direction, `edgeDirection()`) selects which way it points,
// and `hstyle` (`"onemany"`/`"manyone"`/`"manymany"`) switches the
// relevant end's shape to its open `r`-prefixed variant on top of that
// (see `headPoints()`).
export function landscapeHeadshapes(edge: DiagramEdge): readonly [HeadDirection | null, HeadDirection | null] {
  const _dir = edgeDirection(edge);
  let head1: HeadDirection | null = null;
  let head2: HeadDirection | null = null;

  if (edge.dir === "back" || edge.dir === "both") {
    if (
      _dir === "left-up" ||
      _dir === "left" ||
      _dir === "same" ||
      _dir === "right-up" ||
      _dir === "right" ||
      _dir === "right-down"
    ) {
      head1 = "left";
    } else if (_dir === "up") {
      head1 = edge.skipped ? "left" : "down";
    } else if (_dir === "left-down" || _dir === "down") {
      head1 = edge.skipped ? "left" : "up";
    }

    if (head1 !== null && (edge.hstyle === "manyone" || edge.hstyle === "manymany")) {
      head1 = `r${head1}` as HeadDirection;
    }
  }

  if (edge.dir === "forward" || edge.dir === "both") {
    if (_dir === "right-up" || _dir === "right" || _dir === "right-down") {
      head2 = "right";
    } else if (_dir === "up") {
      head2 = "up";
    } else if (_dir === "left-up" || _dir === "left" || _dir === "left-down" || _dir === "down" || _dir === "same") {
      head2 = "down";
    }

    if (head2 !== null && (edge.hstyle === "onemany" || edge.hstyle === "manymany")) {
      head2 = `r${head2}` as HeadDirection;
    }
  }

  return [head1, head2];
}

// Ported from `LandscapeEdgeMetrics._shaft`: the edge's raw route
// (before `adjustShaftForHeads()` pulls its endpoints in for whichever
// ends grow a head) - `node1`/`node2` are the shape-aware attachment
// points a line actually touches (`connectors.ts`), `cell1`/`cell2` are
// the plain grid cells (`nodeBox()`, unpadded) the route's own
// intermediate waypoints are measured from when it has to bend around
// an intervening column/row (`edge.skipped`).
export function landscapeShaft(
  edge: DiagramEdge,
  metrics: DiagramMetrics,
  node1: Connectors,
  node2: Connectors,
): EdgeLines {
  const span = { x: metrics.spanWidth, y: metrics.spanHeight };
  const _dir = edgeDirection(edge);
  const cell1 = nodeBox(metrics, edge.node1, false);
  const cell2 = nodeBox(metrics, edge.node2, false);

  const shaft = new EdgeLines();

  if (_dir === "right") {
    shaft.moveTo(node1.right);

    if (edge.skipped) {
      const cell1Right = boxRight(cell1);
      const cell1BottomRight = boxBottomRight(cell1);
      const cell2BottomRight = boxBottomRight(cell2);
      const cell2Left = boxLeft(cell2);
      shaft.lineTo({ x: cell1Right.x + Math.floor(span.x / 2), y: cell1Right.y });
      shaft.lineTo({ x: cell1Right.x + Math.floor(span.x / 2), y: cell1BottomRight.y + Math.floor(span.y / 2) });
      shaft.lineTo({ x: cell2Left.x - Math.floor(span.x / 4), y: cell2BottomRight.y + Math.floor(span.y / 2) });
      shaft.lineTo({ x: cell2Left.x - Math.floor(span.x / 4), y: cell2Left.y });
    }

    shaft.lineTo(node2.left);
  } else if (_dir === "right-up") {
    shaft.moveTo(node1.right);

    if (edge.skipped) {
      const cell1Right = boxRight(cell1);
      const cell2BottomLeft = boxBottomLeft(cell2);
      const cell2Left = boxLeft(cell2);
      shaft.lineTo({ x: cell1Right.x + Math.floor(span.x / 2), y: cell1Right.y });
      shaft.lineTo({ x: cell1Right.x + Math.floor(span.x / 2), y: cell2BottomLeft.y + Math.floor(span.y / 2) });
      shaft.lineTo({ x: cell2Left.x - Math.floor(span.x / 4), y: cell2BottomLeft.y + Math.floor(span.y / 2) });
      shaft.lineTo({ x: cell2Left.x - Math.floor(span.x / 4), y: cell2Left.y });
    } else {
      const cell1Right = boxRight(cell1);
      const cell2Left = boxLeft(cell2);
      shaft.lineTo({ x: cell2Left.x - Math.floor(span.x / 4), y: cell1Right.y });
      shaft.lineTo({ x: cell2Left.x - Math.floor(span.x / 4), y: cell2Left.y });
    }

    shaft.lineTo(node2.left);
  } else if (_dir === "right-down") {
    const cell1Right = boxRight(cell1);
    shaft.moveTo(node1.right);
    shaft.lineTo({ x: cell1Right.x + Math.floor(span.x / 2), y: cell1Right.y });

    if (edge.skipped) {
      const cell2TopLeft = boxTopLeft(cell2);
      const cell2Left = boxLeft(cell2);
      shaft.lineTo({ x: cell1Right.x + Math.floor(span.x / 2), y: cell2TopLeft.y - Math.floor(span.y / 2) });
      shaft.lineTo({ x: cell2Left.x - Math.floor(span.x / 4), y: cell2TopLeft.y - Math.floor(span.y / 2) });
      shaft.lineTo({ x: cell2Left.x - Math.floor(span.x / 4), y: cell2Left.y });
    } else {
      const cell2Left = boxLeft(cell2);
      shaft.lineTo({ x: cell1Right.x + Math.floor(span.x / 2), y: cell2Left.y });
    }

    shaft.lineTo(node2.left);
  } else if (_dir === "up") {
    if (edge.skipped) {
      const cell1Right = boxRight(cell1);
      const cell2Bottom = boxBottom(cell2);
      shaft.moveTo(node1.right);
      shaft.lineTo({ x: cell1Right.x + Math.floor(span.x / 4), y: cell1Right.y });
      shaft.lineTo({ x: cell1Right.x + Math.floor(span.x / 4), y: cell2Bottom.y + Math.floor(span.y / 2) });
      shaft.lineTo({ x: cell2Bottom.x, y: cell2Bottom.y + Math.floor(span.y / 2) });
    } else {
      shaft.moveTo(node1.top);
    }

    shaft.lineTo(node2.bottom);
  } else if (_dir === "left-up" || _dir === "left" || _dir === "same") {
    const cell1Right = boxRight(cell1);
    const cell2Top = boxTop(cell2);
    shaft.moveTo(node1.right);
    shaft.lineTo({ x: cell1Right.x + Math.floor(span.x / 4), y: cell1Right.y });
    shaft.lineTo({
      x: cell1Right.x + Math.floor(span.x / 4),
      y: cell2Top.y - Math.floor(span.y / 2) + Math.floor(span.y / 8),
    });
    shaft.lineTo({ x: cell2Top.x, y: cell2Top.y - Math.floor(span.y / 2) + Math.floor(span.y / 8) });
    shaft.lineTo(node2.top);
  } else if (_dir === "left-down") {
    const cell2Top = boxTop(cell2);
    if (edge.skipped) {
      const cell1Right = boxRight(cell1);
      shaft.moveTo(node1.right);
      shaft.lineTo({ x: cell1Right.x + Math.floor(span.x / 2), y: cell1Right.y });
      shaft.lineTo({ x: cell1Right.x + Math.floor(span.x / 2), y: cell2Top.y - Math.floor(span.y / 2) });
      shaft.lineTo({ x: cell2Top.x, y: cell2Top.y - Math.floor(span.y / 2) });
    } else {
      const cell1Bottom = boxBottom(cell1);
      shaft.moveTo(node1.bottom);
      shaft.lineTo({ x: cell1Bottom.x, y: cell2Top.y - Math.floor(span.y / 2) });
      shaft.lineTo({ x: cell2Top.x, y: cell2Top.y - Math.floor(span.y / 2) });
    }

    shaft.lineTo(node2.top);
  } else if (_dir === "down") {
    const cell2Top = boxTop(cell2);
    if (edge.skipped) {
      const cell1Right = boxRight(cell1);
      shaft.moveTo(node1.right);
      shaft.lineTo({ x: cell1Right.x + Math.floor(span.x / 2), y: cell1Right.y });
      shaft.lineTo({
        x: cell1Right.x + Math.floor(span.x / 2),
        y: cell2Top.y - Math.floor(span.y / 2) + Math.floor(span.y / 8),
      });
      shaft.lineTo({ x: cell2Top.x, y: cell2Top.y - Math.floor(span.y / 2) + Math.floor(span.y / 8) });
    } else {
      shaft.moveTo(node1.bottom);
    }

    shaft.lineTo(node2.top);
  }

  return shaft;
}

// Ported from `LandscapeEdgeMetrics.labelbox`: where an edge's own
// label sits, tucked near its shaft rather than centered on it -
// grouped by `edge.direction` rather than mirroring `_shaft`'s own
// direction cases one-for-one, matching the original. Uses the plain
// grid cell (`nodeBox()`, unpadded) for both nodes, not the shape-aware
// connectors `_shaft` needs - a label's placement doesn't depend on the
// node's own shape.
export function landscapeLabelbox(edge: DiagramEdge, metrics: DiagramMetrics): Box {
  const span = { x: metrics.spanWidth, y: metrics.spanHeight };
  const node = { x: metrics.nodeWidth, y: metrics.nodeHeight };
  const _dir = edgeDirection(edge);
  const cell1 = nodeBox(metrics, edge.node1, false);
  const cell2 = nodeBox(metrics, edge.node2, false);

  let box: Box;

  if (_dir === "right") {
    if (edge.skipped) {
      const cell1BottomRight = boxBottomRight(cell1);
      const cell2BottomLeft = boxBottomLeft(cell2);
      box = {
        x1: cell1BottomRight.x + span.x,
        y1: cell1BottomRight.y,
        x2: cell2BottomLeft.x - span.x,
        y2: cell2BottomLeft.y + Math.floor(span.y / 2),
      };
    } else {
      const cell1TopRight = boxTopRight(cell1);
      const cell2Left = boxLeft(cell2);
      box = {
        x1: cell1TopRight.x,
        y1: cell1TopRight.y - Math.floor(span.y / 8),
        x2: cell2Left.x,
        y2: cell2Left.y - Math.floor(span.y / 8),
      };
    }
  } else if (_dir === "right-up") {
    const cell2Left = boxLeft(cell2);
    const cell1Top = boxTop(cell1);
    const cell2BottomLeft = boxBottomLeft(cell2);
    box = {
      x1: cell2Left.x - span.x,
      y1: cell1Top.y - Math.floor(node.y / 2),
      x2: cell2BottomLeft.x,
      y2: cell1Top.y,
    };
  } else if (_dir === "right-down") {
    const cell1Right = boxRight(cell1);
    const cell2TopLeft = boxTopLeft(cell2);
    const cell2Left = boxLeft(cell2);
    box = {
      x1: cell1Right.x,
      y1: cell2TopLeft.y - Math.floor(span.y / 8),
      x2: cell1Right.x + span.x,
      y2: cell2Left.y - Math.floor(span.y / 8),
    };
  } else if (_dir === "up" || _dir === "left-up" || _dir === "left" || _dir === "same") {
    if (edge.node2.xy.y < edge.node1.xy.y) {
      const cell1TopRight = boxTopRight(cell1);
      box = {
        x1: cell1TopRight.x - Math.floor(span.x / 2) + Math.floor(span.x / 4),
        y1: cell1TopRight.y - Math.floor(span.y / 2),
        x2: cell1TopRight.x + Math.floor(span.x / 2) + Math.floor(span.x / 4),
        y2: cell1TopRight.y,
      };
    } else {
      const cell1Top = boxTop(cell1);
      const cell1TopRight = boxTopRight(cell1);
      box = {
        x1: cell1Top.x + Math.floor(span.x / 4),
        y1: cell1Top.y - span.y,
        x2: cell1TopRight.x + Math.floor(span.x / 4),
        y2: cell1TopRight.y - Math.floor(span.y / 2),
      };
    }
  } else {
    // left-down, down
    const cell2Top = boxTop(cell2);
    const cell2TopRight = boxTopRight(cell2);
    box = {
      x1: cell2Top.x + Math.floor(span.x / 4),
      y1: cell2Top.y - span.y,
      x2: cell2TopRight.x + Math.floor(span.x / 4),
      y2: cell2TopRight.y - Math.floor(span.y / 2),
    };
  }

  // shrink box
  return {
    x1: box.x1 + Math.floor(span.x / 8),
    y1: box.y1,
    x2: box.x2 - Math.floor(span.x / 8),
    y2: box.y2,
  };
}
