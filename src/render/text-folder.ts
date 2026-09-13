// Ported from `HorizontalTextFolder` (vendor/blockdiag/src/blockdiag/
// imagedraw/textfolder.py): folds a label into as many lines as fit
// inside a box, each wrapped at the widest prefix that still fits the
// box's width, then positions each line within the box per
// `halign`/`valign`. `VerticalTextFolder` (`label_orientation = vertical`)
// is used by exactly one test in the whole original codebase - not
// ported until something actually needs it.
//
// `adjustBaseline` is always on here: the original only turns it on for
// the SVG backend (`SVGImageDrawElement.baseline_text_rendering = True`),
// and this port only ever targets SVG - so a line's own y already
// accounts for its own height, matching SVG `<text>`'s baseline-relative
// y coordinate (see svg-document.ts's `text()`).
import type { Box, Point, Size } from "./geometry.js";
import { boxHeight, boxWidth, getPaddingFor } from "./geometry.js";

const DEFAULT_PADDING = 8;
const DEFAULT_LINE_SPACING = 2;

// Ported from `splitlabel()`: splits a label into paragraphs on a literal
// "\n" escape (or an actual newline), each trimmed of surrounding
// whitespace. A "¥" (the original's yen-sign stand-in for a literal
// backslash, `\xa5` - blockdiag's DSL predates its own escaping and
// inherited this from a Japanese-locale convention where the two
// glyphs share a code point) survives as a literal backslash by being
// protected (as `\x00`) before "\n" is unescaped, then restored.
//
// A label that's empty (or all whitespace) yields no paragraphs at all -
// matching Python's `''.splitlines() == []`, unlike JS's
// `''.split('\n')`, which yields `['']`.
const PROTECTED_BACKSLASH = "\0";

export function splitLabel(text: string): string[] {
  let result = text.replace(/^\s+/, "").replace(/\s+$/, "");
  result = result.replace(/¥/g, "\\");
  result = result.split("\\\\").join(PROTECTED_BACKSLASH);
  result = result.replace(/\\n/g, "\n");
  if (result === "") return [];
  return result.split("\n").map((line) => line.split(PROTECTED_BACKSLASH).join("\\").trim());
}

// Ported from `splittext()`: greedily takes the widest prefix of `text`
// that fits `bound`, then recurses on the remainder. Returns `[]` if
// even a single character doesn't fit (as the original does - `for i in
// range(len(text), 0, -1)` simply never breaks).
function splitText(measureWidth: (text: string) => number, text: string, bound: number): string[] {
  if (text === "") return [" "];

  for (let i = text.length; i > 0; i--) {
    const prefix = text.slice(0, i);
    if (measureWidth(prefix) <= bound) {
      const rest = text.slice(i);
      return rest ? [prefix, ...splitText(measureWidth, rest, bound)] : [prefix];
    }
  }
  return [];
}

// Ported from `truncate_text()`: the widest prefix of `text` that, with
// " ..." appended, still fits `bound` - or `text` itself unchanged if
// even " ..." alone doesn't fit.
function truncateText(measureWidth: (text: string) => number, text: string, bound: number): string {
  for (let i = text.length; i > 0; i--) {
    const candidate = `${text.slice(0, i)} ...`;
    if (measureWidth(candidate) <= bound) return candidate;
  }
  return text;
}

// Ported from `HorizontalTextFolder._lines()`: folds `text` line by
// line, top-to-bottom, until a line wouldn't fit the box's height -
// truncating the last line that did fit instead of adding a partial
// one.
function foldLines(box: Box, text: string, measure: (text: string) => Size): string[] {
  const maxWidth = boxWidth(box);
  const maxHeight = boxHeight(box);

  const lines: string[] = [];
  let height = 0;
  for (const paragraph of splitLabel(text)) {
    let finished = false;
    for (const folded of splitText((s) => measure(s).width, paragraph, maxWidth)) {
      const size = measure(folded);
      if (height + size.height + DEFAULT_LINE_SPACING < maxHeight) {
        lines.push(folded);
        height += size.height + DEFAULT_LINE_SPACING;
      } else {
        if (lines.length > 0) {
          lines[lines.length - 1] = truncateText((s) => measure(s).width, lines[lines.length - 1] as string, maxWidth);
        }
        finished = true;
        break;
      }
    }
    if (finished) break;
  }
  return lines;
}

export interface FoldedLine {
  readonly text: string;
  readonly point: Point;
}

export interface FoldedText {
  readonly lines: readonly FoldedLine[];
  readonly outlineBox: Box;
}

export interface TextFoldOptions {
  readonly halign?: "left" | "center" | "right";
  readonly valign?: "top" | "center" | "bottom";
  readonly padding?: number;
}

// Ported from `HorizontalTextFolder.lines`/`.outlinebox`. `measure`
// stands in for the original's `self.drawer.textlinesize()` (a folder
// method that delegates to whichever font-measuring strategy the
// drawer was built with).
export function foldText(
  box: Box,
  text: string,
  measure: (text: string) => Size,
  options: TextFoldOptions = {},
): FoldedText {
  const lines = foldLines(box, text, measure);

  // `lines` is only empty when the box is too narrow to fit even one
  // character - the original's own `max()`/`sum()` over its equivalent
  // empty list would raise `ValueError` here instead.
  const combined: Size = {
    width: Math.max(0, ...lines.map((line) => measure(line).width)),
    height:
      lines.reduce((sum, line) => sum + measure(line).height, 0) + DEFAULT_LINE_SPACING * Math.max(0, lines.length - 1),
  };
  const topPadding = getPaddingFor(box, combined, { valign: options.valign, padding: DEFAULT_LINE_SPACING });

  const foldedLines: FoldedLine[] = [];
  let height = topPadding.y;
  for (const line of lines) {
    const size = measure(line);
    const { x } = getPaddingFor(box, size, { halign: options.halign, padding: options.padding ?? DEFAULT_PADDING });
    foldedLines.push({ text: line, point: { x: box.x1 + x, y: box.y1 + height + size.height } });
    height += size.height + DEFAULT_LINE_SPACING;
  }

  const corners: Point[] = [];
  for (const line of foldedLines) {
    const size = measure(line.text);
    const top = line.point.y - size.height;
    corners.push({ x: line.point.x, y: top }, { x: line.point.x + size.width, y: top + size.height });
  }
  const padding = options.padding ?? DEFAULT_PADDING;
  const outlineBox: Box =
    corners.length > 0
      ? {
          x1: Math.min(...corners.map((p) => p.x)) - padding,
          y1: Math.min(...corners.map((p) => p.y)) - DEFAULT_LINE_SPACING,
          x2: Math.max(...corners.map((p) => p.x)) + padding,
          y2: Math.max(...corners.map((p) => p.y)) + DEFAULT_LINE_SPACING,
        }
      : { x1: box.x1, y1: box.y1, x2: box.x1, y2: box.y1 };

  return { lines: foldedLines, outlineBox };
}
