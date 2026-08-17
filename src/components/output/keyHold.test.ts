import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import KeyHold, {
    RepeatDelay,
    RepeatInterval,
    type PointerCapture,
} from './keyHold';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/** A hold that records every press it sends, as `[key, down]` pairs. */
function holder() {
    const events: [string, boolean][] = [];
    const hold = new KeyHold({
        press: (key, down) => {
            events.push([key, down]);
        },
    });
    return { hold, events };
}

/** How many presses (not releases) a key has sent. */
function downs(events: [string, boolean][]) {
    return events.filter(([, down]) => down).length;
}

test('A press and a release send one down and one up', () => {
    const { hold, events } = holder();
    hold.down(1, 'ArrowLeft');
    hold.up(1);
    vi.advanceTimersByTime(5000);
    expect(events).toEqual([
        ['ArrowLeft', true],
        ['ArrowLeft', false],
    ]);
});

test('A held key repeats', () => {
    const { hold, events } = holder();
    hold.down(1, 'ArrowLeft');
    expect(downs(events)).toBe(1);

    vi.advanceTimersByTime(RepeatDelay);
    expect(downs(events)).toBe(2);

    vi.advanceTimersByTime(3 * RepeatInterval);
    expect(downs(events)).toBe(5);
});

test('A pointer up that never arrives stops the repeat', () => {
    // The regression: a system gesture claiming the touch, or an element losing
    // capture, used to leave the repeat chain running forever.
    let captured = true;
    const capture: PointerCapture = { hasPointerCapture: () => captured };
    const { hold, events } = holder();

    hold.down(1, 'ArrowLeft', capture);
    vi.advanceTimersByTime(RepeatDelay + 2 * RepeatInterval);
    expect(downs(events)).toBeGreaterThan(1);

    captured = false;
    const before = downs(events);
    vi.advanceTimersByTime(5000);

    // No extra press after the finger left, and the key reported up.
    expect(downs(events)).toBe(before);
    expect(events[events.length - 1]).toEqual(['ArrowLeft', false]);
    expect(hold.keyFor(1)).toBeUndefined();
});

test('A capture that never took does not stop the repeat', () => {
    // A synthetic event can't capture a pointer, and watchdogging one would
    // kill its repeat on the first tick.
    const { hold, events } = holder();
    hold.down(1, 'ArrowLeft');
    vi.advanceTimersByTime(RepeatDelay + 5 * RepeatInterval);
    expect(downs(events)).toBe(7);
});

test('Releasing everything stops the repeat and reports the key up', () => {
    const { hold, events } = holder();
    hold.down(1, 'ArrowLeft');
    vi.advanceTimersByTime(RepeatDelay + RepeatInterval);

    hold.releaseAll();
    const before = downs(events);
    vi.advanceTimersByTime(5000);

    expect(downs(events)).toBe(before);
    expect(events[events.length - 1]).toEqual(['ArrowLeft', false]);
});

test('Two pointers hold two keys', () => {
    // A chord is how a project is played with two thumbs.
    const { hold, events } = holder();
    hold.down(1, 'ArrowLeft');
    hold.down(2, 'ArrowRight');
    expect(hold.keyFor(1)).toBe('ArrowLeft');
    expect(hold.keyFor(2)).toBe('ArrowRight');

    hold.up(1);
    events.length = 0;
    vi.advanceTimersByTime(RepeatDelay + 2 * RepeatInterval);

    // Only the still-held key repeats.
    expect(events.every(([key, down]) => key === 'ArrowRight' && down)).toBe(
        true,
    );
    expect(events.length).toBeGreaterThan(0);
});

test('A second down on the same pointer releases the first key', () => {
    const { hold, events } = holder();
    hold.down(1, 'ArrowLeft');
    hold.down(1, 'ArrowRight');
    expect(events).toEqual([
        ['ArrowLeft', true],
        ['ArrowLeft', false],
        ['ArrowRight', true],
    ]);

    events.length = 0;
    vi.advanceTimersByTime(RepeatDelay + 2 * RepeatInterval);
    expect(events.every(([key]) => key === 'ArrowRight')).toBe(true);
});
