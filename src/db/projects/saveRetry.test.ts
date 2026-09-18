import { expect, test } from 'vitest';
import nextSaveRetryDelay, {
    FirstSaveRetryMs,
    MaxSaveRetryMs,
} from './saveRetry';

test('the first retry waits the base delay', () => {
    expect(nextSaveRetryDelay(0)).toBe(FirstSaveRetryMs);
});

test('each attempt waits twice as long, up to the ceiling', () => {
    expect(nextSaveRetryDelay(1)).toBe(FirstSaveRetryMs * 2);
    expect(nextSaveRetryDelay(2)).toBe(FirstSaveRetryMs * 4);
    expect(nextSaveRetryDelay(3)).toBe(FirstSaveRetryMs * 8);
});

test('a long outage settles at the ceiling rather than growing', () => {
    for (const attempt of [4, 10, 100, 1000])
        expect(nextSaveRetryDelay(attempt)).toBe(MaxSaveRetryMs);
});

test('the schedule never returns something unusable', () => {
    // A counter that was never reset, or one that overflowed, must not become a
    // timer that never fires — the failure mode this whole module exists to fix.
    for (const attempt of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
        const delay = nextSaveRetryDelay(attempt);
        expect(Number.isFinite(delay)).toBe(true);
        expect(delay).toBeGreaterThanOrEqual(FirstSaveRetryMs);
        expect(delay).toBeLessThanOrEqual(MaxSaveRetryMs);
    }
});
