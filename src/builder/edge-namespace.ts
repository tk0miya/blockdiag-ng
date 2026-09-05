// Ported from the original implementation's `DiagramEdge.get()`
// (vendor/blockdiag/src/blockdiag/elements.py): edges are keyed by their
// (node1, node2) pair, so referencing the same pair again (e.g. the same
// edge appearing in two statements) returns the same instance rather than
// creating a duplicate. Keyed by object identity, same as the original's
// dict keyed by the node objects themselves.
export class EdgeNamespace<Node extends object, Edge> {
  private readonly byNode1 = new Map<Node, Map<Node, Edge>>();

  get(node1: Node, node2: Node, create: () => Edge): Edge {
    let byNode2 = this.byNode1.get(node1);
    if (byNode2 === undefined) {
      byNode2 = new Map();
      this.byNode1.set(node1, byNode2);
    }
    let edge = byNode2.get(node2);
    if (edge === undefined) {
      edge = create();
      byNode2.set(node2, edge);
    }
    return edge;
  }
}
