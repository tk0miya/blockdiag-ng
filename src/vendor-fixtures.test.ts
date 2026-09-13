import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildDiagram } from "./builder/tree-builder.js";
import { markSkippedEdges } from "./layout/edge-routing.js";
import { layoutDiagram } from "./layout/group-layout.js";
import type { Diagram } from "./model/elements.js";
import { parseString } from "./parser/parser.js";
import { renderDiagramToSvg } from "./render/draw-diagram.js";
import { loadFont } from "./render/font-metrics.js";
import { createDiagramMetrics, pageSize } from "./render/metrics.js";
import { renderPng } from "./render/svg-to-png.js";

// Ported from `blockdiag.tests.test_generate_diagram`'s own
// `test_generate()`: a smoke test, not a golden-image comparison - the
// original's own test suite never diffs rendered output against a
// reference either (checked: `test_generate_diagram.py`'s `generate()`
// only asserts the CLI's own exit code, nothing about what it drew).
// Every `.diag` fixture vendored under `vendor/blockdiag`'s own test
// suite should parse, build, lay out, route, and render to SVG without
// throwing - using this port's own full pipeline end to end, the same
// one `renderDiagramToSvg()`'s own unit tests each exercise in
// isolation, but here across every real-world diagram shape the
// original's own authors thought worth covering, not just the cases
// this port's own tests happened to construct.
//
// PNG output gets the same kind of structural assurance as SVG above
// (does it decode to the diagram's own expected page size) rather than
// a pixel/reference-image comparison.

const DIAGRAMS_DIR = join(import.meta.dirname, "../vendor/blockdiag/src/blockdiag/tests/diagrams");
const FONT_PATH = join(import.meta.dirname, "../vendor/vlgothic/VL-Gothic-Regular.ttf");

// Ported from `get_diagram_files()`'s own `skipped` list - non-`.diag`
// fixture assets (a font, an image, `errors/`, a stray text file) that
// aren't diagram sources at all. Restricting to `.diag` files below
// already excludes all of these (including `errors/`, a directory, and
// `white.gif`/`debian-logo-*.png`, image files) without needing this
// list spelled out again - kept only as a comment cross-reference to
// the original's own equivalent.

// Three fixtures depend on features genuinely out of this port's scope,
// not bugs to fix:
const SKIPPED_FIXTURES: Record<string, string> = {
  "node_icon.diag":
    "icon = an absolute Debian-specific system path, and a remote http:// URL - neither local-file assumption nor network image fetching are in scope (see README)",
  "node_shape_namespace.diag": "shape_namespace - a shape-name-aliasing attribute this port hasn't implemented",
  "plugin_attributes.diag":
    "the `plugin` DSL statement (third-party attribute registration) - a whole extension mechanism this port hasn't implemented",
};

// `node_shape_background.diag` is the only fixture whose own image path
// (`src/blockdiag/tests/diagrams/white.gif`) is relative to
// `vendor/blockdiag` itself (where the original's own test suite runs
// from) rather than to this repo's own root (where this port's tests
// run from) - substituted for the real absolute path here rather than
// changing `process.cwd()` for one test in a suite that otherwise never
// needs to.
function resolveFixtureQuirks(fileName: string, source: string): string {
  if (fileName !== "node_shape_background.diag") return source;
  return source.replaceAll("src/blockdiag/tests/diagrams/white.gif", join(DIAGRAMS_DIR, "white.gif"));
}

function buildFixtureDiagram(file: string): Diagram {
  const source = resolveFixtureQuirks(file, readFileSync(join(DIAGRAMS_DIR, file), "utf-8"));
  const diagram = buildDiagram(parseString(source));
  layoutDiagram(diagram);
  markSkippedEdges(diagram);
  return diagram;
}

// A PNG's own width/height sit at fixed byte offsets in its leading
// IHDR chunk (right after an 8-byte signature and a 4-byte length/4-byte
// "IHDR" tag) - reading them directly here avoids decoding the whole
// image just to check its own declared size (see svg-to-png.test.ts's
// own identical helper, not reused across files for a two-line, one-off
// header read).
function pngSize(png: Buffer): { width: number; height: number } {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

const fixtureFiles = readdirSync(DIAGRAMS_DIR)
  .filter((file) => file.endsWith(".diag"))
  .sort();

describe("vendored fixture diagrams", () => {
  const font = loadFont(FONT_PATH);

  it("has actually found the vendored fixtures (not silently testing zero of them)", () => {
    expect(fixtureFiles.length).toBeGreaterThan(100);
  });

  describe("SVG", () => {
    for (const file of fixtureFiles) {
      const skipReason = SKIPPED_FIXTURES[file];
      const runner = skipReason !== undefined ? it.skip : it;

      runner(`renders ${file} to SVG without throwing${skipReason ? ` (${skipReason})` : ""}`, () => {
        const diagram = buildFixtureDiagram(file);
        const svg = renderDiagramToSvg(diagram, { font });
        expect(svg).toContain("<svg");
      });
    }
  });

  describe("PNG", () => {
    for (const file of fixtureFiles) {
      const skipReason = SKIPPED_FIXTURES[file];
      const runner = skipReason !== undefined ? it.skip : it;

      runner(`rasterizes ${file} to a PNG matching its own page size${skipReason ? ` (${skipReason})` : ""}`, () => {
        const diagram = buildFixtureDiagram(file);
        const svg = renderDiagramToSvg(diagram, { font });
        const metrics = createDiagramMetrics(diagram);
        const expectedSize = pageSize(metrics, diagram.colwidth, diagram.colheight);

        const png = renderPng(svg, FONT_PATH, font.familyName);
        expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
        expect(pngSize(png)).toEqual({ width: expectedSize.width, height: expectedSize.height });
      });
    }
  });
});
