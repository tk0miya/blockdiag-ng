// Element construction with build-time defaults.
//
// In the original implementation, a fresh diagram's node/group/edge
// classes start with fixed default values (e.g. DiagramNode.shape =
// 'box') as class variables (vendor/blockdiag/src/blockdiag/elements.py),
// which a `default_shape = ...`-style top-level attribute can then
// override for the rest of that build (Diagram.set_default_shape() etc.
// mutate those class variables directly). Since those defaults are
// build-scoped global mutable state, this port keeps them as an explicit,
// passed-in BuildDefaults object instead - reset per build by simply
// constructing a fresh one, and updated in place as default_* statements
// are processed (in a later step).
import type {
  Color,
  Diagram,
  DiagramEdge,
  DiagramNode,
  LabelOrientation,
  LineStyle,
  NodeGroup,
} from "../model/elements.js";

export interface NodeDefaults {
  color: Color;
  textcolor: Color;
  linecolor: Color;
  fontfamily: string | null;
  fontsize: number | null;
  style: LineStyle | null;
  shape: string;
  labelOrientation: LabelOrientation;
}

export interface GroupDefaults {
  color: Color;
  textcolor: Color;
  fontfamily: string | null;
  fontsize: number | null;
  style: LineStyle | null;
}

export interface EdgeDefaults {
  color: Color;
  textcolor: Color;
  fontfamily: string | null;
  fontsize: number | null;
  style: LineStyle | null;
}

export interface BuildDefaults {
  node: NodeDefaults;
  group: GroupDefaults;
  edge: EdgeDefaults;
}

// Ported from the original's Base/DiagramNode/NodeGroup/DiagramEdge class
// attributes: white nodes/edges with black text/lines, orange groups
// (basecolor = (243, 152, 0), vendor/blockdiag/src/blockdiag/elements.py
// NodeGroup), box-shaped nodes, horizontal labels.
export function createDefaultBuildDefaults(): BuildDefaults {
  return {
    node: {
      color: [255, 255, 255],
      textcolor: [0, 0, 0],
      linecolor: [0, 0, 0],
      fontfamily: null,
      fontsize: null,
      style: null,
      shape: "box",
      labelOrientation: "horizontal",
    },
    group: {
      color: [243, 152, 0],
      textcolor: [0, 0, 0],
      fontfamily: null,
      fontsize: null,
      style: null,
    },
    edge: {
      color: [0, 0, 0],
      textcolor: [0, 0, 0],
      fontfamily: null,
      fontsize: null,
      style: null,
    },
  };
}

export function createNode(id: string, defaults: NodeDefaults): DiagramNode {
  return {
    id,
    label: id,
    xy: { x: 0, y: 0 },
    colwidth: 1,
    colheight: 1,
    width: null,
    height: null,
    color: defaults.color,
    textcolor: defaults.textcolor,
    linecolor: defaults.linecolor,
    fontfamily: defaults.fontfamily,
    fontsize: defaults.fontsize,
    style: defaults.style,
    shape: defaults.shape,
    numbered: null,
    icon: null,
    background: null,
    description: null,
    rotate: 0,
    href: null,
    stacked: false,
    labelOrientation: defaults.labelOrientation,
    order: 0,
    group: null,
  };
}

export function createGroup(id: string, defaults: GroupDefaults): NodeGroup {
  return {
    id,
    // Unlike DiagramNode (label defaults to its own id), the original's
    // NodeGroup.__init__ never sets label from the id - it's left at
    // Element's own default (''), confirmed against a fresh instance.
    label: "",
    xy: { x: 0, y: 0 },
    colwidth: 1,
    colheight: 1,
    width: null,
    height: null,
    color: defaults.color,
    textcolor: defaults.textcolor,
    fontfamily: defaults.fontfamily,
    fontsize: defaults.fontsize,
    style: defaults.style,
    level: 0,
    separated: false,
    shape: "box",
    thick: 3,
    nodes: [],
    edges: [],
    icon: null,
    orientation: "landscape",
    href: null,
    order: 0,
    stacked: false,
    group: null,
  };
}

export function createEdge(node1: DiagramNode, node2: DiagramNode, defaults: EdgeDefaults): DiagramEdge {
  return {
    node1,
    node2,
    crosspoints: [],
    skipped: 0,
    label: null,
    description: null,
    dir: "forward",
    color: defaults.color,
    textcolor: defaults.textcolor,
    fontfamily: defaults.fontfamily,
    fontsize: defaults.fontsize,
    style: defaults.style,
    hstyle: null,
    folded: null,
    thick: null,
  };
}

// Diagram is a NodeGroup subclass in the original (it's always the
// single root container, so - unlike ordinary nodes/groups/edges - it
// never goes through id-based dedup), and inherits NodeGroup's
// class-level defaults rather than Base's: its initial color is the same
// orange as an ordinary group's, confirmed by inspecting a fresh
// Diagram() instance. Takes GroupDefaults (rather than hardcoding the
// same values again) so the two can't drift apart from each other.
export function createDiagram(defaults: GroupDefaults): Diagram {
  return {
    id: "",
    label: "",
    xy: { x: 0, y: 0 },
    colwidth: 1,
    colheight: 1,
    width: null,
    height: null,
    color: defaults.color,
    textcolor: defaults.textcolor,
    fontfamily: defaults.fontfamily,
    fontsize: defaults.fontsize,
    style: defaults.style,
    level: 0,
    separated: false,
    shape: "box",
    thick: 3,
    nodes: [],
    edges: [],
    icon: null,
    orientation: "landscape",
    href: null,
    order: 0,
    stacked: false,
    group: null,
    shadowStyle: "blur",
    linecolor: [0, 0, 0],
    nodeWidth: null,
    nodeHeight: null,
    spanWidth: null,
    spanHeight: null,
    pagePadding: null,
    edgeLayout: null,
  };
}
