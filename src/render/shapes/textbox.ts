// Ported from `noderenderer/textbox.py`: a label with no border or
// fill of its own - and so no shadow silhouette either. The
// constructor's own `background`-driven textbox reflow (shrinking it to
// the image's own size, scaled down to fit, and centering it within
// whatever the base class already narrowed for `icon`) is folded into
// `textBoxWithBackground()` below, since this port computes it fresh on
// each render call rather than once in a constructor. The connector
// repositioning that follows it in the original is deferred along with
// `connectors` themselves - including a real bug there (an `icon` with
// no `background` crashes with a NameError, since the connector code
// that handles `icon` references a variable only bound inside the
// `background` branch above it) that isn't reachable yet without
// `connectors` to trigger it, so it's left for whichever later step
// adds them.
import type { DiagramNode } from "../../model/elements.js";
import type { Font } from "../font-metrics.js";
import type { Box } from "../geometry.js";
import { boxCenter, boxHeight, boxWidth } from "../geometry.js";
import { textBoxFor } from "../icon.js";
import { calcImageSize, getImageSize } from "../images.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { RenderMode } from "../render-mode.js";
import type { NodeShape } from "../shape-registry.js";
import type { SvgDocument } from "../svg-document.js";

function textBoxWithBackground(metrics: DiagramMetrics, node: DiagramNode, box: Box): Box {
  const iconAware = textBoxFor(metrics, node, box);
  if (node.background === null) {
    return iconAware;
  }

  const size = calcImageSize(getImageSize(node.background), {
    width: boxWidth(iconAware),
    height: boxHeight(iconAware),
  });
  const center = boxCenter(iconAware);
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

  const textBox = textBoxWithBackground(metrics, node, nodeBox(metrics, node));

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

// `getConnectors` is still `null` - textbox's own connectors do differ
// from the plain box default once a `background` image or `icon` is
// set, but that override itself is added once connectors.ts exists
// (Step 18a). `getTextBox` reuses `textBoxWithBackground()` - the same
// resize-to-the-image math `renderTextboxNode()` itself uses - rather
// than just the icon-narrowing `textBoxFor()` that every other shape's
// getTextBox uses, since textbox is the one shape whose own textbox
// also reflows around a `background` image.
export const textboxShape: NodeShape = {
  render: renderTextboxNode,
  getConnectors: null,
  getTextBox: (metrics, node) => textBoxWithBackground(metrics, node, nodeBox(metrics, node)),
};
