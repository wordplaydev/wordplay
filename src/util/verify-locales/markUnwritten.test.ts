import { expect, test } from 'vitest';
import markUnwritten from '@util/verify-locales/markUnwritten';

/**
 * An unwritten string carries the English it is waiting to replace, so a locale
 * file holds the words rather than only a marker pointing back at en-US. These
 * pin the shape, since no shipped locale has a `$?` for a fixture to find — the
 * verifier fails the build on any, so the form exists only between a key being
 * added to en-US and the translate run that fills it.
 */

test('a string keeps its English after the marker', () => {
    expect(markUnwritten('Galleries', 'plain')).toBe('$?Galleries');
});

test('a markup array is one document, so only its first element is marked', () => {
    // Paragraph breaks are element boundaries, and a markup array carries a
    // single write-status. Marking every element would read as several
    // separately unwritten documents.
    expect(markUnwritten(['First.', 'Second.', 'Third.'], 'markup')).toEqual([
        '$?First.',
        'Second.',
        'Third.',
    ]);
});

test('a positional array keeps its length and marks every element', () => {
    // A `[plain]` array is positional and its length must match en-US, so the
    // repair can neither drop elements nor collapse to one.
    const source = ['Left', 'Center', 'Right'];
    const marked = markUnwritten(source, 'plain');
    expect(marked).toEqual(['$?Left', '$?Center', '$?Right']);
    expect(marked).toHaveLength(source.length);
});

test('a name array marks every element, since each is its own name', () => {
    expect(markUnwritten(['Volume', 'Loudness'], 'name')).toEqual([
        '$?Volume',
        '$?Loudness',
    ]);
});

test('nothing is ever marked with no words after it', () => {
    // The one thing an unwritten string must never be: a bare marker, which
    // strips to nothing and leaves the locale with no text of its own.
    for (const value of ['A label', ['One', 'Two']])
        for (const kind of ['plain', 'markup', 'name'] as const) {
            const marked = markUnwritten(value, kind);
            for (const s of Array.isArray(marked) ? marked : [marked])
                expect(s).not.toBe('$?');
        }
});
