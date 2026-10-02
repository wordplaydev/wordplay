import evaluateCode from '#runtime/evaluate.ts';
import ListValue from '#values/ListValue.ts';
import TextValue from '#values/TextValue.ts';
import { expect, test } from 'vitest';

/** Each part of a text value as `text/lang`, or just the text when untagged. */
function partsOf(code: string): string[] | undefined {
    const value = evaluateCode(code);
    if (!(value instanceof TextValue)) throw new Error(`${code} is not text`);
    return value.parts?.map(
        (part) =>
            `${part.text}${part.language ? `/${part.language.getBCP47()}` : ''}`,
    );
}

/** A text in one language needs no parts: that is every ordinary value. */
test.each([
    "'hi'",
    "'hi'/en",
    "'hi'/en + ' there'",
    "'hi'/en + ' there'/en",
    "'hi' + 'hola'",
    "'hi \\'you'/en\\'/en",
])('%s has no parts', (code) => {
    expect(partsOf(code)).toBeUndefined();
});

test.each([
    ["'hi'/en + 'hola'/es", ['hi/en', 'hola/es']],
    // Untagged text joined to tagged text takes its tag, as `+` always has.
    ["'hi'/en + ' ' + 'hola'/es", ['hi /en', 'hola/es']],
    ["('hi'/en + 'hola'/es) · 2", ['hi/en', 'hola/es', 'hi/en', 'hola/es']],
    ["('hi'/en + 'hola'/es).subsequence(2 5)", ['i/en', 'hol/es']],
    ["('hi'/en + 'hola'/es).subsequence(5 2)", ['loh/es', 'i/en']],
    ["('hi'/en + 'hola'/es).reverse()", ['aloh/es', 'ih/en']],
    ["(' hi'/en + 'hola '/es).trim()", ['hi/en', 'hola/es']],
    ["('hi'/en + 'hola'/es).uppercase()", ['HI/en', 'HOLA/es']],
    [
        "('hi hi'/en).replace('i' 'ola'/es)",
        ['h/en', 'ola/es', ' h/en', 'ola/es'],
    ],
    // An interpolated text keeps its own language inside the literal's.
    ["'hello \\'amigo'/es\\ there'/en", ['hello /en', 'amigo/es', ' there/en']],
    // An untagged part of an interpolation is in the literal's language.
    ["'\\('hi'/en + 'hola'/es) + ' x'\\'/fr", ['hi/en', 'hola/es', ' x/fr']],
])('%s has parts %j', (code, parts) => {
    expect(partsOf(code)).toEqual(parts);
});

test('a segment keeps the parts that fall in it', () => {
    const value = evaluateCode(
        "('hi there'/en + ' hola amigo'/es).segment(' ')",
    );
    if (!(value instanceof ListValue)) throw new Error('not a list');
    // Each word is tagged with the union, whose primary language is English, so
    // the Spanish words say so in their parts.
    expect(
        value.values.map((text) =>
            text instanceof TextValue
                ? (text.parts?.map((part) => part.language?.getBCP47()) ??
                  'union')
                : 'not text',
        ),
    ).toEqual(['union', 'union', ['es'], ['es']]);
});

test('parts do not change equality or the value-level tag', () => {
    expect(evaluateCode("'hi'/en + 'hola'/es = 'hihola'")?.toString()).toBe(
        '⊤',
    );
    const value = evaluateCode("'hi'/en + 'hola'/es");
    expect(
        value instanceof TextValue ? value.language?.getTagString() : '',
    ).toBe('en_es');
});
