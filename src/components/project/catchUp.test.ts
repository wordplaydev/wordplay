import {
    CatchUp,
    CatchUpMsPerReaction,
    catchUpDuration,
    MaxCatchUpMs,
    reactionsDue,
} from '@components/project/catchUp';
import { describe, expect, test } from 'vitest';

describe('pacing', () => {
    test('duration scales per reaction and caps', () => {
        expect(catchUpDuration(1)).toBe(CatchUpMsPerReaction);
        expect(catchUpDuration(10)).toBe(10 * CatchUpMsPerReaction);
        // A long history never holds live play hostage.
        expect(catchUpDuration(100000)).toBe(MaxCatchUpMs);
    });

    test('reactions come due proportionally and finish exactly', () => {
        expect(reactionsDue(10, 0, 400)).toBe(0);
        expect(reactionsDue(10, 200, 400)).toBe(5);
        expect(reactionsDue(10, 400, 400)).toBe(10);
        expect(reactionsDue(10, 4000, 400)).toBe(10);
    });
});

/** A harness with a hand-cranked clock and frame queue, and a history that is
 *  `depth` reactions from the present. */
function harness(depth: number) {
    let time = 0;
    let pending: (() => void) | undefined;
    let remaining = depth;
    const advanced: number[] = [];
    let liveCount = 0;

    const catchUp = new CatchUp({
        advance: () => {
            remaining--;
            advanced.push(remaining);
            return remaining > 0;
        },
        live: () => liveCount++,
        now: () => time,
        schedule: (callback) => {
            pending = callback;
            return () => (pending = undefined);
        },
    });

    return {
        catchUp,
        /** Advance the clock and run the scheduled frame, if any. */
        tick(ms: number) {
            time += ms;
            const frame = pending;
            pending = undefined;
            frame?.();
        },
        get advancedCount() {
            return advanced.length;
        },
        get liveCount() {
            return liveCount;
        },
        get frameScheduled() {
            return pending !== undefined;
        },
    };
}

describe('CatchUp', () => {
    test('nothing to replay goes live at once, with no frames', () => {
        const h = harness(0);
        h.catchUp.start(0);
        expect(h.liveCount).toBe(1);
        expect(h.frameScheduled).toBe(false);
    });

    test('advances proportionally with the clock, then goes live', () => {
        // 10 reactions → 400ms. Frames every 100ms consume 2-3 at a time.
        const h = harness(10);
        h.catchUp.start(10);
        h.tick(100);
        expect(h.advancedCount).toBe(2);
        h.tick(100);
        expect(h.advancedCount).toBe(5);
        expect(h.liveCount).toBe(0);
        h.tick(100);
        h.tick(100);
        expect(h.liveCount).toBe(1);
        expect(h.catchUp.running).toBe(false);
    });

    test('a stalled frame drains the rest at the duration', () => {
        // One long frame gap past the whole duration: everything comes due.
        const h = harness(10);
        h.catchUp.start(10);
        h.tick(5000);
        expect(h.liveCount).toBe(1);
    });

    test('the present, not the count, is the finish line', () => {
        // The history holds fewer hops than counted (the last hop jumps to
        // the end); live fires as soon as advance says the past is over.
        const h = harness(3);
        h.catchUp.start(10);
        h.tick(5000);
        expect(h.advancedCount).toBe(3);
        expect(h.liveCount).toBe(1);
    });

    test('cancel stops the replay without going live', () => {
        const h = harness(10);
        h.catchUp.start(10);
        h.tick(100);
        h.catchUp.cancel();
        expect(h.catchUp.running).toBe(false);
        h.tick(1000);
        expect(h.liveCount).toBe(0);
        expect(h.advancedCount).toBe(2);
    });

    test('restarting cancels the prior replay', () => {
        const h = harness(20);
        h.catchUp.start(10);
        h.tick(100);
        const before = h.advancedCount;
        h.catchUp.start(10);
        h.tick(5000);
        // One live from the second run only.
        expect(h.liveCount).toBe(1);
        expect(h.advancedCount).toBeGreaterThan(before);
    });
});
