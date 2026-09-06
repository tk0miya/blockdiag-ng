import { describe, expect, it } from "vitest";
import type { DiagramNode, NodeGroup } from "../model/elements.js";
import { assignToGroup, BuildError } from "./assign-to-group.js";

// Expected outputs were captured by running the original implementation's
// DiagramTreeBuilder.belong_to() (vendor/blockdiag/src/blockdiag/builder.py)
// against equivalent node/group graphs, via a local venv.

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
    labelOrientation: "horizontal",
    order: 0,
    group: null,
  };
}

function newGroup(id: string, level: number): NodeGroup {
  return {
    id,
    label: "",
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
    level,
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

describe("assignToGroup", () => {
  it("assigns a node with no group yet", () => {
    const root = newGroup("root", 0);
    const a = newNode("A");
    assignToGroup(a, root);
    expect(a.group).toBe(root);
    expect(root.nodes).toEqual([a]);
  });

  it("does not duplicate a node re-belonging to the same group", () => {
    const root = newGroup("root", 0);
    const a = newNode("A");
    assignToGroup(a, root);
    assignToGroup(a, root);
    expect(root.nodes).toEqual([a]);
  });

  it("leaves a node in a deeper group alone when a later, shallower reference targets an ancestor", () => {
    const root = newGroup("root", 0);
    const sub = newGroup("sub", 1);
    sub.group = root;
    root.nodes.push(sub);
    const a = newNode("A");
    assignToGroup(a, sub);

    assignToGroup(a, root);

    expect(a.group).toBe(sub);
    expect(sub.nodes).toEqual([a]);
    expect(root.nodes).toEqual([sub]);
  });

  it("relocates a node (and its old ancestor group) when a later reference targets a related descendant group", () => {
    const root = newGroup("root", 0);
    const sub = newGroup("sub", 1);
    assignToGroup(sub, root);
    const a = newNode("A");
    assignToGroup(a, root);

    assignToGroup(a, sub);

    expect(a.group).toBe(sub);
    expect(sub.nodes).toEqual([a]);
    // `sub` is repositioned to sit right after where `a` used to be in
    // `root.nodes`, rather than just disappearing from it.
    expect(root.nodes).toEqual([sub]);
  });

  it("throws BuildError when the node's existing group is unrelated to the new one", () => {
    const root = newGroup("root", 0);
    const a1 = newGroup("a1", 1);
    const a2 = newGroup("a2", 1);
    assignToGroup(a1, root);
    assignToGroup(a2, root);
    const a = newNode("A");
    assignToGroup(a, a1);

    expect(() => assignToGroup(a, a2)).toThrowError(BuildError);
  });
});
