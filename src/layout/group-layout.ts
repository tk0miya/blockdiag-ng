// Ported from `DiagramLayoutManager.run()` (vendor/blockdiag/src/blockdiag/
// builder.py): lays out each group's own direct children before its
// parent's (deepest first), since a group must know its own size before
// whatever contains it can treat it as a single positionable unit, then
// converts every node's xy - so far relative to its own immediate group -
// into an absolute, diagram-wide position.
import type { AnyGroup, Diagram, DiagramEdge, DiagramNode } from "../model/elements.js";
import { layoutGroup } from "./node-placement.js";
import type { Positioned, RelatedEdge } from "./related-nodes.js";

// Ported from `NodeGroup.traverse_groups(preorder=False)`: every group
// nested anywhere in `group`, deepest first - so a group's own nested
// groups always come before it.
function traverseGroupsPostOrder(group: AnyGroup): AnyGroup[] {
  const result: AnyGroup[] = [];
  for (const node of group.nodes) {
    if (node.kind === "group") {
      result.push(...traverseGroupsPostOrder(node), node);
    }
  }
  return result;
}

// Every edge anywhere in the diagram, regardless of which group it's
// bound to (tree-builder.ts binds each edge to whichever group directly
// contains its source node) - edgesAtLevel() needs the full set to fold
// from, not just one group's own.
function collectAllEdges(group: AnyGroup): DiagramEdge[] {
  const edges = [...group.edges];
  for (const node of group.nodes) {
    if (node.kind === "group") {
      edges.push(...collectAllEdges(node));
    }
  }
  return edges;
}

// Ported from `DiagramEdge.find_by_level()` (vendor/blockdiag/src/
// blockdiag/elements.py): folds an edge's endpoint up to whichever
// ancestor sits exactly at `level`, if it's nested deeper than that;
// leaves it as-is if its own group is already shallower than `level`
// (it belongs to an ancestor level entirely, so it doesn't reach down to
// this one).
function foldEndpoint(node: DiagramNode, level: number): { node: Positioned; skip: boolean } {
  if (node.group === null || node.group.level < level) {
    return { node, skip: true };
  }
  let current: Positioned = node;
  // The extra `!== "diagram"` check never actually changes anything here
  // (level strictly increases by 1 per nesting depth, so this walk always
  // passes through something at exactly `level` before it could ever
  // reach the root) - it's here so the assignment below stays within
  // `Positioned`, which excludes the root `Diagram`.
  while (current.group !== null && current.group.level !== level && current.group.kind !== "diagram") {
    current = current.group;
  }
  return { node: current, skip: false };
}

// Ported from `DiagramEdge.find_by_level()`: the edges visible while
// laying out `level`'s own contents - every real edge, each endpoint
// folded up to its ancestor at `level` (or left alone if it's already
// shallower), dropping any edge whose *both* endpoints turned out
// shallower (it's entirely an ancestor level's concern, not this one's).
function edgesAtLevel(edges: readonly DiagramEdge[], level: number): RelatedEdge[] {
  const result: RelatedEdge[] = [];
  for (const edge of edges) {
    const node1 = foldEndpoint(edge.node1, level);
    const node2 = foldEndpoint(edge.node2, level);
    if (node1.skip && node2.skip) {
      continue;
    }
    result.push({ node1: node1.node, node2: node2.node, folded: edge.folded });
  }
  return result;
}

// Ported from `NodeGroup.fixiate(fixiate_nodes=True)`: converts every
// node's xy from relative-to-its-own-group into an absolute, diagram-wide
// position, cascading top-down (a group's own xy is already absolute by
// the time its children are shifted, having been converted itself one
// level up).
function cascadeAbsolutePositions(group: AnyGroup): void {
  for (const node of group.nodes) {
    node.xy = { x: group.xy.x + node.xy.x, y: group.xy.y + node.xy.y };
    if (node.kind === "group") {
      cascadeAbsolutePositions(node);
    }
  }
}

// Ported from `DiagramLayoutManager.run()`, plus `ScreenNodeBuilder.run()`'s
// follow-up `self.diagram.fixiate(True)` call that converts every node's
// relative position into an absolute one.
export function layoutDiagram(diagram: Diagram): void {
  const allEdges = collectAllEdges(diagram);

  for (const group of traverseGroupsPostOrder(diagram)) {
    layoutGroup(group, edgesAtLevel(allEdges, group.level));
  }
  layoutGroup(diagram, edgesAtLevel(allEdges, diagram.level));

  cascadeAbsolutePositions(diagram);
}
