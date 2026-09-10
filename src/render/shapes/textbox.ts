// Ported from `noderenderer/textbox.py`: a label with no border or
// fill of its own - and so no shadow silhouette either. The
// constructor's own `background`-driven textbox reflow (shrinking it to
// the image's own size, scaled down to fit, and centering it within
// whatever the base class already narrowed for `icon`) is folded into
// `textBoxWithBackground()` below, since this port computes it fresh on
// each render call rather than once in a constructor - it takes the
// already icon-narrowed box (rather than narrowing it itself), so a
// caller that also needs that intermediate box for something else (as
// connectors.ts's `textboxConnectors()` does) computes it only once.
// Exported for that same reason. The connector repositioning that
// follows this in the original is ported separately in connectors.ts's
// `textboxConnectors()` (connectors aren't consumed by this shape's own
// rendering) - including a fix for a real bug there (an `icon` with no
// `background` crashes with a NameError in the original, since the
// connector code that handles `icon` references a variable only bound
// inside the `background` branch above it; see that function's own
// comment).
import type { DiagramNode } from "../../model/elements.js";
import type { Box } from "../geometry.js";
import { boxCenter, boxHeight, boxWidth } from "../geometry.js";
import { textBoxFor } from "../icon.js";
import { calcImageSize, getImageSize } from "../images.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { RenderMode } from "../render-mode.js";
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
  mode: RenderMode,
): void {
  if (mode.kind === "shadow") return;

  const iconAware = textBoxFor(metrics, node, nodeBox(metrics, node));
  const textBox = textBoxWithBackground(node, iconAware);

  if (node.background !== null) {
    doc.image(textBox, node.background);
  }

  if (node.label !== null) {
    doc.textarea(textBox, node.label, mode.font, mode.fontSize, {
      fill: node.textcolor,
      halign: "center",
    });
  }
}
