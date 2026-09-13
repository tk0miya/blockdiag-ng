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
import { landscapeHeadshapes, landscapeLabelbox, landscapeShaft } from "./landscape-edge-metrics.js";
import { createDiagramMetrics } from "./metrics.js";

// Expected values were captured by running the original implementation's
// `DiagramMetrics.edge(edge)` (a `LandscapeEdgeMetrics` for every group
// here, all `landscape`-oriented) - `.headshapes`/`.shaft.polylines`/
// `.labelbox` (vendor/blockdiag/src/blockdiag/metrics.py) - against
// equivalent source, via a local venv patched to restore Pillow's
// removed `FreeTypeFont.getsize()` (see draw-diagram.test.ts). `up`/
// `down`/`left-up`/`left-down` (this module's own mirror-image branches
// of the `right`/`right-up`/`right-down`/`left` cases below) aren't
// covered here - forcing the auto-layout into producing them wasn't
// practical in the time available - but they're ported by the same
// direct, line-by-line transcription as every other branch here.

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

describe("landscapeHeadshapes", () => {
  it("grows only a forward head for a plain forward edge", () => {
    const { edges } = metricsAndEdges("diagram { A -> B; }");
    expect(landscapeHeadshapes(edges[0])).toEqual([null, "right"]);
  });

  it("grows both a back and forward head for a both-direction edge", () => {
    const { edges } = metricsAndEdges("diagram { A <-> B; }");
    expect(landscapeHeadshapes(edges[0])).toEqual(["left", "right"]);
  });

  it("grows only a back head for a back-direction edge", () => {
    const { edges } = metricsAndEdges("diagram { A -> B [dir = back]; }");
    expect(landscapeHeadshapes(edges[0])).toEqual(["left", null]);
  });

  it("points the forward head down for a right-up edge", () => {
    const { edges } = metricsAndEdges("diagram { A -> B; C -> B; }");
    const cToB = edges.find((e) => e.node1.id === "C" && e.node2.id === "B") as DiagramEdge;
    expect(landscapeHeadshapes(cToB)).toEqual([null, "right"]);
  });

  it("points the forward head down for a plain left edge (not left/right itself)", () => {
    const { edges } = metricsAndEdges("diagram { A -> B -> C -> D -> A; }");
    const dToA = edges.find((e) => e.node1.id === "D" && e.node2.id === "A") as DiagramEdge;
    expect(landscapeHeadshapes(dToA)).toEqual([null, "down"]);
  });

  it("points the forward head down for a same-direction self loop", () => {
    const { edges } = metricsAndEdges("diagram { A -> A; }");
    expect(landscapeHeadshapes(edges[0])).toEqual([null, "down"]);
  });
});

describe("landscapeShaft", () => {
  // Matches the original's own `.shaft` property (not `._shaft`): the
  // raw route from `landscapeShaft()`, with its first/last point pulled
  // in for whichever end(s) grow an arrowhead (`adjustShaftForHeads()`)
  // - what `metrics.edge(edge).shaft.polylines` actually returns, and
  // what these expected values were captured from.
  function shaftFor(source: string, pick: (edges: readonly DiagramEdge[]) => DiagramEdge) {
    const { metrics, edges } = metricsAndEdges(source);
    const edge = pick(edges);
    const node1 = nodeConnectors(metrics, edge.node1, FONT, FONT_SIZE);
    const node2 = nodeConnectors(metrics, edge.node2, FONT, FONT_SIZE);
    const raw = landscapeShaft(edge, metrics, node1, node2);
    return adjustShaftForHeads(raw, landscapeHeadshapes(edge), metrics.cellSize).polylines;
  }

  it("routes a plain right edge directly between the two nodes", () => {
    const polylines = shaftFor("diagram { A -> B; }", (edges) => edges[0]);
    expect(polylines).toEqual([
      [
        { x: 192, y: 60 },
        { x: 248, y: 60 },
      ],
    ]);
  });

  it("bends a skipped right edge around the intervening node", () => {
    const polylines = shaftFor(
      "diagram { A -> B; A -> C; B -> C; }",
      (edges) => edges.find((e) => e.node1.id === "A" && e.node2.id === "C") as DiagramEdge,
    );
    expect(polylines).toEqual([
      [
        { x: 192, y: 60 },
        { x: 224, y: 60 },
        { x: 224, y: 100 },
        { x: 432, y: 100 },
        { x: 432, y: 60 },
        { x: 440, y: 60 },
      ],
    ]);
  });

  it("routes a right-up edge up and across to the earlier row", () => {
    const polylines = shaftFor(
      "diagram { A -> B; C -> B; }",
      (edges) => edges.find((e) => e.node1.id === "C" && e.node2.id === "B") as DiagramEdge,
    );
    expect(polylines).toEqual([
      [
        { x: 192, y: 140 },
        { x: 240, y: 140 },
        { x: 240, y: 60 },
        { x: 248, y: 60 },
      ],
    ]);
  });

  it("routes a right-down edge down and across to the later row", () => {
    const polylines = shaftFor(
      "diagram { A -> B; A -> C; B -> D; C -> D; }",
      (edges) => edges.find((e) => e.node1.id === "A" && e.node2.id === "C") as DiagramEdge,
    );
    expect(polylines).toEqual([
      [
        { x: 192, y: 60 },
        { x: 224, y: 60 },
        { x: 224, y: 140 },
        { x: 248, y: 140 },
      ],
    ]);
  });

  it("wraps a plain left edge all the way around, above every intervening node", () => {
    const polylines = shaftFor(
      "diagram { A -> B -> C -> D -> A; }",
      (edges) => edges.find((e) => e.node1.id === "D" && e.node2.id === "A") as DiagramEdge,
    );
    expect(polylines).toEqual([
      [
        { x: 768, y: 60 },
        { x: 784, y: 60 },
        { x: 784, y: 25 },
        { x: 128, y: 25 },
        { x: 128, y: 32 },
      ],
    ]);
  });

  it("routes a same-direction self loop out and back above the node", () => {
    const polylines = shaftFor("diagram { A -> A; }", (edges) => edges[0]);
    expect(polylines).toEqual([
      [
        { x: 192, y: 60 },
        { x: 208, y: 60 },
        { x: 208, y: 25 },
        { x: 128, y: 25 },
        { x: 128, y: 32 },
      ],
    ]);
  });
});

describe("landscapeLabelbox", () => {
  function labelboxFor(source: string, pick: (edges: readonly DiagramEdge[]) => DiagramEdge) {
    const { metrics, edges } = metricsAndEdges(source);
    return landscapeLabelbox(pick(edges), metrics);
  }

  it("places a plain right edge's label just above its shaft", () => {
    expect(labelboxFor("diagram { A -> B; }", (edges) => edges[0])).toEqual({ x1: 200, y1: 35, x2: 248, y2: 55 });
  });

  it("places a skipped right edge's label over its own detour", () => {
    const box = labelboxFor(
      "diagram { A -> B; A -> C; B -> C; }",
      (edges) => edges.find((e) => e.node1.id === "A" && e.node2.id === "C") as DiagramEdge,
    );
    expect(box).toEqual({ x1: 264, y1: 80, x2: 376, y2: 100 });
  });

  it("places a right-up edge's label near the earlier row", () => {
    const box = labelboxFor(
      "diagram { A -> B; C -> B; }",
      (edges) => edges.find((e) => e.node1.id === "C" && e.node2.id === "B") as DiagramEdge,
    );
    expect(box).toEqual({ x1: 200, y1: 100, x2: 248, y2: 120 });
  });

  it("places a right-down edge's label near the later row", () => {
    const box = labelboxFor(
      "diagram { A -> B; A -> C; B -> D; C -> D; }",
      (edges) => edges.find((e) => e.node1.id === "A" && e.node2.id === "C") as DiagramEdge,
    );
    expect(box).toEqual({ x1: 200, y1: 115, x2: 248, y2: 135 });
  });

  it("places a same-direction self loop's label above the node", () => {
    expect(labelboxFor("diagram { A -> A; }", (edges) => edges[0])).toEqual({ x1: 152, y1: 0, x2: 200, y2: 20 });
  });
});
