import { expect, test } from 'vitest';
import {
    getTextTransition,
    getTextTransitionStep,
    getTransitionIndex,
} from '@output/getTextTransition';

test('Transitions', () => {
    expect(getTextTransition('hello', 'hi').join(' ')).toBe(
        'hello hell hel he h hi',
    );
    expect(getTextTransition('amy', 'ko').join(' ')).toBe('amy am a  k ko');
});

test('Transition step indexing', () => {
    const steps = getTextTransition('hello', 'hi'); // hello hell hel he h hi (6 steps)
    // Endpoints map to the first and last steps.
    expect(getTextTransitionStep(steps, 0)).toBe('hello');
    expect(getTextTransitionStep(steps, 1)).toBe('hi');
    // Progress maps evenly across the steps (0.5 * 5 = 2.5, rounds to index 3).
    expect(getTextTransitionStep(steps, 0.5)).toBe('he');
    // Out-of-range progress clamps to the bounds.
    expect(getTextTransitionStep(steps, -1)).toBe('hello');
    expect(getTextTransitionStep(steps, 2)).toBe('hi');
    // Empty input yields the empty string.
    expect(getTextTransitionStep([], 0.5)).toBe('');
});

test('getTransitionIndex maps progress to a clamped index', () => {
    // 6 steps → indices 0..5.
    expect(getTransitionIndex(6, 0)).toBe(0);
    expect(getTransitionIndex(6, 1)).toBe(5);
    expect(getTransitionIndex(6, 0.5)).toBe(3); // round(0.5 * 5) = round(2.5) = 3
    // Out-of-range progress clamps.
    expect(getTransitionIndex(6, -1)).toBe(0);
    expect(getTransitionIndex(6, 2)).toBe(5);
    // Empty transition has no index.
    expect(getTransitionIndex(0, 0.5)).toBe(-1);
});
