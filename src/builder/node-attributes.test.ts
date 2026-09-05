import { describe, expect, it } from "vitest";
import type { DiagramNode } from "../model/elements.js";
import type { Attr } from "../parser/ast.js";
import { AttributeError, type ClassRegistry } from "./attributes.js";
import { applyNodeAttributes } from "./node-attributes.js";

// Expected outputs were captured by running the original implementation's
// DiagramNode.set_attributes() (vendor/blockdiag/src/blockdiag/elements.py)
// against equivalent Attr lists, via a local venv.

function newNode(): DiagramNode {
  return {
    id: "A",
    label: "",
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

const noClasses: ClassRegistry = { get: () => undefined };

function attr(name: string, value: string | null): Attr {
  return { type: "Attr", name, value };
}

describe("applyNodeAttributes", () => {
  it("applies plain string attributes as-is", () => {
    const node = newNode();
    applyNodeAttributes(
      node,
      [
        attr("label", '"hello"'),
        attr("numbered", "1"),
        attr("description", '"desc"'),
        attr("href", '"http://example.com"'),
        attr("fontfamily", '"Arial"'),
        attr("icon", '"icon.png"'),
        attr("background", '"bg.png"'),
      ],
      noClasses,
    );
    expect(node.label).toBe("hello");
    expect(node.numbered).toBe("1");
    expect(node.description).toBe("desc");
    expect(node.href).toBe("http://example.com");
    expect(node.fontfamily).toBe("Arial");
    expect(node.icon).toBe("icon.png");
    expect(node.background).toBe("bg.png");
  });

  it("assigns null for a bare attribute with no value, since these have no dedicated setter", () => {
    // Unlike attributes with a set_<name> in the original (color, style,
    // shape, ...), these fall through to a plain field assignment that
    // never checks the value is present - so e.g. "A [label];" with no
    // "= ..." assigns null rather than erroring.
    const node = newNode();
    applyNodeAttributes(node, [attr("label", null)], noClasses);
    expect(node.label).toBeNull();
  });

  it("throws AttributeError for a bare attribute with no value where the original's setter requires one", () => {
    // The mirror image of the previous case: attributes with a dedicated
    // setter in the original reject a missing value themselves, one way
    // or another - color_to_rgb(None) raises TypeError deep in re.match,
    // style raises TypeError in re.search before value.lower() is ever
    // reached, label_orientation raises AttributeError from
    // value.lower(), shape falls through noderenderer.get(None) (which
    // returns None without raising) to the original's own explicit
    // AttributeError, the int_attrs (colwidth/colheight/width/height/
    // fontsize/rotate) all raise TypeError from int(None), and icon/
    // background raise TypeError from the os.path.isfile(None) fallback
    // (see node-attributes.ts's icon/background comment on why this port
    // validates them at all).
    // requireValue() here isn't a behavior change - it just fails
    // earlier and uniformly, as AttributeError instead of whatever
    // incidental exception the original would raise.
    for (const name of [
      "color",
      "textcolor",
      "linecolor",
      "style",
      "shape",
      "label_orientation",
      "colwidth",
      "colheight",
      "width",
      "height",
      "fontsize",
      "rotate",
      "icon",
      "background",
    ]) {
      expect(() => applyNodeAttributes(newNode(), [attr(name, null)], noClasses), name).toThrowError(AttributeError);
    }
  });

  it("coerces int attributes like Python's int(), rejecting non-integer values", () => {
    const node = newNode();
    applyNodeAttributes(
      node,
      [
        attr("colwidth", "2"),
        attr("colheight", "3"),
        attr("width", "100"),
        attr("height", "50"),
        attr("fontsize", "16"),
        attr("rotate", "90"),
      ],
      noClasses,
    );
    expect(node.colwidth).toBe(2);
    expect(node.colheight).toBe(3);
    expect(node.width).toBe(100);
    expect(node.height).toBe(50);
    expect(node.fontsize).toBe(16);
    expect(node.rotate).toBe(90);

    expect(() => applyNodeAttributes(newNode(), [attr("rotate", "90.5")], noClasses)).toThrowError(AttributeError);
  });

  it("resolves color attributes through parseColor", () => {
    const node = newNode();
    applyNodeAttributes(
      node,
      [attr("color", "red"), attr("textcolor", "blue"), attr("linecolor", "#00ff00")],
      noClasses,
    );
    expect(node.color).toEqual([255, 0, 0]);
    expect(node.textcolor).toEqual([0, 0, 255]);
    expect(node.linecolor).toEqual([0, 255, 0]);
  });

  it("validates and lowercases the style attribute", () => {
    const node = newNode();
    applyNodeAttributes(node, [attr("style", "dashed")], noClasses);
    expect(node.style).toEqual({ type: "dashed" });
    expect(() => applyNodeAttributes(newNode(), [attr("style", "bogus")], noClasses)).toThrowError(AttributeError);
  });

  it("validates the shape attribute against the known shape list", () => {
    const node = newNode();
    applyNodeAttributes(node, [attr("shape", "circle")], noClasses);
    expect(node.shape).toBe("circle");
    expect(() => applyNodeAttributes(newNode(), [attr("shape", "hexagon")], noClasses)).toThrowError(AttributeError);
  });

  it("accepts the namespaced flowchart.* shapes", () => {
    // These live under noderenderer/flowchart/ rather than directly under
    // noderenderer/, and are easy to miss when enumerating shapes by
    // filename alone - confirmed against vendor/blockdiag/setup.py's
    // [blockdiag_noderenderer] entry points.
    const node = newNode();
    applyNodeAttributes(node, [attr("shape", "flowchart.database")], noClasses);
    expect(node.shape).toBe("flowchart.database");
  });

  it("sets stacked to true regardless of the attribute's value", () => {
    const node = newNode();
    applyNodeAttributes(node, [attr("stacked", null)], noClasses);
    expect(node.stacked).toBe(true);
  });

  it("validates and lowercases label_orientation", () => {
    const node = newNode();
    applyNodeAttributes(node, [attr("label_orientation", "VERTICAL")], noClasses);
    expect(node.labelOrientation).toBe("vertical");
    expect(() => applyNodeAttributes(newNode(), [attr("label_orientation", "sideways")], noClasses)).toThrowError(
      AttributeError,
    );
  });

  it("expands a class attribute into the class's own attributes, in order", () => {
    const classes: ClassRegistry = {
      get: (name) => (name === "emphasis" ? [attr("color", "red"), attr("style", "dashed")] : undefined),
    };
    const node = newNode();
    applyNodeAttributes(node, [attr("class", "emphasis"), attr("label", '"hi"')], classes);
    expect(node.color).toEqual([255, 0, 0]);
    expect(node.style).toEqual({ type: "dashed" });
    expect(node.label).toBe("hi");
  });

  it("throws AttributeError for an unknown class", () => {
    expect(() => applyNodeAttributes(newNode(), [attr("class", "unknown")], noClasses)).toThrowError(AttributeError);
  });

  it("throws AttributeError for an unknown attribute name", () => {
    expect(() => applyNodeAttributes(newNode(), [attr("nonexistent", "value")], noClasses)).toThrowError(
      AttributeError,
    );
  });
});
