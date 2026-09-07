// Ported from `noderenderer/none.py`: an invisible node - no shape, no
// label. (Its connector-point override doesn't matter yet - edges
// aren't ported until Step 18.)
import type { DiagramNode } from "../../model/elements.js";
import type { Font } from "../font-metrics.js";
import type { DiagramMetrics } from "../metrics.js";
import type { SvgDocument } from "../svg-document.js";

export function renderNoneNode(
  _doc: SvgDocument,
  _metrics: DiagramMetrics,
  _font: Font,
  _fontSize: number,
  _node: DiagramNode,
): void {}
