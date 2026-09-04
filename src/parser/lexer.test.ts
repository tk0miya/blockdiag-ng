import { describe, expect, it } from "vitest";
import { LexerError, tokenize } from "./lexer.js";

// Expected outputs were captured by running the original implementation's
// tokenizer (vendor/blockdiag/src/blockdiag/parser.py:tokenize) against the
// same inputs, to confirm this port matches it token-for-token.

describe("tokenize", () => {
  it("returns no tokens for an empty string", () => {
    expect(tokenize("")).toEqual([]);
  });

  it("tokenizes an edge statement", () => {
    expect(tokenize("A -> B;").map((t) => [t.type, t.value])).toEqual([
      ["Name", "A"],
      ["Op", "->"],
      ["Name", "B"],
      ["Op", ";"],
    ]);
  });

  it("tokenizes a node with attributes", () => {
    expect(tokenize('A [label = "x", color = red];').map((t) => [t.type, t.value])).toEqual([
      ["Name", "A"],
      ["Op", "["],
      ["Name", "label"],
      ["Op", "="],
      ["String", '"x"'],
      ["Op", ","],
      ["Name", "color"],
      ["Op", "="],
      ["Name", "red"],
      ["Op", "]"],
      ["Op", ";"],
    ]);
  });

  it("skips line comments, block comments, and whitespace", () => {
    expect(tokenize("# comment\nA;").map((t) => [t.type, t.value])).toEqual([
      ["Name", "A"],
      ["Op", ";"],
    ]);
    expect(tokenize("/* block */ B;").map((t) => [t.type, t.value])).toEqual([
      ["Name", "B"],
      ["Op", ";"],
    ]);
  });

  it("tokenizes single- and double-quoted strings", () => {
    expect(tokenize('"hello world"').map((t) => [t.type, t.value])).toEqual([["String", '"hello world"']]);
    expect(tokenize("'quoted'").map((t) => [t.type, t.value])).toEqual([["String", "'quoted'"]]);
  });

  it("treats digit-leading identifiers as Name, not Number", () => {
    // Name is tried before Number in the spec list, so a leading digit
    // still matches Name first - matching the original's behavior.
    expect(tokenize("123").map((t) => [t.type, t.value])).toEqual([["Name", "123"]]);
    expect(tokenize("123abc").map((t) => [t.type, t.value])).toEqual([["Name", "123abc"]]);
  });

  it("only tokenizes a dot-leading value as Number", () => {
    expect(tokenize(".5").map((t) => [t.type, t.value])).toEqual([["Number", ".5"]]);
  });

  it("treats a hyphen inside a bare identifier as part of Name", () => {
    // "A--B" is consumed whole by Name's greedy hyphen-inclusive pattern,
    // so it never reaches the "--" (none-direction edge) operator.
    expect(tokenize("A--B").map((t) => [t.type, t.value])).toEqual([["Name", "A--B"]]);
  });

  it("tokenizes all edge direction operators", () => {
    expect(tokenize("A>-B").map((t) => [t.type, t.value])).toEqual([
      ["Name", "A"],
      ["Op", ">-"],
      ["Name", "B"],
    ]);
    expect(tokenize("A>-<B").map((t) => [t.type, t.value])).toEqual([
      ["Name", "A"],
      ["Op", ">-<"],
      ["Name", "B"],
    ]);
    // "<->" must be tried before "<-" so its longer form still wins.
    expect(tokenize("A<-B").map((t) => [t.type, t.value])).toEqual([
      ["Name", "A"],
      ["Op", "<-"],
      ["Name", "B"],
    ]);
    expect(tokenize("A<->B").map((t) => [t.type, t.value])).toEqual([
      ["Name", "A"],
      ["Op", "<->"],
      ["Name", "B"],
    ]);
    // Unlike "<-", a bare "-<" right after an identifier is swallowed whole
    // by Name's greedy hyphen-inclusive pattern, so it only surfaces as an
    // operator when separated by whitespace.
    expect(() => tokenize("A-<B")).toThrowError(LexerError);
    expect(tokenize("A -< B").map((t) => [t.type, t.value])).toEqual([
      ["Name", "A"],
      ["Op", "-<"],
      ["Name", "B"],
    ]);
  });

  it("accepts non-ASCII identifiers", () => {
    expect(tokenize("あ").map((t) => [t.type, t.value])).toEqual([["Name", "あ"]]);
  });

  it("tracks line/column positions across newlines, including inside strings", () => {
    const tokens = tokenize('A [label = "multi\nline"];');
    expect(tokens.map((t) => [t.type, t.value, t.start, t.end])).toEqual([
      ["Name", "A", { line: 1, column: 1 }, { line: 1, column: 1 }],
      ["Op", "[", { line: 1, column: 3 }, { line: 1, column: 3 }],
      ["Name", "label", { line: 1, column: 4 }, { line: 1, column: 8 }],
      ["Op", "=", { line: 1, column: 10 }, { line: 1, column: 10 }],
      ["String", '"multi\nline"', { line: 1, column: 12 }, { line: 2, column: 5 }],
      ["Op", "]", { line: 2, column: 6 }, { line: 2, column: 6 }],
      ["Op", ";", { line: 2, column: 7 }, { line: 2, column: 7 }],
    ]);
  });

  it("throws LexerError with the offending line and position for unrecognized input", () => {
    expect(() => tokenize("A;\nB @ C;")).toThrowError(LexerError);
    try {
      tokenize("A;\nB @ C;");
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(LexerError);
      const err = e as LexerError;
      expect(err.line).toBe(2);
      expect(err.column).toBe(3);
      expect(err.lineText).toBe("B @ C;");
    }
  });

  it("only allows a leading minus sign on a dot-leading number, not an integer-leading one", () => {
    // The optional "-?" only applies to the dot-leading alternative
    // (`-?\.[0-9]+`), not the integer-leading one. So "-.5" tokenizes as a
    // single Number, but "-1.5" - with an integer part - matches nothing in
    // the spec list and is a LexerError, not a negative number.
    expect(tokenize("-.5").map((t) => [t.type, t.value])).toEqual([["Number", "-.5"]]);
    expect(() => tokenize("-1.5")).toThrowError(LexerError);
  });
});
