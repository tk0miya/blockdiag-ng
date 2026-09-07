import { describe, expect, it } from "vitest";
import { buildDiagram } from "../builder/tree-builder.js";
import type { Diagram, DiagramNode, GroupOrientation, NodeGroup } from "../model/elements.js";
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

interface NodeDump {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly orientation?: GroupOrientation;
  readonly nodes?: NodeDump[];
}

function dump(nodes: readonly (DiagramNode | NodeGroup)[]): NodeDump[] {
  return nodes.map((node) => ({
    id: node.id,
    x: node.xy.x,
    y: node.xy.y,
    ...(node.kind === "group" ? { orientation: node.orientation, nodes: dump(node.nodes) } : {}),
  }));
}

describe("layoutDiagram (portrait orientation)", () => {
  it("swaps x/y for every node when the diagram itself is portrait", () => {
    const diagram = layout("diagram { orientation = portrait; group G { A -> B; C -> D; } }");
    expect(dump(diagram.nodes)).toEqual([
      {
        id: "G",
        x: 0,
        y: 0,
        orientation: "portrait",
        nodes: [
          { id: "A", x: 0, y: 0 },
          { id: "B", x: 0, y: 1 },
          { id: "C", x: 1, y: 0 },
          { id: "D", x: 1, y: 1 },
        ],
      },
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([2, 2]);
  });

  it("composes a group's own rotation with its portrait-diagram ancestor's, cancelling out", () => {
    const diagram = layout("diagram { orientation = portrait; group G { orientation = portrait; A -> B; C -> D; } }");
    expect(dump(diagram.nodes)).toEqual([
      {
        id: "G",
        x: 0,
        y: 0,
        orientation: "landscape",
        nodes: [
          { id: "A", x: 0, y: 0 },
          { id: "B", x: 1, y: 0 },
          { id: "C", x: 0, y: 1 },
          { id: "D", x: 1, y: 1 },
        ],
      },
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([2, 2]);
  });
});
