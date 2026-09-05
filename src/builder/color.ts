// Color attribute value parsing.
//
// Ported from the original implementation's `color_to_rgb()`
// (vendor/blockdiag/src/blockdiag/utils/images.py), which resolves a color
// attribute value into either the literal "none" or an RGB tuple, using
// the `webcolors` CSS3 named-color table (147 names) or a "#rgb"/"#rrggbb"
// hex code.
//
// `color-name` provides the same CSS3 keyword table, plus one addition
// ("rebeccapurple", from CSS Color Module Level 4) that `webcolors`'s css3
// set doesn't include. Accepting that one extra name is harmless for
// compatibility: it only makes this implementation strictly more
// permissive.

import colorNames from "color-name";
import type { Color } from "../model/elements.js";

export class ColorParseError extends Error {}

export function parseColor(input: string): Color {
  if (input === "none") {
    return "none";
  }
  if (input.startsWith("#")) {
    return parseHexColor(input);
  }
  return parseNamedColor(input);
}

function parseHexColor(input: string): Color {
  const match = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(input);
  if (!match) {
    throw new ColorParseError(`"${input}" is not a valid hexadecimal color value`);
  }
  const hex = match[1];
  if (hex.length === 3) {
    const [r, g, b] = hex;
    return [Number.parseInt(r + r, 16), Number.parseInt(g + g, 16), Number.parseInt(b + b, 16)];
  }
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

function parseNamedColor(input: string): Color {
  const rgb = colorNames[input.toLowerCase() as keyof typeof colorNames];
  if (rgb === undefined) {
    throw new ColorParseError(`"${input}" is not defined as a named color`);
  }
  return rgb;
}
