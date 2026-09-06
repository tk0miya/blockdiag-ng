// Ported from the original implementation's `DiagramTreeBuilder.belong_to()`
// (vendor/blockdiag/src/blockdiag/builder.py). A node usually belongs to
// whichever group directly contains its statement, but a node already
// placed in a deeper group by an earlier reference "wins" - the later,
// shallower reference instead relocates the deeper group itself to sit
// alongside its own new, shallower sibling.
import type { AnyGroup, DiagramNode, NodeGroup } from "../model/elements.js";

export class BuildError extends Error {}

// Ported from `NodeGroup.parent()`: walks up the `group` chain to find
// the ancestor at `level`, relying on each group's `level` always being
// its own parent's `level + 1`.
function groupAncestorAt(group: AnyGroup, level: number): AnyGroup | null {
  if (group.level < level) {
    return null;
  }
  let current: AnyGroup | null = group;
  while (current !== null && current.level !== level) {
    current = current.group;
  }
  return current;
}

// Ported from `NodeGroup.is_parent()`.
function isAncestorOf(group: AnyGroup, other: AnyGroup): boolean {
  return groupAncestorAt(group, other.level) === other;
}

// Ported from `DiagramTreeBuilder.is_related_group()`.
function isRelatedGroup(group1: AnyGroup, group2: AnyGroup): boolean {
  return isAncestorOf(group1, group2) || isAncestorOf(group2, group1);
}

export function assignToGroup(node: DiagramNode | NodeGroup, group: AnyGroup): void {
  const override = !(node.group !== null && node.group.level > group.level);

  if (node.group !== null && node.group !== group && override) {
    if (!isRelatedGroup(node.group, group)) {
      throw new BuildError(`could not belong to two groups: ${node.id}`);
    }

    const oldGroup = node.group;
    const parent = groupAncestorAt(group, oldGroup.level + 1);
    // `parent`, if found, is always a proper NodeGroup: it's searched for
    // at oldGroup.level + 1, i.e. always level >= 1, and the root Diagram
    // is always level 0 - so this is a type narrowing of an invariant,
    // not a real possibility being excluded.
    if (parent !== null && parent.kind === "group") {
      const parentIndex = oldGroup.nodes.indexOf(parent);
      if (parentIndex !== -1) {
        oldGroup.nodes.splice(parentIndex, 1);
      }
      const nodeIndex = oldGroup.nodes.indexOf(node);
      oldGroup.nodes.splice(nodeIndex + 1, 0, parent);
    }
    oldGroup.nodes.splice(oldGroup.nodes.indexOf(node), 1);
    node.group = null;
  }

  if (node.group === null) {
    node.group = group;
    if (!group.nodes.includes(node)) {
      group.nodes.push(node);
    }
  }
}
