/**
 * How long what was said stays on screen after the voice stops.
 *
 * *What* is said isn't decided here at all — `speech.ts` holds the one utterance
 * the platform was handed, and the caption renders that — so this module answers
 * only the question a viewer's eyes ask that their ears don't: how long do the
 * words linger? Kept out of the component the way `announcerQueue.ts` is kept
 * out of `Announcer.svelte`, because the timing is the part worth testing and a
 * component is the part that isn't.
 */

/**
 * How long a caption stays after the voice stops.
 *
 * Fixed, unlike `announcerQueue`'s reading-time `holdFor`: that hold *is* the
 * presentation time, while this one only follows a caption that has already been
 * on screen for as long as it took to speak — and synthesis is slower than
 * silent reading, so a long line has already had a long look. This is just the
 * beat that keeps the last words from vanishing on the final syllable.
 */
export const CaptionHoldTime = 3000;

/** Start a timer; returns its canceller. Injected so tests need no clock. */
export type CaptionTimer = (callback: () => void, ms: number) => () => void;

function realTimer(callback: () => void, ms: number): () => void {
    const timer = setTimeout(callback, ms);
    return () => clearTimeout(timer);
}

export class CaptionHold {
    private readonly show: (text: string | undefined) => void;
    private readonly setTimer: CaptionTimer;
    /** What the caption is showing, or undefined when it is empty. */
    private shown: string | undefined = undefined;
    private cancelHold: (() => void) | undefined = undefined;

    constructor(options: {
        show: (text: string | undefined) => void;
        setTimer?: CaptionTimer;
    }) {
        this.show = options.show;
        this.setTimer = options.setTimer ?? realTimer;
    }

    /** The words being spoken now, or undefined once the voice has stopped. */
    speaking(text: string | undefined) {
        if (text !== undefined) {
            // A new line overrides whatever is being held: the caption says what
            // is being said now, not what was said a moment ago.
            this.clear();
            // Re-showing identical text would restart the fade, so the same
            // sentence said twice in a row would blink rather than stay put.
            if (text !== this.shown) {
                this.shown = text;
                this.show(text);
            }
            return;
        }

        // The voice stopped, however it stopped — finished, cancelled by a
        // pause, or cut off by another source taking the one voice. All three
        // ended what was being said, so all three start the same hold. The
        // second guard keeps a repeated "nothing is speaking" from restarting a
        // hold that is already running, which would extend it indefinitely.
        if (this.shown === undefined || this.cancelHold !== undefined) return;
        this.cancelHold = this.setTimer(() => {
            this.cancelHold = undefined;
            this.shown = undefined;
            this.show(undefined);
        }, CaptionHoldTime);
    }

    /**
     * Drop a pending hold, for the view's teardown. Deliberately doesn't clear
     * the caption — there is no longer a caption to clear, and calling back into
     * a destroyed component would be the bug this prevents.
     */
    stop() {
        this.clear();
        this.shown = undefined;
    }

    private clear() {
        if (this.cancelHold !== undefined) {
            this.cancelHold();
            this.cancelHold = undefined;
        }
    }
}
