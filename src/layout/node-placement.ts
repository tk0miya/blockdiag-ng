// Ported from `DiagramLayoutManager.do_layout()`'s node-placement steps
// (vendor/blockdiag/src/blockdiag/builder.py): `set_node_xpos()` and
// `set_node_ypos()`, plus the `NodeGroup.fixiate()` call that sizes a
// group to its placed nodes afterward. Circular-reference detection and
// node-reorder adjustment (node-order.ts) run around these. This is one
// level's worth of layout only - group-layout.ts calls layoutGroup() once
// per group (deepest first) to lay out each one's own direct children,
// then converts every node's now-relative-to-its-own-group xy into an
// absolute one.
import type { AnyGroup, DiagramEdge, XY } from "../model/elements.js";
import { getParentNodeYPos } from "./group-boundary.js";
import { adjustNodeOrder, detectCirculars, isCircularRef } from "./node-order.js";
import { getChildNodes, type Positioned, type RelatedEdge } from "./related-nodes.js";

// Ported from `set_node_xpos()`: places each node one column to the right
// of its parent, one depth at a time, without moving a child that's
// already further right (e.g. because another parent already pushed it
// there) or a child it circularly refers back to.
function setNodeXPos(
  nodes: readonly Positioned[],
  edges: readonly RelatedEdge[],
  circulars: readonly Positioned[][],
  depth = 0,
): void {
  for (const node of nodes) {
    if (node.xy.x !== depth) {
      continue;
    }
    for (const child of getChildNodes(node, edges)) {
      if (isCircularRef(node, child, circulars, edges) || child.xy.x > node.xy.x + node.colwidth) {
        continue;
      }
      child.xy = { x: node.xy.x + node.colwidth, y: 0 };
    }
  }

  if (nodes.some((node) => node.xy.x > depth)) {
    setNodeXPos(nodes, edges, circulars, depth + 1);
  }
}

function hasCoordinate(coordinates: readonly XY[], xy: XY): boolean {
  return coordinates.some((c) => c.x === xy.x && c.y === xy.y);
}

function markXy(coordinates: XY[], xy: XY, width: number, height: number): void {
  for (let w = 0; w < width; w++) {
    for (let h = 0; h < height; h++) {
      coordinates.push({ x: xy.x + w, y: xy.y + h });
    }
  }
}

// Ported from `is_rhombus()`: true if following each node's *sole* child,
// step by step, converges on the same node - the "diamond" shape
// (A->B, A->C, B->D, C->D) that set_node_ypos() checks for before letting
// an otherwise-vertically-stacked sibling push a later one further down.
function isRhombus(node1: Positioned, node2: Positioned, edges: readonly RelatedEdge[]): boolean {
  let a = node1;
  let b = node2;
  for (;;) {
    if (a === b) {
      return true;
    }

    const childrenA = getChildNodes(a, edges);
    const childrenB = getChildNodes(b, edges);
    if (childrenA.length !== 1 || childrenB.length !== 1) {
      return false;
    }
    if (a.xy.x > childrenA[0].xy.x || b.xy.x > childrenB[0].xy.x) {
      return false;
    }
    a = childrenA[0];
    b = childrenB[0];
  }
}

// Ported from `set_node_ypos()`. Returns false when `node` itself can't
// fit at `height` (its column range at that height is already occupied),
// so the caller can retry it one row down.
function setNodeYPos(
  node: Positioned,
  height: number,
  edges: readonly RelatedEdge[],
  coordinates: XY[],
  heightRefs: Set<string>,
  allEdges: readonly DiagramEdge[],
): boolean {
  for (let x = 0; x < node.colwidth; x++) {
    for (let y = 0; y < node.colheight; y++) {
      if (hasCoordinate(coordinates, { x: node.xy.x + x, y: height + y })) {
        return false;
      }
    }
  }
  node.xy = { x: node.xy.x, y: height };
  markXy(coordinates, node.xy, node.colwidth, node.colheight);

  const children = getChildNodes(node, edges);
  const grandchildCount = children.filter((child) => getChildNodes(child, edges).length > 0).length;

  let count = 0;
  let prevChild: Positioned | null = null;
  for (const child of children) {
    if (heightRefs.has(child.id)) {
      continue;
    }
    if (node.xy.x >= child.xy.x) {
      continue;
    }

    if (node.kind === "group") {
      // A latent quirk carried over as-is: 0 is a legitimate y position,
      // but `parentHeight &&` treats it the same as "no data" (null) and
      // skips the adjustment - matching the original's own
      // `if parent_height and ...`, where 0 and None are equally falsy.
      const parentHeight = getParentNodeYPos(node, child, allEdges);
      if (parentHeight && parentHeight > height) {
        height = parentHeight;
      }
    }

    if (prevChild !== null && grandchildCount > 1 && !isRhombus(prevChild, child, edges)) {
      const ys = coordinates.filter((c) => c.x > child.xy.x).map((c) => c.y);
      if (ys.length > 0 && Math.max(...ys) >= node.xy.y) {
        height = Math.max(...ys) + 1;
      }
    }

    for (;;) {
      if (setNodeYPos(child, height, edges, coordinates, heightRefs, allEdges)) {
        child.xy = { x: child.xy.x, y: height };
        markXy(coordinates, child.xy, child.colwidth, child.colheight);
        heightRefs.add(child.id);
        count++;
        break;
      }
      if (count === 0) {
        return false;
      }
      height++;
    }

    height++;
    prevChild = child;
  }

  return true;
}

// Ported from `NodeGroup.fixiate()` (its `fixiate_nodes=False` case -
// group-layout.ts handles the `True` case, converting every node's xy
// from relative-to-its-own-group to absolute, once every level has its
// own layout done). Sizes `group` to the furthest-extending edge of its
// placed nodes; left untouched (at its build-time default of 1x1) when
// there are no nodes to measure.
function fixiateGroup(group: AnyGroup): void {
  if (group.nodes.length > 0) {
    group.colwidth = Math.max(...group.nodes.map((node) => node.xy.x + node.colwidth));
    group.colheight = Math.max(...group.nodes.map((node) => node.xy.y + node.colheight));
  }
}

// Ported from `rotate_diagram()`: swaps x/y and colwidth/colheight for
// every descendant of `group` at any depth (not just its direct
// children - `NodeGroup.traverse_nodes()` recurses), toggling any nested
// group's own orientation flag along the way, then does the same swap
// for `group` itself (whose own orientation flag is left alone - only
// entries `traverse_nodes()` yields get toggled, and that excludes
// `group` itself). Called once per level, right after that level's own
// `fixiateGroup()`, so a group nested several levels deep can have its
// content flipped once by its own level's rotation and flipped again by
// an ancestor's.
function rotateGroup(group: AnyGroup): void {
  if (group.orientation !== "portrait") {
    return;
  }

  const rotateDescendants = (of: AnyGroup): void => {
    for (const node of of.nodes) {
      node.xy = { x: node.xy.y, y: node.xy.x };
      const width = node.colwidth;
      node.colwidth = node.colheight;
      node.colheight = width;
      if (node.kind === "group") {
        node.orientation = node.orientation === "portrait" ? "landscape" : "portrait";
        rotateDescendants(node);
      }
    }
  };
  rotateDescendants(group);

  const width = group.colwidth;
  group.colwidth = group.colheight;
  group.colheight = width;
}

// Ported from `DiagramLayoutManager.do_layout()`'s node-placement calls:
// lays out `group`'s own direct children, relative to `group`'s own
// origin. `edges` must already be folded to `group`'s level (see
// group-layout.ts's edgesAtLevel()); `allEdges` is every real edge in the
// diagram, unfolded, needed only when placing a child of a group whose
// own internal nodes connect back out to that child (see
// getParentNodeYPos()).
export function layoutGroup(group: AnyGroup, edges: readonly RelatedEdge[], allEdges: readonly DiagramEdge[]): void {
  const circulars = detectCirculars(group.nodes, edges);
  setNodeXPos(group.nodes, edges, circulars);
  adjustNodeOrder(group.nodes, edges, circulars, allEdges);

  const coordinates: XY[] = [];
  const heightRefs = new Set<string>();
  let height = 0;
  for (const node of group.nodes) {
    if (node.xy.x === 0) {
      setNodeYPos(node, height, edges, coordinates, heightRefs, allEdges);
      height = Math.max(...coordinates.map((c) => c.y)) + 1;
    }
  }

  fixiateGroup(group);
  rotateGroup(group);
}
