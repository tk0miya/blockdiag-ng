import { describe, expect, it } from "vitest";
import { buildDiagram } from "../builder/tree-builder.js";
import type { Diagram, DiagramNode } from "../model/elements.js";
import { parseString } from "../parser/parser.js";
import { layoutDiagram } from "./group-layout.js";

// Expected node order and coordinates were captured by running the
// original implementation's DiagramLayoutManager.do_layout()
// (vendor/blockdiag/src/blockdiag/builder.py) - including
// detect_circulars() and adjust_node_order(), unlike node-placement's
// own tests - against equivalent source, via a local venv.

function layout(source: string): Diagram {
  const diagram = buildDiagram(parseString(source));
  layoutDiagram(diagram);
  return diagram;
}

function idsAndXy(diagram: Diagram) {
  return (diagram.nodes as DiagramNode[]).map((node) => [node.id, node.xy.x, node.xy.y]);
}

describe("layoutDiagram (circular references and node reordering)", () => {
  it("places a two-node cycle without reordering it", () => {
    const diagram = layout("diagram { A -> B -> A; }");
    expect(idsAndXy(diagram)).toEqual([
      ["A", 0, 0],
      ["B", 1, 0],
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([2, 1]);
  });

  it("places a three-node cycle without reordering it", () => {
    const diagram = layout("diagram { A -> B -> C -> A; }");
    expect(idsAndXy(diagram)).toEqual([
      ["A", 0, 0],
      ["B", 1, 0],
      ["C", 2, 0],
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([3, 1]);
  });

  it("reorders a node's children to sit together, given a later edge that pushes one of them deeper", () => {
    const diagram = layout("diagram { A -> C; B -> C; A -> B; }");
    expect(idsAndXy(diagram)).toEqual([
      ["A", 0, 0],
      ["B", 1, 0],
      ["C", 2, 0],
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([3, 1]);
  });

  it("reorders a node's non-adjacent same-depth parents to sit together", () => {
    const diagram = layout("diagram { A; Z; B; A -> C; B -> C; }");
    expect(idsAndXy(diagram)).toEqual([
      ["A", 0, 0],
      ["B", 0, 1],
      ["Z", 0, 2],
      ["C", 1, 0],
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([2, 3]);
  });

  it("leaves a circularly-referencing pair's order alone despite their differing depths", () => {
    const diagram = layout("diagram { A -> B; A -> C; B -> D; C -> D; D -> B; }");
    expect(idsAndXy(diagram)).toEqual([
      ["A", 0, 0],
      ["B", 1, 0],
      ["C", 1, 1],
      ["D", 2, 0],
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([3, 2]);
  });

  it("merges two circulars found from different starting nodes that share a node", () => {
    const diagram = layout("diagram { A -> B -> C -> A; B -> D -> B; }");
    expect(idsAndXy(diagram)).toEqual([
      ["A", 0, 0],
      ["B", 1, 0],
      ["C", 2, 0],
      ["D", 2, 1],
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([3, 2]);
  });
});
