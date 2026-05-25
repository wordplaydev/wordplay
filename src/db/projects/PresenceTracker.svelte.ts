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
import { ProjectsCollection } from '@db/projects/ProjectsDatabase.svelte';
import {
    isPresenceStale,
    pickColorForClient,
    PRESENCE_HEARTBEAT_MS,
    type PresencePayload,
} from '@db/projects/ProjectPresence';
import type { Path } from '@nodes/Root';

/** Throttle for caret-position publishes. Lower than the heartbeat so
 *  typing-induced caret moves are smooth, but high enough to avoid one
 *  write per keystroke. */
const PUBLISH_THROTTLE_MS = 150;

/**
 * Subscribes to `projects/{projectID}/presence/{clientID}` and exposes
 * remote peers as a reactive Svelte map. Publishes this device's own
 * presence (heartbeat + caret position) on a throttle.
 *
 * Lifecycle: instantiate when entering a project that has active
 * collaboration, call {@link stop} when leaving. Single-editor projects
 * should not instantiate a tracker (gated by hasActiveCollaboration).
 */
export class PresenceTracker {
    /** Live map of remote peers keyed by their clientID. Reactive — bind
     *  to it directly from Svelte components. */
    readonly peers: SvelteMap<string, PresencePayload> = new SvelteMap();

    private readonly db: Firestore;
    private readonly projectID: string;
    private readonly clientID: string;
    private readonly userID: string | null;

    private subUnsub: Unsubscribe | undefined = undefined;
    private heartbeatTimer: ReturnType<typeof setInterval> | undefined =
        undefined;
    private staleTimer: ReturnType<typeof setInterval> | undefined = undefined;
    private publishTimer: ReturnType<typeof setTimeout> | undefined = undefined;

    private currentSourceIndex = -1;
    private currentCaret: number | Path | [number, number] | null = null;
    private stopped = false;

    constructor(
        db: Firestore,
        projectID: string,
        clientID: string,
        userID: string | null,
    ) {
        this.db = db;
        this.projectID = projectID;
        this.clientID = clientID;
        this.userID = userID;
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
            },
            (err) => {
                console.error('PresenceTracker snapshot error', err);
            },
        );

        // Heartbeat: re-publish so peers know we're still here.
        this.heartbeatTimer = setInterval(
            () => this.publishNow(),
            PRESENCE_HEARTBEAT_MS,
        );

        // Stale sweep: drop peers from the local map when their lastSeen
        // is too old (server-side TTL is in Stage 5).
        this.staleTimer = setInterval(() => {
            const now = Date.now();
            for (const [id, payload] of this.peers) {
                if (isPresenceStale(payload, now)) this.peers.delete(id);
            }
        }, PRESENCE_HEARTBEAT_MS);

        // Publish our initial presence immediately.
        this.publishNow();
    }

    /** Update what we're advertising for the local user's caret. Throttled. */
    updateCaret(
        sourceIndex: number,
        caret: number | Path | [number, number] | null,
    ): void {
        this.currentSourceIndex = sourceIndex;
        this.currentCaret = caret;
        if (this.publishTimer !== undefined) return;
        this.publishTimer = setTimeout(() => {
            this.publishTimer = undefined;
            void this.publishNow();
        }, PUBLISH_THROTTLE_MS);
    }

    /** Force-publish without waiting for the throttle. Used at activation
     *  and from the heartbeat.
     *
     *  Anonymous users (no Firebase UID) don't publish presence — they can
     *  still subscribe and see who's editing, but won't appear in others'
     *  peer lists. Matches the design call: "Require sign-in to coedit". */
    private async publishNow(): Promise<void> {
        if (this.stopped) return;
        if (this.userID === null) return;
        const payload: PresencePayload = {
            clientID: this.clientID,
            userID: this.userID,
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
        } catch (err) {
            console.error('PresenceTracker publish failed', err);
        }
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
        this.peers.clear();
    }
}
