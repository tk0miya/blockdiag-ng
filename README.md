# blockdiag-ng

blockdiag-ng is a TypeScript successor to [blockdiag](https://github.com/blockdiag/blockdiag), a text-to-diagram generator for block diagrams. It aims to stay compatible with the original DSL and rendered output while running natively on Node.js.

## Usage

```sh
npx blockdiag diagram.diag          # writes diagram.svg next to it
npx blockdiag diagram.diag -T png   # writes diagram.png instead
npx blockdiag diagram.diag -o out.svg
cat diagram.diag | npx blockdiag -  # reads from stdin
npx blockdiag diagram.diag --lint   # validates only, writes nothing
npx blockdiag diagram.diag -T ast   # writes the parsed AST as JSON
npx blockdiag diagram.json          # an AST JSON file works as input too
```

Or, from a checkout, in place of `npx blockdiag`:

```sh
npm run build
node dist/cli.js diagram.diag
```

Only SVG and PNG output exist so far - font selection (`-f`/
`--fontmap`) and every other option the original CLI supports are
later steps.

### As a Claude Code Skill

[`skill/blockdiag`](./skill/blockdiag) packages the CLI as a
[Claude Code Skill](https://docs.claude.com/en/docs/claude-code/skills):
`SKILL.md` teaches Claude the DSL and when to reach for this tool, so it
can write and render `.diag` files on request instead of only producing a
description of a diagram in text. Install it locally:

```sh
mkdir -p ~/.claude/skills
cp -r skill/blockdiag ~/.claude/skills/blockdiag
```

(or, after `npm install blockdiag`, copy it from
`node_modules/blockdiag/skill/blockdiag` instead).

## License

Apache License 2.0. See [LICENSE](./LICENSE).

## Development

### Reference implementation

The original Python implementation is vendored as a git submodule under [`vendor/blockdiag`](./vendor/blockdiag) for reference during development:

- Its source is used to cross-check parsing, layout, and rendering behavior against the original implementation.
- Its test fixtures are reused to verify input/output compatibility.

Clone with submodules, or initialize them afterwards:

```sh
git clone --recurse-submodules <this-repo-url>
# or, in an existing checkout:
git submodule update --init --recursive
```

### Vendored test assets

[`vendor/vlgothic`](./vendor/vlgothic) holds a copy of the VL Gothic
Regular font (version 2.111), vendored under its own license as a
general-purpose real TTF fixture for tests that need an actual font file
(e.g. font-metrics, rendering).

### Differences from the original

blockdiag-ng aims for input/output compatibility with the original, but
deliberately diverges from it in a few places - usually because the
original's behavior turned out to be an implementation bug rather than
an intentional design choice. Divergences are documented next to the
code that makes them; this list is a summary.

- **A triple-quoted attribute value's content is no longer corrupted by
  an unrelated triple-quote-like run in its middle**
  (`src/builder/unquote.ts`). For example, a double-quoted value whose
  content happens to contain three single quotes in a row - e.g.
  `"abc'''def"` - keeps that inner `'''` intact here; the original loses
  it, returning `abcdef` instead of `abc'''def`.

- **A quoted `group` attribute referring to a node's own enclosing group
  no longer crashes** (`src/builder/tree-builder.ts`). For example,
  `group G { A [group = "G"]; }` recognizes `"G"` as the same group `A`
  is already in; the original crashes on this input instead.

- **A bare `label;` attribute (no value) no longer crashes when
  rendered** (`src/render/shapes/box.ts`). It renders as no label at
  all; the original crashes trying to render one instead.

- **`icon`/`background` only support `.jpg`/`.jpeg`/`.png`/`.gif` files,
  read directly from their own file path** (`src/render/images.ts`).
  This one isn't a bug fix like the others above - the original reads
  any image format Pillow can decode, re-encoding anything else into an
  embedded PNG first; that full decode/re-encode pipeline is out of
  scope for this SVG-only port, which only ever references a file by
  path.

- **A node's `icon` can end up drawn on top of its own label instead of
  underneath it** (`src/render/draw-diagram.ts`), for the (uncommon, but
  not enforced against) combination of a shape that doesn't narrow its
  own label to avoid the icon - every shape except `box`/`roundedbox`/
  `textbox`/`note` - with a label wide enough to actually overlap the
  icon. Not a bug fix either: the original always draws a shape's fill,
  then its icon, then its label, one at a time; this port draws each
  shape's fill and label together, in one call, so the icon (drawn right
  after) ends up on top of the label instead of underneath it.
