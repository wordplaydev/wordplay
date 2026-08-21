import { expect, test } from 'vitest';
import { translationProblem } from './translationGuards';

test('a clean translation is accepted', () => {
    expect(translationProblem('hello there', 'hola ahí')).toBeUndefined();
});

test('a translation that drops an example delimiter is rejected', () => {
    // The `\…\` counts must match: localization never adds or drops one, so a
    // difference means the example was orphaned and stops tokenizing.
    expect(
        translationProblem('try this: \\1 + 1\\', 'prueba esto: \\1 + 1'),
    ).toBe('delimiter');
});

test('a translation that doubles a code delimiter is rejected', () => {
    expect(translationProblem('a `b` c', 'a ``b`` c')).toBe('delimiter');
});

test('an apostrophe inside an example is rejected', () => {
    // A transliteration's glottal stop written as `'` opens a text literal that
    // swallows the rest of the example — but only in code, which is why the
    // check looks inside `\\…\\` rather than at the whole string.
    expect(
        translationProblem('like this: \\joe: 5\\', "así: \\o'brien: 5\\"),
    ).toBe('unclosed');
});

test('an apostrophe in prose is just an apostrophe', () => {
    // French, Italian, and possessive English are full of them. Rejecting these
    // silently kept the English and was the single biggest cause of a doc that
    // wouldn't translate.
    expect(
        translationProblem(
            'A resting sequence animates forever.',
            "Une séquence au repos s'anime pour toujours.",
        ),
    ).toBeUndefined();
    expect(translationProblem('the cat of Amy', "Amy's cat")).toBeUndefined();
});

test("an example that was already unbalanced isn't blamed on the translation", () => {
    // Rejecting this would mean such a string could never be translated.
    expect(
        translationProblem("\\o'brien: 5\\", "\\o'brien: 5\\"),
    ).toBeUndefined();
});
