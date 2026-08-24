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
    expect(Markup.words(input).getFirstSentence(DefaultLocales)?.toText()).toBe(
        expected,
    );
});

test('empty markup has no first sentence', () => {
    expect(Markup.words('').getFirstSentence(DefaultLocales)).toBeUndefined();
});

test('whitespace-only markup has no first sentence', () => {
    expect(
        Markup.words('   ').getFirstSentence(DefaultLocales),
    ).toBeUndefined();
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

// withMappedWords converts prose and nothing else. Doc markup is the only place
// examples, mentions, and links actually occur, so it is where they're tested.
test.each([
    ['hello there', 'HELLO THERE'],
    // A concept link is an identifier the docs resolve, not a word.
    ['see @Text now', 'SEE @Text NOW'],
    // Example code is code, and its identifiers are case sensitive.
    ["run \\Phrase('hi')\\ now", "RUN \\Phrase('hi')\\ NOW"],
    // A mention is a template key that concretize matches by name.
    ['hello $name here', 'HELLO $name HERE'],
    // Words in a caseless script come back untouched, spacing intact.
    ['\u65e5\u672c\u8a9e hi', '\u65e5\u672c\u8a9e HI'],
])('uppercasing "%s" gives "%s"', (input, expected) => {
    expect(
        Markup.words(input)
            .withMappedWords((text) => text.toUpperCase())
            .toText(),
    ).toBe(expected);
});

test('mapped markup keeps its paragraphs and metadata', () => {
    const original = Markup.words('one two\n\nthree');
    const mapped = original.withMappedWords((text) => text.toUpperCase());
    expect(mapped.paragraphs).toHaveLength(2);
    expect(mapped.getPlainText()).toBe(original.getPlainText().toUpperCase());
    expect(mapped.metadata).toEqual(original.metadata);
});

test('formatting delimiters survive, and the words inside them convert', () => {
    const mapped = Markup.words('/hello/ *world*').withMappedWords((text) =>
        text.toUpperCase(),
    );
    expect(mapped.toWordplay(mapped.spaces)).toBe('/HELLO/ *WORLD*');
});

test("a link's description converts but its URL does not", () => {
    const mapped = Markup.words(
        '<wordplay@https://wordplay.dev/Guide>',
    ).withMappedWords((text) => text.toUpperCase());
    expect(mapped.toWordplay(mapped.spaces)).toBe(
        '<WORDPLAY@https://wordplay.dev/Guide>',
    );
});
