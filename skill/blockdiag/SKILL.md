---
name: blockdiag
description: Generate block diagrams (boxes connected by arrows, optionally grouped) as SVG or PNG images from a simple text DSL. Use this when the user asks to draw, visualize, or create a diagram of a simple architecture, process flow, or set of related components - anything expressible as boxes and connecting lines, not a diagram requiring precise geometric layout control.
license: Apache-2.0
---

# blockdiag

Renders a small text DSL (`.diag` files) into SVG or PNG block diagrams, via
the `blockdiag` CLI (npm package `blockdiag`). Auto-layout only: node
placement is computed from the DSL, not specified by coordinates.

## Invoking the CLI

```sh
npx blockdiag@latest diagram.diag                 # writes diagram.svg
npx blockdiag@latest diagram.diag -T png -o out.png
npx blockdiag@latest diagram.diag --lint           # validate only, no output file
```

Always run `--lint` on a `.diag` file you just wrote before rendering it -
it catches both syntax errors and invalid attributes/shapes, with the
offending line:column in the error message, without producing an image.

## DSL basics

```
diagram {
  A -> B -> C;
  A [label = "Start", color = "#ffcc00"];
  B, C [shape = roundedbox];

  group {
    color = "lightblue";
    B; C;
  }
}
```

- A statement is a node (`A;`), an edge (`A -> B;`, chainable: `A -> B -> C;`),
  a group (`group { ... }`), or an attribute (`label = "foo";`). Each ends
  with an optional `;`.
- A comma-separated list applies to every element: `A, B, C;` declares three
  nodes; `A, B [shape = box];` sets `shape` on both.
- Edge operators: `->` (forward arrow), `<-` (back arrow), `--` (no arrow),
  `<->` (both), plus UML-style `-<`/`>-`/`>-<` (one/many-ended arrows).
- Attribute values: a bare word (`color = red`), a quoted string
  (`label = "multi word"`), or a number - quotes are only required for
  values containing spaces or special characters.
- Referencing the same node id again adds to/overrides its attributes rather
  than creating a second node - order doesn't matter (`A [label="x"]; A -> B;`
  works the same as `A -> B; A [label="x"];`).
- `group { ... }` visually boxes its contents together; groups can nest.

See `reference.md` (next to this file) for the full attribute/shape/color
reference. When unsure whether something is valid DSL, prefer writing the
`.diag` file and running `--lint` over guessing from memory.

## Other CLI flags

- `-T ast`: dump the parsed syntax tree as JSON instead of rendering
  (lighter than `--lint` - syntax only, no attribute/shape validation). A
  dumped AST JSON file is also accepted back as input anywhere a `.diag`
  file is, so it round-trips.
- `-o FILE`: output path (defaults to the input's own name with `.svg`/
  `.png`/`.json` in place of its extension).
- Reads from stdin with `-` as the input path.
