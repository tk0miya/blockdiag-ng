// Ported from `noderenderer/actor.py`: a stick-figure body (a single
// polygon) topped with a round head (an ellipse), sized from whichever
// of the node's own box dimensions is smaller - shrinking to leave room
// for the label's own measured height when there is one. A falsy label
// (`null` or `""`) skips that measurement, unlike every other shape
// here (whose base `render_label` tolerates `""` fine, via
// text-folder.ts's empty-paragraph handling) - ported as its own
// truthiness check to match the original's `if node.label:` exactly,
// since here it also affects the figure's own geometry, not just
// whether text renders. Shadow branch deferred to Step 17, same as
// box.ts (this shape has no background-image branch to begin with).
import type { DiagramNode } from "../../model/elements.js";
import type { Font } from "../font-metrics.js";
import { measureTextHeight, measureTextWidth } from "../font-metrics.js";
import type { Box, Point } from "../geometry.js";
import { boxCenter, boxHeight, boxLeft, boxRight, boxWidth } from "../geometry.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { SvgDocument } from "../svg-document.js";
import { foldText } from "../text-folder.js";

// Ported from `ImageDraw.textsize()` (imagedraw/base.py): folds a label
// into an effectively unbounded box and measures the resulting outline
// box - this is a *padded* size (the fold's own default 8px padding and
// 2px line spacing baked in around the glyphs), not the raw glyph
// measurement `measureTextHeight()` alone gives. Only `actor` needs
// this - everywhere else measures a label against its own real,
// already-bounded textbox instead of pre-measuring it in isolation.
function labelHeight(font: Font, label: string, fontSize: number): number {
  const measure = (text: string) => ({
    width: measureTextWidth(font, text, fontSize),
    height: measureTextHeight(font, text, fontSize),
  });
  const unbounded: Box = { x1: 0, y1: 0, x2: 65535, y2: 65535 };
  return boxHeight(foldText(unbounded, label, measure).outlineBox);
}

function headPart(center: Point, radius: number): Box {
  const r = Math.floor((radius * 3) / 2);
  const pt: Point = { x: center.x, y: center.y - radius * 3 };
  return { x1: pt.x - r, y1: pt.y - r, x2: pt.x + r, y2: pt.y + r };
}

// Ported from `body_part()`: 17 points tracing a stick figure (neck,
// arms, torso, legs), symmetric around `bodyC`.
function bodyPart(bodyC: Point, radius: number): Point[] {
  const r = radius;
  const neckWidth = Math.floor((r * 2) / 3);
  const arm = r * 4;
  const armWidth = r;
  const bodyWidth = Math.floor((r * 2) / 3);
  const bodyHeight = r;
  const legXout = Math.floor((r * 7) / 2);
  const legYout = bodyHeight + r * 3;
  const legXin = r * 2;
  const legYin = bodyHeight + r * 3;

  return [
    { x: bodyC.x + neckWidth, y: bodyC.y - r * 2 },
    { x: bodyC.x + neckWidth, y: bodyC.y - armWidth },
    { x: bodyC.x + arm, y: bodyC.y - armWidth },
    { x: bodyC.x + arm, y: bodyC.y },
    { x: bodyC.x + bodyWidth, y: bodyC.y },
    { x: bodyC.x + bodyWidth, y: bodyC.y + bodyHeight },
    { x: bodyC.x + legXout, y: bodyC.y + legYout },
    { x: bodyC.x + legXin, y: bodyC.y + legYin },
    { x: bodyC.x, y: bodyC.y + bodyHeight * 2 },
    { x: bodyC.x - legXin, y: bodyC.y + legYin },
    { x: bodyC.x - legXout, y: bodyC.y + legYout },
    { x: bodyC.x - bodyWidth, y: bodyC.y + bodyHeight },
    { x: bodyC.x - bodyWidth, y: bodyC.y },
    { x: bodyC.x - arm, y: bodyC.y },
    { x: bodyC.x - arm, y: bodyC.y - armWidth },
    { x: bodyC.x - neckWidth, y: bodyC.y - armWidth },
    { x: bodyC.x - neckWidth, y: bodyC.y - r * 2 },
  ];
}

export function renderActorNode(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  font: Font,
  fontSize: number,
  node: DiagramNode,
): void {
  const box = nodeBox(metrics, node);
  const hasLabel = node.label !== null && node.label !== "";
  const textHeight = hasLabel ? labelHeight(font, node.label as string, fontSize) : 0;
  const shortside = hasLabel
    ? Math.min(boxWidth(box), boxHeight(box) - textHeight)
    : Math.min(boxWidth(box), boxHeight(box));
  const radius = Math.floor(shortside / 8);
  const center = boxCenter(box);

  doc.polygon(bodyPart(center, radius), { fill: node.color, outline: node.linecolor, style: node.style });
  doc.ellipse(headPart(center, radius), { fill: node.color, outline: node.linecolor, style: node.style });

  if (node.label !== null) {
    const textBox: Box = {
      x1: boxLeft(box).x,
      y1: center.y + radius * 4,
      x2: boxRight(box).x,
      y2: center.y + radius * 4 + textHeight,
    };
    doc.textarea(textBox, node.label, font, fontSize, { fill: node.textcolor, halign: "center" });
  }
}
