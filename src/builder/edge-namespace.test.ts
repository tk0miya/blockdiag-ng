import { describe, expect, it } from "vitest";
import { EdgeNamespace } from "./edge-namespace.js";

describe("EdgeNamespace", () => {
  it("creates a value on first access to a (node1, node2) pair and reuses it on subsequent access", () => {
    const ns = new EdgeNamespace<object, { label: string }>();
    const a = {};
    const b = {};
    let created = 0;
    const create = () => {
      created += 1;
      return { label: "edge" };
    };

    const e1 = ns.get(a, b, create);
    const e2 = ns.get(a, b, create);
    expect(e1).toBe(e2);
    expect(created).toBe(1);
  });

  it("treats (a, b) and (b, a) as distinct edges, matching the original's directed dict-of-dicts", () => {
    const ns = new EdgeNamespace<object, { label: string }>();
    const a = {};
    const b = {};
    const forward = ns.get(a, b, () => ({ label: "forward" }));
    const backward = ns.get(b, a, () => ({ label: "backward" }));
    expect(forward).not.toBe(backward);
  });

  it("distinguishes edges by node identity, not by structural equality", () => {
    const ns = new EdgeNamespace<{ id: string }, { label: string }>();
    const a1 = { id: "A" };
    const a2 = { id: "A" };
    const b = { id: "B" };
    const e1 = ns.get(a1, b, () => ({ label: "first" }));
    const e2 = ns.get(a2, b, () => ({ label: "second" }));
    expect(e1).not.toBe(e2);
  });
});
