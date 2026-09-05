import { describe, expect, it } from "vitest";
import type { NodeGroup } from "../model/elements.js";
import type { Attr } from "../parser/ast.js";
import { AttributeError, type ClassRegistry } from "./attributes.js";
import { applyGroupAttributes } from "./group-attributes.js";

// Expected outputs were captured by running the original implementation's
// NodeGroup.set_attributes() (vendor/blockdiag/src/blockdiag/elements.py)
// against equivalent Attr lists, via a local venv.

function newGroup(): NodeGroup {
  return {
    id: "G",
    label: null,
    xy: { x: 0, y: 0 },
    colwidth: 1,
    colheight: 1,
    width: null,
    height: null,
    color: [243, 152, 0],
    textcolor: [0, 0, 0],
    fontfamily: null,
    fontsize: null,
    style: null,
    level: 0,
    separated: false,
    shape: "box",
    thick: 3,
    nodes: [],
    edges: [],
    icon: null,
    orientation: "landscape",
    href: null,
    order: 0,
    stacked: false,
    group: null,
  };
}

const noClasses: ClassRegistry = { get: () => undefined };

function attr(name: string, value: string | null): Attr {
  return { type: "Attr", name, value };
}

describe("applyGroupAttributes", () => {
  it("applies plain string, int, and color attributes", () => {
    const group = newGroup();
    applyGroupAttributes(
      group,
      [
        attr("label", '"group label"'),
        attr("fontfamily", '"Arial"'),
        attr("icon", '"icon.png"'),
        attr("href", '"http://example.com"'),
        attr("fontsize", "14"),
        attr("colwidth", "2"),
        attr("colheight", "3"),
        attr("width", "100"),
        attr("height", "50"),
        attr("color", "red"),
        attr("textcolor", "blue"),
        attr("style", "dashed"),
      ],
      noClasses,
    );
    expect(group.label).toBe("group label");
    expect(group.fontfamily).toBe("Arial");
    expect(group.icon).toBe("icon.png");
    expect(group.href).toBe("http://example.com");
    expect(group.fontsize).toBe(14);
    expect(group.colwidth).toBe(2);
    expect(group.colheight).toBe(3);
    expect(group.width).toBe(100);
    expect(group.height).toBe(50);
    expect(group.color).toEqual([255, 0, 0]);
    expect(group.textcolor).toEqual([0, 0, 255]);
    expect(group.style).toBe("dashed");
  });

  it("assigns null for a bare attribute with no value, since these have no dedicated setter", () => {
    const group = newGroup();
    applyGroupAttributes(group, [attr("label", null)], noClasses);
    expect(group.label).toBeNull();
  });

  it("throws AttributeError for color/textcolor/style/shape/orientation/thick with no value", () => {
    for (const name of ["color", "textcolor", "style", "shape", "orientation", "thick"]) {
      expect(() => applyGroupAttributes(newGroup(), [attr(name, null)], noClasses), name).toThrowError(AttributeError);
    }
  });

  it("coerces thick to a number, unlike the original which leaves it a raw string", () => {
    const group = newGroup();
    applyGroupAttributes(group, [attr("thick", "5")], noClasses);
    expect(group.thick).toBe(5);
    expect(() => applyGroupAttributes(newGroup(), [attr("thick", "5.5")], noClasses)).toThrowError(AttributeError);
  });

  it("validates and lowercases shape (box/line only)", () => {
    const group = newGroup();
    applyGroupAttributes(group, [attr("shape", "LINE")], noClasses);
    expect(group.shape).toBe("line");
    expect(() => applyGroupAttributes(newGroup(), [attr("shape", "circle")], noClasses)).toThrowError(AttributeError);
  });

  it("validates and lowercases orientation", () => {
    const group = newGroup();
    applyGroupAttributes(group, [attr("orientation", "PORTRAIT")], noClasses);
    expect(group.orientation).toBe("portrait");
    expect(() => applyGroupAttributes(newGroup(), [attr("orientation", "diagonal")], noClasses)).toThrowError(
      AttributeError,
    );
  });

  it("throws AttributeError for an unknown attribute name", () => {
    expect(() => applyGroupAttributes(newGroup(), [attr("nonexistent", "value")], noClasses)).toThrowError(
      AttributeError,
    );
  });
});
