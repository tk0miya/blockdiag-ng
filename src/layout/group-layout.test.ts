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

function dump(nodes: readonly (DiagramNode | NodeGroup)[]): unknown[] {
  return nodes.map((node) => [
    node.id,
    node.xy.x,
    node.xy.y,
    node.colwidth,
    node.colheight,
    ...(node.kind === "group" ? [dump(node.nodes)] : []),
  ]);
}

describe("layoutDiagram (group-aware layout)", () => {
  it("sizes a group to its own internal content and treats it as a single unit", () => {
    const diagram = layout("diagram { group G { A -> B; } }");
    expect(dump(diagram.nodes)).toEqual([
      [
        "G",
        0,
        0,
        2,
        1,
        [
          ["A", 0, 0, 1, 1],
          ["B", 1, 0, 1, 1],
        ],
      ],
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([2, 1]);
  });

  it("places a group as one positionable block for edges crossing its boundary", () => {
    const diagram = layout("diagram { X -> A; group G { A -> B; } B -> Y; }");
    expect(dump(diagram.nodes)).toEqual([
      ["X", 0, 0, 1, 1],
      [
        "G",
        1,
        0,
        2,
        1,
        [
          ["A", 1, 0, 1, 1],
          ["B", 2, 0, 1, 1],
        ],
      ],
      ["Y", 3, 0, 1, 1],
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([4, 1]);
  });

  it("lays out a doubly-nested group, converting its coordinates to absolute at every level", () => {
    const diagram = layout("diagram { group G { group H { A -> B; } C; } }");
    expect(dump(diagram.nodes)).toEqual([
      [
        "G",
        0,
        0,
        2,
        2,
        [
          [
            "H",
            0,
            0,
            2,
            1,
            [
              ["A", 0, 0, 1, 1],
              ["B", 1, 0, 1, 1],
            ],
          ],
          ["C", 0, 1, 1, 1],
        ],
      ],
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([2, 2]);
  });
});
