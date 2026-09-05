// Ported from the original implementation's DiagramNode attribute
// handling (vendor/blockdiag/src/blockdiag/elements.py: Base, Element,
// DiagramNode). See attributes.ts for why this is an explicit schema
// rather than dynamic dispatch.
//
// `icon`/`background` deliberately skip the original's validation
// (`urlutil.isurl(value) or os.path.isfile(value)`, which silently drops
// the value with a warning if neither holds): resolving a local file's
// existence is a filesystem side effect that has no place in building a
// domain model from an AST, and depends on a base path (the source
// file's directory) this layer doesn't have. The value is kept as-is;
// resolving/validating it is the renderer's concern.
import type { DiagramNode, LabelOrientation } from "../model/elements.js";
import type { AttributeSchema } from "./attributes.js";
import { AttributeError, parseIntAttr, requireValue } from "./attributes.js";
import { parseColor } from "./color.js";
import { parseLineStyle } from "./line-style.js";
import { parseNodeShape } from "./node-shape.js";

function parseLabelOrientation(value: string): LabelOrientation {
  const normalized = value.toLowerCase();
  if (normalized !== "horizontal" && normalized !== "vertical") {
    throw new AttributeError(`unknown label orientation: ${value}`);
  }
  return normalized;
}

export const nodeAttributeSchema: AttributeSchema<DiagramNode> = {
  // These have no `set_<name>` in the original, so Base.set_attribute()
  // assigns the (possibly null) value directly without ever checking
  // it's present - unlike attributes with a dedicated setter (below), a
  // bare "A [label];" with no value is valid and simply assigns null.
  label: (t, v) => {
    t.label = v;
  },
  numbered: (t, v) => {
    t.numbered = v;
  },
  description: (t, v) => {
    t.description = v;
  },
  href: (t, v) => {
    t.href = v;
  },
  // `icon`/`background` do have a dedicated setter in the original
  // (set_icon/set_background); see the file header for why this port
  // skips its validation. Unlike the plain fields above, the original's
  // setters would themselves reject a missing value (isurl(None) returns
  // false without raising, but the fallback os.path.isfile(None) then
  // raises TypeError), so requireValue() here isn't a behavior change.
  icon: (t, v) => {
    t.icon = requireValue("icon", v);
  },
  background: (t, v) => {
    t.background = requireValue("background", v);
  },
  fontfamily: (t, v) => {
    t.fontfamily = v;
  },
  colwidth: (t, v) => {
    t.colwidth = parseIntAttr(requireValue("colwidth", v));
  },
  colheight: (t, v) => {
    t.colheight = parseIntAttr(requireValue("colheight", v));
  },
  width: (t, v) => {
    t.width = parseIntAttr(requireValue("width", v));
  },
  height: (t, v) => {
    t.height = parseIntAttr(requireValue("height", v));
  },
  fontsize: (t, v) => {
    t.fontsize = parseIntAttr(requireValue("fontsize", v));
  },
  rotate: (t, v) => {
    t.rotate = parseIntAttr(requireValue("rotate", v));
  },
  color: (t, v) => {
    t.color = parseColor(requireValue("color", v));
  },
  textcolor: (t, v) => {
    t.textcolor = parseColor(requireValue("textcolor", v));
  },
  linecolor: (t, v) => {
    t.linecolor = parseColor(requireValue("linecolor", v));
  },
  style: (t, v) => {
    t.style = parseLineStyle(requireValue("style", v));
  },
  shape: (t, v) => {
    t.shape = parseNodeShape(requireValue("shape", v));
  },
  stacked: (t) => {
    t.stacked = true;
  },
  label_orientation: (t, v) => {
    t.labelOrientation = parseLabelOrientation(requireValue("label_orientation", v));
  },
};
