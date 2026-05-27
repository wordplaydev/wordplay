import { beforeEach, describe, expect, it, vi } from 'vitest';

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
            commit: vi.fn(async () => {}),
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

import { HowToDatabase, HowTosCollection } from './HowToDatabase.svelte';
import Gallery from '@db/galleries/Gallery';

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

        mockDatabase = {
            getUser: vi.fn(() => ({ uid: 'user-1' })),
            track: vi.fn(<T,>(p: Promise<T>) => p),
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

            const galleryUpdate = lastBatchOps.find(
                (o) => o.kind === 'update',
            );
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

            const galleryUpdate = lastBatchOps.find(
                (o) => o.kind === 'update',
            );
            expect(galleryUpdate).toBeDefined();
            expect(galleryUpdate!.ref).toMatchObject({
                _ref: { collection: 'galleries', id: 'g1' },
            });
            expect(galleryUpdate!.data).toMatchObject({
                howTos: { _op: 'arrayRemove', elements: ['ht-1'] },
            });
        });
    });
});
