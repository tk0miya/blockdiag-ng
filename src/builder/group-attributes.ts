// Ported from the original implementation's NodeGroup attribute handling
// (vendor/blockdiag/src/blockdiag/elements.py: Base, Element, NodeGroup).
// See attributes.ts for why this is an explicit schema rather than
// dynamic dispatch.
//
// `thick` deliberately diverges from the original: NodeGroup.thick isn't
// in Base.int_attrs and has no dedicated setter, so in the original it
// falls through to a plain assignment and keeps whatever raw string was
// given (confirmed by running it: setting "thick = 5" leaves group.thick
// as the string "5", not the int 3 its own default is). That looks like
// an oversight rather than an intentional design in the original (the
// only two places thick is read, drawer.py's rectangle/line calls,
// clearly expect a number), and this port's NodeGroup.thick is typed as
// number, not string - so it's coerced via parseIntAttr here instead.
// One side effect of that: the original tolerates a bare "thick;" with
// no value (silently assigning None), while parseIntAttr's requireValue
// rejects it as an AttributeError, same as every other int-coerced
// attribute here.
import type { GroupOrientation, GroupShape, NodeGroup } from "../model/elements.js";
import type { AttributeSchema } from "./attributes.js";
import { AttributeError, parseIntAttr, requireValue } from "./attributes.js";
import { parseColor } from "./color.js";
import { parseLineStyle } from "./line-style.js";

function parseGroupShape(value: string): GroupShape {
  const normalized = value.toLowerCase();
  if (normalized !== "box" && normalized !== "line") {
    throw new AttributeError(`unknown group shape: ${value}`);
  }
  return normalized;
}

function parseGroupOrientation(value: string): GroupOrientation {
  const normalized = value.toLowerCase();
  if (normalized !== "landscape" && normalized !== "portrait") {
    throw new AttributeError(`unknown diagram orientation: ${value}`);
  }
  return normalized;
}

export const groupAttributeSchema: AttributeSchema<NodeGroup> = {
  // These have no `set_<name>` in the original, so a bare attribute with
  // no value assigns null rather than erroring.
  label: (t, v) => {
    t.label = v;
  },
  fontfamily: (t, v) => {
    t.fontfamily = v;
  },
  icon: (t, v) => {
    t.icon = v;
  },
  href: (t, v) => {
    t.href = v;
  },
  fontsize: (t, v) => {
    t.fontsize = parseIntAttr(requireValue("fontsize", v));
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
  thick: (t, v) => {
    t.thick = parseIntAttr(requireValue("thick", v));
  },
  color: (t, v) => {
    t.color = parseColor(requireValue("color", v));
  },
  textcolor: (t, v) => {
    t.textcolor = parseColor(requireValue("textcolor", v));
  },
  style: (t, v) => {
    t.style = parseLineStyle(requireValue("style", v));
  },
  shape: (t, v) => {
    t.shape = parseGroupShape(requireValue("shape", v));
  },
  orientation: (t, v) => {
    t.orientation = parseGroupOrientation(requireValue("orientation", v));
  },
};
