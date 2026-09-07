// Ported from `noderenderer/none.py`: an invisible node - no shape, no
// label, no shadow either (`render_shape` is a no-op regardless of the
// `shadow` kwarg). (Its connector-point override doesn't matter yet -
// edges aren't ported until Step 18.)
import type { DiagramNode } from "../../model/elements.js";
import type { DiagramMetrics } from "../metrics.js";
import type { RenderMode } from "../render-mode.js";
import type { SvgDocument } from "../svg-document.js";

export function renderNoneNode(
  _doc: SvgDocument,
  _metrics: DiagramMetrics,
  _node: DiagramNode,
  _mode: RenderMode,
): void {}
