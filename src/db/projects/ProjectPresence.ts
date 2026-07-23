import { BCTKeys, type BCTKey } from '@output/Color/BasicColors';
import type { RemoteCaret } from './caretEncoding';

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
    /** Caret/selection position within the source, encoded so it
     *  survives concurrent edits — see {@link RemoteCaret}. Text-mode
     *  positions use Yjs RelativePositions (anchored to content, not
     *  integer indices) and node-mode positions use AST Paths (with
     *  nearest-ancestor fallback on the receiver). Both are decoded
     *  against the receiver's local Y.Doc / Source to produce the
     *  current rendering position, not the position the publisher
     *  originally typed. */
    caret: RemoteCaret;
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

/** The chromatic-only palette we draw from for presence colors. The
 *  achromatic three (black/white/gray) are excluded because they're
 *  hard to spot against the editor background. */
const PRESENCE_PALETTE: readonly BCTKey[] = BCTKeys.filter(
    (k) => k !== 'black' && k !== 'white' && k !== 'gray',
);

/**
 * Hash a clientID to its preferred Basic Color Term. Deterministic so
 * a given person keeps the same preferred color across sessions, which
 * is what lets a teacher (or screen reader) recognize them: "the Cyan
 * student" stays Cyan tomorrow as long as no other present collaborator
 * also prefers Cyan.
 *
 * Using the BCT palette specifically (and not, say, an HSL hash) means
 * every color has a translated name in every locale Wordplay supports,
 * so Announcer can speak it correctly.
 *
 * Use {@link assignDistinctColors} when displaying multiple peers — it
 * starts from this preference but guarantees the assigned colors are
 * pairwise distinct within the visible peer set.
 */
export function pickColorForClient(clientID: string): BCTKey {
    let hash = 0;
    for (let i = 0; i < clientID.length; i++)
        hash = (hash * 31 + clientID.charCodeAt(i)) >>> 0;
    return PRESENCE_PALETTE[hash % PRESENCE_PALETTE.length];
}

/**
 * Assign a unique color to every clientID in `clientIDs`, sorted-and-
 * greedy from {@link pickColorForClient} preferences. With the
 * 4-concurrent-editor cap and 8 chromatic colors, every peer is
 * guaranteed a distinct color.
 *
 * # Why local-derivation rather than per-tracker self-assignment
 *
 * If every tracker just hashed its own clientID and published the
 * result, two peers could land on the same color whenever their
 * hashes collide (birthday paradox: ~22% for 4 peers in 8 buckets).
 * Coordinating a unique assignment across replicas in real-time
 * would need a server arbiter — overkill.
 *
 * Instead, *each viewer* recomputes the assignment locally from the
 * union of {its own clientID} ∪ {visible peer clientIDs}, sorted.
 * The sort + greedy traversal is deterministic, so every viewer that
 * sees the same peer set arrives at the same assignment — peer X
 * therefore appears as the same color in every tab, while remaining
 * distinct from every other concurrent peer. Including the local
 * clientID in the sort matters: it reserves the local user's slot so
 * their color (the one others see) doesn't shift around as peers
 * join and leave.
 *
 * # Stability under join/leave
 *
 * When a peer joins, only colors of peers whose preferred matches the
 * newcomer's preferred can shift; everyone else keeps their color.
 * When a peer leaves, no remaining peer changes color (greedy
 * assignment is monotonic on a shrinking set).
 */
export function assignDistinctColors(
    clientIDs: readonly string[],
): Map<string, BCTKey> {
    const sorted = [...clientIDs].sort();
    const assignment = new Map<string, BCTKey>();
    const used = new Set<BCTKey>();

    for (const id of sorted) {
        const preferred = pickColorForClient(id);
        if (!used.has(preferred)) {
            assignment.set(id, preferred);
            used.add(preferred);
            continue;
        }
        // The preferred slot is taken by an earlier-sorted clientID;
        // pick the next palette color that no one else has yet.
        const next = PRESENCE_PALETTE.find((c) => !used.has(c));
        if (next === undefined) {
            // More peers than palette colors — should never happen
            // under the 4-editor cap, but degrade gracefully to the
            // preferred color rather than throwing.
            assignment.set(id, preferred);
            continue;
        }
        assignment.set(id, next);
        used.add(next);
    }
    return assignment;
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
