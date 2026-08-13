/**
 * The pacing of the catch-up replay: when play is pressed from a past
 * position, the evaluator fast-forwards through the recorded history —
 * broadcasting each reaction so the stage visibly replays how the present
 * came to be — and goes live at the edge of history.
 *
 * This exists because the alternative reads as broken: Evaluator.play()
 * snaps to the present invisibly (while in the past it records nothing, so
 * playing forward from there makes no visible progress), and a stage that
 * teleports from a rewound frame to the present gives the creator no account
 * of what happened in between. A true-pace replay would be worse — a minute
 * of history would replay for a minute — so this is a fast-forward: paced
 * per reaction, capped so long histories never hold live play hostage.
 *
 * Kept out of the component the way caption.ts is: the pacing is the part
 * worth testing.
 */

/** ms of fast-forward per recorded reaction: fast enough to read as a replay,
 *  slow enough that individual frames register. */
export const CatchUpMsPerReaction = 40;

/** The most time a catch-up may take, however long the history. */
export const MaxCatchUpMs = 1200;

/** How long fast-forwarding through this many reactions should take. */
export function catchUpDuration(reactions: number): number {
    return Math.min(MaxCatchUpMs, reactions * CatchUpMsPerReaction);
}

/** How many reactions should have been consumed `elapsed` ms into a
 *  `duration`-ms catch-up over `total` reactions. Monotonic, and exactly
 *  `total` once the duration has passed. */
export function reactionsDue(
    total: number,
    elapsed: number,
    duration: number,
): number {
    if (duration <= 0 || elapsed >= duration) return total;
    return Math.floor((elapsed / duration) * total);
}

/** Schedule a callback for the next frame; returns its canceller. Injected so
 *  tests need no browser. */
export type FrameScheduler = (callback: () => void) => () => void;

function realScheduler(callback: () => void): () => void {
    const frame = requestAnimationFrame(callback);
    return () => cancelAnimationFrame(frame);
}

export class CatchUp {
    /** Advance one recorded reaction toward the present. Returns whether the
     *  evaluator is still in the past afterward. */
    private readonly advance: () => boolean;
    /** The present was reached: go live. */
    private readonly live: () => void;
    private readonly schedule: FrameScheduler;
    private readonly now: () => number;

    private cancelFrame: (() => void) | undefined = undefined;
    private started = 0;
    private total = 0;
    private duration = 0;
    private consumed = 0;

    constructor(options: {
        advance: () => boolean;
        live: () => void;
        schedule?: FrameScheduler;
        now?: () => number;
    }) {
        this.advance = options.advance;
        this.live = options.live;
        this.schedule = options.schedule ?? realScheduler;
        this.now = options.now ?? (() => performance.now());
    }

    get running(): boolean {
        return this.cancelFrame !== undefined;
    }

    /** Begin catching up through `total` remaining reactions, cancelling any
     *  catch-up already underway. With nothing to replay, goes live at once. */
    start(total: number) {
        this.cancel();
        if (total <= 0) {
            this.live();
            return;
        }
        this.total = total;
        this.duration = catchUpDuration(total);
        this.consumed = 0;
        this.started = this.now();
        this.cancelFrame = this.schedule(() => this.frame());
    }

    /** Stop without going live — the creator changed their mind (paused,
     *  stepped, reset) before the present was reached. */
    cancel() {
        if (this.cancelFrame !== undefined) {
            this.cancelFrame();
            this.cancelFrame = undefined;
        }
    }

    private frame() {
        this.cancelFrame = undefined;
        const elapsed = this.now() - this.started;
        const due = reactionsDue(this.total, elapsed, this.duration);
        // Consume what the clock says is due. Past the duration, drain
        // unconditionally: the count is an estimate (history can hold fewer
        // hops than counted), and the present — advance() returning false —
        // is the real finish line.
        while (this.consumed < due || elapsed >= this.duration) {
            const stillPast = this.advance();
            this.consumed++;
            if (!stillPast) {
                this.live();
                return;
            }
        }
        this.cancelFrame = this.schedule(() => this.frame());
    }
}
