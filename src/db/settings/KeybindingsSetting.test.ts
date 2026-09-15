import { describe, expect, test } from 'vitest';
import {
    chordOf,
    conflictFor,
    effectiveChords,
    isRemappable,
    KeybindingsSetting,
    reservationFor,
    sameChord,
} from '@db/settings/KeybindingsSetting';

const undo = { id: 'undo', key: 'z', control: true, alt: false, shift: false };
const redo = { id: 'redo', key: 'z', control: true, alt: false, shift: true };
const tidy = { id: 'tidy', key: 's', control: true, alt: false, shift: false };
const commands = [undo, redo, tidy];

describe('resolving a chord', () => {
    test('a command with no override keeps its own chord', () => {
        expect(chordOf(undo, {})).toBe(undo);
    });

    test('an override replaces it', () => {
        const chord = chordOf(undo, { undo: { key: 'u', control: true } });
        expect(chord.key).toBe('u');
    });

    test('an explicit null means no chord, which is not the same as absent', () => {
        // Absent = "use the default"; null = "I want no shortcut for this".
        expect(chordOf(undo, { undo: null }).key).toBeUndefined();
        expect(chordOf(undo, {}).key).toBe('z');
    });
});

describe('applying overrides to a list', () => {
    test('the default path returns the very same array', () => {
        // This runs on every keydown; with no overrides it must not allocate.
        expect(effectiveChords(commands, {})).toBe(commands);
    });

    test('an override is applied, and the others are untouched', () => {
        const applied = effectiveChords(commands, {
            undo: { key: 'u', control: true },
        });
        expect(applied[0]?.key).toBe('u');
        // Unchanged commands keep their identity, so nothing downstream re-renders.
        expect(applied[1]).toBe(redo);
    });
});

describe('what a chord may be', () => {
    test.each([
        [{ key: 'z', control: true, alt: true }, 'controlAlt'],
        [{ key: 'Tab', control: true, alt: true }, 'controlAlt'],
        [{ key: 'Tab', control: true }, 'tab'],
        [{ key: 't', control: true, shift: true }, 'browser'],
        [{ key: 'z' }, 'unmodified'],
        [{ key: 'z', shift: true }, 'unmodified'],
    ])('%o is refused as %s', (chord, why) => {
        expect(reservationFor(chord)).toBe(why);
    });

    test.each([
        [{ key: 'z', control: true }],
        [{ key: 'j', alt: true }],
        [{ key: '9', control: true, shift: true }],
    ])('%o is allowed', (chord) => {
        expect(reservationFor(chord)).toBeUndefined();
    });

    test('a chord with no key is not judged', () => {
        expect(reservationFor({ control: true, alt: true })).toBeUndefined();
    });
});

describe('what may be rebound', () => {
    test('a chorded command may be', () => {
        expect(isRemappable(undo)).toBe(true);
    });

    test('a command with no chord may be — that is the point', () => {
        // The palette-only inserts are the symbols students said they can't type.
        expect(isRemappable({ key: undefined })).toBe(true);
    });

    test('the typing surface may not be', () => {
        expect(isRemappable({ key: 'Backspace' })).toBe(false);
        expect(isRemappable({ key: '[' })).toBe(false);
        expect(isRemappable({ key: 'ArrowLeft', shift: true })).toBe(false);
        expect(isRemappable({ key: undefined, typing: true })).toBe(false);
    });
});

describe('conflicts', () => {
    test('a chord another command holds is named', () => {
        expect(
            conflictFor({ key: 's', control: true }, 'undo', commands, {}),
        ).toBe('tidy');
    });

    test('a free chord conflicts with nothing', () => {
        expect(
            conflictFor({ key: 'q', control: true }, 'undo', commands, {}),
        ).toBeUndefined();
    });

    test('a command does not conflict with itself', () => {
        expect(
            conflictFor({ key: 'z', control: true }, 'undo', commands, {}),
        ).toBeUndefined();
    });

    test('a chord freed by an override is no longer taken', () => {
        expect(
            conflictFor({ key: 's', control: true }, 'undo', commands, {
                tidy: { key: 'y', control: true },
            }),
        ).toBeUndefined();
    });

    test('shift distinguishes two chords on one key', () => {
        expect(sameChord(undo, redo)).toBe(false);
    });
});

describe('what is stored', () => {
    test('a malformed entry drops itself, not the whole map', () => {
        const parsed = KeybindingsSetting.validator({
            undo: { key: 'u', control: true },
            broken: { key: 5 },
            cleared: null,
        });
        expect(parsed).toEqual({
            undo: { key: 'u', control: true },
            cleared: null,
        });
    });

    test('a value that is not a map is rejected outright', () => {
        expect(KeybindingsSetting.validator([])).toBeUndefined();
        expect(KeybindingsSetting.validator('nope')).toBeUndefined();
    });

    test('an unknown id is kept, so a missing command loses nothing else', () => {
        // A command may be absent for a release; dropping its binding would
        // silently discard a choice the creator made.
        expect(
            KeybindingsSetting.validator({ 'not-a-command': { key: 'k' } }),
        ).toEqual({ 'not-a-command': { key: 'k' } });
    });
});
