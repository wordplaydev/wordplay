import { deriveSteppedEvaluation } from '@components/project/Contexts';
import { get, writable } from 'svelte/store';
import { describe, expect, test } from 'vitest';

/** The helper only reads `playing` and `evaluator` identity, and is generic so
 * the skip rule can be exercised without constructing a real Evaluator. */
type FakeContext = { playing: boolean; evaluator: unknown; stepIndex: number };

function harness(initial: FakeContext) {
    const source = writable(initial);
    const stepped = deriveSteppedEvaluation(source);
    const seen: FakeContext[] = [];
    const unsubscribe = stepped.subscribe((context) => seen.push(context));
    return { source, stepped, seen, unsubscribe };
}

describe('deriveSteppedEvaluation', () => {
    test('forwards the initial state', () => {
        const evaluator = {};
        const { seen } = harness({ playing: false, evaluator, stepIndex: 0 });
        expect(seen.length).toBe(1);
        expect(seen[0].stepIndex).toBe(0);
    });

    test('skips consecutive while-playing broadcasts from one evaluator', () => {
        // The ~60 Hz case the helper exists for: values are hidden while
        // playing, so re-broadcasting every frame would re-run every
        // consumer's derived for nothing.
        const evaluator = {};
        const { source, seen } = harness({
            playing: true,
            evaluator,
            stepIndex: 0,
        });
        for (let frame = 1; frame <= 5; frame++)
            source.set({ playing: true, evaluator, stepIndex: frame });
        expect(seen.length).toBe(1);
    });

    test('forwards play/pause flips and steps while paused', () => {
        const evaluator = {};
        const { source, stepped, seen } = harness({
            playing: true,
            evaluator,
            stepIndex: 0,
        });
        source.set({ playing: false, evaluator, stepIndex: 10 });
        source.set({ playing: false, evaluator, stepIndex: 11 });
        source.set({ playing: true, evaluator, stepIndex: 12 });
        expect(seen.map((context) => context.stepIndex)).toEqual([
            0, 10, 11, 12,
        ]);
        expect(get(stepped).stepIndex).toBe(12);
    });

    test('forwards an evaluator replacement even mid-play', () => {
        // A fresh evaluator means a fresh program: consumers must see it even
        // if both broadcasts are while-playing.
        const first = {};
        const second = {};
        const { source, seen } = harness({
            playing: true,
            evaluator: first,
            stepIndex: 0,
        });
        source.set({ playing: true, evaluator: second, stepIndex: 0 });
        expect(seen.length).toBe(2);
        expect(seen[1].evaluator).toBe(second);
    });
});
