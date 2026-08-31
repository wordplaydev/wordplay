import { describe, expect, test } from 'vitest';
import { getTutorialPath } from '@util/verify-locales/TutorialSchema';

/** Literal forward slashes, not `path.join`: drift passes these paths to git,
 *  which wants `/` on every platform. Building the expectation the same way the
 *  implementation does would make this test blind to that. */
describe('getTutorialPath', () => {
    test('defaults to the complete tutorial (no suffix)', () => {
        expect(getTutorialPath('fr-FR')).toBe(
            'static/locales/fr-FR/fr-FR-tutorial.json',
        );
    });

    test('keeps the complete tutorial unsuffixed for back-compat', () => {
        expect(getTutorialPath('en-US', 'complete')).toBe(
            'static/locales/en-US/en-US-tutorial.json',
        );
    });

    test('suffixes non-default modes (e.g. quick)', () => {
        expect(getTutorialPath('fr-FR', 'quick')).toBe(
            'static/locales/fr-FR/fr-FR-tutorial-quick.json',
        );
    });
});
