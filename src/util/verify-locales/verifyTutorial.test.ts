import { expect, test } from 'vitest';
import { repairConceptName } from '@util/verify-locales/verifyTutorial';

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
