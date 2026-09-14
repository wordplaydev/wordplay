import { expect, test } from 'vitest';
import { hasEnded, minutesLeft } from './proxySession';

/**
 * The arithmetic behind the countdown on a read-only session (#1313).
 *
 * Tested here rather than in a browser for the obvious reason: the session
 * lasts an hour. Tested at all because the first version of this feature
 * displayed a number that nothing computed twice and nothing enforced, which is
 * worse than displaying none.
 */
const until = 1_000 * 60 * 60; // an hour, in a clock that starts at zero

test.each([
    ['a fresh session', 0, 60],
    ['a minute in', 60_000, 59],
    // Rounded up, so the number only reaches zero when the session has. A
    // session with forty seconds left is still working, and saying "0 minutes
    // left" while it works is the same lie in miniature.
    ['forty seconds left', until - 40_000, 1],
    ['one second left', until - 1_000, 1],
    ['exactly out', until, 0],
    ['long past', until + 10 * 60_000, 0],
])('%s', (_, now, expected) => {
    expect(minutesLeft(until, now)).toBe(expected);
});

test('a session ends exactly when it runs out, and stays ended', () => {
    expect(hasEnded(until, until - 1)).toBe(false);
    expect(hasEnded(until, until)).toBe(true);
    expect(hasEnded(until, until + 60_000)).toBe(true);
});

test('the two agree about the moment it ends', () => {
    // A countdown that reads zero while the session still works, or one that
    // reads a minute after it has stopped, is the bug this feature already had.
    for (const now of [0, 30_000, until - 1, until, until + 1])
        expect(minutesLeft(until, now) === 0).toBe(hasEnded(until, now));
});
