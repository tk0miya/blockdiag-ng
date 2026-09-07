import { describe, expect, it } from "vitest";
import type { Box, Size } from "./geometry.js";
import { foldText, splitLabel } from "./text-folder.js";

// Expected fold points/outline boxes were captured by running the
// original implementation's `HorizontalTextFolder` (vendor/blockdiag/src/
// blockdiag/imagedraw/textfolder.py) directly, via a local venv, against
// a deterministic mock `textlinesize()` (width = 10 * character count,
// height = a fixed 20) - sidestepping real font measurement (already
// covered, with its own documented tolerance, by font-metrics.test.ts)
// to test the folding/wrapping/truncation/alignment algorithm exactly.
function measure(text: string): Size {
  return { width: 10 * text.length, height: 20 };
}

describe("foldText", () => {
  it("centers a single line that fits with room to spare", () => {
    const box: Box = { x1: 0, y1: 0, x2: 200, y2: 100 };
    const result = foldText(box, "AB", measure);
    expect(result.lines).toEqual([{ text: "AB", point: { x: 90, y: 60 } }]);
    expect(result.outlineBox).toEqual({ x1: 82, y1: 38, x2: 118, y2: 62 });
  });

  it("wraps a line too wide for the box across multiple lines", () => {
    const box: Box = { x1: 0, y1: 0, x2: 55, y2: 100 };
    const result = foldText(box, "ABCDEFGH", measure);
    expect(result.lines).toEqual([
      { text: "ABCDE", point: { x: 3, y: 49 } },
      { text: "FGH", point: { x: 13, y: 71 } },
    ]);
    expect(result.outlineBox).toEqual({ x1: -5, y1: 27, x2: 61, y2: 73 });
  });

  it("truncates the last line that fits instead of adding a partial one", () => {
    const box: Box = { x1: 0, y1: 0, x2: 55, y2: 30 };
    const result = foldText(box, "ABCDEFGH", measure);
    expect(result.lines).toEqual([{ text: "A ...", point: { x: 3, y: 25 } }]);
    expect(result.outlineBox).toEqual({ x1: -5, y1: 3, x2: 61, y2: 27 });
  });

  it("renders nothing when even one line doesn't fit the box's height", () => {
    const box: Box = { x1: 0, y1: 0, x2: 55, y2: 15 };
    const result = foldText(box, "ABCDEFGH", measure);
    expect(result.lines).toEqual([]);
    expect(result.outlineBox).toEqual({ x1: 0, y1: 0, x2: 0, y2: 0 });
  });

  it("renders nothing for an empty label", () => {
    const box: Box = { x1: 0, y1: 0, x2: 200, y2: 100 };
    const result = foldText(box, "", measure);
    expect(result.lines).toEqual([]);
    expect(result.outlineBox).toEqual({ x1: 0, y1: 0, x2: 0, y2: 0 });
  });

  it("aligns to the box's own top-left corner instead of centering", () => {
    const box: Box = { x1: 0, y1: 0, x2: 200, y2: 100 };
    const result = foldText(box, "AB", measure, { halign: "left", valign: "top" });
    expect(result.lines).toEqual([{ text: "AB", point: { x: 8, y: 22 } }]);
    expect(result.outlineBox).toEqual({ x1: 0, y1: 0, x2: 36, y2: 24 });
  });

  it("splits a label into multiple paragraphs on a literal \\n escape", () => {
    const box: Box = { x1: 0, y1: 0, x2: 200, y2: 100 };
    const result = foldText(box, "AB\\nCD", measure);
    expect(result.lines).toEqual([
      { text: "AB", point: { x: 90, y: 49 } },
      { text: "CD", point: { x: 90, y: 71 } },
    ]);
    expect(result.outlineBox).toEqual({ x1: 82, y1: 27, x2: 118, y2: 73 });
  });
});

describe("splitLabel", () => {
  it("trims surrounding whitespace", () => {
    expect(splitLabel("  hello  ")).toEqual(["hello"]);
  });

  it("splits on a literal \\n escape", () => {
    expect(splitLabel("AB\\nCD")).toEqual(["AB", "CD"]);
  });

  it("splits on an actual newline too", () => {
    expect(splitLabel("AB\nCD")).toEqual(["AB", "CD"]);
  });

  it("returns no paragraphs at all for an empty label", () => {
    expect(splitLabel("")).toEqual([]);
  });
});
