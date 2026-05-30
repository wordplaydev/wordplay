import { describe, expect, test } from 'vitest';
import {
    excerpt,
    foldEntry,
    maxEditsForQuery,
    searchItems,
    type Searchable,
    type SearchField,
    type SearchMatch,
} from './search';

const L = 'en';

/** A field at the given priority built from one or more display strings. */
function field(priority: number, ...words: string[]): SearchField {
    return { entries: words.map((w) => foldEntry(w, L)), priority };
}

/** A record keyed by a string ref with the given fields. */
function rec(ref: string, ...fields: SearchField[]): Searchable<string> {
    return { ref, fields };
}

/** A two-tier corpus: field priority 1 = "name", priority 2 = "docs". */
const corpus: Searchable<string>[] = [
    rec('Zonk', field(1, 'Zonk'), field(2, 'A furry wuzzlebark animal')),
    rec('Glorp', field(1, 'Glorp'), field(2, 'mentions floober in its docs')),
    rec('Floober', field(1, 'Floober')),
    rec('Quux', field(1, 'Quux', 'Quazzle'), field(2, 'two names')),
];

function search(query: string): [string, SearchMatch][] {
    return searchItems(corpus, query, L);
}

function highlight([, [display, start, end]]: [string, SearchMatch]): string {
    return display.substring(start, end);
}

describe('searchItems', () => {
    test('an exact higher-priority match wins and highlights the match', () => {
        const results = search('zonk');
        expect(results[0][0]).toBe('Zonk');
        expect(results[0][1][3]).toBe(1); // priority
        expect(highlight(results[0])).toBe('Zonk');
    });

    test('a lower-priority (doc) match highlights the query within it', () => {
        const zonk = search('wuzzlebark').find((r) => r[0] === 'Zonk');
        expect(zonk).toBeDefined();
        expect(zonk![1][3]).toBe(2);
        expect(highlight(zonk!)).toBe('wuzzlebark');
    });

    test('higher-priority matches rank before lower-priority ones', () => {
        const names = search('floober').map((r) => r[0]);
        const byName = names.indexOf('Floober'); // priority 1
        const byDoc = names.indexOf('Glorp'); // priority 2
        expect(byName).toBeGreaterThanOrEqual(0);
        expect(byDoc).toBeGreaterThanOrEqual(0);
        expect(byName).toBeLessThan(byDoc);
    });

    test('matching is case-insensitive', () => {
        expect(search('ZONK')[0][0]).toBe('Zonk');
    });

    test('an alternate entry in the same field matches', () => {
        const results = search('quazzle');
        expect(results[0][0]).toBe('Quux');
        expect(highlight(results[0])).toBe('Quazzle');
    });

    test('an empty query returns nothing', () => {
        expect(search('   ')).toEqual([]);
    });

    test('a query that matches nothing returns nothing', () => {
        expect(search('xyzzy-nomatch-qqq')).toEqual([]);
    });

    test('highlight offsets stay within the display string', () => {
        for (const q of ['zonk', 'wuzzlebark', 'floober', 'quazzle'])
            for (const [, [display, start, end]] of search(q)) {
                expect(start).toBeGreaterThanOrEqual(0);
                expect(end).toBeLessThanOrEqual(display.length);
                expect(start).toBeLessThanOrEqual(end);
            }
    });
});

describe('fuzziness is bounded to ~2 character deviations', () => {
    const c: Searchable<string>[] = [
        rec('Gesture', field(1, 'Gesture')),
        rec('Phrase', field(1, 'Phrase'), field(2, 'Make a text adventure')),
        rec('Time', field(1, 'Time'), field(2, 'currently the time')),
        rec('Stage', field(1, 'Stage'), field(2, 'adventures await on stage')),
    ];
    const refs = (q: string) => searchItems(c, q, L).map((r) => r[0]);

    test('does not match a 3+ character partial of a different word', () => {
        const results = refs('gesture');
        expect(results).toContain('Gesture');
        expect(results).not.toContain('Phrase'); // "ture" in "adventure"
        expect(results).not.toContain('Time'); // "urre" in "currently"
        expect(results).not.toContain('Stage'); // "tures" in "adventures"
    });

    test('still matches a one- or two-character typo or prefix', () => {
        expect(refs('gestrue')).toContain('Gesture'); // transposition (2)
        expect(refs('gestur')).toContain('Gesture'); // prefix
        expect(refs('gezture')).toContain('Gesture'); // 1 substitution
    });
});

describe('fuzziness scales with query length', () => {
    test('maxEditsForQuery grows ~1 per 3 graphemes, starting at 4', () => {
        expect(maxEditsForQuery('a')).toBe(0);
        expect(maxEditsForQuery('abc')).toBe(0);
        expect(maxEditsForQuery('abcd')).toBe(1);
        expect(maxEditsForQuery('abcdef')).toBe(1);
        expect(maxEditsForQuery('abcdefg')).toBe(2);
        expect(maxEditsForQuery('abcdefghi')).toBe(2);
        expect(maxEditsForQuery('abcdefghij')).toBe(3);
    });

    test('a short query matches by substring only (no loose fuzzy)', () => {
        const c: Searchable<string>[] = [
            rec('Color', field(1, 'Color')),
            rec('To', field(1, 'to')),
            rec('You', field(1, 'you')),
        ];
        // "col" (3 graphemes → 0 edits) matches the substring in "Color" but
        // not "to"/"you", which only matched at the old fixed 2-edit tolerance.
        expect(searchItems(c, 'col', L).map((r) => r[0])).toEqual(['Color']);
    });
});

describe('exact matches beat fuzzy ones across field priorities', () => {
    test('an exact lower-priority match outranks a fuzzy higher-priority one', () => {
        const c: Searchable<string>[] = [
            // name "placeholder" (fuzzy vs the query) + description (exact substring).
            rec(
                'Field',
                field(1, 'placeholder'),
                field(2, 'placeholder for the filter field'),
            ),
        ];
        const [, match] = searchItems(c, 'placeholder for', L)[0];
        expect(match[3]).toBe(2); // the exact description match, not the fuzzy name
    });
});

describe('ranking tiebreakers (recovering Fuse-quality order)', () => {
    test('an earlier match ranks before a later one', () => {
        const c: Searchable<string>[] = [
            rec('later', field(1, 'xxxabc')),
            rec('earlier', field(1, 'abcxxx')),
        ];
        const refs = searchItems(c, 'abc', L).map((r) => r[0]);
        expect(refs).toEqual(['earlier', 'later']);
    });

    test('a tighter (shorter) field ranks before a longer one', () => {
        const c: Searchable<string>[] = [
            rec('long', field(1, 'abc with lots of extra words around it')),
            rec('short', field(1, 'abc')),
        ];
        const refs = searchItems(c, 'abc', L).map((r) => r[0]);
        expect(refs).toEqual(['short', 'long']);
    });
});

describe('locale-aware case folding', () => {
    test('folds with the given locale, not the default', () => {
        // Turkish: capital I folds to dotless ı; English: capital I folds to i.
        expect(foldEntry('I', 'tr').lower).toBe('ı');
        expect(foldEntry('I', 'en').lower).toBe('i');
    });

    test('search matches across case using the locale fold', () => {
        const records = [
            rec('ışık', { entries: [foldEntry('IŞIK', 'tr')], priority: 1 }),
        ];
        const results = searchItems(records, 'ışık', 'tr');
        expect(results.map((r) => r[0])).toContain('ışık');
    });
});

describe('excerpt', () => {
    const text = 'the quick brown fox jumps over the lazy dog';

    test('adds ellipses around an interior match', () => {
        // "fox" is at index 16..19.
        const out = excerpt(text, 16, 19, 4);
        expect(out.startsWith('…')).toBe(true);
        expect(out.endsWith('…')).toBe(true);
        expect(out).toContain('fox');
    });

    test('omits the leading ellipsis at the start', () => {
        expect(excerpt(text, 0, 3, 4).startsWith('…')).toBe(false);
    });

    test('omits the trailing ellipsis at the end', () => {
        expect(
            excerpt(text, text.length - 3, text.length, 4).endsWith('…'),
        ).toBe(false);
    });
});
