import { describe, expect, it } from "vitest";
import { buildDiagram } from "../builder/tree-builder.js";
import type { Diagram, DiagramNode, NodeGroup } from "../model/elements.js";
import { parseString } from "../parser/parser.js";
import { layoutDiagram } from "./group-layout.js";

// Expected coordinates were captured by running the original
// implementation's ScreenNodeBuilder.build() (vendor/blockdiag/src/
// blockdiag/builder.py) against equivalent source, via a local venv.

function layout(source: string): Diagram {
  const diagram = buildDiagram(parseString(source));
  layoutDiagram(diagram);
  return diagram;
}

function dump(nodes: readonly (DiagramNode | NodeGroup)[]): unknown[] {
  return nodes.map((node) => [node.id, node.xy.x, node.xy.y, ...(node.kind === "group" ? [dump(node.nodes)] : [])]);
}

describe("layoutDiagram (a group's internal nodes connecting outward)", () => {
  it("aligns an external target with the single internal node connecting out to it", () => {
    const diagram = layout("diagram { group G { A -> B; C -> D; } D -> Z; }");
    expect(dump(diagram.nodes)).toEqual([
      [
        "G",
        0,
        0,
        [
          ["A", 0, 0],
          ["B", 1, 0],
          ["C", 0, 1],
          ["D", 1, 1],
        ],
      ],
      ["Z", 2, 1],
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([3, 2]);
  });

  it("aligns an external target group with the internal node connecting out to it", () => {
    const diagram = layout("diagram { group P { A -> B; C -> E; } group Q { X; } E -> X; }");
    expect(dump(diagram.nodes)).toEqual([
      [
        "P",
        0,
        0,
        [
          ["A", 0, 0],
          ["B", 1, 0],
          ["C", 0, 1],
          ["E", 1, 1],
        ],
      ],
      ["Q", 2, 1, [["X", 2, 1]]],
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([3, 2]);
  });

  it("aligns an external target with the lowest y among several internal nodes connecting out to it", () => {
    const diagram = layout("diagram { group G { A -> B; C -> D; } B -> Z; D -> Z; }");
    expect(dump(diagram.nodes)).toEqual([
      [
        "G",
        0,
        0,
        [
          ["A", 0, 0],
          ["B", 1, 0],
          ["C", 0, 1],
          ["D", 1, 1],
        ],
      ],
      ["Z", 2, 0],
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([3, 2]);
  });
});
