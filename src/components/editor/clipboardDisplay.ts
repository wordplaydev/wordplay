import Source from '@nodes/Source';
import UnparsableExpression from '@nodes/UnparsableExpression';

/** How many top-level statements of a copied sequence the footer preview renders
 * before truncating with a "…". Rendering a very large copied sequence walks the
 * whole AST, which is slow, so we cap the preview (never the actual clipboard). */
export const MAX_CLIPBOARD_PREVIEW_STATEMENTS = 3;

/**
 * Parse clipboard text as Wordplay for display in the footer. `isCode` is true when the text parses
 * cleanly (no UnparsableExpression) and is non-empty, meaning it can be rendered as code; otherwise the
 * caller should show the raw text. The parsed `source` is returned so the caller can render it without
 * re-parsing. If the code is a sequence of more than `MAX_CLIPBOARD_PREVIEW_STATEMENTS` top-level
 * statements, `source` is truncated to just the first few (for a cheap preview) and `hidden` is the
 * number of statements omitted; otherwise `hidden` is 0.
 */
export function parseClipboardCode(text: string): {
    source: Source;
    isCode: boolean;
    hidden: number;
} {
    const source = new Source('clipboard', text);
    const isCode =
        text.trim().length > 0 &&
        !source.expression
            .nodes()
            .some((n) => n instanceof UnparsableExpression);

    // If the code is a sequence of more statements than we preview, slice the
    // original text at the start of the first hidden statement and re-parse that
    // prefix. Slicing text (rather than rebuilding nodes) keeps the original
    // spacing and ensures the preview renderer only walks the shown statements.
    if (isCode) {
        const statements = source.expression.expression.statements;
        if (statements.length > MAX_CLIPBOARD_PREVIEW_STATEMENTS) {
            const offset = source.getNodeFirstPosition(
                statements[MAX_CLIPBOARD_PREVIEW_STATEMENTS],
            );
            if (offset !== undefined)
                return {
                    source: new Source(
                        'clipboard',
                        text.slice(0, offset).trimEnd(),
                    ),
                    isCode,
                    hidden: statements.length - MAX_CLIPBOARD_PREVIEW_STATEMENTS,
                };
        }
    }

    return { source, isCode, hidden: 0 };
}
