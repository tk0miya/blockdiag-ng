// Shared shadow-rendering constants/helpers, used by every shape in
// `src/render/shapes/`. Ported from `NodeShape.shift_shadow()` (a fixed
// offset applied to whatever's about to be drawn) and
// `DiagramDraw.shadow_colors` (vendor/blockdiag/src/blockdiag/drawer.py)
// - `'SVG'` isn't in that lookup, so it falls through to the
// `defaultdict`'s own default, black; only PNG/PDF get a different
// (lighter) shadow color, neither of which this port targets.
import type { Color } from "../model/elements.js";
import type { Box, Point } from "./geometry.js";
import { shiftBox, shiftPoint } from "./geometry.js";

// Ported from `metrics.py`'s `shadow_offset = XY(3, 6)`.
const SHADOW_OFFSET_X = 3;
const SHADOW_OFFSET_Y = 6;

export const SHADOW_COLOR: Color = [0, 0, 0];

export function shiftShadowBox(box: Box): Box {
  return shiftBox(box, SHADOW_OFFSET_X, SHADOW_OFFSET_Y);
}

export function shiftShadowPoint(point: Point): Point {
  return shiftPoint(point, SHADOW_OFFSET_X, SHADOW_OFFSET_Y);
}

export function shiftShadowPoints(points: readonly Point[]): Point[] {
  return points.map(shiftShadowPoint);
}

// Ported from `svg.py`'s module-level `style()`, as seen through the
// shadow pass specifically: a `shadow_style` of `"blur"` softens the
// shadow's edge; `"solid"` (the only other value that reaches here -
// `"none"` skips the shadow pass entirely, in draw-diagram.ts) draws a
// flat silhouette instead.
export function shadowFilter(shadowStyle: "blur" | "solid"): "transp-blur" | undefined {
  return shadowStyle === "blur" ? "transp-blur" : undefined;
}
