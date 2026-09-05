// Parse tree for the blockdiag DSL.
//
// Mirrors the parse tree produced by the original implementation's
// `parse()` (vendor/blockdiag/src/blockdiag/parser.py), which builds
// namedtuples (Diagram, Group, Node, Attr, Edge, Extension, Statements)
// via funcparserlib combinators.
//
// Two differences from the original, both because they're artifacts of
// how funcparserlib composes results rather than meaningful structure:
// - The original wraps sibling node/edge statements produced by a single
//   `node_list`/edge chain in a `Statements` node; here they're inlined
//   directly into the parent's `stmts` array. The original's own builder
//   (`DiagramTreeBuilder.instantiate`) already recurses into `Statements`
//   transparently, so this flattening changes no observable behavior.
// - The original's top-level `Diagram.id` holds whatever `maybe(diagram_id)`
//   produced (e.g. `['diagram', 'foo']`, `['blockdiag', None]`, or `None`),
//   which its own builder never reads (`Diagram()` takes no id). Here it's
//   a small `DiagramHeader` record instead of a raw tuple.
//
// Values are kept exactly as tokenized (e.g. a String attribute value
// keeps its surrounding quotes) - unquoting and attribute
// interpretation/validation happen later, when building the domain model.

export interface Attr {
  readonly type: "Attr";
  readonly name: string;
  readonly value: string | null;
}

export interface NodeStmt {
  readonly type: "Node";
  readonly id: string;
  readonly attrs: readonly Attr[];
}

export type EdgeType = "->" | "<-" | "--" | "<->" | ">-" | "-<" | ">-<";

export interface EdgeStmt {
  readonly type: "Edge";
  readonly fromNodes: readonly string[];
  readonly edgeType: EdgeType;
  readonly toNodes: readonly string[];
  readonly attrs: readonly Attr[];
}

export interface ExtensionStmt {
  readonly type: "Extension";
  readonly kind: "class" | "plugin";
  readonly name: string;
  readonly attrs: readonly Attr[];
}

export interface GroupStmt {
  readonly type: "Group";
  readonly id: string | null;
  readonly stmts: readonly Stmt[];
}

export type Stmt = Attr | NodeStmt | EdgeStmt | ExtensionStmt | GroupStmt;

export interface DiagramHeader {
  readonly keyword: "diagram" | "blockdiag";
  readonly name: string | null;
}

export interface DiagramAst {
  readonly type: "Diagram";
  readonly header: DiagramHeader | null;
  readonly stmts: readonly Stmt[];
}
