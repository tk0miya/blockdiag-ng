// Ported from the original implementation's `unquote()`
// (vendor/blockdiag/src/blockdiag/utils/__init__.py), which strips the
// quoting a parsed attribute value (or identifier) keeps around it as a
// raw token. Triple-quoted values ("""...""" / '''...''') just have their
// delimiters removed; single/double-quoted values additionally get their
// escaped quote characters (\" or \') unescaped. A value with no matching
// surrounding quotes (e.g. a bare, unquoted identifier) passes through
// unchanged.
export function unquote(input: string): string;
export function unquote(input: string | null): string | null;
export function unquote(input: string | null): string | null {
  if (!input) {
    return input;
  }

  const withoutTripleQuotes = input.replaceAll('"""', "").replaceAll("'''", "");

  const match = /^(["'])([\s\S]*)\1$/.exec(withoutTripleQuotes);
  if (match === null) {
    return withoutTripleQuotes;
  }
  const [, quote, content] = match;
  return content.replaceAll(`\\${quote}`, quote);
}
