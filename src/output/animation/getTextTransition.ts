// Segment by grapheme so the typewriter morph never splits a character: astral
// emoji (👋 🖐 …) are UTF-16 surrogate pairs, and stepping by code units emits a
// lone surrogate that renders as tofu (□) on every transition; stepping by
// codepoints would instead flash a partial emoji (base without its ZWJ/skin-tone
// members). Grapheme boundaries are locale-independent, so one instance suffices.
const Segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

export function graphemes(text: string): string[] {
    return Array.from(Segmenter.segment(text), (s) => s.segment);
}

export function getTextTransition(start: string, end: string): string[] {
    const from = graphemes(start);
    const to = graphemes(end);

    // Longest common leading run of whole graphemes.
    let common = 0;
    while (
        common < from.length &&
        common < to.length &&
        from[common] === to[common]
    )
        common++;

    const steps: string[] = [start];
    // Backspace whole graphemes down to the common prefix, then insert whole
    // graphemes up to the end — every step is a valid, fully-formed string.
    // When the texts share no prefix, backspace only to one grapheme and jump
    // to the first grapheme of the new text, so the text never blanks out
    // mid-transition; erasing to nothing remains correct when either endpoint
    // is itself empty.
    const floor = common === 0 && from.length > 0 && to.length > 0 ? 1 : common;
    for (let i = from.length - 1; i >= floor; i--)
        steps.push(from.slice(0, i).join(''));
    for (let i = common + 1; i <= to.length; i++)
        steps.push(to.slice(0, i).join(''));

    return steps;
}

/**
 * Map a progress from 0 to 1 to an index into a transition with `length` steps.
 * Progress is spread evenly across the steps and clamped to the bounds, so 0
 * yields the first index and 1 the last. Returns -1 for an empty transition.
 * Shared by the plain-text and Markup steppers so both index identically.
 */
export function getTransitionIndex(length: number, progress: number): number {
    if (length === 0) return -1;
    return Math.max(
        0,
        Math.min(Math.round(progress * (length - 1)), length - 1),
    );
}

/**
 * Given the steps from getTextTransition and a progress from 0 to 1, return the
 * step that should be displayed. Progress is mapped evenly across the steps and
 * clamped to the bounds, so 0 yields the first step and 1 the last.
 */
export function getTextTransitionStep(
    steps: string[],
    progress: number,
): string {
    const index = getTransitionIndex(steps.length, progress);
    return index < 0 ? '' : steps[index];
}
