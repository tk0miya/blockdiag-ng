// Ported from `EdgeLayoutManager.run()` (vendor/blockdiag/src/blockdiag/
// builder.py): marks an edge as `skipped` when its straight-line path, as
// it will be drawn between its two (by now absolute) endpoints, passes
// directly through some other node's position - so the renderer can draw
// a small hop over it there instead of a line straight through it. Only
// implemented for the direction/orientation/edge_layout combinations the
// original itself handles: "left", "left-up", and "same" never mark
// anything in either orientation, nor does "up" in a portrait group,
// matching the original's own incomplete coverage.
import type { AnyGroup, Diagram, DiagramEdge, DiagramNode } from "../model/elements.js";
import { collectAllEdges } from "./group-layout.js";

type Direction = "left-up" | "left" | "left-down" | "up" | "same" | "down" | "right-up" | "right" | "right-down";

// Ported from `DiagramEdge.direction`.
function edgeDirection(edge: DiagramEdge): Direction {
  const { x: x1, y: y1 } = edge.node1.xy;
  const { x: x2, y: y2 } = edge.node2.xy;
  if (x1 > x2) {
    if (y1 > y2) {
      return "left-up";
    }
    return y1 === y2 ? "left" : "left-down";
  }
  if (x1 === x2) {
    if (y1 > y2) {
      return "up";
    }
    return y1 === y2 ? "same" : "down";
  }
  return y1 > y2 ? "right-up" : y1 === y2 ? "right" : "right-down";
}

function hasNodeAt(nodes: readonly DiagramNode[], x: number, y: number): boolean {
  return nodes.some((node) => node.xy.x === x && node.xy.y === y);
}

function collectAllNodes(group: AnyGroup): DiagramNode[] {
  const nodes: DiagramNode[] = [];
  for (const node of group.nodes) {
    if (node.kind === "group") {
      nodes.push(...collectAllNodes(node));
    } else {
      nodes.push(node);
    }
  }
  return nodes;
}

export function markSkippedEdges(diagram: Diagram): void {
  const edges = collectAllEdges(diagram).filter((edge) => edge.style === null || edge.style.type !== "none");
  const nodes = collectAllNodes(diagram);

  for (const edge of edges) {
    const dir = edgeDirection(edge);
    const landscape = (edge.node1.group?.orientation ?? "landscape") === "landscape";
    const { x: x1, y: y1 } = edge.node1.xy;
    const { x: x2, y: y2 } = edge.node2.xy;

    if (landscape) {
      if (dir === "right" || dir === "right-up") {
        for (let x = x1 + 1; x < x2; x++) {
          if (hasNodeAt(nodes, x, y1)) {
            edge.skipped = 1;
          }
        }
      } else if (dir === "right-down") {
        if (diagram.edgeLayout === "flowchart") {
          for (let y = y1; y < y2; y++) {
            if (hasNodeAt(nodes, x1, y + 1)) {
              edge.skipped = 1;
            }
          }
        }
        for (let x = x1 + 1; x < x2; x++) {
          if (hasNodeAt(nodes, x, y2)) {
            edge.skipped = 1;
          }
        }
      } else if (dir === "left-down" || dir === "down") {
        for (let y = y1 + 1; y < y2; y++) {
          if (hasNodeAt(nodes, x1, y)) {
            edge.skipped = 1;
          }
        }
      } else if (dir === "up") {
        for (let y = y2 + 1; y < y1; y++) {
          if (hasNodeAt(nodes, x1, y)) {
            edge.skipped = 1;
          }
        }
      }
    } else {
      if (dir === "right") {
        for (let x = x1 + 1; x < x2; x++) {
          if (hasNodeAt(nodes, x, y1)) {
            edge.skipped = 1;
          }
        }
      } else if (dir === "left-down" || dir === "down") {
        for (let y = y1 + 1; y < y2; y++) {
          if (hasNodeAt(nodes, x1, y)) {
            edge.skipped = 1;
          }
        }
      } else if (dir === "right-down") {
        if (diagram.edgeLayout === "flowchart") {
          for (let x = x1; x < x2; x++) {
            if (hasNodeAt(nodes, x + 1, y1)) {
              edge.skipped = 1;
            }
          }
        }
        for (let y = y1 + 1; y < y2; y++) {
          if (hasNodeAt(nodes, x2, y)) {
            edge.skipped = 1;
          }
        }
      }
    }
  }
}
