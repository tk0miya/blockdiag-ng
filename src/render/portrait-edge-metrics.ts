// Ported from `PortraitEdgeMetrics` (vendor/blockdiag/src/blockdiag/
// metrics.py): edge routing for a `portrait`-oriented group (top-to-
// bottom columns, left-to-right rows swapped from `landscape` -
// see landscape-edge-metrics.ts, this module's own direct counterpart).
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

// Ported from `PortraitEdgeMetrics.headshapes`.
export function portraitHeadshapes(edge: DiagramEdge): readonly [HeadDirection | null, HeadDirection | null] {
  const _dir = edgeDirection(edge);
  let head1: HeadDirection | null = null;
  let head2: HeadDirection | null = null;

  if (edge.dir === "back" || edge.dir === "both") {
    if (_dir === "right") {
      head1 = edge.skipped ? "up" : "left";
    } else if (_dir === "up" || _dir === "right-up" || _dir === "same") {
      head1 = "up";
    } else if (_dir === "left-up" || _dir === "left") {
      head1 = "left";
    } else if (_dir === "left-down" || _dir === "down" || _dir === "right-down") {
      head1 = edge.skipped ? "left" : "up";
    }

    if (head1 !== null && (edge.hstyle === "manyone" || edge.hstyle === "manymany")) {
      head1 = `r${head1}` as HeadDirection;
    }
  }

  if (edge.dir === "forward" || edge.dir === "both") {
    if (_dir === "right") {
      head2 = edge.skipped ? "down" : "right";
    } else if (_dir === "up" || _dir === "right-up" || _dir === "same") {
      head2 = "down";
    } else if (
      _dir === "left-up" ||
      _dir === "left" ||
      _dir === "left-down" ||
      _dir === "down" ||
      _dir === "right-down"
    ) {
      head2 = "down";
    }

    if (head2 !== null && (edge.hstyle === "onemany" || edge.hstyle === "manymany")) {
      head2 = `r${head2}` as HeadDirection;
    }
  }

  return [head1, head2];
}

// Ported from `PortraitEdgeMetrics._shaft`.
export function portraitShaft(
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

  if (_dir === "up" || _dir === "right-up" || _dir === "same" || _dir === "right") {
    if (_dir === "right" && !edge.skipped) {
      shaft.moveTo(node1.right);
      shaft.lineTo(node2.left);
    } else {
      const cell1Bottom = boxBottom(cell1);
      const cell2Right = boxRight(cell2);
      const cell2Top = boxTop(cell2);
      shaft.moveTo(node1.bottom);
      shaft.lineTo({ x: cell1Bottom.x, y: cell1Bottom.y + Math.floor(span.y / 2) });
      shaft.lineTo({ x: cell2Right.x + Math.floor(span.x / 4), y: cell1Bottom.y + Math.floor(span.y / 2) });
      shaft.lineTo({
        x: cell2Right.x + Math.floor(span.x / 4),
        y: cell2Top.y - Math.floor(span.y / 2) + Math.floor(span.y / 8),
      });
      shaft.lineTo({ x: cell2Top.x, y: cell2Top.y - Math.floor(span.y / 2) + Math.floor(span.y / 8) });
      shaft.lineTo(node2.top);
    }
  } else if (_dir === "right-down") {
    const cell1Bottom = boxBottom(cell1);
    shaft.moveTo(node1.bottom);
    shaft.lineTo({ x: cell1Bottom.x, y: cell1Bottom.y + Math.floor(span.y / 2) });

    if (edge.skipped) {
      const cell2Left = boxLeft(cell2);
      const cell2TopLeft = boxTopLeft(cell2);
      const cell2Top = boxTop(cell2);
      shaft.lineTo({ x: cell2Left.x - Math.floor(span.x / 2), y: cell1Bottom.y + Math.floor(span.y / 2) });
      shaft.lineTo({ x: cell2TopLeft.x - Math.floor(span.x / 2), y: cell2TopLeft.y - Math.floor(span.y / 2) });
      shaft.lineTo({ x: cell2Top.x, y: cell2Top.y - Math.floor(span.y / 2) });
    } else {
      const cell2Top = boxTop(cell2);
      shaft.lineTo({ x: cell2Top.x, y: cell1Bottom.y + Math.floor(span.y / 2) });
    }

    shaft.lineTo(node2.top);
  } else if (_dir === "left-up" || _dir === "left") {
    // The original also lists `same` in this `elif` (`_shaft`'s own
    // `elif _dir in ('left-up', 'left', 'same')`), but it can never
    // actually reach here - the first branch above already claims
    // `same` (`if _dir in ('up', 'right-up', 'same', 'right')`), so
    // that repeat is dead code there too, not something this port
    // dropped.
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
    shaft.moveTo(node1.bottom);

    if (edge.skipped) {
      const cell1Bottom = boxBottom(cell1);
      const cell2Right = boxRight(cell2);
      shaft.lineTo({ x: cell1Bottom.x, y: cell1Bottom.y + Math.floor(span.y / 2) });
      shaft.lineTo({ x: cell2Right.x + Math.floor(span.x / 2), y: cell1Bottom.y + Math.floor(span.y / 2) });
      shaft.lineTo({ x: cell2Right.x + Math.floor(span.x / 2), y: cell2Top.y - Math.floor(span.y / 2) });
    } else {
      const cell1Bottom = boxBottom(cell1);
      shaft.lineTo({ x: cell1Bottom.x, y: cell2Top.y - Math.floor(span.y / 2) });
    }

    shaft.lineTo({ x: cell2Top.x, y: cell2Top.y - Math.floor(span.y / 2) });
    shaft.lineTo(node2.top);
  } else if (_dir === "down") {
    shaft.moveTo(node1.bottom);

    if (edge.skipped) {
      const cell1Bottom = boxBottom(cell1);
      const cell1Right = boxRight(cell1);
      const cell2Right = boxRight(cell2);
      const cell2Top = boxTop(cell2);
      shaft.lineTo({ x: cell1Bottom.x, y: cell1Bottom.y + Math.floor(span.y / 2) });
      shaft.lineTo({ x: cell1Right.x + Math.floor(span.x / 2), y: cell1Bottom.y + Math.floor(span.y / 2) });
      shaft.lineTo({ x: cell2Right.x + Math.floor(span.x / 2), y: cell2Top.y - Math.floor(span.y / 2) });
      shaft.lineTo({ x: cell2Top.x, y: cell2Top.y - Math.floor(span.y / 2) });
    }

    shaft.lineTo(node2.top);
  }

  return shaft;
}

// Ported from `PortraitEdgeMetrics.labelbox`.
export function portraitLabelbox(edge: DiagramEdge, metrics: DiagramMetrics): Box {
  const span = { x: metrics.spanWidth, y: metrics.spanHeight };
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
    const cell2BottomLeft = boxBottomLeft(cell2);
    box = { x1: cell2Left.x - span.x, y1: cell2Left.y, x2: cell2BottomLeft.x, y2: cell2BottomLeft.y };
  } else if (_dir === "right-down") {
    const cell2TopLeft = boxTopLeft(cell2);
    const cell2Top = boxTop(cell2);
    box = { x1: cell2TopLeft.x, y1: cell2TopLeft.y - Math.floor(span.y / 2), x2: cell2Top.x, y2: cell2Top.y };
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
  } else if (_dir === "down") {
    const cell2Top = boxTop(cell2);
    const cell2TopRight = boxTopRight(cell2);
    box = {
      x1: cell2Top.x + Math.floor(span.x / 4),
      y1: cell2Top.y - Math.floor(span.y / 2),
      x2: cell2TopRight.x + Math.floor(span.x / 4),
      y2: cell2TopRight.y,
    };
  } else {
    // left-down
    const cell1BottomLeft = boxBottomLeft(cell1);
    const cell1Bottom = boxBottom(cell1);
    box = {
      x1: cell1BottomLeft.x,
      y1: cell1BottomLeft.y,
      x2: cell1Bottom.x,
      y2: cell1Bottom.y + Math.floor(span.y / 2),
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
