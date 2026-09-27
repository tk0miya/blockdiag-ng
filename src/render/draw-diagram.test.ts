import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildDiagram } from "../builder/tree-builder.js";
import { layoutDiagram } from "../layout/group-layout.js";
import { parseString } from "../parser/parser.js";
import { renderDiagramToSvg } from "./draw-diagram.js";
import { loadFont } from "./font-metrics.js";

// Expected values were captured by running the original implementation's
// DiagramDraw('SVG', diagram) (vendor/blockdiag/src/blockdiag/drawer.py)
// against equivalent source, via a local venv patched to restore
// Pillow's removed `FreeTypeFont.getsize()` (see svg-document.test.ts)
// and configured with the same bundled test font used here.

const VL_GOTHIC_PATH = join(import.meta.dirname, "../../vendor/vlgothic/VL-Gothic-Regular.ttf");

function svg(source: string): string {
  const diagram = buildDiagram(parseString(source));
  layoutDiagram(diagram);
  return renderDiagramToSvg(diagram, { font: loadFont(VL_GOTHIC_PATH) });
}

describe("renderDiagramToSvg", () => {
  it("sizes the canvas to the diagram's page size", () => {
    const output = svg("diagram { A -> B; }");
    expect(output).toContain('width="448"');
    expect(output).toContain('height="120"');
  });

  it("draws a box node's background and centered label", () => {
    const output = svg('diagram { A [label = "Hi"]; }');
    expect(output).toContain(
      '<rect x="64" y="40" width="128" height="40" fill="rgb(255,255,255)" stroke="rgb(0,0,0)"/>',
    );
    expect(output).toContain(">Hi<");
    // The original places this text at (128.5, 64) - see
    // svg-document.test.ts's note on this port's font-measurement
    // tolerance.
    const match = output.match(/x="([\d.]+)" y="([\d.]+)"[^>]*>Hi</);
    expect(match).not.toBeNull();
    expect(Math.abs(Number(match?.[1]) - 128.5)).toBeLessThan(1);
    expect(Math.abs(Number(match?.[2]) - 64)).toBeLessThan(1);
  });

  it("draws a dashed node border for style = dashed", () => {
    const output = svg("diagram { A [style = dashed]; }");
    expect(output).toContain('stroke-dasharray="4"');
  });

  it("skips the label instead of crashing for a bare `label;` attribute", () => {
    const output = svg("diagram { A [label]; }");
    expect(output).not.toContain("<text");
  });

  it("draws a box-shaped group's background, expanded beyond its own content box", () => {
    const output = svg("diagram { group G { A -> B; } }");
    expect(output).toContain(
      '<rect x="56" y="30" width="336" height="60" fill="rgb(243,152,0)" style="filter:url(#filter_blur)"/>',
    );
  });

  it("draws nothing for a line-shaped group (its border comes later, once groups render fully)", () => {
    const output = svg("diagram { group G { shape = line; A -> B; } }");
    expect(output).not.toContain("filter:url(#filter_blur)");
  });

  it("draws a square node at a fixed size, centered on its cell", () => {
    const output = svg("diagram { A [shape = square]; }");
    expect(output).toContain(
      '<rect x="104" y="36" width="48" height="48" fill="rgb(255,255,255)" stroke="rgb(0,0,0)"/>',
    );
  });

  it("draws a square node at the same fixed size regardless of its own width override", () => {
    // Verified against the original: `width` only ever widens the
    // *column* other nodes share with it - a square's own size comes
    // from the diagram-wide default node size, never the node's own
    // override (see shapes/square.ts).
    const output = svg("diagram { A [shape = square, width = 300]; }");
    expect(output).toContain('width="48" height="48"');
  });

  it("draws nothing at all for a none-shaped node, not even its label", () => {
    const output = svg('diagram { A [shape = none, label = "hidden"]; A -> B; }');
    expect(output).not.toContain("hidden");
    expect(output).not.toContain('<rect x="64"');
  });

  it("draws only the label for a textbox node, no border or fill", () => {
    const output = svg('diagram { A [shape = textbox, label = "Hi"]; }');
    expect(output).not.toContain("<rect");
    expect(output).toContain(">Hi<");
  });

  it("draws a rounded-rectangle outline for a roundedbox node", () => {
    const output = svg('diagram { A [shape = roundedbox, label = "Hi"]; }');
    expect(output).toContain(
      '<path d="M 72 40 L 184 40 A8,8 0 0 1 192 48 L 192 72 A8,8 0 0 1 184 80 L 72 80 A8,8 0 0 1 64 72 L 64 48 A8,8 0 0 1 72 40" fill="rgb(255,255,255)" stroke="rgb(0,0,0)"/>',
    );
    expect(output).toContain(">Hi<");
  });

  it("draws a circle sized to just enclose the node's own box", () => {
    const output = svg('diagram { A [shape = circle, label = "Hi"]; }');
    expect(output).toContain('<ellipse cx="128" cy="60" rx="24" ry="24" fill="rgb(255,255,255)" stroke="rgb(0,0,0)"/>');
    expect(output).toContain(">Hi<");
  });

  it("draws an ellipse filling the node's whole cell", () => {
    const output = svg('diagram { A [shape = ellipse, label = "Hi"]; }');
    expect(output).toContain('<ellipse cx="128" cy="60" rx="64" ry="20" fill="rgb(255,255,255)" stroke="rgb(0,0,0)"/>');
    expect(output).toContain(">Hi<");
  });

  it("draws a diamond extending past the node's own box, with an inset label", () => {
    const output = svg('diagram { A [shape = diamond, label = "Hi"]; }');
    expect(output).toContain(
      '<polygon points="128,32 200,60 128,88 56,60 128,32" fill="rgb(255,255,255)" stroke="rgb(0,0,0)"/>',
    );
    expect(output).toContain(">Hi<");
  });

  it("draws a diamond for the flowchart.condition alias too", () => {
    const output = svg('diagram { A [shape = flowchart.condition, label = "Hi"]; }');
    expect(output).toContain(
      '<polygon points="128,32 200,60 128,88 56,60 128,32" fill="rgb(255,255,255)" stroke="rgb(0,0,0)"/>',
    );
  });

  it("draws a small fixed-size diamond marker with its label to the right", () => {
    const output = svg('diagram { A [shape = minidiamond, label = "Hi"]; }');
    expect(output).toContain(
      '<polygon points="128,52 136,60 128,68 120,60 128,52" fill="rgb(255,255,255)" stroke="rgb(0,0,0)"/>',
    );
    expect(output).toContain(">Hi<");
  });

  it("draws three dots through the node's center in a landscape group, and no label", () => {
    const output = svg('diagram { A [shape = dots, label = "hidden"]; }');
    expect(output).not.toContain("hidden");
    expect(output).toContain('<ellipse cx="128" cy="60" rx="4" ry="4" fill="rgb(0,0,0)" stroke="rgb(0,0,0)"/>');
    expect(output).toContain('<ellipse cx="128" cy="40" rx="4" ry="4" fill="rgb(0,0,0)" stroke="rgb(0,0,0)"/>');
    expect(output).toContain('<ellipse cx="128" cy="80" rx="4" ry="4" fill="rgb(0,0,0)" stroke="rgb(0,0,0)"/>');
  });

  it("spaces dots horizontally in a portrait group", () => {
    const output = svg("diagram { orientation = portrait; A [shape = dots]; }");
    expect(output).toContain('cx="128"');
    expect(output).toContain('cx="85.33333333333334"');
    expect(output).toContain('cx="170.66666666666666"');
  });

  it("draws a cloud outline path", () => {
    const output = svg('diagram { A [shape = cloud, label = "Hi"]; }');
    expect(output).toContain(
      '<path d="M 84 56 A20,8 0 0 1 104 48 A20,6 0 0 1 154 48 A20,8 0 0 1 174 56 A20,8 0 0 1 174 72 ' +
        'A20,20 0 0 1 144 72 A20,20 0 0 1 114 72 A20,20 0 0 1 84 72 A20,8 0 0 1 84 56" ' +
        'fill="rgb(255,255,255)" stroke="rgb(0,0,0)"/>',
    );
    expect(output).toContain(">Hi<");
  });

  it("draws a note with a folded top-right corner", () => {
    const output = svg('diagram { A [shape = note, label = "Hi"]; }');
    expect(output).toContain(
      '<polygon points="64,40 176,40 192,56 192,80 64,80 64,40" fill="rgb(255,255,255)" stroke="rgb(0,0,0)"/>',
    );
    expect(output).toContain('<path d="M 176 40 L 176 56" fill="none" stroke="rgb(0,0,0)"/>');
    expect(output).toContain('<path d="M 176 56 L 192 56" fill="none" stroke="rgb(0,0,0)"/>');
    expect(output).toContain(">Hi<");
  });

  it("draws a mail with a flap across the top", () => {
    const output = svg('diagram { A [shape = mail, label = "Hi"]; }');
    expect(output).toContain(
      '<rect x="64" y="40" width="128" height="40" fill="rgb(255,255,255)" stroke="rgb(0,0,0)"/>',
    );
    expect(output).toContain('<path d="M 64 40 L 128 56" fill="none" stroke="rgb(0,0,0)"/>');
    expect(output).toContain('<path d="M 128 56 L 192 40" fill="none" stroke="rgb(0,0,0)"/>');
    expect(output).toContain(">Hi<");
  });

  it("draws an actor as a body polygon plus a head ellipse", () => {
    const output = svg('diagram { A [shape = actor, label = "Hi"]; }');
    expect(output).toContain(
      '<polygon points="130,54 130,57 140,57 140,60 130,60 130,63 138,72 134,72 128,66 122,72 118,72 ' +
        '126,63 126,60 116,60 116,57 126,57 126,54" fill="rgb(255,255,255)" stroke="rgb(0,0,0)"/>',
    );
    expect(output).toContain('<ellipse cx="128" cy="51" rx="4" ry="4" fill="rgb(255,255,255)" stroke="rgb(0,0,0)"/>');
    expect(output).toContain(">Hi<");
  });

  it("draws a beginpoint as a solid dot when the node's color is still the default", () => {
    const output = svg("diagram { A [shape = beginpoint]; }");
    expect(output).toContain('<ellipse cx="128" cy="60" rx="8" ry="8" fill="rgb(0,0,0)" stroke="rgb(0,0,0)"/>');
    expect(output).toContain(">A<");
  });

  it("draws a beginpoint with its own color when one is explicitly set", () => {
    const output = svg("diagram { A [shape = beginpoint, color = red]; }");
    expect(output).toContain('<ellipse cx="128" cy="60" rx="8" ry="8" fill="rgb(255,0,0)" stroke="rgb(0,0,0)"/>');
  });

  it("draws an endpoint as a white outer ring with a solid inner dot", () => {
    const output = svg("diagram { A [shape = endpoint]; }");
    expect(output).toContain('<ellipse cx="128" cy="60" rx="8" ry="8" fill="rgb(255,255,255)" stroke="rgb(0,0,0)"/>');
    expect(output).toContain('<ellipse cx="128" cy="60" rx="4" ry="4" fill="rgb(0,0,0)" stroke="rgb(0,0,0)"/>');
    expect(output).toContain(">A<");
  });

  it("draws an endpoint's inner dot with its own color when one is explicitly set", () => {
    const output = svg("diagram { A [shape = endpoint, color = red]; }");
    expect(output).toContain('<ellipse cx="128" cy="60" rx="4" ry="4" fill="rgb(255,0,0)" stroke="rgb(0,0,0)"/>');
  });

  it("falls back to the diagram-wide default cloud size for a non-positive width override", () => {
    // Verified against the original: `width = 0` (unlike a real
    // positive override) falls back to the default, same as `width`
    // being unset - Python's `n or fallback` falls back for any falsy
    // n, not just None (see metrics.ts's effectiveSize()).
    const output = svg('diagram { A [shape = cloud, width = 0, label = "Hi"]; }');
    expect(output).toContain(
      '<path d="M 84 56 A20,8 0 0 1 104 48 A20,6 0 0 1 154 48 A20,8 0 0 1 174 56 A20,8 0 0 1 174 72 ' +
        'A20,20 0 0 1 144 72 A20,20 0 0 1 114 72 A20,20 0 0 1 84 72 A20,8 0 0 1 84 56" ' +
        'fill="rgb(255,255,255)" stroke="rgb(0,0,0)"/>',
    );
  });
});
