import { describe, expect, test } from 'vitest';
import Source from '@nodes/Source';
import { getSearchMatches } from '@components/editor/highlights/Highlights';

/** The matched substrings (sliced from the source code) for `query` over `code`. */
function matchedSubstrings(code: string, query: string): string[] {
    const source = new Source('test', code);
    const text = source.code;
    return getSearchMatches(source, query, 'en').map((m) =>
        text.substring(m.start, m.end).toString(),
    );
}

describe('getSearchMatches', () => {
    test('matches substrings within token text, not whole tokens', () => {
        // "cat" appears inside both `cat` and `cats`; each match is just "cat".
        const matches = matchedSubstrings('cat: 1\ncats: 2', 'cat');
        expect(matches).toEqual(['cat', 'cat']);
    });

    test('matches a partial substring of a token', () => {
        // Query "at" matches the middle/end of `cat`, returning just "at".
        expect(matchedSubstrings('cat: 1', 'at')).toEqual(['at']);
    });

    test('matching is case-insensitive but preserves original case', () => {
        expect(matchedSubstrings('Cat: 1', 'cat')).toEqual(['Cat']);
    });

    test('records non-overlapping matches within a token', () => {
        // "aa" in "aaaa" matches at offsets 0 and 2, not 1/3 (non-overlapping).
        expect(matchedSubstrings('aaaa: 1', 'aa')).toEqual(['aa', 'aa']);
    });

    test('a blank or whitespace-only query matches nothing', () => {
        expect(matchedSubstrings('cat: 1', '')).toEqual([]);
        expect(matchedSubstrings('cat: 1', '   ')).toEqual([]);
    });

    test('a query that matches no token text returns nothing', () => {
        expect(matchedSubstrings('cat: 1', 'zzz')).toEqual([]);
    });
});
