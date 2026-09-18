/**
 * How long to wait before trying a cloud save round again.
 *
 * `persist()`'s connectivity branch says the next round retries the chunk it
 * gave up on, and for a long time nothing scheduled one: a commit that timed
 * out left the work local-only, with the footer reading "unsaved", until the
 * creator edited again, came back online, or signed in afresh. This is the
 * schedule that makes that comment true.
 *
 * Kept out of {@link ProjectsDatabase} and free of imports so it can be read
 * and tested on its own — the same reason `chunkWrites` lives beside it.
 */

/** First retry, far enough out that a stalled backend isn't hammered. */
export const FirstSaveRetryMs = 5_000;

/** Ceiling, so a session left offline settles into a slow poll rather than
 *  drifting to an interval that never comes back. */
export const MaxSaveRetryMs = 60_000;

/**
 * The delay before attempt `attempt` (0 is the first retry after a failed
 * round), doubling to the ceiling. Deliberately no jitter: these are single
 * creators on a classroom connection rather than a fleet stampeding one server,
 * and a predictable schedule is one a person can be told about.
 */
export default function nextSaveRetryDelay(attempt: number): number {
    if (!Number.isFinite(attempt) || attempt < 0) return FirstSaveRetryMs;
    const doubled = FirstSaveRetryMs * Math.pow(2, Math.floor(attempt));
    return Math.min(doubled, MaxSaveRetryMs);
}
