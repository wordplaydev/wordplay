import { BCTKeys, type BCTKey } from '@output/BasicColors';
import type { Path } from '@nodes/Root';

/**
 * "Presence" in collaborative editing means: who else is here, where is
 * their caret, and is the connection still alive? Google Docs shows it as
 * the colored cursors and the avatar pills at the top right. We need the
 * same surface so two students editing the same Wordplay project can see
 * each other typing.
 *
 * Presence is fundamentally different from edits:
 *   - An *edit* must be durable and convergent (everyone must end up at
 *     the same final document — that's what the CRDT in ProjectCRDT.ts
 *     does).
 *   - *Presence* is ephemeral. Nobody cares where Alice's caret was five
 *     minutes ago. If Alice closes her tab, her caret should vanish; if
 *     her network drops, others should fade her out within a few seconds.
 *
 * Because presence is ephemeral, we store it in a separate Firestore
 * subcollection (`projects/{id}/presence/{clientID}`) keyed by per-device
 * client ID. Each collaborator overwrites their own doc on a heartbeat
 * and deletes it when they leave. Readers see a live map of who's around.
 *
 * What this file defines:
 *   - The schema of one presence record ({@link PresencePayload}).
 *   - The two timing constants that govern the heartbeat-and-fade loop.
 *   - The color picker that gives each collaborator a stable, named hue
 *     drawn from Wordplay's locale-aware basic-color palette, so screen
 *     readers can announce "Cyan joined" in the user's preferred language.
 *
 * The actual subscribe/publish loop lives in PresenceTracker.svelte.ts.
 */

/**
 * One row in the presence subcollection — the public record of a single
 * collaborator's current editing position. Written by that collaborator's
 * own browser on a throttle; read by every other collaborator's browser
 * via Firestore's onSnapshot listener.
 */
export type PresencePayload = {
    /** Unique per-device writer (same value the stamp layer uses as
     *  `writer` in VectorClock.ts). Used to match a presence record to
     *  the CRDT updates that came from this device. */
    clientID: string;
    /** Firebase Auth UID, if signed in. Used to resolve a display name
     *  and character via Creator.getUsername() so chips match the rest
     *  of the app's creator UI. Anonymous users don't publish presence
     *  at all (they can still subscribe and watch), so this is null only
     *  in historical records we haven't cleaned up yet. */
    userID: string | null;
    /** Index into the project's `sources` array — which source the
     *  caret is in. -1 means "not focused on a source" (the user is
     *  in the project view but hasn't entered an editor). */
    sourceIndex: number;
    /** Caret/selection position within the source. Three shapes — same
     *  as SerializedCaret in ProjectSchemas.ts:
     *    - `number`: a text-mode character offset (most common).
     *    - `Path[]`: a block-mode node selection, by walking the AST
     *      down a sequence of (type, index) hops from the root.
     *    - `[number, number]`: a text-mode selection range.
     *  RemoteCaretOverlay renders a floating caret line only for the
     *  `number` case; the other two get the footer chip but no overlay. */
    caret: number | Path | [number, number] | null;
    /** One of Wordplay's eleven Basic Color Terms (Berlin & Kay 1969).
     *  Deterministic from clientID so the same person keeps the same
     *  color across reloads and devices. The chromatic eight (not
     *  black/white/gray) are picked for visibility on light/dark themes. */
    color: BCTKey;
    /** ms-since-epoch when this record was last written. The
     *  client-side fade ({@link isPresenceStale}) hides peers whose
     *  heartbeat hasn't arrived in {@link PRESENCE_STALE_MS}, so a
     *  collaborator who closed their laptop disappears without us
     *  needing real disconnect semantics from Firestore. */
    lastSeen: number;
};

/**
 * How long we'll keep displaying a peer after their last heartbeat. Set
 * to be ~2× the heartbeat interval so a single dropped publish doesn't
 * make the peer flicker; longer than that risks showing ghost cursors
 * after a tab is closed.
 */
export const PRESENCE_STALE_MS = 10_000;

/**
 * How often a publisher re-writes their presence doc with a fresh
 * `lastSeen`. Without RTDB-style `onDisconnect`, this is how readers
 * know we're still alive: no heartbeat in {@link PRESENCE_STALE_MS}
 * means we've left.
 */
export const PRESENCE_HEARTBEAT_MS = 5_000;

/**
 * Map a clientID to one of the eight chromatic Basic Color Terms (no
 * black/white/gray — those are hard to spot against the editor
 * background). The mapping is deterministic so the same person keeps
 * the same color forever, which is what lets a teacher (or screen
 * reader) recognize them across sessions: "the Cyan student" stays
 * Cyan tomorrow.
 *
 * Using the BCT palette specifically (and not, say, an HSL hash) means
 * every color has a translated name in every locale Wordplay supports,
 * so Announcer can speak it correctly.
 */
export function pickColorForClient(clientID: string): BCTKey {
    const chromatic: BCTKey[] = BCTKeys.filter(
        (k) => k !== 'black' && k !== 'white' && k !== 'gray',
    );
    // Simple hash — distribution across 8 buckets is good enough for the
    // 2–4 collaborators we cap projects at.
    let hash = 0;
    for (let i = 0; i < clientID.length; i++)
        hash = (hash * 31 + clientID.charCodeAt(i)) >>> 0;
    return chromatic[hash % chromatic.length];
}

/** True when this presence record is old enough to hide from the UI.
 *  Used by both the editor footer (which drops stale chips) and the
 *  per-caret overlay (which stops painting stale cursors). */
export function isPresenceStale(
    payload: PresencePayload,
    now: number = Date.now(),
): boolean {
    return now - payload.lastSeen > PRESENCE_STALE_MS;
}
