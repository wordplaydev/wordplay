import type HowTo from './HowToDatabase.svelte';
import resolveHowTos from './resolveHowTos';
import { expect, test, vi } from 'vitest';

/** Only identity matters here, so stand-ins beat building real how-tos. */
const one = { id: 'h1' } as unknown as HowTo;
const two = { id: 'h2' } as unknown as HowTo;

/** Never actually wait, so the retry costs the test nothing. */
const wait = () => Promise.resolve();

/** A lookup that answers each id from a queue, so an id can fail and then succeed. */
function answering(answers: Record<string, (HowTo | undefined | false)[]>) {
    return vi.fn((id: string) => {
        const queue = answers[id];
        const next = queue && queue.length > 1 ? queue.shift() : queue?.[0];
        return Promise.resolve(next);
    });
}

test('everything readable comes back, in the order asked for', async () => {
    const result = await resolveHowTos(
        ['h1', 'h2'],
        answering({ h1: [one], h2: [two] }),
        wait,
    );
    expect(result.howTos).toEqual([one, two]);
    expect(result.unreachable).toBe(false);
});

// The #1375 case: a visitor has no listener, so without this the first failed
// read is the last word and the space is permanently empty.
test('a read that failed once is asked again, and succeeds', async () => {
    const lookup = answering({ h1: [false, one] });
    const result = await resolveHowTos(['h1'], lookup, wait);
    expect(result.howTos).toEqual([one]);
    expect(result.unreachable).toBe(false);
    expect(lookup).toHaveBeenCalledTimes(2);
});

test('a how-to that is simply not there is never asked again', async () => {
    const lookup = answering({ h1: [undefined] });
    const result = await resolveHowTos(['h1'], lookup, wait);
    expect(result.howTos).toEqual([]);
    // Absent is an answer, unlike a failed read, so retrying it only costs time.
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(result.unreachable).toBe(false);
});

test('only what failed is retried, not what already resolved', async () => {
    const lookup = answering({ h1: [one], h2: [false, two] });
    const result = await resolveHowTos(['h1', 'h2'], lookup, wait);
    expect(result.howTos).toEqual([one, two]);
    expect(lookup).toHaveBeenCalledWith('h1');
    // Three calls, not four: h1 answered the first time.
    expect(lookup).toHaveBeenCalledTimes(3);
});

test('still unreachable after the retry says so, so the caller can keep what it had', async () => {
    const lookup = answering({ h1: [false] });
    const result = await resolveHowTos(['h1'], lookup, wait);
    expect(result.howTos).toEqual([]);
    expect(result.unreachable).toBe(true);
    // Bounded: the assertion waiting on these tiles allows 30s and each read
    // may spend 8s, so a third attempt would not fit.
    expect(lookup).toHaveBeenCalledTimes(2);
});

test('a partial answer is reported with what is missing', async () => {
    const result = await resolveHowTos(
        ['h1', 'h2'],
        answering({ h1: [one], h2: [false] }),
        wait,
    );
    // Showing the one we could read beats showing nothing.
    expect(result.howTos).toEqual([one]);
    expect(result.unreachable).toBe(true);
});

test('asking for nothing reaches no one and is not unreachable', async () => {
    const lookup = answering({});
    const result = await resolveHowTos([], lookup, wait);
    expect(result.howTos).toEqual([]);
    expect(result.unreachable).toBe(false);
    expect(lookup).not.toHaveBeenCalled();
});
