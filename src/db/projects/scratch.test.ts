import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import { describe, expect, test } from 'vitest';

import Project from '@db/projects/Project';
import { ScratchPrefix } from '@db/projects/ScratchPrefix';
import { scratchIDFor } from '@db/projects/scratch';

describe('scratchIDFor — #1044', () => {
    test('the same code always gives the same project', () => {
        // This is the whole reason the ID is derived rather than random:
        // pressing "test it" twice on one example has to land back in the same
        // project, with whatever edits were made last time, instead of leaving
        // a trail of near-identical copies on the device.
        expect(scratchIDFor('Phrase("hi")')).toBe(scratchIDFor('Phrase("hi")'));
    });

    test('different code gives a different project', () => {
        expect(scratchIDFor('Phrase("hi")')).not.toBe(
            scratchIDFor('Phrase("bye")'),
        );
    });

    test('a one-character difference is enough', () => {
        expect(scratchIDFor('1 + 1')).not.toBe(scratchIDFor('1 + 2'));
    });

    test('non-Latin code gets an ID too', () => {
        // Wordplay code is written in every script the platform supports, so
        // the hash walks code points rather than UTF-16 units.
        expect(scratchIDFor('구절("안녕")')).not.toBe(
            scratchIDFor('구절("잘가")'),
        );
    });

    test('the ID is URL-safe', () => {
        // It goes straight into a path segment without escaping.
        for (const code of ['Phrase("hi")', '한국어', '🐈 + 🎨', ''])
            expect(scratchIDFor(code)).toMatch(/^scratch-[0-9a-z]+$/);
    });

    test('the ID carries the prefix Project.isScratch looks for', () => {
        const id = scratchIDFor('Phrase("hi")');
        expect(id.startsWith(ScratchPrefix)).toBe(true);
        const project = Project.make(
            id,
            'scratch',
            new Source('main', 'a'),
            [],
            DefaultLocale,
        );
        expect(project.isScratch()).toBe(true);
        expect(project.isLocalOnly()).toBe(true);
    });
});

describe('Project.isLocalOnly — what stays off the cloud', () => {
    function withID(id: string) {
        return Project.make(
            id,
            'name',
            new Source('main', 'a'),
            [],
            DefaultLocale,
        );
    }

    test('tutorial and scratch projects are local; ordinary ones are not', () => {
        // ProjectsDatabase chooses PersistenceType from this, in two places.
        // A scratch project missed by either one gets promoted to a cloud
        // project on the next reload and starts syncing.
        expect(withID('tutorial-1-2').isLocalOnly()).toBe(true);
        expect(withID(scratchIDFor('a')).isLocalOnly()).toBe(true);
        expect(withID('c8d0c1e1-0000').isLocalOnly()).toBe(false);
    });
});
