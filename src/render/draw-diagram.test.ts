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
});
