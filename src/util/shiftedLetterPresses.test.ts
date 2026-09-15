import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { expect, test } from 'vitest';

/**
 * A shifted letter must be pressed as a code, never as a letter.
 *
 * `playwright-core`'s `buildLayoutClosure` registers each key under its code
 * *with* a `.shifted` descriptor and under its character *without* one, and
 * `_keyDescriptionForString` only substitutes the shifted descriptor when it
 * exists. So `press('Control+Shift+z')` delivers `key: 'z'`, while a real
 * browser delivers `'Z'` — the synthetic keystroke is one no user can produce.
 *
 * That is not a nuisance, it is a test that certifies nothing. The character
 * editor's `Control+Shift+Z` redo was broken for every real user for as long as
 * a passing e2e test pressed exactly this, because the handler compared against
 * `'z'` and Playwright obligingly sent `'z'`.
 *
 * `press('Control+Shift+KeyZ')` sends `'Z'`, which is what a person's keyboard
 * sends. Use that.
 */
const ShiftedLetter = /press\(\s*['"`][^'"`]*Shift\+[a-z]['"`]\s*\)/g;

const Directory = 'tests/end2end';

test('no end-to-end test presses a shifted letter as a letter', () => {
    const offenders = readdirSync(Directory)
        .filter((name) => name.endsWith('.spec.ts'))
        .flatMap((name) => {
            const source = readFileSync(join(Directory, name), 'utf8');
            return [...source.matchAll(ShiftedLetter)].map(
                (match) => `${name}: ${match[0]}`,
            );
        });
    expect(
        offenders,
        'press the code (Shift+KeyZ), not the letter (Shift+z): Playwright sends the unshifted key for the letter form, which no browser does',
    ).toEqual([]);
});
