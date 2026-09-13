// Ported from `EdgeMetrics` (vendor/blockdiag/src/blockdiag/metrics.py):
// the parts shared by every orientation/layout-specific subclass
// (`LandscapeEdgeMetrics` and friends, added in later steps) - the
// arrow-head polygon for one end, and the shaft-endpoint adjustment that
// makes room for whichever ends actually grow a head. `edgeDirection()`
// (an edge's own geometric direction, as opposed to `edge.dir`, the
// user-requested arrowhead direction) is needed here too, but lives in
// `layout/edge-routing.ts` (re-exported below) since that module already
// ported the exact same `DiagramEdge.direction` computation for its own
// skip-detection - shared rather than duplicated.
import type { EdgeHeadStyle } from "../model/elements.js";
import type { Connectors } from "./connectors.js";
import type { EdgeLines } from "./edge-lines.js";
import type { Point } from "./geometry.js";

export { type EdgeGeometricDirection, edgeDirection } from "../layout/edge-routing.js";

// Ported from `EdgeMetrics._head()`'s own `direct` values - which
// connector point a head sits on (`heads`/`_shaft`'s shared vocabulary).
// The `r`-prefixed variants are the same position, only open (no back
// point) unless `hstyle` is `composition`/`aggregation` - see
// `headPoints()`.
export type HeadDirection = "up" | "down" | "left" | "right" | "rup" | "rdown" | "rright" | "rleft";

// Ported from `EdgeMetrics._head()`: a closed 5-point polygon (a kite
// shape - tip, two side points, a back point, and the tip again to
// close it) pointing at `connectors`' own top/right/bottom/left,
// depending on `direct`. `hstyle` being `composition`/`aggregation`
// keeps all 5 points (an open diamond/kite outline, drawn unfilled by
// draw-edges.ts, added in a later step); every other `hstyle` (`null`
// included) drops the back point, leaving a plain 4-point closed
// triangle.
export function headPoints(
  connectors: Connectors,
  direct: HeadDirection,
  cellSize: number,
  hstyle: EdgeHeadStyle | null,
): Point[] {
  const cell = cellSize;
  let head: Point[];

  switch (direct) {
    case "up": {
      const xy = connectors.bottom;
      head = [
        { x: xy.x, y: xy.y + 1 },
        { x: xy.x - Math.floor(cell / 2), y: xy.y + cell },
        { x: xy.x, y: xy.y + cell * 2 },
        { x: xy.x + Math.floor(cell / 2), y: xy.y + cell },
        { x: xy.x, y: xy.y + 1 },
      ];
      break;
    }
    case "down": {
      const xy = connectors.top;
      head = [
        { x: xy.x, y: xy.y - 1 },
        { x: xy.x - Math.floor(cell / 2), y: xy.y - cell },
        { x: xy.x, y: xy.y - cell * 2 },
        { x: xy.x + Math.floor(cell / 2), y: xy.y - cell },
        { x: xy.x, y: xy.y - 1 },
      ];
      break;
    }
    case "right": {
      const xy = connectors.left;
      head = [
        { x: xy.x - 1, y: xy.y },
        { x: xy.x - cell, y: xy.y - Math.floor(cell / 2) },
        { x: xy.x - cell * 2, y: xy.y },
        { x: xy.x - cell, y: xy.y + Math.floor(cell / 2) },
        { x: xy.x - 1, y: xy.y },
      ];
      break;
    }
    case "left": {
      const xy = connectors.right;
      head = [
        { x: xy.x + 1, y: xy.y },
        { x: xy.x + cell, y: xy.y - Math.floor(cell / 2) },
        { x: xy.x + cell * 2, y: xy.y },
        { x: xy.x + cell, y: xy.y + Math.floor(cell / 2) },
        { x: xy.x + 1, y: xy.y },
      ];
      break;
    }
    case "rup": {
      const xy = connectors.bottom;
      head = [
        { x: xy.x, y: xy.y + cell },
        { x: xy.x - cell, y: xy.y + 1 },
        { x: xy.x, y: xy.y + 1 * 2 },
        { x: xy.x + cell, y: xy.y + 1 },
        { x: xy.x, y: xy.y + cell },
      ];
      break;
    }
    case "rdown": {
      const xy = connectors.top;
      head = [
        { x: xy.x, y: xy.y - cell },
        { x: xy.x - cell, y: xy.y - 1 },
        { x: xy.x, y: xy.y - 1 * 2 },
        { x: xy.x + cell, y: xy.y - 1 },
        { x: xy.x, y: xy.y - cell },
      ];
      break;
    }
    case "rright": {
      const xy = connectors.left;
      head = [
        { x: xy.x - cell, y: xy.y },
        { x: xy.x - 1, y: xy.y - cell },
        { x: xy.x - 1 * 2, y: xy.y },
        { x: xy.x - 1, y: xy.y + cell },
        { x: xy.x - cell, y: xy.y },
      ];
      break;
    }
    case "rleft": {
      const xy = connectors.right;
      head = [
        { x: xy.x + cell, y: xy.y },
        { x: xy.x + 1, y: xy.y - cell },
        { x: xy.x + 1 * 2, y: xy.y },
        { x: xy.x + 1, y: xy.y + cell },
        { x: xy.x + cell, y: xy.y },
      ];
      break;
    }
  }

  if (hstyle !== "composition" && hstyle !== "aggregation") {
    head.splice(2, 1);
  }

  return head;
}

// Ported from `EdgeMetrics.heads`: one polygon per end whose own
// `headshapes` entry (from the orientation-specific subclass) isn't
// `null` - a `dir` of `"none"` (no arrowhead at either end) yields both
// `null`, so this returns an empty array.
export function edgeHeads(
  headshapes: readonly [HeadDirection | null, HeadDirection | null],
  connectors1: Connectors,
  connectors2: Connectors,
  cellSize: number,
  hstyle: EdgeHeadStyle | null,
): Point[][] {
  const [head1, head2] = headshapes;
  const heads: Point[][] = [];
  if (head1 !== null) heads.push(headPoints(connectors1, head1, cellSize, hstyle));
  if (head2 !== null) heads.push(headPoints(connectors2, head2, cellSize, hstyle));
  return heads;
}

// Ported from `EdgeMetrics.shaft`: the `r`-prefixed head directions
// adjust the shaft's endpoint the same way as their plain counterpart -
// only the head's own shape (headPoints() above) distinguishes them.
// (Not implemented by stripping a leading "r" - "right"/"rright" would
// then collide, since "right" itself also starts with "r".)
function shaftEndOffset(direct: HeadDirection, cellSize: number): Point {
  switch (direct) {
    case "up":
    case "rup":
      return { x: 0, y: cellSize };
    case "down":
    case "rdown":
      return { x: 0, y: -cellSize };
    case "right":
    case "rright":
      return { x: -cellSize, y: 0 };
    case "left":
    case "rleft":
      return { x: cellSize, y: 0 };
  }
}

// Ported from `EdgeMetrics.shaft`: pulls the shaft's own first/last
// point in (toward the node it started from) by `cellsize`, in whatever
// direction its own head points - leaving room for the head polygon
// (which is drawn independently, not part of the shaft's own line) to
// sit right at the node's edge without the shaft's line poking out past
// its base. Mutates `lines.polylines` in place, matching the original's
// own `pop`/`insert` on the same list - this is always called on a
// freshly-built `EdgeLines` that nothing else still holds a reference
// to, so there's no aliasing hazard in doing so.
export function adjustShaftForHeads(
  lines: EdgeLines,
  headshapes: readonly [HeadDirection | null, HeadDirection | null],
  cellSize: number,
): EdgeLines {
  const [head1, head2] = headshapes;

  if (head1 !== null) {
    const first = lines.polylines[0];
    const pt = first.shift() as Point;
    const offset = shaftEndOffset(head1, cellSize);
    first.unshift({ x: pt.x + offset.x, y: pt.y + offset.y });
  }

  if (head2 !== null) {
    const last = lines.polylines[lines.polylines.length - 1];
    const pt = last.pop() as Point;
    const offset = shaftEndOffset(head2, cellSize);
    last.push({ x: pt.x + offset.x, y: pt.y + offset.y });
  }

  return lines;
}
