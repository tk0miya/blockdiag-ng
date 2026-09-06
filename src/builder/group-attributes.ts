// Ported from the original implementation's NodeGroup attribute handling
// (vendor/blockdiag/src/blockdiag/elements.py: Base, Element, NodeGroup).
// See attributes.ts for why this switches on the attribute name directly
// rather than mirroring the original's dynamic dispatch.
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
import type { AnyGroup, GroupOrientation, GroupShape } from "../model/elements.js";
import type { Attr } from "../parser/ast.js";
import {
  AttributeError,
  assertNever,
  type ClassRegistry,
  parseIntAttr,
  requireValue,
  resolveClass,
} from "./attributes.js";
import { parseColor } from "./color.js";
import { parseLineStyle } from "./line-style.js";
import { unquote } from "./unquote.js";

// The single source of truth for which attribute names this element kind
// accepts: GroupAttrName is derived from this array (rather than written
// out separately as its own union), so there's only one list to keep in
// sync with the switch below.
const GROUP_ATTR_NAMES = [
  "label",
  "fontfamily",
  "icon",
  "href",
  "fontsize",
  "colwidth",
  "colheight",
  "width",
  "height",
  "thick",
  "color",
  "textcolor",
  "style",
  "shape",
  "orientation",
] as const;

type GroupAttrName = (typeof GROUP_ATTR_NAMES)[number];

const GROUP_ATTR_NAME_SET: ReadonlySet<string> = new Set(GROUP_ATTR_NAMES);

function isGroupAttrName(name: string): name is GroupAttrName {
  return GROUP_ATTR_NAME_SET.has(name);
}

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

export function applyGroupAttribute(target: AnyGroup, attr: Attr, classes: ClassRegistry): void {
  const value = unquote(attr.value);

  if (attr.name === "class") {
    for (const classAttr of resolveClass(classes, requireValue("class", value))) {
      applyGroupAttribute(target, classAttr, classes);
    }
    return;
  }

  if (!isGroupAttrName(attr.name)) {
    throw new AttributeError(`Unknown attribute: ${attr.name}`);
  }

  switch (attr.name) {
    // These have no `set_<name>` in the original, so a bare attribute with
    // no value assigns null rather than erroring.
    case "label":
      target.label = value;
      return;
    case "fontfamily":
      target.fontfamily = value;
      return;
    case "icon":
      target.icon = value;
      return;
    case "href":
      target.href = value;
      return;
    case "fontsize":
      target.fontsize = parseIntAttr(requireValue("fontsize", value));
      return;
    case "colwidth":
      target.colwidth = parseIntAttr(requireValue("colwidth", value));
      return;
    case "colheight":
      target.colheight = parseIntAttr(requireValue("colheight", value));
      return;
    case "width":
      target.width = parseIntAttr(requireValue("width", value));
      return;
    case "height":
      target.height = parseIntAttr(requireValue("height", value));
      return;
    case "thick":
      target.thick = parseIntAttr(requireValue("thick", value));
      return;
    case "color":
      target.color = parseColor(requireValue("color", value));
      return;
    case "textcolor":
      target.textcolor = parseColor(requireValue("textcolor", value));
      return;
    case "style":
      target.style = parseLineStyle(requireValue("style", value));
      return;
    case "shape":
      target.shape = parseGroupShape(requireValue("shape", value));
      return;
    case "orientation":
      target.orientation = parseGroupOrientation(requireValue("orientation", value));
      return;
    default:
      assertNever(attr.name);
  }
}

export function applyGroupAttributes(target: AnyGroup, attrs: readonly Attr[], classes: ClassRegistry): void {
  for (const attr of attrs) {
    applyGroupAttribute(target, attr, classes);
  }
}
