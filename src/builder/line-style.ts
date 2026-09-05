// Ported from the original implementation's `Base.set_style()`
// (vendor/blockdiag/src/blockdiag/elements.py), shared by every element
// kind that has a `style` attribute (node, group, edge): a named style, or
// a comma-separated list of numbers for a custom dash pattern.
import type { LineStyle } from "../model/elements.js";
import { AttributeError } from "./attributes.js";

const LINE_STYLE_PATTERN = /^(?:none|solid|dotted|dashed|\d+(?:,\d+)*)$/i;

export function parseLineStyle(value: string): LineStyle {
  if (!LINE_STYLE_PATTERN.test(value)) {
    throw new AttributeError(`unknown style: ${value}`);
  }
  return value.toLowerCase();
}
