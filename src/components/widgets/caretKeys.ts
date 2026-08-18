/** Which end of a text control a caret key asks for. */
export type CaretBoundary = 'start' | 'end';

/**
 * Whether an unmodified Home or End was pressed, and which end it asks for.
 *
 * Text controls need this handled explicitly because Home and End are not caret
 * keys on macOS: AppKit hands the renderer `scrollToBeginningOfDocument:` /
 * `scrollToEndOfDocument:`, which Chrome and Safari run as a scroll of the nearest
 * scrollable ancestor. That succeeds on any scrollable page, so the browser marks
 * the event handled and never falls through to moving the caret — and it never
 * calls `preventDefault`, so nothing downstream can tell. Claiming the key here
 * gives our fields the same behavior on every platform.
 *
 * Modified keys are left alone, so macOS's own caret idioms — ⌘← and ⌘→ for the
 * ends of a line, ⌥←/⌥→ by word — keep working natively.
 */
export default function caretBoundaryKey(event: {
    key: string;
    metaKey: boolean;
    ctrlKey: boolean;
    altKey: boolean;
}): CaretBoundary | undefined {
    if (event.metaKey || event.ctrlKey || event.altKey) return undefined;
    return event.key === 'Home'
        ? 'start'
        : event.key === 'End'
          ? 'end'
          : undefined;
}

/** The index just after the newline preceding `at`, or 0. */
function lineStart(text: string, at: number): number {
    return at <= 0 ? 0 : text.lastIndexOf('\n', at - 1) + 1;
}

/** The index of the newline at or after `at`, or the end of the text. */
function lineEnd(text: string, at: number): number {
    const next = text.indexOf('\n', at);
    return next === -1 ? text.length : next;
}

/**
 * The selection a caret key produces: collapsed at the boundary of the line the
 * caret is on, or — with shift held — extended to it from the far end of the
 * current selection, which is how every other text control extends to a line edge.
 *
 * Line-relative, not field-relative, so a multi-line box behaves like a text
 * editor. Single-line fields hold no newlines, so this is their whole value.
 */
export function caretBoundarySelection(
    boundary: CaretBoundary,
    shiftKey: boolean,
    selectionStart: number,
    selectionEnd: number,
    text: string,
): { start: number; end: number } {
    const from = boundary === 'start' ? selectionStart : selectionEnd;
    const to =
        boundary === 'start' ? lineStart(text, from) : lineEnd(text, from);
    if (!shiftKey) return { start: to, end: to };
    // Extend from the anchor: the end of the selection we're moving away from.
    const anchor = boundary === 'start' ? selectionEnd : selectionStart;
    return { start: Math.min(anchor, to), end: Math.max(anchor, to) };
}
