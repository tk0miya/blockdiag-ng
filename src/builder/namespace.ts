// Ported from the original implementation's `Element.get()`/`get_or_new()`
// pattern (vendor/blockdiag/src/blockdiag/elements.py): DiagramNode,
// NodeGroup, and Diagram's classes each keep a class-level `namespace`
// dict so that referencing the same id (e.g. "A" in both "A -> B;" and
// "A [color = red];") returns the same instance. In the original this is
// global, per-build state (reset via each class's `clear()` at the start
// of a build); here it's an explicit `Map` the caller owns instead, with
// this function doing the id lookup against it.
//
// A missing id (e.g. an unnamed group, "group { ... }") isn't this
// function's concern, unlike in the original: `Element.get()` runs
// `if not elemid: elemid = uuid.generate()` itself, as the first thing
// it does, before ever touching its namespace dict. This port instead
// leaves that check to the caller, since only a group_stmt's id can be
// missing in the first place (a node_stmt's id is always present, even
// as an empty-string literal, which unquotes to a genuine, dedup-able ""
// key - see the tests below) - so it's a group-specific concern, not a
// generic one this shared function should carry. The caller resolving a
// group's id is expected to generate a fresh, never-deduplicated id and
// bypass `byId` entirely when there's no name to look up by, rather than
// routing a generated id through this function.
import { unquote } from "./unquote.js";

export function resolveElement<T>(byId: Map<string, T>, rawId: string, create: (id: string) => T): T {
  const id = unquote(rawId);
  let value = byId.get(id);
  if (value === undefined) {
    value = create(id);
    byId.set(id, value);
  }
  return value;
}
