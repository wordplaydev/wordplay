import {
    captionFor,
    CaptionHold,
    CaptionHoldTime,
} from '@components/output/caption';
import { SaySource } from '@output/Speech/speech';
import { describe, expect, test } from 'vitest';

/** A manual clock, so the hold's timing is asserted rather than waited out. */
function harness() {
    const shown: (string | undefined)[] = [];
    let pending: { callback: () => void; ms: number } | undefined = undefined;
    const hold = new CaptionHold({
        show: (text) => shown.push(text),
        setTimer: (callback, ms) => {
            pending = { callback, ms };
            return () => {
                pending = undefined;
            };
        },
    });
    return {
        hold,
        shown,
        /** Whether a hold is currently running, and for how long. */
        get waiting() {
            return pending;
        },
        elapse() {
            const running = pending;
            pending = undefined;
            running?.callback();
        },
    };
}

describe('showing what is said', () => {
    test('what is being spoken is shown at once', () => {
        const { hold, shown } = harness();
        hold.speaking('hello');
        expect(shown).toEqual(['hello']);
    });

    test('the same line arriving again does not re-show it', () => {
        // Re-showing identical text would restart the fade, so a program that
        // says the same word on every key press would blink rather than hold.
        const { hold, shown } = harness();
        hold.speaking('hello');
        hold.speaking('hello');
        expect(shown).toEqual(['hello']);
    });

    test('a new line replaces a held one immediately', () => {
        const harnessed = harness();
        harnessed.hold.speaking('first');
        harnessed.hold.speaking(undefined);
        harnessed.hold.speaking('second');
        expect(harnessed.shown).toEqual(['first', 'second']);
    });

    test('a new line cancels the pending hold', () => {
        const harnessed = harness();
        harnessed.hold.speaking('first');
        harnessed.hold.speaking(undefined);
        expect(harnessed.waiting).not.toBeUndefined();
        harnessed.hold.speaking('second');
        expect(harnessed.waiting).toBeUndefined();
    });
});

describe('lingering after the voice stops', () => {
    test('the caption outlives the voice by the hold time, then clears', () => {
        const harnessed = harness();
        harnessed.hold.speaking('hello');
        harnessed.hold.speaking(undefined);

        // Still up: the words have to survive their own final syllable.
        expect(harnessed.shown).toEqual(['hello']);
        expect(harnessed.waiting?.ms).toBe(CaptionHoldTime);

        harnessed.elapse();
        expect(harnessed.shown).toEqual(['hello', undefined]);
    });

    test('the voice stopping twice does not restart the hold', () => {
        // Another source taking and releasing the one voice reports "nothing is
        // speaking" more than once; restarting on each would extend the caption
        // indefinitely.
        const harnessed = harness();
        harnessed.hold.speaking('hello');
        harnessed.hold.speaking(undefined);
        const first = harnessed.waiting;
        harnessed.hold.speaking(undefined);
        expect(harnessed.waiting).toBe(first);
    });

    test('nothing spoken at all never schedules a hold', () => {
        const harnessed = harness();
        harnessed.hold.speaking(undefined);
        expect(harnessed.waiting).toBeUndefined();
        expect(harnessed.shown).toEqual([]);
    });

    test('the same line starting again during the hold keeps it up', () => {
        const harnessed = harness();
        harnessed.hold.speaking('hello');
        harnessed.hold.speaking(undefined);
        harnessed.hold.speaking('hello');
        // No blink: no second show, and no hold left to clear it.
        expect(harnessed.shown).toEqual(['hello']);
        expect(harnessed.waiting).toBeUndefined();
    });
});

describe('teardown', () => {
    test('stop cancels a pending hold and shows nothing afterward', () => {
        const harnessed = harness();
        harnessed.hold.speaking('hello');
        harnessed.hold.speaking(undefined);
        harnessed.hold.stop();
        expect(harnessed.waiting).toBeUndefined();
        expect(harnessed.shown).toEqual(['hello']);
    });

    test('after stop, a later line is treated as new', () => {
        const harnessed = harness();
        harnessed.hold.speaking('hello');
        harnessed.hold.stop();
        harnessed.hold.speaking('hello');
        expect(harnessed.shown).toEqual(['hello', 'hello']);
    });
});

describe('deciding what to caption', () => {
    test('a Say on stage is captioned', () => {
        expect(
            captionFor({ source: SaySource, text: 'hello', captioned: true }),
        ).toBe('hello');
    });

    test("a speech bubble's Say is not captioned", () => {
        // The bubble already shows these words attached to the speaker, so a
        // floor caption of them would put the same line on screen twice.
        expect(
            captionFor({ source: SaySource, text: 'hello', captioned: false }),
        ).toBeUndefined();
    });

    test('another source holding the voice captions nothing', () => {
        expect(
            captionFor({ source: 'music:song', text: 'la', captioned: true }),
        ).toBeUndefined();
    });

    test('silence captions nothing', () => {
        expect(captionFor(undefined)).toBeUndefined();
    });
});
