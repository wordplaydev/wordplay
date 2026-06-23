import evaluateCode from '@runtime/evaluate';
import { describe, expect, test } from 'vitest';
import { PatternLibrary } from './Library';

/** Evaluate a snippet and return its textual value. */
const ev = (code: string) => evaluateCode(code)?.toString();

/**
 * Run the whole named-pattern corpus (the future shipped stdlib) through the
 * real stepwise engine: every `matches` input must whole-text match (`≈`), every
 * `rejects` input must not, and declared captures must appear in `⌕` results.
 */
describe('pattern library corpus', () => {
    for (const entry of PatternLibrary) {
        describe(`${entry.name} — ${entry.description}`, () => {
            test.each(entry.matches)('matches %j', (input) => {
                expect(ev(`'${input}' ≈ ${entry.pattern}`)).toBe('⊤');
            });
            test.each(entry.rejects)('rejects %j', (input) => {
                expect(ev(`'${input}' ≈ ${entry.pattern}`)).toBe('⊥');
            });
            // Every whole-text match must also be found by search at the start,
            // exercising the ⌕ path (searchPattern + Result construction) for
            // every corpus entry, not just the ones with declared captures.
            test.each(entry.matches)('search finds %j whole', (input) => {
                expect(ev(`('${input}' ⌕ ${entry.pattern})[1].text`)).toBe(
                    `"${input}"`,
                );
            });
            if (entry.captures) {
                const { input, groups } = entry.captures;
                for (const [name, value] of Object.entries(groups)) {
                    test(`captures ${name}=${value} in ${input}`, () => {
                        expect(
                            ev(
                                `('${input}' ⌕ ${entry.pattern})[1].groups{'${name}'}`,
                            ),
                        ).toBe(`"${value}"`);
                    });
                }
            }
        });
    }
});

/**
 * The corpus patterns are unanchored, so they double as extractors: ⌕ finds them
 * embedded in surrounding text. This guards the realistic "pull the date/colour/
 * tag out of a sentence" use case (and the search-position bookkeeping).
 */
describe('pattern library extraction (search within larger text)', () => {
    const pattern = (name: string) =>
        PatternLibrary.find((entry) => entry.name === name)?.pattern ?? '';

    test.each([
        ['iso-date', 'born 2026-06-15 ok', '2026-06-15'],
        ['hex-color', 'bg #ff8800 fg', '#ff8800'],
        ['semver', 'release 1.2.3 now', '1.2.3'],
        ['time-24', 'at 14:30 sharp', '14:30'],
        ['integer', 'score: -42 pts', '-42'],
        ['hashtag', 'say #world today', '#world'],
        ['currency-usd', 'pay $19.99 please', '$19.99'],
        ['email', 'write to amy@example.com today', 'amy@example.com'],
        ['mention', 'cc @amy on this', '@amy'],
    ])('%s extracts %j from surrounding text', (name, haystack, found) => {
        expect(ev(`('${haystack}' ⌕ ${pattern(name)})[1].text`)).toBe(
            `"${found}"`,
        );
    });

    test('finds multiple occurrences', () => {
        expect(
            ev(
                `('2026-06-15 and 2025-01-01' ⌕ ${pattern('iso-date')}).length()`,
            ),
        ).toBe('2');
    });

    test('reports correct 1-based capture position within larger text', () => {
        expect(
            ev(`('x 2026-06-15' ⌕ ${pattern('iso-date')})[1].starts{'y'}`),
        ).toBe('3');
    });
});
