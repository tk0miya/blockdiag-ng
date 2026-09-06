// Diagram domain model.
//
// Mirrors the class hierarchy of the original Python implementation
// (vendor/blockdiag/src/blockdiag/elements.py): Base -> Element ->
// DiagramNode / NodeGroup, Base -> DiagramEdge, and NodeGroup -> Diagram
// (Diagram extends NodeGroup there, as the root container). Rather than
// mirror that inheritance directly, DiagramNode/NodeGroup/Diagram are a
// tagged union here (discriminated by `kind`), so code that needs to
// single out "is this actually the root diagram" or "is this a node or a
// group" can narrow on `kind` instead of an `instanceof`-style check.
// This module defines the shape of the data only; attribute
// parsing/validation and defaults are built on top of these types in
// later steps.

export interface XY {
  readonly x: number;
  readonly y: number;
}

export type RGB = readonly [red: number, green: number, blue: number];

// `color_to_rgb` in the original implementation leaves the literal value
// "none" (meaning "no fill/no line") unconverted instead of resolving it
// to RGB.
export type Color = RGB | "none";

export type LineStyle =
  | { readonly type: "none" }
  | { readonly type: "solid" }
  | { readonly type: "dotted" }
  | { readonly type: "dashed" }
  // A custom dash pattern (e.g. a "style = 8,2" attribute): `pattern`
  // holds the raw dash lengths as given, unscaled - the original
  // multiplies each by the line's thickness only at render time
  // (imagedraw/{png,svg,pdf}.py), independently in each backend, so this
  // keeps that scaling a rendering concern rather than baking it in here.
  | { readonly type: "custom"; readonly pattern: readonly number[] };

export type LabelOrientation = "horizontal" | "vertical";

export type GroupShape = "box" | "line";

export type GroupOrientation = "landscape" | "portrait";

export type EdgeDirection = "forward" | "back" | "both" | "none";

export type EdgeHeadStyle =
  | "generalization"
  | "composition"
  | "aggregation"
  | "oneone"
  | "onemany"
  | "manyone"
  | "manymany";

export type ShadowStyle = "solid" | "blur" | "none";

export type EdgeLayout = "normal" | "flowchart";

export interface DiagramNode {
  readonly kind: "node";
  readonly id: string;
  // Defaults to the element's id, but can become null: a bare "label"
  // attribute with no value (e.g. "A [label];") assigns it directly.
  label: string | null;
  xy: XY;
  colwidth: number;
  colheight: number;
  width: number | null;
  height: number | null;
  color: Color;
  textcolor: Color;
  linecolor: Color;
  fontfamily: string | null;
  fontsize: number | null;
  style: LineStyle | null;
  shape: string;
  numbered: string | null;
  icon: string | null;
  background: string | null;
  description: string | null;
  rotate: number;
  href: string | null;
  stacked: boolean;
  labelOrientation: LabelOrientation;
  order: number;
  group: AnyGroup | null;
}

// Fields shared by NodeGroup and Diagram (an ordinary group and the
// root diagram are both a positioned, sized container of nodes/edges) -
// not exported, since nothing outside this module needs to talk about
// "either of those, minus their own kind tag".
interface GroupFields {
  readonly id: string;
  // Can become null: a bare "label" attribute with no value (e.g.
  // "group A [label];") assigns it directly.
  label: string | null;
  xy: XY;
  colwidth: number;
  colheight: number;
  width: number | null;
  height: number | null;
  color: Color;
  textcolor: Color;
  fontfamily: string | null;
  fontsize: number | null;
  style: LineStyle | null;
  level: number;
  separated: boolean;
  shape: GroupShape;
  thick: number;
  nodes: (DiagramNode | NodeGroup)[];
  edges: DiagramEdge[];
  icon: string | null;
  orientation: GroupOrientation;
  href: string | null;
  order: number;
  stacked: boolean;
  group: AnyGroup | null;
}

export interface NodeGroup extends GroupFields {
  readonly kind: "group";
}

// Either an ordinary group or the root diagram - the type of a node's or
// group's `group` (enclosing-container) field, and of anything that
// walks "up" the containment tree without caring whether it stops at an
// ordinary group or reaches the root.
export type AnyGroup = NodeGroup | Diagram;

export interface DiagramEdge {
  node1: DiagramNode;
  node2: DiagramNode;
  crosspoints: XY[];
  skipped: number;
  label: string | null;
  description: string | null;
  dir: EdgeDirection;
  color: Color;
  textcolor: Color;
  fontfamily: string | null;
  fontsize: number | null;
  style: LineStyle | null;
  hstyle: EdgeHeadStyle | null;
  folded: boolean | null;
  thick: number | null;
}

// The single root container of a diagram: always at level 0, its own
// `group` is always null, and - unlike an ordinary NodeGroup - it's never
// itself an entry in some other container's `nodes`.
export interface Diagram extends GroupFields {
  readonly kind: "diagram";
  shadowStyle: ShadowStyle;
  linecolor: Color;
  nodeWidth: number | null;
  nodeHeight: number | null;
  spanWidth: number | null;
  spanHeight: number | null;
  pagePadding: number | null;
  edgeLayout: EdgeLayout | null;
}
