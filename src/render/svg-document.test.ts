import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadFont } from "./font-metrics.js";
import { SvgDocument } from "./svg-document.js";

const VL_GOTHIC_PATH = join(import.meta.dirname, "../../vendor/vlgothic/VL-Gothic-Regular.ttf");

describe("SvgDocument", () => {
  describe("rectangle", () => {
    it("draws a filled, outlined rectangle with no style", () => {
      const doc = new SvgDocument();
      doc.rectangle({ x1: 10, y1: 20, x2: 110, y2: 60 }, { fill: [255, 255, 255], outline: [0, 0, 0] });
      expect(doc.toString({ width: 200, height: 100 })).toContain(
        '<rect x="10" y="20" width="100" height="40" fill="rgb(255,255,255)" stroke="rgb(0,0,0)"/>',
      );
    });

    it("draws an unfilled rectangle when no fill is given, matching the original's 'none' default", () => {
      const doc = new SvgDocument();
      doc.rectangle({ x1: 0, y1: 0, x2: 10, y2: 10 }, { outline: [0, 0, 0] });
      expect(doc.toString({ width: 10, height: 10 })).toContain('fill="none" stroke="rgb(0,0,0)"');
    });

    it("adds a stroke-dasharray for a dashed style, scaled by thickness", () => {
      const doc = new SvgDocument();
      doc.rectangle(
        { x1: 0, y1: 0, x2: 10, y2: 10 },
        { fill: [255, 255, 255], outline: [0, 0, 0], style: { type: "dashed" } },
      );
      expect(doc.toString({ width: 10, height: 10 })).toContain('stroke-dasharray="4"');
    });

    it("applies the blur filter", () => {
      const doc = new SvgDocument();
      doc.rectangle({ x1: 0, y1: 0, x2: 10, y2: 10 }, { fill: [243, 152, 0], filter: "blur" });
      expect(doc.toString({ width: 10, height: 10 })).toContain('style="filter:url(#filter_blur)"');
    });

    it("passes thick through as its own stroke-width, and scales a dashed style's dasharray by it", () => {
      const doc = new SvgDocument();
      doc.rectangle({ x1: 0, y1: 0, x2: 10, y2: 10 }, { outline: [0, 0, 0], thick: 3, style: { type: "dashed" } });
      const output = doc.toString({ width: 10, height: 10 });
      expect(output).toContain('stroke-width="3"');
      expect(output).toContain('stroke-dasharray="12"');
    });
  });

  describe("ellipse", () => {
    it("draws an ellipse centered in its box", () => {
      const doc = new SvgDocument();
      doc.ellipse({ x1: 0, y1: 0, x2: 100, y2: 40 }, { fill: [255, 255, 255], outline: [0, 0, 0] });
      expect(doc.toString({ width: 100, height: 40 })).toContain(
        '<ellipse cx="50" cy="20" rx="50" ry="20" fill="rgb(255,255,255)" stroke="rgb(0,0,0)"/>',
      );
    });

    it("applies the transp-blur filter, used for a node's own shadow", () => {
      const doc = new SvgDocument();
      doc.ellipse({ x1: 0, y1: 0, x2: 100, y2: 40 }, { fill: [0, 0, 0], filter: "transp-blur" });
      expect(doc.toString({ width: 100, height: 40 })).toContain(
        'style="filter:url(#filter_blur);opacity:0.7;fill-opacity:1"',
      );
    });

    it("adds a stroke-dasharray for a dotted style", () => {
      const doc = new SvgDocument();
      doc.ellipse({ x1: 0, y1: 0, x2: 100, y2: 40 }, { outline: [0, 0, 0], style: { type: "dotted" } });
      expect(doc.toString({ width: 100, height: 40 })).toContain('stroke-dasharray="2"');
    });
  });

  describe("polygon", () => {
    it("draws a filled, outlined polygon from its points", () => {
      const doc = new SvgDocument();
      doc.polygon(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 5, y: 10 },
        ],
        { fill: [0, 0, 0], outline: [0, 0, 0] },
      );
      expect(doc.toString({ width: 20, height: 20 })).toContain(
        '<polygon points="0,0 10,0 5,10" fill="rgb(0,0,0)" stroke="rgb(0,0,0)"/>',
      );
    });

    it("truncates fractional point coordinates to whole numbers", () => {
      const doc = new SvgDocument();
      doc.polygon(
        [
          { x: 0.9, y: -0.9 },
          { x: 10.1, y: 0 },
        ],
        { fill: [0, 0, 0] },
      );
      expect(doc.toString({ width: 20, height: 20 })).toContain('points="0,0 10,0"');
    });

    it("adds a stroke-dasharray for a dashed style", () => {
      const doc = new SvgDocument();
      doc.polygon(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        { outline: [0, 0, 0], style: { type: "dashed" } },
      );
      expect(doc.toString({ width: 20, height: 20 })).toContain('stroke-dasharray="4"');
    });
  });

  describe("path", () => {
    it("draws a filled, outlined path from raw path data", () => {
      const doc = new SvgDocument();
      doc.path("M 0 0 L 10 0 A5,5 0 0 1 10 10", { fill: [255, 255, 255], outline: [0, 0, 0] });
      expect(doc.toString({ width: 20, height: 20 })).toContain(
        '<path d="M 0 0 L 10 0 A5,5 0 0 1 10 10" fill="rgb(255,255,255)" stroke="rgb(0,0,0)"/>',
      );
    });

    it("adds a stroke-dasharray for a dashed style", () => {
      const doc = new SvgDocument();
      doc.path("M 0 0 L 10 0", { outline: [0, 0, 0], style: { type: "dashed" } });
      expect(doc.toString({ width: 20, height: 20 })).toContain('stroke-dasharray="4"');
    });
  });

  describe("image", () => {
    it("references the given path directly, rather than embedding its content", () => {
      const doc = new SvgDocument();
      doc.image({ x1: 10, y1: 20, x2: 42, y2: 36 }, "icons/example.png");
      expect(doc.toString({ width: 100, height: 100 })).toContain(
        '<image x="10" y="20" width="32" height="16" xlink:href="icons/example.png"/>',
      );
    });

    it("escapes an ampersand, a less-than sign, or a double quote in the path", () => {
      const doc = new SvgDocument();
      doc.image({ x1: 0, y1: 0, x2: 10, y2: 10 }, 'a&b<c".png');
      expect(doc.toString({ width: 10, height: 10 })).toContain('xlink:href="a&amp;b&lt;c&quot;.png"');
    });
  });

  describe("line", () => {
    // A multi-point line becomes one <path> per consecutive pair of
    // points, not one path with multiple segments - verified against
    // the original (see line()'s own comment on why: the `linejump`
    // filter that always wraps its real drawer splits every line()
    // call this way).
    it("draws a 2-point line as one path", () => {
      const doc = new SvgDocument();
      doc.line(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        { fill: [0, 0, 0] },
      );
      expect(doc.toString({ width: 20, height: 20 })).toContain(
        '<path d="M 0 0 L 10 0" fill="none" stroke="rgb(0,0,0)"/>',
      );
    });

    it("draws a 3-point line as two separate paths, not one combined path", () => {
      const doc = new SvgDocument();
      doc.line(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 10 },
        ],
        { fill: [0, 0, 0] },
      );
      const output = doc.toString({ width: 20, height: 20 });
      expect(output).toContain('<path d="M 0 0 L 10 0" fill="none" stroke="rgb(0,0,0)"/>');
      expect(output).toContain('<path d="M 10 0 L 10 10" fill="none" stroke="rgb(0,0,0)"/>');
      expect(output).not.toContain("L 10 0 L 10 10");
    });

    it("draws nothing for an empty point list", () => {
      const doc = new SvgDocument();
      doc.line([], { fill: [0, 0, 0] });
      expect(doc.toString({ width: 20, height: 20 })).not.toContain("<path");
    });

    it("draws nothing for a single-point line", () => {
      const doc = new SvgDocument();
      doc.line([{ x: 0, y: 0 }], { fill: [0, 0, 0] });
      expect(doc.toString({ width: 20, height: 20 })).not.toContain("<path");
    });

    it("adds a stroke-dasharray for a custom pattern, scaled by thickness", () => {
      const doc = new SvgDocument();
      doc.line(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        { fill: [0, 0, 0], thick: 2, style: { type: "custom", pattern: [8, 2] } },
      );
      expect(doc.toString({ width: 20, height: 20 })).toContain('stroke-dasharray="16 4"');
      expect(doc.toString({ width: 20, height: 20 })).toContain('stroke-width="2"');
    });
  });

  describe("text/textarea", () => {
    // Expected values were captured by running the original implementation's
    // `SVGImageDrawElement.textarea()` (vendor/blockdiag/src/blockdiag/
    // imagedraw/svg.py) against the same bundled test font, via a local
    // venv patched to restore Pillow's removed `FreeTypeFont.getsize()`
    // (reimplemented as `getbbox()`'s width/height, matching current
    // Pillow's own `getsize()` before its removal). The label's fold
    // point differs from the original by less than a pixel, tracking the
    // same width/height measurement tolerance documented in
    // font-metrics.test.ts, so only the font-independent parts of the
    // output are compared exactly.
    it("renders a single centered line as one <text> element", () => {
      const font = loadFont(VL_GOTHIC_PATH);
      const doc = new SvgDocument();
      doc.textarea({ x1: 64, y1: 40, x2: 192, y2: 80 }, "A", font, 11, { fill: [0, 0, 0], halign: "center" });
      const output = doc.toString({ width: 448, height: 120 });
      expect(output).toContain('font-family="sans-serif" font-size="11" font-weight="normal" font-style="normal"');
      expect(output).toContain('text-anchor="middle"');
      expect(output).toContain(">A<");
      // The original places this at (128.0, 64); fontkit's slightly
      // different width/height measurement for "A" shifts this by under
      // a pixel (see font-metrics.test.ts).
      const match = output.match(/x="([\d.]+)" y="([\d.]+)"[^>]*>A</);
      expect(match).not.toBeNull();
      expect(Math.abs(Number(match?.[1]) - 128)).toBeLessThan(1);
      expect(Math.abs(Number(match?.[2]) - 64)).toBeLessThan(1);
    });

    it("draws nothing for an empty label", () => {
      const font = loadFont(VL_GOTHIC_PATH);
      const doc = new SvgDocument();
      doc.textarea({ x1: 64, y1: 40, x2: 192, y2: 80 }, "", font, 11, { fill: [0, 0, 0] });
      expect(doc.toString({ width: 448, height: 120 })).not.toContain("<text");
    });

    it("draws a white outline box behind the text when given an outline color", () => {
      const font = loadFont(VL_GOTHIC_PATH);
      const doc = new SvgDocument();
      doc.textarea({ x1: 0, y1: 0, x2: 100, y2: 40 }, "A", font, 11, { fill: [0, 0, 0], outline: [0, 0, 0] });
      const output = doc.toString({ width: 100, height: 40 });
      expect(output).toContain('fill="rgb(255,255,255)" stroke="rgb(0,0,0)"');
    });
  });
});
