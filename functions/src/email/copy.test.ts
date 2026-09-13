import { describe, expect, test } from 'vitest';
import { field, substitute, toPlainText, withoutAnnotations } from './copy.js';

describe('write-status markers', () => {
    test.each([
        ['$?Sign in', 'Sign in'],
        ['$!Sign in', 'Sign in'],
        ['$~Sign in', 'Sign in'],
        // A value can carry more than one marker; none of them is copy.
        ['$~$!Sign in', 'Sign in'],
        ['Sign in', 'Sign in'],
        ['$? Sign in ', 'Sign in'],
    ])('%s reads as %s', (raw, clean) => {
        expect(withoutAnnotations(raw)).toBe(clean);
    });

    test('a marker inside the text is left alone', () => {
        expect(withoutAnnotations('Costs $5')).toBe('Costs $5');
    });
});

describe('falling back per field', () => {
    test.each([
        [undefined, 'fallback'],
        [{}, 'fallback'],
        [{ x: 7 }, 'fallback'],
        [{ x: '' }, 'fallback'],
        [{ x: '$?' }, 'fallback'],
        [{ x: 'translated' }, 'translated'],
        [{ x: '$~translated' }, 'translated'],
    ])('%o gives %s', (section, expected) => {
        // Per field rather than per section, so a partly translated locale
        // still sends: a half-filled email is worse than an English one.
        expect(field(section, 'x', 'fallback')).toBe(expected);
    });
});

describe('filling a template', () => {
    test('a named input', () => {
        expect(substitute('About "$title"', { title: 'A kit' }, 'en')).toBe(
            'About "A kit"',
        );
    });

    test('the longer name wins, so one input cannot eat another', () => {
        expect(
            substitute('$count of $counted', { count: 2, counted: 9 }, 'en'),
        ).toBe('2 of 9');
    });

    test.each([
        [1, 'Warning 1 about it.'],
        [3, 'Warning 3 about it.'],
    ])('a plural arm for %i', (count, expected) => {
        expect(
            substitute('Warning $#count[1|$count] about it.', { count }, 'en'),
        ).toBe(expected);
    });

    test('a locale with one form degrades to its only arm', () => {
        // Japanese distinguishes no plural forms, so its string has one arm.
        expect(substitute('$#count[$count件]', { count: 5 }, 'ja')).toBe('5件');
    });

    test('too few arms clamps rather than rendering nothing', () => {
        // A translator who wrote one arm where the locale needs two should lose
        // the distinction, not the sentence.
        expect(substitute('$#count[one]', { count: 9 }, 'en')).toBe('one');
    });

    test('an input with no value is left as written', () => {
        // Never the app's "Unparsable template" text, which must not be mailed.
        expect(substitute('About "$title"', {}, 'en')).toBe('About "$title"');
    });
});

describe('reducing markup to what an email shows', () => {
    test.each([
        ['Plain words', 'Plain words'],
        ['*bold* words', 'bold words'],
        ['_light_ words', 'light words'],
        ['A <label@https://wordplay.dev> link', 'A label link'],
        // A bare URL is its own token in markup rather than a bracketed link,
        // so it passes through as the address it already is.
        ['Go to https://wordplay.dev now', 'Go to https://wordplay.dev now'],
        ['A @Phrase concept', 'A Phrase concept'],
    ])('%s reads as %s', (markup, plain) => {
        // Several notice strings are `[formatted]`, so a translator may
        // legitimately add emphasis a one-line headline does not need.
        expect(toPlainText(markup)).toBe(plain);
    });
});
