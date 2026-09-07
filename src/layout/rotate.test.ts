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
  return nodes.map((node) => [
    node.id,
    node.xy.x,
    node.xy.y,
    ...(node.kind === "group" ? [node.orientation, dump(node.nodes)] : []),
  ]);
}

describe("layoutDiagram (portrait orientation)", () => {
  it("swaps x/y for every node when the diagram itself is portrait", () => {
    const diagram = layout("diagram { orientation = portrait; group G { A -> B; C -> D; } }");
    expect(dump(diagram.nodes)).toEqual([
      [
        "G",
        0,
        0,
        "portrait",
        [
          ["A", 0, 0],
          ["B", 0, 1],
          ["C", 1, 0],
          ["D", 1, 1],
        ],
      ],
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([2, 2]);
  });

  it("composes a group's own rotation with its portrait-diagram ancestor's, cancelling out", () => {
    const diagram = layout("diagram { orientation = portrait; group G { orientation = portrait; A -> B; C -> D; } }");
    expect(dump(diagram.nodes)).toEqual([
      [
        "G",
        0,
        0,
        "landscape",
        [
          ["A", 0, 0],
          ["B", 1, 0],
          ["C", 0, 1],
          ["D", 1, 1],
        ],
      ],
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([2, 2]);
  });
});
