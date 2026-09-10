import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildDiagram } from "../builder/tree-builder.js";
import { markSkippedEdges } from "../layout/edge-routing.js";
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
const ICON_PATH = join(import.meta.dirname, "test-fixtures/icon.png");
const LARGE_ICON_PATH = join(import.meta.dirname, "test-fixtures/icon-large.png");

function svg(source: string): string {
  const diagram = buildDiagram(parseString(source));
  layoutDiagram(diagram);
  markSkippedEdges(diagram);
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

  // Locks in a real, verified-against-the-original finding: `fontfamily`
  // has no rendering effect at all through the DSL alone - see
  // svg-document.ts's own `text()` comment for why.
  it("ignores a node's own fontfamily attribute, matching the original's own real behavior", () => {
    const output = svg('diagram { A [label = "Hi", fontfamily = "serif-bold"]; }');
    expect(output).toContain('font-family="sans-serif" font-size="11" font-weight="normal" font-style="normal"');
  });

  it("ignores a diagram-wide default_fontfamily attribute the same way", () => {
    const output = svg('diagram { default_fontfamily = "serif-bold"; A [label = "Hi"]; }');
    expect(output).toContain('font-family="sans-serif" font-size="11" font-weight="normal" font-style="normal"');
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

  it("draws no filled background for a line-shaped group - only its own outlined border, once every node/edge is drawn", () => {
    const output = svg("diagram { group G { shape = line; A -> B; } }");
    // No fill="rgb(243,152,0)" (the group's own default color, used as
    // its background fill for a box-shaped group) anywhere - only its
    // own border, outlined in that same default color.
    expect(output).not.toContain('fill="rgb(243,152,0)"');
    const shaftIndex = output.indexOf('<path d="M 192 60 L 248 60"');
    const borderIndex = output.indexOf(
      '<rect x="56" y="30" width="336" height="60" fill="none" stroke="rgb(243,152,0)" stroke-width="3"/>',
    );
    expect(shaftIndex).toBeGreaterThan(-1);
    expect(borderIndex).toBeGreaterThan(shaftIndex);
  });

  it("passes a line-shaped group's own color/style/thick through to its border", () => {
    const output = svg('diagram { group G { shape = line; color = red; style = dashed; label = "grp"; A -> B; } }');
    expect(output).toContain(
      '<rect x="56" y="30" width="336" height="60" fill="none" stroke="rgb(255,0,0)" stroke-width="3" stroke-dasharray="12"/>',
    );
  });

  it("draws a group's own label in a strip above its box, after its border", () => {
    const output = svg('diagram { group G { shape = line; label = "grp"; A -> B; } }');
    const borderIndex = output.indexOf('<rect x="56" y="30" width="336" height="60"');
    const labelMatch = output.match(/<text x="([\d.]+)" y="([\d.]+)"[^>]*>grp</);
    expect(borderIndex).toBeGreaterThan(-1);
    expect(labelMatch).not.toBeNull();
    expect(output.indexOf(labelMatch?.[0] as string)).toBeGreaterThan(borderIndex);
    // The original places this at (224, 34) - see svg-document.test.ts's
    // note on this port's font-measurement tolerance.
    expect(Math.abs(Number(labelMatch?.[1]) - 224)).toBeLessThan(1);
    expect(Math.abs(Number(labelMatch?.[2]) - 34)).toBeLessThan(1);
  });

  it("draws a box-shaped group's own label too, in the same strip above its box", () => {
    const output = svg('diagram { group G { label = "grp"; A -> B; } }');
    const labelMatch = output.match(/<text x="([\d.]+)" y="([\d.]+)"[^>]*>grp</);
    expect(labelMatch).not.toBeNull();
    expect(Math.abs(Number(labelMatch?.[1]) - 224)).toBeLessThan(1);
    expect(Math.abs(Number(labelMatch?.[2]) - 34)).toBeLessThan(1);
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

  it("draws a database cylinder with a highlighted cap", () => {
    const output = svg('diagram { A [shape = flowchart.database, label = "Hi"]; }');
    expect(output).toContain(
      '<path d="M 64 48 A64,8 0 0 1 192 48 L 192 72 A64,8 0 0 1 64 72 L 64 48" fill="rgb(255,255,255)" stroke="rgb(0,0,0)"/>',
    );
    expect(output).toContain('<path d="M 192 48 A64,8 0 0 1 64 48" fill="rgb(255,255,255)" stroke="rgb(0,0,0)"/>');
    expect(output).toContain(">Hi<");
  });

  it("draws a database cylinder at the same fixed radius regardless of its own width override", () => {
    // Verified against the original: the arc radius comes from the
    // diagram-wide default node width, never the node's own override -
    // same pattern as `square` (Step 14).
    const output = svg("diagram { A [shape = flowchart.database, width = 300]; }");
    expect(output).toContain("A64,8 0 0 1");
  });

  it("draws an input parallelogram", () => {
    const output = svg('diagram { A [shape = flowchart.input, label = "Hi"]; }');
    expect(output).toContain(
      '<polygon points="88,40 192,40 168,80 64,80 88,40" fill="rgb(255,255,255)" stroke="rgb(0,0,0)"/>',
    );
    expect(output).toContain(">Hi<");
  });

  it("draws a loopin shape notched at the top-left", () => {
    const output = svg('diagram { A [shape = flowchart.loopin, label = "Hi"]; }');
    expect(output).toContain(
      '<polygon points="96,40 160,40 192,50 192,80 64,80 64,50 96,40" fill="rgb(255,255,255)" stroke="rgb(0,0,0)"/>',
    );
    expect(output).toContain(">Hi<");
  });

  it("draws a loopout shape notched at the bottom-right", () => {
    const output = svg('diagram { A [shape = flowchart.loopout, label = "Hi"]; }');
    expect(output).toContain(
      '<polygon points="64,40 192,40 192,70 160,80 96,80 64,70 64,40" fill="rgb(255,255,255)" stroke="rgb(0,0,0)"/>',
    );
    expect(output).toContain(">Hi<");
  });

  it("draws a terminator pill shape", () => {
    const output = svg('diagram { A [shape = flowchart.terminator, label = "Hi"]; }');
    expect(output).toContain(
      '<path d="M 80 40 L 176 40 A16,20 0 0 1 176 80 L 80 80 A16,20 0 0 1 80 40" fill="rgb(255,255,255)" stroke="rgb(0,0,0)"/>',
    );
    expect(output).toContain(">Hi<");
  });

  it("draws a terminator's end caps at the same fixed radius regardless of its own height override", () => {
    // Verified against the original: the end caps' radius comes from
    // the diagram-wide default node height, never the node's own
    // override - same pattern as `database` above.
    const output = svg("diagram { A [shape = flowchart.terminator, height = 100]; }");
    expect(output).toContain("A16,20 0 0 1");
  });

  describe("node shadows", () => {
    it("draws a shadow behind a node, on by default, before the node itself", () => {
      const output = svg('diagram { A [label = "Hi"]; }');
      const shadowIndex = output.indexOf('x="67" y="46"');
      const nodeIndex = output.indexOf('x="64" y="40"');
      expect(shadowIndex).toBeGreaterThan(-1);
      expect(nodeIndex).toBeGreaterThan(shadowIndex);
      expect(output).toContain(
        '<rect x="67" y="46" width="128" height="40" fill="rgb(0,0,0)" stroke="rgb(0,0,0)" style="filter:url(#filter_blur);opacity:0.7;fill-opacity:1"/>',
      );
    });

    it("draws no shadow at all when shadow_style = none", () => {
      const output = svg('diagram { shadow_style = none; A [label = "Hi"]; }');
      expect(output).not.toContain('x="67" y="46"');
    });

    it("draws a flat, unblurred shadow when shadow_style = solid", () => {
      const output = svg('diagram { shadow_style = solid; A [label = "Hi"]; }');
      expect(output).toContain('<rect x="67" y="46" width="128" height="40" fill="rgb(0,0,0)" stroke="rgb(0,0,0)"/>');
    });

    it("casts no shadow for a node whose own color is literally none", () => {
      const output = svg('diagram { A [label = "Hi", color = none]; }');
      expect(output).not.toContain('x="67" y="46"');
      expect(output).toContain('<rect x="64" y="40" width="128" height="40" fill="none" stroke="rgb(0,0,0)"/>');
    });

    it("shifts a diamond's whole outline for its shadow, not just its bounding box", () => {
      const output = svg('diagram { A [shape = diamond, label = "Hi"]; }');
      expect(output).toContain(
        '<polygon points="131,38 203,66 131,94 59,66 131,38" fill="rgb(0,0,0)" stroke="rgb(0,0,0)" style="filter:url(#filter_blur);opacity:0.7;fill-opacity:1"/>',
      );
    });

    it("draws only the box's shadow for mail, not the flap line's", () => {
      const output = svg('diagram { A [shape = mail, label = "Hi"]; }');
      expect(output).toContain(
        '<rect x="67" y="46" width="128" height="40" fill="rgb(0,0,0)" stroke="rgb(0,0,0)" style="filter:url(#filter_blur);opacity:0.7;fill-opacity:1"/>',
      );
      // Only two paths total (the flap line, split into two segments by
      // line()'s own point-pair splitting) - no shadow-shifted third or
      // fourth path for the flap.
      expect(output.match(/<path/g)).toHaveLength(2);
    });

    it("draws a rounded-rectangle shadow by rebuilding the same path from a shifted box", () => {
      const output = svg('diagram { A [shape = roundedbox, label = "Hi"]; }');
      expect(output).toContain(
        '<path d="M 75 46 L 187 46 A8,8 0 0 1 195 54 L 195 78 A8,8 0 0 1 187 86 L 75 86 A8,8 0 0 1 67 78 L 67 54 A8,8 0 0 1 75 46" fill="rgb(0,0,0)" stroke="rgb(0,0,0)" style="filter:url(#filter_blur);opacity:0.7;fill-opacity:1"/>',
      );
    });

    it("shifts an actor's body and head independently, with no outline on the body's shadow but the node's own linecolor on the head's", () => {
      // Verified against the original: the body's shadow polygon omits
      // `outline` entirely (so no `stroke` attribute at all), while the
      // head's shadow ellipse keeps `node.linecolor` (not the shadow
      // color) as its own outline - the only shape whose shadow branch
      // draws two independently-colored pieces.
      const output = svg('diagram { A [shape = actor, label = "Hi", linecolor = red]; }');
      expect(output).toContain(
        '<polygon points="133,60 133,63 143,63 143,66 133,66 133,69 141,78 137,78 131,72 125,78 121,78 129,69 129,66 119,66 119,63 129,63 129,60" fill="rgb(0,0,0)" style="filter:url(#filter_blur);opacity:0.7;fill-opacity:1"/>',
      );
      expect(output).toContain(
        '<ellipse cx="131" cy="57" rx="4" ry="4" fill="rgb(0,0,0)" stroke="rgb(255,0,0)" style="filter:url(#filter_blur);opacity:0.7;fill-opacity:1"/>',
      );
    });
  });

  describe("number badge", () => {
    it("draws a circled number over a node's own top-left corner", () => {
      const output = svg('diagram { A [label = "Hi", numbered = 1]; }');
      expect(output).toContain(
        '<ellipse cx="64" cy="40" rx="12" ry="12" fill="rgb(255,192,203)" stroke="rgb(0,0,0)"/>',
      );
      expect(output).toContain(">1<");
    });

    it("positions the badge from the node's raw grid box, independent of its shape", () => {
      // Verified against the original: a circle-shaped node's badge
      // still sits at its plain grid-box corner (64, 40), not
      // recentered around the circle's own larger, differently
      // positioned outline.
      const output = svg('diagram { A [shape = circle, label = "Hi", numbered = 12]; }');
      expect(output).toContain(
        '<ellipse cx="64" cy="40" rx="12" ry="12" fill="rgb(255,192,203)" stroke="rgb(0,0,0)"/>',
      );
      expect(output).toContain(">12<");
    });

    it("draws no badge for a node without a numbered attribute", () => {
      const output = svg('diagram { A [label = "Hi"]; }');
      expect(output).not.toContain("rgb(255,192,203)");
    });

    it("draws the badge even when shadow_style = none (it never has a shadow of its own)", () => {
      const output = svg('diagram { shadow_style = none; A [label = "Hi", numbered = 1]; }');
      expect(output).toContain(
        '<ellipse cx="64" cy="40" rx="12" ry="12" fill="rgb(255,192,203)" stroke="rgb(0,0,0)"/>',
      );
    });
  });

  // Expected values here are derived from the metrics/icon formulas
  // directly (see icon.ts), not captured from a live Python run like the
  // rest of this file - there's no real image file path to feed through
  // an equivalent original run in this environment.
  describe("icon", () => {
    it("draws a box node's icon flush against its top-left corner, vertically centered", () => {
      const output = svg(`diagram { A [label = "Hi", icon = "${ICON_PATH}"]; }`);
      // icon.png is 32x16 - already within half the default node width
      // (64) and the full node height (40), so it draws unscaled.
      expect(output).toContain(`<image x="64" y="52" width="32" height="16" xlink:href="${ICON_PATH}"/>`);
    });

    it("scales a too-large icon down to fit, preserving aspect ratio", () => {
      const output = svg(`diagram { A [label = "Hi", icon = "${LARGE_ICON_PATH}"]; }`);
      // icon-large.png is 200x100, bounded to 64x40: scales to 64x32
      // (see images.test.ts's calcImageSize cases for the same math).
      expect(output).toContain(`<image x="64" y="44" width="64" height="32" xlink:href="${LARGE_ICON_PATH}"/>`);
    });

    it("draws an icon for a shape that doesn't narrow its own label around it", () => {
      // circle overrides its own textbox unconditionally (see
      // shapes/circle.ts) - the icon itself still draws regardless,
      // since render_icon() is shape-independent in the original.
      const output = svg(`diagram { A [shape = circle, label = "Hi", icon = "${ICON_PATH}"]; }`);
      expect(output).toContain(`<image x="64" y="52" width="32" height="16" xlink:href="${ICON_PATH}"/>`);
    });

    it("narrows a box node's label to sit beside its icon, shifting it right by half the icon's width", () => {
      // Without an icon, "Hi" centers at x=128 (the plain box's own
      // center - see the "draws a box node's background..." case
      // above, which places it at 128.5). With this icon (32 wide),
      // the label's own box narrows to (96, 192) - centering it 16px
      // further right instead.
      const withoutIcon = svg('diagram { A [label = "Hi"]; }');
      const withIcon = svg(`diagram { A [label = "Hi", icon = "${ICON_PATH}"]; }`);
      const before = withoutIcon.match(/x="([\d.]+)" y="([\d.]+)"[^>]*>Hi</);
      const after = withIcon.match(/x="([\d.]+)" y="([\d.]+)"[^>]*>Hi</);
      expect(before).not.toBeNull();
      expect(after).not.toBeNull();
      expect(Number(after?.[1]) - Number(before?.[1])).toBeCloseTo(16, 0);
      expect(Number(after?.[2])).toBeCloseTo(Number(before?.[2]), 0);
    });

    it("draws no icon for a node without an icon attribute", () => {
      const output = svg('diagram { A [label = "Hi"]; }');
      expect(output).not.toContain("<image");
    });
  });

  // Expected values here are derived from the metrics/background formulas
  // directly (see each shape's own file), not captured from a live
  // Python run like the rest of this file - same as the "icon" cases
  // above.
  describe("background", () => {
    // Unlike `icon` (icon.ts), every shape here but `textbox` just
    // stretches the image into its own existing box - via the SVG
    // `<image>` element's own width/height, the same way any browser
    // stretches an <img> to a given size - rather than scaling it down
    // to fit first. So the resulting <image> is always exactly that
    // box's own size, regardless of the source image's real dimensions.
    it("draws a box node's background image, stretched to its own box, over its own fill and under its outline", () => {
      const output = svg(`diagram { A [label = "Hi", background = "${ICON_PATH}"]; }`);
      const fillIndex = output.indexOf(
        '<rect x="64" y="40" width="128" height="40" fill="rgb(255,255,255)" stroke="rgb(255,255,255)"/>',
      );
      const imageIndex = output.indexOf(`<image x="64" y="40" width="128" height="40" xlink:href="${ICON_PATH}"/>`);
      const outlineIndex = output.indexOf(
        '<rect x="64" y="40" width="128" height="40" fill="none" stroke="rgb(0,0,0)"/>',
      );
      expect(fillIndex).toBeGreaterThanOrEqual(0);
      expect(imageIndex).toBeGreaterThan(fillIndex);
      expect(outlineIndex).toBeGreaterThan(imageIndex);
    });

    it("stretches a box node's background image to the same box regardless of the source image's own size", () => {
      const output = svg(`diagram { A [label = "Hi", background = "${LARGE_ICON_PATH}"]; }`);
      expect(output).toContain(`<image x="64" y="40" width="128" height="40" xlink:href="${LARGE_ICON_PATH}"/>`);
    });

    it("draws a circle node's background image into its own (larger) textbox", () => {
      const output = svg(`diagram { A [shape = circle, label = "Hi", background = "${ICON_PATH}"]; }`);
      expect(output).toContain(`<image x="104" y="36" width="48" height="48" xlink:href="${ICON_PATH}"/>`);
    });

    it("draws a square node's background image the same way as circle", () => {
      const output = svg(`diagram { A [shape = square, label = "Hi", background = "${ICON_PATH}"]; }`);
      expect(output).toContain(`<image x="104" y="36" width="48" height="48" xlink:href="${ICON_PATH}"/>`);
    });

    it("draws an ellipse node's background image into its narrower inset box", () => {
      const output = svg(`diagram { A [shape = ellipse, label = "Hi", background = "${ICON_PATH}"]; }`);
      expect(output).toContain(`<image x="72" y="48" width="112" height="24" xlink:href="${ICON_PATH}"/>`);
    });

    it("draws a diamond node's background image into its inset box", () => {
      const output = svg(`diagram { A [shape = diamond, label = "Hi", background = "${ICON_PATH}"]; }`);
      expect(output).toContain(`<image x="92" y="46" width="72" height="28" xlink:href="${ICON_PATH}"/>`);
    });

    it("draws a mail node's background image below its flap", () => {
      const output = svg(`diagram { A [shape = mail, label = "Hi", background = "${ICON_PATH}"]; }`);
      expect(output).toContain(`<image x="64" y="56" width="128" height="24" xlink:href="${ICON_PATH}"/>`);
    });

    it("draws a note node's background image into its own full box", () => {
      const output = svg(`diagram { A [shape = note, label = "Hi", background = "${ICON_PATH}"]; }`);
      expect(output).toContain(`<image x="64" y="40" width="128" height="40" xlink:href="${ICON_PATH}"/>`);
    });

    it("draws a cloud node's background image into its own inset box", () => {
      const output = svg(`diagram { A [shape = cloud, label = "Hi", background = "${ICON_PATH}"]; }`);
      expect(output).toContain(`<image x="84" y="48" width="90" height="24" xlink:href="${ICON_PATH}"/>`);
    });

    it("draws a roundedbox node's background image the same way as box", () => {
      const output = svg(`diagram { A [shape = roundedbox, label = "Hi", background = "${ICON_PATH}"]; }`);
      expect(output).toContain(`<image x="64" y="40" width="128" height="40" xlink:href="${ICON_PATH}"/>`);
    });

    it("shrinks a textbox node's own label box to fit its background image", () => {
      // Unlike every other shape, textbox resizes its own textbox to the
      // (possibly scaled-down) image's size, centered within whatever
      // it would otherwise be - rather than drawing the image into a
      // fixed-size box.
      const output = svg(`diagram { A [shape = textbox, label = "Hi", background = "${ICON_PATH}"]; }`);
      expect(output).toContain(`<image x="112" y="52" width="32" height="16" xlink:href="${ICON_PATH}"/>`);
    });

    it("shrinks a textbox node's label box to the scaled-down size of a too-large background image", () => {
      const output = svg(`diagram { A [shape = textbox, label = "Hi", background = "${LARGE_ICON_PATH}"]; }`);
      expect(output).toContain(`<image x="88" y="40" width="80" height="40" xlink:href="${LARGE_ICON_PATH}"/>`);
    });

    it("composes a textbox node's icon and background, narrowing for the icon first", () => {
      // The icon narrows the box to (96, 40)-(192, 80) first (as in the
      // "icon" cases above); the background then resizes within that
      // already-narrowed box, not the node's own full one.
      const output = svg(
        `diagram { A [shape = textbox, label = "Hi", icon = "${ICON_PATH}", background = "${ICON_PATH}"]; }`,
      );
      expect(output).toContain(`<image x="128" y="52" width="32" height="16" xlink:href="${ICON_PATH}"/>`);
    });

    it("draws no background image for a node without a background attribute", () => {
      const output = svg('diagram { A [label = "Hi"]; }');
      expect(output).not.toContain("<image");
    });
  });

  // Expected values here are derived from the metrics/stacked formulas
  // directly (see draw-diagram.ts's renderNode()), not captured from a
  // live Python run like the rest of this file - same as the "icon" and
  // "background" cases above.
  describe("stacked", () => {
    it("draws two unlabeled duplicate copies behind the real node, shifted down-right by decreasing amounts", () => {
      const output = svg('diagram { A [label = "Hi", stacked]; }');
      // r = floor(cellSize/2) = 4; the two duplicates shift by r*2=8 and
      // r*1=4 respectively, the real node not at all.
      const first = output.indexOf(
        '<rect x="72" y="48" width="128" height="40" fill="rgb(255,255,255)" stroke="rgb(0,0,0)"/>',
      );
      const second = output.indexOf(
        '<rect x="68" y="44" width="128" height="40" fill="rgb(255,255,255)" stroke="rgb(0,0,0)"/>',
      );
      const third = output.indexOf(
        '<rect x="64" y="40" width="128" height="40" fill="rgb(255,255,255)" stroke="rgb(0,0,0)"/>',
      );
      expect(first).toBeGreaterThanOrEqual(0);
      expect(second).toBeGreaterThan(first);
      expect(third).toBeGreaterThan(second);
      // Only the real (unshifted, last-drawn) node keeps its label - the
      // duplicates' own label is cleared to "", which draws nothing.
      expect(output.indexOf(">Hi<")).toBeGreaterThan(third);
    });

    it("draws only one copy for a node without stacked", () => {
      const output = svg('diagram { A [label = "Hi"]; }');
      // Matches only the normal-pass (white-filled) rectangle, not the
      // shadow pass's own (black-filled) one for the same node.
      expect(output.match(/<rect x="\d+" y="\d+" width="128" height="40" fill="rgb\(255,255,255\)"/g)).toHaveLength(1);
    });

    it("casts a shadow for each of a stacked node's duplicate copies too, not just the real one", () => {
      const output = svg('diagram { A [label = "Hi", stacked]; }');
      // Every shadow here uses the same shifted-shadow-offset (3, 6) on
      // top of whichever of the 3 (2 duplicate + 1 real) boxes it
      // belongs to.
      expect(output).toContain('<rect x="75" y="54" width="128" height="40" fill="rgb(0,0,0)"');
      expect(output).toContain('<rect x="71" y="50" width="128" height="40" fill="rgb(0,0,0)"');
      expect(output).toContain('<rect x="67" y="46" width="128" height="40" fill="rgb(0,0,0)"');
    });

    it("duplicates a stacked node's own icon and number badge onto every layer too, matching the original", () => {
      // Not narrowed down to just the real node - the original's own
      // `node.duplicate()` only clears `label`/`background`, leaving
      // `icon`/`numbered` (and everything else) as-is.
      const output = svg(`diagram { A [label = "Hi", stacked, numbered = 1, icon = "${ICON_PATH}"]; }`);
      expect(output.match(/<image /g)).toHaveLength(3);
      expect(output.match(/rgb\(255,192,203\)/g)).toHaveLength(3);
    });
  });

  describe("edges", () => {
    it("draws a plain forward edge as a shaft plus one filled arrow-head", () => {
      const output = svg("diagram { A -> B; }");
      expect(output).toContain('<path d="M 192 60 L 248 60" fill="none" stroke="rgb(0,0,0)"/>');
      expect(output).toContain('<polygon points="255,60 248,56 248,64 255,60" fill="rgb(0,0,0)" stroke="rgb(0,0,0)"/>');
    });

    it("draws a label with a white background box over the shaft, after every edge's own line", () => {
      const output = svg('diagram { A -> B [label = "hello"]; }');
      const shaftIndex = output.indexOf('<path d="M 192 60 L 248 60"');
      // The background box's own width/height come from folding "hello"
      // against the labelbox (200,35,248,55) - a font measurement, so
      // (unlike the shaft/head above, pure grid arithmetic) only
      // approximately matches the original's own (integer) 44x12,
      // consistent with this project's general sub-pixel tolerance
      // (see font-metrics.test.ts) - checked here by position (near the
      // labelbox's own left edge and top) rather than exact size.
      const labelMatch = output.match(
        /<rect x="20[0-9](?:\.\d+)?" y="39(?:\.\d+)?" width="4[0-9](?:\.\d+)?" height="1[0-9](?:\.\d+)?" fill="rgb\(255,255,255\)" stroke="rgb\(0,0,0\)"\/>/,
      );
      expect(shaftIndex).toBeGreaterThan(-1);
      expect(labelMatch).not.toBeNull();
      expect(output.indexOf(labelMatch?.[0] as string)).toBeGreaterThan(shaftIndex);
      expect(output).toContain(">hello<");
    });

    it("draws nothing at all for a style = none edge - no shaft, no head, no label", () => {
      const output = svg('diagram { A -> B [style = none, label = "hello"]; }');
      expect(output).not.toContain("<path");
      expect(output).not.toContain("<polygon");
      expect(output).not.toContain(">hello<");
    });

    it("keeps a composition hstyle's head filled with the edge's own color, unlike generalization/aggregation", () => {
      const output = svg("diagram { A -> B [hstyle = composition]; }");
      expect(output).toContain(
        '<polygon points="255,60 248,56 240,60 248,64 255,60" fill="rgb(0,0,0)" stroke="rgb(0,0,0)"/>',
      );
    });

    it("draws a generalization hstyle's head unfilled (white), unlike composition", () => {
      const output = svg("diagram { A -> B [hstyle = generalization]; }");
      expect(output).toContain('fill="rgb(255,255,255)" stroke="rgb(0,0,0)"/>');
      expect(output).toContain('<polygon points="255,60 248,56 248,64 255,60"');
    });

    it("passes an edge's own thickness through to its shaft's stroke-width", () => {
      const output = svg("diagram { A -> B [thick]; }");
      expect(output).toContain('<path d="M 192 60 L 248 60" fill="none" stroke="rgb(0,0,0)" stroke-width="3"/>');
    });

    it("passes an edge's own dashed style through to its shaft's stroke-dasharray", () => {
      const output = svg("diagram { A -> B [style = dashed]; }");
      expect(output).toContain('<path d="M 192 60 L 248 60" fill="none" stroke="rgb(0,0,0)" stroke-dasharray="4"/>');
    });

    it("routes a portrait-oriented group's edge top-to-bottom instead of left-to-right", () => {
      const output = svg("diagram { orientation = portrait; A -> B; }");
      expect(output).toContain('<path d="M 128 80 L 128 112" fill="none" stroke="rgb(0,0,0)"/>');
      expect(output).toContain(
        '<polygon points="128,119 124,112 132,112 128,119" fill="rgb(0,0,0)" stroke="rgb(0,0,0)"/>',
      );
    });

    it("routes a flowchart-mode 'right-down' edge down-then-right, instead of landscape's diagonal detour", () => {
      const output = svg("diagram { edge_layout = flowchart; A -> B; A -> C; B -> D; C -> D; }");
      // A -> C: the flowchart-only override (`FlowchartLandscapeEdgeMetrics`)
      // - straight down from A, then right into C - unlike a plain
      // landscape group's own diagonal-detour routing for the same
      // 'right-down' direction (landscape-edge-metrics.test.ts).
      expect(output).toContain('<path d="M 128 80 L 128 140" fill="none" stroke="rgb(0,0,0)"/>');
      expect(output).toContain('<path d="M 128 140 L 248 140" fill="none" stroke="rgb(0,0,0)"/>');
      expect(output).toContain(
        '<polygon points="255,140 248,136 248,144 255,140" fill="rgb(0,0,0)" stroke="rgb(0,0,0)"/>',
      );
    });
  });
});
