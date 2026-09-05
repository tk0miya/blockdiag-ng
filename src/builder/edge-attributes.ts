// Ported from the original implementation's DiagramEdge attribute
// handling (vendor/blockdiag/src/blockdiag/elements.py: Base,
// DiagramEdge). See attributes.ts for why this is an explicit schema
// rather than dynamic dispatch.
//
// `colwidth`/`colheight` are deliberately NOT included, even though the
// original's DiagramEdge inherits them via Base.int_attrs: DiagramEdge
// has no such fields, so in the original, setting either one on an edge
// just adds a meaningless, never-read instance attribute (confirmed by
// running it). There's no reason to reproduce that as an accepted
// attribute name here; an edge attribute list using them is rejected as
// unknown instead.
import type { DiagramEdge, EdgeDirection } from "../model/elements.js";
import type { AttributeSchema } from "./attributes.js";
import { AttributeError, parseIntAttr, requireValue } from "./attributes.js";
import { parseColor } from "./color.js";
import { parseLineStyle } from "./line-style.js";

const EDGE_DIRECTIONS: ReadonlySet<string> = new Set(["back", "both", "none", "forward"]);

// Ported from the original's `set_dir()`: accepts the four direction
// names directly, or one of the arrow-shaped operator tokens, some of
// which also imply an hstyle.
function setDir(target: DiagramEdge, rawValue: string): void {
  const value = rawValue.toLowerCase();
  if (EDGE_DIRECTIONS.has(value)) {
    target.dir = value as EdgeDirection;
    return;
  }
  switch (value) {
    case "-<":
      target.dir = "forward";
      target.hstyle = "onemany";
      return;
    case ">-":
      target.dir = "back";
      target.hstyle = "manyone";
      return;
    case ">-<":
      target.dir = "both";
      target.hstyle = "manymany";
      return;
    case "->":
      target.dir = "forward";
      return;
    case "<-":
      target.dir = "back";
      return;
    case "<->":
      target.dir = "both";
      return;
    case "--":
      target.dir = "none";
      return;
    default:
      throw new AttributeError(`unknown edge dir: ${rawValue}`);
  }
}

// Ported from the original's `set_hstyle()`: some head styles also imply
// a direction.
function setHstyle(target: DiagramEdge, rawValue: string): void {
  const value = rawValue.toLowerCase();
  switch (value) {
    case "generalization":
    case "composition":
    case "aggregation":
      target.hstyle = value;
      return;
    case "oneone":
      target.dir = "none";
      target.hstyle = value;
      return;
    case "onemany":
      target.dir = "forward";
      target.hstyle = value;
      return;
    case "manyone":
      target.dir = "back";
      target.hstyle = value;
      return;
    case "manymany":
      target.dir = "both";
      target.hstyle = value;
      return;
    default:
      throw new AttributeError(`unknown edge hstyle: ${rawValue}`);
  }
}

export const edgeAttributeSchema: AttributeSchema<DiagramEdge> = {
  // No dedicated setter in the original, so a bare "[label];"-style
  // attribute with no value assigns null rather than erroring.
  label: (t, v) => {
    t.label = v;
  },
  description: (t, v) => {
    t.description = v;
  },
  fontfamily: (t, v) => {
    t.fontfamily = v;
  },
  fontsize: (t, v) => {
    t.fontsize = parseIntAttr(requireValue("fontsize", v));
  },
  color: (t, v) => {
    t.color = parseColor(requireValue("color", v));
  },
  // Deliberately diverges from the original here: DiagramEdge has no
  // set_textcolor of its own (unlike DiagramNode/NodeGroup, which
  // inherit one from Element), so in the original this attribute falls
  // through Base.set_attribute()'s plain-assignment branch entirely
  // unvalidated and unconverted - an edge's `textcolor` stays whatever
  // raw string (or null) was given, never an RGB tuple. Since this port's
  // DiagramEdge.textcolor is typed as Color, not string, following that
  // exactly isn't an option; resolving it through parseColor like `color`
  // is the closest type-safe equivalent.
  textcolor: (t, v) => {
    t.textcolor = parseColor(requireValue("textcolor", v));
  },
  style: (t, v) => {
    t.style = parseLineStyle(requireValue("style", v));
  },
  dir: (t, v) => {
    setDir(t, requireValue("dir", v));
  },
  hstyle: (t, v) => {
    setHstyle(t, requireValue("hstyle", v));
  },
  // These three ignore the attribute's value entirely, matching the
  // original's set_folded/set_nofolded/set_thick.
  folded: (t) => {
    t.folded = true;
  },
  nofolded: (t) => {
    t.folded = false;
  },
  thick: (t) => {
    t.thick = 3;
  },
};
