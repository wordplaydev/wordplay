import { beforeEach, describe, expect, it, vi } from 'vitest';

type BatchOp = {
    kind: 'set' | 'update' | 'delete';
    ref: unknown;
    data?: unknown;
};
let lastBatchOps: BatchOp[] = [];
/** What `batch.commit()` returns; a test can hold it unresolved. */
let commitResult: Promise<void> = Promise.resolve();

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
    updateDoc: vi.fn(async () => {}),
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
            // Resolves immediately by default; a test that needs to hold the
            // write in flight (an offline create) replaces `commitResult`.
            commit: vi.fn(() => commitResult),
        };
    }),
    onSnapshot: vi.fn(() => () => {}),
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    getDoc: vi.fn(async () => ({ exists: () => false })),
}));

vi.mock('@db/firebase', () => ({
    firestore: { _fake: true },
}));

vi.mock('@db/galleries/GalleryDatabase.svelte', () => ({
    GalleriesCollection: 'galleries',
}));

vi.mock('@db/Database', () => ({}));

import HowTo, {
    HowToDatabase,
    HowToSchemaLatestVersion,
    HowTosCollection,
    upgradeHowTo,
} from './HowToDatabase.svelte';
import Gallery from '@db/galleries/Gallery';

const baseSocial = {
    v: 1 as const,
    notifySubscribers: false,
    reactionOptions: {},
    reactions: {},
    usedByProjects: [],
    chat: null,
    bookmarkers: [],
    submittedToGuide: false,
    seenByUsers: [],
    viewCount: 0,
};

function makeHowToDoc(overrides: Record<string, unknown> = {}) {
    return {
        v: HowToSchemaLatestVersion as 3,
        id: 'ht-1',
        galleryId: 'g-1',
        published: false,
        publishedAt: null,
        xcoord: 0,
        ycoord: 0,
        title: '',
        guidingQuestions: [],
        text: [],
        creator: 'user-1',
        collaborators: [],
        viewers: {},
        viewersFlat: [],
        scopeOverwrite: false,
        locales: ['en-US'],
        isPublic: false,
        social: baseSocial,
        ...overrides,
    };
}

function makeGallery(id: string, howTos: string[] = []) {
    // Minimal stub that satisfies the methods deleteHowTo/addHowTo call on it.
    return {
        getID: () => id,
        getCurators: () => [],
        getCreators: () => [],
        getProjects: () => [],
        withHowTo: (htID: string) => makeGallery(id, [...howTos, htID]),
        withoutHowTo: (htID: string) =>
            makeGallery(
                id,
                howTos.filter((h) => h !== htID),
            ),
    } as unknown as Gallery;
}

describe('HowToDatabase atomic how-to + gallery updates', () => {
    let db: HowToDatabase;
    let mockDatabase: any;

    beforeEach(() => {
        vi.clearAllMocks();
        lastBatchOps = [];
        commitResult = Promise.resolve();

        mockDatabase = {
            getUser: vi.fn(() => ({ uid: 'user-1' })),
            track: vi.fn(<T>(p: Promise<T>) => p),
            write: vi.fn(<T>(p: Promise<T>) => p),
            reportBanner: vi.fn(),
            Galleries: { mirrorHowToMembership: vi.fn() },
        };

        db = new HowToDatabase(mockDatabase);
    });

    describe('addHowTo', () => {
        it('writes the new how-to and arrayUnions its ID onto the gallery in a single batch', async () => {
            const gallery = makeGallery('g1');

            await db.addHowTo(
                gallery,
                false,
                0,
                0,
                [],
                'title',
                [],
                [''],
                ['en-US'],
                {},
                false,
                false,
                false,
            );

            // The batch should contain a set on the how-to doc and an update
            // on the gallery doc using arrayUnion.
            expect(lastBatchOps).toHaveLength(2);

            const howToSet = lastBatchOps.find((o) => o.kind === 'set');
            expect(howToSet).toBeDefined();
            const howToRef = howToSet!.ref as { _ref: { collection: string } };
            expect(howToRef._ref.collection).toBe(HowTosCollection);

            const galleryUpdate = lastBatchOps.find((o) => o.kind === 'update');
            expect(galleryUpdate).toBeDefined();
            expect(galleryUpdate!.ref).toMatchObject({
                _ref: { collection: 'galleries', id: 'g1' },
            });
            const data = galleryUpdate!.data as { howTos: unknown };
            expect(data.howTos).toMatchObject({ _op: 'arrayUnion' });
            const { elements } = data.howTos as { elements: string[] };
            expect(elements).toHaveLength(1);
            expect(typeof elements[0]).toBe('string');
        });

        // The gallery half of the batch is a cloud-only arrayUnion, so the
        // membership reaches this client only through the galleries listener —
        // which skips a gallery with an unsaved local edit. Without the local
        // mirror the drafts list can sit empty until some later write to the
        // gallery happens to arrive.
        it('mirrors the new membership once the write lands', async () => {
            const gallery = makeGallery('g1');

            await db.addHowTo(
                gallery,
                false,
                0,
                0,
                [],
                'title',
                [],
                [''],
                ['en-US'],
                {},
                false,
                false,
                false,
            );

            const galleryUpdate = lastBatchOps.find((o) => o.kind === 'update');
            const { elements } = (galleryUpdate!.data as { howTos: unknown })
                .howTos as { elements: string[] };
            await vi.waitFor(() =>
                expect(
                    mockDatabase.Galleries.mirrorHowToMembership,
                ).toHaveBeenCalledWith(gallery, elements[0], true),
            );
        });

        // Offline, the commit doesn't resolve until reconnect. Mirroring before
        // it lands would leave the gallery listing a how-to whose document
        // isn't there — and `flushUnsaved` would replay the gallery that way.
        it('does not mirror while the write is still in flight', async () => {
            const gallery = makeGallery('g1');
            let land: (() => void) | undefined;
            commitResult = new Promise<void>((resolve) => {
                land = resolve;
            });

            await db.addHowTo(
                gallery,
                false,
                0,
                0,
                [],
                'title',
                [],
                [''],
                ['en-US'],
                {},
                false,
                false,
                false,
            );

            expect(
                mockDatabase.Galleries.mirrorHowToMembership,
            ).not.toHaveBeenCalled();

            land?.();
            await vi.waitFor(() =>
                expect(
                    mockDatabase.Galleries.mirrorHowToMembership,
                ).toHaveBeenCalled(),
            );
        });
    });

    describe('deleteHowTo', () => {
        it('deletes the how-to doc and arrayRemoves its ID from the gallery in a single batch', async () => {
            const gallery = makeGallery('g1', ['ht-1']);

            await db.deleteHowTo('ht-1', gallery);

            expect(lastBatchOps).toHaveLength(2);

            const howToDelete = lastBatchOps.find((o) => o.kind === 'delete');
            expect(howToDelete).toBeDefined();
            expect(howToDelete!.ref).toMatchObject({
                _ref: { collection: HowTosCollection, id: 'ht-1' },
            });

            const galleryUpdate = lastBatchOps.find((o) => o.kind === 'update');
            expect(galleryUpdate).toBeDefined();
            expect(galleryUpdate!.ref).toMatchObject({
                _ref: { collection: 'galleries', id: 'g1' },
            });
            expect(galleryUpdate!.data).toMatchObject({
                howTos: { _op: 'arrayRemove', elements: ['ht-1'] },
            });
        });

        it('removes the how-to from the local cache only after the cloud delete succeeds', async () => {
            const gallery = makeGallery('g1', ['ht-1']);
            db['howtos'].set('ht-1', new HowTo(makeHowToDoc({ id: 'ht-1' })));

            await db.deleteHowTo('ht-1', gallery);

            expect(db['howtos'].has('ht-1')).toBe(false);
            expect(mockDatabase.reportBanner).not.toHaveBeenCalled();
            expect(
                mockDatabase.Galleries.mirrorHowToMembership,
            ).toHaveBeenCalledWith(gallery, 'ht-1', false);
        });

        it('keeps the how-to locally and reports a banner when the cloud delete fails', async () => {
            const gallery = makeGallery('g1', ['ht-1']);
            db['howtos'].set('ht-1', new HowTo(makeHowToDoc({ id: 'ht-1' })));
            // Confirm-then-remove: a failed cloud delete must NOT strand the
            // how-to (removed locally but still in the cloud with nothing to
            // retry). It stays cached so the user can try again.
            mockDatabase.write.mockRejectedValueOnce(new Error('offline'));

            await db.deleteHowTo('ht-1', gallery);

            expect(db['howtos'].has('ht-1')).toBe(true);
            expect(mockDatabase.reportBanner).toHaveBeenCalledTimes(1);
            // A refused delete leaves the membership alone too, or the how-to
            // would vanish from the gallery while still in the cloud.
            expect(
                mockDatabase.Galleries.mirrorHowToMembership,
            ).not.toHaveBeenCalled();
        });
    });

    describe('setAutoPreview', () => {
        it('calls updateDoc with only the preview field (partial write)', async () => {
            const { updateDoc } = await import('firebase/firestore');
            const howTo = new HowTo(makeHowToDoc({ id: 'ht-42' }));
            db['howtos'].set('ht-42', howTo);

            const preview = {
                text: '★',
                foreground: '#fff',
                background: '#000',
                face: null,
                characterName: null,
            };
            await db.setAutoPreview('ht-42', preview);

            expect(updateDoc).toHaveBeenCalledOnce();
            const [, data] = (updateDoc as ReturnType<typeof vi.fn>).mock
                .calls[0];
            expect(data).toEqual({ preview });
        });

        it('updates the local cache', async () => {
            const howTo = new HowTo(makeHowToDoc({ id: 'ht-43' }));
            db['howtos'].set('ht-43', howTo);

            const preview = {
                text: 'A',
                foreground: null,
                background: null,
                face: null,
                characterName: null,
            };
            await db.setAutoPreview('ht-43', preview);

            expect(db['howtos'].get('ht-43')?.getPreview()).toEqual(preview);
        });

        it('does nothing when the how-to is not in the local cache', async () => {
            const { updateDoc } = await import('firebase/firestore');
            await db.setAutoPreview('ht-missing', {
                text: 'X',
                foreground: null,
                background: null,
                face: null,
                characterName: null,
            });
            expect(updateDoc).not.toHaveBeenCalled();
        });
    });
});

describe('HowTo preview', () => {
    it('getPreview returns undefined for a fresh how-to', () => {
        const howTo = new HowTo(makeHowToDoc());
        expect(howTo.getPreview()).toBeUndefined();
    });

    it('withPreview round-trips through getPreview', () => {
        const preview = {
            text: '🎉',
            foreground: 'red',
            background: 'blue',
            face: 'sans-serif',
            characterName: null,
        };
        const howTo = new HowTo(makeHowToDoc()).withPreview(preview);
        expect(howTo.getPreview()).toEqual(preview);
    });

    it('getData omits preview when undefined', () => {
        const howTo = new HowTo(makeHowToDoc());
        expect(howTo.getData()).not.toHaveProperty('preview');
    });

    it('getData includes preview when set', () => {
        const preview = {
            text: 'Z',
            foreground: null,
            background: null,
            face: null,
            characterName: null,
        };
        const howTo = new HowTo(makeHowToDoc()).withPreview(preview);
        expect(howTo.getData().preview).toEqual(preview);
    });
});

describe('upgradeHowTo', () => {
    it('upgrades a v1 doc to the latest version', () => {
        const v1 = {
            v: 1 as const,
            id: 'ht-v1',
            galleryId: 'g',
            published: false,
            publishedAt: null,
            xcoord: 0,
            ycoord: 0,
            title: '',
            guidingQuestions: [],
            text: [],
            creator: 'u',
            collaborators: [],
            viewers: {},
            viewersFlat: [],
            scopeOverwrite: false,
            locales: [],
            social: baseSocial,
        };
        const upgraded = upgradeHowTo(v1);
        expect(upgraded.v).toBe(HowToSchemaLatestVersion);
    });

    it('upgrades a v2 doc to the latest version without a preview field', () => {
        const v2 = { ...makeHowToDoc(), v: 2 as const };
        const upgraded = upgradeHowTo(v2);
        expect(upgraded.v).toBe(HowToSchemaLatestVersion);
        expect(upgraded).not.toHaveProperty('preview');
    });
});
