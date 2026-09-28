// Ported from `NodeShape.__init__`'s icon sizing plus `render_icon()`
// (vendor/blockdiag/src/blockdiag/noderenderer/base.py): every shape's
// `icon` is sized and positioned identically (fit within half the
// diagram-wide node width and the full node height, preserving aspect
// ratio; flush against the node's own top-left corner, vertically
// centered) and drawn the same way regardless of shape - so, like the
// number badge (number-badge.ts), it's wired up once here rather than
// per shape. Only the shape's own label textbox narrows to leave room
// for it, and only for the shapes that don't already override their own
// textbox unconditionally (box/roundedbox/textbox/note - see each
// one's own file).
import type { DiagramNode } from "../model/elements.js";
import type { Box } from "./geometry.js";
import { boxTopLeft } from "./geometry.js";
import { calcImageSize, getImageSize } from "./images.js";
import type { DiagramMetrics } from "./metrics.js";
import { nodeBox } from "./metrics.js";
import type { SvgDocument } from "./svg-document.js";

// `icon` is `node.icon`, narrowed to non-null by the caller - every
// caller already only reaches this once it's checked that itself.
export function iconBox(metrics: DiagramMetrics, node: DiagramNode, icon: string): Box {
  const topLeft = boxTopLeft(nodeBox(metrics, node));
  const bounded = { width: Math.floor(metrics.nodeWidth / 2), height: metrics.nodeHeight };
  const size = calcImageSize(getImageSize(icon), bounded);
  const vmargin = Math.floor((metrics.nodeHeight - size.height) / 2);

  return {
    x1: topLeft.x,
    y1: topLeft.y + vmargin,
    x2: topLeft.x + size.width,
    y2: topLeft.y + vmargin + size.height,
  };
}

// Ported from `render_icon()`. Never called during the shadow pass -
// draw-diagram.ts only calls this from its normal-mode node loop,
// matching the original's own `kwargs.get('shadow') is not True` guard.
export function drawIcon(doc: SvgDocument, metrics: DiagramMetrics, node: DiagramNode): void {
  if (node.icon === null) return;
  doc.image(iconBox(metrics, node, node.icon), node.icon);
}

// Ported from base's `__init__`: when `node.icon` is set, a shape's own
// label sits to the right of the icon rather than filling the whole box
// - flush against the icon's own right edge, spanning the box's full
// height. Only called by the shapes that don't already override their
// own textbox unconditionally (box/roundedbox/textbox/note - every
// other shape ignores this, matching the original).
export function textBoxFor(metrics: DiagramMetrics, node: DiagramNode, box: Box): Box {
  if (node.icon === null) return box;
  return { x1: iconBox(metrics, node, node.icon).x2, y1: box.y1, x2: box.x2, y2: box.y2 };
}
