import { isRecord } from '@util/guards';
import { must } from '@util/nullable';
import type { DocumentData, DocumentSnapshot } from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/** A recorded write's fields, checked rather than asserted. */
function fieldsOf(data: unknown): Record<string, unknown> {
    if (!isRecord(data)) throw new Error('a write with no fields');
    return data;
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

/** The id a fake document carries. */
function idOf(document: Record<string, unknown>): string {
    const { id } = document;
    if (typeof id !== 'string') throw new Error('a document with no id');
    return id;
}

/** A document snapshot with only the parts the how-to database reads. A real
 *  one can't be constructed, and the two methods are the whole surface. */
function fakeSnapshot(snapshot: {
    exists: () => boolean;
    data?: () => unknown;
}): DocumentSnapshot<DocumentData> {
    // @ts-expect-error Only the parts the database reads.
    return snapshot;
}

type BatchOp = {
    kind: 'set' | 'update' | 'delete';
    ref: unknown;
    data?: unknown;
};
let lastBatchOps: BatchOp[] = [];
/** What `batch.commit()` returns; a test can hold it unresolved. */
let commitResult: Promise<void> = Promise.resolve();

type FakeSubscription = {
    target: unknown;
    onNext: (snapshot: unknown) => void;
    onError: (error: unknown) => void;
    unsubscribed: boolean;
};
const subscriptions: FakeSubscription[] = [];

/** The subscription at an index, which every caller has just asserted exists. */
function subscription(index = 0): FakeSubscription {
    return must(subscriptions[index], `subscription ${index}`);
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
    // Inspectable rather than opaque, so a test can assert which constraints a
    // listener subscribed with — the filters are load-bearing (a query Firestore
    // would refuse, or one that silently matches nothing).
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
            subscriptions.push(subscription);
            return () => {
                subscription.unsubscribed = true;
            };
        },
    ),
    collection: vi.fn((_firestore: unknown, name: string) => ({
        _collection: name,
    })),
    query: vi.fn((coll: unknown, ...constraints: unknown[]) => ({
        _query: { coll, constraints },
    })),
    where: vi.fn((field: string, op: string, value: unknown) => ({
        _where: { field, op, value },
    })),
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
    type HowToDocument,
    type HowToUnknownVersion,
    FirstFallbackDelay,
    HowToDatabase,
    HowToSchemaLatestVersion,
    HowTosCollection,
    howToListingInitial,
    upgradeHowTo,
} from './HowToDatabase.svelte';
import Gallery from '@db/galleries/Gallery';
import { HowToFields } from '@db/rulesFields';
import { getDoc, updateDoc } from 'firebase/firestore';

const baseSocial = {
    v: 1 as const,
    notifySubscribers: false,
    reactionOptions: {},
    reactions: {},
    usedByProjects: [],
    chat: null,
    bookmarkers: [],
    seenByUsers: [],
    viewCount: 0,
};

/** Typed, so the literal below doesn't widen `v` to `number`. */
const Latest: HowToDocument['v'] = HowToSchemaLatestVersion;

function makeHowToDoc(overrides: Record<string, unknown> = {}) {
    return {
        ...howToListingInitial(),
        v: Latest,
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

function makeGallery(id: string, howTos: string[] = []): Gallery {
    // Minimal stub that satisfies the methods deleteHowTo/addHowTo call on it.
    const gallery = {
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
    };
    // @ts-expect-error `Gallery` is a class, so a stub of the methods these
    // writers call can never be assignable to it.
    return gallery;
}

/** The parts of `Database` the how-to database reaches for. A class with
 *  private state has no structural stand-in, so the one suppression is here. */
type DatabaseFake = {
    getUser: () => { uid: string } | null;
    track?: unknown;
    write?: unknown;
    read?: unknown;
    isConnectivityError?: unknown;
    reportBanner?: unknown;
    markSyncing?: unknown;
    markSynced?: unknown;
    markSyncFailed?: unknown;
    markFirebaseFailed?: unknown;
    Galleries?: unknown;
    Chats?: unknown;
};

function fakeHowToDatabase(fake: DatabaseFake): HowToDatabase {
    // @ts-expect-error The fake implements only what this database calls.
    return new HowToDatabase(fake);
}

describe('HowToDatabase atomic how-to + gallery updates', () => {
    let db: HowToDatabase;
    let mockDatabase: DatabaseFake & {
        write: ReturnType<typeof vi.fn>;
        reportBanner: ReturnType<typeof vi.fn>;
        Galleries: { mirrorHowToMembership: ReturnType<typeof vi.fn> };
        Chats: { deleteChat: ReturnType<typeof vi.fn> };
    };

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
            Chats: { deleteChat: vi.fn(async () => true) },
        };

        db = fakeHowToDatabase(mockDatabase);
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
            expect(refCollection(howToSet!.ref)).toBe(HowTosCollection);

            const galleryUpdate = lastBatchOps.find((o) => o.kind === 'update');
            expect(galleryUpdate).toBeDefined();
            expect(galleryUpdate!.ref).toMatchObject({
                _ref: { collection: 'galleries', id: 'g1' },
            });
            const data = fieldsOf(galleryUpdate!.data);
            expect(data.howTos).toMatchObject({ _op: 'arrayUnion' });
            const elements = opElements(data.howTos);
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
            const elements = opElements(fieldsOf(galleryUpdate!.data).howTos);
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

        it('deletes the conversation about it first, and only when there is one', async () => {
            // Before the how-to, because the chat rules read the how-to to
            // decide who may delete its chat — deleting the how-to first strands
            // the conversation for good (#1353).
            const gallery = makeGallery('g1', ['ht-1']);
            db['howtos'].set(
                'ht-1',
                new HowTo(
                    makeHowToDoc({
                        id: 'ht-1',
                        social: { ...baseSocial, chat: 'ht-1' },
                    }),
                ),
            );

            await db.deleteHowTo('ht-1', gallery);

            expect(mockDatabase.Chats.deleteChat).toHaveBeenCalledWith('ht-1');
        });

        it('does not ask to delete a conversation that was never started', async () => {
            const gallery = makeGallery('g1', ['ht-1']);
            db['howtos'].set('ht-1', new HowTo(makeHowToDoc({ id: 'ht-1' })));

            await db.deleteHowTo('ht-1', gallery);

            expect(mockDatabase.Chats.deleteChat).not.toHaveBeenCalled();
        });

        it('keeps the how-to when its conversation could not be deleted', async () => {
            // The alternative is the one state with no way back: the how-to gone
            // and the chat left behind, which no client can then reach.
            mockDatabase.Chats.deleteChat = vi.fn(async () => false);
            const gallery = makeGallery('g1', ['ht-1']);
            db['howtos'].set(
                'ht-1',
                new HowTo(
                    makeHowToDoc({
                        id: 'ht-1',
                        social: { ...baseSocial, chat: 'ht-1' },
                    }),
                ),
            );

            expect(await db.deleteHowTo('ht-1', gallery)).toBe(false);
            expect(lastBatchOps).toHaveLength(0);
            expect(db['howtos'].has('ht-1')).toBe(true);
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
            const [, data] = must(
                vi.mocked(updateDoc).mock.calls[0],
                'the updateDoc call asserted above',
            );
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

    /**
     * The how-to update rule lets an owner, collaborator or curator write
     * anything, and gives everyone else two narrow openings —
     * `hasOnly(["social"])` and `hasOnly(["xcoord","ycoord"])`. A viewer
     * registering that they saw a how-to therefore has to send just `social`:
     * a whole-document write is refused the moment any other field has drifted
     * from the server's copy, and `withFields` bumping `v` is enough on its own.
     */
    describe('narrow updates', () => {
        it('sends only social when asked for the social opening', async () => {
            await db.updateHowTo(
                new HowTo(makeHowToDoc()),
                true,
                HowToFields.Social,
            );

            expect(vi.mocked(updateDoc)).toHaveBeenCalledTimes(1);
            const [, data] = must(
                vi.mocked(updateDoc).mock.calls[0],
                'the updateDoc call asserted above',
            );
            expect(Object.keys(data)).toEqual(['social']);
        });

        it('sends only the coordinates when asked for the placement opening', async () => {
            await db.updateHowTo(
                new HowTo(makeHowToDoc()),
                true,
                HowToFields.Placement,
            );

            const [, data] = must(
                vi.mocked(updateDoc).mock.calls[0],
                'the updateDoc call asserted above',
            );
            expect(Object.keys(data).toSorted()).toEqual(['xcoord', 'ycoord']);
        });

        it('still writes the whole document for an ordinary edit', async () => {
            // An author editing content lands in the rule's unconstrained
            // branch, so narrowing there would only lose fields.
            await db.updateHowTo(new HowTo(makeHowToDoc()), true);

            const [, data] = must(
                vi.mocked(updateDoc).mock.calls[0],
                'the updateDoc call asserted above',
            );
            expect(data).toHaveProperty('title');
            expect(data).toHaveProperty('social');
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

    it('a v3 doc arrives unlisted and having asked for nothing', () => {
        const { submittedToGuide, moderation, moderatedAt, flags, ...rest } =
            makeHowToDoc();
        const upgraded = upgradeHowTo({ ...rest, v: 3 as const });
        expect(upgraded.submittedToGuide).toBe(false);
        expect(upgraded.moderation).toBe('unrequested');
        expect(upgraded.moderatedAt).toBe(null);
        expect(Object.values(upgraded.flags)).toEqual([null, null, null, null]);
    });

    it('a doc already claiming the latest version still gets the fields', () => {
        // `withFields` bumps `v` on every save without adding fields, so a
        // how-to edited by v4 code before this shipped reaches storage claiming
        // v4 and carrying none of them. Returning it as-is would skip the
        // backfill forever — which is how a pending kit once became invisible
        // to the moderator queue.
        const { submittedToGuide, moderation, moderatedAt, flags, ...rest } =
            makeHowToDoc();
        const mislabelled: HowToUnknownVersion = {
            ...rest,
            v: HowToSchemaLatestVersion,
        };
        const upgraded = upgradeHowTo(mislabelled);
        expect(upgraded.moderation).toBe('unrequested');
        expect(upgraded.submittedToGuide).toBe(false);
    });

    it('keeps a decision a stored doc already carries', () => {
        const upgraded = upgradeHowTo(
            makeHowToDoc({ moderation: 'approved', moderatedAt: 7 }),
        );
        expect(upgraded.moderation).toBe('approved');
        expect(upgraded.moderatedAt).toBe(7);
    });
});

describe('isListed', () => {
    // All three, because the guide's query filters on all three: Firestore
    // denies a whole query when one matched document fails its read rule.
    it.each([
        [{ published: true, isPublic: true, moderation: 'approved' }, true],
        [{ published: false, isPublic: true, moderation: 'approved' }, false],
        [{ published: true, isPublic: false, moderation: 'approved' }, false],
        [{ published: true, isPublic: true, moderation: 'pending' }, false],
    ])('%o is %s', (fields, listed) => {
        expect(new HowTo(upgradeHowTo(makeHowToDoc(fields))).isListed()).toBe(
            listed,
        );
    });
});

describe('one-shot reads are shared while in flight', () => {
    let db: HowToDatabase;

    beforeEach(() => {
        vi.clearAllMocks();
        db = fakeHowToDatabase({
            getUser: vi.fn(() => ({ uid: 'user-1' })),
            read: vi.fn(<T>(p: Promise<T>) => p),
            isConnectivityError: vi.fn(() => false),
        });
    });

    it('shares one read between concurrent askers', async () => {
        // The cold-load cost this exists for: four surfaces show a gallery's
        // how-tos, and on an empty cache each used to issue its own getDoc for
        // every document — up to four billed reads per how-to per page.
        let settle: (value: DocumentSnapshot<DocumentData>) => void = () => {};
        vi.mocked(getDoc).mockReturnValueOnce(
            new Promise<DocumentSnapshot<DocumentData>>((resolve) => {
                settle = resolve;
            }),
        );

        const asks = Array.from({ length: 10 }, () => db.getHowTo('ht-1'));
        expect(vi.mocked(getDoc)).toHaveBeenCalledTimes(1);

        settle(fakeSnapshot({ exists: () => false }));
        const results = await Promise.all(asks);

        expect(vi.mocked(getDoc)).toHaveBeenCalledTimes(1);
        expect(results).toEqual(Array.from({ length: 10 }, () => undefined));
    });

    it('asks again once the answer has settled', async () => {
        // The shared request is released when it settles: "we already asked" is
        // only true while the answer is still coming.
        vi.mocked(getDoc).mockResolvedValue(
            fakeSnapshot({ exists: () => false }),
        );

        await db.getHowTo('ht-1');
        await db.getHowTo('ht-1');

        expect(vi.mocked(getDoc)).toHaveBeenCalledTimes(2);
    });
});

describe('watching a gallery (#1375)', () => {
    /** The constraint descriptors the fake `where` produced, for one query. */
    function constraintsOf(subscription: FakeSubscription) {
        const { target } = subscription;
        const query = isRecord(target) ? target._query : undefined;
        const constraints = isRecord(query) ? query.constraints : undefined;
        return (Array.isArray(constraints) ? constraints : []).map(
            (constraint: unknown) =>
                isRecord(constraint) && isRecord(constraint._where)
                    ? constraint._where
                    : undefined,
        );
    }

    function fields(subscription: FakeSubscription) {
        return constraintsOf(subscription).map((where) => where?.field);
    }

    /** A gallery the database can find without going anywhere. */
    function fakeGallery(id: string, howTos: string[], isPublic: boolean) {
        return {
            getID: () => id,
            getHowTos: () => howTos,
            isPublic: () => isPublic,
            hasCurator: () => false,
            hasCreator: () => false,
            getHowToExpandedVisibility: () => false,
            getHowToViewers: () => [],
        };
    }

    let db: HowToDatabase;
    let accessible: Map<string, unknown>;
    let expandedScope: Map<string, unknown>;
    let known: Map<string, ReturnType<typeof fakeGallery>>;
    let marks: string[];

    /** Mutable, so one database can watch a visitor sign in. */
    let currentUid: string | null = null;
    /** Whether a rejected read counts as "we never got an answer" rather than
     *  "not for you" — only the first is worth asking about again. */
    let connectivity = false;

    function makeDatabase(uid: string | null) {
        currentUid = uid;
        return {
            getUser: vi.fn(() =>
                currentUid === null ? null : { uid: currentUid },
            ),
            read: vi.fn(<T>(p: Promise<T>) => p),
            isConnectivityError: vi.fn(() => connectivity),
            markSyncing: vi.fn((d: string) => marks.push(`syncing:${d}`)),
            markSynced: vi.fn((d: string) => marks.push(`synced:${d}`)),
            markSyncFailed: vi.fn((d: string) => marks.push(`failed:${d}`)),
            markFirebaseFailed: vi.fn(),
            Galleries: {
                accessibleGalleries: accessible,
                expandedScopeGalleries: expandedScope,
                isKnownPublic: (id: string) =>
                    known.get(id)?.isPublic() === true,
                getKnown: (id: string) => known.get(id),
            },
        };
    }

    beforeEach(() => {
        vi.clearAllMocks();
        subscriptions.length = 0;
        accessible = new Map();
        expandedScope = new Map();
        known = new Map();
        marks = [];
        connectivity = false;
        known.set('g-1', fakeGallery('g-1', ['ht-1', 'ht-2'], true));
        db = fakeHowToDatabase(makeDatabase(null));
    });

    it('subscribes on galleryId and published, and on nothing else', () => {
        // The seed's public how-to is `isPublic: false`, readable only through
        // the rule's `isGalleryPublic` branch — so filtering on `isPublic` would
        // match nothing and read as a broken listener. `scopeOverwrite` belongs
        // to the expanded-access branch, not this one.
        db.watchGallery('g-1');

        expect(subscriptions).toHaveLength(1);
        expect(fields(subscription())).toEqual(['galleryId', 'published']);
        expect(constraintsOf(subscription())).toEqual([
            { field: 'galleryId', op: '==', value: 'g-1' },
            { field: 'published', op: '==', value: true },
        ]);
    });

    it('costs a signed-out visitor the query and nothing else', () => {
        // The whole point of choosing one path: a watch plus a read-through of
        // the gallery's list would bill every document twice on a cold load.
        db.watchGallery('g-1');

        expect(subscriptions).toHaveLength(1);
        expect(vi.mocked(getDoc)).not.toHaveBeenCalled();
    });

    /** A database whose three uid listeners are actually running. */
    function signedIn(uid: string) {
        const running = fakeHowToDatabase(makeDatabase(uid));
        // `deferToIdle` runs synchronously with no `window`, which is this
        // suite's environment, so the listeners exist by the time this returns.
        // @ts-expect-error `firebase/firestore` is mocked, so the handle is
        // never dereferenced.
        running.listen({}, uid);
        subscriptions.length = 0;
        vi.mocked(getDoc).mockClear();
        marks.length = 0;
        return running;
    }

    it('does nothing at all when the uid listeners already cover the gallery', () => {
        accessible.set('g-1', known.get('g-1'));
        db = signedIn('user-1');

        db.watchGallery('g-1');

        expect(subscriptions).toHaveLength(0);
        expect(vi.mocked(getDoc)).not.toHaveBeenCalled();
    });

    it('prefers the public query to expanded scope, which omits opted-out how-tos', () => {
        // Listener 3 carries `scopeOverwrite == false`, so on a gallery that is
        // also public it would silently drop a how-to the public branch admits.
        expandedScope.set('g-1', known.get('g-1'));
        db = signedIn('user-1');

        db.watchGallery('g-1');

        expect(subscriptions).toHaveLength(1);
        expect(fields(subscription())).toEqual(['galleryId', 'published']);
    });

    it('drops the public watch when signing in covers the gallery', () => {
        // Otherwise the member pays for the same documents twice: once through
        // Listener 2 and once through a public query started while signed out.
        // `listen` defers to idle, which is why the re-decision has to happen
        // where the listeners actually come up rather than at the call.
        db.watchGallery('g-1');
        expect(subscriptions).toHaveLength(1);

        currentUid = 'user-1';
        accessible.set('g-1', known.get('g-1'));
        // @ts-expect-error `firebase/firestore` is mocked, so the handle is
        // never dereferenced.
        db.listen({}, 'user-1');

        expect(subscription().unsubscribed).toBe(true);
    });

    it('shares one subscription between every surface showing the gallery', () => {
        const first = db.watchGallery('g-1');
        const second = db.watchGallery('g-1');
        const third = db.watchGallery('g-1');
        const fourth = db.watchGallery('g-1');
        expect(subscriptions).toHaveLength(1);

        first();
        second();
        third();
        expect(subscription().unsubscribed).toBe(false);

        fourth();
        expect(subscription().unsubscribed).toBe(true);
    });

    it('reads the gallery through when it is not public, and subscribes once it is', async () => {
        known.set('g-2', fakeGallery('g-2', ['ht-3'], false));
        vi.mocked(getDoc).mockResolvedValue(
            fakeSnapshot({ exists: () => false }),
        );

        db.watchGallery('g-2');
        await Promise.resolve();
        expect(subscriptions).toHaveLength(0);
        expect(vi.mocked(getDoc)).toHaveBeenCalledTimes(1);

        known.set('g-2', fakeGallery('g-2', ['ht-3'], true));
        db.publicGalleryChanged('g-2');
        expect(subscriptions).toHaveLength(1);
    });

    it('keeps a public watch through ignore, and ends it on stop', () => {
        // `ignore` is what the how-to *notifications* setting calls, and
        // silencing the bell must not stop someone reading a public space.
        db.watchGallery('g-1');
        db.ignore();
        expect(subscription().unsubscribed).toBe(false);

        db.stop();
        expect(subscription().unsubscribed).toBe(true);
    });

    it('never reports a public watch as this creator syncing', () => {
        db.watchGallery('g-1');
        subscription().onNext({
            metadata: { fromCache: false },
            forEach: () => {},
            docChanges: () => [],
        });

        // A signed-in visitor on someone else's public gallery would otherwise
        // watch the save-status footer spin until it landed.
        expect(marks).toEqual([]);
    });

    /** Deliver a server snapshot carrying these documents. */
    function deliver(
        subscription: FakeSubscription,
        docs: Record<string, unknown>[],
    ) {
        subscription.onNext({
            metadata: { fromCache: false },
            forEach: (callback: (doc: unknown) => void) =>
                docs.forEach((d) => callback({ id: idOf(d), data: () => d })),
            docChanges: () => [],
        });
    }

    function cachedIDs() {
        return db.allAccessiblePublishedHowTos.map((h) => h.getHowToId());
    }

    it('does not collect a how-to no listener ever claimed', async () => {
        // A `?id=` deep link is fetched one document at a time and belongs to no
        // query, so a GC that ran the moment the public watch reported would
        // empty the very page that asked for it.
        vi.mocked(getDoc).mockResolvedValue(
            fakeSnapshot({
                exists: () => true,
                data: () =>
                    makeHowToDoc({
                        id: 'ht-deep',
                        galleryId: 'g-other',
                        published: true,
                    }),
            }),
        );
        await db.getHowTo('ht-deep');
        expect(cachedIDs()).toContain('ht-deep');

        db.watchGallery('g-1');
        deliver(subscription(), []);

        expect(cachedIDs()).toContain('ht-deep');
    });

    it('collects it once a listener has claimed it and then stopped seeing it', async () => {
        // The exemption is not permanent: a how-to a listener owns is collected
        // normally, or losing access to one would leave it cached forever.
        vi.mocked(getDoc).mockResolvedValue(
            fakeSnapshot({
                exists: () => true,
                data: () =>
                    makeHowToDoc({
                        id: 'ht-deep',
                        galleryId: 'g-1',
                        published: true,
                    }),
            }),
        );
        await db.getHowTo('ht-deep');

        db.watchGallery('g-1');
        deliver(subscription(), [
            makeHowToDoc({ id: 'ht-deep', galleryId: 'g-1', published: true }),
        ]);
        expect(cachedIDs()).toContain('ht-deep');

        deliver(subscription(), []);
        expect(cachedIDs()).not.toContain('ht-deep');
    });

    it('asks by document when the stream never delivers', async () => {
        // The failure this exists for: a listen stream that wedges after the
        // transport is interrupted delivers nothing and reports nothing, so the
        // subscription cannot be its own way back.
        vi.useFakeTimers();
        try {
            vi.mocked(getDoc).mockResolvedValue(
                fakeSnapshot({ exists: () => false }),
            );
            db.watchGallery('g-1');
            expect(vi.mocked(getDoc)).not.toHaveBeenCalled();

            await vi.advanceTimersByTimeAsync(FirstFallbackDelay + 1);

            // 'g-1' holds two how-tos, and neither was on the page.
            expect(vi.mocked(getDoc)).toHaveBeenCalledTimes(2);
        } finally {
            vi.useRealTimers();
        }
    });

    it('asks for nothing once the stream has spoken', async () => {
        // The fallback must not turn every ordinary page load into a second,
        // per-document copy of what the query already delivered.
        vi.useFakeTimers();
        try {
            db.watchGallery('g-1');
            deliver(subscription(), []);

            await vi.advanceTimersByTimeAsync(FirstFallbackDelay * 4);

            expect(vi.mocked(getDoc)).not.toHaveBeenCalled();
        } finally {
            vi.useRealTimers();
        }
    });

    it('keeps asking while a read-through goes unanswered', async () => {
        // A private gallery has no query to fall back on, so the one-shot reads
        // are all there is — and a read that went unanswered is exactly the one
        // worth making again.
        known.set('g-2', fakeGallery('g-2', ['ht-3'], false));
        connectivity = true;
        vi.useFakeTimers();
        try {
            vi.mocked(getDoc).mockRejectedValue(new Error('read-timeout'));
            db.watchGallery('g-2');
            await vi.advanceTimersByTimeAsync(0);
            const afterFirst = vi.mocked(getDoc).mock.calls.length;
            expect(afterFirst).toBeGreaterThan(0);

            await vi.advanceTimersByTimeAsync(FirstFallbackDelay + 1);
            expect(vi.mocked(getDoc).mock.calls.length).toBeGreaterThan(
                afterFirst,
            );
        } finally {
            vi.useRealTimers();
        }
    });

    it('records a refusal rather than reporting an empty space', () => {
        db.watchGallery('g-1');
        subscription().onError({ code: 'permission-denied' });

        expect(db.publicWatchState.get('g-1')).toBe('denied');
        expect(marks).toEqual([]);
    });
});
