import { describe, expect, it } from "vitest";
import { Namespace } from "./namespace.js";

describe("Namespace", () => {
  it("creates a value on first access and reuses it on subsequent access with the same id", () => {
    const ns = new Namespace<{ id: string }>();
    let created = 0;
    const create = (id: string) => {
      created += 1;
      return { id };
    };

    const a1 = ns.get("A", create);
    const a2 = ns.get("A", create);
    expect(a1).toBe(a2);
    expect(created).toBe(1);
  });

  it("treats quoted and unquoted forms of the same id as identical", () => {
    const ns = new Namespace<{ id: string }>();
    const quoted = ns.get('"A"', (id) => ({ id }));
    const unquoted = ns.get("A", (id) => ({ id }));
    expect(quoted).toBe(unquoted);
  });

  it("passes the unquoted id to the factory", () => {
    const ns = new Namespace<{ id: string }>();
    const value = ns.get('"hello"', (id) => ({ id }));
    expect(value.id).toBe("hello");
  });

  it("generates a distinct id for each null/empty id, matching the original's uuid.generate() for unnamed groups", () => {
    const ns = new Namespace<{ id: string }>();
    const a = ns.get(null, (id) => ({ id }));
    const b = ns.get(null, (id) => ({ id }));
    const c = ns.get("", (id) => ({ id }));
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
    expect(a.id).not.toBe(b.id);
  });

  it("treats a quoted-empty id as the non-empty raw string it is, not as missing", () => {
    // The falsy check runs on the raw id, before unquoting - a quoted
    // empty string like '""' is non-empty raw (so it's NOT replaced by a
    // generated id), and unquotes to "". So every '""' reference resolves
    // to the same instance, keyed by the empty string - it must not be
    // treated the same as a missing id (which does get a fresh generated
    // id every time).
    const ns = new Namespace<{ id: string }>();
    const a = ns.get('""', (id) => ({ id }));
    const b = ns.get('""', (id) => ({ id }));
    const c = ns.get("''", (id) => ({ id }));
    expect(a).toBe(b);
    expect(a).toBe(c);
    expect(a.id).toBe("");
  });
});
