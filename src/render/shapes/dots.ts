// Ported from `noderenderer/dots.py`: three small dots through the
// node's center - spaced vertically in a landscape-oriented group,
// horizontally in a portrait one - and no label at all. Draws no
// shadow either (`render_shape` returns immediately when `shadow`).
import type { DiagramNode } from "../../model/elements.js";
import type { Font } from "../font-metrics.js";
import type { Box, Point } from "../geometry.js";
import { boxCenter } from "../geometry.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { RenderMode } from "../render-mode.js";
import type { NodeShape } from "../shape-registry.js";
import type { SvgDocument } from "../svg-document.js";

export function renderDotsNode(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  node: DiagramNode,
  _font: Font,
  _fontSize: number,
  mode: RenderMode,
): void {
  if (mode.kind === "shadow") return;

  const center = boxCenter(nodeBox(metrics, node));
  const landscape = (node.group?.orientation ?? "landscape") === "landscape";

  const dots: Point[] = landscape
    ? [
        center,
        { x: center.x, y: center.y - metrics.nodeHeight / 2 },
        { x: center.x, y: center.y + metrics.nodeHeight / 2 },
      ]
    : [
        center,
        { x: center.x - metrics.nodeWidth / 3, y: center.y },
        { x: center.x + metrics.nodeWidth / 3, y: center.y },
      ];

  const r = metrics.cellSize / 2;
  for (const dot of dots) {
    const box: Box = { x1: dot.x - r, y1: dot.y - r, x2: dot.x + r, y2: dot.y + r };
    doc.ellipse(box, { fill: node.linecolor, outline: node.linecolor });
  }
}

// `getConnectors` is `null` - dots inherits the plain box default, same
// as box.ts. `getTextBox` stays `null` too - dots never renders a label
// to begin with.
export const dotsShape: NodeShape = { render: renderDotsNode, getConnectors: null, getTextBox: null };
