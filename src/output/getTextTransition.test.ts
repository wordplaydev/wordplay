import { expect, test } from 'vitest';
import {
    getTextTransition,
    getTextTransitionStep,
    getTransitionIndex,
} from '@output/getTextTransition';

/** True if any UTF-16 unit is an unpaired surrogate (renders as tofu). */
function hasLoneSurrogate(s: string): boolean {
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        if (c >= 0xd800 && c <= 0xdbff) {
            const next = s.charCodeAt(i + 1);
            if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
            i++;
        } else if (c >= 0xdc00 && c <= 0xdfff) return true;
    }
    return false;
}

test('Transitions', () => {
    expect(getTextTransition('hello', 'hi').join(' ')).toBe(
        'hello hell hel he h hi',
    );
    // No common prefix: backspace only to one grapheme, never to blank.
    expect(getTextTransition('amy', 'ko').join(' ')).toBe('amy am a k ko');
});

test('never blank unless an endpoint is empty', () => {
    expect(getTextTransition('amy', 'ko')).not.toContain('');
    // An empty endpoint is a legitimate blank.
    expect(getTextTransition('hi', '').at(-1)).toBe('');
    expect(getTextTransition('', 'hi').at(0)).toBe('');
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

test('no step splits an astral emoji into a lone surrogate', () => {
    // 👋 (U+1F44B) and 🖐 (U+1F590) are surrogate pairs; UTF-16 stepping would
    // pass through a lone high surrogate (tofu) between them.
    const steps = getTextTransition('\u{1F44B}', '\u{1F590}');
    for (const s of steps) expect(hasLoneSurrogate(s)).toBe(false);
    expect(steps).not.toContain(''); // never blanks between non-empty texts
    expect(steps.at(-1)).toBe('\u{1F590}');
});

test('transitions between multi-emoji strings stay whole', () => {
    const steps = getTextTransition('\u{1F44B}\u{1F590}', '\u{1F44B}\u{270B}');
    for (const s of steps) expect(hasLoneSurrogate(s)).toBe(false);
    // The shared leading 👋 grapheme is never backspaced.
    for (const s of steps) expect(s.startsWith('\u{1F44B}')).toBe(true);
});

test('keeps a skin-tone grapheme intact rather than flashing the bare base', () => {
    // 👍🏽 is base + skin-tone modifier: two codepoints, one grapheme.
    const steps = getTextTransition('\u{1F44D}\u{1F3FD}', '\u{2764}');
    for (const s of steps) expect(hasLoneSurrogate(s)).toBe(false);
    // Never the bare base 👍 without its modifier.
    expect(steps).not.toContain('\u{1F44D}');
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
