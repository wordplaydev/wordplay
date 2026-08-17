/**
 * The press-and-hold behavior behind the on-screen key pad: a held key repeats
 * the way a physical keyboard's auto-repeat does, since `Placement` steps once
 * per event and continuous movement is what a project is played with.
 *
 * It lives outside the component with an injectable timer because the case that
 * matters has no DOM surface to test through: a pointer up the browser never
 * delivers. A system edge gesture can claim the touch (the two-thumb layout
 * puts keys on the screen's edges), the element can lose capture, the app can
 * be switched away — and any of those used to leave the key repeating forever,
 * until the same pointer id happened to come back.
 */

/** Close enough to a physical keyboard's auto-repeat to feel like one. */
export const RepeatDelay = 400;
export const RepeatInterval = 66;

/** Only what the watchdog needs of the capturing element, so a test can hand in
 *  an object instead of a DOM node. An `HTMLElement` satisfies it structurally. */
export type PointerCapture = {
    hasPointerCapture: (pointerId: number) => boolean;
};

type Holding = {
    key: string;
    /** Cancels whichever repeat is currently scheduled for this hold. */
    cancel: () => void;
    /** Set only when capture really took at pointer down; a synthetic event
     *  never captures, and watchdogging one would kill its repeat instantly. */
    capture: PointerCapture | undefined;
};

export default class KeyHold {
    private readonly press: (key: string, down: boolean) => void;
    private readonly setTimer: (callback: () => void, ms: number) => () => void;
    private readonly delay: number;
    private readonly interval: number;

    /** What each pointer holds, so several fingers can hold several keys — a
     *  chord is how a project is played with two thumbs. */
    private readonly held = new Map<number, Holding>();

    constructor(options: {
        press: (key: string, down: boolean) => void;
        setTimer?: (callback: () => void, ms: number) => () => void;
        delay?: number;
        interval?: number;
    }) {
        this.press = options.press;
        this.setTimer =
            options.setTimer ??
            ((callback, ms) => {
                const timer = setTimeout(callback, ms);
                return () => clearTimeout(timer);
            });
        this.delay = options.delay ?? RepeatDelay;
        this.interval = options.interval ?? RepeatInterval;
    }

    down(pointer: number, key: string, capture?: PointerCapture) {
        // A second down on the same pointer without an up can only mean the up
        // was lost, so let go of the old key rather than leave it repeating.
        this.up(pointer);
        this.press(key, true);

        const holding: Holding = { key, capture, cancel: () => {} };
        const repeat = () => {
            // A newer down on this pointer owns the map now; this chain is dead.
            if (this.held.get(pointer) !== holding) return;
            // The finger is gone if the element no longer holds its capture:
            // the backstop for an up the browser never delivered. Checked
            // before pressing, so a departed pointer sends no extra press.
            if (capture !== undefined && !capture.hasPointerCapture(pointer))
                return this.up(pointer);
            this.press(key, true);
            holding.cancel = this.setTimer(repeat, this.interval);
        };

        // Registered before scheduling, so the first repeat can find itself.
        this.held.set(pointer, holding);
        holding.cancel = this.setTimer(repeat, this.delay);
    }

    up(pointer: number) {
        const holding = this.held.get(pointer);
        if (holding === undefined) return;
        // Removed before the release, so anything the release reenters sees
        // this pointer as free rather than still holding a key.
        this.held.delete(pointer);
        holding.cancel();
        this.press(holding.key, false);
    }

    /** Release every held key — an unmount, a hidden page, a lost pointer. */
    releaseAll() {
        for (const pointer of Array.from(this.held.keys())) this.up(pointer);
    }

    /** Which key a pointer is holding, if any. */
    keyFor(pointer: number): string | undefined {
        return this.held.get(pointer)?.key;
    }
}
