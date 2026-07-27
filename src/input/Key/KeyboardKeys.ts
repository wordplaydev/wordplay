/** Canonical English `KeyboardEvent.key` values that Wordplay localizes.
 *
 * Scope is the common categories from MDN's keyboard-event-key reference —
 * Modifier, Whitespace, Navigation, Editing, UI, IME, and Function keys.
 * Printable characters (letters, digits, punctuation, any single grapheme
 * from any keyboard layout) intentionally aren't enumerated: they're emitted
 * as-is, and any `Key('a')`-style filter still matches because the parameter
 * type's catch-all `Text` accepts them.
 *
 * Adding a new entry here also requires adding it to every locale's
 * `static/locales/{lang}/{lang}-keys.json` table; the locale verifier
 * enforces this.
 */
export const WellKnownKeys = [
    // Modifier
    'Shift',
    'Control',
    'Alt',
    'Meta',
    'AltGraph',
    'CapsLock',
    'NumLock',
    'ScrollLock',
    // Whitespace
    'Enter',
    'Tab',
    ' ',
    // Navigation
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'Home',
    'End',
    'PageUp',
    'PageDown',
    // Editing
    'Backspace',
    'Delete',
    'Insert',
    'Clear',
    'Cut',
    'Copy',
    'Paste',
    'Undo',
    'Redo',
    // UI
    'Escape',
    'Pause',
    'ContextMenu',
    'Help',
    // IME (the globally common subset)
    'Convert',
    'NonConvert',
    'KanaMode',
    'HangulMode',
    'Hiragana',
    'Katakana',
    'Romaji',
    // Function
    'F1',
    'F2',
    'F3',
    'F4',
    'F5',
    'F6',
    'F7',
    'F8',
    'F9',
    'F10',
    'F11',
    'F12',
] as const;

export type WellKnownKey = (typeof WellKnownKeys)[number];

/** Per-locale key-name table.
 *  Keyed by the canonical English `KeyboardEvent.key` value. Each entry is
 *  `[displayName, ...aliases]` — the first string is what `Key()` emits in
 *  this locale, and any of the strings (display name or alias) are accepted
 *  as the `keyBind` filter argument. en-US uses `[canonical, …]` so single-
 *  language English programs round-trip cleanly. */
export type KeyMap = Record<string, readonly string[]>;
