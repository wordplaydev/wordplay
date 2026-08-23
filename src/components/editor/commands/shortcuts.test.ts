import { afterEach, describe, expect, test, vi } from 'vitest';
import { toShortcut } from './shortcuts';

/**
 * Guards how a shortcut reads. The separators used to disagree between
 * modifiers — control joined with '+' while alt and shift joined with ' + ' —
 * so a Ctrl+Shift command rendered "Ctrl+Shift + 8", and a command with no key
 * of its own rendered a bare "-".
 */

/** Pretend to be (or not be) macOS, which onMacOS() sniffs from the UA. */
function platform(mac: boolean) {
    vi.stubGlobal('navigator', {
        userAgent: mac
            ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
            : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    });
}

afterEach(() => vi.unstubAllGlobals());

const control = { control: true, alt: false, shift: false, key: 'a' };
const controlShift = { control: true, alt: false, shift: true, key: '8' };
const all = { control: true, alt: true, shift: true, key: 'z' };
const keyless = { control: true, alt: true, shift: false };

describe('non-macOS', () => {
    test.each([
        [control, 'Ctrl+a'],
        [controlShift, 'Ctrl+Shift+8'],
        [all, 'Ctrl+Alt+Shift+z'],
    ])('%o renders %s', (command, expected) => {
        platform(false);
        expect(toShortcut(command)).toBe(expected);
    });
});

describe('macOS', () => {
    test.each([
        [control, '⌘a'],
        [controlShift, '⌘⇧8'],
        [all, '⌘⎇⇧z'],
    ])('%o renders %s', (command, expected) => {
        platform(true);
        expect(toShortcut(command)).toBe(expected);
    });
});

test('one separator joins every modifier', () => {
    platform(false);
    // The regression: two different separators in one string.
    expect(toShortcut(controlShift)).not.toContain(' ');
});

test('a command with no key names only its modifiers', () => {
    platform(false);
    // Not "Ctrl+Alt+-": there is no key to press, and callers treat an empty
    // shortcut as "none" (Button and Hint both guard on truthiness).
    expect(toShortcut(keyless)).toBe('Ctrl+Alt');
});

test('a keySymbol wins over a key', () => {
    platform(false);
    expect(
        toShortcut({
            control: true,
            alt: false,
            shift: false,
            key: 'Slash',
            keySymbol: '/',
        }),
    ).toBe('Ctrl+/');
});

test('hidden modifiers are omitted', () => {
    platform(false);
    expect(toShortcut(all, true, true, true)).toBe('z');
});
