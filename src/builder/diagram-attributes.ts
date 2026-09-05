// Ported from the original implementation's Diagram attribute handling
// (vendor/blockdiag/src/blockdiag/elements.py: Diagram, which extends
// NodeGroup). A `default_*` attribute updates the shared BuildDefaults
// (see factory.ts) that later nodes/groups/edges are constructed from,
// rather than a field on the diagram itself. Diagram's own plain
// attributes (label, color, textcolor, style, shape, ...) are identical
// to NodeGroup's, so they fall through to applyGroupAttribute() below
// instead of being re-specified here - except `fontsize`, which Diagram
// overrides to mean `default_fontsize` instead of a field of its own.
import type { Diagram, EdgeLayout, ShadowStyle } from "../model/elements.js";
import type { Attr } from "../parser/ast.js";
import { AttributeError, type ClassRegistry, parseIntAttr, requireValue, resolveClass } from "./attributes.js";
import { parseColor } from "./color.js";
import type { BuildDefaults } from "./factory.js";
import { applyGroupAttribute } from "./group-attributes.js";
import { parseLineStyle } from "./line-style.js";
import { parseLabelOrientation } from "./node-attributes.js";
import { parseNodeShape } from "./node-shape.js";
import { unquote } from "./unquote.js";

function parseShadowStyle(value: string): ShadowStyle {
  const normalized = value.toLowerCase();
  if (normalized !== "solid" && normalized !== "blur" && normalized !== "none") {
    throw new AttributeError(`unknown shadow style: ${value}`);
  }
  return normalized;
}

function parseEdgeLayout(value: string): EdgeLayout {
  const normalized = value.toLowerCase();
  if (normalized !== "normal" && normalized !== "flowchart") {
    throw new AttributeError(`unknown edge layout: ${value}`);
  }
  return normalized;
}

export function applyDiagramAttribute(
  diagram: Diagram,
  defaults: BuildDefaults,
  attr: Attr,
  classes: ClassRegistry,
): void {
  const value = unquote(attr.value);

  if (attr.name === "class") {
    for (const classAttr of resolveClass(classes, requireValue("class", value))) {
      applyDiagramAttribute(diagram, defaults, classAttr, classes);
    }
    return;
  }

  switch (attr.name) {
    case "default_shape":
      defaults.node.shape = parseNodeShape(requireValue("default_shape", value));
      return;
    case "default_label_orientation":
      defaults.node.labelOrientation = parseLabelOrientation(requireValue("default_label_orientation", value));
      return;
    case "default_text_color":
    case "default_textcolor": {
      const color = parseColor(requireValue(attr.name, value));
      diagram.textcolor = color;
      defaults.node.textcolor = color;
      defaults.group.textcolor = color;
      defaults.edge.textcolor = color;
      return;
    }
    case "default_node_color":
      defaults.node.color = parseColor(requireValue("default_node_color", value));
      return;
    case "default_node_style":
      defaults.node.style = parseLineStyle(requireValue("default_node_style", value));
      return;
    case "default_line_color":
    case "default_linecolor": {
      const color = parseColor(requireValue(attr.name, value));
      diagram.linecolor = color;
      defaults.node.linecolor = color;
      defaults.edge.color = color;
      return;
    }
    case "default_group_color":
      defaults.group.color = parseColor(requireValue("default_group_color", value));
      return;
    // Unlike default_textcolor/default_linecolor above, the original's
    // set_default_fontfamily/set_default_fontsize don't assign
    // self.fontfamily/self.fontsize - only the three element kinds'
    // defaults - so this doesn't touch `diagram` either.
    case "default_fontfamily":
      defaults.node.fontfamily = value;
      defaults.group.fontfamily = value;
      defaults.edge.fontfamily = value;
      return;
    case "default_fontsize":
    case "fontsize": {
      const fontsize = parseIntAttr(requireValue(attr.name, value));
      defaults.node.fontsize = fontsize;
      defaults.group.fontsize = fontsize;
      defaults.edge.fontsize = fontsize;
      return;
    }
    case "shadow_style":
      diagram.shadowStyle = parseShadowStyle(requireValue("shadow_style", value));
      return;
    case "edge_layout":
      diagram.edgeLayout = parseEdgeLayout(requireValue("edge_layout", value));
      return;
    // node_width/node_height/span_width/span_height are the original's
    // int_attrs; page_padding isn't (it's left an unparsed, unvalidated
    // string there - confirmed by inspection, evidently an oversight
    // since it's later read as a number by metrics.py), but this port's
    // Diagram.pagePadding is typed as number, so it's coerced the same
    // way as the others.
    case "node_width":
      diagram.nodeWidth = parseIntAttr(requireValue("node_width", value));
      return;
    case "node_height":
      diagram.nodeHeight = parseIntAttr(requireValue("node_height", value));
      return;
    case "span_width":
      diagram.spanWidth = parseIntAttr(requireValue("span_width", value));
      return;
    case "span_height":
      diagram.spanHeight = parseIntAttr(requireValue("span_height", value));
      return;
    case "page_padding":
      diagram.pagePadding = parseIntAttr(requireValue("page_padding", value));
      return;
    default:
      applyGroupAttribute(diagram, attr, classes);
  }
}

export function applyDiagramAttributes(
  diagram: Diagram,
  defaults: BuildDefaults,
  attrs: readonly Attr[],
  classes: ClassRegistry,
): void {
  for (const attr of attrs) {
    applyDiagramAttribute(diagram, defaults, attr, classes);
  }
}
