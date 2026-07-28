import { describe, expect, test } from 'vitest';
import Announcement from './Announcement';
import {
    AnnouncerQueue,
    ECHO_HOLD,
    HOLD_PER_CHARACTER,
    MAX_HOLD,
    MIN_HOLD,
    holdFor,
} from './announcerQueue';

/**
 * A manual timer harness: timers fire only when advance() reaches them,
 * letting tests step the queue deterministically.
 */
function makeHarness() {
    const presented: Announcement[] = [];
    const channels: string[] = [];
    let timers: { at: number; callback: () => void; canceled: boolean }[] = [];
    let clock = 0;
    const queue = new AnnouncerQueue({
        present: (announcement, channel) => {
            presented.push(announcement);
            channels.push(channel);
        },
        setTimer: (callback, ms) => {
            const timer = { at: clock + ms, callback, canceled: false };
            timers.push(timer);
            return () => (timer.canceled = true);
        },
    });
    /** Advance the clock, firing due timers in order. */
    function advance(ms: number) {
        const until = clock + ms;
        for (;;) {
            const due = timers
                .filter((timer) => !timer.canceled && timer.at <= until)
                .sort((a, b) => a.at - b.at)[0];
            if (due === undefined) break;
            clock = due.at;
            timers = timers.filter((timer) => timer !== due);
            due.callback();
        }
        clock = until;
    }
    const texts = () => presented.map((announcement) => announcement.text);
    /** Texts presented in one channel, in order. */
    const textsIn = (channel: 'immediate' | 'paced') =>
        presented
            .filter((_, index) => channels[index] === channel)
            .map((announcement) => announcement.text);
    return { queue, presented, texts, textsIn, advance };
}

describe('echo lane', () => {
    test('presents every character in FIFO order at echo pacing', () => {
        const { queue, texts, advance } = makeHarness();
        queue.announce('type', 'en', 'a');
        queue.announce('type', 'en', 'b');
        queue.announce('type', 'en', 'c');
        advance(ECHO_HOLD * 3);
        expect(texts()).toEqual(['a', 'b', 'c']);
    });

    test('does not dedupe repeated characters', () => {
        const { queue, texts, advance } = makeHarness();
        queue.announce('type', 'en', 'a');
        queue.announce('type', 'en', 'a');
        advance(ECHO_HOLD * 2);
        expect(texts()).toEqual(['a', 'a']);
    });
});

describe('queued lane', () => {
    test('never drops: all rapid announcements present in order', () => {
        const { queue, texts, advance } = makeHarness();
        for (let i = 0; i < 10; i++)
            queue.announce('fold', 'en', `announcement ${i}`);
        advance(MAX_HOLD * 10);
        expect(texts()).toEqual(
            Array.from({ length: 10 }, (_, i) => `announcement ${i}`),
        );
    });

    test('dedupes consecutive duplicates only', () => {
        const { queue, texts, advance } = makeHarness();
        queue.announce('selection', 'en', 'selected A');
        queue.announce('selection', 'en', 'selected A');
        queue.announce('selection', 'en', 'selected B');
        queue.announce('selection', 'en', 'selected A');
        advance(MAX_HOLD * 4);
        expect(texts()).toEqual(['selected A', 'selected B', 'selected A']);
    });
});

describe('coalesce lane', () => {
    test('latest wins within a kind (regression: old queue kept the oldest when >3 backed up)', () => {
        const { queue, texts, advance } = makeHarness();
        // One presents immediately; the rest arrive during its hold.
        for (let i = 0; i < 6; i++) queue.announce('color', 'en', `color ${i}`);
        advance(MAX_HOLD * 2);
        expect(texts()).toEqual(['color 0', 'color 5']);
    });

    test('keeps one slot per kind, presenting the latest of each', () => {
        const { queue, texts, advance } = makeHarness();
        queue.announce('fold', 'en', 'hold the region');
        queue.announce('color', 'en', 'color 1');
        queue.announce('value', 'en', 'value 1');
        queue.announce('color', 'en', 'color 2');
        queue.announce('value', 'en', 'value 2');
        advance(MAX_HOLD * 4);
        expect(texts()).toEqual(['hold the region', 'color 2', 'value 2']);
    });

    test('skips a slot whose text is already presented, without stranding the rest (stranded-queue regression)', () => {
        const { queue, texts, advance } = makeHarness();
        queue.announce('color', 'en', 'same text');
        advance(MAX_HOLD);
        // During the next hold: a redundant coalesce update plus a queued item.
        queue.announce('color', 'en', 'same text');
        queue.announce('fold', 'en', 'folded');
        // No further announce() calls: the timer alone must deliver 'folded'.
        advance(MAX_HOLD * 2);
        expect(texts()).toEqual(['same text', 'folded']);
    });
    test('drops identical text rather than repeating it', () => {
        const { queue, texts, advance } = makeHarness();
        for (let i = 0; i < 3; i++) {
            queue.announce('value', 'en', 'Face');
            advance(MAX_HOLD);
        }
        // Repeating wouldn't be spoken anyway — a screen reader ignores a live
        // region whose text is unchanged. Output announcements say what
        // changed instead (see describeChange.ts).
        expect(texts()).toEqual(['Face']);
    });
});

describe('immediate channel', () => {
    test('stage key echo is spoken at once, never queued behind status', () => {
        const { queue, textsIn } = makeHarness();
        // A long status announcement is speaking; the creator presses keys on
        // the stage. Each key is presented immediately rather than waiting ~2s
        // for the paced region — this is what made echo feel laggy in
        // VoiceOver. (Editor typing no longer flows through here at all: it's
        // echoed natively by the mirrored textarea, #1248.)
        queue.announce('value', 'en', 'a long output description');
        queue.announce('keyinput', 'en', 'a');
        queue.announce('keyinput', 'en', 'b');
        queue.announce('keyinput', 'en', 'c');
        // No clock advance at all: they're already out.
        expect(textsIn('immediate')).toEqual(['a', 'b', 'c']);
    });

    test('the same key pressed twice is heard twice', () => {
        const { queue, textsIn } = makeHarness();
        queue.announce('keyinput', 'en', 'a');
        queue.announce('keyinput', 'en', 'a');
        expect(textsIn('immediate')).toEqual(['a', 'a']);
    });

    test('residual editor echo is paced, not assertive (no chime)', () => {
        const { queue, texts, textsIn, advance } = makeHarness();
        // The `type` kind now carries only echoes that can't route natively
        // (tab insert, single-character node deletions). They must be audible
        // but never on the assertive channel, whose chime #1248 removed.
        queue.announce('type', 'en', 'tab');
        advance(MAX_HOLD);
        expect(textsIn('immediate')).toEqual([]);
        expect(texts()).toEqual(['tab']);
    });

    test('a repeated rejection is heard every time', () => {
        const { queue, textsIn } = makeHarness();
        // Acting three times on read-only code is three failures.
        for (let i = 0; i < 3; i++)
            queue.announce('ignored', 'en', 'read only');
        expect(textsIn('immediate')).toEqual([
            'read only',
            'read only',
            'read only',
        ]);
    });

    test('an unchanged caret position is not repeated', () => {
        const { queue, textsIn } = makeHarness();
        queue.announce('caret', 'en', 'in number');
        queue.announce('caret', 'en', 'in number');
        queue.announce('caret', 'en', 'in text');
        expect(textsIn('immediate')).toEqual(['in number', 'in text']);
    });

    test('immediate speech does not disturb the paced queue', () => {
        const { queue, textsIn, advance } = makeHarness();
        queue.announce('fold', 'en', 'folded');
        queue.announce('command', 'en', 'undone');
        for (const key of ['x', 'y']) queue.announce('keyinput', 'en', key);
        advance(MAX_HOLD * 3);
        // Queued announcements still arrive, in order, undisturbed.
        expect(textsIn('paced')).toEqual(['folded', 'undone']);
        expect(textsIn('immediate')).toEqual(['x', 'y']);
    });
});

describe('lane priority and starvation', () => {
    test('a caret move is spoken at once, without waiting for paced status', () => {
        const { queue, textsIn, advance } = makeHarness();
        // A long status announcement is mid-flight when the creator moves the
        // caret. The caret answers a keystroke, so it can't wait out that hold
        // (up to two seconds) — it goes to the assertive region immediately,
        // while the paced one keeps its own order.
        queue.announce('fold', 'en', 'occupying the paced region');
        queue.announce('caret', 'en', 'between one and two');
        queue.announce('command', 'en', 'undone');
        expect(textsIn('immediate')).toEqual(['between one and two']);
        advance(MAX_HOLD * 4);
        expect(textsIn('paced')).toEqual([
            'occupying the paced region',
            'undone',
        ]);
    });

    test('queued items always drain before coalesce slots (starvation guard)', () => {
        const { queue, texts, advance } = makeHarness();
        queue.announce('color', 'en', 'color 0');
        // A continuous color stream plus one discrete action.
        for (let i = 1; i < 5; i++) queue.announce('color', 'en', `color ${i}`);
        queue.announce('fold', 'en', 'folded');
        advance(MAX_HOLD * 3);
        // The fold presents at the first drain after the current hold,
        // before the pending color slot.
        expect(texts()).toEqual(['color 0', 'folded', 'color 4']);
    });

    test('full priority order: interrupt, then echo, then queued, then coalesce', () => {
        const { queue, texts, advance } = makeHarness();
        queue.announce('value', 'en', 'occupy the region');
        // The interrupt presents immediately; the rest arrive during its
        // hold (after it, so its coalesce-clearing doesn't discard them)
        // and drain echo → queued → coalesce.
        queue.announce('ignored', 'en', 'interrupted');
        queue.announce('color', 'en', 'coalesced');
        queue.announce('fold', 'en', 'queued');
        queue.announce('type', 'en', 'e');
        advance(MAX_HOLD * 5);
        expect(texts()).toEqual([
            'occupy the region',
            'interrupted',
            'e',
            'queued',
            'coalesced',
        ]);
    });
});

describe('interrupt lane', () => {
    test('presents immediately mid-hold, clears coalesce, preserves queued', () => {
        const { queue, texts, advance } = makeHarness();
        queue.announce('value', 'en', 'long value description');
        queue.announce('fold', 'en', 'folded');
        queue.announce('color', 'en', 'stale color');
        // Mid-hold, before the timer fires:
        queue.announce('ignored', 'en', 'cannot edit');
        advance(MAX_HOLD * 3);
        const all = texts();
        expect(all[0]).toBe('long value description');
        expect(all[1]).toBe('cannot edit'); // immediate, not after the hold
        expect(all).toContain('folded'); // queued survived
        expect(all).not.toContain('stale color'); // coalesce cleared
    });

    test('re-presents identical text', () => {
        const { queue, texts, advance } = makeHarness();
        queue.announce('ignored', 'en', 'cannot edit');
        advance(MAX_HOLD);
        queue.announce('ignored', 'en', 'cannot edit');
        advance(MAX_HOLD);
        expect(texts()).toEqual(['cannot edit', 'cannot edit']);
    });
});

describe('pacing', () => {
    test('holds scale per character and clamp to the min and max', () => {
        expect(holdFor(new Announcement('fold', undefined, 'ok'))).toBe(
            MIN_HOLD,
        );
        expect(
            holdFor(new Announcement('fold', undefined, 'x'.repeat(50))),
        ).toBe(50 * HOLD_PER_CHARACTER);
        expect(
            holdFor(new Announcement('fold', undefined, 'x'.repeat(1000))),
        ).toBe(MAX_HOLD);
        expect(holdFor(new Announcement('type', undefined, 'a'))).toBe(
            ECHO_HOLD,
        );
    });
});

describe('stop', () => {
    test('cancels pending work: nothing presents after stop', () => {
        const { queue, texts, advance } = makeHarness();
        queue.announce('fold', 'en', 'first');
        queue.announce('fold', 'en', 'second');
        queue.stop();
        advance(MAX_HOLD * 5);
        expect(texts()).toEqual(['first']);
    });
});
