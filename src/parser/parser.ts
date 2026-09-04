// Recursive-descent parser for the blockdiag DSL.
//
// Ported from the original implementation's `parse()`/`parse_string()`
// (vendor/blockdiag/src/blockdiag/parser.py), which is built from
// funcparserlib combinators. See ast.ts for how the produced tree differs
// cosmetically from the original's namedtuples.
//
// Grammar (informal EBNF; `id` accepts a Name, Number, or String token):
//   diagram          := [diagram_header] "{" diagram_inline_stmt* "}"
//   diagram_header   := ("diagram" | "blockdiag") [id]
//   diagram_inline_stmt := extension_stmt | group_inline_stmt
//   group_inline_stmt   := edge_stmt | group_stmt | attribute_stmt | node_stmt
//   group_stmt       := "group" [id] "{" group_inline_stmt* "}"
//   extension_stmt   := ("class" | "plugin") id option_list
//   attribute_stmt   := id "=" id
//   node_stmt        := node_list option_list
//   edge_stmt        := node_list edge_relation node_list (edge_relation node_list)* option_list
//   node_list        := id ("," id)*
//   option_list      := ["[" option_stmt ("," option_stmt)* "]"]
//   option_stmt      := id ["=" id]
//   edge_relation    := "->" | "--" | "<-" | "<->" | ">-" | "-<" | ">-<"
//
// Each inline statement may be followed by an optional ";".
//
// "group"/"class"/"plugin" are NOT reserved words - like the original's
// funcparserlib combinators, each alternative of group_inline_stmt/
// diagram_inline_stmt is tried in order (edge_stmt, group_stmt,
// attribute_stmt, node_stmt; extension_stmt before that at the diagram
// level) and only committed to once it parses through to a point where the
// next alternative could no longer produce a different, valid result. If an
// alternative fails partway through (e.g. "group" is followed by "," rather
// than "{" or an id), the token position is rolled back and the next
// alternative is tried - so e.g. "group A, B;" is not a malformed group_stmt
// but two node_stmts: `Node("group")` followed by `Node("A"), Node("B")`.
// This was verified against the original for a range of inputs where these
// keywords are used as plain identifiers (see parser.test.ts).
//
// Once an alternative succeeds, there is no going back to try a different
// one even if a later statement then fails to parse - matching the
// original's non-backtracking-across-statements behavior (e.g.
// "class A, B;" parses "class A" as a complete extension_stmt, then fails
// on the dangling ", B;" rather than reinterpreting "class" as a plain
// identifier).

import type {
  Attr,
  DiagramAst,
  DiagramHeader,
  EdgeStmt,
  EdgeType,
  ExtensionStmt,
  GroupStmt,
  NodeStmt,
  Stmt,
} from "./ast.js";
import type { Token } from "./lexer.js";
import { tokenize } from "./lexer.js";

export class ParseError extends Error {
  constructor(
    message: string,
    readonly token: Token | undefined,
  ) {
    super(
      token === undefined
        ? `${message} at end of input`
        : `${message} at ${token.start.line}:${token.start.column} (got ${token.type} ${JSON.stringify(token.value)})`,
    );
    this.name = "ParseError";
  }
}

const EDGE_TYPES: readonly EdgeType[] = ["<->", "<-", "--", "->", ">-<", "-<", ">-"];

class TokenStream {
  private pos = 0;

  constructor(private readonly tokens: readonly Token[]) {}

  peek(offset = 0): Token | undefined {
    return this.tokens[this.pos + offset];
  }

  next(): Token {
    const token = this.tokens[this.pos];
    if (token === undefined) {
      throw new ParseError("unexpected end of input", undefined);
    }
    this.pos += 1;
    return token;
  }

  expectOp(value: string): Token {
    const token = this.peek();
    if (token === undefined || token.type !== "Op" || token.value !== value) {
      throw new ParseError(`expected "${value}"`, token);
    }
    return this.next();
  }

  atEnd(): boolean {
    return this.pos >= this.tokens.length;
  }

  isOp(value: string, offset = 0): boolean {
    const token = this.peek(offset);
    return token !== undefined && token.type === "Op" && token.value === value;
  }

  isKeyword(value: string, offset = 0): boolean {
    const token = this.peek(offset);
    return token !== undefined && token.type === "Name" && token.value === value;
  }

  edgeTypeAt(offset = 0): EdgeType | undefined {
    const token = this.peek(offset);
    if (token === undefined || token.type !== "Op") {
      return undefined;
    }
    return EDGE_TYPES.find((op) => op === token.value);
  }

  // Snapshot/restore for backtracking between ordered alternatives.
  mark(): number {
    return this.pos;
  }

  reset(mark: number): void {
    this.pos = mark;
  }
}

// Runs `fn`, rolling the stream back to its current position and returning
// undefined if `fn` throws a ParseError (a failed alternative). Other errors
// propagate, since they indicate a bug rather than a grammar mismatch.
function tryParse<T>(stream: TokenStream, fn: (stream: TokenStream) => T): T | undefined {
  const mark = stream.mark();
  try {
    return fn(stream);
  } catch (error) {
    if (error instanceof ParseError) {
      stream.reset(mark);
      return undefined;
    }
    throw error;
  }
}

function parseId(stream: TokenStream): string {
  const token = stream.peek();
  if (token === undefined || (token.type !== "Name" && token.type !== "Number" && token.type !== "String")) {
    throw new ParseError("expected an identifier", token);
  }
  return stream.next().value;
}

function parseNodeList(stream: TokenStream): string[] {
  const ids = [parseId(stream)];
  while (stream.isOp(",")) {
    stream.next();
    ids.push(parseId(stream));
  }
  return ids;
}

function parseOptionStmt(stream: TokenStream): Attr {
  const name = parseId(stream);
  let value: string | null = null;
  if (stream.isOp("=")) {
    stream.next();
    value = parseId(stream);
  }
  return { type: "Attr", name, value };
}

function parseOptionList(stream: TokenStream): Attr[] {
  if (!stream.isOp("[")) {
    return [];
  }
  stream.next();
  const attrs = [parseOptionStmt(stream)];
  while (stream.isOp(",")) {
    stream.next();
    attrs.push(parseOptionStmt(stream));
  }
  stream.expectOp("]");
  return attrs;
}

function skipOptionalSemicolon(stream: TokenStream): void {
  if (stream.isOp(";")) {
    stream.next();
  }
}

// edge_stmt only - fails (for tryParse to backtrack) if no edge_relation
// follows the first node_list.
function parseEdgeStmt(stream: TokenStream): EdgeStmt[] {
  const firstList = parseNodeList(stream);
  const edgeType = stream.edgeTypeAt();
  if (edgeType === undefined) {
    throw new ParseError("expected an edge relation", stream.peek());
  }

  const chain: { edgeType: EdgeType; nodes: string[] }[] = [];
  let currentEdgeType: EdgeType = edgeType;
  stream.next();
  for (;;) {
    const nodes = parseNodeList(stream);
    chain.push({ edgeType: currentEdgeType, nodes });
    const next = stream.edgeTypeAt();
    if (next === undefined) {
      break;
    }
    currentEdgeType = next;
    stream.next();
  }
  const attrs = parseOptionList(stream);

  const edges: EdgeStmt[] = [];
  let fromNodes = firstList;
  for (const link of chain) {
    edges.push({ type: "Edge", fromNodes, edgeType: link.edgeType, toNodes: link.nodes, attrs });
    fromNodes = link.nodes;
  }
  return edges;
}

// node_stmt only. This is the last alternative tried in group_inline_stmt,
// so unlike the others it's expected to always succeed once reached.
function parseNodeStmt(stream: TokenStream): NodeStmt[] {
  const ids = parseNodeList(stream);
  const attrs = parseOptionList(stream);
  return ids.map((id): NodeStmt => ({ type: "Node", id, attrs }));
}

function parseAttributeStmt(stream: TokenStream): Attr {
  const name = parseId(stream);
  stream.expectOp("=");
  const value = parseId(stream);
  return { type: "Attr", name, value };
}

function parseGroupStmt(stream: TokenStream): GroupStmt {
  if (!stream.isKeyword("group")) {
    throw new ParseError('expected "group"', stream.peek());
  }
  stream.next();
  const id = stream.isOp("{") ? null : parseId(stream);
  stream.expectOp("{");
  const stmts = parseInlineStmts(stream, parseGroupInlineStmt);
  stream.expectOp("}");
  return { type: "Group", id, stmts };
}

function parseExtensionStmt(stream: TokenStream): ExtensionStmt {
  if (!stream.isKeyword("class") && !stream.isKeyword("plugin")) {
    throw new ParseError('expected "class" or "plugin"', stream.peek());
  }
  const kind = stream.next().value as "class" | "plugin";
  const name = parseId(stream);
  const attrs = parseOptionList(stream);
  return { type: "Extension", kind, name, attrs };
}

// group_inline_stmt := edge_stmt | group_stmt | attribute_stmt | node_stmt
//
// "group" is not reserved: parseGroupStmt is only committed to if it
// actually parses through to a matching "{". See the module doc comment.
function parseGroupInlineStmt(stream: TokenStream): Stmt[] {
  const edge = tryParse(stream, parseEdgeStmt);
  if (edge !== undefined) {
    return edge;
  }
  const group = tryParse(stream, parseGroupStmt);
  if (group !== undefined) {
    return [group];
  }
  const attr = tryParse(stream, parseAttributeStmt);
  if (attr !== undefined) {
    return [attr];
  }
  return parseNodeStmt(stream);
}

// diagram_inline_stmt := extension_stmt | group_inline_stmt
//
// "class"/"plugin" are likewise not reserved outside of a successful
// extension_stmt.
function parseDiagramInlineStmt(stream: TokenStream): Stmt[] {
  const extension = tryParse(stream, parseExtensionStmt);
  if (extension !== undefined) {
    return [extension];
  }
  return parseGroupInlineStmt(stream);
}

function parseInlineStmts(stream: TokenStream, parseOne: (stream: TokenStream) => Stmt[]): Stmt[] {
  const stmts: Stmt[] = [];
  while (!stream.isOp("}")) {
    stmts.push(...parseOne(stream));
    skipOptionalSemicolon(stream);
  }
  return stmts;
}

function parseDiagramHeader(stream: TokenStream): DiagramHeader | null {
  if (!stream.isKeyword("diagram") && !stream.isKeyword("blockdiag")) {
    return null;
  }
  const keyword = stream.next().value as "diagram" | "blockdiag";
  const name = stream.isOp("{") ? null : parseId(stream);
  return { keyword, name };
}

// Recursively re-sorts each statement list so Attr/Extension statements
// come before everything else, matching the original's `sort_tree`
// (attribute/class/plugin declarations are applied before the elements
// that reference them). Array.prototype.sort is a stable sort, matching
// Python's `list.sort`.
function sortStmts(stmts: readonly Stmt[]): Stmt[] {
  const weight = (stmt: Stmt): number => (stmt.type === "Attr" || stmt.type === "Extension" ? 1 : 2);
  return stmts
    .map((stmt) => (stmt.type === "Group" ? { ...stmt, stmts: sortStmts(stmt.stmts) } : stmt))
    .sort((a, b) => weight(a) - weight(b));
}

export function parse(tokens: readonly Token[]): DiagramAst {
  const stream = new TokenStream(tokens);
  const header = parseDiagramHeader(stream);
  stream.expectOp("{");
  const stmts = parseInlineStmts(stream, parseDiagramInlineStmt);
  stream.expectOp("}");
  if (!stream.atEnd()) {
    throw new ParseError("unexpected trailing input", stream.peek());
  }
  return { type: "Diagram", header, stmts: sortStmts(stmts) };
}

export function parseString(input: string): DiagramAst {
  return parse(tokenize(input));
}
