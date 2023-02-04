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
