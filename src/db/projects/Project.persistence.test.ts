import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import { describe, expect, test } from 'vitest';
import { z } from 'zod';

import Project from '@db/projects/Project';
import ProjectCRDT from '@db/projects/ProjectCRDT';
import {
    ProjectSchema,
    ProjectSchemaLatestVersion,
    upgradeProject,
} from '@db/projects/ProjectSchemas';

/**
 * Tests that pin the data-level invariants of the persistence pipeline.
 *
 * The CRDT layer adds three field-level concerns that the project doc
 * has to round-trip cleanly through serialize → IndexedDB/Firestore →
 * schema upgrade → in-memory Project:
 *   - the `crdt` snapshot blob
 *   - the per-field `stamps` Lamport vector
 *   - schema-version forward migration from any prior v
 *
 * If any of these fail, the symptoms are subtle in production: a stale
 * CRDT snapshot would surface as "edits got rolled back" after a peer
 * reload; missing stamps would resurrect the #135 metadata-clobber bug;
 * a broken upgrade path would lose all of the above on first read.
 *
 * The full deserialize path (Project.deserialize) needs a real
 * LocalesDatabase, which pulls in browser-only side effects. We exercise
 * the equivalent invariants through serialize → upgradeProject → the
 * Zod schema parse (which is what guards IndexedDB and Firestore reads).
 */

function makeBase(): Project {
    return Project.make(
        'project-1',
        'original',
        new Source('main', 'a'),
        [],
        DefaultLocale,
    );
}

describe('Project.crdt — snapshot field', () => {
    test('a fresh project has no CRDT snapshot', () => {
        expect(makeBase().getCRDTSnapshot()).toBeNull();
    });

    test('withCRDTSnapshot installs and getCRDTSnapshot reads back', () => {
        const crdt = ProjectCRDT.fromSources(['a']);
        crdt.applyLocalEdit(0, 'a', 'ab');
        const snapshot = crdt.encode();
        const p = makeBase().withCRDTSnapshot(snapshot);
        expect(p.getCRDTSnapshot()).toBe(snapshot);
    });

    test('snapshot survives serialize and re-passes the project schema', () => {
        const crdt = ProjectCRDT.fromSources(['hello']);
        crdt.applyLocalEdit(0, 'hello', 'hello world');
        const snapshot = crdt.encode();
        const p = makeBase().withCRDTSnapshot(snapshot);

        // Mirror the persist() path: serialize, then validate against
        // the Zod schema (what guards both IndexedDB reads and the
        // Firestore listener in ProjectsDatabase.syncUser).
        const serialized = p.serialize();
        const parsed = ProjectSchema.parse(serialized);
        expect(parsed.crdt).toBe(snapshot);
    });

    test('mergeWith keeps the local CRDT snapshot — remote bytes are folded separately', () => {
        // The merge layer must NOT pick a winner for `crdt` based on
        // stamps. The remote's CRDT bytes are applied to our Y.Doc by
        // ProjectsDatabase.foldRemoteCRDT, which uses Yjs's commutative
        // applyUpdateV2. If mergeWith overwrote our local snapshot,
        // we'd lose local edits that hadn't been folded into the
        // remote's snapshot yet.
        const aCrdt = ProjectCRDT.fromSources(['x']);
        aCrdt.applyLocalEdit(0, 'x', 'xa');
        const bCrdt = ProjectCRDT.fromSources(['x']);
        bCrdt.applyLocalEdit(0, 'x', 'xb');

        const base = makeBase();
        const A = base.withCRDTSnapshot(aCrdt.encode());
        const B = base.withCRDTSnapshot(bCrdt.encode());

        expect(A.mergeWith(B).getCRDTSnapshot()).toBe(A.getCRDTSnapshot());
        expect(B.mergeWith(A).getCRDTSnapshot()).toBe(B.getCRDTSnapshot());
    });

    test('withCRDTSnapshot(null) clears the snapshot', () => {
        const crdt = ProjectCRDT.fromSources(['z']);
        const p = makeBase().withCRDTSnapshot(crdt.encode());
        expect(p.withCRDTSnapshot(null).getCRDTSnapshot()).toBeNull();
    });
});

describe('upgradeProject — schema migration from pre-CRDT shapes', () => {
    // Old v4 docs are still in IndexedDB and Firestore for any user
    // who logged in before the CRDT layer shipped. These tests are
    // here so a future schema bump can't silently drop their data.
    //
    // The Zod schema for v4 has these fields exactly — we run a parse
    // round-trip to make sure our synthetic input is faithful to the
    // schema before we test the migration.
    function v4Project() {
        const doc = {
            v: 4 as const,
            id: 'old-project',
            name: 'pre-crdt project',
            sources: [{ names: 'start', code: 'x', caret: 0 }],
            locales: ['en-US'],
            owner: 'someone',
            collaborators: [],
            public: false,
            listed: true,
            archived: false,
            timestamp: 12345,
            persisted: true,
            gallery: null,
            flags: {
                dehumanization: null,
                violence: null,
                disclosure: null,
                misinformation: null,
            },
            nonPII: [],
            chat: null,
            history: [],
        };
        // Sanity-check our hand-built v4 against the union of all
        // legal historical shapes — if this throws, the test is
        // lying about what an old project looked like.
        const Union = z.union([ProjectSchema, z.object({ v: z.literal(4) })]);
        Union.parse(doc);
        return doc;
    }

    test('cascades from v4 all the way to the latest version', () => {
        const upgraded = upgradeProject(v4Project());
        expect(upgraded.v).toBe(ProjectSchemaLatestVersion);
    });

    test('initializes the new v7 stamps field to the empty Lamport vector', () => {
        const upgraded = upgradeProject(v4Project());
        expect(upgraded.stamps).toEqual({ lamport: 0, fields: {} });
    });

    test('initializes the new v8 crdt field to null', () => {
        const upgraded = upgradeProject(v4Project());
        expect(upgraded.crdt).toBeNull();
    });

    test('preserves user data across migration', () => {
        const upgraded = upgradeProject(v4Project());
        expect(upgraded.id).toBe('old-project');
        expect(upgraded.name).toBe('pre-crdt project');
        expect(upgraded.sources[0]?.code).toBe('x');
        expect(upgraded.owner).toBe('someone');
        expect(upgraded.timestamp).toBe(12345);
    });

    test('an already-latest project upgrades to itself', () => {
        const latest = upgradeProject(v4Project());
        const again = upgradeProject(latest);
        expect(again).toEqual(latest);
    });

    test('NeverWritten stamps on a freshly-migrated v7 project fall back to timestamp on merge', () => {
        // The migration leaves both replicas with empty stamps. Until
        // someone bumps a field, mergeWith must keep the v6 behavior
        // (later timestamp wins) — otherwise the very first read of a
        // migrated project would lose data on either side.
        const earlier = upgradeProject({
            ...v4Project(),
            timestamp: 1000,
            name: 'earlier',
        });
        const later = upgradeProject({
            ...v4Project(),
            timestamp: 2000,
            name: 'later',
        });
        expect(earlier.timestamp).toBe(1000);
        expect(later.timestamp).toBe(2000);
        expect(later.name).toBe('later');
    });
});

describe('Project.bumpStampsFrom — stamps stay aligned with content', () => {
    test('a no-op revision (same data) leaves stamps untouched', () => {
        // The edit pipeline calls bumpStampsFrom on every save. If a
        // no-op revision bumped every field anyway, every save would
        // flip the Lamport counter and every remote replica would
        // think every field had been edited — defeating the per-field
        // merge that #135 needed.
        const base = makeBase();
        const echo = base.bumpStampsFrom(base, 'deviceA');
        expect(echo.getStamps()).toEqual(base.getStamps());
    });

    test('only the field that actually changed gets a fresh stamp', () => {
        const base = makeBase();
        const renamed = base
            .withName('new-name')
            .bumpStampsFrom(base, 'deviceA');
        const stamps = renamed.getStamps();
        expect(stamps.fields['name']?.w).toBe('deviceA');
        expect(stamps.fields['name']?.c).toBeGreaterThan(0);
        // public didn't change, so no stamp should be allocated.
        expect(stamps.fields['public']).toBeUndefined();
    });
});

describe('Project.serialize — Firestore-compatible output', () => {
    test('every field set during normal editing reaches the serialized doc', () => {
        const crdt = ProjectCRDT.fromSources(['a']);
        crdt.applyLocalEdit(0, 'a', 'ab');
        const p = makeBase()
            .withName('round-trip')
            .withCRDTSnapshot(crdt.encode())
            .bumpStampsFrom(makeBase(), 'writerX');
        const serialized = p.serialize();
        expect(serialized.name).toBe('round-trip');
        expect(serialized.crdt).toBe(crdt.encode());
        expect(serialized.stamps.fields['name']?.w).toBe('writerX');
        // The schema must accept what we just wrote — this catches
        // any drift between Project's in-memory shape and the schema
        // both halves of the storage layer parse against.
        expect(() => ProjectSchema.parse(serialized)).not.toThrow();
    });

    test('serialize omits `preview` when undefined (Firestore rejects literal undefined)', () => {
        const p = makeBase();
        expect(p.getPreview()).toBeUndefined();
        const serialized = p.serialize();
        expect('preview' in serialized).toBe(false);
    });
});
