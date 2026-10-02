import { describe, expect, test } from 'vitest';
import {
    getKeywordWords,
    getSymKey,
    locateWord,
    speakToken,
    toChunks,
    type Piece,
} from '@components/speech/reading';
import DefaultLocale from '@locale/DefaultLocale';

const keywords = getKeywordWords(DefaultLocale.keyword);
const words = { keywords, names: DefaultLocale.token };

function text(value: string, target = value, lang = 'en'): Piece<string> {
    return { kind: 'text', text: value, lang, target };
}

function token(
    value: string,
    category: string | undefined,
    target = value,
    example = 0,
): Piece<string> {
    return {
        kind: 'token',
        text: value,
        category,
        example,
        sym: getSymKey(value),
        lang: 'en',
        target,
    };
}

/** What a lone-token example says. */
function alone(value: string, category: string) {
    return toChunks([token(value, category)], words)[0]?.text.trim();
}

describe('code is read as written, with its symbols given words', () => {
    test('a keyword glyph is read as its word', () => {
        expect(speakToken('ƒ', 'eval', keywords)).toBe('function');
        expect(speakToken('⊤', 'literal', keywords)).toBe('true');
    });

    test('structure is silent', () => {
        expect(speakToken('(', 'delimiter', keywords)).toBe('');
        expect(speakToken(':', 'relation', keywords)).toBe('');
        expect(speakToken("'", 'literal', keywords)).toBe('');
    });

    test('names, numbers, words, and operators are read as they are', () => {
        expect(speakToken('Phrase', 'name', keywords)).toBe('Phrase');
        expect(speakToken('2', 'literal', keywords)).toBe('2');
        expect(speakToken('+', 'operator', keywords)).toBe('+');
    });

    test('an example reads as its words, apart from each other', () => {
        const pieces = [
            token('Phrase', 'name'),
            token('(', 'delimiter'),
            token("'", 'literal', 'open'),
            token('hi', 'literal'),
            token("'", 'literal', 'close'),
            token('size', 'name'),
            token(':', 'relation'),
            token('2', 'literal'),
            token('m', 'type'),
            token(')', 'delimiter'),
        ];
        expect(toChunks(pieces, words).map((c) => c.text.trim())).toEqual([
            'Phrase hi size 2 m',
        ]);
    });
});

describe('an example of a lone symbol names the symbol', () => {
    test('a keyword that is not a value says what it is, not its word', () => {
        // "then a \?\, then a true expression" must not read "then a then".
        expect(alone('?', 'operator')).toBe('conditional');
    });

    test('structure that would be silent is named', () => {
        expect(alone('[', 'delimiter')).toBe('list open');
        expect(alone(':', 'relation')).toBe('bind');
    });

    test('a value keeps its word', () => {
        expect(alone('⊤', 'literal')).toBe('true');
        expect(alone('⊥', 'literal')).toBe('false');
    });

    test('names, numbers, and operators read as usual', () => {
        expect(alone('c', 'name')).toBe('c');
        expect(alone('1', 'literal')).toBe('1');
        expect(alone('×', 'operator')).toBe('×');
    });

    test('an example that would be silent names each of its symbols', () => {
        const chunks = toChunks(
            [token('{', 'delimiter'), token('}', 'delimiter')],
            words,
        );
        expect(chunks[0]?.text.trim()).toBe('set/map open set/map close');
    });

    test('a longer example reads as code, apart from the lone one beside it', () => {
        const chunks = toChunks(
            [
                text('Use '),
                token('?', 'operator', 'q', 0),
                text(' in '),
                token('a', 'name', 'a', 1),
                token('?', 'operator', 'b', 1),
                token('b', 'name', 'c', 1),
            ],
            words,
        );
        expect(chunks[0]?.text.trim()).toBe('Use conditional  in a then b');
    });
});

describe('prose becomes utterances', () => {
    test('text runs join as written, one utterance per block', () => {
        const chunks = toChunks(
            [text('Hello '), text('there'), { kind: 'break' }, text('Next')],
            words,
        );
        expect(chunks.map((c) => c.text)).toEqual(['Hello there', 'Next']);
    });

    test('a change of language starts a new utterance in that language', () => {
        const chunks = toChunks(
            [text('Say ', 'a'), text('hola', 'b', 'es')],
            words,
        );
        expect(chunks.map((c) => [c.text, c.lang])).toEqual([
            ['Say ', 'en'],
            ['hola', 'es'],
        ]);
    });

    test('blank blocks are not utterances', () => {
        expect(toChunks([text('  \n '), { kind: 'break' }], words)).toEqual([]);
    });

    test('whitespace keeps its length, so offsets stay one to one', () => {
        const [chunk] = toChunks([text('a b\nc')], words);
        expect(chunk?.text).toBe('a b c');
    });

    test('a token inside a sentence is spaced from the words around it', () => {
        const chunks = toChunks(
            [text('Try'), token('Phrase', 'name'), text('now')],
            words,
        );
        expect(chunks[0]?.text).toBe('Try Phrase now');
    });
});

describe('a spoken word finds its place on the page', () => {
    const [chunk] = toChunks(
        [text('Hello ', 'one'), text('big world', 'two')],
        words,
    );

    test('a word inside one text run', () => {
        expect(chunk && locateWord(chunk, 10, 5)).toEqual({
            start: { target: 'two', offset: 4, whole: false },
            end: { target: 'two', offset: 9, whole: false },
        });
    });

    test('an engine that reports no length ends the word at a space', () => {
        expect(chunk && locateWord(chunk, 6, undefined)).toEqual({
            start: { target: 'two', offset: 0, whole: false },
            end: { target: 'two', offset: 3, whole: false },
        });
    });

    test('a word in code highlights its whole token', () => {
        const [code] = toChunks(
            [token('ƒ', 'eval', 'glyph'), token('f', 'name', 'name')],
            words,
        );
        expect(code && locateWord(code, 0, 8)).toEqual({
            start: { target: 'glyph', offset: 0, whole: true },
            end: { target: 'glyph', offset: 8, whole: true },
        });
    });
});
