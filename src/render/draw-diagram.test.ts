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
});
