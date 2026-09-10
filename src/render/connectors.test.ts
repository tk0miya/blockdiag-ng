import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildDiagram } from "../builder/tree-builder.js";
import { layoutDiagram } from "../layout/group-layout.js";
import type { Diagram, DiagramNode } from "../model/elements.js";
import { parseString } from "../parser/parser.js";
import { nodeConnectors } from "./connectors.js";
import { loadFont } from "./font-metrics.js";
import { createDiagramMetrics } from "./metrics.js";

// Expected values were captured by running the original implementation's
// node shape classes directly (vendor/blockdiag/src/blockdiag/
// noderenderer/*.py, each shape's own `self.connectors`/`.top`/`.right`/
// `.bottom`/`.left`) against equivalent source, via a local venv patched
// to restore Pillow's removed `FreeTypeFont.getsize()` (see
// draw-diagram.test.ts) and configured with the same bundled test font
// used here.

const VL_GOTHIC_PATH = join(import.meta.dirname, "../../vendor/vlgothic/VL-Gothic-Regular.ttf");
const ICON_PATH = join(import.meta.dirname, "test-fixtures/icon.png");
const FONT = loadFont(VL_GOTHIC_PATH);
const FONT_SIZE = 11;

function firstNode(source: string): { diagram: Diagram; node: DiagramNode } {
  const diagram = buildDiagram(parseString(source));
  layoutDiagram(diagram);
  return { diagram, node: diagram.nodes[0] as DiagramNode };
}

describe("nodeConnectors", () => {
  it("uses the node's own box edge midpoints by default (box, and every other shape without its own override)", () => {
    const { diagram, node } = firstNode("diagram { A [shape = box]; }");
    const metrics = createDiagramMetrics(diagram);
    expect(nodeConnectors(metrics, node, FONT, FONT_SIZE)).toEqual({
      top: { x: 128, y: 40 },
      right: { x: 192, y: 60 },
      bottom: { x: 128, y: 80 },
      left: { x: 64, y: 60 },
    });
  });

  it("extends right/bottom by a further cellsize for a stacked node, reaching past its duplicate layers", () => {
    const { diagram, node } = firstNode("diagram { A [shape = box, stacked]; }");
    const metrics = createDiagramMetrics(diagram);
    expect(nodeConnectors(metrics, node, FONT, FONT_SIZE)).toEqual({
      top: { x: 128, y: 40 },
      right: { x: 200, y: 60 },
      bottom: { x: 128, y: 88 },
      left: { x: 64, y: 60 },
    });
  });

  it("sizes a circle from the node's own (possibly widened) box", () => {
    const { diagram, node } = firstNode("diagram { A [shape = circle]; }");
    const metrics = createDiagramMetrics(diagram);
    expect(nodeConnectors(metrics, node, FONT, FONT_SIZE)).toEqual({
      top: { x: 128, y: 36 },
      right: { x: 152, y: 60 },
      bottom: { x: 128, y: 84 },
      left: { x: 104, y: 60 },
    });
  });

  it("widens a circle to enclose a custom node width", () => {
    const { diagram, node } = firstNode("diagram { A [shape = circle, width = 300]; }");
    const metrics = createDiagramMetrics(diagram);
    expect(nodeConnectors(metrics, node, FONT, FONT_SIZE)).toEqual({
      top: { x: 214, y: 36 },
      right: { x: 238, y: 60 },
      bottom: { x: 214, y: 84 },
      left: { x: 190, y: 60 },
    });
  });

  it("centers a square on the node's own (possibly widened) box, but always at the diagram-wide default size", () => {
    const { diagram, node } = firstNode("diagram { A [shape = square]; }");
    const metrics = createDiagramMetrics(diagram);
    expect(nodeConnectors(metrics, node, FONT, FONT_SIZE)).toEqual({
      top: { x: 128, y: 36 },
      right: { x: 152, y: 60 },
      bottom: { x: 128, y: 84 },
      left: { x: 104, y: 60 },
    });
  });

  it("re-centers (without resizing) a square for a node with a custom width", () => {
    const { diagram, node } = firstNode("diagram { A [shape = square, width = 300]; }");
    const metrics = createDiagramMetrics(diagram);
    expect(nodeConnectors(metrics, node, FONT, FONT_SIZE)).toEqual({
      top: { x: 214, y: 36 },
      right: { x: 238, y: 60 },
      bottom: { x: 214, y: 84 },
      left: { x: 190, y: 60 },
    });
  });

  it("extends a diamond's points cellsize beyond the node's own box edges", () => {
    const { diagram, node } = firstNode("diagram { A [shape = diamond]; }");
    const metrics = createDiagramMetrics(diagram);
    expect(nodeConnectors(metrics, node, FONT, FONT_SIZE)).toEqual({
      top: { x: 128, y: 32 },
      right: { x: 200, y: 60 },
      bottom: { x: 128, y: 88 },
      left: { x: 56, y: 60 },
    });
  });

  it("uses the same connectors for flowchart.condition as diamond", () => {
    const { diagram, node } = firstNode("diagram { A [shape = flowchart.condition]; }");
    const metrics = createDiagramMetrics(diagram);
    expect(nodeConnectors(metrics, node, FONT, FONT_SIZE)).toEqual({
      top: { x: 128, y: 32 },
      right: { x: 200, y: 60 },
      bottom: { x: 128, y: 88 },
      left: { x: 56, y: 60 },
    });
  });

  it("sizes a minidiamond as a small, fixed-radius marker centered on the node", () => {
    const { diagram, node } = firstNode("diagram { A [shape = minidiamond]; }");
    const metrics = createDiagramMetrics(diagram);
    expect(nodeConnectors(metrics, node, FONT, FONT_SIZE)).toEqual({
      top: { x: 128, y: 52 },
      right: { x: 136, y: 60 },
      bottom: { x: 128, y: 68 },
      left: { x: 120, y: 60 },
    });
  });

  it("gives beginpoint the same fixed-radius marker connectors as minidiamond", () => {
    const { diagram, node } = firstNode("diagram { A [shape = beginpoint]; }");
    const metrics = createDiagramMetrics(diagram);
    expect(nodeConnectors(metrics, node, FONT, FONT_SIZE)).toEqual({
      top: { x: 128, y: 52 },
      right: { x: 136, y: 60 },
      bottom: { x: 128, y: 68 },
      left: { x: 120, y: 60 },
    });
  });

  it("gives endpoint the same fixed-radius marker connectors as beginpoint", () => {
    const { diagram, node } = firstNode("diagram { A [shape = endpoint]; }");
    const metrics = createDiagramMetrics(diagram);
    expect(nodeConnectors(metrics, node, FONT, FONT_SIZE)).toEqual({
      top: { x: 128, y: 52 },
      right: { x: 136, y: 60 },
      bottom: { x: 128, y: 68 },
      left: { x: 120, y: 60 },
    });
  });

  it("collapses every connector of a none-shaped node onto its own center", () => {
    const { diagram, node } = firstNode("diagram { A [shape = none]; }");
    const metrics = createDiagramMetrics(diagram);
    expect(nodeConnectors(metrics, node, FONT, FONT_SIZE)).toEqual({
      top: { x: 128, y: 60 },
      right: { x: 128, y: 60 },
      bottom: { x: 128, y: 60 },
      left: { x: 128, y: 60 },
    });
  });

  it("shrinks an actor's connectors around its label-height-dependent radius, without a label", () => {
    const { diagram, node } = firstNode('diagram { A [shape = actor, label = ""]; }');
    const metrics = createDiagramMetrics(diagram);
    expect(nodeConnectors(metrics, node, FONT, FONT_SIZE)).toEqual({
      top: { x: 128, y: 38 },
      right: { x: 148, y: 60 },
      bottom: { x: 128, y: 80 },
      left: { x: 108, y: 60 },
    });
  });

  it("leaves room below an actor's connectors for its own label height", () => {
    const { diagram, node } = firstNode('diagram { A [shape = actor, label = "hi"]; }');
    const metrics = createDiagramMetrics(diagram);
    expect(nodeConnectors(metrics, node, FONT, FONT_SIZE)).toEqual({
      top: { x: 128, y: 47 },
      right: { x: 140, y: 60 },
      bottom: { x: 128, y: 84 },
      left: { x: 116, y: 60 },
    });
  });

  it("leaves a textbox's connectors at the plain box default when it has neither icon nor background", () => {
    const { diagram, node } = firstNode('diagram { A [shape = textbox, label = "hi"]; }');
    const metrics = createDiagramMetrics(diagram);
    expect(nodeConnectors(metrics, node, FONT, FONT_SIZE)).toEqual({
      top: { x: 128, y: 40 },
      right: { x: 192, y: 60 },
      bottom: { x: 128, y: 80 },
      left: { x: 64, y: 60 },
    });
  });

  it("shrinks a textbox's connectors to its background image's own (unscaled, since it already fits) size", () => {
    const { diagram, node } = firstNode(`diagram { A [shape = textbox, label = "hi", background = "${ICON_PATH}"]; }`);
    const metrics = createDiagramMetrics(diagram);
    expect(nodeConnectors(metrics, node, FONT, FONT_SIZE)).toEqual({
      top: { x: 128, y: 52 },
      right: { x: 144, y: 60 },
      bottom: { x: 128, y: 68 },
      left: { x: 112, y: 60 },
    });
  });

  it("overrides a textbox's left connector to the icon's own right edge, combined with a background", () => {
    const { diagram, node } = firstNode(
      `diagram { A [shape = textbox, label = "hi", icon = "${ICON_PATH}", background = "${ICON_PATH}"]; }`,
    );
    const metrics = createDiagramMetrics(diagram);
    expect(nodeConnectors(metrics, node, FONT, FONT_SIZE)).toEqual({
      top: { x: 144, y: 52 },
      right: { x: 160, y: 60 },
      bottom: { x: 144, y: 68 },
      left: { x: 64, y: 60 },
    });
  });

  // Unlike every other case in this file, there's no Python-captured
  // value to compare against here: the original genuinely crashes on
  // this input (`UnboundLocalError: cannot access local variable 'pt'`,
  // reproduced against the same venv used for the cases above) - the
  // real bug documented in connectors.ts's `textboxConnectors()`. This
  // only checks that the fixed port computes something sensible instead
  // of crashing - and, ported faithfully, that "something" turns out to
  // be no different from the plain box default: without a `background`,
  // `connectors` is never reassigned from its base-class default, and
  // the `icon` override only replaces `left`'s own y (to `pt.y`, itself
  // still the box's own vertical center) - its x comes from the icon's
  // own left edge, which sits flush with the box's own left edge to
  // begin with. So `icon` alone doesn't actually narrow a textbox's
  // connectors at all, even though it does narrow its label (icon.ts).
  it("computes an icon-narrowed textbox's connectors without a background, unlike the original (see textboxConnectors())", () => {
    const { diagram, node } = firstNode(`diagram { A [shape = textbox, label = "hi", icon = "${ICON_PATH}"]; }`);
    const metrics = createDiagramMetrics(diagram);
    expect(nodeConnectors(metrics, node, FONT, FONT_SIZE)).toEqual({
      top: { x: 128, y: 40 },
      right: { x: 192, y: 60 },
      bottom: { x: 128, y: 80 },
      left: { x: 64, y: 60 },
    });
  });
});
