// Ported from `noderenderer/beginpoint.py`: a small, fixed-size filled
// dot, with its label to the right (left-aligned), same layout as
// `minidiamond`. Its fill swaps to the line color when the node's own
// color is still the default (white) - so it renders as a solid dot
// without the user having to set a color explicitly - but respects an
// actually customized color otherwise. Ported as a literal comparison
// against white (`Element.basecolor`'s own default) rather than
// tracking the diagram's actual configured default node color
// (`default_node_color`, builder/diagram-attributes.ts) at render time
// - the original's own comparison is genuinely dynamic (it compares
// against `DiagramNode.basecolor`, mutated by that attribute for every
// node globally), so this diverges if that attribute and this shape
// are both used together; deferred rather than threading that value
// through for a narrow interaction. Shadow branch deferred to Step 17,
// same as box.ts (this shape has no background-image branch to begin
// with).
import type { DiagramNode } from "../../model/elements.js";
import type { Font } from "../font-metrics.js";
import type { Box } from "../geometry.js";
import { boxCenter, boxRight, boxTop } from "../geometry.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { SvgDocument } from "../svg-document.js";

const WHITE = [255, 255, 255] as const;

export function renderBeginpointNode(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  font: Font,
  fontSize: number,
  node: DiagramNode,
): void {
  const nodeCell = nodeBox(metrics, node);
  const center = boxCenter(nodeCell);
  const r = metrics.cellSize;
  const box: Box = { x1: center.x - r, y1: center.y - r, x2: center.x + r, y2: center.y + r };

  const isDefaultColor = node.color[0] === WHITE[0] && node.color[1] === WHITE[1] && node.color[2] === WHITE[2];
  const fill = isDefaultColor ? node.linecolor : node.color;

  doc.ellipse(box, { fill, outline: node.linecolor, style: node.style });

  if (node.label !== null) {
    const boxTopPoint = boxTop(nodeCell);
    const boxRightPoint = boxRight(nodeCell);
    const textBox: Box = { x1: boxTopPoint.x, y1: boxTopPoint.y, x2: boxRightPoint.x, y2: boxRightPoint.y };
    doc.textarea(textBox, node.label, font, fontSize, { fill: node.textcolor, halign: "left" });
  }
}
