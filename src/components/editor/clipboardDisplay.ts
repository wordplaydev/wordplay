import Source from '@nodes/Source';
import UnparsableExpression from '@nodes/UnparsableExpression';

/**
 * Parse clipboard text as Wordplay for display in the footer. `isCode` is true when the text parses
 * cleanly (no UnparsableExpression) and is non-empty, meaning it can be rendered as code; otherwise the
 * caller should show the raw text. The parsed `source` is returned so the caller can render it without
 * re-parsing.
 */
export function parseClipboardCode(text: string): {
    source: Source;
    isCode: boolean;
} {
    const source = new Source('clipboard', text);
    const isCode =
        text.trim().length > 0 &&
        !source.expression
            .nodes()
            .some((n) => n instanceof UnparsableExpression);
    return { source, isCode };
}
