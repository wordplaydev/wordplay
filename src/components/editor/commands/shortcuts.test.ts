import { afterEach, describe, expect, test, vi } from 'vitest';
import { keyLabel, toAriaKeyshortcuts, toShortcut } from './shortcuts';

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
        [control, 'Ctrl+A'],
        [controlShift, 'Ctrl+Shift+8'],
        [all, 'Ctrl+Alt+Shift+Z'],
    ])('%o renders %s', (command, expected) => {
        platform(false);
        expect(toShortcut(command)).toBe(expected);
    });
});

describe('macOS', () => {
    test.each([
        [control, '⌘A'],
        [controlShift, '⌘⇧8'],
        [all, '⌘⌥⇧Z'],
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

test('hidden modifiers are omitted', () => {
    platform(false);
    expect(
        toShortcut(all, { hideControl: true, hideShift: true, hideAlt: true }),
    ).toBe('Z');
});

/**
 * macOS names Option ⌥. We shipped ⎇ — the generic ISO alt glyph — which no
 * macOS keyboard is labelled with.
 */
test('macOS names Option ⌥', () => {
    platform(true);
    expect(
        toShortcut({ control: false, alt: true, shift: false, key: 'j' }),
    ).toBe('⌥J');
});

/**
 * The label is derived from the key, so it cannot disagree with the binding.
 * `keySymbol` could, and did: the help advertised `Ctrl+?` for a chord that is
 * Ctrl+/, and `≥` printed the same `.` as `·` while only `·` ever fired.
 */
describe('a key labels itself', () => {
    test.each([
        ['a', 'A'],
        ['/', '/'],
        ['8', '8'],
        // The arrows stay glyphs: `←` is printed on the keycap in every locale.
        ['ArrowLeft', '←'],
        ['ArrowRight', '→'],
        ['ArrowUp', '↑'],
        ['ArrowDown', '↓'],
    ])('%s reads %s', (key, expected) => {
        expect(keyLabel(key)).toBe(expected);
    });

    /**
     * Every other named key is named in words, from the locale's own key table.
     * `⇱`/`⎋`/`↵` name nothing a reader can find on a keyboard — the whole
     * complaint that `⌘⇧3` and `⇡` "aren't typeable".
     */
    test.each([
        ['Escape', 'Esc'],
        ['Enter', 'Return'],
        ['Home', 'Home'],
        ['PageUp', 'Page Up'],
    ])('%s is named %s by the locale', (key, localized) => {
        expect(keyLabel(key, localized)).toBe(localized);
    });

    test('an arrow keeps its glyph even when the locale offers words', () => {
        // de-DE's table says "Pfeil nach links", which is not on any keycap.
        expect(keyLabel('ArrowLeft', 'Pfeil nach links')).toBe('←');
    });

    test('a key the locale does not name falls back to the key itself', () => {
        expect(keyLabel('F13')).toBe('F13');
    });
});

/**
 * macOS takes ⌘⇧3/4/5 for screenshots before the page sees them. We keep the
 * chord — `control` means Command *or* Control, so ⌃⇧3 reaches the command —
 * and advertise the one that works. Everywhere else the chord is unreserved.
 */
describe('a chord macOS eats is advertised with Control', () => {
    test.each([['3'], ['4'], ['5']])('⌃⇧%s on macOS', (key) => {
        platform(true);
        expect(
            toShortcut({ control: true, alt: false, shift: true, key }),
        ).toBe(`⌃⇧${key}`);
    });

    test('but only for those keys, and only with shift', () => {
        platform(true);
        expect(
            toShortcut({ control: true, alt: false, shift: true, key: '6' }),
        ).toBe('⌘⇧6');
        expect(
            toShortcut({ control: true, alt: false, shift: false, key: '3' }),
        ).toBe('⌘3');
    });

    test('and never off macOS', () => {
        platform(false);
        expect(
            toShortcut({ control: true, alt: false, shift: true, key: '3' }),
        ).toBe('Ctrl+Shift+3');
    });
});

/**
 * `aria-keyshortcuts` wants UI Events key names joined by '+'. We were handing
 * it the display string, so a macOS screen reader got "⌘⇧8" — not a value the
 * attribute accepts.
 */
describe('the ARIA form is not the display form', () => {
    test('names Control off macOS and Meta on it', () => {
        platform(false);
        expect(toAriaKeyshortcuts(controlShift)).toBe('Control+Shift+8');
        platform(true);
        expect(toAriaKeyshortcuts(controlShift)).toBe('Meta+Shift+8');
    });

    test('uses the key name, not the glyph', () => {
        platform(false);
        expect(
            toAriaKeyshortcuts({
                control: false,
                alt: true,
                shift: false,
                key: 'ArrowLeft',
            }),
        ).toBe('Alt+ArrowLeft');
    });

    test('a keyless command has no ARIA shortcut', () => {
        platform(false);
        expect(toAriaKeyshortcuts(keyless)).toBe('');
    });
});

/**
 * A key's glyph must be text, not emoji. `↖` and `↘` looked right in a terminal
 * and rendered as colour emoji in the shortcut table, because the bundled emoji
 * font covers them — they carry Unicode's Emoji property, unlike the corner
 * arrows that replaced them.
 */
test('no key glyph is emoji-capable', () => {
    // The emoji-capable arrows, per Unicode's emoji-data: U+2190–U+2199 plus
    // the curved and vertical ones.
    const emojiCapable = new Set([
        ...Array.from({ length: 10 }, (_, i) => 0x2190 + i),
        0x21a9,
        0x21aa,
        0x2934,
        0x2935,
    ]);
    // The four plain arrows are emoji-capable too, and are left out on purpose:
    // they render as text here, every command's own `symbol` already uses them,
    // and there is no unambiguous text-only substitute for an arrow key.
    const named = [
        'Home',
        'End',
        'PageUp',
        'PageDown',
        'Enter',
        'Tab',
        'Escape',
        'Backspace',
        'Delete',
        'Insert',
    ];
    for (const key of named) {
        const glyph = keyLabel(key);
        for (const character of glyph)
            expect(
                emojiCapable.has(character.codePointAt(0) ?? 0),
                `${key} is drawn with ${glyph}, which can render as colour emoji`,
            ).toBe(false);
    }
});
