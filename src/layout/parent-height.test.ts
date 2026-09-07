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

describe("layoutDiagram (a group's internal nodes connecting outward)", () => {
  it("aligns an external target with the single internal node connecting out to it", () => {
    const diagram = layout("diagram { group G { A -> B; C -> D; } D -> Z; }");
    expect(dump(diagram.nodes)).toEqual([
      {
        id: "G",
        x: 0,
        y: 0,
        nodes: [
          { id: "A", x: 0, y: 0 },
          { id: "B", x: 1, y: 0 },
          { id: "C", x: 0, y: 1 },
          { id: "D", x: 1, y: 1 },
        ],
      },
      { id: "Z", x: 2, y: 1 },
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([3, 2]);
  });

  it("aligns an external target group with the internal node connecting out to it", () => {
    const diagram = layout("diagram { group P { A -> B; C -> E; } group Q { X; } E -> X; }");
    expect(dump(diagram.nodes)).toEqual([
      {
        id: "P",
        x: 0,
        y: 0,
        nodes: [
          { id: "A", x: 0, y: 0 },
          { id: "B", x: 1, y: 0 },
          { id: "C", x: 0, y: 1 },
          { id: "E", x: 1, y: 1 },
        ],
      },
      { id: "Q", x: 2, y: 1, nodes: [{ id: "X", x: 2, y: 1 }] },
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([3, 2]);
  });

  it("aligns an external target with the lowest y among several internal nodes connecting out to it", () => {
    const diagram = layout("diagram { group G { A -> B; C -> D; } B -> Z; D -> Z; }");
    expect(dump(diagram.nodes)).toEqual([
      {
        id: "G",
        x: 0,
        y: 0,
        nodes: [
          { id: "A", x: 0, y: 0 },
          { id: "B", x: 1, y: 0 },
          { id: "C", x: 0, y: 1 },
          { id: "D", x: 1, y: 1 },
        ],
      },
      { id: "Z", x: 2, y: 0 },
    ]);
    expect([diagram.colwidth, diagram.colheight]).toEqual([3, 2]);
  });
});
