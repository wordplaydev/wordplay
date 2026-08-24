import { expect, test } from 'vitest';
import { dayKeyIn, nextResetMs } from '../../functions/src/translationDay';

/**
 * The budget's day boundary follows the creator's own midnight, from a time zone
 * the client sends and the server can't verify. What makes that safe is that the
 * stored day only ever moves forward — so these tests pin the two properties the
 * caller relies on: the key sorts lexicographically, and it really does track
 * the zone.
 */

test('the day key sorts lexicographically', () => {
    const earlier = dayKeyIn('UTC', new Date('2026-08-20T12:00:00Z'));
    const later = dayKeyIn('UTC', new Date('2026-09-02T12:00:00Z'));
    expect(earlier).toBe('2026-08-20');
    expect(later > earlier).toBe(true);
});

test('the day key follows the zone', () => {
    // Late evening UTC is already the next day in Auckland and still the same
    // day in Los Angeles.
    const at = new Date('2026-08-20T22:00:00Z');
    expect(dayKeyIn('UTC', at)).toBe('2026-08-20');
    expect(dayKeyIn('Pacific/Auckland', at)).toBe('2026-08-21');
    expect(dayKeyIn('America/Los_Angeles', at)).toBe('2026-08-20');
});

test('an unrecognized zone falls back to UTC rather than throwing', () => {
    const at = new Date('2026-08-20T22:00:00Z');
    expect(dayKeyIn('Not/AZone', at)).toBe('2026-08-20');
    expect(dayKeyIn('', at)).toBe('2026-08-20');
});

test('moving west can only delay a reset, never advance it', () => {
    // The anti-gaming invariant. A creator who claims a zone further west gets
    // a day key no greater than the one they had, so the server's
    // move-forward-only rule keeps their old day and their spent budget.
    const at = new Date('2026-08-20T22:00:00Z');
    const east = dayKeyIn('Pacific/Auckland', at);
    const west = dayKeyIn('America/Los_Angeles', at);
    expect(west <= east).toBe(true);
});

test('the reset is the next midnight in the zone', () => {
    const at = new Date('2026-08-20T22:00:00Z');
    const reset = new Date(nextResetMs('UTC', at));
    expect(reset.toISOString()).toBe('2026-08-21T00:00:00.000Z');
});

test('the reset is right across a daylight saving change', () => {
    // US daylight saving ends 2026-11-01, making that day 25 hours long.
    const at = new Date('2026-11-01T00:00:00-07:00');
    const reset = nextResetMs('America/Los_Angeles', at);
    expect(dayKeyIn('America/Los_Angeles', new Date(reset))).toBe('2026-11-02');
    expect(dayKeyIn('America/Los_Angeles', new Date(reset - 60_000))).toBe(
        '2026-11-01',
    );
});

test('the reset is right in a zone with a fractional offset', () => {
    const at = new Date('2026-08-20T12:00:00Z');
    const reset = nextResetMs('Asia/Kathmandu', at);
    expect(dayKeyIn('Asia/Kathmandu', new Date(reset))).toBe('2026-08-21');
    expect(dayKeyIn('Asia/Kathmandu', new Date(reset - 60_000))).toBe(
        '2026-08-20',
    );
});
