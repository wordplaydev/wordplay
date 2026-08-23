import {
    canRedo,
    canUndo,
    currentState,
    HistoryLimit,
    record,
    redo,
    startHistory,
    undo,
    type History,
} from '@db/characters/history';
import { describe, expect, test } from 'vitest';

/** Three edits, the way the editor makes them: each records where it arrived. */
function drawn(): History<string> {
    return ['a', 'ab', 'abc'].reduce(
        (history, state) => record(history, state),
        startHistory(''),
    );
}

describe('stepping back and forward', () => {
    /**
     * The editor recorded the state *before* each change and then pointed the
     * index at it, so the first undo landed two edits back and the newest state
     * was unreachable forever. Undoing one edit has to undo exactly one edit.
     */
    test('one undo goes back exactly one edit', () => {
        expect(currentState(drawn())).toBe('abc');
        expect(currentState(undo(drawn()))).toBe('ab');
        expect(currentState(undo(undo(drawn())))).toBe('a');
    });

    test('redo returns to the state the undo left, not to a copy of an older one', () => {
        expect(currentState(redo(undo(drawn())))).toBe('abc');
    });

    test('the state the editor opened with is the floor', () => {
        const start = startHistory('');
        expect(canUndo(start)).toBe(false);
        expect(currentState(undo(start))).toBe('');
    });

    test('there is nothing to redo until something has been undone', () => {
        expect(canRedo(drawn())).toBe(false);
        expect(canRedo(undo(drawn()))).toBe(true);
    });

    test('recording after stepping back drops the future', () => {
        const branched = record(undo(drawn()), 'abd');
        expect(currentState(branched)).toBe('abd');
        expect(canRedo(branched)).toBe(false);
        expect(currentState(undo(branched))).toBe('ab');
    });
});

describe('the limit', () => {
    /**
     * Dropping the oldest state used to leave the index where it was, which
     * silently pointed it at a different state — so an undo after 250 edits
     * restored something the creator never made.
     */
    test('trimming moves the index with the window', () => {
        const many = Array.from({ length: HistoryLimit + 20 }, (_, i) =>
            i.toString(),
        ).reduce(
            (history, state) => record(history, state),
            startHistory('start'),
        );
        expect(many.states.length).toBe(HistoryLimit);
        expect(currentState(many)).toBe((HistoryLimit + 19).toString());
        expect(currentState(undo(many))).toBe((HistoryLimit + 18).toString());
    });
});
