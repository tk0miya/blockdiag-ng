import { describe, expect, it } from "vitest";
import { registerShape, rendererFor } from "./shape-registry.js";

describe("shape-registry", () => {
  it("resolves a registered shape's renderer", () => {
    const render = () => {};
    registerShape("shape-registry-test-shape", { render, getConnectors: null, getTextBox: null });
    expect(rendererFor("shape-registry-test-shape")).toBe(render);
  });

  it("throws a shape-naming error for an unregistered shape", () => {
    expect(() => rendererFor("shape-registry-test-unknown-shape")).toThrow(
      "node shape not yet supported: shape-registry-test-unknown-shape",
    );
  });
});
