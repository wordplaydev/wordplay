import { describe, expect, test } from 'vitest';
import { localizeFields } from './localizeSearch';
import { searchItems, type Searchable } from '@util/search';

const L = 'en';

type Entry = { path: string; description?: string; value: string | string[] };

function record(e: Entry): Searchable<string> {
    return {
        ref: e.path,
        fields: localizeFields(e.path, e.description, e.value, L),
    };
}

const corpus: Searchable<string>[] = [
    record({
        path: 'ui.field.filter.placeholder',
        description: 'Placeholder for the filter field',
        value: 'Type to filter',
    }),
    record({
        path: 'ui.page.learn.header',
        description: 'The learn page header',
        value: 'Welcome, explorer',
    }),
];

const search = (q: string) => searchItems(corpus, q, L).map((r) => r[0]);

describe('localizeFields', () => {
    test('matches the path key (priority 1) and ranks it first', () => {
        const [ref, match] = searchItems(corpus, 'filter', L)[0];
        expect(ref).toBe('ui.field.filter.placeholder');
        expect(match[3]).toBe(1);
    });

    test('matches the TSDoc description (priority 2)', () => {
        const [, match] = searchItems(corpus, 'placeholder for', L)[0];
        expect(match[3]).toBe(2);
    });

    test('matches the translated value (priority 3)', () => {
        const [ref, match] = searchItems(corpus, 'explorer', L)[0];
        expect(ref).toBe('ui.page.learn.header');
        expect(match[3]).toBe(3);
    });

    test('an exact path-key substring outranks a fuzzy value match', () => {
        // "filter" is an exact substring of a path and only fuzzily near other text.
        expect(search('filter')[0]).toBe('ui.field.filter.placeholder');
    });

    test('tolerates a typo (fuzzy)', () => {
        expect(search('explorr')).toContain('ui.page.learn.header');
    });

    test('flattens array values for searching', () => {
        const recs = [
            record({ path: 'a.b', value: ['first part', 'second portion'] }),
        ];
        expect(searchItems(recs, 'portion', L).map((r) => r[0])).toContain(
            'a.b',
        );
    });
});
