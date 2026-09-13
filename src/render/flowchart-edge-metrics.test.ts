import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildDiagram } from "../builder/tree-builder.js";
import { markSkippedEdges } from "../layout/edge-routing.js";
import { layoutDiagram } from "../layout/group-layout.js";
import type { Diagram, DiagramEdge } from "../model/elements.js";
import { parseString } from "../parser/parser.js";
import { nodeConnectors } from "./connectors.js";
import { adjustShaftForHeads } from "./edge-metrics.js";
import {
  flowchartLandscapeHeadshapes,
  flowchartLandscapeLabelbox,
  flowchartLandscapeShaft,
  flowchartPortraitHeadshapes,
  flowchartPortraitLabelbox,
  flowchartPortraitShaft,
} from "./flowchart-edge-metrics.js";
import { loadFont } from "./font-metrics.js";
import { createDiagramMetrics } from "./metrics.js";

// Expected values were captured by running the original implementation's
// `DiagramMetrics.edge(edge)` (a `FlowchartLandscapeEdgeMetrics`/
// `FlowchartPortraitEdgeMetrics` for every group here, under
// `edge_layout = flowchart`) - `.headshapes`/`.shaft.polylines`/
// `.labelbox` (vendor/blockdiag/src/blockdiag/metrics.py) - against
// equivalent source, via a local venv patched to restore Pillow's
// removed `FreeTypeFont.getsize()` (see draw-diagram.test.ts).
// `flowchartPortraitLabelbox`'s own `right`-direction override isn't
// covered here - a plain `right`-direction edge didn't come up naturally
// in the portrait diagrams tried in the time available - but it's
// ported by the same direct transcription as every other branch here.

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

function findEdge(edges: readonly DiagramEdge[], node1: string, node2: string): DiagramEdge {
  return edges.find((e) => e.node1.id === node1 && e.node2.id === node2) as DiagramEdge;
}

describe("flowchartLandscapeHeadshapes", () => {
  it("delegates to landscapeHeadshapes for anything but right-down", () => {
    const { edges } = metricsAndEdges("diagram { edge_layout = flowchart; A -> B; }");
    expect(flowchartLandscapeHeadshapes(edges[0])).toEqual([null, "right"]);
  });

  it("grows a plain forward head for a right-down edge", () => {
    const { edges } = metricsAndEdges("diagram { edge_layout = flowchart; A -> B; A -> C; B -> D; C -> D; }");
    expect(flowchartLandscapeHeadshapes(findEdge(edges, "A", "C"))).toEqual([null, "right"]);
  });

  it("grows an open forward head for a right-down edge with an onemany hstyle", () => {
    const { edges } = metricsAndEdges(
      "diagram { edge_layout = flowchart; A -> B; A -> C [hstyle = onemany]; B -> D; C -> D; }",
    );
    expect(flowchartLandscapeHeadshapes(findEdge(edges, "A", "C"))).toEqual([null, "rright"]);
  });

  it("grows a back head for a right-down edge with dir = back", () => {
    const { edges } = metricsAndEdges(
      "diagram { edge_layout = flowchart; A -> B; A -> C [dir = back]; B -> D; C -> D; }",
    );
    expect(flowchartLandscapeHeadshapes(findEdge(edges, "A", "C"))).toEqual(["up", null]);
  });

  it("grows an open back head for a right-down edge with dir = back and a manyone hstyle", () => {
    const { edges } = metricsAndEdges(
      "diagram { edge_layout = flowchart; A -> B; A -> C [dir = back, hstyle = manyone]; B -> D; C -> D; }",
    );
    expect(flowchartLandscapeHeadshapes(findEdge(edges, "A", "C"))).toEqual(["rup", null]);
  });
});

describe("flowchartLandscapeShaft", () => {
  function shaftFor(source: string, node1: string, node2: string) {
    const { metrics, edges } = metricsAndEdges(source);
    const edge = findEdge(edges, node1, node2);
    const c1 = nodeConnectors(metrics, edge.node1, FONT, FONT_SIZE);
    const c2 = nodeConnectors(metrics, edge.node2, FONT, FONT_SIZE);
    const raw = flowchartLandscapeShaft(edge, metrics, c1, c2);
    return adjustShaftForHeads(raw, flowchartLandscapeHeadshapes(edge), metrics.cellSize).polylines;
  }

  it("delegates to landscapeShaft for anything but right-down", () => {
    expect(shaftFor("diagram { edge_layout = flowchart; A -> B; }", "A", "B")).toEqual([
      [
        { x: 192, y: 60 },
        { x: 248, y: 60 },
      ],
    ]);
  });

  it("routes a right-down edge straight down then right, unlike landscape's own diagonal detour", () => {
    const polylines = shaftFor("diagram { edge_layout = flowchart; A -> B; A -> C; B -> D; C -> D; }", "A", "C");
    expect(polylines).toEqual([
      [
        { x: 128, y: 80 },
        { x: 128, y: 140 },
        { x: 248, y: 140 },
      ],
    ]);
  });

  it("bends a skipped right-down edge further right before dropping down", () => {
    const polylines = shaftFor(
      "diagram { edge_layout = flowchart; A -> B; A -> C; A -> E; B -> D; C -> D; E -> D; C -> E; }",
      "A",
      "E",
    );
    expect(polylines).toEqual([
      [
        { x: 128, y: 80 },
        { x: 128, y: 100 },
        { x: 432, y: 100 },
        { x: 432, y: 140 },
        { x: 440, y: 140 },
      ],
    ]);
  });
});

describe("flowchartLandscapeLabelbox", () => {
  function labelboxFor(source: string, node1: string, node2: string) {
    const { metrics, edges } = metricsAndEdges(source);
    return flowchartLandscapeLabelbox(findEdge(edges, node1, node2), metrics);
  }

  it("delegates to landscapeLabelbox for anything but right", () => {
    expect(labelboxFor("diagram { edge_layout = flowchart; A -> B; A -> C; B -> D; C -> D; }", "A", "C")).toEqual({
      x1: 200,
      y1: 115,
      x2: 248,
      y2: 135,
    });
  });

  it("places a plain right edge's label directly above its node, unshrunk", () => {
    // Unlike every other labelbox in this port, the flowchart override
    // doesn't apply the base class's own final "shrink box" step at all
    // (it's a full property override, not built on top of the parent's
    // own box) - this one is deliberately NOT narrowed by span_width/8
    // on each side, matching the original exactly.
    expect(labelboxFor("diagram { edge_layout = flowchart; A -> B; }", "A", "B")).toEqual({
      x1: 128,
      y1: 40,
      x2: 128,
      y2: 60,
    });
  });

  it("places a skipped right edge's label over its own vertical detour", () => {
    const box = labelboxFor("diagram { edge_layout = flowchart; A -> B; A -> C; B -> C; }", "A", "C");
    expect(box).toEqual({ x1: 128, y1: 80, x2: 192, y2: 100 });
  });
});

describe("flowchartPortraitHeadshapes", () => {
  it("delegates to portraitHeadshapes for anything but right-down", () => {
    const { edges } = metricsAndEdges("diagram { edge_layout = flowchart; orientation = portrait; A -> B; }");
    expect(flowchartPortraitHeadshapes(edges[0])).toEqual([null, "down"]);
  });

  it("grows a back head for a right-down edge, regardless of hstyle", () => {
    const { edges } = metricsAndEdges(
      "diagram { edge_layout = flowchart; orientation = portrait; A -> B; A -> C [dir = back]; B -> D; C -> D; }",
    );
    expect(flowchartPortraitHeadshapes(findEdge(edges, "A", "C"))).toEqual(["left", null]);
  });

  // A real bug in the original: the forward branch's own `hstyle` check
  // tests `edge.dir` (always `forward`/`back`/`both`/`none`) instead of
  // `edge.hstyle` - so it's always false, and the head stays plain
  // `down` even with an `onemany` hstyle that would otherwise open it
  // to `rdown`. Ported faithfully - see flowchart-edge-metrics.ts's own
  // comment on this function.
  it("keeps a plain forward head even with an onemany hstyle, unlike the landscape counterpart (the original's own bug)", () => {
    const { edges } = metricsAndEdges(
      "diagram { edge_layout = flowchart; orientation = portrait; A -> B; A -> C [hstyle = onemany]; B -> D; C -> D; }",
    );
    expect(flowchartPortraitHeadshapes(findEdge(edges, "A", "C"))).toEqual([null, "down"]);
  });
});

describe("flowchartPortraitShaft", () => {
  function shaftFor(source: string, node1: string, node2: string) {
    const { metrics, edges } = metricsAndEdges(source);
    const edge = findEdge(edges, node1, node2);
    const c1 = nodeConnectors(metrics, edge.node1, FONT, FONT_SIZE);
    const c2 = nodeConnectors(metrics, edge.node2, FONT, FONT_SIZE);
    const raw = flowchartPortraitShaft(edge, metrics, c1, c2);
    return adjustShaftForHeads(raw, flowchartPortraitHeadshapes(edge), metrics.cellSize).polylines;
  }

  it("delegates to portraitShaft for anything but right-down", () => {
    expect(shaftFor("diagram { edge_layout = flowchart; orientation = portrait; A -> B; }", "A", "B")).toEqual([
      [
        { x: 128, y: 80 },
        { x: 128, y: 112 },
      ],
    ]);
  });

  it("routes a right-down edge straight right then down, unlike portrait's own diagonal detour", () => {
    const polylines = shaftFor(
      "diagram { edge_layout = flowchart; orientation = portrait; A -> B; A -> C; B -> D; C -> D; }",
      "A",
      "C",
    );
    expect(polylines).toEqual([
      [
        { x: 192, y: 60 },
        { x: 320, y: 60 },
        { x: 320, y: 112 },
      ],
    ]);
  });

  it("bends a skipped right-down edge further down before dropping right", () => {
    const polylines = shaftFor(
      "diagram { edge_layout = flowchart; orientation = portrait; A -> B; A -> C; A -> E; B -> D; C -> D; E -> D; C -> E; }",
      "A",
      "E",
    );
    expect(polylines).toEqual([
      [
        { x: 192, y: 60 },
        { x: 240, y: 60 },
        { x: 240, y: 180 },
        { x: 320, y: 180 },
        { x: 320, y: 192 },
      ],
    ]);
  });
});

describe("flowchartPortraitLabelbox", () => {
  function labelboxFor(source: string, node1: string, node2: string) {
    const { metrics, edges } = metricsAndEdges(source);
    return flowchartPortraitLabelbox(findEdge(edges, node1, node2), metrics);
  }

  it("delegates to portraitLabelbox for anything but down/right", () => {
    const box = labelboxFor(
      "diagram { edge_layout = flowchart; orientation = portrait; A -> B; A -> C; A -> E; B -> D; C -> D; E -> D; C -> E; }",
      "C",
      "D",
    );
    expect(box).toEqual({ x1: 264, y1: 160, x2: 312, y2: 180 });
  });

  it("places a down edge's label beside the arriving node's own top edge", () => {
    expect(
      labelboxFor(
        "diagram { edge_layout = flowchart; orientation = portrait; A -> B; A -> C; B -> D; C -> D; }",
        "A",
        "C",
      ),
    ).toEqual({ x1: 264, y1: 100, x2: 312, y2: 120 });
  });
});
