import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import type { SyncDomain } from '@db/Domains';
import {
    SaveFailureReason,
    type SaveCounts,
    type SaveError,
} from '@db/Database';
import type { WordplayDexie } from '@db/WordplayDexie';
import firebaseErrorDetail from '@db/firebaseErrorDetail';

/** Build the standard {@link SaveError} for a failed Firestore write. The one
 *  place the shape of a cloud-write failure is defined for the per-item domains. */
export function firestoreSaveError(
    id: string,
    name: string | undefined,
    error: unknown,
): SaveError {
    return {
        id,
        name,
        reason: SaveFailureReason.FirestoreBatchFailed,
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
    /** The shared local cache (read lazily; may be swapped in tests). */
    localDB: () => WordplayDexie;
    /** Wrap a cloud write for the global save-status store. */
    track: (write: Promise<unknown>) => Promise<unknown>;
    /** How many of the user's items are saved on this device (reactive). */
    deviceCount: () => number;
    /** Whether IndexedDB is usable (so durable dirty rows are written). */
    supported: () => boolean;
    /** Whether the cache has finished loading (gates stale-flag healing). */
    isHydrated: () => boolean;
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
     *  (write pending or failed). Readable by the facade (e.g. listener
     *  skip-dirty guards); mutated only through this class's methods. */
    readonly unsavedIDs = new SvelteSet<string>();

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

    /** Wrap a cloud write so the save-status UI reflects it: mark the item
     *  unsaved (durably) while in flight, clear it on success, and record a
     *  failure (leaving it unsaved) on rejection. Returns whether it succeeded. */
    async trackSave(
        id: string,
        name: string | undefined,
        write: Promise<unknown>,
    ): Promise<boolean> {
        this.unsavedIDs.add(id);
        // Persist the dirty bit so the pending write survives a reload.
        if (this.host.supported())
            this.host.localDB().markDirty(this.host.domain, id);
        this.saveErrorMap.delete(id);
        try {
            await this.host.track(write);
            this.unsavedIDs.delete(id);
            if (this.host.supported())
                void this.host.localDB().markClean(this.host.domain, id);
            return true;
        } catch (error) {
            this.saveErrorMap.set(id, firestoreSaveError(id, name, error));
            return false;
        }
    }

    /** Re-attempt the cloud write for every unsaved item (e.g. edits made
     *  offline before a reload). `rePush(id)` returns the write to retry, or
     *  `undefined` when the item is gone — in which case the stale dirty flag is
     *  healed so it stops counting as unsaved forever. Healing is gated on
     *  hydration so we never clobber a flag for an item the cache hasn't loaded
     *  yet. Called once the user is known (startSync) and on reconnect; a no-op
     *  when nothing is unsaved. */
    async flushUnsaved(rePush: (id: string) => RePush): Promise<void> {
        for (const id of Array.from(this.unsavedIDs)) {
            const push = rePush(id);
            if (push) void this.trackSave(id, push.name, push.write);
            else if (this.host.isHydrated()) this.forget(id);
        }
    }

    /** Drop one item from unsaved/error tracking and clear its durable dirty
     *  row. Use on delete and when healing a stale flag — never leave a dirty
     *  row whose item is gone, or it re-seeds `unsavedIDs` on every reload. */
    forget(id: string) {
        this.unsavedIDs.delete(id);
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
        this.saveErrorMap.clear();
        if (this.host.supported())
            await this.host.localDB().clearDirty(this.host.domain);
    }
}
