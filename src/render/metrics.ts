// Ported from `DiagramMetrics`/`SpreadSheetMetrics`/`NodeMetrics`
// (vendor/blockdiag/src/blockdiag/metrics.py): converts a diagram's grid
// coordinates (`DiagramNode.xy`/`.colwidth`/`.colheight`, in cells) into
// pixel boxes, honoring a node's own `width`/`height` override by growing
// its whole column/row to fit (so its neighbors in the same column/row
// line up with it).
//
// `span_width`/`span_height` are a per-column/row spreadsheet in the
// original too (`set_span_width()`/`add_span_width()` and their height
// counterparts), but nothing anywhere in the original ever calls those -
// confirmed by inspection - so every column/row's span is always just
// the diagram-wide default. This port keeps span width/height as plain
// numbers instead of building a per-column/row map that would only ever
// hold one uniform value.

import type { Positioned } from "../layout/related-nodes.js";
import type { AnyGroup, Diagram } from "../model/elements.js";
import type { Box, Size } from "./geometry.js";

const CELL_SIZE = 8;
const DEFAULT_NODE_WIDTH = CELL_SIZE * 16;
const DEFAULT_NODE_HEIGHT = CELL_SIZE * 5;
const DEFAULT_SPAN_WIDTH = CELL_SIZE * 8;
const DEFAULT_SPAN_HEIGHT = CELL_SIZE * 5;

export interface DiagramMetrics {
  readonly cellSize: number;
  readonly nodeWidth: number;
  readonly nodeHeight: number;
  readonly spanWidth: number;
  readonly spanHeight: number;
  readonly pagePadding: number;
  readonly columnWidths: ReadonlyMap<number, number>;
  readonly rowHeights: ReadonlyMap<number, number>;
}

function collectAllNodes(group: AnyGroup): Positioned[] {
  const nodes: Positioned[] = [];
  for (const node of group.nodes) {
    if (node.kind === "group") {
      nodes.push(...collectAllNodes(node));
    } else {
      nodes.push(node);
    }
  }
  return nodes;
}

// Ported from `n or node_width` (in the `width = max(n or node_width for n
// in widths)` comprehension) plus `set_node_width()`'s own `0 < width`
// check: a node's own width/height only grows its column/row when it's a
// real, positive override - `null` (unset) or a non-positive value both
// fall back to the diagram-wide default instead.
function effectiveSize(size: number | null, fallback: number): number {
  return size !== null && size > 0 ? size : fallback;
}

// Ported from `DiagramMetrics.__init__()`'s node_width/node_height setup
// loop.
function columnSizes(
  nodes: readonly Positioned[],
  count: number,
  axis: "x" | "y",
  fallback: number,
): Map<number, number> {
  const sizes = new Map<number, number>();
  for (let i = 0; i < count; i++) {
    const candidates = nodes
      .filter((node) => node.xy[axis] === i)
      .map((node) => effectiveSize(axis === "x" ? node.width : node.height, fallback));
    if (candidates.length > 0) {
      sizes.set(i, Math.max(...candidates));
    }
  }
  return sizes;
}

export function createDiagramMetrics(diagram: Diagram): DiagramMetrics {
  const nodeWidth = effectiveSize(diagram.nodeWidth, DEFAULT_NODE_WIDTH);
  const nodeHeight = effectiveSize(diagram.nodeHeight, DEFAULT_NODE_HEIGHT);
  const spanWidth = effectiveSize(diagram.spanWidth, DEFAULT_SPAN_WIDTH);
  const spanHeight = effectiveSize(diagram.spanHeight, DEFAULT_SPAN_HEIGHT);
  const pagePadding = diagram.pagePadding ?? 0;

  const nodes = collectAllNodes(diagram);
  return {
    cellSize: CELL_SIZE,
    nodeWidth,
    nodeHeight,
    spanWidth,
    spanHeight,
    pagePadding,
    columnWidths: columnSizes(nodes, diagram.colwidth, "x", nodeWidth),
    rowHeights: columnSizes(nodes, diagram.colheight, "y", nodeHeight),
  };
}

// The combined pixel width/height of columns/rows `0` up to (but not
// including) `count`.
function sumBefore(sizes: ReadonlyMap<number, number>, fallback: number, count: number): number {
  let sum = 0;
  for (let i = 0; i < count; i++) {
    sum += sizes.get(i) ?? fallback;
  }
  return sum;
}

// Ported from `SpreadSheetMetrics.node()` (`_node_topleft()` +
// `_node_bottomright()` combined into one box). `usePadding=false` (as
// `NodeGroup`s and the page-size calculation below both need) skips
// centering a node/group narrower than its own column/row within it.
export function nodeBox(metrics: DiagramMetrics, node: Positioned, usePadding = true): Box {
  const { x, y } = node.xy;
  const lastColumn = x + node.colwidth - 1;
  const lastRow = y + node.colheight - 1;

  const widthBefore = sumBefore(metrics.columnWidths, metrics.nodeWidth, x);
  const widthThrough = sumBefore(metrics.columnWidths, metrics.nodeWidth, lastColumn + 1);
  const heightBefore = sumBefore(metrics.rowHeights, metrics.nodeHeight, y);
  const heightThrough = sumBefore(metrics.rowHeights, metrics.nodeHeight, lastRow + 1);

  let xDiff = 0;
  let yDiff = 0;
  if (usePadding) {
    const width = effectiveSize(node.width, metrics.nodeWidth);
    xDiff = Math.max(0, Math.floor(((metrics.columnWidths.get(x) ?? metrics.nodeWidth) - width) / 2));
    const height = effectiveSize(node.height, metrics.nodeHeight);
    yDiff = Math.max(0, Math.floor(((metrics.rowHeights.get(y) ?? metrics.nodeHeight) - height) / 2));
  }

  return {
    x1: metrics.pagePadding + widthBefore + metrics.spanWidth * (x + 1) + xDiff,
    y1: metrics.pagePadding + heightBefore + metrics.spanHeight * (y + 1) + yDiff,
    x2: metrics.pagePadding + widthThrough + metrics.spanWidth * (lastColumn + 1) - xDiff,
    y2: metrics.pagePadding + heightThrough + metrics.spanHeight * (lastRow + 1) - yDiff,
  };
}

// Ported from `NodeMetrics.marginbox`: a group's own box, expanded
// slightly beyond its content so its background doesn't hug its nodes
// exactly.
export function marginBox(metrics: DiagramMetrics, box: Box): Box {
  const xMargin = Math.floor(metrics.spanWidth / 8);
  const yMargin = Math.floor(metrics.spanHeight / 4);
  return {
    x1: box.x1 - xMargin,
    y1: box.y1 - yMargin,
    x2: box.x2 + xMargin,
    y2: box.y2 + yMargin,
  };
}

// Ported from `SpreadSheetMetrics.pagesize()`. Unlike `nodeBox()`, not
// expressed as "one more node box query" here - the original does that
// via a throwaway dummy `DiagramNode`, which would mean fabricating a
// full node-shaped object here for no reason beyond reusing the formula.
export function pageSize(metrics: DiagramMetrics, colwidth: number, colheight: number): Size {
  const width = sumBefore(metrics.columnWidths, metrics.nodeWidth, colwidth);
  const height = sumBefore(metrics.rowHeights, metrics.nodeHeight, colheight);

  return {
    width: 2 * metrics.pagePadding + width + metrics.spanWidth * (colwidth + 1),
    height: 2 * metrics.pagePadding + height + metrics.spanHeight * (colheight + 1),
  };
}
