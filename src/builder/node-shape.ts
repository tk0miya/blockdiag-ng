// Ported from the original implementation's `DiagramNode.set_shape()`
// (vendor/blockdiag/src/blockdiag/elements.py), which validates a shape
// name against the renderers registered under
// vendor/blockdiag/src/blockdiag/noderenderer/. That registry doesn't
// exist here yet (renderers land in Phase 3), so this instead validates
// against the fixed list of shapes the original registers (the
// `[blockdiag_noderenderer]` entry points in vendor/blockdiag/setup.py):
// box, roundedbox, square, none, textbox (rectangular); circle, ellipse,
// diamond, minidiamond, dots (geometric); cloud, note, mail, actor,
// beginpoint, endpoint (special notation); and the namespaced
// flowchart.database/input/loopin/loopout/terminator shapes.
import { AttributeError } from "./attributes.js";

const NODE_SHAPES: ReadonlySet<string> = new Set([
  "actor",
  "beginpoint",
  "box",
  "circle",
  "cloud",
  "diamond",
  "dots",
  "ellipse",
  "endpoint",
  "flowchart.database",
  "flowchart.input",
  "flowchart.loopin",
  "flowchart.loopout",
  "flowchart.terminator",
  "mail",
  "minidiamond",
  "none",
  "note",
  "roundedbox",
  "square",
  "textbox",
]);

export function parseNodeShape(value: string): string {
  if (!NODE_SHAPES.has(value)) {
    throw new AttributeError(`unknown node shape: ${value}`);
  }
  return value;
}
