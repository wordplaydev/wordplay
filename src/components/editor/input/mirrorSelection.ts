import type Caret from '@edit/caret/Caret';

/**
 * The hidden textarea both editors keep in sync is what a screen reader actually
 * echoes from (#1248), and its selection is the caret the platform reports. This
 * is the pure half of that mapping, shared so the two mirrors cannot drift.
 *
 * The conversion is the load-bearing part: a caret position counts **graphemes**,
 * matching `Source.tokenPositions`, while a field's selection counts **UTF-16 code
 * units**. Handing the raw position over puts the field's caret inside the
 * surrogate pair after any emoji (#1329), and Wordplay names things with emoji
 * constantly. Converting through the same `UnicodeString` the value came from is
 * what makes the two agree — it is already normalized, so its code-unit offsets
 * index the mirrored text exactly.
 */
export function caretFieldSelection(caret: Caret): {
    /** The mirrored text: the source's code. */
    text: string;
    /** The selection in UTF-16 code units, ordered low to high. */
    low: number;
    high: number;
} {
    const code = caret.source.getCode();
    const position = caret.position;
    // A position collapses, a range selects, and a node selection selects its
    // whole token span — which for a run of nodes is the text between its ends,
    // since a run is contiguous.
    const [start, end] =
        typeof position === 'number'
            ? [position, position]
            : Array.isArray(position)
              ? position
              : (caret.getSelectionSpan() ?? [
                    caret.getTextPosition(true) ?? 0,
                    caret.getTextPosition(false) ?? 0,
                ]);
    // A range's anchor can follow its focus; the field needs them ordered.
    return {
        text: code.toString(),
        low: code.getCodeUnitPosition(Math.min(start, end)),
        high: code.getCodeUnitPosition(Math.max(start, end)),
    };
}

/**
 * Whether this keystroke should be echoed by the browser's own edit of the
 * mirrored field rather than by the live region.
 *
 * This is the #1248 rule, and it is subtle enough that both editors must not
 * each carry their own copy of it: a live region is the wrong instrument for
 * character echo (polite drops characters at typing speed, assertive chimes on
 * every one), so an echo-bearing keystroke deliberately skips `preventDefault`
 * and lets the browser edit the field — that native edit is what a screen reader
 * speaks. The caller still applies the model edit; `skipNextInput` is what stops
 * the resulting `input` event applying it twice.
 *
 * Only plain characters, Enter, and a single-character Backspace/Delete at a
 * plain text position qualify. A chord is a command. Node and range operations
 * keep `preventDefault`, because the command does more than the naive field edit
 * would and its feedback is already paced.
 */
export function shouldEchoNatively(
    event: KeyboardEvent,
    /** Whether the caret is a plain text position rather than a node or range. */
    caretIsTextPosition: boolean,
): boolean {
    const chord = event.ctrlKey || event.metaKey || event.altKey;
    if (chord) return false;
    if (event.key.length === 1) return true;
    return (
        (event.key === 'Enter' ||
            event.key === 'Backspace' ||
            event.key === 'Delete') &&
        !event.shiftKey &&
        caretIsTextPosition
    );
}
