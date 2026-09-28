// Ported from `NodeShape.render_number_badge()` (noderenderer/base.py):
// a small circled number drawn over a node's own top-left corner, for
// a node with a `numbered` attribute. Independent of the node's shape
// - it's always positioned from the node's raw grid box (`nodeBox()`),
// never a shape's own textbox/connectors override - so this lives in
// the render pipeline rather than any individual shape file, and never
// draws for the shadow pass (`kwargs.get('shadow') is None` in the
// original).
import type { Color, DiagramNode } from "../model/elements.js";
import type { Font } from "./font-metrics.js";
import type { Box } from "./geometry.js";
import type { DiagramMetrics } from "./metrics.js";
import { nodeBox } from "./metrics.js";
import type { SvgDocument } from "./svg-document.js";

// Ported from `DiagramDraw.badgeFill`'s own default, `'pink'` - a bare
// CSS color name, passed straight through by the original's `rgb()`
// rather than resolved like a DSL color attribute. Expressed here as
// its equivalent RGB (this port's `Color` type has no bare-name case)
// - same treatment as `endpoint.ts`'s `'white'`.
const BADGE_FILL: Color = [255, 192, 203];

export function drawNumberBadge(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  font: Font,
  fontSize: number,
  node: DiagramNode,
): void {
  if (node.numbered === null) return;

  const cell = nodeBox(metrics, node);
  const r = Math.floor((metrics.cellSize * 3) / 2);
  const box: Box = { x1: cell.x1 - r, y1: cell.y1 - r, x2: cell.x1 + r, y2: cell.y1 + r };

  doc.ellipse(box, { fill: BADGE_FILL, outline: node.linecolor });
  doc.textarea(box, node.numbered, font, fontSize, { fill: node.textcolor });
}
