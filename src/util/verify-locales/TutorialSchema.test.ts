import path from 'path';
import { describe, expect, test } from 'vitest';
import { getTutorialPath } from '@util/verify-locales/TutorialSchema';

describe('getTutorialPath', () => {
    test('defaults to the complete tutorial (no suffix)', () => {
        expect(getTutorialPath('fr-FR')).toBe(
            path.join('static', 'locales', 'fr-FR', 'fr-FR-tutorial.json'),
        );
    });

    test('keeps the complete tutorial unsuffixed for back-compat', () => {
        expect(getTutorialPath('en-US', 'complete')).toBe(
            path.join('static', 'locales', 'en-US', 'en-US-tutorial.json'),
        );
    });

    test('suffixes non-default modes (e.g. quick)', () => {
        expect(getTutorialPath('fr-FR', 'quick')).toBe(
            path.join(
                'static',
                'locales',
                'fr-FR',
                'fr-FR-tutorial-quick.json',
            ),
        );
    });
});
