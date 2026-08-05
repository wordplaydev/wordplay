/** How many characters of a node's text a description speaks before eliding. */
export const PreviewLength = 60;

/**
 * A node description names its contents, but a paragraph or example can run
 * long, and a caret stop that reads a whole paragraph back buries the next
 * keystroke. Preview instead: enough to recognize what's there, elided after.
 * Mirrors the caret's selection preview.
 */
export default function previewText(text: string): string {
    const trimmed = text.trim();
    return trimmed.length > PreviewLength
        ? `${trimmed.slice(0, PreviewLength)}…`
        : trimmed;
}
