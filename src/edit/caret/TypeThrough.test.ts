import Project from '@db/projects/Project';
import type { SerializedProject } from '@db/projects/ProjectSchemas';
import Caret from '@edit/caret/Caret';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import UnicodeString from '@unicode/UnicodeString';
import { describe, expect, test } from 'vitest';
import { readProjects } from '../../examples/readProjects';

/**
 * The text-mode typing invariant: typing any syntactically correct program character by character
 * produces exactly that program. Autocomplete may only insert text that would have been typed
 * later anyway (closing delimiters), and typing those characters must type over the auto-inserted
 * ones. These tests simulate every keystroke through Caret.insert with completion on and assert
 * the result is textually identical to the program typed.
 */

/** Simulate typing the program grapheme by grapheme in text mode, returning the resulting code. */
function typeProgram(program: string): string {
    let source = new Source('test', '');
    let caret = new Caret(source, 0, undefined, undefined);
    for (const grapheme of new UnicodeString(program).getGraphemes()) {
        // Rebuild the project each keystroke so analysis sees the current source; Project.make is lazy.
        const project = Project.make(null, 'test', source, [], DefaultLocale);
        const result = caret.insert(grapheme, false, project, true);
        // Raw typing must never be refused in text mode; a message or bare caret is a failure.
        if (!Array.isArray(result))
            throw new Error(
                `Typing ${JSON.stringify(grapheme)} into ${JSON.stringify(
                    source.getCode().toString(),
                )} at ${JSON.stringify(caret.position)} produced no edit`,
            );
        caret = result[1];
        source = caret.source;
    }
    return source.getCode().toString();
}

/** Programs covering every delimiter and construct the completer can touch. */
const Corpus: [string, string][] = [
    ['numbers and operators', '1 + 2 · 3'],
    ['negative number', '-1'],
    ['unary not', '~⊤'],
    ['logic with unary operand', '⊤ & ~⊥'],
    ['percent', '50%'],
    ['unit arithmetic', '1.5m/s'],
    ['block', '(1)'],
    ['nested blocks', '((1))'],
    ['nested lists', '[1 [2 3]]'],
    ['set', '{1 2}'],
    ['map', '{1:2 3:4}'],
    ['full width block', '（1）'],
    ['full width list', '［1 2］'],
    ['full width set', '｛1｝'],
    ["text '", "'a'"],
    ['text "', '"a"'],
    ['text “”', '“a”'],
    ['text „“', '„a“'],
    ['text ‘’', '‘a’'],
    ['text ‹›', '‹a›'],
    ['text «»', '«a»'],
    ['text 「」', '「a」'],
    ['text 『』', '『a』'],
    ['text with language', "'hello'/en"],
    ['text with emoji graphemes', '"😀👍🏽"'],
    ['empty text', "''"],
    ['bind', 'x: 1'],
    ['typed bind', 'x•#: 1'],
    ['evaluate with named input', "Phrase('hi' rest: 1)"],
    ['property reference', 'a: 1\na.add(2)'],
    ['convert', "1 → ''"],
    ['conditional', '1 > 2 ? 3 4'],
    ['function definition', 'ƒ add(a•# b•#) a + b\nadd(1 2)'],
    ['structure definition', "•Cat(name•'')"],
    ['type inputs', 'ƒ id⸨T⸩(v•T) v'],
    ['table', '⎡a•# b•#⎦⎡1 2⎦'],
    ['stream', 'Time(10ms)'],
    ['reaction', 'pick: ⊤…∆Button()…⊥'],
    ['stream symbol from dots', '1 … ∆Time() … 2'],
    ['elision', '1 *2* 3'],
    ['doc', '¶hi¶1'],
    ['doc with bold', '¶a *b* c¶1'],
    ['doc with italic', '¶a /b/ c¶1'],
    ['doc with escaped formatting', '¶a //b// c¶1'],
    ['doc with underscore', '¶a _b_ c¶1'],
    ['doc with extra', '¶a ~b~ c¶1'],
    ['doc with light', '¶a ^b^ c¶1'],
    ['doc with example', '¶\\1 + 1\\¶1'],
    ['doc with link', '¶<wordplay@https://wordplay.dev>¶1'],
    ['doc with text literal in example', "¶\\'hi'\\¶1"],
    ['formatted', '`hello`'],
    ['formatted with italic', '`a /b/ c`'],
    ['pattern', "⣿'a'⣿"],
    ['multiple lines', 'a: 1\nb: 2\na + b'],
];

describe('typing a syntactically correct program produces exactly that program', () => {
    test.each(Corpus)('%s', (_, program) => {
        expect(typeProgram(program)).toBe(program);
    });
});

describe('typing a delimiter before its close types over it instead of doubling it', () => {
    test.each([
        ['symmetric quote', "'a'"],
        ['asymmetric quote', '“a”'],
        ['quote whose close opens another pair', '„a“'],
        ['formatted literal', '`a`'],
        ['doc', '¶a¶1'],
        ['pattern with text', "⣿'a'⣿"],
        ['example in a doc', '¶a \\1\\ b¶1'],
        ['interpolation in a text literal', "'a \\1\\ b'"],
        ['italic in a doc', '¶a /b/ c¶1'],
        ['escaped formatting in a doc', '¶a //b// c¶1'],
        ['full width parentheses', '（1）'],
        ['table', '⎡a•#⎦⎡1⎦'],
        ['table select', 't: ⎡a•#⎦⎡1⎦\nt ⎡? a a > 0⊤⎦'],
        ['type inputs', 'ƒ id⸨T⸩(v•T) v'],
    ])('%s', (_, program) => {
        expect(typeProgram(program)).toBe(program);
    });
});

/**
 * How much source an example may have and still be typed through here. Typing is quadratic — every
 * keystroke retokenizes and reparses the whole source — so this keeps the suite fast while still
 * covering a wide variety of real programs.
 */
const MaxTypeableLength = 800;

/** Typing a long example takes many seconds, well past the default per-test timeout. */
const Timeout = 30000;

/**
 * Examples that can't be typed back exactly, with why. Auto-close inserts a closing delimiter the
 * moment the open is typed, so a program that leaves a delimiter unclosed — legal for a text
 * literal, which the tokenizer also closes at a newline — keeps the close that was never typed.
 * That is the one inherent limit of auto-close; anything else failing here is a bug.
 */
const KnownExceptions = new Map<string, string>([
    ['WhatWord', 'the word list has an unclosed text literal, `"tapir`'],
]);

const examples: SerializedProject[] = readProjects('examples');
const typeable: { name: string; code: string }[] = [];
const skipped: { name: string; reason: string }[] = [];
for (const example of examples) {
    const exception = [...KnownExceptions].find(([name]) =>
        example.name.includes(name),
    );
    for (const [index, source] of example.sources.entries()) {
        const code = source.code.normalize().replace(/\r/g, '');
        if (code.length === 0 || code.length > MaxTypeableLength) continue;
        if (exception)
            skipped.push({
                name: `${example.name}/${index}`,
                reason: exception[1],
            });
        else typeable.push({ name: `${example.name}/${index}`, code });
    }
}

describe('typing each example program produces exactly that program', () => {
    test.each(typeable)(
        '$name',
        ({ code }) => {
            // Compare against parsing the whole program at once rather than the raw string, since
            // a Source drops variation selectors from emoji however its text arrives.
            const expected = new Source('test', code).getCode().toString();
            expect(typeProgram(code)).toBe(expected);
        },
        Timeout,
    );

    // Named rather than filtered away, so the output says what isn't covered and why.
    test.skip.each(skipped)('$name ($reason)', () => undefined);
});
