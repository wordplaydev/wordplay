import { describe, expect, test } from 'vitest';
import {
    queuedForTranslation,
    repairConceptName,
} from '@util/verify-locales/verifyTutorial';

test.each([
    // A glued translation fragment truncates to the valid property.
    ['Boolean.andXYZ', [], ['and', 'or', 'not'], 'Boolean.and'],
    // The default tutorial's link at the same position wins, even for full translations.
    [
        'Pose.опацити',
        ['Phrase.exiting', 'Pose.opacity'],
        [],
        'Pose.opacity',
    ],
    // Ambiguous defaults (two links on the same concept) fall back to the prefix rule.
    [
        'Pose.rotationXY',
        ['Pose.opacity', 'Pose.rotation'],
        ['rotation', 'opacity'],
        'Pose.rotation',
    ],
    // The longest valid prefix wins.
    ['Phrase.namee', [], ['n', 'name'], 'Phrase.name'],
    // A different concept in the default and no prefix match is not repairable.
    ['Pose.kaliwanagan', ['Color.lightness'], ['opacity'], undefined],
    // A link with no property is not repairable.
    ['Pose', ['Pose.opacity'], ['opacity'], undefined],
])(
    'repairConceptName(%s, %j, %j) → %s',
    (
        name: string,
        defaults: string[],
        valid: string[],
        expected: string | undefined,
    ) => {
        expect(repairConceptName(name, defaults, valid)).toBe(expected);
    },
);

describe('queuedForTranslation', () => {
    test('$? and $! both queue a string', () => {
        // They disagreed before #1264: `$!` queued a locale doc but was a
        // silent no-op for a tutorial, so a full run translated none of them.
        expect(queuedForTranslation('$?Hello', false)).toBe(true);
        expect(queuedForTranslation('$!Hello', false)).toBe(true);
    });

    test('already-written text is left alone', () => {
        expect(queuedForTranslation('Hello', false)).toBe(false);
        expect(queuedForTranslation('$~Hello', false)).toBe(false);
    });

    test('override reaches machine-translated text, but not written text', () => {
        expect(queuedForTranslation('$~Hello', true)).toBe(true);
        expect(queuedForTranslation('Hello', true)).toBe(false);
    });
});
