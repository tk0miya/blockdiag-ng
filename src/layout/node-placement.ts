// Ported from `DiagramLayoutManager.do_layout()`'s node-placement steps
// (vendor/blockdiag/src/blockdiag/builder.py): `set_node_xpos()` and
// `set_node_ypos()`, plus the `NodeGroup.fixiate()` call that sizes the
// diagram to its placed nodes afterward. Circular-reference detection and
// node-reorder adjustment (node-order.ts) run around these; a `NodeGroup`
// among a diagram's own nodes still gets no special treatment when
// computing a child's y position here (a later step adds group-aware
// layout), and Diagram.run()'s recursion into each nested group's own
// layout is likewise deferred to that step.
import type { Diagram, DiagramEdge, DiagramNode, XY } from "../model/elements.js";
import { adjustNodeOrder, detectCirculars, isCircularRef } from "./node-order.js";
import { getChildNodes, type Positioned } from "./related-nodes.js";

// Ported from `set_node_xpos()`: places each node one column to the right
// of its parent, one depth at a time, without moving a child that's
// already further right (e.g. because another parent already pushed it
// there) or a child it circularly refers back to.
function setNodeXPos(
  nodes: readonly Positioned[],
  edges: readonly DiagramEdge[],
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
function isRhombus(node1: DiagramNode, node2: DiagramNode, edges: readonly DiagramEdge[]): boolean {
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
  edges: readonly DiagramEdge[],
  coordinates: XY[],
  heightRefs: Set<string>,
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
  let prevChild: DiagramNode | null = null;
  for (const child of children) {
    if (heightRefs.has(child.id)) {
      continue;
    }
    if (node.xy.x >= child.xy.x) {
      continue;
    }

    if (prevChild !== null && grandchildCount > 1 && !isRhombus(prevChild, child, edges)) {
      const ys = coordinates.filter((c) => c.x > child.xy.x).map((c) => c.y);
      if (ys.length > 0 && Math.max(...ys) >= node.xy.y) {
        height = Math.max(...ys) + 1;
      }
    }

    for (;;) {
      if (setNodeYPos(child, height, edges, coordinates, heightRefs)) {
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

// Ported from `NodeGroup.fixiate()`: sizes the diagram to the
// furthest-extending edge of its placed nodes. Left untouched (at its
// build-time default of 1x1) when there are no nodes to measure.
function fixiateDiagram(diagram: Diagram): void {
  if (diagram.nodes.length > 0) {
    diagram.colwidth = Math.max(...diagram.nodes.map((node) => node.xy.x + node.colwidth));
    diagram.colheight = Math.max(...diagram.nodes.map((node) => node.xy.y + node.colheight));
  }
}

// Ported from `DiagramLayoutManager.do_layout()`'s node-placement calls.
export function layoutDiagram(diagram: Diagram): void {
  const circulars = detectCirculars(diagram.nodes, diagram.edges);
  setNodeXPos(diagram.nodes, diagram.edges, circulars);
  adjustNodeOrder(diagram.nodes, diagram.edges, circulars);

  const coordinates: XY[] = [];
  const heightRefs = new Set<string>();
  let height = 0;
  for (const node of diagram.nodes) {
    if (node.xy.x === 0) {
      setNodeYPos(node, height, diagram.edges, coordinates, heightRefs);
      height = Math.max(...coordinates.map((c) => c.y)) + 1;
    }
  }

  fixiateDiagram(diagram);
}
