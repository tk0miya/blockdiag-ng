// Ported from `NodeShape.__init__`'s default `self.connectors = [m.top,
// m.right, m.bottom, m.left]` plus the base class's `right`/`bottom`
// properties (vendor/blockdiag/src/blockdiag/noderenderer/base.py).
// Each shape's own override (circle.py/square.py/diamond.py/
// minidiamond.py/actor.py/beginpoint.py/endpoint.py/none.py/textbox.py)
// now lives in that shape's own file (`getConnectors` on its
// `NodeShape`, resolved via shape-registry.ts's `connectorsGetterFor()`)
// rather than a per-shape dispatch table here, matching the same
// render/connectors/textbox-bundled-per-shape design as `NodeShape`
// itself. This file keeps only what's shape-independent: the plain box
// default every shape without its own override falls back to (`null` in
// its `getConnectors`), and the `stacked` cellsize extension applied
// uniformly afterward regardless of which shape produced the base
// connectors - the original does the latter as a base-class property
// read on top of every shape's own override, not something each shape
// computes for itself.
import type { DiagramNode } from "../model/elements.js";
import type { Font } from "./font-metrics.js";
import { boxBottom, boxLeft, boxRight, boxTop } from "./geometry.js";
import type { DiagramMetrics } from "./metrics.js";
import { nodeBox } from "./metrics.js";
import type { Connectors } from "./shape-registry.js";
import { connectorsGetterFor } from "./shape-registry.js";

export type { Connectors } from "./shape-registry.js";

export function defaultConnectors(metrics: DiagramMetrics, node: DiagramNode): Connectors {
  const box = nodeBox(metrics, node);
  return { top: boxTop(box), right: boxRight(box), bottom: boxBottom(box), left: boxLeft(box) };
}

export function nodeConnectors(metrics: DiagramMetrics, node: DiagramNode, font: Font, fontSize: number): Connectors {
  const getConnectors = connectorsGetterFor(node.shape) ?? defaultConnectors;
  const connectors = getConnectors(metrics, node, font, fontSize);

  if (!node.stacked) return connectors;
  return {
    ...connectors,
    right: { x: connectors.right.x + metrics.cellSize, y: connectors.right.y },
    bottom: { x: connectors.bottom.x, y: connectors.bottom.y + metrics.cellSize },
  };
}
