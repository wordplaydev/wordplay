import DefaultLocale from '@locale/DefaultLocale';
import checkDocContent from '@util/verify-locales/checkDocContent';
import getDocExamples from '@util/verify-locales/docExamples';
import { describe, expect, test } from 'vitest';

/** The problem kinds reported for a doc, for terse assertions. */
function kinds(doc: string) {
    return checkDocContent(doc, DefaultLocale).map((problem) => problem.kind);
}

describe('single-token examples are not analyzed', () => {
    test('a bare name mid-sentence is left alone', () => {
        // `tempo` resolves to nothing, so analyzing it reports UnknownName. That
        // says only that a word is a word; it used to force a 🪲 on every such span.
        expect(getDocExamples('My \\tempo\\ stays zero.')[0].tokens).toBe(1);
        expect(kinds('My \\tempo\\ stays zero.')).toEqual([]);
    });

    test('but a longer example with the same problem is still reported', () => {
        // Two unresolvable names rather than one. Nothing about the *kind* of
        // problem changed — only the length — so this is what proves the rule is
        // discriminating by token count rather than quietly disabling the check.
        const doc = 'Compare \\tempo beat\\ here.';
        expect(getDocExamples(doc)[0].tokens).toBeGreaterThan(1);
        expect(kinds(doc)).toEqual(['conflicts']);
    });

    test('a single-token example that is a valid program is fine either way', () => {
        expect(getDocExamples('Nothing is \\ø\\.')[0].tokens).toBe(1);
        expect(kinds('Nothing is \\ø\\.')).toEqual([]);
    });

    test('🪲 still excuses a multi-token example', () => {
        const doc = 'A binding with nothing to bind: \\hi: 5\\🪲';
        expect(getDocExamples(doc)[0].expectsDefect).toBe(true);
        expect(kinds(doc)).toEqual([]);
    });

    test('a real program with a real mistake is still reported', () => {
        // The check has to keep earning its place: a genuine multi-token program
        // whose types don't work must still fail.
        expect(kinds("Broken: \\1m + 'hi'\\")).toEqual(['conflicts']);
    });
});
