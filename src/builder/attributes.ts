// Attribute resolution shared by every element kind (node/edge/group).
//
// Ported from the original implementation's `Base.set_attribute()`
// (vendor/blockdiag/src/blockdiag/elements.py), which dynamically
// dispatches each attribute name to a `set_<name>` method, an int
// coercion, or a plain field assignment. What's ported is that behavior -
// which names are accepted and what each one does - not the dispatch
// mechanism itself: each element kind instead switches on the attribute
// name directly (see node-attributes.ts etc.), which TypeScript can check
// for exhaustiveness at compile time (see assertNever below), unlike the
// original's runtime `hasattr`/`getattr` lookup.
//
// `class` is handled by each element kind's own applyXAttribute, checked
// before the switch rather than as one of its cases: it isn't itself a
// field, but replays another set of attributes - resolved through a
// ClassRegistry - as if they were written inline, exactly like the
// original. In the original, that registry is `Diagram.classes`, a
// per-build class variable read only while resolving a `class` attribute
// (see the note on classes removed from src/model/elements.ts); here it's
// passed in explicitly instead of living on the domain model.

import type { Attr } from "../parser/ast.js";

export class AttributeError extends Error {}

export interface ClassRegistry {
  get(name: string): readonly Attr[] | undefined;
}

export function requireValue(name: string, value: string | null): string {
  if (value === null) {
    throw new AttributeError(`attribute "${name}" requires a value`);
  }
  return value;
}

// Looks up a `class` attribute's referenced attribute list, for the
// caller to replay through its own switch.
export function resolveClass(classes: ClassRegistry, className: string): readonly Attr[] {
  const attrs = classes.get(className);
  if (attrs === undefined) {
    throw new AttributeError(`Unknown class: ${className}`);
  }
  return attrs;
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

// TypeScript's compile-time exhaustiveness check: each element kind's
// switch is over a literal union of its own known attribute names (e.g.
// NodeAttrName), so a `default` case that forwards the switched value
// here only type-checks while every union member is still handled by an
// explicit `case` - adding a new attribute name to the union without
// adding its `case` breaks the build here instead of failing silently at
// runtime.
export function assertNever(value: never): never {
  throw new Error(`unreachable: unhandled case ${JSON.stringify(value)}`);
}
