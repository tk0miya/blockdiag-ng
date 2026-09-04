import { describe, expect, it } from "vitest";
import { unquote } from "./unquote.js";

// Expected outputs were captured by running the original implementation's
// unquote() (vendor/blockdiag/src/blockdiag/utils/__init__.py) against the
// same inputs.

describe("unquote", () => {
  it("passes through null and empty string unchanged", () => {
    expect(unquote(null)).toBeNull();
    expect(unquote("")).toBe("");
  });

  it("passes through a bare, unquoted value unchanged", () => {
    expect(unquote("label")).toBe("label");
    expect(unquote("no_quotes_at_all")).toBe("no_quotes_at_all");
  });

  it("strips matching double or single quotes", () => {
    expect(unquote('"hello"')).toBe("hello");
    expect(unquote("'hello'")).toBe("hello");
  });

  it("strips triple-quote delimiters", () => {
    expect(unquote('"""hello"""')).toBe("hello");
    expect(unquote("'''hello'''")).toBe("hello");
  });

  it("unescapes the surrounding quote character inside the value", () => {
    expect(unquote('"say \\"hi\\""')).toBe('say "hi"');
  });

  it("preserves embedded newlines", () => {
    expect(unquote('"multi\nline"')).toBe("multi\nline");
  });
});
