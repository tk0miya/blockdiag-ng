// Ported from `DiagramLayoutManager.get_parent_node_ypos()`/
// `compare_child_node_order()` (vendor/blockdiag/src/blockdiag/
// builder.py): both ask the same underlying question - given a group and
// one of its own real, internal edges reaching out to something else at
// the level containing the group, where should that something be placed
// relative to the group's own content. Standalone rather than living in
// group-layout.ts (which builds the `allEdges` this needs): had it lived
// there, node-placement.ts/node-order.ts (which call these from within
// setNodeYPos()/adjustNodeOrder()) would need to import group-layout.ts,
// which already imports node-placement.ts for layoutGroup() - a cycle.
import type { AnyGroup, DiagramEdge, DiagramNode } from "../model/elements.js";
import type { Positioned } from "./related-nodes.js";

// True if `group` is `ancestor` itself, or nested somewhere inside it.
function isNestedIn(group: AnyGroup | null, ancestor: AnyGroup): boolean {
  let current: AnyGroup | null = group;
  while (current !== null) {
    if (current === ancestor) {
      return true;
    }
    current = current.group;
  }
  return false;
}

// Ported from the `isinstance(node1, NodeGroup)` branch of
// `DiagramEdge.find()`, as called from `get_parent_node_ypos()`
// (`find(parent, child)`): the real edges that both originate somewhere
// inside `parent`'s own subtree and land on `child` itself, or (when
// `child` is a group, since it may be a level-folded stand-in rather than
// the real target) somewhere inside `child`'s subtree - while not
// themselves also landing inside `parent` (a real edge fully internal to
// `parent` says nothing about how `child`, which sits outside `parent`,
// should be positioned).
function findRealEdgesIntoChild(parent: AnyGroup, child: Positioned, allEdges: readonly DiagramEdge[]): DiagramEdge[] {
  return allEdges.filter((edge) => {
    const reachesChild = child.kind === "group" ? isNestedIn(edge.node2.group, child) : edge.node2 === child;
    return reachesChild && isNestedIn(edge.node1.group, parent) && !isNestedIn(edge.node2.group, parent);
  });
}

// Ported from `get_parent_node_ypos()`: when `parent` (a group already
// placed at this level) has `child` as one of its own level-folded
// children, the y this child should start at - the lowest, among every
// real edge reaching it from inside `parent`, of that edge's source's own
// y position (walked up and summed through each ancestor between it and
// `parent`, since those y's are still relative to their own immediate
// group at this point). `null` when no such edge exists.
export function getParentNodeYPos(
  parent: AnyGroup,
  child: Positioned,
  allEdges: readonly DiagramEdge[],
): number | null {
  const heights: number[] = [];
  for (const edge of findRealEdgesIntoChild(parent, child, allEdges)) {
    let y = parent.xy.y;
    let node: DiagramNode | AnyGroup = edge.node1;
    while (node !== parent) {
      y += node.xy.y;
      if (node.group === null) {
        break;
      }
      node = node.group;
    }
    heights.push(y);
  }
  return heights.length > 0 ? Math.min(...heights) : null;
}

// Ported from `compare_child_node_order()`: whether `node1` should sit
// after `node2` (1), before it (-1), or either way (0) - based on which
// of them a real edge from inside `parent` reaches first, among every
// such edge into either one, ordered by that edge's own real source.
//
// Not ported: the original's `compare()` helper first walks both edges'
// source up one group at a time for as long as they're exactly the same
// node (`x.node1 == y.node1`) with a non-null group. Since both are
// walked identically in lockstep from an identical starting node, they
// never actually diverge - the walk always ends with both still equal,
// which is exactly the `order`-comparison's own outcome for two equal
// nodes (0) - so comparing the original, unwalked sources directly
// produces the same result without it.
export function compareChildNodeOrder(
  parent: AnyGroup,
  node1: Positioned,
  node2: Positioned,
  allEdges: readonly DiagramEdge[],
): number {
  const edges = [
    ...findRealEdgesIntoChild(parent, node1, allEdges),
    ...findRealEdgesIntoChild(parent, node2, allEdges),
  ];
  edges.sort((a, b) => a.node1.order - b.node1.order);
  if (edges.length === 0) {
    return 0;
  }
  return edges[0].node2 === node2 ? 1 : -1;
}
