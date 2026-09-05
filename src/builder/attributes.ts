// Attribute resolution shared by every element kind (node/edge/group).
//
// Ported from the original implementation's `Base.set_attribute()`
// (vendor/blockdiag/src/blockdiag/elements.py), which dynamically
// dispatches each attribute name to a `set_<name>` method, an int
// coercion, or a plain field assignment. TypeScript can't dispatch on a
// dynamic attribute name against arbitrary object fields while staying
// type-safe, so each element kind instead provides an explicit
// AttributeSchema mapping every attribute name (including plain
// assignments and int coercions) to a setter function.
//
// `class` is handled here rather than per-schema, exactly like the
// original: it isn't itself a field, but replays another set of
// attributes - resolved through a ClassRegistry - as if they were written
// inline. In the original, that registry is `Diagram.classes`, a
// per-build class variable read only while resolving a `class` attribute
// (see the note on classes removed from src/model/elements.ts); here it's
// passed in explicitly instead of living on the domain model.

import type { Attr } from "../parser/ast.js";
import { unquote } from "./unquote.js";

export class AttributeError extends Error {}

// A setter's value is nullable because a bare attribute name with no "="
// (e.g. "stacked" in "A [stacked];") is valid DSL and reaches the setter
// as null - most setters require a value and should call requireValue(),
// but some (like "stacked") ignore it entirely, exactly like the
// original's corresponding `set_<name>` methods.
export type AttributeSetter<T> = (target: T, value: string | null) => void;

export type AttributeSchema<T> = Readonly<Record<string, AttributeSetter<T>>>;

export interface ClassRegistry {
  get(name: string): readonly Attr[] | undefined;
}

export function requireValue(name: string, value: string | null): string {
  if (value === null) {
    throw new AttributeError(`attribute "${name}" requires a value`);
  }
  return value;
}

export function applyAttribute<T>(target: T, attr: Attr, schema: AttributeSchema<T>, classes: ClassRegistry): void {
  const value = unquote(attr.value);

  if (attr.name === "class") {
    const className = requireValue("class", value);
    const classAttrs = classes.get(className);
    if (classAttrs === undefined) {
      throw new AttributeError(`Unknown class: ${className}`);
    }
    for (const classAttr of classAttrs) {
      applyAttribute(target, classAttr, schema, classes);
    }
    return;
  }

  const setter = schema[attr.name];
  if (setter === undefined) {
    throw new AttributeError(`Unknown attribute: ${attr.name}`);
  }
  setter(target, value);
}

export function applyAttributes<T>(
  target: T,
  attrs: readonly Attr[],
  schema: AttributeSchema<T>,
  classes: ClassRegistry,
): void {
  for (const attr of attrs) {
    applyAttribute(target, attr, schema, classes);
  }
}

// Ported from Python's int(str): unlike Number.parseInt, it rejects
// anything but an optionally-signed run of digits (surrounding
// whitespace aside) rather than silently parsing a numeric prefix.
export function parseIntAttr(value: string): number {
  const trimmed = value.trim();
  if (!/^[+-]?\d+$/.test(trimmed)) {
    throw new AttributeError(`invalid literal for int() with base 10: ${JSON.stringify(value)}`);
  }
  return Number.parseInt(trimmed, 10);
}
