/**
 * How we label keyboard shortcuts. Separate from Commands.ts because widgets
 * that merely *show* a shortcut (Toggle, CommandButton) would otherwise import
 * the whole command table, which reaches Caret and Project and so pulls the
 * language runtime into every page that renders a toolbar.
 */

/** Whether the current device uses macOS/iOS modifier-key conventions, which
 *  label modifiers with symbols rather than words. */
export function onMacOS() {
    return (
        typeof navigator !== 'undefined' &&
        navigator.userAgent.indexOf('Mac') !== -1
    );
}

/** Platform-specific labels for the modifier keys, reused wherever we summarize a
 *  keyboard shortcut (toShortcut and in-editor instructions like the Tab notice). */
export function controlKeyLabel() {
    return onMacOS() ? '⌘' : 'Ctrl';
}
export function altKeyLabel() {
    return onMacOS() ? '⎇' : 'Alt';
}
export function shiftKeyLabel() {
    return onMacOS() ? '⇧' : 'Shift';
}

export function toShortcut(
    command: {
        control: boolean | undefined;
        alt: boolean | undefined;
        shift: boolean | undefined;
        key?: string;
        keySymbol?: string;
    },
    hideControl = false,
    hideShift = false,
    hideAlt = false,
) {
    // macOS writes modifiers as adjacent symbols (⌘⇧8); everywhere else joins
    // them with a plus. One separator for all three: control used to join with
    // '+' while alt and shift joined with ' + ', so a Ctrl+Shift command read
    // "Ctrl+Shift + 8".
    const separator = onMacOS() ? '' : '+';
    const parts = [
        ...(command.control && !hideControl ? [controlKeyLabel()] : []),
        ...(command.alt && !hideAlt ? [altKeyLabel()] : []),
        ...(command.shift && !hideShift ? [shiftKeyLabel()] : []),
        // A command with no key of its own is invoked by its button alone, so
        // there is no shortcut to name; the modifiers still are, if it has any.
        ...((command.keySymbol ?? command.key)
            ? [command.keySymbol ?? command.key ?? '']
            : []),
    ];
    return parts.join(separator);
}
