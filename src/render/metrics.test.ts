import { describe, expect, it } from "vitest";
import { buildDiagram } from "../builder/tree-builder.js";
import { layoutDiagram } from "../layout/group-layout.js";
import type { Diagram, DiagramNode } from "../model/elements.js";
import { parseString } from "../parser/parser.js";
import { createDiagramMetrics, nodeBox, pageSize } from "./metrics.js";

// Expected pixel boxes and page sizes were captured by running the
// original implementation's DiagramDraw('SVG', diagram) (vendor/
// blockdiag/src/blockdiag/drawer.py, metrics.py) against equivalent
// source, via a local venv.

function diagram(source: string): Diagram {
  const d = buildDiagram(parseString(source));
  layoutDiagram(d);
  return d;
}

describe("createDiagramMetrics / nodeBox / pageSize", () => {
  it("sizes a plain two-node diagram using every default", () => {
    const d = diagram("diagram { A -> B; }");
    const metrics = createDiagramMetrics(d);
    const [a, b] = d.nodes as DiagramNode[];
    expect(nodeBox(metrics, a)).toEqual({ x1: 64, y1: 40, x2: 192, y2: 80 });
    expect(nodeBox(metrics, b)).toEqual({ x1: 256, y1: 40, x2: 384, y2: 80 });
    expect(pageSize(metrics, d.colwidth, d.colheight)).toEqual({ width: 448, height: 120 });
  });

  it("grows a second row's boxes below the first", () => {
    const d = diagram("diagram { A -> B; A -> C; }");
    const metrics = createDiagramMetrics(d);
    const [a, b, c] = d.nodes as DiagramNode[];
    expect(nodeBox(metrics, a)).toEqual({ x1: 64, y1: 40, x2: 192, y2: 80 });
    expect(nodeBox(metrics, b)).toEqual({ x1: 256, y1: 40, x2: 384, y2: 80 });
    expect(nodeBox(metrics, c)).toEqual({ x1: 256, y1: 120, x2: 384, y2: 160 });
    expect(pageSize(metrics, d.colwidth, d.colheight)).toEqual({ width: 448, height: 200 });
  });

  it("grows a whole column to fit one node's custom width", () => {
    const d = diagram("diagram { A [width = 200]; A -> B; }");
    const metrics = createDiagramMetrics(d);
    const [a, b] = d.nodes as DiagramNode[];
    expect(nodeBox(metrics, a)).toEqual({ x1: 64, y1: 40, x2: 264, y2: 80 });
    expect(nodeBox(metrics, b)).toEqual({ x1: 328, y1: 40, x2: 456, y2: 80 });
    expect(pageSize(metrics, d.colwidth, d.colheight)).toEqual({ width: 520, height: 120 });
  });

  it("centers a default-width node within a column widened by its neighbor", () => {
    const d = diagram("diagram { A -> B; A -> C; C [width = 200]; }");
    const metrics = createDiagramMetrics(d);
    const [a, b, c] = d.nodes as DiagramNode[];
    expect(nodeBox(metrics, a)).toEqual({ x1: 64, y1: 40, x2: 192, y2: 80 });
    expect(nodeBox(metrics, b)).toEqual({ x1: 292, y1: 40, x2: 420, y2: 80 });
    expect(nodeBox(metrics, c)).toEqual({ x1: 256, y1: 120, x2: 456, y2: 160 });
    expect(pageSize(metrics, d.colwidth, d.colheight)).toEqual({ width: 520, height: 200 });
  });
});
