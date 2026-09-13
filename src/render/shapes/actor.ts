// Ported from `noderenderer/actor.py`: a stick-figure body (a single
// polygon) topped with a round head (an ellipse), sized from whichever
// of the node's own box dimensions is smaller - shrinking to leave room
// for the label's own measured height when there is one. A falsy label
// (`null` or `""`) skips that measurement, unlike every other shape
// here (whose base `render_label` tolerates `""` fine, via
// text-folder.ts's empty-paragraph handling) - ported as its own
// truthiness check to match the original's `if node.label:` exactly,
// since here it also affects the figure's own geometry, not just
// whether text renders. Plus its shadow branch - body and head are
// each shifted independently (this shape has no background-image
// branch to begin with).
import type { DiagramNode } from "../../model/elements.js";
import type { Font } from "../font-metrics.js";
import { measureTextHeight, measureTextWidth } from "../font-metrics.js";
import type { Box, Point } from "../geometry.js";
import { boxCenter, boxHeight, boxLeft, boxRight, boxWidth } from "../geometry.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { RenderMode } from "../render-mode.js";
import { SHADOW_COLOR, shiftShadowBox, shiftShadowPoints } from "../shadow.js";
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

export function renderActorNode(doc: SvgDocument, metrics: DiagramMetrics, node: DiagramNode, mode: RenderMode): void {
  const box = nodeBox(metrics, node);
  const hasLabel = node.label !== null && node.label !== "";
  const textHeight = hasLabel ? labelHeight(mode.font, node.label as string, mode.fontSize) : 0;
  const shortside = hasLabel
    ? Math.min(boxWidth(box), boxHeight(box) - textHeight)
    : Math.min(boxWidth(box), boxHeight(box));
  const radius = Math.floor(shortside / 8);
  const center = boxCenter(box);

  const body = bodyPart(center, radius);
  const head = headPart(center, radius);

  if (mode.kind === "shadow") {
    // The body's shadow has no outline at all (the original omits that
    // kwarg entirely); the head's shadow keeps the node's own
    // `linecolor` as its outline instead of the shadow color - both
    // ported exactly as the original's two shadow branches differ.
    doc.polygon(shiftShadowPoints(body), { fill: SHADOW_COLOR, filter: mode.filter });
    doc.ellipse(shiftShadowBox(head), { fill: SHADOW_COLOR, outline: node.linecolor, filter: mode.filter });
    return;
  }

  doc.polygon(body, { fill: node.color, outline: node.linecolor, style: node.style });
  doc.ellipse(head, { fill: node.color, outline: node.linecolor, style: node.style });

  if (node.label !== null) {
    const textBox: Box = {
      x1: boxLeft(box).x,
      y1: center.y + radius * 4,
      x2: boxRight(box).x,
      y2: center.y + radius * 4 + textHeight,
    };
    doc.textarea(textBox, node.label, mode.font, mode.fontSize, { fill: node.textcolor, halign: "center" });
  }
}
