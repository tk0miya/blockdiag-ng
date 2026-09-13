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

interface NodeDump {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly nodes?: NodeDump[];
}

function dump(nodes: readonly (DiagramNode | NodeGroup)[]): NodeDump[] {
  return nodes.map((node) => ({
    id: node.id,
    x: node.xy.x,
    y: node.xy.y,
    ...(node.kind === "group" ? { nodes: dump(node.nodes) } : {}),
  }));
}

describe("layoutDiagram (a group's own children reordered by its internal connections)", () => {
  it("reorders two external targets to match the order of the internal nodes connecting out to each, not declaration order", () => {
    // C->D is declared (and so ordered) before A->B, so without
    // reordering, Y1 (fed by B, the later internal node) would end up
    // ahead of Y2 (fed by D, the earlier one) - and, since Y1/Y2 are
    // otherwise unrelated, stacked one full row apart instead of level
    // with their respective sources.
    const diagram = layout("diagram { group G { C -> D; A -> B; } B -> Y1; D -> Y2; }");
    expect(dump(diagram.nodes)).toEqual([
      {
        id: "G",
        x: 0,
        y: 0,
        nodes: [
          { id: "C", x: 0, y: 0 },
          { id: "D", x: 1, y: 0 },
          { id: "A", x: 0, y: 1 },
          { id: "B", x: 1, y: 1 },
        ],
      },
      { id: "Y2", x: 2, y: 0 },
      { id: "Y1", x: 2, y: 1 },
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([3, 2]);
  });
});
