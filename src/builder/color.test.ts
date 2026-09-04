import { describe, expect, it } from "vitest";
import { ColorParseError, parseColor } from "./color.js";

// Expected outputs were captured by running the original implementation's
// color_to_rgb() (vendor/blockdiag/src/blockdiag/utils/images.py, backed by
// the Python `webcolors` package's CSS3 name table) against the same
// inputs.

describe("parseColor", () => {
  it('passes through the literal "none"', () => {
    expect(parseColor("none")).toBe("none");
  });

  it("resolves a 6-digit hex color", () => {
    expect(parseColor("#ffffff")).toEqual([255, 255, 255]);
    expect(parseColor("#FF00ff")).toEqual([255, 0, 255]);
  });

  it("resolves a 3-digit hex color by doubling each digit", () => {
    expect(parseColor("#fff")).toEqual([255, 255, 255]);
  });

  it("throws ColorParseError for a malformed hex color", () => {
    expect(() => parseColor("#ggg")).toThrowError(ColorParseError);
    expect(() => parseColor("#12345")).toThrowError(ColorParseError);
  });

  it("resolves a named CSS3 color, case-insensitively", () => {
    expect(parseColor("red")).toEqual([255, 0, 0]);
    expect(parseColor("RED")).toEqual([255, 0, 0]);
    expect(parseColor("cornflowerblue")).toEqual([100, 149, 237]);
  });

  it("throws ColorParseError for an unknown color name", () => {
    expect(() => parseColor("notacolor")).toThrowError(ColorParseError);
  });
});
