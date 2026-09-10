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

// Ported from `DiagramEdge.direction`'s own possible values. Named
// `EdgeGeometricDirection` (not just `EdgeDirection`) to stay clearly
// distinct from the model's own `EdgeDirection` (`edge.dir`'s type -
// which end(s) grow an arrowhead, a wholly different, user-facing
// attribute this is never confused with in the original either, since
// Python just calls them `direction` and `dir`).
export type EdgeGeometricDirection =
  | "left-up"
  | "left"
  | "left-down"
  | "up"
  | "same"
  | "down"
  | "right-up"
  | "right"
  | "right-down";

function compare(a: number, b: number): -1 | 0 | 1 {
  return a < b ? -1 : a > b ? 1 : 0;
}

// Ported from `DiagramEdge.direction`. Exported since `render/edge-
// metrics.ts` needs this same computation for arrow-head/shaft routing
// - shared here (rather than each maintaining its own copy) since it's
// a real, if small, piece of ported business logic, not template
// boilerplate.
export function edgeDirection(edge: DiagramEdge): EdgeGeometricDirection {
  const dx = compare(edge.node1.xy.x, edge.node2.xy.x);
  const dy = compare(edge.node1.xy.y, edge.node2.xy.y);

  switch (dx) {
    case 1:
      switch (dy) {
        case 1:
          return "left-up";
        case 0:
          return "left";
        case -1:
          return "left-down";
      }
      break;
    case 0:
      switch (dy) {
        case 1:
          return "up";
        case 0:
          return "same";
        case -1:
          return "down";
      }
      break;
    case -1:
      switch (dy) {
        case 1:
          return "right-up";
        case 0:
          return "right";
        case -1:
          return "right-down";
      }
      break;
  }
}

function hasNodeAt(nodes: readonly DiagramNode[], x: number, y: number): boolean {
  return nodes.some((node) => node.xy.x === x && node.xy.y === y);
}

function hasNodeInXRange(nodes: readonly DiagramNode[], from: number, to: number, y: number): boolean {
  for (let x = from; x < to; x++) {
    if (hasNodeAt(nodes, x, y)) {
      return true;
    }
  }
  return false;
}

function hasNodeInYRange(nodes: readonly DiagramNode[], from: number, to: number, x: number): boolean {
  for (let y = from; y < to; y++) {
    if (hasNodeAt(nodes, x, y)) {
      return true;
    }
  }
  return false;
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
      switch (dir) {
        case "right":
        case "right-up":
          if (hasNodeInXRange(nodes, x1 + 1, x2, y1)) {
            edge.skipped = 1;
          }
          break;
        case "right-down":
          switch (diagram.edgeLayout) {
            case "flowchart":
              if (hasNodeInYRange(nodes, y1 + 1, y2 + 1, x1) || hasNodeInXRange(nodes, x1 + 1, x2, y2)) {
                edge.skipped = 1;
              }
              break;
            default:
              if (hasNodeInXRange(nodes, x1 + 1, x2, y2)) {
                edge.skipped = 1;
              }
              break;
          }
          break;
        case "left-down":
        case "down":
          if (hasNodeInYRange(nodes, y1 + 1, y2, x1)) {
            edge.skipped = 1;
          }
          break;
        case "up":
          if (hasNodeInYRange(nodes, y2 + 1, y1, x1)) {
            edge.skipped = 1;
          }
          break;
      }
    } else {
      switch (dir) {
        case "right":
          if (hasNodeInXRange(nodes, x1 + 1, x2, y1)) {
            edge.skipped = 1;
          }
          break;
        case "left-down":
        case "down":
          if (hasNodeInYRange(nodes, y1 + 1, y2, x1)) {
            edge.skipped = 1;
          }
          break;
        case "right-down":
          switch (diagram.edgeLayout) {
            case "flowchart":
              if (hasNodeInXRange(nodes, x1 + 1, x2 + 1, y1) || hasNodeInYRange(nodes, y1 + 1, y2, x2)) {
                edge.skipped = 1;
              }
              break;
            default:
              if (hasNodeInYRange(nodes, y1 + 1, y2, x2)) {
                edge.skipped = 1;
              }
              break;
          }
          break;
      }
    }
  }
}
