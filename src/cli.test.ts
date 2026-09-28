import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseArgs, run } from "./cli.js";

describe("parseArgs", () => {
  it("takes the first bare argument as the input path", () => {
    expect(parseArgs(["diagram.diag"])).toEqual({ input: "diagram.diag", output: null });
  });

  it("reads -o's own following argument as the output path", () => {
    expect(parseArgs(["diagram.diag", "-o", "out.svg"])).toEqual({ input: "diagram.diag", output: "out.svg" });
    expect(parseArgs(["-o", "out.svg", "diagram.diag"])).toEqual({ input: "diagram.diag", output: "out.svg" });
  });

  it("leaves input null for a missing input path, rather than throwing", () => {
    // Unlike every other malformed-usage case below, a missing infile
    // isn't an error in the original (`Options.validate()`'s own
    // `len(self.args) == 0` check just prints help and exits 0) - so
    // `run()` needs to tell this apart from the cases that do throw
    // here, to print plain usage instead of an "error: ..." message.
    expect(parseArgs([])).toEqual({ input: null, output: null });
  });

  it("throws for -o with nothing after it", () => {
    expect(() => parseArgs(["diagram.diag", "-o"])).toThrow(/-o requires/);
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
});
