import { expect, test } from 'vitest';
import { getRandomTransition } from '@output/getRandomTransition';

/** A tiny deterministic linear congruential generator for repeatable tests. */
function seeded(seed: number): () => number {
    let state = seed;
    return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}

const POOL = ['q', 'w', 'e', 'r', 't', 'y'];

test('starts at the start, ends exactly at the end, honors the step count', () => {
    const steps = getRandomTransition('one', 'two', POOL, 12, seeded(1));
    expect(steps.length).toBe(12);
    expect(steps[0]).toBe('one');
    expect(steps.at(-1)).toBe('two');
});

test('cycles only pool or final characters and never blanks', () => {
    const steps = getRandomTransition('abc', 'xyz', POOL, 10, seeded(2));
    for (const step of steps.slice(1, -1)) {
        expect(step.length).toBe(3);
        for (const [index, character] of [...step].entries())
            expect(
                POOL.includes(character) || character === 'xyz'[index],
            ).toBe(true);
    }
});

test('longer new text grows in successively at the end', () => {
    const steps = getRandomTransition('hi', 'hello', POOL, 20, seeded(3));
    // Length never shrinks on the way to a longer text.
    const lengths = steps.map((s) => [...s].length);
    for (let i = 1; i < lengths.length; i++)
        expect(lengths[i]).toBeGreaterThanOrEqual(lengths[i - 1]);
    expect(steps.at(-1)).toBe('hello');
});

test('shorter new text loses surplus positions one at a time', () => {
    const steps = getRandomTransition('hello', 'hi', POOL, 20, seeded(4));
    const lengths = steps.map((s) => [...s].length);
    for (let i = 1; i < lengths.length; i++)
        expect(lengths[i]).toBeLessThanOrEqual(lengths[i - 1]);
    // Never blank when the end is non-empty.
    expect(steps.every((s) => s.length > 0)).toBe(true);
    expect(steps.at(-1)).toBe('hi');
});

test('positions lock in at different times', () => {
    const steps = getRandomTransition(
        'aaaaaaaa',
        'zzzzzzzz',
        POOL,
        30,
        seeded(5),
    );
    // The step at which each position first shows (and keeps) its final
    // character should vary across positions.
    const lockSteps = [...'zzzzzzzz'].map((_, position) => {
        for (let s = steps.length - 1; s > 0; s--)
            if ([...steps[s]][position] !== 'z') return s + 1;
        return 1;
    });
    expect(new Set(lockSteps).size).toBeGreaterThan(1);
});

test('an empty pool locks characters immediately', () => {
    const steps = getRandomTransition('ab', 'cd', [], 8, seeded(6));
    for (const step of steps.slice(1)) expect(step).toBe('cd');
});
