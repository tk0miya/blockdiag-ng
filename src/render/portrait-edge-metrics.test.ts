import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildDiagram } from "../builder/tree-builder.js";
import { markSkippedEdges } from "../layout/edge-routing.js";
import { layoutDiagram } from "../layout/group-layout.js";
import type { Diagram, DiagramEdge } from "../model/elements.js";
import { parseString } from "../parser/parser.js";
import { nodeConnectors } from "./connectors.js";
import { adjustShaftForHeads } from "./edge-metrics.js";
import { loadFont } from "./font-metrics.js";
import { createDiagramMetrics } from "./metrics.js";
import { portraitHeadshapes, portraitLabelbox, portraitShaft } from "./portrait-edge-metrics.js";

// Expected values were captured by running the original implementation's
// `DiagramMetrics.edge(edge)` (a `PortraitEdgeMetrics` for every group
// here, all `portrait`-oriented) - `.headshapes`/`.shaft.polylines`/
// `.labelbox` (vendor/blockdiag/src/blockdiag/metrics.py) - against
// equivalent source, via a local venv patched to restore Pillow's
// removed `FreeTypeFont.getsize()` (see draw-diagram.test.ts). `right`/
// `right-up`/`left`/`left-up` (this module's own mirror-image branches
// of the `down`/`right-down`/`left-down`/`up` cases below) aren't
// covered here - forcing the auto-layout into producing them wasn't
// practical in the time available - but they're ported by the same
// direct, line-by-line transcription as every other branch here, and
// share the exact same structure landscape-edge-metrics.ts's own
// (Python-verified) counterparts already confirmed.

const VL_GOTHIC_PATH = join(import.meta.dirname, "../../vendor/vlgothic/VL-Gothic-Regular.ttf");
const FONT = loadFont(VL_GOTHIC_PATH);
const FONT_SIZE = 11;

function diagram(source: string): Diagram {
  const d = buildDiagram(parseString(source));
  layoutDiagram(d);
  markSkippedEdges(d);
  return d;
}

function metricsAndEdges(source: string) {
  const d = diagram(source);
  const metrics = createDiagramMetrics(d);
  return { metrics, edges: d.edges as DiagramEdge[] };
}

describe("portraitHeadshapes", () => {
  it("grows only a forward head for a plain forward (down) edge", () => {
    const { edges } = metricsAndEdges("diagram { orientation = portrait; A -> B; }");
    expect(portraitHeadshapes(edges[0])).toEqual([null, "down"]);
  });

  it("grows both a back and forward head for a both-direction edge", () => {
    const { edges } = metricsAndEdges("diagram { orientation = portrait; A <-> B; }");
    expect(portraitHeadshapes(edges[0])).toEqual(["up", "down"]);
  });

  it("grows only a back head for a back-direction edge", () => {
    const { edges } = metricsAndEdges("diagram { orientation = portrait; A -> B [dir = back]; }");
    expect(portraitHeadshapes(edges[0])).toEqual(["up", null]);
  });

  it("points the forward head down for a left-down edge too", () => {
    const { edges } = metricsAndEdges("diagram { orientation = portrait; A -> B; C -> B; }");
    const cToB = edges.find((e) => e.node1.id === "C" && e.node2.id === "B") as DiagramEdge;
    expect(portraitHeadshapes(cToB)).toEqual([null, "down"]);
  });

  it("points the forward head down for a plain up edge", () => {
    const { edges } = metricsAndEdges("diagram { orientation = portrait; A -> B -> C -> D -> A; }");
    const dToA = edges.find((e) => e.node1.id === "D" && e.node2.id === "A") as DiagramEdge;
    expect(portraitHeadshapes(dToA)).toEqual([null, "down"]);
  });

  it("points the forward head down for a same-direction self loop", () => {
    const { edges } = metricsAndEdges("diagram { orientation = portrait; A -> A; }");
    expect(portraitHeadshapes(edges[0])).toEqual([null, "down"]);
  });
});

describe("portraitShaft", () => {
  // Matches the original's own `.shaft` property (not `._shaft`): the
  // raw route with its first/last point pulled in for whichever end(s)
  // grow an arrowhead - see landscape-edge-metrics.test.ts's own
  // `shaftFor()` for the same reasoning.
  function shaftFor(source: string, pick: (edges: readonly DiagramEdge[]) => DiagramEdge) {
    const { metrics, edges } = metricsAndEdges(source);
    const edge = pick(edges);
    const node1 = nodeConnectors(metrics, edge.node1, FONT, FONT_SIZE);
    const node2 = nodeConnectors(metrics, edge.node2, FONT, FONT_SIZE);
    const raw = portraitShaft(edge, metrics, node1, node2);
    return adjustShaftForHeads(raw, portraitHeadshapes(edge), metrics.cellSize).polylines;
  }

  it("routes a plain down edge directly between the two nodes", () => {
    const polylines = shaftFor("diagram { orientation = portrait; A -> B; }", (edges) => edges[0]);
    expect(polylines).toEqual([
      [
        { x: 128, y: 80 },
        { x: 128, y: 112 },
      ],
    ]);
  });

  it("bends a skipped down edge around the intervening node", () => {
    const polylines = shaftFor(
      "diagram { orientation = portrait; A -> B; A -> C; B -> C; }",
      (edges) => edges.find((e) => e.node1.id === "A" && e.node2.id === "C") as DiagramEdge,
    );
    expect(polylines).toEqual([
      [
        { x: 128, y: 80 },
        { x: 128, y: 100 },
        { x: 224, y: 100 },
        { x: 224, y: 180 },
        { x: 128, y: 180 },
        { x: 128, y: 192 },
      ],
    ]);
  });

  it("routes a left-down edge left and down to the later row", () => {
    const polylines = shaftFor(
      "diagram { orientation = portrait; A -> B; C -> B; }",
      (edges) => edges.find((e) => e.node1.id === "C" && e.node2.id === "B") as DiagramEdge,
    );
    expect(polylines).toEqual([
      [
        { x: 320, y: 80 },
        { x: 320, y: 100 },
        { x: 128, y: 100 },
        { x: 128, y: 112 },
      ],
    ]);
  });

  it("routes a right-down edge right and down to the later row", () => {
    const polylines = shaftFor(
      "diagram { orientation = portrait; A -> B; A -> C; B -> D; C -> D; }",
      (edges) => edges.find((e) => e.node1.id === "A" && e.node2.id === "C") as DiagramEdge,
    );
    expect(polylines).toEqual([
      [
        { x: 128, y: 80 },
        { x: 128, y: 100 },
        { x: 320, y: 100 },
        { x: 320, y: 112 },
      ],
    ]);
  });

  it("wraps a plain up edge all the way around, beside every intervening node", () => {
    const polylines = shaftFor(
      "diagram { orientation = portrait; A -> B -> C -> D -> A; }",
      (edges) => edges.find((e) => e.node1.id === "D" && e.node2.id === "A") as DiagramEdge,
    );
    expect(polylines).toEqual([
      [
        { x: 128, y: 320 },
        { x: 128, y: 340 },
        { x: 208, y: 340 },
        { x: 208, y: 25 },
        { x: 128, y: 25 },
        { x: 128, y: 32 },
      ],
    ]);
  });

  it("routes a same-direction self loop out and back beside the node", () => {
    const polylines = shaftFor("diagram { orientation = portrait; A -> A; }", (edges) => edges[0]);
    expect(polylines).toEqual([
      [
        { x: 128, y: 80 },
        { x: 128, y: 100 },
        { x: 208, y: 100 },
        { x: 208, y: 25 },
        { x: 128, y: 25 },
        { x: 128, y: 32 },
      ],
    ]);
  });
});

describe("portraitLabelbox", () => {
  function labelboxFor(source: string, pick: (edges: readonly DiagramEdge[]) => DiagramEdge) {
    const { metrics, edges } = metricsAndEdges(source);
    return portraitLabelbox(pick(edges), metrics);
  }

  it("places a plain down edge's label beside its shaft", () => {
    expect(labelboxFor("diagram { orientation = portrait; A -> B; }", (edges) => edges[0])).toEqual({
      x1: 152,
      y1: 100,
      x2: 200,
      y2: 120,
    });
  });

  it("places a skipped down edge's label over its own detour", () => {
    const box = labelboxFor(
      "diagram { orientation = portrait; A -> B; A -> C; B -> C; }",
      (edges) => edges.find((e) => e.node1.id === "A" && e.node2.id === "C") as DiagramEdge,
    );
    expect(box).toEqual({ x1: 152, y1: 180, x2: 200, y2: 200 });
  });

  it("places a left-down edge's label near the earlier row", () => {
    const box = labelboxFor(
      "diagram { orientation = portrait; A -> B; C -> B; }",
      (edges) => edges.find((e) => e.node1.id === "C" && e.node2.id === "B") as DiagramEdge,
    );
    expect(box).toEqual({ x1: 264, y1: 80, x2: 312, y2: 100 });
  });

  it("places a right-down edge's label near the later row", () => {
    const box = labelboxFor(
      "diagram { orientation = portrait; A -> B; A -> C; B -> D; C -> D; }",
      (edges) => edges.find((e) => e.node1.id === "A" && e.node2.id === "C") as DiagramEdge,
    );
    expect(box).toEqual({ x1: 264, y1: 100, x2: 312, y2: 120 });
  });

  it("places a plain up edge's label near the earlier row", () => {
    const box = labelboxFor(
      "diagram { orientation = portrait; A -> B -> C -> D -> A; }",
      (edges) => edges.find((e) => e.node1.id === "D" && e.node2.id === "A") as DiagramEdge,
    );
    expect(box).toEqual({ x1: 184, y1: 260, x2: 232, y2: 280 });
  });

  it("places a same-direction self loop's label above the node", () => {
    expect(labelboxFor("diagram { orientation = portrait; A -> A; }", (edges) => edges[0])).toEqual({
      x1: 152,
      y1: 0,
      x2: 200,
      y2: 20,
    });
  });
});
