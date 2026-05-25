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
    // Source code is no longer stamp-merged: the Yjs CRDT in
    // ProjectCRDT.ts is the authoritative merge for code (character-
    // level convergence, both sides' keystrokes survive). These tests
    // exercise the stamp path for the metadata fields it still owns.
    // The CRDT path is covered by ProjectCRDT.test.ts.
    test('concurrent edits to different fields both survive', () => {
        const base = makeBase();
        const deviceA = base.withName('A-name').bumpStampsFrom(base, 'deviceA');
        const deviceB = base.asPublic(true).bumpStampsFrom(base, 'deviceB');

        const merged = deviceA.mergeWith(deviceB);
        expect(merged.getName()).toBe('A-name');
        expect(merged.isPublic()).toBe(true);
    });

    test('merge is symmetric — both replicas converge to the same state', () => {
        const base = makeBase();
        const A = base.withName('A-name').bumpStampsFrom(base, 'deviceA');
        const B = base.asPublic(true).bumpStampsFrom(base, 'deviceB');

        const ab = A.mergeWith(B);
        const ba = B.mergeWith(A);
        expect(ab.getName()).toBe(ba.getName());
        expect(ab.isPublic()).toBe(ba.isPublic());
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

describe('Project.withCollaborator — lifetime list is unbounded', () => {
    // The 4-editor cap is enforced at the live-presence layer
    // (PresenceTracker.isAtCap), not on the collaborators array. A project
    // can list any number of collaborators over its lifetime; only this many
    // can hold a concurrent presence slot.
    test('accepts any number of distinct collaborators', () => {
        let p = makeBase();
        for (const uid of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) {
            p = p.withCollaborator(uid);
        }
        expect(p.getCollaborators().length).toBe(7);
    });
    test('adding an existing collaborator is idempotent', () => {
        let p = makeBase().withCollaborator('a');
        const next = p.withCollaborator('a');
        expect(next.getCollaborators().length).toBe(1);
        expect(next).toBe(p);
    });
});
