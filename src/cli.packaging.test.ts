// Regression test for the entry-point guard's symlink handling (see the
// comment on the guard at the bottom of cli.ts). Invokes the compiled
// `dist/cli.js` through a symlink, the way an installed package's own
// `bin` entry does (e.g. npm's `node_modules/.bin/blockdiag`) - unlike
// cli.test.ts, which only ever exercises `run()` imported directly from
// source and never touches the guard at all.
//
// Requires `dist/cli.js` to already be built (`npm run build`) - `npm run
// ci` builds before testing for exactly this reason.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("the compiled CLI, invoked through a symlink", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "blockdiag-cli-packaging-test-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("still runs, the way an installed package's own bin entry would invoke it", () => {
    const link = join(dir, "blockdiag");
    symlinkSync(resolve("dist/cli.js"), link);

    const input = join(dir, "sample.diag");
    writeFileSync(input, "diagram { A -> B; }");
    const output = join(dir, "out.svg");

    execFileSync("node", [link, input, "-o", output]);
    expect(readFileSync(output, "utf-8")).toContain(">A<");
  });
});
