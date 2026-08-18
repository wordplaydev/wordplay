import type { MusicData } from './musicData';

/** One evaluation's music, as it stood when that evaluation finished. */
export type Snapshot = { stepNumber: number; musics: MusicData[] };

/**
 * How many missed evaluations are worth delivering. Restarts of one name collapse
 * (see below), and `MAX_REACTION_CHAIN` bounds a synchronous chain at 32, so this
 * only ever drops snapshots that could not have been heard anyway.
 */
export const DefaultReplayLimit = 8;

/**
 * Which of the evaluations a view missed still need to reach the music player.
 *
 * `replay` is a command that is true on exactly one evaluation, but a view sees
 * one value per rendered frame and several evaluations can happen in one browser
 * task. The missed ones are recovered from the evaluator's source-value history
 * and passed here to decide which are worth delivering.
 *
 * Only snapshots carrying a `replay` matter. Everything else about a music is
 * content, and content is already correct in the latest snapshot the view holds —
 * delivering an intermediate one would at best change nothing and at worst splice
 * a stale edit over a current one.
 *
 * Dropping the oldest when there are more than `limit` is lossless rather than
 * merely tolerable: consecutive restarts of one name cancel each other's voices
 * before any of them schedules a note, so only the last of a burst was ever going
 * to be audible.
 *
 * A snapshot the history has already trimmed away simply isn't in `missed`, which
 * is why this can only ever fail toward silence — the behavior before catch-up
 * existed — and never toward sounding the wrong music.
 *
 * Only `Music` needs this. `Say` decides what to speak by diffing text against
 * what it last spoke, and the stage's announcements are deliberately paced to
 * what a screen-reader user can follow; for both, an intermediate state that came
 * and went inside one frame is correctly not acted on.
 */
export function missedReplays(
    missed: readonly Snapshot[],
    limit: number = DefaultReplayLimit,
): Snapshot[] {
    const replaying = missed.filter((snapshot) =>
        snapshot.musics.some((music) => music.replay),
    );
    return limit >= 0 && replaying.length > limit
        ? replaying.slice(replaying.length - limit)
        : replaying;
}
