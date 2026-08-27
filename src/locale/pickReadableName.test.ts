import Name from '@nodes/Name';
import { expect, test } from 'vitest';
import { pickReadableName } from '@locale/getConceptName';

/**
 * A locale lists a type's glyph first (`["🔳", "Group"]`), so anything reading
 * `names[0]` to build a spoken description hands a screen reader the glyph
 * instead of the word. These cover the two halves of that: picking the word, and
 * agreeing with `Name.isSymbolic()` about what a glyph is.
 */

test('a readable name is the word, not the glyph in front of it', () => {
    expect(pickReadableName(['🔳', 'Group'])).toBe('Group');
    expect(pickReadableName(['▭', 'Rectangle'])).toBe('Rectangle');
    expect(pickReadableName(['⬟', 'Shape'])).toBe('Shape');
});

test('a name with nothing but a glyph still yields the glyph', () => {
    // Better a glyph than nothing: some concepts are only ever written as one.
    expect(pickReadableName(['≠'])).toBe('≠');
    expect(pickReadableName('Phrase')).toBe('Phrase');
});

test('annotations and empty names are skipped', () => {
    expect(pickReadableName(['$~🔳', '$~Group'])).toBe('Group');
    expect(pickReadableName(['', 'Group'])).toBe('Group');
});

test('it agrees with Name.isSymbolic about every glyph a locale uses', () => {
    // getConceptName mirrors Name.isSymbolic without importing the nodes graph
    // (an init-order cycle), so the two can drift — and did: the mirror tested
    // only for emoji, and `⬟`, `♪`, `▦`, and `⠿` are Unicode symbols that are
    // not Extended_Pictographic, so they passed as words.
    for (const glyph of [
        '💬',
        '🔳',
        '🎭',
        '🎼',
        '🔊',
        '⬟',
        '▭',
        '●',
        '⬢',
        '⠿',
        '➡',
        '⬇',
        '▦',
        '♪',
        '📍',
    ]) {
        expect(Name.make(glyph).isSymbolic()).toBe(true);
        // A word beside it must win, which only holds if the mirror agrees.
        expect(pickReadableName([glyph, 'Word'])).toBe('Word');
    }
});
