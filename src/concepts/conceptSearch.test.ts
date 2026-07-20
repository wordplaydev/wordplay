import { describe, expect, test } from 'vitest';
import { makeSearchable, searchConcepts } from './conceptSearch';

const L = 'en';

/** Builds concept records (names tier 1, docs tier 2, examples tier 3) keyed by the first name. */
function corpus() {
    return [
        makeSearchable('Zonk', ['Zonk'], ['A furry wuzzlebark animal'], L, [
            "Zonk('grumble')",
        ]),
        makeSearchable('Glorp', ['Glorp'], ['mentions floober here'], L, [
            'wuzzlebark(1)',
        ]),
        makeSearchable('Floober', ['Floober'], [], L),
    ];
}

describe('concept search adapter', () => {
    test('matches a concept by name (priority 1)', () => {
        const [ref, match] = searchConcepts(corpus(), 'zonk', L)[0];
        expect(ref).toBe('Zonk');
        expect(match[3]).toBe(1);
    });

    test('matches a concept by its documentation (priority 2)', () => {
        const results = searchConcepts(corpus(), 'wuzzlebark', L);
        const zonk = results.find((r) => r[0] === 'Zonk');
        expect(zonk?.[1][3]).toBe(2);
    });

    test('a name match outranks a documentation match', () => {
        const names = searchConcepts(corpus(), 'floober', L).map((r) => r[0]);
        expect(names.indexOf('Floober')).toBeLessThan(names.indexOf('Glorp'));
    });

    test('matches a concept by its example code (priority 3)', () => {
        const results = searchConcepts(corpus(), 'grumble', L);
        const zonk = results.find((r) => r[0] === 'Zonk');
        expect(zonk?.[1][3]).toBe(3);
    });

    test('a documentation match outranks an example match', () => {
        const names = searchConcepts(corpus(), 'wuzzlebark', L).map(
            (r) => r[0],
        );
        expect(names.indexOf('Zonk')).toBeLessThan(names.indexOf('Glorp'));
    });
});
