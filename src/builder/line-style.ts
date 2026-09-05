// Ported from the original implementation's `Base.set_style()`
// (vendor/blockdiag/src/blockdiag/elements.py), shared by every element
// kind that has a `style` attribute (node, group, edge): a named style, or
// a comma-separated list of numbers for a custom dash pattern.
//
// The original keeps the value as a raw string (the name, or the literal
// comma-separated digits) and leaves it to each renderer
// (imagedraw/{png,svg,pdf}.py) to recognize a non-named value and
// `value.split(',')` it into numbers itself - the same parsing repeated
// in every backend. This port instead parses a custom pattern once, here,
// into a plain number array (see LineStyle in src/model/elements.ts); a
// renderer just reads `pattern` instead of re-parsing a string.
import type { LineStyle } from "../model/elements.js";
import { AttributeError } from "./attributes.js";

const CUSTOM_PATTERN = /^\d+(?:,\d+)*$/;

// Deliberately diverges from the original here: its regex validation
// (`re.search` with `$` but no `re.MULTILINE`) matches `$` just before a
// single trailing newline, so e.g. "solid\n" or "8,2\n" pass it too,
// unlike here. Each renderer (imagedraw/{png,svg,pdf}.py) re-validates a
// non-named value against this same regex before parsing it as digits,
// so the same acceptance carries through there: "8,2\n" parses into the
// same numbers as "8,2" (Python's `int()` strips the trailing
// whitespace, same as JS's `Number()` below), while "solid\n" fails that
// second regex too (it's not digits) and is silently treated as no dash
// pattern at all - not an error, just a quietly ignored value. This
// isn't a value worth accommodating: it only arises from an unusual
// triple-quoted-string DSL construct nobody would write on purpose, and
// singling out the digit-pattern case to accept it (while still
// rejecting a trailing newline after a named style) would be an
// oddly inconsistent carve-out for what the original itself treats as a
// no-op either way. This port rejects a trailing newline outright,
// uniformly, instead.

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
