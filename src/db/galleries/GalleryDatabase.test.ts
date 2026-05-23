import { beforeEach, describe, expect, it, vi } from 'vitest';
import Gallery from './Gallery';
import type Project from '@db/projects/Project';

type BatchOp = {
    kind: 'set' | 'update' | 'delete';
    ref: unknown;
    data?: unknown;
};
let lastBatchOps: BatchOp[] = [];

vi.mock('firebase/firestore', () => ({
    and: vi.fn(),
    or: vi.fn(),
    arrayUnion: vi.fn((...elements: unknown[]) => ({
        _op: 'arrayUnion',
        elements,
    })),
    arrayRemove: vi.fn((...elements: unknown[]) => ({
        _op: 'arrayRemove',
        elements,
    })),
    doc: vi.fn((_firestore: unknown, collection: string, id: string) => ({
        _ref: { collection, id },
    })),
    setDoc: vi.fn(async () => {}),
    updateDoc: vi.fn(async () => {}),
    deleteDoc: vi.fn(async () => {}),
    writeBatch: vi.fn(() => {
        const ops: BatchOp[] = [];
        lastBatchOps = ops;
        return {
            set: vi.fn((ref: unknown, data: unknown) => {
                ops.push({ kind: 'set', ref, data });
            }),
            update: vi.fn((ref: unknown, data: unknown) => {
                ops.push({ kind: 'update', ref, data });
            }),
            delete: vi.fn((ref: unknown) => {
                ops.push({ kind: 'delete', ref });
            }),
            commit: vi.fn(async () => {}),
        };
    }),
    onSnapshot: vi.fn(() => () => {}),
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    getDoc: vi.fn(async () => ({ exists: () => false })),
    getDocs: vi.fn(async () => ({ docs: [] })),
}));

vi.mock('@db/firebase', () => ({
    firestore: { _fake: true },
}));

vi.mock('@db/Database', () => ({}));

vi.mock('../../examples/examples', () => ({
    getExampleGalleries: () => [],
}));

vi.mock('@db/teachers/TeacherDatabase.svelte', () => ({
    ClassesCollection: 'classes',
    ClassSchema: { parse: (x: unknown) => x },
    getClass: vi.fn(),
    setClass: vi.fn(),
}));

vi.mock('@db/projects/ProjectsDatabase.svelte', () => ({
    ProjectsCollection: 'projects',
}));

import GalleryDatabase from './GalleryDatabase.svelte';
import type { SerializedGallery } from './Gallery';

function makeGallery(
    id: string,
    overrides: Partial<SerializedGallery> = {},
): Gallery {
    return new Gallery({
        v: 2,
        id,
        path: null,
        name: {},
        description: {},
        words: [],
        projects: [],
        curators: [],
        creators: [],
        public: false,
        featured: false,
        howTos: [],
        howToExpandedVisibility: false,
        howToExpandedGalleries: [],
        howToViewers: {},
        howToViewersFlat: [],
        howToGuidingQuestions: [],
        howToReactions: {},
        ...overrides,
    });
}

function makeStubProject(
    id: string,
    gallery: string | null = null,
    owner: string | null = 'user-1',
): Project {
    const data = { id, gallery, owner };
    const project: any = {
        getID: () => id,
        getGallery: () => gallery,
        getOwner: () => owner,
        hasCollaborator: () => false,
        withGallery: (newGallery: string | null) =>
            makeStubProject(id, newGallery, owner),
        asPersisted: () => project,
        serialize: () => data,
    };
    return project;
}

describe('GalleryDatabase atomic project + gallery updates', () => {
    let db: GalleryDatabase;
    let mockDatabase: any;
    let projectsEditMock: ReturnType<typeof vi.fn>;
    let getHistoryMock: ReturnType<typeof vi.fn>;
    let markSavedMock: ReturnType<typeof vi.fn>;

    function setHistoryCurrent(project: Project) {
        getHistoryMock.mockReturnValue({
            getCurrent: () => project,
            markSaved: markSavedMock,
        });
    }

    beforeEach(() => {
        vi.clearAllMocks();
        lastBatchOps = [];

        markSavedMock = vi.fn();
        getHistoryMock = vi.fn();
        projectsEditMock = vi.fn(async () => undefined);

        mockDatabase = {
            getUser: vi.fn(() => null),
            Locales: {
                getLocaleSet: () => [],
                locales: { subscribe: () => () => {} },
            },
            Projects: {
                edit: projectsEditMock,
                getHistory: getHistoryMock,
                get: vi.fn(async () => undefined),
                refreshGallery: vi.fn(),
            },
        };

        db = new GalleryDatabase(mockDatabase);
    });

    describe('addProject', () => {
        it('writes the project doc, arrayUnions on the new gallery, and arrayRemoves from the old gallery in one batch', async () => {
            const gallery = makeGallery('g-new');
            db.accessibleGalleries.set('g-new', gallery);

            const project = makeStubProject('p1', 'g-old');
            // Simulate Projects.edit's effect on the history: history.current
            // now reflects gallery = 'g-new'.
            setHistoryCurrent(makeStubProject('p1', 'g-new'));

            await db.addProject(project, 'g-new');

            // 1 project set + 1 new-gallery update + 1 old-gallery update = 3
            expect(lastBatchOps).toHaveLength(3);

            const projectSet = lastBatchOps.find((o) => o.kind === 'set');
            expect(projectSet!.ref).toMatchObject({
                _ref: { collection: 'projects', id: 'p1' },
            });

            const newGalleryUpdate = lastBatchOps.find(
                (o) =>
                    o.kind === 'update' &&
                    (o.ref as { _ref: { id: string } })._ref.id === 'g-new',
            );
            expect(newGalleryUpdate!.data).toEqual({
                projects: { _op: 'arrayUnion', elements: ['p1'] },
            });

            const oldGalleryUpdate = lastBatchOps.find(
                (o) =>
                    o.kind === 'update' &&
                    (o.ref as { _ref: { id: string } })._ref.id === 'g-old',
            );
            expect(oldGalleryUpdate!.data).toEqual({
                projects: { _op: 'arrayRemove', elements: ['p1'] },
            });

            expect(markSavedMock).toHaveBeenCalledTimes(1);
        });

        it('omits the arrayRemove when the project was not previously in a gallery', async () => {
            const gallery = makeGallery('g-new');
            db.accessibleGalleries.set('g-new', gallery);

            const project = makeStubProject('p1', null);
            setHistoryCurrent(makeStubProject('p1', 'g-new'));

            await db.addProject(project, 'g-new');

            // No old gallery, so only project set + new gallery update.
            expect(lastBatchOps).toHaveLength(2);
            expect(
                lastBatchOps.find(
                    (o) =>
                        o.kind === 'update' &&
                        (o.ref as { _ref: { id: string } })._ref.id ===
                            'g-new',
                )!.data,
            ).toEqual({
                projects: { _op: 'arrayUnion', elements: ['p1'] },
            });
        });

        it('bails before committing if history.current was overridden by a concurrent call', async () => {
            const gallery = makeGallery('g-intended');
            db.accessibleGalleries.set('g-intended', gallery);

            const project = makeStubProject('p1', null);
            // Simulate a different concurrent call winning the in-memory race:
            // history.current now reports gallery 'g-other', not 'g-intended'.
            setHistoryCurrent(makeStubProject('p1', 'g-other'));

            await db.addProject(project, 'g-intended');

            // No batch should be built because the race-collapsing check
            // returns before writeBatch is invoked.
            expect(lastBatchOps).toHaveLength(0);
            expect(markSavedMock).not.toHaveBeenCalled();
        });
    });

    describe('removeProject', () => {
        it('clears project.gallery and arrayRemoves from the gallery in one batch', async () => {
            const gallery = makeGallery('g1');
            db.accessibleGalleries.set('g1', gallery);

            const project = makeStubProject('p1', 'g1');
            // After Projects.edit, history.current has gallery=null.
            setHistoryCurrent(makeStubProject('p1', null));

            await db.removeProject(project, 'g1');

            expect(lastBatchOps).toHaveLength(2);

            const projectSet = lastBatchOps.find((o) => o.kind === 'set');
            expect(projectSet!.ref).toMatchObject({
                _ref: { collection: 'projects', id: 'p1' },
            });

            const galleryUpdate = lastBatchOps.find(
                (o) => o.kind === 'update',
            );
            expect(galleryUpdate!.ref).toMatchObject({
                _ref: { collection: 'galleries', id: 'g1' },
            });
            expect(galleryUpdate!.data).toEqual({
                projects: { _op: 'arrayRemove', elements: ['p1'] },
            });
        });

        it('bails before committing if history.current was overridden by a concurrent share', async () => {
            const project = makeStubProject('p1', 'g1');
            // Concurrent share moved the project to 'g-other' between our edit
            // and our batch construction.
            setHistoryCurrent(makeStubProject('p1', 'g-other'));

            await db.removeProject(project, 'g1');

            expect(lastBatchOps).toHaveLength(0);
        });
    });

    describe('removeCreator / removeCurator', () => {
        it('removeCreator arrayRemoves uid from creators and arrayRemoves owned-projects in one batch', async () => {
            const ownerToRemove = 'student-uid';
            const project1 = makeStubProject('p1', 'g1', ownerToRemove);
            const project2 = makeStubProject('p2', 'g1', 'other-owner');
            const project3 = makeStubProject('p3', 'g1', ownerToRemove);

            const gallery = makeGallery('g1', {
                creators: [ownerToRemove, 'other-student'],
                projects: ['p1', 'p2', 'p3'],
            });
            db.accessibleGalleries.set('g1', gallery);

            mockDatabase.Projects.get = vi.fn(async (id: string) => {
                if (id === 'p1') return project1;
                if (id === 'p2') return project2;
                if (id === 'p3') return project3;
                return undefined;
            });

            await db.removeCreator(gallery, ownerToRemove);

            // 2 project clears (p1, p3) + 1 gallery update with arrayRemove on
            // both projects and the role array.
            expect(lastBatchOps).toHaveLength(3);

            const projectUpdates = lastBatchOps.filter(
                (o) =>
                    o.kind === 'update' &&
                    (o.ref as { _ref: { collection: string } })._ref
                        .collection === 'projects',
            );
            expect(projectUpdates).toHaveLength(2);
            for (const u of projectUpdates) {
                expect(u.data).toEqual({ gallery: null });
            }
            expect(
                projectUpdates
                    .map((u) => (u.ref as { _ref: { id: string } })._ref.id)
                    .sort(),
            ).toEqual(['p1', 'p3']);

            const galleryUpdate = lastBatchOps.find(
                (o) =>
                    o.kind === 'update' &&
                    (o.ref as { _ref: { collection: string } })._ref
                        .collection === 'galleries',
            );
            const data = galleryUpdate!.data as {
                creators: unknown;
                projects: unknown;
            };
            expect(data.creators).toEqual({
                _op: 'arrayRemove',
                elements: [ownerToRemove],
            });
            const projectsRemoved = (
                data.projects as { _op: string; elements: string[] }
            ).elements.sort();
            expect(projectsRemoved).toEqual(['p1', 'p3']);
        });

        it('removeCurator targets the curators field instead of creators', async () => {
            const gallery = makeGallery('g1', {
                curators: ['teacher-uid'],
                projects: [],
            });
            db.accessibleGalleries.set('g1', gallery);
            mockDatabase.Projects.get = vi.fn(async () => undefined);

            await db.removeCurator(gallery, 'teacher-uid');

            const galleryUpdate = lastBatchOps.find(
                (o) =>
                    o.kind === 'update' &&
                    (o.ref as { _ref: { collection: string } })._ref
                        .collection === 'galleries',
            );
            expect(galleryUpdate!.data).toEqual({
                curators: { _op: 'arrayRemove', elements: ['teacher-uid'] },
            });
        });
    });
});
