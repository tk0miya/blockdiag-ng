// Ported from `EdgeLines` (vendor/blockdiag/src/blockdiag/metrics.py): a
// tiny path builder each `_shaft` implementation uses to describe an
// edge's route as one or more polylines - `moveTo` starts a new one (or,
// called again before any `lineTo`, just relocates the pending start
// point without emitting an empty polyline), `lineTo` appends to the
// current one, silently dropping a point equal to the polyline's own
// last one (so an edge whose route happens to double back on itself
// doesn't end up with a degenerate zero-length segment).
import type { Point } from "./geometry.js";

export class EdgeLines {
  private pending: Point | null = null;
  private current: Point[] | null = null;
  readonly polylines: Point[][] = [];

  moveTo(point: Point): void {
    this.pending = point;
    this.current = null;
  }

  lineTo(point: Point): void {
    if (this.current === null) {
      this.current = this.pending === null ? [] : [this.pending];
      this.polylines.push(this.current);
    }

    const last = this.current[this.current.length - 1];
    if (last !== undefined && last.x === point.x && last.y === point.y) return;
    this.current.push(point);
  }
}
