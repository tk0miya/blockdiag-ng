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

import type { GroupItem } from "../layout/related-nodes.js";
import type { AnyGroup, Diagram, DiagramNode } from "../model/elements.js";
import type { Box, Point, Size } from "./geometry.js";

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
  // Ported from `page_margin`: a uniform, otherwise-always-zero offset
  // applied to every node's own box - unlike `pagePadding` (set once,
  // diagram-wide), this exists so `shiftMetrics()` can retarget an
  // entire render pass at an offset copy of the page, for `stacked`'s
  // duplicate layers (see draw-diagram.ts).
  readonly pageMargin: Point;
  readonly columnWidths: ReadonlyMap<number, number>;
  readonly rowHeights: ReadonlyMap<number, number>;
}

// Ported from `DiagramMetrics.shift()`: a copy of `metrics` retargeted
// at `pageMargin`, so every node's own box computed through it comes out
// shifted by that same amount - used to draw a `stacked` node's
// duplicate layers without touching the real one's own position.
export function shiftMetrics(metrics: DiagramMetrics, dx: number, dy: number): DiagramMetrics {
  return { ...metrics, pageMargin: { x: dx, y: dy } };
}

// Ported from `Diagram.traverse_nodes()`, restricted to actual drawable
// nodes (`kind === "node"`, never a group) - also reused by
// draw-diagram.ts to dispatch each node to its shape's renderer.
export function collectAllNodes(group: AnyGroup): DiagramNode[] {
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

// Ported from `n or node_width` (in the `width = max(n or node_width for n
// in widths)` comprehension) plus `set_node_width()`'s own `0 < width`
// check: a node's own width/height only grows its column/row when it's a
// real, positive override - `null` (unset) or a non-positive value both
// fall back to the diagram-wide default instead. Exported since other
// shapes (e.g. `cloud`) that also read `node.width`/`node.height`
// directly need this same "positive override, else fallback" logic -
// not just plain `??`, which (unlike Python's `or`) wouldn't fall back
// for a non-positive value.
export function effectiveSize(size: number | null, fallback: number): number {
  return size !== null && size > 0 ? size : fallback;
}

// Ported from `DiagramMetrics.__init__()`'s node_width/node_height setup
// loop.
function columnSizes(
  nodes: readonly GroupItem[],
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
    pageMargin: { x: 0, y: 0 },
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
export function nodeBox(metrics: DiagramMetrics, node: GroupItem, usePadding = true): Box {
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
    x1: metrics.pageMargin.x + metrics.pagePadding + widthBefore + metrics.spanWidth * (x + 1) + xDiff,
    y1: metrics.pageMargin.y + metrics.pagePadding + heightBefore + metrics.spanHeight * (y + 1) + yDiff,
    x2: metrics.pageMargin.x + metrics.pagePadding + widthThrough + metrics.spanWidth * (lastColumn + 1) - xDiff,
    y2: metrics.pageMargin.y + metrics.pagePadding + heightThrough + metrics.spanHeight * (lastRow + 1) - yDiff,
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

// Ported from `NodeMetrics.node_padding` (a fixed constant, never
// configured by anything - unlike `cellSize`/`nodeWidth`/etc., not worth
// exposing on `DiagramMetrics` itself since only `coreBox()` needs it).
const NODE_PADDING = 4;

// Ported from `NodeMetrics.corebox`: a group's own label area when it's
// `separated` (no nodes of its own to make room for a label above -
// see `groupLabelBox()`) - inset from the group's own box. The x2/y2
// inset is double the x1/y1 one, matching the original exactly (not
// verified as intentional, just ported as-is).
export function coreBox(box: Box): Box {
  return {
    x1: box.x1 + NODE_PADDING,
    y1: box.y1 + NODE_PADDING,
    x2: box.x2 - NODE_PADDING * 2,
    y2: box.y2 - NODE_PADDING * 2,
  };
}

// Ported from `NodeMetrics.grouplabelbox`: a strip spanning a group's
// own full width, sitting just above its own box - where a non-
// `separated` group's label goes (see draw-diagram.ts's
// `drawGroupLabels()`).
export function groupLabelBox(metrics: DiagramMetrics, box: Box): Box {
  return {
    x1: box.x1,
    y1: box.y1 - Math.floor(metrics.spanHeight / 2),
    x2: box.x2,
    y2: box.y1,
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
    width: metrics.pageMargin.x + 2 * metrics.pagePadding + width + metrics.spanWidth * (colwidth + 1),
    height: metrics.pageMargin.y + 2 * metrics.pagePadding + height + metrics.spanHeight * (colheight + 1),
  };
}
