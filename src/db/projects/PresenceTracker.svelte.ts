import {
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    setDoc,
    type Firestore,
    type Unsubscribe,
} from 'firebase/firestore';
import { SvelteMap } from 'svelte/reactivity';
import { MAX_CONCURRENT_EDITORS } from '@db/projects/Project';
import { ProjectsCollection } from '@db/projects/ProjectsDatabase.svelte';
import {
    isPresenceStale,
    pickColorForClient,
    PRESENCE_HEARTBEAT_MS,
    type PresencePayload,
} from '@db/projects/ProjectPresence';
import type { RemoteCaret } from '@db/projects/caretEncoding';

/** Throttle for caret-position publishes. Lower than the heartbeat so
 *  typing-induced caret moves are smooth, but high enough to avoid one
 *  write per keystroke. */
const PUBLISH_THROTTLE_MS = 150;

/**
 * Subscribes to `projects/{projectID}/presence/{clientID}` and exposes
 * remote peers as a reactive Svelte map. Publishes this device's own
 * presence (heartbeat + caret position) on a throttle.
 *
 * Enforces the *concurrent-editor cap* (Project.MAX_CONCURRENT_EDITORS):
 * if the local user tries to start editing while N peers are already in
 * the presence map and we haven't claimed a slot yet, our own publish is
 * suppressed and `isAtCap` becomes true. ProjectsDatabase reads this
 * flag and pauses the CRDT provider so the would-be 5th editor's local
 * edits don't escape into the shared document until a slot opens.
 *
 * Lifecycle: view-driven. One tracker per project being actively
 * viewed in ProjectView, instantiated by
 * ProjectsDatabase.activateCRDT on mount and torn down by
 * deactivateCRDT on unmount. We activate even for solo projects so
 * the same user editing on two devices can see each other's caret;
 * solo projects with no actual remote peers simply produce an empty
 * map and the UI layer suppresses presence chrome.
 */
export class PresenceTracker {
    /** Live map of remote peers keyed by their clientID. Reactive — bind
     *  to it directly from Svelte components. */
    readonly peers: SvelteMap<string, PresencePayload> = new SvelteMap();

    /** True while the local user is being denied a presence slot because
     *  the concurrent-editor cap is already reached. Reactive — bind from
     *  Svelte components to show a "waiting" banner. */
    isAtCap: boolean = $state(false);

    /** True once we've successfully claimed a presence slot. Once true,
     *  subsequent heartbeats no longer re-check the cap (we keep the slot
     *  until we explicitly leave). */
    private claimedSlot = false;

    /** Optional callback fired whenever the cap state flips. ProjectsDatabase
     *  uses this to pause/resume the CRDT publisher in sync with our own
     *  slot status. */
    onCapChange: ((atCap: boolean) => void) | undefined = undefined;

    private readonly db: Firestore;
    private readonly projectID: string;
    /** Per-tab session identifier — readable from components that need
     *  to include the local clientID in their unique-color assignment
     *  (see {@link assignDistinctColors}). */
    readonly clientID: string;
    /**
     * A getter, not a value snapshot. Firebase Auth's IndexedDB state
     * hydrates asynchronously: depending on browser timing, this
     * tracker may be constructed during the brief window before
     * `onAuthStateChanged` fires and `Database.user` is populated. If
     * we captured userID at construction we'd permanently see `null`
     * and the publish guard below would skip every heartbeat forever.
     * Reading it through the getter on each publish picks up the
     * signed-in user as soon as auth settles.
     */
    private readonly getUserID: () => string | null;

    private subUnsub: Unsubscribe | undefined = undefined;
    private heartbeatTimer: ReturnType<typeof setInterval> | undefined =
        undefined;
    private staleTimer: ReturnType<typeof setInterval> | undefined = undefined;
    private publishTimer: ReturnType<typeof setTimeout> | undefined = undefined;

    private currentSourceIndex = -1;
    private currentCaret: RemoteCaret = null;
    private stopped = false;

    constructor(
        db: Firestore,
        projectID: string,
        clientID: string,
        getUserID: () => string | null,
    ) {
        this.db = db;
        this.projectID = projectID;
        this.clientID = clientID;
        this.getUserID = getUserID;
        this.attach();
    }

    private attach(): void {
        // Subscribe to all peers in this project's presence subcollection.
        this.subUnsub = onSnapshot(
            collection(
                this.db,
                ProjectsCollection,
                this.projectID,
                'presence',
            ),
            (snapshot) => {
                for (const change of snapshot.docChanges()) {
                    const id = change.doc.id;
                    if (id === this.clientID) continue; // ignore self
                    if (change.type === 'removed') {
                        this.peers.delete(id);
                    } else {
                        this.peers.set(id, change.doc.data() as PresencePayload);
                    }
                }
                // Snapshot changes can open or close a slot for us.
                this.reconsiderSlot();
            },
            (err) => {
                console.error('PresenceTracker snapshot error', err);
            },
        );

        // Heartbeat: re-publish so peers know we're still here, and also
        // re-try to claim a slot if we're currently waiting at the cap.
        this.heartbeatTimer = setInterval(
            () => this.publishNow(),
            PRESENCE_HEARTBEAT_MS,
        );

        // Stale sweep: drop peers from the local map when their lastSeen
        // is too old (server-side TTL is in Stage 5).
        this.staleTimer = setInterval(() => {
            const now = Date.now();
            let changed = false;
            for (const [id, payload] of this.peers) {
                if (isPresenceStale(payload, now)) {
                    this.peers.delete(id);
                    changed = true;
                }
            }
            if (changed) this.reconsiderSlot();
        }, PRESENCE_HEARTBEAT_MS);

        // Publish our initial presence immediately.
        void this.publishNow();
    }

    /** Update what we're advertising for the local user's caret. The
     *  caret is passed in already encoded by the caller — the tracker
     *  treats it as opaque transport since only the editor (which has
     *  the Y.Text needed for the encoding) can produce one. Throttled. */
    updateCaret(sourceIndex: number, caret: RemoteCaret): void {
        this.currentSourceIndex = sourceIndex;
        this.currentCaret = caret;
        if (this.publishTimer !== undefined) return;
        this.publishTimer = setTimeout(() => {
            this.publishTimer = undefined;
            void this.publishNow();
        }, PUBLISH_THROTTLE_MS);
    }

    /** Force-publish without waiting for the throttle. Used at activation,
     *  from the heartbeat, and whenever a peer drops (which may open a slot
     *  for us). */
    private async publishNow(): Promise<void> {
        if (this.stopped) return;

        // Anonymous users don't publish presence — they can still subscribe
        // and see who's editing, but won't appear in others' peer lists.
        // Matches the design call: "Require sign-in to coedit". Reading
        // through the getter (not a cached value) catches the case where
        // auth hydrates slightly after this tracker was constructed.
        const userID = this.getUserID();
        if (userID === null) return;

        // Live-presence cap: if we haven't yet claimed a slot and there are
        // already MAX-1 other peers (so adding us would exceed the cap),
        // refuse to publish. The next heartbeat or peer-drop will re-check.
        if (!this.claimedSlot && this.peers.size >= MAX_CONCURRENT_EDITORS) {
            this.setAtCap(true);
            return;
        }

        const payload: PresencePayload = {
            clientID: this.clientID,
            userID,
            sourceIndex: this.currentSourceIndex,
            caret: this.currentCaret,
            color: pickColorForClient(this.clientID),
            lastSeen: Date.now(),
        };
        try {
            await setDoc(
                doc(
                    this.db,
                    ProjectsCollection,
                    this.projectID,
                    'presence',
                    this.clientID,
                ),
                payload,
            );
            this.claimedSlot = true;
            this.setAtCap(false);
        } catch (err) {
            console.error('PresenceTracker publish failed', err);
        }
    }

    /** Re-check the cap when peers change. If we were waiting and a peer
     *  has dropped, try to claim a slot now. */
    private reconsiderSlot(): void {
        if (this.stopped) return;
        if (this.claimedSlot) return;
        if (this.peers.size < MAX_CONCURRENT_EDITORS) {
            void this.publishNow();
        }
    }

    private setAtCap(value: boolean): void {
        if (this.isAtCap === value) return;
        this.isAtCap = value;
        if (this.onCapChange !== undefined) this.onCapChange(value);
    }

    /** Stop publishing, unsubscribe, and delete our presence doc. */
    async stop(): Promise<void> {
        if (this.stopped) return;
        this.stopped = true;
        if (this.heartbeatTimer !== undefined) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = undefined;
        }
        if (this.staleTimer !== undefined) {
            clearInterval(this.staleTimer);
            this.staleTimer = undefined;
        }
        if (this.publishTimer !== undefined) {
            clearTimeout(this.publishTimer);
            this.publishTimer = undefined;
        }
        if (this.subUnsub !== undefined) {
            this.subUnsub();
            this.subUnsub = undefined;
        }
        // Only delete our presence doc if we actually claimed a slot — if
        // we were waiting at the cap we never wrote one.
        if (this.claimedSlot) {
            try {
                await deleteDoc(
                    doc(
                        this.db,
                        ProjectsCollection,
                        this.projectID,
                        'presence',
                        this.clientID,
                    ),
                );
            } catch {
                // Best-effort cleanup; stale-sweep on peers will catch us.
            }
        }
        this.peers.clear();
        this.claimedSlot = false;
        this.setAtCap(false);
    }
}
