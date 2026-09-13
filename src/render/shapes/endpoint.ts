// Ported from `noderenderer/endpoint.py`: a small ring - a white outer
// circle plus a smaller inner dot, whose fill swaps to the line color
// when the node's own color is still the default (see beginpoint.ts's
// comment on this same swap, and its own documented divergence from
// tracking the diagram's actual default node color). Label to the
// right (left-aligned), same layout as `beginpoint`/`minidiamond`.
// Shadow branch deferred to Step 17, same as box.ts (this shape has no
// background-image branch to begin with).
import type { DiagramNode } from "../../model/elements.js";
import type { Font } from "../font-metrics.js";
import type { Box } from "../geometry.js";
import { boxCenter, boxRight, boxTop } from "../geometry.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { SvgDocument } from "../svg-document.js";

const WHITE = [255, 255, 255] as const;

export function renderEndpointNode(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  font: Font,
  fontSize: number,
  node: DiagramNode,
): void {
  const nodeCell = nodeBox(metrics, node);
  const center = boxCenter(nodeCell);
  const r = metrics.cellSize;

  const outerBox: Box = { x1: center.x - r, y1: center.y - r, x2: center.x + r, y2: center.y + r };
  doc.ellipse(outerBox, { fill: WHITE, outline: node.linecolor, style: node.style });

  const innerR = r / 2;
  const innerBox: Box = { x1: center.x - innerR, y1: center.y - innerR, x2: center.x + innerR, y2: center.y + innerR };
  const isDefaultColor = node.color[0] === WHITE[0] && node.color[1] === WHITE[1] && node.color[2] === WHITE[2];
  const fill = isDefaultColor ? node.linecolor : node.color;
  doc.ellipse(innerBox, { fill, outline: node.linecolor, style: node.style });

  if (node.label !== null) {
    const boxTopPoint = boxTop(nodeCell);
    const boxRightPoint = boxRight(nodeCell);
    const textBox: Box = { x1: boxTopPoint.x, y1: boxTopPoint.y, x2: boxRightPoint.x, y2: boxRightPoint.y };
    doc.textarea(textBox, node.label, font, fontSize, { fill: node.textcolor, halign: "left" });
  }
}
