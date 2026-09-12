import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseArgs, run } from "./cli.js";

describe("parseArgs", () => {
  it("takes the first bare argument as the input path, defaulting type to svg", () => {
    expect(parseArgs(["diagram.diag"])).toEqual({ input: "diagram.diag", output: null, type: "svg", lint: false });
  });

  it("reads -o's own following argument as the output path", () => {
    expect(parseArgs(["diagram.diag", "-o", "out.svg"])).toEqual({
      input: "diagram.diag",
      output: "out.svg",
      type: "svg",
      lint: false,
    });
    expect(parseArgs(["-o", "out.svg", "diagram.diag"])).toEqual({
      input: "diagram.diag",
      output: "out.svg",
      type: "svg",
      lint: false,
    });
  });

  it("reads -T's own following argument as the output type, case-insensitively", () => {
    expect(parseArgs(["diagram.diag", "-T", "png"])).toEqual({
      input: "diagram.diag",
      output: null,
      type: "png",
      lint: false,
    });
    expect(parseArgs(["diagram.diag", "-T", "PNG"])).toEqual({
      input: "diagram.diag",
      output: null,
      type: "png",
      lint: false,
    });
  });

  it("recognizes --lint as a boolean flag, regardless of position", () => {
    expect(parseArgs(["diagram.diag", "--lint"])).toEqual({
      input: "diagram.diag",
      output: null,
      type: "svg",
      lint: true,
    });
    expect(parseArgs(["--lint", "diagram.diag"])).toEqual({
      input: "diagram.diag",
      output: null,
      type: "svg",
      lint: true,
    });
  });

  it("throws for an unknown -T value", () => {
    expect(() => parseArgs(["diagram.diag", "-T", "pdf"])).toThrow(/unknown format/);
  });

  it("leaves input null for a missing input path, rather than throwing", () => {
    // Unlike every other malformed-usage case below, a missing infile
    // isn't an error in the original (`Options.validate()`'s own
    // `len(self.args) == 0` check just prints help and exits 0) - so
    // `run()` needs to tell this apart from the cases that do throw
    // here, to print plain usage instead of an "error: ..." message.
    expect(parseArgs([])).toEqual({ input: null, output: null, type: "svg", lint: false });
  });

  it("throws for -o with nothing after it", () => {
    expect(() => parseArgs(["diagram.diag", "-o"])).toThrow(/-o requires/);
  });

  it("throws for -T with nothing after it", () => {
    expect(() => parseArgs(["diagram.diag", "-T"])).toThrow(/-T requires/);
  });

  it("throws for more than one bare argument", () => {
    expect(() => parseArgs(["a.diag", "b.diag"])).toThrow(/unexpected argument/);
  });
});

describe("run", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "blockdiag-cli-test-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("renders an input file to a default-named .svg file next to it", () => {
    const input = join(dir, "sample.diag");
    writeFileSync(input, "diagram { A -> B; }");
    const exitCode = run([input]);
    expect(exitCode).toBe(0);
    const output = readFileSync(join(dir, "sample.svg"), "utf-8");
    expect(output).toContain("<svg");
    expect(output).toContain(">A<");
  });

  it("writes to the path given after -o instead of the default", () => {
    const input = join(dir, "sample.diag");
    const output = join(dir, "elsewhere.svg");
    writeFileSync(input, "diagram { A -> B; }");
    expect(run([input, "-o", output])).toBe(0);
    expect(readFileSync(output, "utf-8")).toContain("<svg");
  });

  it("strips a leading UTF-8 BOM from the input file, matching the original's own utf-8-sig read", () => {
    const input = join(dir, "sample.diag");
    writeFileSync(input, "﻿diagram { A -> B; }");
    expect(run([input])).toBe(0);
    expect(readFileSync(join(dir, "sample.svg"), "utf-8")).toContain(">A<");
  });

  it("renders a real PNG (not SVG) to a default-named .png file for -T png", () => {
    const input = join(dir, "sample.diag");
    writeFileSync(input, "diagram { A -> B; }");
    expect(run([input, "-T", "png"])).toBe(0);
    const output = readFileSync(join(dir, "sample.png"));
    expect(output.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  });

  // Reading from stdin (`-` as the input path) is exercised manually
  // instead of here - piping real data into this test process's own
  // fd 0 (what `readFileSync(0, ...)` reads) isn't practical from
  // inside a test runner without spawning a real child process, and
  // this port's own `.js`-suffixed imports only resolve against the
  // compiled output (`npm run build`, i.e. `dist/`), not the `.ts`
  // sources a test importing `run()` directly runs against - so
  // exercising the *compiled* CLI as a subprocess isn't something this
  // test file itself can do inline. Manually verified:
  // `echo 'diagram { A -> B; }' | node dist/cli.js -` renders correctly
  // and writes to `-.svg`, matching `os.path.splitext('-')[0] + '.svg'`
  // in the original.

  it("prints plain usage and exits 0 for no arguments at all, not an error", () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const exitCode = run([]);
    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining("usage"));
    stdoutSpy.mockRestore();
  });

  it("prints an error-prefixed message and exits 1 for a malformed argument list, same as any later failure", () => {
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    expect(run(["a.diag", "-o"])).toBe(1);
    expect(run(["a.diag", "b.diag"])).toBe(1);
    for (const call of stderrSpy.mock.calls) {
      expect(call[0]).toEqual(expect.stringContaining("error:"));
    }
    stderrSpy.mockRestore();
  });

  it("prints a friendly error and exits 1 for a missing input file, rather than an uncaught exception", () => {
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const exitCode = run([join(dir, "missing.diag")]);
    expect(exitCode).toBe(1);
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("error:"));
    stderrSpy.mockRestore();
  });

  it("prints a friendly error and exits 1 for invalid diagram source, rather than an uncaught exception", () => {
    const input = join(dir, "broken.diag");
    writeFileSync(input, "not a diagram at all {{{");
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const exitCode = run([input]);
    expect(exitCode).toBe(1);
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("error:"));
    stderrSpy.mockRestore();
  });

  describe("--lint", () => {
    it("exits 0 without writing any output file for valid input", () => {
      const input = join(dir, "sample.diag");
      writeFileSync(input, "diagram { A -> B; }");
      expect(run([input, "--lint"])).toBe(0);
      expect(() => readFileSync(join(dir, "sample.svg"))).toThrow();
      expect(() => readFileSync(join(dir, "sample.png"))).toThrow();
    });

    it("still catches a builder-level error (unknown shape value), with its source position", () => {
      // The syntax-error path (a malformed .diag file) isn't re-tested here:
      // args.lint is only checked after parseString/buildDiagram already
      // succeeded, so a syntax error takes the exact same code path with or
      // without --lint, already covered above.
      const input = join(dir, "bad-attr.diag");
      writeFileSync(input, "diagram {\n  A [shape = hexagon];\n}");
      const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
      const exitCode = run([input, "--lint"]);
      expect(exitCode).toBe(1);
      expect(stderrSpy).toHaveBeenCalledWith(expect.stringMatching(/unknown node shape.*at 2:/));
      stderrSpy.mockRestore();
    });

    it("ignores -o and -T, since neither applies without rendering", () => {
      const input = join(dir, "sample.diag");
      writeFileSync(input, "diagram { A -> B; }");
      expect(run([input, "--lint", "-o", join(dir, "elsewhere.svg"), "-T", "png"])).toBe(0);
      expect(() => readFileSync(join(dir, "elsewhere.svg"))).toThrow();
    });
  });
});
