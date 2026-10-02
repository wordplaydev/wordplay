import evaluateCode from '#runtime/evaluate.ts';
import sayUtterances from '#output/Speech/sayUtterances.ts';
import TextValue from '#values/TextValue.ts';
import { expect, test } from 'vitest';

function text(code: string): TextValue {
    const value = evaluateCode(code);
    if (!(value instanceof TextValue)) throw new Error(`${code} is not text`);
    return value;
}

test('a line in one language is one utterance in it', () => {
    const utterances = sayUtterances('say', text("'hola'/es"), true, 'en-US');
    expect(utterances.map((u) => [u.text, u.lang])).toEqual([['hola', 'es']]);
});

test('untagged text is spoken in the fallback language', () => {
    const utterances = sayUtterances('say', text("'hola'"), true, 'es-MX');
    expect(utterances.map((u) => u.lang)).toEqual(['es-MX']);
});

test('a line in several languages is one utterance per language (#111)', () => {
    const utterances = sayUtterances(
        'say',
        text("'hello '/en + 'amigo'/es"),
        true,
        'en-US',
    );
    expect(utterances.map((u) => [u.text, u.lang])).toEqual([
        ['hello ', 'en'],
        ['amigo', 'es'],
    ]);
    // The caption is the whole line throughout.
    expect(utterances.map((u) => u.caption)).toEqual([
        'hello amigo',
        'hello amigo',
    ]);
});
