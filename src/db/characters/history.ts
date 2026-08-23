/**
 * The character editor's undo history. Pure and generic so its semantics can be
 * tested directly; the editor is its only caller, like the path helpers beside it.
 *
 * The invariant everything here maintains is that `states[index]` is the state the
 * editor is currently showing. The editor used to record the state *before* a
 * change instead, which was right only for the callers that mutated the shapes in
 * place before recording — for the ones that built a new array (drawing with the
 * keyboard, deleting, pasting, fitting) the first undo jumped two steps back and
 * the newest state could never be reached again.
 */

/** The states recorded so far, and where among them the editor is. */
export type History<State> = {
    readonly states: readonly State[];
    readonly index: number;
};

/** How far back the editor can go, to be conservative about memory. */
export const HistoryLimit = 250;

/** A history holding just the state the editor opened with. */
export function startHistory<State>(state: State): History<State> {
    return { states: [state], index: 0 };
}

/** What the editor is showing, which is what a fresh history starts on. */
export function currentState<State>(
    history: History<State>,
): State | undefined {
    return history.states[history.index];
}

export function canUndo<State>(history: History<State>): boolean {
    return history.index > 0;
}

export function canRedo<State>(history: History<State>): boolean {
    return history.index < history.states.length - 1;
}

/**
 * Record a state the editor has arrived at, dropping any future it had stepped
 * back from. Trimming to the limit moves the index with the window, since dropping
 * the oldest state without doing so silently pointed the index at a different one.
 */
export function record<State>(
    history: History<State>,
    state: State,
): History<State> {
    const kept = history.states.slice(0, history.index + 1);
    const states = [...kept, state];
    const overflow = Math.max(0, states.length - HistoryLimit);
    return {
        states: states.slice(overflow),
        index: states.length - 1 - overflow,
    };
}

/** Step back, or return the history unchanged if there is nothing to step back to. */
export function undo<State>(history: History<State>): History<State> {
    return canUndo(history)
        ? { states: history.states, index: history.index - 1 }
        : history;
}

/** Step forward, or return the history unchanged if there is no future. */
export function redo<State>(history: History<State>): History<State> {
    return canRedo(history)
        ? { states: history.states, index: history.index + 1 }
        : history;
}
