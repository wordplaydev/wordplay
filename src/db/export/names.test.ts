import { describe, expect, test } from 'vitest';
import type { Relationship } from './AccountSnapshot';
import {
    archiveFolder,
    primaryRelationship,
    RelationshipPrecedence,
    slugForName,
} from './names';

describe('primaryRelationship', () => {
    /** Every relationship, listed here rather than derived, so adding one to
     *  the union without giving it a place in the order fails this test. */
    const All: Relationship[] = [
        'owner',
        'creator',
        'curator',
        'teacher',
        'collaborator',
        'commenter',
        'participant',
        'learner',
        'viewer',
    ];

    test('orders every relationship exactly once', () => {
        expect([...RelationshipPrecedence].sort()).toEqual([...All].sort());
        expect(new Set(RelationshipPrecedence).size).toBe(
            RelationshipPrecedence.length,
        );
    });

    test('takes the strongest claim when several are true', () => {
        // A curator of a gallery is very often one of its creators too, and a
        // curator runs the gallery while a creator may only add to it.
        expect(primaryRelationship(['creator', 'curator'])).toBe('curator');
        expect(primaryRelationship(['viewer', 'owner'])).toBe('owner');
        expect(primaryRelationship(['learner', 'teacher'])).toBe('teacher');
        // A how-to has no curators, so its author still wins there.
        expect(primaryRelationship(['collaborator', 'creator'])).toBe(
            'creator',
        );
    });

    test('falls back rather than throwing', () => {
        expect(primaryRelationship([])).toBe('viewer');
    });
});

describe('slugForName', () => {
    test('keeps an ordinary name', () => {
        expect(slugForName('Bouncing cat', 'a1b2c3d4e5f6')).toBe(
            'Bouncing cat-a1b2c3d4',
        );
    });

    test('replaces the separator rather than making a folder', () => {
        expect(slugForName('cats/dogs', 'abcdefgh')).toBe('cats-dogs-abcdefgh');
        expect(slugForName('a\\b:c*d?e"f<g>h|i', 'abcdefgh')).not.toMatch(
            /[\\:*?"<>|]/,
        );
    });

    test('drops control characters', () => {
        expect(slugForName('a\u0000b\u001fc\u007f', 'abcdefgh')).toBe(
            'a-b-c-abcdefgh',
        );
    });

    test('names an unnamed project by its id alone', () => {
        // Rather than an English word, which would differ between two exports
        // of the same account in two locales.
        expect(slugForName('', 'a1b2c3d4e5')).toBe('a1b2c3d4');
        expect(slugForName('   ', 'a1b2c3d4e5')).toBe('a1b2c3d4');
        expect(slugForName('...', 'a1b2c3d4e5')).toBe('a1b2c3d4');
    });

    test('distinguishes two projects with the same name', () => {
        expect(slugForName('cat', 'aaaaaaaa1')).not.toBe(
            slugForName('cat', 'bbbbbbbb1'),
        );
    });

    test('trims what Windows refuses at either end', () => {
        expect(slugForName('.hidden', 'abcdefgh')).toBe('hidden-abcdefgh');
        expect(slugForName('trailing.', 'abcdefgh')).toBe('trailing-abcdefgh');
        expect(slugForName(' spaced ', 'abcdefgh')).toBe('spaced-abcdefgh');
    });

    test('escapes a reserved device name', () => {
        expect(slugForName('CON', 'abcdefgh')).toBe('_CON-abcdefgh');
        expect(slugForName('nul', 'abcdefgh')).toBe('_nul-abcdefgh');
        expect(slugForName('COM4', 'abcdefgh')).toBe('_COM4-abcdefgh');
        // Only the whole name, not a name that starts with one.
        expect(slugForName('CONTROL', 'abcdefgh')).toBe('CONTROL-abcdefgh');
    });

    test('never cuts a grapheme in half', () => {
        // A code-unit slice would leave half a surrogate pair, and splitting a
        // ZWJ sequence turns one family into four people.
        const family = '👨‍👩‍👧‍👦';
        const slug = slugForName(family.repeat(20), 'abcdefgh');
        expect(slug).not.toContain('�');
        expect([...slug.matchAll(/‍/g)].length % 3).toBe(0);
    });

    test('bounds a name by bytes as well as graphemes', () => {
        // Forty-eight graphemes of emoji is several hundred bytes, which blows
        // past path limits even though the grapheme count looks modest.
        const slug = slugForName('👨‍👩‍👧‍👦'.repeat(40), 'abcdefgh');
        expect(new TextEncoder().encode(slug).length).toBeLessThanOrEqual(
            120 + 'abcdefgh'.length + 1,
        );
    });

    test('bounds a long Latin name by graphemes', () => {
        expect(slugForName('a'.repeat(200), 'abcdefgh')).toBe(
            `${'a'.repeat(48)}-abcdefgh`,
        );
    });

    test('keeps a name a file system can carry', () => {
        expect(slugForName('日本語のプロジェクト', 'abcdefgh')).toBe(
            '日本語のプロジェクト-abcdefgh',
        );
        expect(slugForName('Ñandú café', 'abcdefgh')).toBe(
            'Ñandú café-abcdefgh',
        );
    });
});

describe('archiveFolder', () => {
    test('names the archive for its creator and day', () => {
        expect(archiveFolder('amy', '2026-09-15T12:34:56.000Z')).toBe(
            'wordplay-amy-2026-09-15',
        );
    });

    test('survives a creator with no username', () => {
        expect(archiveFolder('', '2026-09-15T12:34:56.000Z')).toBe(
            'wordplay-2026-09-15',
        );
    });
});
