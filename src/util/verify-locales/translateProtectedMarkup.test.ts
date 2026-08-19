import { describe, expect, test } from 'vitest';
import { mismatchedDelimiter } from '@util/verify-locales/protect';
import { translateProtectedMarkup } from './ClaudeTranslator';

/** A model doing what models do to markup they don't recognize: rewrite the
 *  words, including inside `\…\`, and drop the delimiters on the way out. */
const sloppy = async (units: string[]) =>
    units.map((u) =>
        u
            .replace(/Adds/g, 'Añade')
            .replace(/count/g, 'cuenta')
            .replace(/\\/g, ''),
    );

describe('translateProtectedMarkup', () => {
    test('keeps an embedded example out of the model’s hands', async () => {
        // The regression: sent raw, this came back as "Añade cuenta things" —
        // no backslashes, so mismatchedDelimiter rejected it and the whole
        // example fell back to English.
        const source = 'Adds \\count\\ things';
        const [out] = await translateProtectedMarkup([source], sloppy);
        expect(out).toBe('Añade \\count\\ things');
        expect(mismatchedDelimiter(source, out)).toBeUndefined();
    });

    test('still translates the prose around the code', async () => {
        const [out] = await translateProtectedMarkup(
            ['Adds \\count\\ things'],
            sloppy,
        );
        expect(out).toContain('Añade');
        expect(out).toContain('\\count\\');
    });

    test('masks concept links across the round trip', async () => {
        const eat = async (units: string[]) =>
            units.map((u) => u.replace(/[A-Za-z]+/g, 'X'));
        const [out] = await translateProtectedMarkup(['See @Phrase now'], eat);
        expect(out).toContain('@Phrase');
    });

    test('text with no markup passes through translated', async () => {
        const [out] = await translateProtectedMarkup(['Adds things'], sloppy);
        expect(out).toBe('Añade things');
    });

    test('a failed unit keeps its original rather than a broken program', async () => {
        const fail = async (units: string[]) => units.map(() => null);
        const source = 'Adds \\count\\ things';
        expect(await translateProtectedMarkup([source], fail)).toEqual([
            source,
        ]);
    });

    test('text that is entirely code is never sent at all', async () => {
        let called = false;
        const spy = async (units: string[]) => {
            called = true;
            return units.map(() => 'nope');
        };
        expect(await translateProtectedMarkup(['\\1 + 2\\'], spy)).toEqual([
            '\\1 + 2\\',
        ]);
        expect(called).toBe(false);
    });

    test('units line up across several texts', async () => {
        const upper = async (units: string[]) =>
            units.map((u) => u.toUpperCase());
        expect(
            await translateProtectedMarkup(
                ['one \\a\\', 'two', 'three \\b\\'],
                upper,
            ),
        ).toEqual(['ONE \\a\\', 'TWO', 'THREE \\b\\']);
    });
});

test('a unit the model gave a stray delimiter is dropped, not shipped', async () => {
    // splitMarkupAndCode removes every `\…\` from a unit, so a backslash in the
    // response is invented. Left in, it unbalances the example and the caller
    // throws the whole example away.
    const inventive = async (units: string[]) =>
        units.map((u) => `${u} \\oops`);
    const source = 'Adds \\count\\ things';
    const [out] = await translateProtectedMarkup([source], inventive);
    expect(out).toBe(source);
    expect(mismatchedDelimiter(source, out)).toBeUndefined();
});

test('one bad unit does not cost the good ones', async () => {
    const mixed = async (units: string[]) =>
        units.map((u) =>
            u.includes('two') ? `${u} \`stray` : u.toUpperCase(),
        );
    const [out] = await translateProtectedMarkup(['one \\a\\ two'], mixed);
    // The whole text is one markup run here, so it reverts wholesale; what
    // matters is that the delimiters survive.
    expect(mismatchedDelimiter('one \\a\\ two', out)).toBeUndefined();
});
