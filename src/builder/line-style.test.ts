import { describe, expect, it } from "vitest";
import { AttributeError } from "./attributes.js";
import { parseLineStyle } from "./line-style.js";

// Expected outputs were captured by running the original implementation's
// Base.set_style() (vendor/blockdiag/src/blockdiag/elements.py) against the
// same inputs.

describe("parseLineStyle", () => {
  it("resolves the named styles, case-insensitively", () => {
    expect(parseLineStyle("none")).toEqual({ type: "none" });
    expect(parseLineStyle("solid")).toEqual({ type: "solid" });
    expect(parseLineStyle("dotted")).toEqual({ type: "dotted" });
    expect(parseLineStyle("DASHED")).toEqual({ type: "dashed" });
  });

  it("parses a comma-separated dash pattern into a number array", () => {
    expect(parseLineStyle("8,2")).toEqual({ type: "custom", pattern: [8, 2] });
    expect(parseLineStyle("1")).toEqual({ type: "custom", pattern: [1] });
  });

  it("throws AttributeError for a value that's neither a named style nor a digit pattern", () => {
    expect(() => parseLineStyle("bogus")).toThrowError(AttributeError);
    expect(() => parseLineStyle("8,2,")).toThrowError(AttributeError);
    expect(() => parseLineStyle("")).toThrowError(AttributeError);
  });

  it("rejects a value with a trailing newline", () => {
    expect(() => parseLineStyle("solid\n")).toThrowError(AttributeError);
    expect(() => parseLineStyle("8,2\n")).toThrowError(AttributeError);
  });
});
