import { expect, test } from 'vitest';
import { splitCharacterRefs } from '@output/splitCharacterRefs';

test('plain text with no references is a single text chunk', () => {
    expect(splitCharacterRefs('hello world')).toEqual([
        { kind: 'text', text: 'hello world' },
    ]);
});

test('a custom-character reference splits into text and character chunks', () => {
    const chunks = splitCharacterRefs('a @amy/cat b');
    expect(chunks.map((c) => (c.kind === 'text' ? c.text : c.ref))).toEqual([
        'a ',
        '@amy/cat',
        ' b',
    ]);
    expect(chunks[1]).toMatchObject({ kind: 'character', ref: '@amy/cat' });
    if (chunks[1].kind === 'character') {
        expect(chunks[1].name.username).toBe('amy');
        expect(chunks[1].name.name).toBe('cat');
    }
});

test('a leading reference produces no empty text chunk', () => {
    const chunks = splitCharacterRefs('@amy/cat!');
    expect(chunks[0].kind).toBe('character');
    expect(chunks.map((c) => (c.kind === 'text' ? c.text : c.ref))).toEqual([
        '@amy/cat',
        '!',
    ]);
});

test('reserved concept references are left as plain text', () => {
    // @Phrase is a reserved concept, not a custom character, so it is not a
    // character chunk.
    expect(splitCharacterRefs('see @Phrase')).toEqual([
        { kind: 'text', text: 'see @Phrase' },
    ]);
});
