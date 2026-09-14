import { isRecord } from '@util/guards';
import { must } from '@util/nullable';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Gallery from './Gallery';
import type { Character } from '@db/characters/Character';
import type Project from '@db/projects/Project';

/** A recorded write's fields, checked rather than asserted. */
function fieldsOf(data: unknown): Record<string, unknown> {
    if (!isRecord(data)) throw new Error('a write with no fields');
    return data;
}

/** The document id a recorded write's reference names, or undefined if it
 *  names something else — which is the question each `find` below asks. */
function refID(reference: unknown): string | undefined {
    if (!isRecord(reference) || !isRecord(reference._ref)) return undefined;
    const { id } = reference._ref;
    return typeof id === 'string' ? id : undefined;
}

/** The collection a recorded write's reference names. */
function refCollection(reference: unknown): string | undefined {
    if (!isRecord(reference) || !isRecord(reference._ref)) return undefined;
    const { collection } = reference._ref;
    return typeof collection === 'string' ? collection : undefined;
}

/** The elements an arrayUnion/arrayRemove field operation carries. */
function opElements(operation: unknown): unknown[] {
    if (!isRecord(operation) || !Array.isArray(operation.elements))
        throw new Error('not an array field operation');
    return operation.elements;
}

type BatchOp = {
    kind: 'set' | 'update' | 'delete';
    ref: unknown;
    data?: unknown;
};
let lastBatchOps: BatchOp[] = [];

/** What the mocked `getDoc` does next. Routed through a variable rather than
 *  `vi.mocked(getDoc).mockResolvedValueOnce(...)` because the real `exists()` is
 *  a type predicate, which a plain `() => false` can't satisfy. */
let getDocResult: () => Promise<{
    exists: () => boolean;
    data: () => unknown;
}> = async () => ({ exists: () => false, data: () => ({}) });

type FakeGallerySubscription = {
    target: unknown;
    onNext: (snapshot: unknown) => void;
    onError: (error: unknown) => void;
    unsubscribed: boolean;
};
const gallerySubscriptions: FakeGallerySubscription[] = [];

/** The gallery subscription a watch just opened, which each caller has asserted exists. */
function gallerySubscription(index = 0): FakeGallerySubscription {
    return must(gallerySubscriptions[index], `gallery subscription ${index}`);
}

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
    onSnapshot: vi.fn(
        (
            target: unknown,
            onNext: (snapshot: unknown) => void,
            onError: (error: unknown) => void,
        ) => {
            const subscription = {
                target,
                onNext,
                onError,
                unsubscribed: false,
            };
            gallerySubscriptions.push(subscription);
            return () => {
                subscription.unsubscribed = true;
            };
        },
    ),
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    getDoc: vi.fn(() => getDocResult()),
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
import { getDoc, setDoc } from 'firebase/firestore';

function makeGallery(
    id: string,
    overrides: Partial<SerializedGallery> = {},
): Gallery {
    // Built through the factory rather than as a literal, so a schema bump
    // doesn't leave this fixture behind — which is exactly what it exists for.
    return new Gallery({
        ...Gallery.make(id, {}, {}, [], []).getData(),
        ...overrides,
    });
}

/** The members of `Project` the gallery database actually calls. Written out
 *  rather than reached through `any`, so a change in what it calls breaks the
 *  stub instead of passing vacuously. */
type ProjectStub = {
    getID: () => string;
    getGallery: () => string | null;
    getOwner: () => string | null;
    hasCollaborator: () => boolean;
    withGallery: (gallery: string | null) => Project;
    asPersisted: () => ProjectStub;
    serialize: () => {
        id: string;
        gallery: string | null;
        owner: string | null;
    };
};

function makeStubProject(
    id: string,
    gallery: string | null = null,
    owner: string | null = 'user-1',
): Project {
    const data = { id, gallery, owner };
    const project: ProjectStub = {
        getID: () => id,
        getGallery: () => gallery,
        getOwner: () => owner,
        hasCollaborator: () => false,
        withGallery: (newGallery: string | null) =>
            makeStubProject(id, newGallery, owner),
        asPersisted: () => project,
        serialize: () => data,
    };
    // @ts-expect-error `Project` is a class with private state, so a stub of
    // what the gallery database calls can never be assignable to it.
    return project;
}

/** The parts of `Database` the gallery database reaches for. Same reason as
 *  `ProjectStub`: a class with private state can have no structural stand-in,
 *  so the one suppression lives in the factory below. */
type DatabaseFake = {
    getUser: () => unknown;
    /** Pass-through wrappers; each test supplies a generic `vi.fn`, whose type
     *  the database never sees through this fake. */
    track?: unknown;
    read?: unknown;
    isConnectivityError?: unknown;
    markSyncFailed?: unknown;
    markFirebaseFailed?: unknown;
    reportListenerError?: unknown;
    markSynced?: unknown;
    markSyncing?: unknown;
    Locales: {
        getLocaleSet: () => { getMultilingualText: () => string };
        locales: { subscribe: () => () => void };
    };
    HowTos?: {
        watchGallery: ReturnType<typeof vi.fn>;
        publicGalleryChanged: ReturnType<typeof vi.fn>;
        reevaluateWatches: ReturnType<typeof vi.fn>;
        galleriesChanged: ReturnType<typeof vi.fn>;
    };
    loadProjects: () => Promise<unknown>;
    readonly MaybeProjects: unknown;
};

/** The fake the membership tests use, which also stands in for the projects and
 *  characters databases those writers read back through. */
type DatabaseFakeWithDomains = DatabaseFake & {
    projectsFake: {
        edit: ReturnType<typeof vi.fn>;
        getHistory: ReturnType<typeof vi.fn>;
        get: ReturnType<typeof vi.fn>;
        refreshGallery: ReturnType<typeof vi.fn>;
        saveSoon: ReturnType<typeof vi.fn>;
        syncUser: ReturnType<typeof vi.fn>;
    };
    Characters: {
        byID: Map<string, unknown>;
        updateCharacter: ReturnType<typeof vi.fn>;
        getByID: ReturnType<typeof vi.fn>;
    };
};

function fakeGalleryDatabase(fake: DatabaseFake): GalleryDatabase {
    // @ts-expect-error The fake implements only what this database calls.
    return new GalleryDatabase(fake);
}

describe('GalleryDatabase atomic project + gallery updates', () => {
    let db: GalleryDatabase;
    let mockDatabase: DatabaseFakeWithDomains;
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
            track: vi.fn(<T>(p: Promise<T>) => p),
            Locales: {
                // getLocaleSet() returns a Locales with getMultilingualText,
                // which Gallery.getName() uses for the save-status SaveError.
                getLocaleSet: () => ({ getMultilingualText: () => 'Test' }),
                locales: { subscribe: () => () => {} },
            },
            // Awaited calls go through loadProjects(); best-effort
            // bookkeeping reads MaybeProjects. Both point at one fake.
            projectsFake: {
                edit: projectsEditMock,
                getHistory: getHistoryMock,
                get: vi.fn(async () => undefined),
                refreshGallery: vi.fn(),
                saveSoon: vi.fn(),
                syncUser: vi.fn(),
            },
            // Characters are held in memory rather than lazily loaded, so
            // the fake mirrors that: updateCharacter writes into byID, which
            // is what the membership writers read back.
            Characters: {
                byID: new Map<string, unknown>(),
                updateCharacter: vi.fn(async (character: { id: string }) => {
                    mockDatabase.Characters.byID.set(character.id, character);
                    return undefined;
                }),
                getByID: vi.fn(
                    async (id: string) =>
                        mockDatabase.Characters.byID.get(id) ?? null,
                ),
            },
            loadProjects: vi.fn(async () => mockDatabase.projectsFake),
            get MaybeProjects() {
                return mockDatabase.projectsFake;
            },
        };

        db = fakeGalleryDatabase(mockDatabase);
    });

    describe('server-owned fields', () => {
        /**
         * `firestore.rules` allows a gallery update only if `moderation`,
         * `moderatedAt`, `flags` and `words` are absent from the write or equal
         * to what is stored — and `words` is rebuilt by the `galleryEdited`
         * trigger on every change. A client that writes the whole document
         * therefore ships a stale `words` and is denied, silently: the gallery
         * stays in `unsavedIDs`, `seedDirty` restores that on reload, and the
         * listener's skip-dirty guard then refuses every server snapshot for it
         * — including ones carrying a how-to just added to that gallery.
         */
        it('omits them when updating, and merges so the stored values survive', async () => {
            await db.edit(makeGallery('g-update'));

            expect(vi.mocked(setDoc)).toHaveBeenCalledTimes(1);
            const [, data, options] = must(
                vi.mocked(setDoc).mock.calls[0],
                'the setDoc call asserted above',
            );
            for (const field of ['moderation', 'moderatedAt', 'flags', 'words'])
                expect(
                    data,
                    `an update must not carry the server-owned "${field}"`,
                ).not.toHaveProperty(field);
            // Without merge, omitting them would delete them from the document.
            expect(options).toEqual({ merge: true });
            // Everything the client does own still goes.
            expect(data).toHaveProperty('id', 'g-update');
            expect(data).toHaveProperty('curators');
        });

        it('writes the whole document when creating', async () => {
            // `allow create` has no unchanged-fields test, and a gallery has to
            // be born with the fields its own schema requires — `words` among
            // them — or the next client to read it cannot parse it.
            await db.edit(makeGallery('g-create'), true);

            const [, data, options] = must(
                vi.mocked(setDoc).mock.calls[0],
                'the setDoc call asserted above',
            );
            expect(data).toHaveProperty('words');
            expect(options).toBeUndefined();
        });
    });

    describe('concurrent edits of one gallery', () => {
        /**
         * `edit` writes the whole document, so two writes in flight at once are
         * last-to-arrive-wins over everything — and creating a gallery is itself
         * an edit. A curator who renamed a gallery in the moments after creating
         * it lost the name: the rename was correct and was written correctly, and
         * then the create's own still-in-flight write landed on top and restored
         * "Untitled", with neither write reporting a failure.
         */
        it('applies them in order rather than letting the later one land first', async () => {
            const started: string[] = [];
            const finished: string[] = [];
            let releaseFirst: (() => void) | undefined;

            vi.mocked(setDoc).mockImplementation(
                async (_reference, data: unknown) => {
                    const names = isRecord(data) ? data.name : undefined;
                    const name =
                        isRecord(names) && typeof names['en-US'] === 'string'
                            ? names['en-US']
                            : '?';
                    started.push(name);
                    // Hold the first write open so the second would overlap it if
                    // anything still issued the two concurrently.
                    if (started.length === 1)
                        await new Promise<void>((resolve) => {
                            releaseFirst = resolve;
                        });
                    finished.push(name);
                },
            );

            const created = makeGallery('g-race', {
                name: { 'en-US': 'Untitled' },
            });
            const renamed = makeGallery('g-race', {
                name: { 'en-US': 'Chosen Name' },
            });

            const first = db.edit(created);
            // The rename is issued while the create is still in the air.
            const second = db.edit(renamed);
            await Promise.resolve();
            await Promise.resolve();

            // The queue is the whole point: the second write must not have been
            // sent yet, or Firestore decides the order and the name is a coin flip.
            expect(started).toEqual(['Untitled']);

            releaseFirst?.();
            await Promise.all([first, second]);

            expect(started).toEqual(['Untitled', 'Chosen Name']);
            expect(finished).toEqual(['Untitled', 'Chosen Name']);
        });

        it('lets a later edit through when an earlier one fails', async () => {
            // A failed write is reported by trackSave; it must not wedge the
            // queue and silently drop everything that follows.
            vi.mocked(setDoc)
                .mockRejectedValueOnce(new Error('offline'))
                .mockResolvedValueOnce(undefined);

            const first = db.edit(makeGallery('g-fail')).catch(() => undefined);
            const second = db.edit(
                makeGallery('g-fail', { name: { 'en-US': 'After' } }),
            );
            await Promise.all([first, second]);

            expect(vi.mocked(setDoc)).toHaveBeenCalledTimes(2);
        });
    });

    describe('addCharacter / removeCharacter (#822)', () => {
        function makeStubCharacter(
            id: string,
            gallery: string | null,
        ): Character {
            return {
                id,
                owner: 'u1',
                public: false,
                collaborators: [],
                updated: 0,
                name: 'someone/Thing',
                description: '',
                shapes: [],
                ...(gallery === null ? {} : { gallery }),
            };
        }

        it('writes the character doc, arrayUnions on the new gallery, and arrayRemoves from the old, in one batch', async () => {
            db.accessibleGalleries.set('g-new', makeGallery('g-new'));
            db.accessibleGalleries.set('g-old', makeGallery('g-old'));

            await db.addCharacter(makeStubCharacter('c1', 'g-old'), 'g-new');

            // 1 character set + 1 new-gallery update + 1 old-gallery update
            expect(lastBatchOps).toHaveLength(3);

            const characterSet = lastBatchOps.find((o) => o.kind === 'set');
            expect(characterSet!.ref).toMatchObject({
                _ref: { collection: 'characters', id: 'c1' },
            });
            // The document written carries the new membership, not the old.
            expect(characterSet!.data).toMatchObject({ gallery: 'g-new' });

            const added = lastBatchOps.find((o) => refID(o.ref) === 'g-new');
            expect(added!.data).toEqual({
                characters: { _op: 'arrayUnion', elements: ['c1'] },
            });

            const removed = lastBatchOps.find((o) => refID(o.ref) === 'g-old');
            expect(removed!.data).toEqual({
                characters: { _op: 'arrayRemove', elements: ['c1'] },
            });
        });

        it('touches only the new gallery when the character was in none', async () => {
            db.accessibleGalleries.set('g-new', makeGallery('g-new'));
            await db.addCharacter(makeStubCharacter('c1', null), 'g-new');
            expect(lastBatchOps).toHaveLength(2);
        });

        it('mirrors membership into the local gallery cache right away', async () => {
            db.accessibleGalleries.set('g-new', makeGallery('g-new'));
            await db.addCharacter(makeStubCharacter('c1', null), 'g-new');
            expect(
                db.accessibleGalleries.get('g-new')!.getCharacters(),
            ).toEqual(['c1']);
        });

        it('does nothing when the character is already in that gallery', async () => {
            db.accessibleGalleries.set('g-new', makeGallery('g-new'));
            await db.addCharacter(makeStubCharacter('c1', 'g-new'), 'g-new');
            expect(lastBatchOps).toHaveLength(0);
        });

        it('yields to a concurrent share rather than overwriting it', async () => {
            // The Options widget fires twice per choice, so a second call can
            // land between the in-memory edit and the batch. The later intent
            // must win; this one bails.
            db.accessibleGalleries.set('g-new', makeGallery('g-new'));
            mockDatabase.Characters.updateCharacter.mockImplementationOnce(
                async () => {
                    mockDatabase.Characters.byID.set(
                        'c1',
                        makeStubCharacter('c1', 'g-other'),
                    );
                },
            );
            await db.addCharacter(makeStubCharacter('c1', null), 'g-new');
            expect(lastBatchOps).toHaveLength(0);
        });

        it('clears the character and arrayRemoves it on removal', async () => {
            db.accessibleGalleries.set(
                'g-old',
                makeGallery('g-old', { characters: ['c1'] }),
            );

            await db.removeCharacter(makeStubCharacter('c1', 'g-old'), null);

            expect(lastBatchOps).toHaveLength(2);
            const characterSet = lastBatchOps.find((o) => o.kind === 'set');
            expect(characterSet!.data).toMatchObject({ gallery: null });
            const removed = lastBatchOps.find((o) => o.kind === 'update');
            expect(removed!.data).toEqual({
                characters: { _op: 'arrayRemove', elements: ['c1'] },
            });
            expect(
                db.accessibleGalleries.get('g-old')!.getCharacters(),
            ).toEqual([]);
        });
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
                (o) => o.kind === 'update' && refID(o.ref) === 'g-new',
            );
            expect(newGalleryUpdate!.data).toEqual({
                projects: { _op: 'arrayUnion', elements: ['p1'] },
            });

            const oldGalleryUpdate = lastBatchOps.find(
                (o) => o.kind === 'update' && refID(o.ref) === 'g-old',
            );
            expect(oldGalleryUpdate!.data).toEqual({
                projects: { _op: 'arrayRemove', elements: ['p1'] },
            });

            // markSaved now runs after the (fire-and-forget) commit resolves via
            // trackSave, so flush microtasks before asserting it.
            await vi.waitFor(() =>
                expect(markSavedMock).toHaveBeenCalledTimes(1),
            );
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
                    (o) => o.kind === 'update' && refID(o.ref) === 'g-new',
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

            const galleryUpdate = lastBatchOps.find((o) => o.kind === 'update');
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

            mockDatabase.projectsFake.get = vi.fn(async (id: string) => {
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
                    o.kind === 'update' && refCollection(o.ref) === 'projects',
            );
            expect(projectUpdates).toHaveLength(2);
            for (const u of projectUpdates) {
                expect(u.data).toEqual({ gallery: null });
            }
            expect(projectUpdates.map((u) => refID(u.ref)).sort()).toEqual([
                'p1',
                'p3',
            ]);

            const galleryUpdate = lastBatchOps.find(
                (o) =>
                    o.kind === 'update' && refCollection(o.ref) === 'galleries',
            );
            const data = fieldsOf(galleryUpdate!.data);
            expect(data.creators).toEqual({
                _op: 'arrayRemove',
                elements: [ownerToRemove],
            });
            const projectsRemoved = opElements(data.projects).toSorted();
            expect(projectsRemoved).toEqual(['p1', 'p3']);
        });

        it('removeCurator targets the curators field instead of creators', async () => {
            const gallery = makeGallery('g1', {
                curators: ['teacher-uid'],
                projects: [],
            });
            db.accessibleGalleries.set('g1', gallery);
            mockDatabase.projectsFake.get = vi.fn(async () => undefined);

            await db.removeCurator(gallery, 'teacher-uid');

            const galleryUpdate = lastBatchOps.find(
                (o) =>
                    o.kind === 'update' && refCollection(o.ref) === 'galleries',
            );
            expect(galleryUpdate!.data).toEqual({
                curators: { _op: 'arrayRemove', elements: ['teacher-uid'] },
            });
        });
    });
});

describe('find distinguishes a gallery we cannot reach from one that is not there', () => {
    let db: GalleryDatabase;
    let mockDatabase: DatabaseFake;
    let isConnectivityError: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        getDocResult = async () => ({ exists: () => false, data: () => ({}) });
        isConnectivityError = vi.fn(() => false);
        mockDatabase = {
            getUser: vi.fn(() => null),
            track: vi.fn(<T>(p: Promise<T>) => p),
            read: vi.fn(<T>(p: Promise<T>) => p),
            isConnectivityError,
            Locales: {
                getLocaleSet: () => ({ getMultilingualText: () => 'Test' }),
                locales: { subscribe: () => () => {} },
            },
            loadProjects: vi.fn(async () => ({})),
            get MaybeProjects() {
                return {};
            },
        };
        db = fakeGalleryDatabase(mockDatabase);
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('answers from the cache without reading', async () => {
        const gallery = makeGallery('g1');
        db.accessibleGalleries.set('g1', gallery);

        expect(await db.find('g1')).toEqual({ kind: 'found', gallery });
        expect(getDoc).not.toHaveBeenCalled();
    });

    it('reports a successful lookup of an absent document as missing', async () => {
        expect(await db.find('nope')).toEqual({ kind: 'missing' });
    });

    it('reports a read that never got an answer as unreachable', async () => {
        // The regression: an 8s read timeout used to look exactly like a
        // gallery that doesn't exist, so an accessible gallery was reported as
        // nonexistent for as long as the connection stayed bad.
        isConnectivityError.mockReturnValue(true);
        getDocResult = () => Promise.reject(new Error('read-timeout'));

        expect(await db.find('g1')).toEqual({ kind: 'unreachable' });
    });

    it('reports a denied read as missing, so a private gallery stays private', async () => {
        // Telling someone "we couldn't reach it" for a gallery they're simply
        // not allowed to see would confirm that it exists.
        isConnectivityError.mockReturnValue(false);
        getDocResult = () => Promise.reject(new Error('permission-denied'));

        expect(await db.find('secret')).toEqual({ kind: 'missing' });
    });

    it('get() still collapses both failures for callers that do not care', async () => {
        isConnectivityError.mockReturnValue(true);
        getDocResult = () => Promise.reject(new Error('read-timeout'));
        expect(await db.get('g1')).toBeUndefined();

        getDocResult = async () => ({ exists: () => false, data: () => ({}) });
        expect(await db.get('g1')).toBeUndefined();
    });
});

describe('watching a public gallery (#1375)', () => {
    let db: GalleryDatabase;
    let watchedHowTos: string[];
    let releasedHowTos: string[];
    let notifiedHowTos: string[];
    let syncMarks: string[];

    beforeEach(() => {
        vi.clearAllMocks();
        gallerySubscriptions.length = 0;
        watchedHowTos = [];
        releasedHowTos = [];
        notifiedHowTos = [];
        syncMarks = [];
        db = fakeGalleryDatabase({
            getUser: vi.fn(() => null),
            read: vi.fn(<T>(p: Promise<T>) => p),
            isConnectivityError: vi.fn(() => false),
            markSyncFailed: vi.fn((d: string) => syncMarks.push(d)),
            markFirebaseFailed: vi.fn(),
            reportListenerError: vi.fn((d: string) => syncMarks.push(d)),
            markSynced: vi.fn(),
            markSyncing: vi.fn(),
            Locales: {
                getLocaleSet: () => ({ getMultilingualText: () => 'Test' }),
                locales: { subscribe: () => () => {} },
            },
            loadProjects: vi.fn(async () => ({})),
            get MaybeProjects() {
                return {};
            },
            HowTos: {
                watchGallery: vi.fn((id: string) => {
                    watchedHowTos.push(id);
                    return () => releasedHowTos.push(id);
                }),
                publicGalleryChanged: vi.fn((id: string) =>
                    notifiedHowTos.push(id),
                ),
                reevaluateWatches: vi.fn(),
                galleriesChanged: vi.fn(),
            },
        });
        gallerySubscriptions.length = 0;
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('subscribes to the gallery document and to its how-tos', () => {
        db.watchPublic('g1');

        expect(gallerySubscriptions).toHaveLength(1);
        expect(watchedHowTos).toEqual(['g1']);
    });

    it('skips the document when a uid listener already delivers it', () => {
        // The three galleries listeners already carry this document live, so a
        // second subscription would pay for the same reads twice. The how-to
        // half still runs: being a member of a gallery is a different question
        // from which of its how-tos a query can return.
        db.accessibleGalleries.set('g1', makeGallery('g1'));
        db.watchPublic('g1');

        expect(gallerySubscriptions).toHaveLength(0);
        expect(watchedHowTos).toEqual(['g1']);
    });

    it('puts each snapshot in the public map and tells the how-tos', () => {
        // The gallery's `public` flag and its how-to list both decide what the
        // how-to watch should be doing, so a change to either has to reach it.
        db.watchPublic('g1');
        gallerySubscription().onNext({
            data: () => makeGallery('g1', { public: true }).getData(),
        });

        expect(db.publicGalleries.get('g1')?.getID()).toBe('g1');
        expect(db.isKnownPublic('g1')).toBe(true);
        expect(notifiedHowTos).toEqual(['g1']);
    });

    it('does not call a gallery public until it says so', () => {
        // `isPublic`, not `isListed`: the rules ask only whether `public` is
        // set, so gating on moderation approval would blank a legitimately
        // public space no moderator has looked at yet.
        db.watchPublic('g1');
        gallerySubscription().onNext({
            data: () => makeGallery('g1', { public: false }).getData(),
        });

        expect(db.isKnownPublic('g1')).toBe(false);
    });

    it('records a refusal without failing this creator’s galleries sync', () => {
        // A visitor refused someone else's gallery is not the signed-in
        // creator's galleries domain breaking, and reporting it as such would
        // show them a sync error for a page they merely visited.
        db.watchPublic('g1');
        gallerySubscription().onError({ code: 'permission-denied' });

        expect(db.publicWatchState.get('g1')).toBe('denied');
        expect(syncMarks).toEqual([]);
    });

    it('releases both halves when the last holder lets go', () => {
        const first = db.watchPublic('g1');
        const second = db.watchPublic('g1');
        expect(gallerySubscriptions).toHaveLength(1);

        first();
        expect(gallerySubscription().unsubscribed).toBe(false);

        second();
        expect(gallerySubscription().unsubscribed).toBe(true);
        expect(releasedHowTos).toEqual(['g1']);
    });
});
