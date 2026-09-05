import { describe, expect, it } from "vitest";
import type { Attr } from "../parser/ast.js";
import { AttributeError, type ClassRegistry } from "./attributes.js";
import { applyDiagramAttributes } from "./diagram-attributes.js";
import { createDefaultBuildDefaults, createDiagram } from "./factory.js";

// Expected outputs were captured by running the original implementation's
// Diagram.set_attribute() (vendor/blockdiag/src/blockdiag/elements.py)
// against equivalent Attr lists, via a local venv.

const noClasses: ClassRegistry = { get: () => undefined };

function attr(name: string, value: string | null): Attr {
  return { type: "Attr", name, value };
}

describe("applyDiagramAttributes", () => {
  it("applies plain NodeGroup-inherited attributes by delegating to applyGroupAttribute", () => {
    const defaults = createDefaultBuildDefaults();
    const diagram = createDiagram(defaults.group);
    applyDiagramAttributes(
      diagram,
      defaults,
      [attr("label", '"my diagram"'), attr("color", "red"), attr("shape", "line")],
      noClasses,
    );
    expect(diagram.label).toBe("my diagram");
    expect(diagram.color).toEqual([255, 0, 0]);
    expect(diagram.shape).toBe("line");
  });

  it("throws AttributeError for an attribute unknown to both Diagram and NodeGroup", () => {
    const defaults = createDefaultBuildDefaults();
    const diagram = createDiagram(defaults.group);
    expect(() => applyDiagramAttributes(diagram, defaults, [attr("nonexistent", "value")], noClasses)).toThrowError(
      AttributeError,
    );
  });

  it("default_shape updates the node shape default, validated against the known shape list", () => {
    const defaults = createDefaultBuildDefaults();
    const diagram = createDiagram(defaults.group);
    applyDiagramAttributes(diagram, defaults, [attr("default_shape", "circle")], noClasses);
    expect(defaults.node.shape).toBe("circle");
    expect(() => applyDiagramAttributes(diagram, defaults, [attr("default_shape", "hexagon")], noClasses)).toThrowError(
      AttributeError,
    );
  });

  it("default_label_orientation updates the node label orientation default", () => {
    const defaults = createDefaultBuildDefaults();
    const diagram = createDiagram(defaults.group);
    applyDiagramAttributes(diagram, defaults, [attr("default_label_orientation", "VERTICAL")], noClasses);
    expect(defaults.node.labelOrientation).toBe("vertical");
  });

  it("default_textcolor (and its obsoleted alias default_text_color) sets the diagram's own textcolor and every element kind's default", () => {
    const defaults = createDefaultBuildDefaults();
    const diagram = createDiagram(defaults.group);
    applyDiagramAttributes(diagram, defaults, [attr("default_textcolor", "red")], noClasses);
    expect(diagram.textcolor).toEqual([255, 0, 0]);
    expect(defaults.node.textcolor).toEqual([255, 0, 0]);
    expect(defaults.group.textcolor).toEqual([255, 0, 0]);
    expect(defaults.edge.textcolor).toEqual([255, 0, 0]);

    const defaults2 = createDefaultBuildDefaults();
    applyDiagramAttributes(createDiagram(defaults2.group), defaults2, [attr("default_text_color", "blue")], noClasses);
    expect(defaults2.node.textcolor).toEqual([0, 0, 255]);
  });

  it("default_node_color updates only the node color default", () => {
    const defaults = createDefaultBuildDefaults();
    const diagram = createDiagram(defaults.group);
    applyDiagramAttributes(diagram, defaults, [attr("default_node_color", "green")], noClasses);
    expect(defaults.node.color).toEqual([0, 128, 0]);
    expect(defaults.group.color).toEqual([243, 152, 0]);
  });

  it("default_node_style updates only the node style default", () => {
    const defaults = createDefaultBuildDefaults();
    const diagram = createDiagram(defaults.group);
    applyDiagramAttributes(diagram, defaults, [attr("default_node_style", "dashed")], noClasses);
    expect(defaults.node.style).toEqual({ type: "dashed" });
  });

  it("default_linecolor (and its obsoleted alias default_line_color) sets the diagram's own linecolor, the node linecolor default, and the edge color default", () => {
    const defaults = createDefaultBuildDefaults();
    const diagram = createDiagram(defaults.group);
    applyDiagramAttributes(diagram, defaults, [attr("default_linecolor", "blue")], noClasses);
    expect(diagram.linecolor).toEqual([0, 0, 255]);
    expect(defaults.node.linecolor).toEqual([0, 0, 255]);
    expect(defaults.edge.color).toEqual([0, 0, 255]);

    const defaults2 = createDefaultBuildDefaults();
    applyDiagramAttributes(createDiagram(defaults2.group), defaults2, [attr("default_line_color", "green")], noClasses);
    expect(defaults2.edge.color).toEqual([0, 128, 0]);
  });

  it("default_group_color updates only the group color default", () => {
    const defaults = createDefaultBuildDefaults();
    const diagram = createDiagram(defaults.group);
    applyDiagramAttributes(diagram, defaults, [attr("default_group_color", "green")], noClasses);
    expect(defaults.group.color).toEqual([0, 128, 0]);
    expect(defaults.node.color).toEqual([255, 255, 255]);
  });

  it("default_fontfamily updates every element kind's default, accepting a missing value silently", () => {
    const defaults = createDefaultBuildDefaults();
    const diagram = createDiagram(defaults.group);
    applyDiagramAttributes(diagram, defaults, [attr("default_fontfamily", '"Arial"')], noClasses);
    expect(defaults.node.fontfamily).toBe("Arial");
    expect(defaults.group.fontfamily).toBe("Arial");
    expect(defaults.edge.fontfamily).toBe("Arial");

    const defaults2 = createDefaultBuildDefaults();
    applyDiagramAttributes(createDiagram(defaults2.group), defaults2, [attr("default_fontfamily", null)], noClasses);
    expect(defaults2.node.fontfamily).toBeNull();
  });

  it("default_fontsize (and the obsoleted `fontsize` alias) updates every element kind's default", () => {
    const defaults = createDefaultBuildDefaults();
    const diagram = createDiagram(defaults.group);
    applyDiagramAttributes(diagram, defaults, [attr("default_fontsize", "16")], noClasses);
    expect(defaults.node.fontsize).toBe(16);
    expect(defaults.group.fontsize).toBe(16);
    expect(defaults.edge.fontsize).toBe(16);

    const defaults2 = createDefaultBuildDefaults();
    applyDiagramAttributes(createDiagram(defaults2.group), defaults2, [attr("fontsize", "20")], noClasses);
    expect(defaults2.node.fontsize).toBe(20);
    expect(() =>
      applyDiagramAttributes(createDiagram(defaults2.group), defaults2, [attr("fontsize", null)], noClasses),
    ).toThrowError(AttributeError);
  });

  it("shadow_style validates and lowercases", () => {
    const defaults = createDefaultBuildDefaults();
    const diagram = createDiagram(defaults.group);
    applyDiagramAttributes(diagram, defaults, [attr("shadow_style", "SOLID")], noClasses);
    expect(diagram.shadowStyle).toBe("solid");
    expect(() => applyDiagramAttributes(diagram, defaults, [attr("shadow_style", "bogus")], noClasses)).toThrowError(
      AttributeError,
    );
  });

  it("edge_layout validates and lowercases", () => {
    const defaults = createDefaultBuildDefaults();
    const diagram = createDiagram(defaults.group);
    applyDiagramAttributes(diagram, defaults, [attr("edge_layout", "FLOWCHART")], noClasses);
    expect(diagram.edgeLayout).toBe("flowchart");
    expect(() => applyDiagramAttributes(diagram, defaults, [attr("edge_layout", "bogus")], noClasses)).toThrowError(
      AttributeError,
    );
  });

  it("node_width/node_height/span_width/span_height coerce to numbers", () => {
    const defaults = createDefaultBuildDefaults();
    const diagram = createDiagram(defaults.group);
    applyDiagramAttributes(
      diagram,
      defaults,
      [attr("node_width", "100"), attr("node_height", "50"), attr("span_width", "80"), attr("span_height", "40")],
      noClasses,
    );
    expect(diagram.nodeWidth).toBe(100);
    expect(diagram.nodeHeight).toBe(50);
    expect(diagram.spanWidth).toBe(80);
    expect(diagram.spanHeight).toBe(40);
  });

  it("page_padding coerces to a number, unlike the original which leaves it a raw string", () => {
    const defaults = createDefaultBuildDefaults();
    const diagram = createDiagram(defaults.group);
    applyDiagramAttributes(diagram, defaults, [attr("page_padding", "5")], noClasses);
    expect(diagram.pagePadding).toBe(5);
  });

  it("expands a class attribute into the class's own attributes, in order", () => {
    const classes: ClassRegistry = {
      get: (name) => (name === "emphasis" ? [attr("default_shape", "circle"), attr("color", "red")] : undefined),
    };
    const defaults = createDefaultBuildDefaults();
    const diagram = createDiagram(defaults.group);
    applyDiagramAttributes(diagram, defaults, [attr("class", "emphasis")], classes);
    expect(defaults.node.shape).toBe("circle");
    expect(diagram.color).toEqual([255, 0, 0]);
  });

  it("throws AttributeError for an unknown class", () => {
    const defaults = createDefaultBuildDefaults();
    const diagram = createDiagram(defaults.group);
    expect(() => applyDiagramAttributes(diagram, defaults, [attr("class", "unknown")], noClasses)).toThrowError(
      AttributeError,
    );
  });
});
