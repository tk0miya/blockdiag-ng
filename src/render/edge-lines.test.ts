import { describe, expect, it } from "vitest";
import { EdgeLines } from "./edge-lines.js";

describe("EdgeLines", () => {
  it("starts one polyline at moveTo's point, growing it with each lineTo", () => {
    const lines = new EdgeLines();
    lines.moveTo({ x: 0, y: 0 });
    lines.lineTo({ x: 10, y: 0 });
    lines.lineTo({ x: 10, y: 10 });
    expect(lines.polylines).toEqual([
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ],
    ]);
  });

  it("starts a fresh polyline at the next moveTo, leaving the first one alone", () => {
    const lines = new EdgeLines();
    lines.moveTo({ x: 0, y: 0 });
    lines.lineTo({ x: 10, y: 0 });
    lines.moveTo({ x: 100, y: 100 });
    lines.lineTo({ x: 110, y: 100 });
    expect(lines.polylines).toEqual([
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      [
        { x: 100, y: 100 },
        { x: 110, y: 100 },
      ],
    ]);
  });

  it("silently drops a lineTo that repeats the polyline's own last point", () => {
    const lines = new EdgeLines();
    lines.moveTo({ x: 0, y: 0 });
    lines.lineTo({ x: 10, y: 0 });
    lines.lineTo({ x: 10, y: 0 });
    lines.lineTo({ x: 10, y: 10 });
    expect(lines.polylines).toEqual([
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ],
    ]);
  });

  it("relocates the pending start point when moveTo is called again before any lineTo", () => {
    const lines = new EdgeLines();
    lines.moveTo({ x: 0, y: 0 });
    lines.moveTo({ x: 5, y: 5 });
    lines.lineTo({ x: 15, y: 5 });
    expect(lines.polylines).toEqual([
      [
        { x: 5, y: 5 },
        { x: 15, y: 5 },
      ],
    ]);
  });

  it("starts a polyline with no leading point when lineTo is called with no moveTo at all", () => {
    const lines = new EdgeLines();
    lines.lineTo({ x: 15, y: 5 });
    expect(lines.polylines).toEqual([[{ x: 15, y: 5 }]]);
  });
});
