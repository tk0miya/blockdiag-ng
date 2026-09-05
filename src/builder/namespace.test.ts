import { describe, expect, it } from "vitest";
import { resolveElement } from "./namespace.js";

describe("resolveElement", () => {
  it("creates a value on first access and reuses it on subsequent access with the same id", () => {
    const byId = new Map<string, { id: string }>();
    let created = 0;
    const create = (id: string) => {
      created += 1;
      return { id };
    };

    const a1 = resolveElement(byId, "A", create);
    const a2 = resolveElement(byId, "A", create);
    expect(a1).toBe(a2);
    expect(created).toBe(1);
  });

  it("treats quoted and unquoted forms of the same id as identical", () => {
    const byId = new Map<string, { id: string }>();
    const quoted = resolveElement(byId, '"A"', (id) => ({ id }));
    const unquoted = resolveElement(byId, "A", (id) => ({ id }));
    expect(quoted).toBe(unquoted);
  });

  it("passes the unquoted id to the factory", () => {
    const byId = new Map<string, { id: string }>();
    const value = resolveElement(byId, '"hello"', (id) => ({ id }));
    expect(value.id).toBe("hello");
  });

  it("treats a quoted-empty id as a genuine, dedup-able key", () => {
    // A quoted empty string like '""' unquotes to "" - a real key, not a
    // missing id (resolving a missing id to a fresh one is the caller's
    // job; see namespace.ts's header comment). Every '""' reference here
    // resolves to the same instance, keyed by the empty string.
    const byId = new Map<string, { id: string }>();
    const a = resolveElement(byId, '""', (id) => ({ id }));
    const b = resolveElement(byId, '""', (id) => ({ id }));
    const c = resolveElement(byId, "''", (id) => ({ id }));
    expect(a).toBe(b);
    expect(a).toBe(c);
    expect(a.id).toBe("");
  });
});
