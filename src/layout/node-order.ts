// Ported from `DiagramLayoutManager.detect_circulars()`/
// `detect_circulars_sub()`/`is_circular_ref()`/`adjust_node_order()`
// (vendor/blockdiag/src/blockdiag/builder.py). Covers flat, group-free
// diagrams only: `adjust_node_order()`'s `isinstance(node, NodeGroup)`
// branch (reordering a group's own children) is deferred to a later,
// group-aware layout step.
import { getChildNodes, getParentNodes, type Positioned, type RelatedEdge } from "./related-nodes.js";

function arraysEqual(a: readonly Positioned[], b: readonly Positioned[]): boolean {
  return a.length === b.length && a.every((node, i) => node === b[i]);
}

function removeFirstEqual(circulars: Positioned[][], target: readonly Positioned[]): void {
  const index = circulars.findIndex((c) => arraysEqual(c, target));
  if (index !== -1) {
    circulars.splice(index, 1);
  }
}

// Ported from `detect_circulars_sub()`: walks the child chain starting at
// `node`, recording `parents` (the path taken to get here) as a newly
// found circular reference whenever it reaches a node already on that
// path - the slice from that node's first occurrence onward. Keeps
// following every other child regardless, so one node can be part of
// several recorded circulars found from different starting points.
function detectCircularsSub(
  node: Positioned,
  parents: readonly Positioned[],
  edges: readonly RelatedEdge[],
  circulars: Positioned[][],
): void {
  for (const child of getChildNodes(node, edges)) {
    const i = parents.indexOf(child);
    if (i !== -1) {
      const cycle = parents.slice(i);
      if (!circulars.some((c) => arraysEqual(c, cycle))) {
        circulars.push(cycle);
      }
    } else {
      detectCircularsSub(child, [...parents, child], edges, circulars);
    }
  }
}

// Ported from `detect_circulars()`. Two circulars found from different
// starting nodes can describe overlapping loops through a shared node -
// the cleanup pass below merges any pair that intersects into one
// (dropping either that turns out to be wholly contained in the other).
export function detectCirculars(nodes: readonly Positioned[], edges: readonly RelatedEdge[]): Positioned[][] {
  const circulars: Positioned[][] = [];
  for (const node of nodes) {
    if (!circulars.some((c) => c.includes(node))) {
      detectCircularsSub(node, [node], edges, circulars);
    }
  }

  for (const c1 of [...circulars]) {
    for (let i = 0; i < circulars.length; i++) {
      const c2 = circulars[i];
      const set1 = new Set(c1);
      const set2 = new Set(c2);
      const intersect = [...set1].filter((node) => set2.has(node));

      if (!arraysEqual(c1, c2) && intersect.length === set1.size) {
        removeFirstEqual(circulars, c1);
        break;
      }
      if (!arraysEqual(c1, c2) && intersect.length > 0) {
        removeFirstEqual(circulars, c1);
        removeFirstEqual(circulars, c2);
        circulars.push([...c1, ...c2]);
        break;
      }
    }
  }

  return circulars;
}

// Ported from `is_circular_ref()`: true if `node1` and `node2` sit on the
// same detected circular, AND that circular's own "entry points" (parents
// from outside the loop) settle the two nodes' relative order as
// "node1 after node2" - the way a plain, acyclic edge would if it existed
// between them (used by set_node_xpos()/adjust_node_order() to leave a
// circularly-referencing pair's placement/ordering alone rather than
// treating one as the other's child).
export function isCircularRef(
  node1: Positioned,
  node2: Positioned,
  circulars: readonly Positioned[][],
  edges: readonly RelatedEdge[],
): boolean {
  for (const circular of circulars) {
    if (!circular.includes(node1) || !circular.includes(node2)) {
      continue;
    }

    const parents: Positioned[] = [];
    for (const node of circular) {
      for (const parent of getParentNodes(node, edges)) {
        if (!circular.includes(parent)) {
          parents.push(parent);
        }
      }
    }

    for (const parent of [...parents].sort((a, b) => a.order - b.order)) {
      const children = getChildNodes(parent, edges);
      const has1 = children.some((child) => child === node1);
      const has2 = children.some((child) => child === node2);
      if (has1 && has2) {
        if (circular.indexOf(node1) > circular.indexOf(node2)) {
          return true;
        }
      } else if (has2) {
        return true;
      } else if (has1) {
        return false;
      }
    }

    // Falls through here once none of the entry points above settled it
    // one way or the other (including when there were none at all) -
    // ordering `node1`/`node2` by their own position in the cycle.
    if (circular.indexOf(node1) > circular.indexOf(node2)) {
      return true;
    }
  }

  return false;
}

// Ported from `adjust_node_order()`, minus the `NodeGroup`-specific
// branch (deferred - see the file comment above). Moves each node's
// same-depth parents/children to sit next to each other in `nodes`, in
// the order those relationships imply, so nodes reachable from one
// another (via a chain of edges, not necessarily the same edge) end up
// adjacent in the array that ultimately drives y-position assignment.
export function adjustNodeOrder(
  nodes: Positioned[],
  edges: readonly RelatedEdge[],
  circulars: readonly Positioned[][],
): void {
  for (const node of [...nodes]) {
    const parents = getParentNodes(node, edges);
    for (let i = 1; i < parents.length; i++) {
      const node1 = parents[i - 1];
      const node2 = parents[i];
      if (node1.xy.x !== node2.xy.x) {
        continue;
      }
      const idx1 = nodes.indexOf(node1);
      const idx2 = nodes.indexOf(node2);
      if (idx1 < idx2) {
        nodes.splice(idx2, 1);
        nodes.splice(idx1 + 1, 0, node2);
      } else {
        nodes.splice(idx1, 1);
        nodes.splice(idx2 + 1, 0, node1);
      }
    }

    const children = getChildNodes(node, edges);
    for (let i = 1; i < children.length; i++) {
      const node1 = children[i - 1];
      const node2 = children[i];
      const idx1 = nodes.indexOf(node1);
      const idx2 = nodes.indexOf(node2);

      if (node1.xy.x === node2.xy.x) {
        if (idx1 < idx2) {
          nodes.splice(idx2, 1);
          nodes.splice(idx1 + 1, 0, node2);
        } else {
          nodes.splice(idx1, 1);
          nodes.splice(idx2 + 1, 0, node1);
        }
      } else if (isCircularRef(node1, node2, circulars, edges)) {
        // Leaves a circularly-referencing pair's order alone.
      } else if (node1.xy.x < node2.xy.x) {
        nodes.splice(idx2, 1);
        nodes.splice(idx1 + 1, 0, node2);
      } else {
        nodes.splice(idx1, 1);
        nodes.splice(idx2 + 1, 0, node1);
      }
    }
  }

  nodes.forEach((node, index) => {
    node.order = index;
  });
}
