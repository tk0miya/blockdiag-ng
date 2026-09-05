// Ported from the original implementation's `DiagramTreeBuilder.build()`/
// `instantiate()` (vendor/blockdiag/src/blockdiag/builder.py): walks the
// AST once, creating/reusing each referenced node, group, and edge
// (deduplicated by id, or by (node1, node2) identity for edges),
// assigning nodes to their enclosing group via assignToGroup(), and finally
// collecting each group's own edges. Coordinate/layout computation isn't
// part of this step.
//
// The `group`-attribute shorthand for nesting a node into its own group
// (e.g. `A [group = G];`) lands in a follow-up step.
import { randomUUID } from "node:crypto";
import type { Diagram, DiagramEdge, DiagramNode, NodeGroup } from "../model/elements.js";
import type { Attr, DiagramAst, Stmt } from "../parser/ast.js";
import { assignToGroup } from "./assign-to-group.js";
import type { ClassRegistry } from "./attributes.js";
import { applyDiagramAttribute } from "./diagram-attributes.js";
import { applyEdgeAttributes, setDir } from "./edge-attributes.js";
import type { BuildDefaults } from "./factory.js";
import { createDefaultBuildDefaults, createDiagram, createEdge, createGroup, createNode } from "./factory.js";
import { applyGroupAttribute } from "./group-attributes.js";
import { applyNodeAttributes } from "./node-attributes.js";
import { unquote } from "./unquote.js";

function findOrCreateNode(rawId: string, nodes: Map<string, DiagramNode>, defaults: BuildDefaults): DiagramNode {
  const id = unquote(rawId);
  let node = nodes.get(id);
  if (node === undefined) {
    node = createNode(id, defaults.node);
    nodes.set(id, node);
  }
  return node;
}

function findOrCreateGroup(rawId: string, groups: Map<string, NodeGroup>, defaults: BuildDefaults): NodeGroup {
  const id = unquote(rawId);
  let group = groups.get(id);
  if (group === undefined) {
    group = createGroup(id, defaults.group);
    groups.set(id, group);
  }
  return group;
}

// A plain `Map<[string, string], DiagramEdge>` wouldn't work: a tuple is
// an array, and Map compares array keys by reference, not by content, so
// two structurally-identical `[id1, id2]` tuples never match. This joins
// both ids into one string key instead - via JSON.stringify() rather
// than a delimiter, so an id that happens to contain the delimiter can't
// collide with a different pair.
function edgeKey(id1: string, id2: string): string {
  return JSON.stringify([id1, id2]);
}

function findOrCreateEdge(
  node1: DiagramNode,
  node2: DiagramNode,
  edges: Map<string, DiagramEdge>,
  defaults: BuildDefaults,
): DiagramEdge {
  const key = edgeKey(node1.id, node2.id);
  let edge = edges.get(key);
  if (edge === undefined) {
    edge = createEdge(node1, node2, defaults.edge);
    edges.set(key, edge);
  }
  return edge;
}

interface BuildContext {
  readonly diagram: Diagram;
  readonly defaults: BuildDefaults;
  readonly classes: ClassRegistry;
  readonly classAttrs: Map<string, readonly Attr[]>;
  readonly nodes: Map<string, DiagramNode>;
  readonly groups: Map<string, NodeGroup>;
  readonly edges: Map<string, DiagramEdge>;
}

function buildGroup(group: NodeGroup, stmts: readonly Stmt[], ctx: BuildContext): void {
  for (const stmt of stmts) {
    switch (stmt.type) {
      case "Node": {
        const node = findOrCreateNode(stmt.id, ctx.nodes, ctx.defaults);
        applyNodeAttributes(node, stmt.attrs, ctx.classes);
        assignToGroup(node, group);
        break;
      }
      case "Edge": {
        const fromNodes = stmt.fromNodes.map((id) => findOrCreateNode(id, ctx.nodes, ctx.defaults));
        const toNodes = stmt.toNodes.map((id) => findOrCreateNode(id, ctx.nodes, ctx.defaults));
        for (const node of [...fromNodes, ...toNodes]) {
          assignToGroup(node, group);
        }
        for (const node1 of fromNodes) {
          for (const node2 of toNodes) {
            const edge = findOrCreateEdge(node1, node2, ctx.edges, ctx.defaults);
            setDir(edge, stmt.edgeType);
            applyEdgeAttributes(edge, stmt.attrs, ctx.classes);
          }
        }
        break;
      }
      case "Group": {
        // A group with no name gets a fresh id every time, bypassing
        // ctx.groups entirely: it can never be referenced again by id, so
        // there's nothing to deduplicate against.
        const subgroup =
          stmt.id === null
            ? createGroup(randomUUID(), ctx.defaults.group)
            : findOrCreateGroup(stmt.id, ctx.groups, ctx.defaults);
        subgroup.level = group.level + 1;
        assignToGroup(subgroup, group);
        buildGroup(subgroup, stmt.stmts, ctx);
        break;
      }
      case "Attr":
        if (group === ctx.diagram) {
          applyDiagramAttribute(ctx.diagram, ctx.defaults, stmt, ctx.classes);
        } else {
          applyGroupAttribute(group, stmt, ctx.classes);
        }
        break;
      case "Extension":
        if (stmt.kind === "class") {
          ctx.classAttrs.set(unquote(stmt.name), stmt.attrs);
        }
        // "plugin" statements load a Python plugin module to hook into
        // rendering - no equivalent exists here, so they're silently
        // ignored rather than rejected as an unknown statement.
        break;
    }
  }

  group.nodes.forEach((node, index) => {
    node.order = index;
  });
}

// Ported from `build()`'s post-`instantiate` cleanup: a group that ends
// up with no nodes of its own (e.g. every node originally placed in it
// got relocated by assignToGroup()) is removed from the tree. Recurses
// children-first, so a group left empty only because its own last
// subgroup was just removed is caught too.
function removeEmptyGroups(group: NodeGroup): void {
  for (const node of [...group.nodes]) {
    if ("nodes" in node) {
      removeEmptyGroups(node);
    }
  }
  for (const node of [...group.nodes]) {
    if ("nodes" in node && node.nodes.length === 0) {
      group.nodes.splice(group.nodes.indexOf(node), 1);
    }
  }
}

// Ported from `bind_edges()`: an edge is collected into whichever group
// directly contains its `node1` (the edge's source), regardless of where
// `node2` sits - the original looks this up per node via
// `DiagramEdge.find()`; this port groups every created edge by `node1`
// once, up front, since every edge is already in hand here.
function bindEdges(group: NodeGroup, edgesByNode1: ReadonlyMap<DiagramNode, readonly DiagramEdge[]>): void {
  for (const node of group.nodes) {
    if ("nodes" in node) {
      bindEdges(node, edgesByNode1);
    } else {
      group.edges.push(...(edgesByNode1.get(node) ?? []));
    }
  }
}

export function buildDiagram(ast: DiagramAst): Diagram {
  const defaults = createDefaultBuildDefaults();
  const diagram = createDiagram(defaults.group);
  const classAttrs = new Map<string, readonly Attr[]>();
  const ctx: BuildContext = {
    diagram,
    defaults,
    classes: { get: (name) => classAttrs.get(name) },
    classAttrs,
    nodes: new Map(),
    groups: new Map(),
    edges: new Map(),
  };

  buildGroup(diagram, ast.stmts, ctx);
  removeEmptyGroups(diagram);

  const edgesByNode1 = new Map<DiagramNode, DiagramEdge[]>();
  for (const edge of ctx.edges.values()) {
    const edges = edgesByNode1.get(edge.node1);
    if (edges === undefined) {
      edgesByNode1.set(edge.node1, [edge]);
    } else {
      edges.push(edge);
    }
  }
  bindEdges(diagram, edgesByNode1);

  return diagram;
}
