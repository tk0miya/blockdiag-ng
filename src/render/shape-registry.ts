// A node shape's own render/connectors/textbox, ported from
// `noderenderer.get(shape)`'s registry (vendor/blockdiag/src/blockdiag/
// noderenderer/__init__.py) plus each shape's own `NodeShape` subclass
// (base.py), which bundles `render_shape`, `self.connectors`, and
// `self.textbox` together in one class rather than three separate
// dispatch tables. `getConnectors`/`getTextBox` are named as functions
// (unlike the original's plain `self.connectors`/`self.textbox`
// instance attributes) since they compute their result from `metrics`/
// `node` on every call rather than caching it once in a constructor.
// They're required fields (not optional) so a shape must say explicitly
// whether it customizes them or falls back to the plain box default
// (`null`) - added once connectors.ts/icon.ts exist, in later steps.
// Only `box` (this step's one shape) is registered so far.
//
// Unlike the original, which resolves shapes at runtime via
// `pkg_resources.iter_entry_points('blockdiag_noderenderer')` (letting a
// separately-installed package register its own shapes), this only
// supports statically-registered shapes for now - dynamic loading of
// third-party shape packages is deferred to a later step. Bundling
// `render`/`getConnectors`/`getTextBox` in one `NodeShape` value, rather
// than three separate per-concern dispatch tables, is what makes that
// future step possible without reshaping this interface again: a
// third-party package will just export a `NodeShape` value for a loader
// to register, the same way a built-in shape module does.
import type { DiagramNode } from "../model/elements.js";
import type { Font } from "./font-metrics.js";
import type { Box, Point } from "./geometry.js";
import type { DiagramMetrics } from "./metrics.js";
import type { SvgDocument } from "./svg-document.js";

export interface Connectors {
  readonly top: Point;
  readonly right: Point;
  readonly bottom: Point;
  readonly left: Point;
}

export type NodeRenderer = (
  doc: SvgDocument,
  metrics: DiagramMetrics,
  font: Font,
  fontSize: number,
  node: DiagramNode,
) => void;

export type ConnectorsGetter = (metrics: DiagramMetrics, node: DiagramNode, font: Font, fontSize: number) => Connectors;

export type TextBoxGetter = (metrics: DiagramMetrics, node: DiagramNode, font: Font, fontSize: number) => Box;

export interface NodeShape {
  readonly render: NodeRenderer;
  readonly getConnectors: ConnectorsGetter | null;
  readonly getTextBox: TextBoxGetter | null;
}

const registry = new Map<string, NodeShape>();

export function registerShape(name: string, shape: NodeShape): void {
  registry.set(name, shape);
}

// Unlike the original, which would fail obscurely (`None` is not
// callable) for a shape it doesn't recognize, this names the shape so
// the gap is obvious while it's still a port-in-progress limitation
// rather than a genuinely unknown shape.
function shapeFor(name: string): NodeShape {
  const shape = registry.get(name);
  if (shape === undefined) {
    throw new Error(`node shape not yet supported: ${name}`);
  }
  return shape;
}

export function rendererFor(name: string): NodeRenderer {
  return shapeFor(name).render;
}
