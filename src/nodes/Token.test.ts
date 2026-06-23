import { expect, test } from 'vitest';
import Token from '@nodes/Token';
import { Sym } from '@nodes/Sym';
import { Purpose } from '@concepts/Purpose';

/**
 * Token suggestions in the autocomplete menu group by {@link Token.getPurpose}.
 * Tokens used to always report Purpose.Hidden, so every token suggestion (e.g.
 * the pattern `|`) landed in the catch-all "Hidden" group. getPurpose now
 * categorizes by symbol type so they group with the feature they belong to.
 */
test.each([
    ['pattern alternation', Sym.PatternAlternation, Purpose.Patterns],
    ['pattern complement', Sym.PatternComplement, Purpose.Patterns],
    ['pattern any', Sym.PatternAny, Purpose.Patterns],
    ['pattern delimiter', Sym.PatternDelimiter, Purpose.Patterns],
    ['text literal', Sym.Text, Purpose.Text],
    ['list open', Sym.ListOpen, Purpose.Lists],
    ['set open', Sym.SetOpen, Purpose.Maps],
    ['table open', Sym.TableOpen, Purpose.Tables],
    ['number', Sym.Number, Purpose.Numbers],
    ['boolean', Sym.Boolean, Purpose.Truth],
    ['union type', Sym.Union, Purpose.Types],
    ['conditional', Sym.Conditional, Purpose.Decisions],
    ['function', Sym.Function, Purpose.Definitions],
    ['stream', Sym.Stream, Purpose.Inputs],
    ['bold markup', Sym.Bold, Purpose.Documentation],
])('%s token has purpose %s', (_name, sym, purpose) => {
    expect(new Token('x', sym).getPurpose()).toBe(purpose);
});

test('internal tokens with no creator-facing meaning remain Hidden', () => {
    expect(new Token('', Sym.End).getPurpose()).toBe(Purpose.Hidden);
    expect(new Token('x', Sym.Unknown).getPurpose()).toBe(Purpose.Hidden);
});

test('a multi-type token uses the first symbol with a purpose', () => {
    // The pattern letter `_` also carries LanguageJoin; the primary type wins.
    expect(
        new Token('_', [Sym.PatternLetter, Sym.LanguageJoin]).getPurpose(),
    ).toBe(Purpose.Patterns);
});
