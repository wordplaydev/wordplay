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

test('example texts contain example code but not prose, and vice versa', () => {
    const markup = Markup.words("Make a phrase: \\Phrase('hi')\\ like so.");
    const examples = markup.getExampleTexts();
    expect(examples).toHaveLength(1);
    expect(examples[0]).toContain("Phrase('hi')");
    expect(examples[0]).not.toContain('Make a phrase');
    // The prose index should not pick up the example code.
    expect(markup.getWordsTexts().join(' ')).not.toContain('Phrase(');
});

test('example texts collapse multi-line code to a single line', () => {
    const markup = Markup.words('Before.\n\n\\a: 1\na + 1\\\n\nAfter.');
    const examples = markup.getExampleTexts();
    expect(examples).toHaveLength(1);
    expect(examples[0]).toContain('a + 1');
    expect(examples[0]).not.toContain('\n');
});

test('markup without examples has no example texts', () => {
    expect(Markup.words('Just prose.').getExampleTexts()).toHaveLength(0);
});
