import { expect, test } from 'vitest';
import retryDelay, { FirstRetryDelay, MaxRetryDelay } from './retryDelay';

test('the first ask back is soon, so a slow first connection recovers quickly', () => {
    expect(retryDelay(0)).toBe(FirstRetryDelay);
});

test('the wait doubles, so a backend that is struggling is not hammered', () => {
    expect(retryDelay(1)).toBe(FirstRetryDelay * 2);
    expect(retryDelay(2)).toBe(FirstRetryDelay * 4);
    expect(retryDelay(3)).toBe(FirstRetryDelay * 8);
});

test('the wait stops growing rather than the asking stopping', () => {
    // Giving up is the defect this exists to fix: a page left open through a
    // tunnel has to come back without a reload.
    expect(retryDelay(20)).toBe(MaxRetryDelay);
    expect(retryDelay(2000)).toBe(MaxRetryDelay);
});

test('a nonsensical attempt count still asks again', () => {
    // Defensive rather than reachable: no caller counts down. Returning NaN
    // here would schedule a timeout that fires immediately, forever.
    expect(retryDelay(-1)).toBe(FirstRetryDelay);
});
