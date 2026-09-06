import { describe, expect, it } from "vitest";
import { parseString } from "../parser/parser.js";
import { buildDiagram } from "./tree-builder.js";

// Expected outputs were captured by running the original implementation's
// DiagramTreeBuilder.build() (vendor/blockdiag/src/blockdiag/builder.py)
// against equivalent source, via a local venv.

function build(source: string) {
  return buildDiagram(parseString(source));
}

describe("buildDiagram", () => {
  it("creates a node with its id as the label and sensible defaults", () => {
    const diagram = build("diagram { A; }");
    expect(diagram.nodes).toHaveLength(1);
    const [a] = diagram.nodes;
    expect(a.id).toBe("A");
    expect(a.label).toBe("A");
    expect(a.group).toBe(diagram);
  });

  it("resolves repeated references to the same id as the same node", () => {
    const diagram = build('diagram { A [label = "first"]; A [color = red]; }');
    expect(diagram.nodes).toHaveLength(1);
    const [a] = diagram.nodes;
    expect(a.label).toBe("first");
    expect(a.color).toEqual([255, 0, 0]);
  });

  it("creates an edge with the direction implied by its operator", () => {
    const diagram = build("diagram { A -> B; }");
    expect(diagram.edges).toHaveLength(1);
    const [edge] = diagram.edges;
    expect(edge.node1.id).toBe("A");
    expect(edge.node2.id).toBe("B");
    expect(edge.dir).toBe("forward");
  });

  it("creates one edge per (from, to) pair for a multi-node edge list", () => {
    const diagram = build("diagram { A, B -> C, D; }");
    expect(diagram.edges.map((e) => [e.node1.id, e.node2.id])).toEqual([
      ["A", "C"],
      ["A", "D"],
      ["B", "C"],
      ["B", "D"],
    ]);
  });

  it("nests a node in its enclosing group, assigning levels and binding edges to the nearest containing group", () => {
    const diagram = build("diagram { group G { A -> B; } }");
    expect(diagram.nodes).toHaveLength(1);
    const [g] = diagram.nodes;
    expect(g.kind === "group" && g.level).toBe(1);
    expect(g.kind === "group" && g.nodes.map((n) => n.id)).toEqual(["A", "B"]);
    expect(g.kind === "group" && g.edges).toHaveLength(1);
    expect(diagram.edges).toHaveLength(0);
  });

  it("creates a distinct group for each unnamed group statement, never deduplicating them", () => {
    const diagram = build("diagram { group { A; } group { B; } }");
    expect(diagram.nodes).toHaveLength(2);
    expect(diagram.nodes.map((g) => g.kind === "group" && g.nodes.map((n) => n.id))).toEqual([["A"], ["B"]]);
  });

  it("removes a group that ends up with no nodes of its own", () => {
    const diagram = build("diagram { group G { } A; }");
    expect(diagram.nodes.map((n) => n.id)).toEqual(["A"]);
  });

  it("applies a diagram-level default_shape before nodes are created, and lets a node's own attribute override it", () => {
    const diagram = build('diagram { default_shape = circle; A; B [shape = "box"]; }');
    const [a, b] = diagram.nodes;
    expect(a.shape).toBe("circle");
    expect(b.shape).toBe("box");
  });

  it("expands a class attribute defined earlier in the same diagram", () => {
    const diagram = build("diagram { class emphasis [color = red]; A [class = emphasis]; }");
    const [a] = diagram.nodes;
    expect(a.color).toEqual([255, 0, 0]);
  });

  it("applies a plain attribute inside a nested group to the group itself, not the diagram", () => {
    const diagram = build('diagram { group G { label = "my group"; A; } }');
    const [g] = diagram.nodes;
    expect("label" in g && g.label).toBe("my group");
  });

  it("throws BuildError when a node is asked to belong to two unrelated groups", () => {
    expect(() => build("diagram { group A { N; } group B { N; } }")).toThrowError(/could not belong to two groups/);
  });
});
