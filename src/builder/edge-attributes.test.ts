import { describe, expect, it } from "vitest";
import type { DiagramEdge, DiagramNode } from "../model/elements.js";
import type { Attr } from "../parser/ast.js";
import { AttributeError, type ClassRegistry } from "./attributes.js";
import { applyEdgeAttributes } from "./edge-attributes.js";

// Expected outputs were captured by running the original implementation's
// DiagramEdge.set_attributes() (vendor/blockdiag/src/blockdiag/elements.py)
// against equivalent Attr lists, via a local venv.

function newNode(id: string): DiagramNode {
  return {
    id,
    label: id,
    xy: { x: 0, y: 0 },
    colwidth: 1,
    colheight: 1,
    width: null,
    height: null,
    color: [255, 255, 255],
    textcolor: [0, 0, 0],
    linecolor: [0, 0, 0],
    fontfamily: null,
    fontsize: null,
    style: null,
    shape: "box",
    numbered: null,
    icon: null,
    background: null,
    description: null,
    rotate: 0,
    href: null,
    stacked: false,
    labelOrientation: "horizontal" as const,
    order: 0,
    group: null,
  };
}

function newEdge(): DiagramEdge {
  return {
    node1: newNode("A"),
    node2: newNode("B"),
    crosspoints: [],
    skipped: 0,
    label: null,
    description: null,
    dir: "forward",
    color: [0, 0, 0],
    textcolor: [0, 0, 0],
    fontfamily: null,
    fontsize: null,
    style: null,
    hstyle: null,
    folded: null,
    thick: null,
  };
}

const noClasses: ClassRegistry = { get: () => undefined };

function attr(name: string, value: string | null): Attr {
  return { type: "Attr", name, value };
}

describe("applyEdgeAttributes", () => {
  it("applies plain string/int/color attributes", () => {
    const edge = newEdge();
    applyEdgeAttributes(
      edge,
      [
        attr("label", '"edge label"'),
        attr("description", '"desc"'),
        attr("fontfamily", '"Arial"'),
        attr("fontsize", "12"),
        attr("color", "red"),
        attr("textcolor", "blue"),
        attr("style", "dashed"),
      ],
      noClasses,
    );
    expect(edge.label).toBe("edge label");
    expect(edge.description).toBe("desc");
    expect(edge.fontfamily).toBe("Arial");
    expect(edge.fontsize).toBe(12);
    expect(edge.color).toEqual([255, 0, 0]);
    expect(edge.textcolor).toEqual([0, 0, 255]);
    expect(edge.style).toEqual({ type: "dashed" });
  });

  it("assigns null for a bare attribute with no value, since these have no dedicated setter", () => {
    const edge = newEdge();
    applyEdgeAttributes(edge, [attr("label", null)], noClasses);
    expect(edge.label).toBeNull();
  });

  it("throws AttributeError for color/textcolor/style with no value", () => {
    // Unlike the original, where an edge's textcolor is never validated
    // at all (see edge-attributes.ts's textcolor comment) - this port
    // resolves it through parseColor like `color`, so a missing value
    // fails the same way.
    for (const name of ["color", "textcolor", "style"]) {
      expect(() => applyEdgeAttributes(newEdge(), [attr(name, null)], noClasses), name).toThrowError(AttributeError);
    }
  });

  it("sets dir from a direction name or an arrow-shaped operator token, some of which imply an hstyle", () => {
    const named = newEdge();
    applyEdgeAttributes(named, [attr("dir", "back")], noClasses);
    expect(named.dir).toBe("back");
    expect(named.hstyle).toBeNull();

    const plainArrow = newEdge();
    applyEdgeAttributes(plainArrow, [attr("dir", "->")], noClasses);
    expect(plainArrow.dir).toBe("forward");
    expect(plainArrow.hstyle).toBeNull();

    // The remaining named directions, without an implied hstyle.
    for (const [value, dir] of [
      ["<-", "back"],
      ["<->", "both"],
      ["--", "none"],
    ] as const) {
      const edge = newEdge();
      applyEdgeAttributes(edge, [attr("dir", value)], noClasses);
      expect(edge.dir, value).toBe(dir);
      expect(edge.hstyle, value).toBeNull();
    }

    const oneMany = newEdge();
    applyEdgeAttributes(oneMany, [attr("dir", "-<")], noClasses);
    expect(oneMany.dir).toBe("forward");
    expect(oneMany.hstyle).toBe("onemany");

    // The remaining arrow tokens that also imply an hstyle.
    for (const [value, dir, hstyle] of [
      [">-", "back", "manyone"],
      [">-<", "both", "manymany"],
    ] as const) {
      const edge = newEdge();
      applyEdgeAttributes(edge, [attr("dir", value)], noClasses);
      expect(edge.dir, value).toBe(dir);
      expect(edge.hstyle, value).toBe(hstyle);
    }

    expect(() => applyEdgeAttributes(newEdge(), [attr("dir", "sideways")], noClasses)).toThrowError(AttributeError);
    expect(() => applyEdgeAttributes(newEdge(), [attr("dir", null)], noClasses)).toThrowError(AttributeError);
  });

  it("sets hstyle, and for the one-to-many family also sets the implied dir", () => {
    const generalization = newEdge();
    applyEdgeAttributes(generalization, [attr("hstyle", "generalization")], noClasses);
    expect(generalization.hstyle).toBe("generalization");
    expect(generalization.dir).toBe("forward"); // unchanged from the default

    // The "one-to-many family": each also sets the implied dir.
    for (const [value, dir] of [
      ["oneone", "none"],
      ["onemany", "forward"],
      ["manyone", "back"],
      ["manymany", "both"],
    ] as const) {
      const edge = newEdge();
      applyEdgeAttributes(edge, [attr("hstyle", value)], noClasses);
      expect(edge.dir, value).toBe(dir);
      expect(edge.hstyle, value).toBe(value);
    }

    expect(() => applyEdgeAttributes(newEdge(), [attr("hstyle", "bogus")], noClasses)).toThrowError(AttributeError);
    expect(() => applyEdgeAttributes(newEdge(), [attr("hstyle", null)], noClasses)).toThrowError(AttributeError);
  });

  it("sets folded/nofolded/thick, ignoring the attribute's value", () => {
    const folded = newEdge();
    applyEdgeAttributes(folded, [attr("folded", null)], noClasses);
    expect(folded.folded).toBe(true);

    const nofolded = newEdge();
    applyEdgeAttributes(nofolded, [attr("nofolded", null)], noClasses);
    expect(nofolded.folded).toBe(false);

    const thick = newEdge();
    applyEdgeAttributes(thick, [attr("thick", null)], noClasses);
    expect(thick.thick).toBe(3);
  });

  it("throws AttributeError for colwidth/colheight, unlike the original", () => {
    // The original's DiagramEdge inherits these via Base.int_attrs but has
    // no such fields, so setting them there just adds a meaningless,
    // never-read instance attribute. There's no reason to accept that
    // here.
    expect(() => applyEdgeAttributes(newEdge(), [attr("colwidth", "2")], noClasses)).toThrowError(AttributeError);
  });

  it("throws AttributeError for an unknown attribute name", () => {
    expect(() => applyEdgeAttributes(newEdge(), [attr("nonexistent", "value")], noClasses)).toThrowError(
      AttributeError,
    );
  });
});
