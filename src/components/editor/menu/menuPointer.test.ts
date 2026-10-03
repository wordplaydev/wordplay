import { expect, test } from 'vitest';
import { pointerMoved, resetPointer } from './menuPointer.ts';

test('a pointer resting where the menu opened has not moved', () => {
    resetPointer();
    const resting = { clientX: 100, clientY: 200 };
    // The first event only records where it is; the same place again, as the
    // menu scrolls under it, is still not a move.
    expect(pointerMoved(resting)).toBe(false);
    expect(pointerMoved(resting)).toBe(false);
    // A real move is one.
    expect(pointerMoved({ clientX: 101, clientY: 200 })).toBe(true);
    // And a new menu forgets where the last one saw it.
    resetPointer();
    expect(pointerMoved({ clientX: 300, clientY: 300 })).toBe(false);
});
