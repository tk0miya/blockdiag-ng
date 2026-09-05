import { describe, expect, it } from "vitest";
import { createDefaultBuildDefaults, createDiagram, createEdge, createGroup, createNode } from "./factory.js";

// Default values were captured by inspecting fresh instances from the
// original implementation (vendor/blockdiag/src/blockdiag/elements.py:
// DiagramNode.get(), NodeGroup.get(), DiagramEdge.get(), Diagram()) via a
// local venv.

describe("createDefaultBuildDefaults", () => {
  it("matches the original's per-class default values", () => {
    const defaults = createDefaultBuildDefaults();
    expect(defaults.node).toEqual({
      color: [255, 255, 255],
      textcolor: [0, 0, 0],
      linecolor: [0, 0, 0],
      fontfamily: null,
      fontsize: null,
      style: null,
      shape: "box",
      labelOrientation: "horizontal",
    });
    expect(defaults.group).toEqual({
      color: [243, 152, 0],
      textcolor: [0, 0, 0],
      fontfamily: null,
      fontsize: null,
      style: null,
    });
    expect(defaults.edge).toEqual({
      color: [0, 0, 0],
      textcolor: [0, 0, 0],
      fontfamily: null,
      fontsize: null,
      style: null,
    });
  });
});

describe("createNode", () => {
  it("initializes a node from the given id and defaults, labeling it with its own id", () => {
    const defaults = createDefaultBuildDefaults().node;
    const node = createNode("A", defaults);
    expect(node.id).toBe("A");
    expect(node.label).toBe("A");
    expect(node.color).toBe(defaults.color);
    expect(node.linecolor).toBe(defaults.linecolor);
    expect(node.shape).toBe(defaults.shape);
    expect(node.labelOrientation).toBe(defaults.labelOrientation);
    expect(node.group).toBeNull();
    expect(node.colwidth).toBe(1);
    expect(node.colheight).toBe(1);
    expect(node.stacked).toBe(false);
  });
});

describe("createGroup", () => {
  it("initializes a group from the given id and defaults, with an empty label", () => {
    // Unlike createNode, the original's NodeGroup.__init__ never sets
    // label from the id - it's left at Element's own default (''),
    // confirmed against a fresh instance.
    const defaults = createDefaultBuildDefaults().group;
    const group = createGroup("G", defaults);
    expect(group.id).toBe("G");
    expect(group.label).toBe("");
    expect(group.color).toBe(defaults.color);
    expect(group.shape).toBe("box");
    expect(group.thick).toBe(3);
    expect(group.orientation).toBe("landscape");
    expect(group.nodes).toEqual([]);
    expect(group.edges).toEqual([]);
    expect(group.level).toBe(0);
  });
});

describe("createEdge", () => {
  it("initializes an edge between the given nodes with a forward direction and no head style", () => {
    const nodeDefaults = createDefaultBuildDefaults().node;
    const edgeDefaults = createDefaultBuildDefaults().edge;
    const node1 = createNode("A", nodeDefaults);
    const node2 = createNode("B", nodeDefaults);
    const edge = createEdge(node1, node2, edgeDefaults);
    expect(edge.node1).toBe(node1);
    expect(edge.node2).toBe(node2);
    expect(edge.dir).toBe("forward");
    expect(edge.hstyle).toBeNull();
    expect(edge.color).toBe(edgeDefaults.color);
    expect(edge.crosspoints).toEqual([]);
  });
});

describe("createDiagram", () => {
  it("starts orange, like an ordinary group, not white like a node", () => {
    // Diagram is a NodeGroup subclass in the original, so it inherits
    // NodeGroup's class-level color rather than Base's - confirmed
    // against a fresh Diagram() instance. Deriving the expectation from
    // createDefaultBuildDefaults().group (rather than hardcoding the same
    // values again) means this test still catches it if createDiagram
    // and the group defaults it's supposed to share ever drift apart.
    const groupDefaults = createDefaultBuildDefaults().group;
    const diagram = createDiagram(groupDefaults);
    expect(diagram.color).toEqual(groupDefaults.color);
    expect(diagram.textcolor).toEqual(groupDefaults.textcolor);
    expect(diagram.shadowStyle).toBe("blur");
    expect(diagram.linecolor).toEqual([0, 0, 0]);
    expect(diagram.shape).toBe("box");
    expect(diagram.thick).toBe(3);
    expect(diagram.nodeWidth).toBeNull();
    expect(diagram.edgeLayout).toBeNull();
  });
});
