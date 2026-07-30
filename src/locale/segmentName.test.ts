import { expect, test } from 'vitest';
import segmentName from './segmentName';

test.each([
    // Camel-cased identifiers become words, since a name has to be one token
    // in code but is unreadable as one run of letters.
    ['eyesOpen', 'eyes open'],
    ['mouthOpenAmount', 'mouth open amount'],
    ['browRaiseAmount', 'brow raise amount'],
    // Already one word, or not camel-cased: untouched.
    ['place', 'place'],
    ['lessthan', 'lessthan'],
    ['', ''],
    // A name that starts uppercase keeps its capitals — those are deliberate.
    ['Phrase', 'Phrase'],
    ['PhraseGroup', 'Phrase Group'],
    // An acronym run breaks before the next word, not inside itself.
    ['HTMLTag', 'HTML Tag'],
    // Digits are word boundaries too.
    ['level2Boss', 'level2 boss'],
    // Non-Latin names have no case, so nothing changes.
    ['ねこ', 'ねこ'],
    ['📍', '📍'],
])('%s → %s', (input, expected) => {
    expect(segmentName(input)).toBe(expected);
});
