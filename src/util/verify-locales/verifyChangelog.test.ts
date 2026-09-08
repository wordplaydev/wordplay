import { MachineTranslated, Unwritten } from '@locale/Annotations';
import { describe, expect, test } from 'vitest';
import { changelogNeedsTranslation } from './verifyChangelog';

describe('changelogNeedsTranslation', () => {
    const translated = `${MachineTranslated}Agregamos una sección.`;

    test('buys an entry nothing has been bought for', () => {
        expect(changelogNeedsTranslation(undefined, false, false)).toBe(true);
        // Naming a release doesn't change that, and neither does override.
        expect(changelogNeedsTranslation(undefined, true, true)).toBe(true);
    });

    test('never buys the same entry twice', () => {
        // The whole economy of this pipeline: an ordinary run over a corpus
        // that is already translated sends nothing and costs nothing.
        expect(changelogNeedsTranslation(translated, false, false)).toBe(false);
        expect(changelogNeedsTranslation(translated, false, true)).toBe(false);
    });

    test('override redoes a machine translation', () => {
        expect(changelogNeedsTranslation(translated, true, false)).toBe(true);
    });

    test('override leaves a hand-written translation alone', () => {
        // A translation with no `$~` was written or repaired by a person, and
        // re-translating it would throw that work away.
        expect(
            changelogNeedsTranslation('Agregamos una sección.', true, false),
        ).toBe(false);
    });

    test('naming a release under override redoes it whatever its status', () => {
        // The `+changelog:<version>` escape hatch, for a translation that came
        // back damaged in a way no validator caught. Naming it has already
        // answered "which of these do I redo?".
        expect(
            changelogNeedsTranslation('Agregamos una sección.', true, true),
        ).toBe(true);
    });

    test('naming a release without override buys nothing already bought', () => {
        // `+changelog:0.35.0` on a plain translate run is a scope, not a redo.
        expect(changelogNeedsTranslation(translated, false, true)).toBe(false);
    });

    test('an unwritten marker is not a translation', () => {
        // Nothing writes this today, but if a fallback ever did, `override`
        // must be able to reach it.
        expect(
            changelogNeedsTranslation(`${Unwritten}We added…`, true, false),
        ).toBe(false);
    });
});
