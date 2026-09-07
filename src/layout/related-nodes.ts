// Ported from `get_related_nodes()` (vendor/blockdiag/src/blockdiag/builder.py):
// the nodes directly reachable from a node by an outgoing (child) or
// incoming (parent) edge. Shared by the node-placement and node-ordering
// steps, which both need to walk these relationships.
import type { DiagramEdge, DiagramNode, NodeGroup } from "../model/elements.js";

export type Positioned = DiagramNode | NodeGroup;

// Ported from `get_related_nodes(child=True)`: the nodes reachable from
// `node` by a direct outgoing edge, deduplicated, excluding `node` itself
// (a self-loop edge), any node belonging to a different group, and any
// edge marked `folded` (an edge hidden from layout/rendering by a
// `folded`/`nofolded` attribute), ordered by each node's position in its
// group (the order it was first referenced at).
//
// Not ported: `set_node_ypos()` re-sorts this same list with a comparator
// that compares `x.xy.x` against `y.xy.y` - unrelated fields, so it's not
// a valid ordering (not just a likely bug), and porting it wouldn't
// reliably reproduce the original's output anyway.
export function getChildNodes(node: Positioned, edges: readonly DiagramEdge[]): DiagramNode[] {
  const children = new Set<DiagramNode>();
  for (const edge of edges) {
    if (edge.node1 === node && !edge.folded) {
      children.add(edge.node2);
    }
  }
  return [...children]
    .filter((child) => child !== node && child.group === node.group)
    .sort((a, b) => a.order - b.order);
}

// Ported from `get_related_nodes(parent=True)`: the mirror image of
// getChildNodes() - the nodes with a direct outgoing edge to `node`.
export function getParentNodes(node: Positioned, edges: readonly DiagramEdge[]): DiagramNode[] {
  const parents = new Set<DiagramNode>();
  for (const edge of edges) {
    if (edge.node2 === node && !edge.folded) {
      parents.add(edge.node1);
    }
  }
  return [...parents]
    .filter((parent) => parent !== node && parent.group === node.group)
    .sort((a, b) => a.order - b.order);
}
