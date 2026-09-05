// Ported from the original implementation's `Element.get()`/`get_or_new()`
// pattern (vendor/blockdiag/src/blockdiag/elements.py): DiagramNode,
// NodeGroup, and Diagram's classes each keep a class-level `namespace`
// dict so that referencing the same id (e.g. "A" in both "A -> B;" and
// "A [color = red];") returns the same instance. In the original this is
// global, per-build state (reset via each class's `clear()` at the start
// of a build); here it's explicit, per-build state instead.
//
// A missing/empty id (e.g. an unnamed group, "group { ... }") gets a
// generated id instead - ported from `uuid.generate()`. This check runs
// on the raw id, before unquoting, exactly like the original's
// `if not elemid: elemid = uuid.generate()` followed by `unquote(elemid)`
// - not the other way around. The order matters: a quoted-empty id like
// `""` is non-empty raw (and so isn't replaced by a generated id) but
// unquotes to "", so every `""` reference still resolves to the same
// (empty-string-keyed) instance, matching the original.
import { randomUUID } from "node:crypto";
import { unquote } from "./unquote.js";

export class Namespace<T> {
  private readonly byId = new Map<string, T>();

  get(rawId: string | null, create: (id: string) => T): T {
    const id = unquote(rawId || randomUUID());
    let value = this.byId.get(id);
    if (value === undefined) {
      value = create(id);
      this.byId.set(id, value);
    }
    return value;
  }
}
