/**
 * How we label keyboard shortcuts. Separate from Commands.ts because widgets
 * that merely *show* a shortcut (Toggle, CommandButton) would otherwise import
 * the whole command table, which reaches Caret and Project and so pulls the
 * language runtime into every page that renders a toolbar. Nothing here may
 * import anything, for the same reason.
 */

/** Whether the current device uses macOS/iOS modifier-key conventions, which
 *  label modifiers with symbols rather than words. */
export function onMacOS() {
    return (
        typeof navigator !== 'undefined' &&
        navigator.userAgent.indexOf('Mac') !== -1
    );
}

/**
 * Chords macOS takes for itself before a page sees them — the screenshot tools.
 * We keep the chord, because `control` means Command *or* Control (see
 * handleKeyCommand) and ⌃⇧3 reaches the command perfectly well; what we change
 * is the label, so the chord we advertise is the one that works. Labelling may
 * branch on platform; matching deliberately does not.
 */
const MacOSTakesControlShift: ReadonlySet<string> = new Set(['3', '4', '5']);

/** Platform-specific labels for the modifier keys, reused wherever we summarize a
 *  keyboard shortcut (toShortcut and in-editor instructions like the Tab notice). */
export function controlKeyLabel() {
    return onMacOS() ? '⌘' : 'Ctrl';
}
export function altKeyLabel() {
    return onMacOS() ? '⌥' : 'Alt';
}
export function shiftKeyLabel() {
    return onMacOS() ? '⇧' : 'Shift';
}

/**
 * The keys drawn as a glyph rather than named in words.
 *
 * Only the arrows: `←` is printed on the keycap in every locale, so it needs no
 * translation and reads better than a phrase. Every other named key is named
 * from the locale's own key table — a reader looking for `esc` should see the
 * word their keyboard prints, not `⎋`, and `⇱` names nothing anyone can find.
 */
const ArrowGlyphs: Readonly<Record<string, string>> = {
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
};

/** The visible label for a command's key, given whatever the locale's key table
 *  offered for it (see `keyLabelFor`). */
export function keyLabel(key: string, localized?: string | undefined): string {
    return (
        ArrowGlyphs[key] ??
        localized ??
        (key.length === 1 ? key.toUpperCase() : key)
    );
}

/** The shape every labeller needs of a command: its chord, and nothing else. */
export type Chord = {
    control?: boolean | undefined;
    alt?: boolean | undefined;
    shift?: boolean | undefined;
    key?: string | undefined;
};

export type ShortcutOptions = {
    /** How this locale names the key, from `keyLabelFor`. Passed in rather than
     *  resolved here: this module renders on every page and must import nothing,
     *  or the command table lands on all five page graphs. */
    keyLabel?: string | undefined;
    hideControl?: boolean;
    hideShift?: boolean;
    hideAlt?: boolean;
};

export function toShortcut(command: Chord, options: ShortcutOptions = {}) {
    const { keyLabel: localizedKey, hideControl, hideShift, hideAlt } = options;
    // macOS writes modifiers as adjacent symbols (⌘⇧8); everywhere else joins
    // them with a plus. One separator for all three: control used to join with
    // '+' while alt and shift joined with ' + ', so a Ctrl+Shift command read
    // "Ctrl+Shift + 8".
    const separator = onMacOS() ? '' : '+';
    // A chord macOS eats is advertised with Control, which is the one that works.
    const control =
        onMacOS() &&
        command.control &&
        command.shift &&
        command.key !== undefined &&
        MacOSTakesControlShift.has(command.key)
            ? '⌃'
            : controlKeyLabel();
    const parts = [
        ...(command.control && !hideControl ? [control] : []),
        ...(command.alt && !hideAlt ? [altKeyLabel()] : []),
        ...(command.shift && !hideShift ? [shiftKeyLabel()] : []),
        // A command with no key of its own is invoked by its button alone, so
        // there is no shortcut to name; the modifiers still are, if it has any.
        ...(command.key !== undefined
            ? [keyLabel(command.key, localizedKey)]
            : []),
    ];
    return parts.join(separator);
}

/**
 * The same chord as `aria-keyshortcuts` wants it: UI Events key names joined by
 * '+'. Separate from `toShortcut` because that one is for human eyes and uses
 * glyphs — handing '⌘⇧8' to a screen reader, as we used to, is not a value the
 * attribute accepts.
 */
export function toAriaKeyshortcuts(command: Chord): string {
    if (command.key === undefined) return '';
    const parts = [
        // Meta and Control are different names to ARIA even though the matcher
        // accepts either; name the one the platform's creator actually presses.
        ...(command.control ? [onMacOS() ? 'Meta' : 'Control'] : []),
        ...(command.alt ? ['Alt'] : []),
        ...(command.shift ? ['Shift'] : []),
        command.key,
    ];
    return parts.join('+');
}
