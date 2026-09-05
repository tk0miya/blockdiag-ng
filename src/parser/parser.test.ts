import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LexerError } from "./lexer.js";
import { ParseError, parseString } from "./parser.js";

// Expected outputs were captured by running the original implementation's
// parse_string() (vendor/blockdiag/src/blockdiag/parser.py) against the same
// inputs, to confirm this port matches it structurally. Differences noted in
// ast.ts (flattened Statements wrapper, DiagramHeader instead of a raw tuple)
// are accounted for below.

describe("parseString", () => {
  it("parses an empty diagram", () => {
    expect(parseString("{ }")).toEqual({ type: "Diagram", header: null, stmts: [] });
  });

  it("parses a diagram header with and without a name, and without a keyword", () => {
    expect(parseString("diagram foo { A; }").header).toEqual({ keyword: "diagram", name: "foo" });
    expect(parseString("blockdiag { A; }").header).toEqual({ keyword: "blockdiag", name: null });
    expect(parseString("{ A; }").header).toBeNull();
  });

  it("parses a single node with no attributes", () => {
    expect(parseString("{ A; }").stmts).toEqual([{ type: "Node", id: "A", attrs: [] }]);
  });

  it("splits a comma-separated node_list into sibling Node statements", () => {
    expect(parseString("{ A, B, C; }").stmts).toEqual([
      { type: "Node", id: "A", attrs: [] },
      { type: "Node", id: "B", attrs: [] },
      { type: "Node", id: "C", attrs: [] },
    ]);
  });

  it("parses node attributes, keeping String values quoted", () => {
    expect(parseString('{ A [label = "hello world", numbered]; }').stmts).toEqual([
      {
        type: "Node",
        id: "A",
        attrs: [
          { type: "Attr", name: "label", value: '"hello world"' },
          { type: "Attr", name: "numbered", value: null },
        ],
      },
    ]);
  });

  it("parses an edge chain, applying the same attrs to every link", () => {
    expect(parseString("{ A -> B -> C [style = dashed]; }").stmts).toEqual([
      {
        type: "Edge",
        fromNodes: ["A"],
        edgeType: "->",
        toNodes: ["B"],
        attrs: [{ type: "Attr", name: "style", value: "dashed" }],
      },
      {
        type: "Edge",
        fromNodes: ["B"],
        edgeType: "->",
        toNodes: ["C"],
        attrs: [{ type: "Attr", name: "style", value: "dashed" }],
      },
    ]);
  });

  it("keeps a node_list on each side of an edge as multiple from/to nodes", () => {
    expect(parseString("{ A -> B, C; }").stmts).toEqual([
      { type: "Edge", fromNodes: ["A"], edgeType: "->", toNodes: ["B", "C"], attrs: [] },
    ]);
  });

  it("parses a top-level attribute_stmt", () => {
    const ast = parseString("{ default_shape = box; A; }");
    expect(ast.stmts).toEqual([
      { type: "Attr", name: "default_shape", value: "box" },
      { type: "Node", id: "A", attrs: [] },
    ]);
  });

  it("parses a group with and without an id, including nesting", () => {
    expect(parseString("{ group mygroup { A; } }").stmts).toEqual([
      { type: "Group", id: "mygroup", stmts: [{ type: "Node", id: "A", attrs: [] }] },
    ]);
    expect(parseString("{ group { group { A; } } }").stmts).toEqual([
      {
        type: "Group",
        id: null,
        stmts: [{ type: "Group", id: null, stmts: [{ type: "Node", id: "A", attrs: [] }] }],
      },
    ]);
  });

  it("parses class and plugin extension statements", () => {
    expect(parseString("{ class emphasis [color = red]; A; }").stmts).toEqual([
      {
        type: "Extension",
        kind: "class",
        name: "emphasis",
        attrs: [{ type: "Attr", name: "color", value: "red" }],
      },
      { type: "Node", id: "A", attrs: [] },
    ]);
    expect(parseString("{ plugin attributes [name = Name]; A; }").stmts).toEqual([
      {
        type: "Extension",
        kind: "plugin",
        name: "attributes",
        attrs: [{ type: "Attr", name: "name", value: "Name" }],
      },
      { type: "Node", id: "A", attrs: [] },
    ]);
  });

  it("sorts Attr/Extension statements before other statements, recursively into groups", () => {
    // Matches the original's sort_tree: declarations are moved before the
    // elements that reference them, without reordering within each group.
    const ast = parseString("{ A; class c [color=red]; group { B; default_shape=box; } }");
    expect(ast.stmts.map((s) => s.type)).toEqual(["Extension", "Node", "Group"]);
    const group = ast.stmts.find((s) => s.type === "Group");
    expect(group?.type === "Group" && group.stmts.map((s) => s.type)).toEqual(["Attr", "Node"]);
  });

  it("throws ParseError for malformed input", () => {
    expect(() => parseString("{ A -> ; }")).toThrowError(ParseError);
    expect(() => parseString("{ A")).toThrowError(ParseError);
    expect(() => parseString("{ A; } garbage")).toThrowError(ParseError);
  });

  it("reports the offending position/token as plain values, not a Token", () => {
    // Catching this error shouldn't require knowing the lexer's
    // Token/Position shape.
    try {
      parseString("{ A -> ; }");
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ParseError);
      const err = e as ParseError;
      // "A" alone parses fine as a complete node_stmt (see the
      // group/class/plugin backtracking tests below for why), so the
      // next statement starts at "->" - which no alternative matches.
      expect(err.line).toBe(1);
      expect(err.column).toBe(5);
      expect(err.tokenType).toBe("Op");
      expect(err.tokenValue).toBe("->");
    }

    try {
      parseString("{ A");
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ParseError);
      const err = e as ParseError;
      expect(err.line).toBeUndefined();
      expect(err.column).toBeUndefined();
      expect(err.tokenType).toBeUndefined();
      expect(err.tokenValue).toBeUndefined();
    }
  });

  describe("treats group/class/plugin as plain identifiers when the surrounding syntax doesn't match", () => {
    // "group"/"class"/"plugin" are not reserved words. Each is only
    // consumed as a keyword if the corresponding statement parses through
    // to completion; otherwise the alternative fails, the token position
    // is rolled back, and the next alternative (ultimately node_stmt) gets
    // a chance - so these become ordinary Node ids or Edge endpoints.
    it("as a bare node_stmt", () => {
      expect(parseString("{ group; }").stmts).toEqual([{ type: "Node", id: "group", attrs: [] }]);
      expect(parseString("{ class; }").stmts).toEqual([{ type: "Node", id: "class", attrs: [] }]);
      expect(parseString("{ plugin [x=1]; }").stmts).toEqual([
        { type: "Node", id: "plugin", attrs: [{ type: "Attr", name: "x", value: "1" }] },
      ]);
    });

    it("as part of a node_list", () => {
      expect(parseString("{ group, Y; }").stmts).toEqual([
        { type: "Node", id: "group", attrs: [] },
        { type: "Node", id: "Y", attrs: [] },
      ]);
    });

    it("as an attribute_stmt name", () => {
      expect(parseString("{ group = foo; }").stmts).toEqual([{ type: "Attr", name: "group", value: "foo" }]);
    });

    it("as an edge endpoint", () => {
      expect(parseString("{ class -> B; }").stmts).toEqual([
        { type: "Edge", fromNodes: ["class"], edgeType: "->", toNodes: ["B"], attrs: [] },
      ]);
      expect(parseString("{ group -> B; }").stmts).toEqual([
        { type: "Edge", fromNodes: ["group"], edgeType: "->", toNodes: ["B"], attrs: [] },
      ]);
    });

    it("as an identifier inside a nested group, since extension_stmt is not tried there", () => {
      // extension_stmt is only an alternative of diagram_inline_stmt, not
      // group_inline_stmt - so inside a group, "class"/"plugin" never get a
      // chance to become an Extension, regardless of nesting depth.
      expect(parseString("{ group { class foo [x=y]; } }").stmts).toEqual([
        {
          type: "Group",
          id: null,
          stmts: [
            { type: "Node", id: "class", attrs: [] },
            { type: "Node", id: "foo", attrs: [{ type: "Attr", name: "x", value: "y" }] },
          ],
        },
      ]);
    });

    it("splits a failed group_stmt into two separate statements, matching the original", () => {
      // "group A, B;" is not "group A" followed by a syntax error: parsing
      // group_stmt fails after consuming "group A" (since "{" doesn't
      // follow), so it backtracks and "group" alone becomes a node_stmt;
      // the remaining ", B;" is then parsed as a fresh statement.
      expect(parseString("{ group A, B; }").stmts).toEqual([
        { type: "Node", id: "group", attrs: [] },
        { type: "Node", id: "A", attrs: [] },
        { type: "Node", id: "B", attrs: [] },
      ]);
    });

    it("does not backtrack once a statement has fully committed, even if a later one fails", () => {
      // "class A" is a complete, valid extension_stmt (its option_list is
      // simply empty since "," isn't "["), so it commits. The dangling
      // ", B;" then fails to parse as any statement - it is NOT
      // reinterpreted as "class, A, B;".
      expect(() => parseString("{ class A, B; }")).toThrowError(ParseError);
    });
  });
});

describe("parseString against the vendored test fixtures", () => {
  const fixturesDir = join(import.meta.dirname, "../../vendor/blockdiag/src/blockdiag/tests/diagrams");

  function collectDiagFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectDiagFiles(path);
      }
      return entry.name.endsWith(".diag") ? [path] : [];
    });
  }

  const allFixtures = collectDiagFiles(fixturesDir);

  // These fixtures under errors/ are designed to fail during semantic
  // building (unknown shape/style/attribute names, etc.), not parsing -
  // parse_string() succeeds on them in the original. Everything else
  // should parse cleanly.
  const semanticErrorFixtures = new Set(
    [
      "belongs_to_two_groups.diag",
      "unknown_diagram_default_shape.diag",
      "unknown_diagram_edge_layout.diag",
      "unknown_diagram_orientation.diag",
      "unknown_edge_class.diag",
      "unknown_edge_dir.diag",
      "unknown_edge_hstyle.diag",
      "unknown_edge_style.diag",
      "unknown_group_class.diag",
      "unknown_group_orientation.diag",
      "unknown_group_shape.diag",
      "unknown_node_attribute.diag",
      "unknown_node_class.diag",
      "unknown_node_shape.diag",
      "unknown_node_style.diag",
      "unknown_plugin.diag",
    ].map((name) => join(fixturesDir, "errors", name)),
  );
  // These fail parse_string() itself in the original (confirmed by running
  // it against each fixture in a local venv).
  const parseErrorFixtures = new Set(
    ["lexer_error.diag", "group_follows_node.diag", "node_follows_group.diag", "unknown_diagram_type.diag"].map(
      (name) => join(fixturesDir, "errors", name),
    ),
  );

  const parseableFixtures = allFixtures.filter((path) => !parseErrorFixtures.has(path));

  it("found the vendored fixture directory, including errors/", () => {
    expect(allFixtures.length).toBeGreaterThan(130);
    expect(allFixtures.some((path) => path.includes("/errors/"))).toBe(true);
  });

  it.each(parseableFixtures)("parses %s without throwing", (path) => {
    const source = readFileSync(path, "utf-8");
    expect(() => parseString(source)).not.toThrow();
  });

  it.each([...parseErrorFixtures])("fails to parse %s, matching the original", (path) => {
    // lexer_error.diag fails during tokenization (LexerError); the rest
    // fail during parsing proper (ParseError).
    const source = readFileSync(path, "utf-8");
    if (path.endsWith("lexer_error.diag")) {
      expect(() => parseString(source)).toThrowError(LexerError);
    } else {
      expect(() => parseString(source)).toThrowError(ParseError);
    }
  });

  it("accounts for every errors/ fixture as either a parse or semantic error", () => {
    const errorFixtures = allFixtures.filter((path) => path.includes("/errors/"));
    for (const path of errorFixtures) {
      expect(parseErrorFixtures.has(path) || semanticErrorFixtures.has(path), path).toBe(true);
    }
  });
});
