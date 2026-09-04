// Tokenizer for the blockdiag DSL.
//
// Ported from the original implementation's `tokenize()`
// (vendor/blockdiag/src/blockdiag/parser.py), which in turn builds on
// funcparserlib's `make_tokenizer()`
// (https://github.com/vlasovskikh/funcparserlib/blob/master/funcparserlib/lexer.py).
// Token specs are tried in order at each position and the first match wins
// (not the longest match), matching funcparserlib's behavior exactly -
// including its quirks (e.g. a bare leading "-" before a number is never
// consumed, since nothing else in the spec list matches it either).

export interface Position {
  readonly line: number;
  readonly column: number;
}

export type TokenType = "Name" | "Op" | "Number" | "String";

export interface Token {
  readonly type: TokenType;
  readonly value: string;
  readonly start: Position;
  readonly end: Position;
}

export class LexerError extends Error {
  constructor(
    readonly line: number,
    readonly column: number,
    readonly lineText: string,
  ) {
    super(`cannot tokenize data: ${line},${column}: "${lineText}"`);
    this.name = "LexerError";
  }
}

type RawTokenType = TokenType | "Comment" | "NL" | "Space";

interface TokenSpec {
  readonly type: RawTokenType;
  readonly regexp: RegExp;
}

const IGNORED_TYPES: ReadonlySet<RawTokenType> = new Set(["Comment", "NL", "Space"]);

// Every regexp is sticky (`y`) so it only matches starting exactly at the
// given index, mirroring Python's `regexp.match(s, i)`.
const SPECS: readonly TokenSpec[] = [
  { type: "Comment", regexp: /\/\*[\s\S]*?\*\//y },
  { type: "Comment", regexp: /(?:\/\/|#).*/y },
  { type: "NL", regexp: /[\r\n]+/y },
  { type: "Space", regexp: /[ \t\r\n]+/y },
  { type: "Name", regexp: /[A-Za-z_0-9\u0080-\uffff][A-Za-z_\-.0-9\u0080-\uffff]*/uy },
  { type: "Op", regexp: /[{};,=[\]]|<->|<-|--|->|>-<|-<|>-/y },
  { type: "Number", regexp: /-?\.[0-9]+|[0-9]+(?:\.[0-9]*)?/y },
  { type: "String", regexp: /(?<quote>"""|'''|"|')[\s\S]*?(?<!\\)\k<quote>/y },
];

interface RawToken {
  readonly type: RawTokenType;
  readonly value: string;
  readonly start: Position;
  readonly end: Position;
}

function matchAt(input: string, index: number, line: number, column: number): RawToken {
  for (const spec of SPECS) {
    spec.regexp.lastIndex = index;
    const match = spec.regexp.exec(input);
    if (match !== null) {
      const value = match[0];
      const newlines = (value.match(/\n/g) ?? []).length;
      const endLine = line + newlines;
      const endColumn = newlines === 0 ? column + value.length : value.length - value.lastIndexOf("\n") - 1;
      return {
        type: spec.type,
        value,
        start: { line, column: column + 1 },
        end: { line: endLine, column: endColumn },
      };
    }
  }

  const lineText = input.split(/\r\n|\r|\n/)[line - 1] ?? "";
  throw new LexerError(line, column + 1, lineText);
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  const length = input.length;
  let line = 1;
  let column = 0;
  let index = 0;

  while (index < length) {
    const raw = matchAt(input, index, line, column);
    if (!IGNORED_TYPES.has(raw.type)) {
      tokens.push({ type: raw.type as TokenType, value: raw.value, start: raw.start, end: raw.end });
    }
    line = raw.end.line;
    column = raw.end.column;
    index += raw.value.length;
  }

  return tokens;
}
