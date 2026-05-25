import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import { describe, expect, test } from 'vitest';

import Project from '@db/projects/Project';

function makeBase(): Project {
    return Project.make(
        'project-1',
        'original-name',
        new Source('main', 'a'),
        [],
        DefaultLocale,
    );
}

describe('Project.mergeWith — issue #135 fix', () => {
    test('concurrent edits to different fields both survive', () => {
        const base = makeBase();
        const deviceA = base.withName('A-name').bumpStampsFrom(base, 'deviceA');
        const deviceB = base
            .withSource(base.getMain(), new Source('main', 'B-code'))
            .bumpStampsFrom(base, 'deviceB');

        const merged = deviceA.mergeWith(deviceB);
        expect(merged.getName()).toBe('A-name');
        expect(merged.getMain().code.toString()).toBe('B-code');
    });

    test('merge is symmetric — both replicas converge to the same state', () => {
        const base = makeBase();
        const A = base.withName('A-name').bumpStampsFrom(base, 'deviceA');
        const B = base
            .withSource(base.getMain(), new Source('main', 'B-code'))
            .bumpStampsFrom(base, 'deviceB');

        const ab = A.mergeWith(B);
        const ba = B.mergeWith(A);
        expect(ab.getName()).toBe(ba.getName());
        expect(ab.getMain().code.toString()).toBe(
            ba.getMain().code.toString(),
        );
        expect(ab.getStamps()).toEqual(ba.getStamps());
    });

    test('same-field concurrent edit converges by writer-ID tiebreak', () => {
        const base = makeBase();
        const A = base.withName('A-name').bumpStampsFrom(base, 'deviceA');
        const B = base.withName('B-name').bumpStampsFrom(base, 'deviceB');

        const ab = A.mergeWith(B);
        const ba = B.mergeWith(A);
        expect(ab.getName()).toBe(ba.getName());
        // Higher writer ID wins on the tiebreak (deviceB > deviceA lex).
        expect(ab.getName()).toBe('B-name');
    });

    test('a later sequential edit wins over an earlier concurrent one', () => {
        const base = makeBase();
        const A1 = base.withName('A-name').bumpStampsFrom(base, 'deviceA');
        const B1 = base.withName('B-name').bumpStampsFrom(base, 'deviceB');

        // Device A learns of B's edit and then makes one more edit to name.
        const A2 = A1.mergeWith(B1);
        const A3 = A2.withName('A-final').bumpStampsFrom(A2, 'deviceA');

        // No matter which way we merge with B's old version, A's final wins.
        expect(A3.mergeWith(B1).getName()).toBe('A-final');
        expect(B1.mergeWith(A3).getName()).toBe('A-final');
    });

    test('NeverWritten on both sides falls back to project timestamp', () => {
        const earlier = Project.make(
            'project-1',
            'earlier-name',
            new Source('main', ''),
            [],
            DefaultLocale,
            null,
            [],
            false,
            undefined,
            true,
            false,
            false,
            null,
            undefined,
            1000,
        );
        const later = Project.make(
            'project-1',
            'later-name',
            new Source('main', ''),
            [],
            DefaultLocale,
            null,
            [],
            false,
            undefined,
            true,
            false,
            false,
            null,
            undefined,
            2000,
        );
        // Neither has any stamps — they look like v6→v7 migrations.
        expect(earlier.mergeWith(later).getName()).toBe('later-name');
        expect(later.mergeWith(earlier).getName()).toBe('later-name');
    });

    test('bumpStampsFrom only bumps fields that actually changed', () => {
        const base = makeBase();
        const justName = base
            .withName('renamed')
            .bumpStampsFrom(base, 'deviceA');
        const stamps = justName.getStamps();
        expect(stamps.fields['name']).toBeDefined();
        expect(stamps.fields['public']).toBeUndefined();
        expect(stamps.fields['gallery']).toBeUndefined();
    });

    test('serializing then deserializing preserves stamps', async () => {
        const base = makeBase();
        const stamped = base.withName('stamped').bumpStampsFrom(base, 'A');
        const serialized = stamped.serialize();
        expect(serialized.stamps.fields['name']).toBeDefined();
        // The schema migration round-trip — re-parsing a v7-shaped object —
        // is exercised by upgradeProject elsewhere; here we just confirm the
        // serializer emits the new field.
        expect(serialized.stamps.lamport).toBeGreaterThan(0);
    });
});

describe('Project.canAddCollaborator — 4-collaborator cap', () => {
    test('allows up to 4 distinct collaborators', () => {
        let p = makeBase();
        for (const uid of ['a', 'b', 'c', 'd']) {
            expect(p.canAddCollaborator(uid)).toBe(true);
            p = p.withCollaborator(uid);
        }
        expect(p.getCollaborators().length).toBe(4);
    });
    test('rejects a 5th distinct collaborator', () => {
        let p = makeBase();
        for (const uid of ['a', 'b', 'c', 'd']) p = p.withCollaborator(uid);
        expect(p.canAddCollaborator('e')).toBe(false);
        // withCollaborator is a no-op when at cap.
        const next = p.withCollaborator('e');
        expect(next.getCollaborators().length).toBe(4);
        expect(next).toBe(p);
    });
    test('adding an existing collaborator at cap is still a no-op (idempotent)', () => {
        let p = makeBase();
        for (const uid of ['a', 'b', 'c', 'd']) p = p.withCollaborator(uid);
        // 'a' is already in — still allowed; doesn't grow the list.
        expect(p.canAddCollaborator('a')).toBe(true);
        const next = p.withCollaborator('a');
        expect(next.getCollaborators().length).toBe(4);
    });
});
