// Ported from the original implementation's `Base.set_style()`
// (vendor/blockdiag/src/blockdiag/elements.py), shared by every element
// kind that has a `style` attribute (node, group, edge): a named style, or
// a comma-separated dash pattern.
import type { LineStyle } from "../model/elements.js";
import { AttributeError } from "./attributes.js";

const CUSTOM_PATTERN = /^\d+(?:,\d+)*$/;

export function parseLineStyle(value: string): LineStyle {
  const normalized = value.toLowerCase();
  switch (normalized) {
    case "none":
      return { type: "none" };
    case "solid":
      return { type: "solid" };
    case "dotted":
      return { type: "dotted" };
    case "dashed":
      return { type: "dashed" };
    default:
      if (!CUSTOM_PATTERN.test(normalized)) {
        throw new AttributeError(`unknown style: ${value}`);
      }
      return { type: "custom", pattern: normalized.split(",").map(Number) };
  }
}
