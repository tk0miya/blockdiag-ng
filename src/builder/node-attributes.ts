// Ported from the original implementation's DiagramNode attribute
// handling (vendor/blockdiag/src/blockdiag/elements.py: Base, Element,
// DiagramNode). See attributes.ts for why this switches on the attribute
// name directly rather than mirroring the original's dynamic dispatch.
//
// `icon`/`background` deliberately skip the original's validation
// (`urlutil.isurl(value) or os.path.isfile(value)`, which silently drops
// the value with a warning if neither holds): resolving a local file's
// existence is a filesystem side effect that has no place in building a
// domain model from an AST, and depends on a base path (the source
// file's directory) this layer doesn't have. The value is kept as-is;
// resolving/validating it is the renderer's concern.
import type { DiagramNode, LabelOrientation } from "../model/elements.js";
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
import { parseNodeShape } from "./node-shape.js";
import { unquote } from "./unquote.js";

// The single source of truth for which attribute names this element kind
// accepts: NodeAttrName is derived from this array (rather than written
// out separately as its own union), so there's only one list to keep in
// sync with the switch below.
const NODE_ATTR_NAMES = [
  "label",
  "numbered",
  "description",
  "href",
  "icon",
  "background",
  "fontfamily",
  "colwidth",
  "colheight",
  "width",
  "height",
  "fontsize",
  "rotate",
  "color",
  "textcolor",
  "linecolor",
  "style",
  "shape",
  "stacked",
  "label_orientation",
] as const;

type NodeAttrName = (typeof NODE_ATTR_NAMES)[number];

const NODE_ATTR_NAME_SET: ReadonlySet<string> = new Set(NODE_ATTR_NAMES);

function isNodeAttrName(name: string): name is NodeAttrName {
  return NODE_ATTR_NAME_SET.has(name);
}

function parseLabelOrientation(value: string): LabelOrientation {
  const normalized = value.toLowerCase();
  if (normalized !== "horizontal" && normalized !== "vertical") {
    throw new AttributeError(`unknown label orientation: ${value}`);
  }
  return normalized;
}

export function applyNodeAttribute(target: DiagramNode, attr: Attr, classes: ClassRegistry): void {
  const value = unquote(attr.value);

  if (attr.name === "class") {
    for (const classAttr of resolveClass(classes, requireValue("class", value))) {
      applyNodeAttribute(target, classAttr, classes);
    }
    return;
  }

  if (!isNodeAttrName(attr.name)) {
    throw new AttributeError(`Unknown attribute: ${attr.name}`);
  }

  switch (attr.name) {
    // These have no `set_<name>` in the original, so Base.set_attribute()
    // assigns the (possibly null) value directly without ever checking
    // it's present - unlike attributes with a dedicated setter (below), a
    // bare "A [label];" with no value is valid and simply assigns null.
    case "label":
      target.label = value;
      return;
    case "numbered":
      target.numbered = value;
      return;
    case "description":
      target.description = value;
      return;
    case "href":
      target.href = value;
      return;
    // `icon`/`background` do have a dedicated setter in the original
    // (set_icon/set_background); see the file header for why this port
    // skips its validation. Unlike the plain fields above, the original's
    // setters would themselves reject a missing value (isurl(None) returns
    // false without raising, but the fallback os.path.isfile(None) then
    // raises TypeError), so requireValue() here isn't a behavior change.
    case "icon":
      target.icon = requireValue("icon", value);
      return;
    case "background":
      target.background = requireValue("background", value);
      return;
    case "fontfamily":
      target.fontfamily = value;
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
    case "fontsize":
      target.fontsize = parseIntAttr(requireValue("fontsize", value));
      return;
    case "rotate":
      target.rotate = parseIntAttr(requireValue("rotate", value));
      return;
    case "color":
      target.color = parseColor(requireValue("color", value));
      return;
    case "textcolor":
      target.textcolor = parseColor(requireValue("textcolor", value));
      return;
    case "linecolor":
      target.linecolor = parseColor(requireValue("linecolor", value));
      return;
    case "style":
      target.style = parseLineStyle(requireValue("style", value));
      return;
    case "shape":
      target.shape = parseNodeShape(requireValue("shape", value));
      return;
    case "stacked":
      target.stacked = true;
      return;
    case "label_orientation":
      target.labelOrientation = parseLabelOrientation(requireValue("label_orientation", value));
      return;
    default:
      assertNever(attr.name);
  }
}

export function applyNodeAttributes(target: DiagramNode, attrs: readonly Attr[], classes: ClassRegistry): void {
  for (const attr of attrs) {
    applyNodeAttribute(target, attr, classes);
  }
}
