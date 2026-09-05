// Ported from the original implementation's `unquote()`
// (vendor/blockdiag/src/blockdiag/utils/__init__.py), which strips the
// quoting a parsed attribute value (or identifier) keeps around it as a
// raw token. Triple-quoted delimiters ("""..."""/'''...''') are stripped
// first, if present; the result (whether or not a triple-quote layer was
// stripped) is then checked for a surrounding single/double quote, which
// additionally gets its escaped quote characters (\" or \') unescaped.
// This handles a triple-quoted value whose content is itself wrapped in a
// matching single/double quote (e.g. '"""\'hello\'"""' -> "hello"). A
// value with no matching surrounding quotes at any stage (e.g. a bare,
// unquoted identifier) passes through unchanged.
//
// Deliberately diverges from the original here: it strips triple quotes
// with `string.replace('"""', '')` (all occurrences, not just the
// surrounding pair), so a value like '"abc\'\'\'def"' - a double-quoted
// string whose content happens to contain three single quotes in a row -
// has that inner "'''" erased too, corrupting the result. This port only
// strips the delimiter pair actually anchored at the start and end of the
// string, leaving anything in the middle alone. Quote styles are checked
// longest-first so a triple-quoted value isn't mistaken for a
// single-quoted one whose content starts/ends with an extra quote
// character.
export function unquote(input: string): string;
export function unquote(input: string | null): string | null;
export function unquote(input: string | null): string | null {
  if (!input) {
    return input;
  }

  let remaining = input;
  for (const quote of ['"""', "'''"]) {
    if (remaining.length >= quote.length * 2 && remaining.startsWith(quote) && remaining.endsWith(quote)) {
      remaining = remaining.slice(quote.length, -quote.length);
      break;
    }
  }

  const match = /^(["'])([\s\S]*)\1$/.exec(remaining);
  if (match === null) {
    return remaining;
  }
  const [, quote, content] = match;
  return content.replaceAll(`\\${quote}`, quote);
}
