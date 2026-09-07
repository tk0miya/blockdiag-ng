import { describe, expect, it } from "vitest";
import { buildDiagram } from "../builder/tree-builder.js";
import type { Diagram, DiagramNode } from "../model/elements.js";
import { parseString } from "../parser/parser.js";
import { layoutDiagram } from "./group-layout.js";

// Expected coordinates were captured by running the original
// implementation's DiagramLayoutManager.do_layout()
// (vendor/blockdiag/src/blockdiag/builder.py) against equivalent source,
// via a local venv. All diagrams here are flat (no `group` blocks) and
// acyclic-or-self-looping only, matching this step's scope.

function layout(source: string): Diagram {
  const diagram = buildDiagram(parseString(source));
  layoutDiagram(diagram);
  return diagram;
}

function xy(diagram: Diagram) {
  return (diagram.nodes as DiagramNode[]).map((node) => [node.xy.x, node.xy.y]);
}

describe("layoutDiagram", () => {
  it("places a single node at the origin", () => {
    const diagram = layout("diagram { A; }");
    expect(xy(diagram)).toEqual([[0, 0]]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([1, 1]);
  });

  it("places a chain of nodes one column apart", () => {
    const diagram = layout("diagram { A -> B -> C; }");
    expect(xy(diagram)).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([3, 1]);
  });

  it("stacks a fork's targets in a later column", () => {
    const diagram = layout("diagram { A -> B, C; }");
    expect(xy(diagram)).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([2, 2]);
  });

  it("stacks a merge's sources in an earlier column", () => {
    const diagram = layout("diagram { A, B -> C; }");
    expect(xy(diagram)).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([2, 2]);
  });

  it("keeps a diamond's converging branches level with each other", () => {
    const diagram = layout("diagram { A -> B; A -> C; B -> D; C -> D; }");
    expect(xy(diagram)).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 0],
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([3, 2]);
  });

  it("stacks disconnected nodes vertically", () => {
    const diagram = layout("diagram { A; B; }");
    expect(xy(diagram)).toEqual([
      [0, 0],
      [0, 1],
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([1, 2]);
  });

  it("doesn't move a node for its own self-loop edge", () => {
    const diagram = layout("diagram { A -> A; }");
    expect(xy(diagram)).toEqual([[0, 0]]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([1, 1]);
  });

  it("doesn't treat a folded edge's target as a child, placing it as if disconnected", () => {
    const diagram = layout("diagram { A -> B [folded]; A -> C; }");
    expect(xy(diagram)).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([2, 2]);
  });

  it("stacks all of a node's children when more than two share a column", () => {
    const diagram = layout("diagram { A -> B, C; A -> D, C; }");
    expect(xy(diagram)).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 2],
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([2, 3]);
  });

  it("keeps two parallel chains that merge back together level with each other", () => {
    const diagram = layout("diagram { A -> B -> C -> D; A -> E -> F -> D; }");
    // adjustNodeOrder() moves each parent's children to sit together, so
    // the array order here is A, B, E, C, F, D - not the declaration
    // order (A, B, C, D, E, F).
    expect(xy(diagram)).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 0],
      [2, 1],
      [3, 0],
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([4, 2]);
  });

  it("pushes a later sibling further down past a converging pair, once they're no longer a plain rhombus", () => {
    const diagram = layout("diagram { A -> B -> D; A -> C -> D; A -> E; }");
    // adjustNodeOrder() moves each parent's children to sit together, so
    // the array order here is A, B, C, E, D - not the declaration order
    // (A, B, D, C, E).
    expect(xy(diagram)).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([3, 3]);
  });

  it("keeps three converging branches level with each other, not just two", () => {
    // Exercises the same isRhombus()-true branch as the two-branch diamond
    // above, just with a third branch added - there's no separate
    // three-way-specific branch in the implementation, so this is really
    // confirming grandchildCount and the chained prevChild comparisons
    // don't misbehave once there's more than one pair to check.
    const diagram = layout("diagram { A -> B; A -> C; A -> D; B -> E; C -> E; D -> E; }");
    expect(xy(diagram)).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([3, 3]);
  });
});
