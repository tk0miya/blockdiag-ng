import { describe, expect, it } from "vitest";
import { buildDiagram } from "../builder/tree-builder.js";
import type { Diagram, DiagramEdge, DiagramNode } from "../model/elements.js";
import { parseString } from "../parser/parser.js";
import { edgeDirection, markSkippedEdges } from "./edge-routing.js";
import { layoutDiagram } from "./group-layout.js";

// Expected `skipped` values were captured by running the original
// implementation's ScreenNodeBuilder.build() (vendor/blockdiag/src/
// blockdiag/builder.py), which runs EdgeLayoutManager.run() right after
// layout, against equivalent source, via a local venv.

function route(source: string): Diagram {
  const diagram = buildDiagram(parseString(source));
  layoutDiagram(diagram);
  markSkippedEdges(diagram);
  return diagram;
}

function skipped(diagram: Diagram) {
  return diagram.edges.map((edge) => [edge.node1.id, edge.node2.id, edge.skipped]);
}

function edgeBetween(x1: number, y1: number, x2: number, y2: number): DiagramEdge {
  return {
    node1: { xy: { x: x1, y: y1 } } as DiagramNode,
    node2: { xy: { x: x2, y: y2 } } as DiagramNode,
  } as DiagramEdge;
}

describe("edgeDirection", () => {
  it.each([
    [0, 0, 1, 0, "right"],
    [0, 0, 1, 1, "right-down"],
    [0, 0, 1, -1, "right-up"],
    [0, 0, 0, 1, "down"],
    [0, 0, 0, -1, "up"],
    [0, 0, 0, 0, "same"],
    [1, 0, 0, 0, "left"],
    [1, 0, 0, 1, "left-down"],
    [1, 0, 0, -1, "left-up"],
  ] as const)("(%i,%i) -> (%i,%i) is %s", (x1, y1, x2, y2, expected) => {
    expect(edgeDirection(edgeBetween(x1, y1, x2, y2))).toBe(expected);
  });
});

describe("markSkippedEdges", () => {
  it("marks a 'right' edge skipped when a third node sits directly on its path", () => {
    const diagram = route("diagram { A -> B; A -> C; C -> B; }");
    expect(skipped(diagram)).toEqual([
      ["A", "B", 1],
      ["A", "C", 0],
      ["C", "B", 0],
    ]);
  });

  it("marks a 'right-down' edge skipped when a node sits at its landing row", () => {
    const diagram = route("diagram { A -> B; A -> D; D -> C; A -> C; }");
    expect(skipped(diagram)).toEqual([
      ["A", "B", 0],
      ["A", "D", 0],
      ["A", "C", 1],
      ["D", "C", 0],
    ]);
  });

  it("exercises the flowchart-mode 'right-down' branch without changing the result", () => {
    // The flowchart-only vertical check (straight down from node1, before
    // turning) never finds anything occupying that column in this
    // example - only the landing-row check (also run in normal mode)
    // does. A case where the vertical check alone triggers a skip would
    // need something to sit directly beneath node1's own column without
    // also being caught by the disconnected-root stacking that pushes
    // later roots below node1's *entire* subtree - not found one; this
    // at least confirms the flowchart branch runs without misbehaving.
    const diagram = route("diagram { edge_layout = flowchart; A -> B; A -> D; D -> C; A -> C; }");
    expect(skipped(diagram)).toEqual([
      ["A", "B", 0],
      ["A", "D", 0],
      ["A", "C", 1],
      ["D", "C", 0],
    ]);
  });

  it("marks a 'down' edge skipped when a third node sits directly on its path, in a portrait group", () => {
    const diagram = route("diagram { orientation = portrait; A -> B; A -> C; C -> B; }");
    expect(skipped(diagram)).toEqual([
      ["A", "B", 1],
      ["A", "C", 0],
      ["C", "B", 0],
    ]);
  });

  it("applies the portrait-orientation direction set instead, for a portrait group's own edges", () => {
    const diagram = route("diagram { orientation = portrait; A -> B; A -> D; D -> C; A -> C; }");
    expect(skipped(diagram)).toEqual([
      ["A", "B", 0],
      ["A", "D", 0],
      ["A", "C", 1],
      ["D", "C", 0],
    ]);
  });
});
