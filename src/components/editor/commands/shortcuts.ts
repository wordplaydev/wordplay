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
    const mac = onMacOS();
    return `${command.control && !hideControl ? (mac ? controlKeyLabel() : controlKeyLabel() + '+') : ''}${
        command.alt && !hideAlt
            ? mac
                ? altKeyLabel()
                : altKeyLabel() + ' + '
            : ''
    }${command.shift && !hideShift ? (mac ? shiftKeyLabel() : shiftKeyLabel() + ' + ') : ''}${
        command.keySymbol ?? command.key ?? '-'
    }`;
}
