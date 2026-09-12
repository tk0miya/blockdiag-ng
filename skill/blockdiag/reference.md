# blockdiag DSL reference

Full attribute/shape/color list, for when SKILL.md's quick summary isn't
enough. When still unsure, write the `.diag` file and run `blockdiag
diagram.diag --lint` - it validates every attribute and shape name below
and reports the exact line:column of a mistake.

## Node attributes (`A [attr = value, ...];`)

| Attribute | Value | Notes |
|---|---|---|
| `label` | string | Text shown in the node; defaults to the node's own id |
| `description` | string | Not rendered; documentation only |
| `numbered` | string | A small number badge in the corner |
| `href` | string (URL) | Makes the node a link in SVG output |
| `icon` | path to a `.jpg`/`.jpeg`/`.png`/`.gif` | Small icon drawn inside the node |
| `background` | path to an image | Fills the node's background |
| `color` | color (see below) | Fill color |
| `textcolor` | color | Label text color |
| `linecolor` | color | Border color |
| `style` | line style (see below) | Border style |
| `shape` | shape name (see below) | Node shape |
| `stacked` | (no value) | Draws the node as a stack of several |
| `fontfamily` | string | Accepted but has no rendering effect (matches the original) |
| `fontsize` | integer | Label font size |
| `colwidth` / `colheight` | integer | How many grid columns/rows the node spans |
| `width` / `height` | integer (px) | Explicit pixel size, overriding the grid size |
| `rotate` | integer (degrees) | Rotates the label text |
| `label_orientation` | `horizontal` \| `vertical` | Label text direction |

### Shapes

`box` (default), `roundedbox`, `square`, `none`, `textbox` (rectangular);
`circle`, `ellipse`, `diamond`, `minidiamond`, `dots` (geometric); `cloud`,
`note`, `mail`, `actor`, `beginpoint`, `endpoint` (notation); and the
flowchart-specific `flowchart.condition`, `flowchart.database`,
`flowchart.input`, `flowchart.loopin`, `flowchart.loopout`,
`flowchart.terminator`.

## Edge attributes (`A -> B [attr = value, ...];`)

| Attribute | Value | Notes |
|---|---|---|
| `label` | string | Text on the edge |
| `description` | string | Not rendered |
| `color` | color | Line color |
| `textcolor` | color | Label text color |
| `style` | line style | `none`/`solid`/`dotted`/`dashed`/a custom dash pattern |
| `thick` | (no value) | Draws a thicker line |
| `folded` / `nofolded` | (no value) | Folds a long edge to save horizontal space, or forces it not to |
| `hstyle` | `generalization`\|`composition`\|`aggregation`\|`oneone`\|`onemany`\|`manyone`\|`manymany` | UML-style arrowhead; some values also set `dir` |
| `dir` | `forward`\|`back`\|`both`\|`none` | Usually set implicitly by the edge operator instead (`->`/`<-`/`<->`/`--`) |
| `fontfamily` / `fontsize` | string / integer | Label font |

## Group attributes (`group { attr = value; ... }`)

| Attribute | Value | Notes |
|---|---|---|
| `label` | string | Group title |
| `color` | color | Fill color |
| `textcolor` | color | Label text color |
| `style` | line style | Border style |
| `shape` | `box` (filled background, default) \| `line` (outline only) | |
| `orientation` | `landscape` (default) \| `portrait` | Layout direction inside the group |
| `icon` / `href` / `fontfamily` / `fontsize` / `thick` / `colwidth` / `colheight` / `width` / `height` | same meaning as the equivalent node attribute | |

## Diagram-level attributes (top-level `attr = value;`, before any node/edge)

The whole diagram is itself a group, so every Group attribute above is
accepted at the top level too - most usefully `orientation`
(`landscape`/`portrait`, the whole diagram's overall layout direction).
`colwidth`/`colheight` are also accepted here but have no effect: the
diagram's overall grid size is always computed from its actual contents,
overriding whatever value was given, in any diagram with at least one node.
Plus these diagram-only attributes:

| Attribute | Value | Notes |
|---|---|---|
| `default_shape` | shape name | Default for every node that doesn't set its own `shape` |
| `default_label_orientation` | `horizontal`\|`vertical` | |
| `default_node_color` / `default_group_color` | color | |
| `default_text_color` (or `default_textcolor`) | color | Applies to nodes, groups, and edges |
| `default_line_color` (or `default_linecolor`) | color | Node border color + edge color |
| `default_node_style` | line style | |
| `default_fontfamily` / `default_fontsize` (or bare `fontsize`) | string / integer | |
| `shadow_style` | `solid`\|`blur`\|`none` | Node drop-shadow |
| `edge_layout` | `normal` (default) \| `flowchart` | Flowchart-style right-angle edge routing |
| `node_width` / `node_height` | integer (px) | Default node size |
| `span_width` / `span_height` | integer (px) | Spacing between grid columns/rows |
| `page_padding` | integer (px) | Margin around the whole diagram |

## Colors

Either a CSS3 named color (`red`, `lightblue`, `rebeccapurple`, ...) or a
hex code (`#f00`, `#ff0000`), or the literal `none` for no fill.

## Line styles

`none`, `solid`, `dotted`, `dashed`, or a custom dash pattern as
comma-separated integers (e.g. `style = "5,5"`).

## Edge operators

| Operator | Meaning |
|---|---|
| `->` | forward arrow |
| `<-` | back arrow |
| `<->` | arrow on both ends |
| `--` | no arrowhead |
| `-<` | forward, "many" (crow's foot) arrowhead |
| `>-` | back, "many" arrowhead |
| `>-<` | "many" arrowheads on both ends |

Chain them: `A -> B -> C;` creates two edges (A→B, B→C), both taking any
attributes given after the chain.
