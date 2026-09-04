// Diagram domain model.
//
// Mirrors the class hierarchy of the original Python implementation
// (vendor/blockdiag/src/blockdiag/elements.py): Base -> Element ->
// DiagramNode / NodeGroup, Base -> DiagramEdge, and NodeGroup -> Diagram
// (which extends NodeGroup as the root container). This module defines
// the shape of the data only; attribute parsing/validation and defaults
// are built on top of these types in later steps.

export interface XY {
  readonly x: number;
  readonly y: number;
}

export type RGB = readonly [red: number, green: number, blue: number];

// `color_to_rgb` in the original implementation leaves the literal value
// "none" (meaning "no fill/no line") unconverted instead of resolving it
// to RGB.
export type Color = RGB | "none";

export type LineStyle = "none" | "solid" | "dotted" | "dashed" | string;

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
  readonly id: string;
  label: string;
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
  group: NodeGroup | null;
}

export interface NodeGroup {
  readonly id: string;
  label: string;
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
  group: NodeGroup | null;
}

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

export interface ClassDefinition {
  readonly name: string;
  readonly attributes: Readonly<Record<string, string>>;
}

export interface Diagram extends NodeGroup {
  classes: Record<string, ClassDefinition>;
  shadowStyle: ShadowStyle;
  linecolor: Color;
  nodeWidth: number | null;
  nodeHeight: number | null;
  spanWidth: number | null;
  spanHeight: number | null;
  pagePadding: number | null;
  edgeLayout: EdgeLayout | null;
}
