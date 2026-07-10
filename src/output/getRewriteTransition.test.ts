import { expect, test } from 'vitest';
import { getRewriteTransition } from '@output/getRewriteTransition';

/** A tiny deterministic linear congruential generator for repeatable tests. */
function seeded(seed: number): () => number {
    let state = seed;
    return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}

test('starts at the (padded) start and ends exactly at the end', () => {
    const steps = getRewriteTransition('hi', 'hello', seeded(1));
    expect(steps[0]).toBe('hi   ');
    expect(steps.at(-1)).toBe('hello');
    // One replacement per step over the longer text.
    expect(steps.length).toBe(6);
});

test('shrinks to a shorter text by clearing surplus positions', () => {
    const steps = getRewriteTransition('hello', 'hi', seeded(2));
    expect(steps[0]).toBe('hello');
    expect(steps.at(-1)).toBe('hi');
    expect(steps.length).toBe(6);
    // Never blank when the end is non-empty.
    expect(steps.every((s) => s.length > 0)).toBe(true);
});

test('every intermediate step mixes only old, new, and placeholder characters', () => {
    const steps = getRewriteTransition('abc', 'xyz', seeded(3));
    for (const step of steps)
        for (const character of step)
            expect('abcxyz '.includes(character)).toBe(true);
});

test('keeps graphemes whole', () => {
    // 👍🏽 is two codepoints, one grapheme: it must be replaced atomically.
    const steps = getRewriteTransition('\u{1F44D}\u{1F3FD}a', 'no', seeded(4));
    for (const step of steps)
        expect(step.includes('\u{1F44D}') && !step.includes('\u{1F3FD}')).toBe(
            false,
        );
    expect(steps.at(-1)).toBe('no');
});

test('empty endpoints stay legitimate', () => {
    expect(getRewriteTransition('', 'ab', seeded(5)).at(-1)).toBe('ab');
    expect(getRewriteTransition('ab', '', seeded(6)).at(-1)).toBe('');
});
