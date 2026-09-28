// Ported from `noderenderer/none.py`: an invisible node - no shape, no
// label, no shadow either (`render_shape` is a no-op regardless of the
// `shadow` kwarg). Its own connector-point override (getConnectors,
// below) isn't consumed by its own rendering - connectors are for edges
// attaching to this node, independent of how (or whether) it draws
// itself.
import type { DiagramNode } from "../../model/elements.js";
import type { Font } from "../font-metrics.js";
import { boxCenter } from "../geometry.js";
import type { DiagramMetrics } from "../metrics.js";
import { nodeBox } from "../metrics.js";
import type { RenderMode } from "../render-mode.js";
import type { Connectors, NodeShape } from "../shape-registry.js";
import type { SvgDocument } from "../svg-document.js";

export function renderNoneNode(
  _doc: SvgDocument,
  _metrics: DiagramMetrics,
  _node: DiagramNode,
  _font: Font,
  _fontSize: number,
  _mode: RenderMode,
): void {}

// Ported from `none.py`: all four connectors collapse onto the node's
// own center point (this shape draws nothing at all - renderNoneNode()
// above).
function noneConnectors(metrics: DiagramMetrics, node: DiagramNode): Connectors {
  const center = boxCenter(nodeBox(metrics, node));
  return { top: center, right: center, bottom: center, left: center };
}

// `getTextBox` is `null` - none never renders a label (renderNoneNode()
// is a no-op), so there's nothing for a textbox to describe.
export const noneShape: NodeShape = { render: renderNoneNode, getConnectors: noneConnectors, getTextBox: null };
