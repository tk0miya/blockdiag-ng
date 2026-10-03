// Ported from `noderenderer/textbox.py`: a label with no border or
// fill of its own - and so no shadow silhouette either. The
// constructor's own `background`-driven textbox reflow (shrinking it to
// the image's own size, scaled down to fit, and centering it within
// whatever the base class already narrowed for `icon`) is folded into
// `textBoxWithBackground()` below, since this port computes it fresh on
// each render call rather than once in a constructor - it takes the
// already icon-narrowed box (rather than narrowing it itself), so a
// caller that also needs that intermediate box for something else (as
// `textboxConnectors()` below does) computes it only once. Exported for
// that same reason. The connector repositioning that follows this in
// the original is ported separately in `textboxConnectors()` below
// (connectors aren't consumed by this shape's own rendering) - including
// a fix for a real bug there (an `icon` with no `background` crashes
// with a NameError in the original, since the connector code that
// handles `icon` references a variable only bound inside the
// `background` branch above it; see that function's own comment).
import type { DiagramNode } from "../../model/elements.js";
import { defaultConnectors } from "../connectors.js";
import type { Font } from "../font-metrics.js";
import type { Box } from "../geometry.js";
import { boxCenter, boxHeight, boxWidth } from "../geometry.js";
import { textBoxFor } from "../icon.js";
import { calcImageSize, getImageSize } from "../images.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { RenderMode } from "../render-mode.js";
import type { Connectors, NodeShape } from "../shape-registry.js";
import type { SvgDocument } from "../svg-document.js";

export function textBoxWithBackground(node: DiagramNode, iconAwareBox: Box): Box {
  if (node.background === null) {
    return iconAwareBox;
  }

  const size = calcImageSize(getImageSize(node.background), {
    width: boxWidth(iconAwareBox),
    height: boxHeight(iconAwareBox),
  });
  const center = boxCenter(iconAwareBox);
  const halfWidth = Math.floor(size.width / 2);
  const halfHeight = Math.floor(size.height / 2);
  return {
    x1: center.x - halfWidth,
    y1: center.y - halfHeight,
    x2: center.x + halfWidth,
    y2: center.y + halfHeight,
  };
}

export function renderTextboxNode(
  doc: SvgDocument,
  metrics: DiagramMetrics,
  node: DiagramNode,
  font: Font,
  fontSize: number,
  mode: RenderMode,
): void {
  if (mode.kind === "shadow") return;

  const iconAware = textBoxFor(metrics, node, nodeBox(metrics, node));
  const textBox = textBoxWithBackground(node, iconAware);

  if (node.background !== null) {
    doc.image(textBox, node.background);
  }

  if (node.label !== null) {
    doc.textarea(textBox, node.label, font, fontSize, {
      fill: node.textcolor,
      halign: "center",
    });
  }
}

// Ported from `textbox.py`'s constructor. `pt` is the center of the
// label's own textbox (icon-narrowed, if `icon` is set) - the original
// only computes this inside the `if self.node.background:` branch, so
// `icon` without `background` crashes there with a `NameError` on the
// very next line (`self.connectors[3] = XY(self.iconbox[0], pt.y)`, a
// real bug in the original). Computed unconditionally here instead,
// since it's needed by both branches and only ever depends on the
// box/icon, not on `background` itself. Reuses `textBoxWithBackground()`
// for the resize math rather than reimplementing it, and - since an
// icon always starts flush with the node's own box's left edge
// regardless of its own size (icon.ts's `iconBox()`) - the icon
// override's own x is just `box.x1`, not a second `iconBox()` call.
function textboxConnectors(metrics: DiagramMetrics, node: DiagramNode): Connectors {
  const box = nodeBox(metrics, node);
  const iconAware = textBoxFor(metrics, node, box);
  const pt = boxCenter(iconAware);
  let connectors = defaultConnectors(metrics, node);

  if (node.background !== null) {
    const resized = textBoxWithBackground(node, iconAware);
    connectors = {
      top: { x: pt.x, y: resized.y1 },
      right: { x: resized.x2, y: pt.y },
      bottom: { x: pt.x, y: resized.y2 },
      left: { x: resized.x1, y: pt.y },
    };
  }

  if (node.icon !== null) {
    connectors = { ...connectors, left: { x: box.x1, y: pt.y } };
  }

  return connectors;
}

// `getTextBox` reuses `textBoxWithBackground()` - the same
// resize-to-the-image math `renderTextboxNode()` itself uses - rather
// than just the icon-narrowing `textBoxFor()` that every other shape's
// getTextBox uses, since textbox is the one shape whose own textbox
// also reflows around a `background` image.
export const textboxShape: NodeShape = {
  render: renderTextboxNode,
  getConnectors: textboxConnectors,
  getTextBox: (metrics, node) => textBoxWithBackground(node, textBoxFor(metrics, node, nodeBox(metrics, node))),
};
