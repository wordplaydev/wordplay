import { describe, expect, test } from 'vitest';
import caretBoundaryKey, { caretBoundarySelection } from './caretKeys';

const plain = { metaKey: false, ctrlKey: false, altKey: false };

describe('caretBoundaryKey', () => {
    test('claims unmodified Home and End', () => {
        expect(caretBoundaryKey({ key: 'Home', ...plain })).toBe('start');
        expect(caretBoundaryKey({ key: 'End', ...plain })).toBe('end');
    });

    test('leaves the macOS caret idioms alone', () => {
        // ⌘← / ⌘→ and ⌥← / ⌥→ must keep working natively.
        expect(
            caretBoundaryKey({ key: 'Home', ...plain, metaKey: true }),
        ).toBeUndefined();
        expect(
            caretBoundaryKey({ key: 'End', ...plain, altKey: true }),
        ).toBeUndefined();
        expect(
            caretBoundaryKey({ key: 'Home', ...plain, ctrlKey: true }),
        ).toBeUndefined();
    });

    test('leaves every other key alone', () => {
        for (const key of ['ArrowLeft', 'PageUp', 'a', 'Enter'])
            expect(caretBoundaryKey({ key, ...plain })).toBeUndefined();
    });
});

describe('caretBoundarySelection', () => {
    const one = 'hello world'; // 11 characters, no newlines
    const many = 'one\ntwo\nthree'; // lines at 0-3, 4-7, 8-13

    test('collapses the caret at the boundary', () => {
        expect(caretBoundarySelection('start', false, 4, 4, one)).toEqual({
            start: 0,
            end: 0,
        });
        expect(caretBoundarySelection('end', false, 4, 4, one)).toEqual({
            start: 11,
            end: 11,
        });
    });

    test('extends to the boundary when shift is held', () => {
        expect(caretBoundarySelection('start', true, 4, 4, one)).toEqual({
            start: 0,
            end: 4,
        });
        expect(caretBoundarySelection('end', true, 4, 4, one)).toEqual({
            start: 4,
            end: 11,
        });
    });

    test('extends from the far end of an existing selection', () => {
        // Selection 3..7; Shift+Home keeps 7 as the anchor.
        expect(caretBoundarySelection('start', true, 3, 7, one)).toEqual({
            start: 0,
            end: 7,
        });
        // …and Shift+End keeps 3.
        expect(caretBoundarySelection('end', true, 3, 7, one)).toEqual({
            start: 3,
            end: 11,
        });
    });

    test('is a no-op at an empty field', () => {
        expect(caretBoundarySelection('end', false, 0, 0, '')).toEqual({
            start: 0,
            end: 0,
        });
    });

    test('stops at the line, not the field, in a multi-line box', () => {
        // Caret in the middle of 'two'.
        expect(caretBoundarySelection('start', false, 5, 5, many)).toEqual({
            start: 4,
            end: 4,
        });
        expect(caretBoundarySelection('end', false, 5, 5, many)).toEqual({
            start: 7,
            end: 7,
        });
    });

    test('handles the first and last lines of a multi-line box', () => {
        expect(caretBoundarySelection('start', false, 0, 0, many).start).toBe(
            0,
        );
        expect(caretBoundarySelection('end', false, 9, 9, many).end).toBe(13);
    });

    test('treats a caret sitting on a newline as the end of that line', () => {
        // Position 3 is the newline after 'one'.
        expect(caretBoundarySelection('end', false, 3, 3, many).end).toBe(3);
        expect(caretBoundarySelection('start', false, 3, 3, many).start).toBe(
            0,
        );
    });
});
