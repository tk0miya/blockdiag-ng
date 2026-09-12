#!/usr/bin/env node
// Ported from `blockdiag.utils.bootstrap.Application`/`Options` (vendor/
// blockdiag/src/blockdiag/utils/bootstrap.py): a minimal CLI - read a
// `.diag` file (or stdin, via `-`), render it to SVG or PNG (`-T`,
// defaulting to `svg` - unlike the original, which defaults to `PNG`;
// kept as `svg` here since that's this port's own established default
// from before `-T` existed at all, not something to silently flip now),
// and write the result to a file (`-o`, defaulting to the input's own
// basename with its extension replaced by `.svg`/`.png` - even for
// stdin input, matching the original's own literal `os.path.splitext()`
// on `"-"`, which yields `-.svg`/`-.png`). Every other option the
// original supports is deferred, not yet exposed: `-a`/`--antialias`
// and `--no-transparency` really are PNG-only in the original itself
// (verified against `bootstrap.py`/`imagedraw/png.py`); `--size` isn't
// - it resizes the SVG root's own `width`/`height` too
// (`imagedraw/svg.py`'s `save()`) - it's just not implemented for
// either format yet, plain missing scope rather than a PNG/SVG
// distinction. `-f`/`--font`/`--fontmap`/`-c`/`--config` depend on the
// original's multi-font-registration system this port has no
// equivalent of (see svg-document.ts's own comment on why).
// `--nodoctype` doesn't apply either: this port's own `SvgDocument`
// never emits a DOCTYPE line to begin with (see its own `toString()`),
// so there's nothing to turn off.
//
// Unlike the original's own `-o -`/`self.filename` handling (which
// writes to a literal file named `-`, not stdout - `imagedraw/svg.py`'s
// `save()` just does `open(self.filename, ...)` with whatever string it
// was given), this doesn't special-case `-o -` at all either, for the
// same reason: ported faithfully, not "improved".
//
// `--lint` is this port's own addition, not a port of anything - a tooling
// feature aimed at AI agents editing the DSL, not part of the DSL itself
// (the original has no equivalent flag). It runs the same parse/build/layout
// pipeline used before rendering
// (so it catches both syntax errors and builder-level ones like an unknown
// attribute or shape - now with source positions, see attributes.ts) but
// stops there: no font is loaded, no SVG/PNG is produced or written, and
// `-o`/`-T` are accepted but simply unused. Success is silent (exit 0,
// nothing printed) - failure reuses the same `error: ...`-to-stderr path
// as every other pipeline failure.
import { readFileSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { buildDiagram } from "./builder/tree-builder.js";
import { markSkippedEdges } from "./layout/edge-routing.js";
import { layoutDiagram } from "./layout/group-layout.js";
import { parseString } from "./parser/parser.js";
import { renderDiagramToSvg } from "./render/draw-diagram.js";
import { loadFont } from "./render/font-metrics.js";
import { renderPng } from "./render/svg-to-png.js";

const DEFAULT_FONT_PATH = join(import.meta.dirname, "../vendor/vlgothic/VL-Gothic-Regular.ttf");

const USAGE = "usage: blockdiag [-o FILE] [-T svg|png] [--lint] infile";

type OutputType = "svg" | "png";

interface CliArgs {
  // `null` means no positional infile was given - ported from
  // `Options.validate()`'s own `len(self.args) == 0` check, which
  // prints help and exits *0* (not an error) - matching that requires
  // `run()` to tell "no infile" apart from every other malformed-usage
  // case (which the original's own `RuntimeError`s all funnel through
  // the same `error()`+exit-1 path everything else uses), so this
  // doesn't throw for it the way it does for those.
  readonly input: string | null;
  readonly output: string | null;
  readonly type: OutputType;
  readonly lint: boolean;
}

function parseType(value: string): OutputType {
  const normalized = value.toLowerCase();
  if (normalized !== "svg" && normalized !== "png") {
    throw new Error(`unknown format: ${value}`);
  }
  return normalized;
}

export function parseArgs(argv: readonly string[]): CliArgs {
  let input: string | null = null;
  let output: string | null = null;
  let type: OutputType = "svg";
  let lint = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-o") {
      i++;
      if (i >= argv.length) throw new Error("-o requires a FILE argument");
      output = argv[i];
    } else if (arg === "-T") {
      i++;
      if (i >= argv.length) throw new Error("-T requires a TYPE argument");
      type = parseType(argv[i]);
    } else if (arg === "--lint") {
      lint = true;
    } else if (input === null) {
      input = arg;
    } else {
      throw new Error(`unexpected argument: ${arg}`);
    }
  }

  return { input, output, type, lint };
}

// Ported from `codecs.open(path, 'r', 'utf-8-sig')`: strips a leading
// UTF-8 byte-order mark, if present - for both a real file and stdin
// (`parse_diagram()`'s own `startswith('﻿')` check does the same
// for stdin specifically, since `utf-8-sig` only applies to the file
// path there).
function stripBom(text: string): string {
  return text.startsWith("﻿") ? text.slice(1) : text;
}

// Ported from `Options.validate()`'s output-defaulting `else` branch:
// the input's own basename with its extension replaced by `.svg`/`.png`
// (`type`, not the input's own extension, picks which) - computed the
// same way regardless of whether `input` is a real path or the literal
// `"-"` (stdin), matching `os.path.splitext()`'s own unconditional
// behavior. `node:path`'s own `extname()` (not a hand-rolled regex)
// matches `splitext()`'s treatment of a leading dot as part of the
// name, not an extension separator (`.bashrc` has no extension in
// either) - verified against Python's own output for a handful of
// cases, including that one.
function defaultOutputPath(input: string, type: OutputType): string {
  const ext = extname(input);
  const withoutExt = ext === "" ? input : input.slice(0, -ext.length);
  return `${withoutExt}.${type}`;
}

export function run(argv: readonly string[]): number {
  let args: CliArgs;
  try {
    args = parseArgs(argv);
  } catch (error) {
    process.stderr.write(`error: ${(error as Error).message}\n`);
    return 1;
  }

  if (args.input === null) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  const input = args.input;

  try {
    const source = stripBom(input === "-" ? readFileSync(0, "utf-8") : readFileSync(input, "utf-8"));
    const diagram = buildDiagram(parseString(source));
    layoutDiagram(diagram);
    markSkippedEdges(diagram);

    if (args.lint) {
      return 0;
    }

    const font = loadFont(DEFAULT_FONT_PATH);
    const svg = renderDiagramToSvg(diagram, { font });

    const outputPath = args.output ?? defaultOutputPath(input, args.type);
    if (args.type === "png") {
      writeFileSync(outputPath, renderPng(svg, DEFAULT_FONT_PATH, font.familyName));
    } else {
      writeFileSync(outputPath, svg);
    }
    return 0;
  } catch (error) {
    process.stderr.write(`error: ${(error as Error).message}\n`);
    return 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(run(process.argv.slice(2)));
}
