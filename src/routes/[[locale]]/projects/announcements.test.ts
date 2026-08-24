import concretize from '@locale/concretize';
import DefaultLocale from '@locale/DefaultLocale';
import Locales from '@locale/Locales';
import { describe, expect, test } from 'vitest';

import {
    describeCreation,
    describeDeletion,
    describeDestination,
    describeDisclosure,
    describeMove,
    describeRename,
    describeSelection,
} from './announcements';

const locales = new Locales(concretize, [DefaultLocale], DefaultLocale);

/**
 * Every one of these asserts that two consecutive firings differ.
 *
 * That is the whole point: a live region handed the same string twice stays
 * silent the second time, and nothing makes it speak again. Asserting one
 * call's content passes happily while the feature is inaudible, so each test
 * here fires twice over different state and compares.
 */
describe('folder announcements vary between consecutive firings', () => {
    test('the destination changes as it is cycled', () => {
        expect(describeDestination(locales, 'Cat', 'Games')).not.toBe(
            describeDestination(locales, 'Cat', 'Class work'),
        );
    });

    test('the top level is named, not left blank', () => {
        const top = describeDestination(locales, 'Cat', undefined);
        expect(top).toContain('Cat');
        expect(top.trim().endsWith('to')).toBe(false);
    });

    test('two moves of different projects differ', () => {
        expect(describeMove(locales, 'Cat', 'Games')).not.toBe(
            describeMove(locales, 'Rain', 'Games'),
        );
    });

    test('two moves of one project to different folders differ', () => {
        expect(describeMove(locales, 'Cat', 'Games')).not.toBe(
            describeMove(locales, 'Cat', 'Class work'),
        );
    });

    test('moving out of a folder reads differently from moving into one', () => {
        expect(describeMove(locales, 'Cat', undefined)).not.toBe(
            describeMove(locales, 'Cat', 'Games'),
        );
    });

    test('collapsing and expanding the same folder differ', () => {
        // Toggling one folder repeatedly is the case a constant summary would
        // silence after the first press.
        expect(describeDisclosure(locales, 'Games', 4, true)).not.toBe(
            describeDisclosure(locales, 'Games', 4, false),
        );
    });

    test('selecting two folders differs', () => {
        expect(describeSelection(locales, 'Games', 4)).not.toBe(
            describeSelection(locales, 'Class work', 4),
        );
    });

    test('selecting two same-named folders with different contents differs', () => {
        // Nothing stops two folders sharing a name, so the count is what keeps
        // moving between them audible.
        expect(describeSelection(locales, 'Games', 4)).not.toBe(
            describeSelection(locales, 'Games', 5),
        );
    });

    test('creating two folders differs', () => {
        expect(describeCreation(locales, 'Games')).not.toBe(
            describeCreation(locales, 'Games 2'),
        );
    });

    test('renaming twice differs', () => {
        expect(describeRename(locales, 'Games')).not.toBe(
            describeRename(locales, 'Puzzles'),
        );
    });

    test('deleting two folders differs', () => {
        expect(describeDeletion(locales, 'Games', 4)).not.toBe(
            describeDeletion(locales, 'Class work', 4),
        );
    });
});

describe('folder announcements say what actually happened', () => {
    test('a deletion says the projects were archived, not deleted', () => {
        // They are recoverable from the archived section, and a creator told
        // "deleted" has no reason to go looking for them.
        const text = describeDeletion(locales, 'Games', 4);
        expect(text).toContain('archived');
        expect(text).not.toContain('deleted, 4 projects deleted');
    });

    test('counts are pluralized rather than pasted next to a noun', () => {
        expect(describeSelection(locales, 'Games', 1)).toContain('1 project');
        expect(describeSelection(locales, 'Games', 1)).not.toContain(
            '1 projects',
        );
        expect(describeSelection(locales, 'Games', 4)).toContain('4 projects');
    });
});
