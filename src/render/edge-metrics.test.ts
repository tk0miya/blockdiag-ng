import { describe, expect, it } from "vitest";
import type { Connectors } from "./connectors.js";
import { EdgeLines } from "./edge-lines.js";
import { adjustShaftForHeads, edgeHeads, headPoints } from "./edge-metrics.js";

// Expected values were captured by running the original implementation's
// `DiagramMetrics.edge(edge).heads`/`.shaft`/`headshapes` (vendor/
// blockdiag/src/blockdiag/metrics.py) against equivalent source, via a
// local venv patched to restore Pillow's removed `FreeTypeFont.getsize()`
// (see draw-diagram.test.ts).
//
// These fixtures are the connectors for `diagram { A -> B; }`'s two
// (plain box) nodes, at cellsize 8 - matching connectors.test.ts's own
// verified box-default values.
const A_CONNECTORS: Connectors = {
  top: { x: 128, y: 40 },
  right: { x: 192, y: 60 },
  bottom: { x: 128, y: 80 },
  left: { x: 64, y: 60 },
};
const B_CONNECTORS: Connectors = {
  top: { x: 320, y: 40 },
  right: { x: 384, y: 60 },
  bottom: { x: 320, y: 80 },
  left: { x: 256, y: 60 },
};
const CELL_SIZE = 8;

describe("headPoints", () => {
  it("points a plain 'right' head at the node's own left connector, closed without a back point", () => {
    expect(headPoints(B_CONNECTORS, "right", CELL_SIZE, null)).toEqual([
      { x: 255, y: 60 },
      { x: 248, y: 56 },
      { x: 248, y: 64 },
      { x: 255, y: 60 },
    ]);
  });

  it("points a plain 'left' head at the node's own right connector", () => {
    expect(headPoints(A_CONNECTORS, "left", CELL_SIZE, null)).toEqual([
      { x: 193, y: 60 },
      { x: 200, y: 56 },
      { x: 200, y: 64 },
      { x: 193, y: 60 },
    ]);
  });

  it("keeps the back point for a composition/aggregation hstyle, forming an open kite", () => {
    expect(headPoints(B_CONNECTORS, "right", CELL_SIZE, "composition")).toEqual([
      { x: 255, y: 60 },
      { x: 248, y: 56 },
      { x: 240, y: 60 },
      { x: 248, y: 64 },
      { x: 255, y: 60 },
    ]);
  });

  it("drops the back point for an r-prefixed direction the same as its plain counterpart, unless composition/aggregation", () => {
    expect(headPoints(B_CONNECTORS, "rright", CELL_SIZE, "onemany")).toEqual([
      { x: 248, y: 60 },
      { x: 255, y: 52 },
      { x: 255, y: 68 },
      { x: 248, y: 60 },
    ]);
  });
});

describe("edgeHeads", () => {
  it("draws only the forward end's head when dir is forward", () => {
    expect(edgeHeads([null, "right"], A_CONNECTORS, B_CONNECTORS, CELL_SIZE, null)).toEqual([
      [
        { x: 255, y: 60 },
        { x: 248, y: 56 },
        { x: 248, y: 64 },
        { x: 255, y: 60 },
      ],
    ]);
  });

  it("draws both ends' heads when dir is both", () => {
    expect(edgeHeads(["left", "right"], A_CONNECTORS, B_CONNECTORS, CELL_SIZE, null)).toEqual([
      [
        { x: 193, y: 60 },
        { x: 200, y: 56 },
        { x: 200, y: 64 },
        { x: 193, y: 60 },
      ],
      [
        { x: 255, y: 60 },
        { x: 248, y: 56 },
        { x: 248, y: 64 },
        { x: 255, y: 60 },
      ],
    ]);
  });

  it("draws no heads at all when neither end has one", () => {
    expect(edgeHeads([null, null], A_CONNECTORS, B_CONNECTORS, CELL_SIZE, null)).toEqual([]);
  });
});

describe("adjustShaftForHeads", () => {
  it("pulls only the shaft's last point in when only the forward end has a head", () => {
    const lines = new EdgeLines();
    lines.moveTo(A_CONNECTORS.right);
    lines.lineTo(B_CONNECTORS.left);
    adjustShaftForHeads(lines, [null, "right"], CELL_SIZE);
    expect(lines.polylines).toEqual([
      [
        { x: 192, y: 60 },
        { x: 248, y: 60 },
      ],
    ]);
  });

  it("pulls both the shaft's first and last point in when both ends have a head", () => {
    const lines = new EdgeLines();
    lines.moveTo(A_CONNECTORS.right);
    lines.lineTo(B_CONNECTORS.left);
    adjustShaftForHeads(lines, ["left", "right"], CELL_SIZE);
    expect(lines.polylines).toEqual([
      [
        { x: 200, y: 60 },
        { x: 248, y: 60 },
      ],
    ]);
  });

  it("pulls only the shaft's first point in when only the back end has a head", () => {
    const lines = new EdgeLines();
    lines.moveTo(A_CONNECTORS.right);
    lines.lineTo(B_CONNECTORS.left);
    adjustShaftForHeads(lines, ["left", null], CELL_SIZE);
    expect(lines.polylines).toEqual([
      [
        { x: 200, y: 60 },
        { x: 256, y: 60 },
      ],
    ]);
  });
});
