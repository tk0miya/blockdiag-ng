// Ported from the original implementation's DiagramEdge attribute
// handling (vendor/blockdiag/src/blockdiag/elements.py: Base,
// DiagramEdge). See attributes.ts for why this switches on the attribute
// name directly rather than mirroring the original's dynamic dispatch.
//
// `colwidth`/`colheight` are deliberately NOT included, even though the
// original's DiagramEdge inherits them via Base.int_attrs: DiagramEdge
// has no such fields, so in the original, setting either one on an edge
// just adds a meaningless, never-read instance attribute (confirmed by
// running it). There's no reason to reproduce that as an accepted
// attribute name here; an edge attribute list using them is rejected as
// unknown instead.
import type { DiagramEdge, EdgeDirection } from "../model/elements.js";
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
// accepts: EdgeAttrName is derived from this array (rather than written
// out separately as its own union), so there's only one list to keep in
// sync with the switch below.
const EDGE_ATTR_NAMES = [
  "label",
  "description",
  "fontfamily",
  "fontsize",
  "color",
  "textcolor",
  "style",
  "dir",
  "hstyle",
  "folded",
  "nofolded",
  "thick",
] as const;

type EdgeAttrName = (typeof EDGE_ATTR_NAMES)[number];

const EDGE_ATTR_NAME_SET: ReadonlySet<string> = new Set(EDGE_ATTR_NAMES);

function isEdgeAttrName(name: string): name is EdgeAttrName {
  return EDGE_ATTR_NAME_SET.has(name);
}

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

export function applyEdgeAttribute(target: DiagramEdge, attr: Attr, classes: ClassRegistry): void {
  const value = unquote(attr.value);

  if (attr.name === "class") {
    for (const classAttr of resolveClass(classes, requireValue("class", value))) {
      applyEdgeAttribute(target, classAttr, classes);
    }
    return;
  }

  if (!isEdgeAttrName(attr.name)) {
    throw new AttributeError(`Unknown attribute: ${attr.name}`);
  }

  switch (attr.name) {
    // No dedicated setter in the original, so a bare "[label];"-style
    // attribute with no value assigns null rather than erroring.
    case "label":
      target.label = value;
      return;
    case "description":
      target.description = value;
      return;
    case "fontfamily":
      target.fontfamily = value;
      return;
    case "fontsize":
      target.fontsize = parseIntAttr(requireValue("fontsize", value));
      return;
    case "color":
      target.color = parseColor(requireValue("color", value));
      return;
    // Deliberately diverges from the original here: DiagramEdge has no
    // set_textcolor of its own (unlike DiagramNode/NodeGroup, which
    // inherit one from Element), so in the original this attribute falls
    // through Base.set_attribute()'s plain-assignment branch entirely
    // unvalidated and unconverted - an edge's `textcolor` stays whatever
    // raw string (or null) was given, never an RGB tuple. Since this port's
    // DiagramEdge.textcolor is typed as Color, not string, following that
    // exactly isn't an option; resolving it through parseColor like `color`
    // is the closest type-safe equivalent.
    case "textcolor":
      target.textcolor = parseColor(requireValue("textcolor", value));
      return;
    case "style":
      target.style = parseLineStyle(requireValue("style", value));
      return;
    case "dir":
      setDir(target, requireValue("dir", value));
      return;
    case "hstyle":
      setHstyle(target, requireValue("hstyle", value));
      return;
    // These three ignore the attribute's value entirely, matching the
    // original's set_folded/set_nofolded/set_thick.
    case "folded":
      target.folded = true;
      return;
    case "nofolded":
      target.folded = false;
      return;
    case "thick":
      target.thick = 3;
      return;
    default:
      assertNever(attr.name);
  }
}

export function applyEdgeAttributes(target: DiagramEdge, attrs: readonly Attr[], classes: ClassRegistry): void {
  for (const attr of attrs) {
    applyEdgeAttribute(target, attr, classes);
  }
}
