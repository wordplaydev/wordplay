import { expect, test } from 'vitest';
import DefaultLocales from '@locale/DefaultLocales';
import Markup from '@nodes/Markup';

test.each([
    // Multi-sentence first paragraph: only the first sentence.
    ['Hello world. Goodbye world.', 'Hello world.'],
    // Multi-paragraph markup: only the first paragraph's first sentence.
    ['First here. More here.\n\nSecond paragraph.', 'First here.'],
    // Newline-separated sentences within one paragraph: still the first only.
    ['One.\nTwo.\nThree.\nFour.\nFive', 'One.'],
    // Bulleted first paragraph: the first bullet's text, sans bullet symbol.
    ['• First bullet. Still first.\n• Second bullet.', 'First bullet.'],
    // Inline formatting delimiters are stripped.
    ['/italic/ text here. Next.', 'italic text here.'],
    // Single sentence with no terminator: returns the whole fragment.
    ['Just a title', 'Just a title'],
])('first sentence of "%s" is "%s"', (input, expected) => {
    expect(Markup.words(input).getFirstSentence(DefaultLocales)?.toText()).toBe(expected);
});

test('empty markup has no first sentence', () => {
    expect(Markup.words('').getFirstSentence(DefaultLocales)).toBeUndefined();
});

test('whitespace-only markup has no first sentence', () => {
    expect(Markup.words('   ').getFirstSentence(DefaultLocales)).toBeUndefined();
});
