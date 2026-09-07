import { FirebaseError } from 'firebase/app';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SyncDomain } from '@db/Domains';
import type { Mock } from 'vitest';
import SaveTracker, {
    type RePush,
    type SaveTrackerHost,
} from './SaveTracker.svelte';

// SaveTracker imports SaveFailureReason as a value; the real module drags the
// whole persistence graph in, the same reason CharacterDatabase.test.ts mocks it.
vi.mock('@db/Database', () => ({
    SaveFailureReason: {
        FirestoreBatchFailed: 'firestore-batch-failed',
        CloudWriteRefused: 'cloud-write-refused',
    },
}));

const refreshAuthToken = vi.fn(async () => {});
vi.mock('@db/firebase', () => ({
    refreshAuthToken: () => refreshAuthToken(),
}));

const denied = () =>
    new FirebaseError('permission-denied', 'Missing permissions');

/** What `rePush` hands back for an item that still exists; each call builds a
 *  fresh write, which is what makes a retry possible at all. */
function replayWith(write: () => Promise<unknown>): RePush {
    return { name: 'item', write: write() };
}

/** A fake durable dirty table: exactly the {@link DirtyCache} slice the tracker
 *  touches, so no database has to be stood up. */
function makeCache() {
    return {
        markDirty: vi.fn(async (_domain: SyncDomain, _id: string) => {}),
        markClean: vi.fn(async (_domain: SyncDomain, _id: string) => {}),
        clearDirty: vi.fn(async (_domain: SyncDomain) => {}),
        getDirty: vi.fn(async (_domain: SyncDomain): Promise<string[]> => []),
    };
}

let cache: ReturnType<typeof makeCache>;
let rePush: Mock<(id: string) => RePush>;
let tracker: SaveTracker;

beforeEach(() => {
    cache = makeCache();
    rePush = vi.fn((_id: string): RePush => undefined);
    refreshAuthToken.mockClear();
    const host: SaveTrackerHost = {
        domain: 'galleries',
        rePush: (id) => rePush(id),
        localDB: () => cache,
        track: (write) => write,
        deviceCount: () => 3,
        supported: () => true,
        isHydrated: () => true,
        onStorageFull: vi.fn(),
    };
    tracker = new SaveTracker(host);
});

describe('an ordinary failure stays retryable', () => {
    it('leaves the item unsaved, authoritative, and durably dirty', async () => {
        const ok = await tracker.trackSave(
            'g1',
            'Gallery',
            Promise.reject(new Error('offline')),
        );
        expect(ok).toBe(false);
        expect(tracker.unsavedIDs.has('g1')).toBe(true);
        expect(tracker.isLocallyAuthoritative('g1')).toBe(true);
        expect(cache.markClean).not.toHaveBeenCalled();
        expect(tracker.saveErrors[0]?.reason).toBe('firestore-batch-failed');
    });

    it('does not refresh the token or replay', async () => {
        await tracker.trackSave(
            'g1',
            'Gallery',
            Promise.reject(new Error('x')),
        );
        expect(refreshAuthToken).not.toHaveBeenCalled();
        expect(rePush).not.toHaveBeenCalled();
    });
});

describe('a refusal is not believed the first time', () => {
    // A permission-denied is far more often a stale ID token than a real change
    // of permission — the conclusion ProjectsDatabase.persist and the CRDT
    // provider both reached — so believing the first one would discard a
    // perfectly writable edit.
    it('refreshes the token and replays once', async () => {
        rePush.mockImplementation(() =>
            replayWith(() => Promise.resolve('saved')),
        );

        const ok = await tracker.trackSave(
            'g1',
            'Gallery',
            Promise.reject(denied()),
        );

        expect(refreshAuthToken).toHaveBeenCalledTimes(1);
        expect(rePush).toHaveBeenCalledWith('g1');
        expect(ok).toBe(true);
        expect(tracker.unsavedIDs.has('g1')).toBe(false);
        expect(tracker.saveErrors).toHaveLength(0);
    });

    it('gives up when the replay is refused too', async () => {
        rePush.mockImplementation(() =>
            replayWith(() => Promise.reject(denied())),
        );

        const ok = await tracker.trackSave(
            'g1',
            'Gallery',
            Promise.reject(denied()),
        );

        expect(ok).toBe(false);
        // Still unsaved — it is — but no longer authoritative, so the listener
        // may take the server's copy again instead of refusing every snapshot.
        expect(tracker.unsavedIDs.has('g1')).toBe(true);
        expect(tracker.isLocallyAuthoritative('g1')).toBe(false);
        expect(tracker.saveCounts.unsaved).toBe(1);
        expect(tracker.saveErrors[0]?.reason).toBe('cloud-write-refused');
        // The durable dirty row goes, or seedDirty re-wedges it on reload.
        expect(cache.markClean).toHaveBeenCalledWith('galleries', 'g1');
    });

    it('gives up when there is nothing left to replay', async () => {
        // A rules refusal of a create is refused identically on a second try,
        // so an item the facade can no longer build a write for is believed.
        await tracker.trackSave('g1', 'Gallery', Promise.reject(denied()));
        expect(tracker.isLocallyAuthoritative('g1')).toBe(false);
        expect(tracker.saveErrors[0]?.reason).toBe('cloud-write-refused');
    });
});

describe('flushUnsaved', () => {
    it('never replays a refused write again', async () => {
        rePush.mockImplementation(() =>
            replayWith(() => Promise.reject(denied())),
        );
        await tracker.trackSave('g1', 'Gallery', Promise.reject(denied()));
        rePush.mockClear();
        cache.markDirty.mockClear();

        await tracker.flushUnsaved();

        // Not merely "doesn't succeed": trackSave marks dirty unconditionally at
        // the top, so a replay would re-arm the durable row this rejection just
        // cleared, and the item would be wedged again on the next reload.
        expect(rePush).not.toHaveBeenCalled();
        expect(cache.markDirty).not.toHaveBeenCalled();
    });

    it('still replays an item that merely failed', async () => {
        await tracker.trackSave(
            'g1',
            'Gallery',
            Promise.reject(new Error('x')),
        );
        rePush.mockClear();
        rePush.mockImplementation(() => replayWith(() => Promise.resolve()));

        await tracker.flushUnsaved();

        expect(rePush).toHaveBeenCalledWith('g1');
    });
});

describe('re-arming', () => {
    async function refuse() {
        rePush.mockImplementation(() =>
            replayWith(() => Promise.reject(denied())),
        );
        await tracker.trackSave('g1', 'Gallery', Promise.reject(denied()));
    }

    it('a later successful write clears the refusal', async () => {
        await refuse();
        await tracker.trackSave('g1', 'Gallery', Promise.resolve());
        expect(tracker.unsavedIDs.has('g1')).toBe(false);
        expect(tracker.saveErrors).toHaveLength(0);
    });

    it('a later write is authoritative again while in flight', async () => {
        await refuse();
        const pending = tracker.trackSave(
            'g1',
            'Gallery',
            new Promise(() => {
                // Never settles: we're asserting the in-flight state.
            }),
        );
        await Promise.resolve();
        expect(tracker.isLocallyAuthoritative('g1')).toBe(true);
        void pending;
    });

    it('forget and clearTracking drop the refusal', async () => {
        await refuse();
        tracker.forget('g1');
        expect(tracker.isLocallyAuthoritative('g1')).toBe(false);
        expect(tracker.unsavedIDs.has('g1')).toBe(false);

        await refuse();
        await tracker.clearTracking();
        expect(tracker.unsavedIDs.size).toBe(0);
        expect(tracker.saveErrors).toHaveLength(0);
    });
});
