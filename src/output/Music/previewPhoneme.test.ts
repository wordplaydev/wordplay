import { expect, test } from 'vitest';
import {
    phonemeNote,
    previewWords,
    PreviewSeconds,
} from '@output/Music/previewPhoneme';
import { Phonemes } from '@output/Music/phonemes';
import { articulate } from '@output/Music/articulate';
import DefaultLocale from '@locale/DefaultLocale';

test('a preview note sings the symbol on the voice', () => {
    const note = phonemeNote('ʃ', 12);
    expect(note.instrument).toBe('voice');
    // Framed and held: a fricative alone is not what anyone hears it as, and
    // at its speech length there is too little of it to hear at all.
    expect(note.words).toBe('aʃːːa');
    expect(phonemeNote('a', 12).words).toBe('a');
    expect(note.startTime).toBe(12);
    expect(note.durationSeconds).toBe(PreviewSeconds);
    // Below middle C, so a nasal's ~250Hz resonance sits above the fundamental
    // rather than being tuned up out of the way to meet it.
    expect(note.semitones).toBeLessThan(0);
});

test('consonants are framed by vowels, and held ones are held', () => {
    // Most consonants are not identifiable alone — a stop has nothing to close
    // off from, and an l is mostly its transitions.
    expect(previewWords('a')).toBe('a');
    expect(previewWords('i')).toBe('i');
    // A stop or click is an event: framed, but never stretched, since a long
    // burst is a hiss rather than a pop.
    expect(previewWords('ʔ')).toBe('aʔa');
    expect(previewWords('b')).toBe('aba');
    expect(previewWords('ǃ')).toBe('aǃa');
    // Everything that can be held is, because at speech length there is too
    // little steady state to identify — an approximant gives 25ms of itself
    // inside a preview otherwise made of vowel.
    expect(previewWords('l')).toBe('alːːa');
    expect(previewWords('ʃ')).toBe('aʃːːa');
    expect(previewWords('m')).toBe('amːːa');
});

test('holding a consonant actually lengthens it', () => {
    // The length marks are only useful if the parser applies them, and this is
    // the whole reason the previews changed.
    const held = articulate(previewWords('j'), 1);
    const bare = articulate('aja', 1);
    const middle = (segments: { at: number; seconds: number }[]) =>
        segments[1].seconds;
    expect(middle(held)).toBeGreaterThan(middle(bare) * 3);
});

test('every symbol the chooser can offer actually makes a sound', () => {
    // The chooser lists the whole table, so a symbol that articulated to
    // silence would be a row that does nothing when pressed.
    for (const [symbol] of Phonemes) {
        const segments = articulate(
            phonemeNote(symbol, 0).words,
            PreviewSeconds,
        );
        expect(segments.length, symbol).toBeGreaterThan(0);
        expect(
            segments.some((segment) => segment.gain > 0),
            symbol,
        ).toBe(true);
    }
});

test('the chooser has an example word for every symbol', () => {
    // `ui.phonemes.examples` is a positional array read by index against
    // `Phonemes`, so a symbol added without an example would silently render a
    // blank cell, and one added in the middle would shift every word after it
    // onto the wrong sound.
    expect(DefaultLocale.ui.phonemes.examples).toHaveLength(Phonemes.size);
    expect(
        DefaultLocale.ui.phonemes.examples.every(
            (example) => example.trim().length > 0,
        ),
    ).toBe(true);
});

test('the chooser has a heading for every group of sounds', () => {
    const manners = new Set([...Phonemes.values()].map((p) => p.manner));
    expect(DefaultLocale.ui.phonemes.groups).toHaveLength(manners.size);
});
