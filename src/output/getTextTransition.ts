export function getTextTransition(start: string, end: string): string[] {
    const steps: string[] = [start];

    // Backspace until reaching a common prefix
    let state = start;
    while (!end.startsWith(state)) {
        state = state.substring(0, state.length - 1);
        steps.push(state);
    }

    // Insert until reaching the end
    while (state !== end) {
        state = state + end.charAt(state.length);
        steps.push(state);
    }

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
