// Ported from `NodeShape.__init__`'s default `self.connectors = [m.top,
// m.right, m.bottom, m.left]` plus each shape's own override
// (vendor/blockdiag/src/blockdiag/noderenderer/{base,circle,square,
// diamond,minidiamond,actor,beginpoint,endpoint,none,textbox}.py) and
// the base class's `right`/`bottom` properties. These are the four
// points an edge attaches to on a node - independent of how the node is
// actually drawn (see each shape's own render*Node in ./shapes/*.ts for
// that) - so this is a separate dispatch keyed by `node.shape`, not
// threaded through `NodeRenderer` (draw-diagram.ts).
//
// Every shape not listed here (box/roundedbox/note/mail/cloud/dots/
// ellipse/flowchart.*, confirmed by grepping every noderenderer/*.py for
// `self.connectors`) inherits the plain box default - even shapes whose
// own outline sits inside that box (`ellipse`), matching the original.
//
// `right`/`bottom` extend by a further `cellsize` for a `stacked` node,
// reaching past the visible edge of its duplicate layers (see
// draw-diagram.ts's `renderNode()`) rather than the front card alone -
// the original does this as a base-class property read on top of every
// shape's own override, not something each shape computes for itself,
// so it's applied uniformly here after the per-shape dispatch below
// rather than inside each case.
import type { DiagramNode } from "../model/elements.js";
import type { Font } from "./font-metrics.js";
import type { Point } from "./geometry.js";
import { boxBottom, boxCenter, boxLeft, boxRight, boxTop } from "./geometry.js";
import { textBoxFor } from "./icon.js";
import type { DiagramMetrics } from "./metrics.js";
import { nodeBox } from "./metrics.js";
import { actorGeometry } from "./shapes/actor.js";
import { textBoxWithBackground } from "./shapes/textbox.js";

export interface Connectors {
  readonly top: Point;
  readonly right: Point;
  readonly bottom: Point;
  readonly left: Point;
}

type ConnectorsFn = (metrics: DiagramMetrics, node: DiagramNode, font: Font, fontSize: number) => Connectors;

function defaultConnectors(metrics: DiagramMetrics, node: DiagramNode): Connectors {
  const box = nodeBox(metrics, node);
  return { top: boxTop(box), right: boxRight(box), bottom: boxBottom(box), left: boxLeft(box) };
}

// Ported from `circle.py`/`square.py`: both describe a circle/square
// enclosing the node's own box, differing only in how `r` grows -
// `circle` from the box's own (possibly custom) width/height, `square`
// always from the diagram-wide default size (see square.ts's own
// comment on this). Connectors sit at that circle/square's own
// top/right/bottom/left, same as its drawn outline.
function circleConnectors(metrics: DiagramMetrics, node: DiagramNode): Connectors {
  const box = nodeBox(metrics, node);
  const r = Math.floor(Math.min(box.x2 - box.x1, box.y2 - box.y1) / 2) + Math.floor(metrics.cellSize / 2);
  const center = boxCenter(box);
  return {
    top: { x: center.x, y: center.y - r },
    right: { x: center.x + r, y: center.y },
    bottom: { x: center.x, y: center.y + r },
    left: { x: center.x - r, y: center.y },
  };
}

function squareConnectors(metrics: DiagramMetrics, node: DiagramNode): Connectors {
  const r = Math.floor(Math.min(metrics.nodeWidth, metrics.nodeHeight) / 2) + Math.floor(metrics.cellSize / 2);
  const center = boxCenter(nodeBox(metrics, node));
  return {
    top: { x: center.x, y: center.y - r },
    right: { x: center.x + r, y: center.y },
    bottom: { x: center.x, y: center.y + r },
    left: { x: center.x - r, y: center.y },
  };
}

// Ported from `diamond.py`: the node's own box edge midpoints, each
// pushed further out by `cellsize` - matching the diamond's own drawn
// points (diamond.ts).
function diamondConnectors(metrics: DiagramMetrics, node: DiagramNode): Connectors {
  const box = nodeBox(metrics, node);
  const r = metrics.cellSize;
  const top = boxTop(box);
  const right = boxRight(box);
  const bottom = boxBottom(box);
  const left = boxLeft(box);
  return {
    top: { x: top.x, y: top.y - r },
    right: { x: right.x + r, y: right.y },
    bottom: { x: bottom.x, y: bottom.y + r },
    left: { x: left.x - r, y: left.y },
  };
}

// Ported from `minidiamond.py`/`beginpoint.py`/`endpoint.py`: all three
// are a fixed-size (radius `cellsize`) marker centered on the node -
// identically-shaped connectors despite their different visible
// rendering (a small diamond, a filled dot, and a ring, respectively -
// see minidiamond.ts/beginpoint.ts/endpoint.ts).
function fixedRadiusMarkerConnectors(metrics: DiagramMetrics, node: DiagramNode): Connectors {
  const r = metrics.cellSize;
  const center = boxCenter(nodeBox(metrics, node));
  return {
    top: { x: center.x, y: center.y - r },
    right: { x: center.x + r, y: center.y },
    bottom: { x: center.x, y: center.y + r },
    left: { x: center.x - r, y: center.y },
  };
}

// Ported from `none.py`: all four connectors collapse onto the node's
// own center point (this shape draws nothing at all - none.ts).
function noneConnectors(metrics: DiagramMetrics, node: DiagramNode): Connectors {
  const center = boxCenter(nodeBox(metrics, node));
  return { top: center, right: center, bottom: center, left: center };
}

// Ported from `actor.py`: identical geometry to the label-height-
// dependent radius/center `actor.ts` draws its stick figure from (see
// `actorGeometry()`, exported from there so this doesn't re-derive it).
function actorConnectors(metrics: DiagramMetrics, node: DiagramNode, font: Font, fontSize: number): Connectors {
  const { center, radius: r, textHeight } = actorGeometry(metrics, node, font, fontSize);
  return {
    top: { x: center.x, y: center.y - Math.floor((r * 9) / 2) },
    right: { x: center.x + r * 4, y: center.y },
    bottom: { x: center.x, y: center.y + r * 4 + textHeight },
    left: { x: center.x - r * 4, y: center.y },
  };
}

// Ported from `textbox.py`'s constructor. `pt` is the center of the
// label's own textbox (icon-narrowed, if `icon` is set) - the original
// only computes this inside the `if self.node.background:` branch, so
// `icon` without `background` crashes there with a `NameError` on the
// very next line (`self.connectors[3] = XY(self.iconbox[0], pt.y)`, a
// real bug in the original, previously deferred - see textbox.ts's own
// history). Computed unconditionally here instead, since it's needed by
// both branches and only ever depends on the box/icon, not on
// `background` itself. Reuses `textBoxWithBackground()` (textbox.ts)
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

const CONNECTORS_BY_SHAPE: Record<string, ConnectorsFn> = {
  circle: circleConnectors,
  square: squareConnectors,
  diamond: diamondConnectors,
  "flowchart.condition": diamondConnectors,
  minidiamond: fixedRadiusMarkerConnectors,
  actor: actorConnectors,
  beginpoint: fixedRadiusMarkerConnectors,
  endpoint: fixedRadiusMarkerConnectors,
  none: noneConnectors,
  textbox: textboxConnectors,
};

export function nodeConnectors(metrics: DiagramMetrics, node: DiagramNode, font: Font, fontSize: number): Connectors {
  const fn = CONNECTORS_BY_SHAPE[node.shape] ?? defaultConnectors;
  const connectors = fn(metrics, node, font, fontSize);

  if (!node.stacked) return connectors;
  return {
    ...connectors,
    right: { x: connectors.right.x + metrics.cellSize, y: connectors.right.y },
    bottom: { x: connectors.bottom.x, y: connectors.bottom.y + metrics.cellSize },
  };
}
