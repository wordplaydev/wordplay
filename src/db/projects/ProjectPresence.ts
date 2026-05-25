import { BCTKeys, type BCTKey } from '@output/BasicColors';
import type { Path } from '@nodes/Root';

/**
 * Payload one collaborator publishes about their current editing position.
 * Stored at `projects/{projectID}/presence/{clientID}`. Updated on a throttle
 * (~150ms) and cleared by a periodic sweep + client-side staleness fade
 * (no RTDB onDisconnect available with our Firestore-only backend).
 */
export type PresencePayload = {
    /** Unique per-device writer (matches the stamp writer ID). */
    clientID: string;
    /** Firebase Auth UID, if signed in. Used to resolve display name + character. */
    userID: string | null;
    /** Source index the user is editing. -1 when not actively in a source. */
    sourceIndex: number;
    /** Caret/selection position. `number` for text-mode character offset,
     *  `Path` array for block-mode node selection, `[start, end]` for a
     *  text-mode range. null when no caret is published yet. */
    caret: number | Path | [number, number] | null;
    /** Basic-color term identifying this collaborator. Same color across
     *  all their sessions; deterministic from clientID hash. */
    color: BCTKey;
    /** Last-seen ms-since-epoch. Used to fade stale peers. */
    lastSeen: number;
};

/** How long a peer's presence remains "live" without a heartbeat before
 *  the UI fades them. 10s is comfortable when the publisher heartbeats
 *  every ~5s. */
export const PRESENCE_STALE_MS = 10_000;

/** Heartbeat interval. Re-publishes presence even when nothing changed,
 *  so peers know we're still here. */
export const PRESENCE_HEARTBEAT_MS = 5_000;

/** Pick a color for this client deterministically from their writer ID,
 *  drawn from the locale-named Basic Color Term palette so Announcer can
 *  read it aloud ("Cyan is editing line 7"). */
export function pickColorForClient(clientID: string): BCTKey {
    // Skip black/white/gray for visibility — the chromatic 8 are easiest
    // to distinguish on a light or dark editor background.
    const chromatic: BCTKey[] = BCTKeys.filter(
        (k) => k !== 'black' && k !== 'white' && k !== 'gray',
    );
    let hash = 0;
    for (let i = 0; i < clientID.length; i++)
        hash = (hash * 31 + clientID.charCodeAt(i)) >>> 0;
    return chromatic[hash % chromatic.length];
}

/** A peer's presence is considered stale (and should be hidden or faded
 *  in the UI) if their `lastSeen` is older than {@link PRESENCE_STALE_MS}. */
export function isPresenceStale(
    payload: PresencePayload,
    now: number = Date.now(),
): boolean {
    return now - payload.lastSeen > PRESENCE_STALE_MS;
}
