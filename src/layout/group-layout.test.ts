import { describe, expect, it } from "vitest";
import { buildDiagram } from "../builder/tree-builder.js";
import type { Diagram, DiagramNode, NodeGroup } from "../model/elements.js";
import { parseString } from "../parser/parser.js";
import { layoutDiagram } from "./group-layout.js";

// Expected coordinates were captured by running the original
// implementation's ScreenNodeBuilder.build() (vendor/blockdiag/src/
// blockdiag/builder.py) - which runs DiagramLayoutManager.run() (the
// per-group recursive layout) followed by diagram.fixiate(True) (the
// absolute-position cascade) - against equivalent source, via a local
// venv.

function layout(source: string): Diagram {
  const diagram = buildDiagram(parseString(source));
  layoutDiagram(diagram);
  return diagram;
}

interface NodeDump {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly colwidth: number;
  readonly colheight: number;
  readonly nodes?: NodeDump[];
}

function dump(nodes: readonly (DiagramNode | NodeGroup)[]): NodeDump[] {
  return nodes.map((node) => ({
    id: node.id,
    x: node.xy.x,
    y: node.xy.y,
    colwidth: node.colwidth,
    colheight: node.colheight,
    ...(node.kind === "group" ? { nodes: dump(node.nodes) } : {}),
  }));
}

describe("layoutDiagram (group-aware layout)", () => {
  it("sizes a group to its own internal content and treats it as a single unit", () => {
    const diagram = layout("diagram { group G { A -> B; } }");
    expect(dump(diagram.nodes)).toEqual([
      {
        id: "G",
        x: 0,
        y: 0,
        colwidth: 2,
        colheight: 1,
        nodes: [
          { id: "A", x: 0, y: 0, colwidth: 1, colheight: 1 },
          { id: "B", x: 1, y: 0, colwidth: 1, colheight: 1 },
        ],
      },
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([2, 1]);
  });

  it("places a group as one positionable block for edges crossing its boundary", () => {
    const diagram = layout("diagram { X -> A; group G { A -> B; } B -> Y; }");
    expect(dump(diagram.nodes)).toEqual([
      { id: "X", x: 0, y: 0, colwidth: 1, colheight: 1 },
      {
        id: "G",
        x: 1,
        y: 0,
        colwidth: 2,
        colheight: 1,
        nodes: [
          { id: "A", x: 1, y: 0, colwidth: 1, colheight: 1 },
          { id: "B", x: 2, y: 0, colwidth: 1, colheight: 1 },
        ],
      },
      { id: "Y", x: 3, y: 0, colwidth: 1, colheight: 1 },
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([4, 1]);
  });

  it("lays out a doubly-nested group, converting its coordinates to absolute at every level", () => {
    const diagram = layout("diagram { group G { group H { A -> B; } C; } }");
    expect(dump(diagram.nodes)).toEqual([
      {
        id: "G",
        x: 0,
        y: 0,
        colwidth: 2,
        colheight: 2,
        nodes: [
          {
            id: "H",
            x: 0,
            y: 0,
            colwidth: 2,
            colheight: 1,
            nodes: [
              { id: "A", x: 0, y: 0, colwidth: 1, colheight: 1 },
              { id: "B", x: 1, y: 0, colwidth: 1, colheight: 1 },
            ],
          },
          { id: "C", x: 0, y: 1, colwidth: 1, colheight: 1 },
        ],
      },
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([2, 2]);
  });
});
