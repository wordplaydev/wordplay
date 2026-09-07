import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import type { SyncDomain } from '@db/Domains';
import {
    SaveFailureReason,
    type SaveCounts,
    type SaveError,
} from '@db/Database';
import type { WordplayDexie } from '@db/WordplayDexie';
import { refreshAuthToken } from '@db/firebase';
import firebaseErrorDetail, {
    isPermanentSaveError,
} from '@db/firebaseErrorDetail';
import isQuotaError from '@db/isQuotaError';

/** The slice of the local cache a tracker touches: the durable dirty table.
 *  Named rather than taking the whole `WordplayDexie` so what the tracker needs
 *  is visible, and so a test can supply it without standing up a database. */
export type DirtyCache = Pick<
    WordplayDexie,
    'markDirty' | 'markClean' | 'getDirty' | 'clearDirty'
>;

/** Build the standard {@link SaveError} for a failed Firestore write. The one
 *  place the shape of a cloud-write failure is defined for the per-item domains.
 *  A refusal retrying cannot fix gets its own reason, because the usual message
 *  promises the work is still safe on this device — which stops being true the
 *  moment the item gives up its local authority and takes the cloud's copy. */
export function firestoreSaveError(
    id: string,
    name: string | undefined,
    error: unknown,
): SaveError {
    return {
        id,
        name,
        reason: isPermanentSaveError(error)
            ? SaveFailureReason.CloudWriteRefused
            : SaveFailureReason.FirestoreBatchFailed,
        detail: firebaseErrorDetail(error),
    };
}

/** What a {@link SaveTracker.flushUnsaved} re-push provides for a dirty id: the
 *  write to retry plus an optional display name, or `undefined` if the item is
 *  gone (so the tracker heals the stale dirty flag instead of replaying). */
export type RePush = { write: Promise<unknown>; name?: string } | undefined;

/** The collaborators a {@link SaveTracker} needs from its owning facade. All are
 *  thunks so they read live values at call time — the facade's IndexedDB flag
 *  and `localDB` can change after construction (e.g. in tests), and the device
 *  count and hydration status are reactive. */
export type SaveTrackerHost = {
    domain: SyncDomain;
    /** Build a fresh cloud write for one item, or `undefined` when the item is
     *  gone. Used both to replay unsaved edits ({@link SaveTracker.flushUnsaved})
     *  and to re-issue a write once after refreshing a stale ID token — which is
     *  why it must *build* the write rather than hand over one already in
     *  flight, since a rejected promise cannot be awaited again. */
    rePush: (id: string) => RePush;
    /** The shared local cache's dirty table (read lazily; may be swapped in
     *  tests). */
    localDB: () => DirtyCache;
    /** Wrap a cloud write for the global save-status store. */
    track: (write: Promise<unknown>) => Promise<unknown>;
    /** How many of the user's items are saved on this device (reactive). */
    deviceCount: () => number;
    /** Whether IndexedDB is usable (so durable dirty rows are written). */
    supported: () => boolean;
    /** Whether the cache has finished loading (gates stale-flag healing). */
    isHydrated: () => boolean;
    /** Surface a "this device's storage is full" warning. Called when the
     *  durable dirty-row write fails for lack of space — the offline-replay
     *  safety net is then compromised, so the user must know. */
    onStorageFull: () => void;
};

/**
 * Per-item cloud-save tracking, shared by every domain facade that mirrors a
 * Firestore collection locally. It owns which items have edits not yet confirmed
 * saved (`unsavedIDs`), the failures to surface (`saveErrorMap`), and the derived
 * counts/errors the save-status UI reads — plus the durable dirty-row wiring that
 * lets pending writes survive a reload.
 *
 * Centralizing this is the single source of truth: a fix (clearing the durable
 * dirty row on delete, healing a stale flag, replaying offline edits) happens
 * once here instead of drifting across five facades. The facade supplies only
 * the domain-specific bits — the device count and, per dirty id, the write to
 * replay (see {@link flushUnsaved}). Projects don't use this; they track saved
 * state through the CRDT `ProjectHistory`.
 */
export default class SaveTracker {
    private readonly host: SaveTrackerHost;

    /** Items whose latest edit hasn't been confirmed saved in the cloud
     *  (write pending or failed). Readable by the facade — but a listener's
     *  skip-dirty guard wants {@link isLocallyAuthoritative}, not this: an item
     *  whose write was permanently refused is still unsaved and must still be
     *  kept in the local cache, while the cloud's copy of it is now the better
     *  one. Mutated only through this class's methods. */
    readonly unsavedIDs = new SvelteSet<string>();

    /** Items whose last cloud write was refused in a way retrying cannot fix
     *  (see {@link isPermanentSaveError}). They stay in `unsavedIDs` — they
     *  genuinely are unsaved — but they stop being locally *authoritative*, so
     *  the listener may take the server's copy again and `flushUnsaved` stops
     *  replaying a write that can only be refused again. Cleared when a later
     *  write for that id is attempted. */
    private readonly rejectedIDs = new SvelteSet<string>();

    /** Cloud-save failures keyed by item id, surfaced in the save-status dialog.
     *  Cleared when a later write for that id succeeds. */
    private readonly saveErrorMap = new SvelteMap<string, SaveError>();

    /** Save failures for the save-status dialog. */
    readonly saveErrors: SaveError[] = $derived(
        Array.from(this.saveErrorMap.values()),
    );

    /** How many of the user's items are saved on this device, in the cloud, and
     *  unsaved. */
    readonly saveCounts: SaveCounts = $derived.by(() => {
        const device = this.host.deviceCount();
        const unsaved = this.unsavedIDs.size;
        return { device, unsaved, cloud: Math.max(0, device - unsaved) };
    });

    constructor(host: SaveTrackerHost) {
        this.host = host;
    }

    /** Whether this device's copy of an item should still win over the cloud's —
     *  the question every facade's listener skip-dirty guard is really asking.
     *  An unsaved edit is newer than the cloud's copy and must not be
     *  overwritten, until the write that would have saved it is refused
     *  permanently: at that point there is nothing left to replay, and holding
     *  authority would only mean refusing every server snapshot for the rest of
     *  the session. */
    isLocallyAuthoritative(id: string): boolean {
        return this.unsavedIDs.has(id) && !this.rejectedIDs.has(id);
    }

    /** Wrap a cloud write so the save-status UI reflects it: mark the item
     *  unsaved (durably) while in flight, clear it on success, and record a
     *  failure (leaving it unsaved) on rejection. Returns whether it succeeded. */
    async trackSave(
        id: string,
        name: string | undefined,
        write: Promise<unknown>,
    ): Promise<boolean> {
        this.unsavedIDs.add(id);
        // Persist the dirty bit so the pending write survives a reload. Await
        // it so a full-storage rejection is caught: if the dirty row can't be
        // written, an offline edit won't replay on reload, so warn the user.
        if (this.host.supported()) {
            try {
                await this.host.localDB().markDirty(this.host.domain, id);
            } catch (error) {
                if (isQuotaError(error)) this.host.onStorageFull();
                else console.error(error);
            }
        }
        this.saveErrorMap.delete(id);
        // A new write re-arms everything: whatever refused the last one may not
        // refuse this one, so the item is authoritative again while it's in
        // flight.
        this.rejectedIDs.delete(id);
        try {
            await this.host.track(write);
            return this.confirmSaved(id);
        } catch (error) {
            const refusal = isPermanentSaveError(error)
                ? await this.replayAfterRefresh(id, error)
                : error;
            if (refusal === undefined) return this.confirmSaved(id);
            this.saveErrorMap.set(id, firestoreSaveError(id, name, refusal));
            if (isPermanentSaveError(refusal)) this.reject(id);
            return false;
        }
    }

    /**
     * Re-issue an item's write once with a freshly refreshed ID token, because a
     * `permission-denied` is far more often a stale token than a real change of
     * permission — the conclusion `ProjectsDatabase.persist` and the CRDT
     * provider both reached, and the reason a first refusal is not believed here
     * either. Believing it would discard a perfectly writable edit and hand the
     * cloud's copy back in its place.
     *
     * Returns `undefined` when the replay succeeded, or the error to report.
     * With nothing to replay — an item the facade can no longer build a write
     * for — the original refusal stands, since a rules refusal of a create is
     * refused identically on a second attempt.
     */
    private async replayAfterRefresh(
        id: string,
        refusal: unknown,
    ): Promise<unknown> {
        try {
            await refreshAuthToken();
            const retry = this.host.rePush(id);
            if (retry === undefined) return refusal;
            await this.host.track(retry.write);
            return undefined;
        } catch (again) {
            return again;
        }
    }

    /** Record that an item's write landed. */
    private confirmSaved(id: string): true {
        this.unsavedIDs.delete(id);
        if (this.host.supported())
            void this.host.localDB().markClean(this.host.domain, id);
        return true;
    }

    /** Give up on an item's write: it was refused with a fresh token, so
     *  retrying only produces the same refusal. The item stays *unsaved* — it
     *  is — but stops being locally authoritative, so the listener may take the
     *  server's copy again. The durable dirty row goes too: there is nothing to
     *  replay, and `seedDirty` would otherwise restore the flag on the next
     *  reload and re-wedge the document all over again. */
    private reject(id: string) {
        this.rejectedIDs.add(id);
        if (this.host.supported())
            void this.host.localDB().markClean(this.host.domain, id);
    }

    /** Re-attempt the cloud write for every unsaved item (e.g. edits made
     *  offline before a reload). The host's `rePush(id)` returns the write to
     *  retry, or `undefined` when the item is gone — in which case the stale
     *  dirty flag is healed so it stops counting as unsaved forever. Healing is
     *  gated on hydration so we never clobber a flag for an item the cache
     *  hasn't loaded yet. Called once the user is known (startSync) and on
     *  reconnect; a no-op when nothing is unsaved. */
    async flushUnsaved(): Promise<void> {
        for (const id of Array.from(this.unsavedIDs)) {
            // A refused write is not retried: it was already re-issued once with
            // a fresh token and refused again, so it can only be refused again,
            // and the item has given up its local authority — the cloud's copy
            // is what we hold now.
            if (this.rejectedIDs.has(id)) continue;
            const push = this.host.rePush(id);
            if (push) void this.trackSave(id, push.name, push.write);
            else if (this.host.isHydrated()) this.forget(id);
        }
    }

    /** Drop one item from unsaved/error tracking and clear its durable dirty
     *  row. Use on delete and when healing a stale flag — never leave a dirty
     *  row whose item is gone, or it re-seeds `unsavedIDs` on every reload. */
    forget(id: string) {
        this.unsavedIDs.delete(id);
        this.rejectedIDs.delete(id);
        this.saveErrorMap.delete(id);
        if (this.host.supported())
            void this.host.localDB().markClean(this.host.domain, id);
    }

    /** Seed `unsavedIDs` from the durable dirty table. Call early in hydrate,
     *  before the cloud listener runs, so skip-dirty guards preserve local edits
     *  that haven't reached the cloud yet. */
    async seedDirty(): Promise<void> {
        if (!this.host.supported()) return;
        for (const id of await this.host.localDB().getDirty(this.host.domain))
            this.unsavedIDs.add(id);
    }

    /** Clear all tracking and the durable dirty rows for this domain (account
     *  switch / logout). */
    async clearTracking(): Promise<void> {
        this.unsavedIDs.clear();
        this.rejectedIDs.clear();
        this.saveErrorMap.clear();
        if (this.host.supported())
            await this.host.localDB().clearDirty(this.host.domain);
    }
}
