import { describe, expect, it } from "vitest";
import { buildDiagram } from "../builder/tree-builder.js";
import { layoutDiagram } from "../layout/group-layout.js";
import { parseString } from "../parser/parser.js";
import { renderDiagramToSvg } from "./draw-diagram.js";

// Expected values were captured by running the original implementation's
// DiagramDraw('SVG', diagram)._draw_background() (vendor/blockdiag/src/
// blockdiag/drawer.py) and .pagesize() against equivalent source, via a
// local venv. (DiagramDraw.draw()'s full pipeline isn't runnable in that
// venv - it hits an unrelated Pillow API incompatibility measuring node
// label text - so this compares only what _draw_background() itself
// produces, matching this step's own scope.)

function svg(source: string): string {
  const diagram = buildDiagram(parseString(source));
  layoutDiagram(diagram);
  return renderDiagramToSvg(diagram);
}

describe("renderDiagramToSvg", () => {
  it("sizes the canvas to the diagram's page size", () => {
    const output = svg("diagram { A -> B; }");
    expect(output).toContain('width="448"');
    expect(output).toContain('height="120"');
    expect(output).not.toContain("<rect");
  });

  it("draws a box-shaped group's background, expanded beyond its own content box", () => {
    const output = svg("diagram { group G { A -> B; } }");
    expect(output).toContain(
      '<rect x="56" y="30" width="336" height="60" fill="rgb(243,152,0)" style="filter:url(#filter_blur)"/>',
    );
  });

  it("draws nothing for a line-shaped group (its border comes later, once groups render fully)", () => {
    const output = svg("diagram { group G { shape = line; A -> B; } }");
    expect(output).not.toContain("<rect");
  });
});
