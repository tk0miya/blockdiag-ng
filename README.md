# blockdiag-ng

blockdiag-ng is a TypeScript successor to [blockdiag](https://github.com/blockdiag/blockdiag), a text-to-diagram generator for block diagrams. It aims to stay compatible with the original DSL and rendered output while running natively on Node.js.

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
