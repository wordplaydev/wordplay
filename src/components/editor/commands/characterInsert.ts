import type Caret from '#edit/caret/Caret.ts';
import FormattedLiteral from '#nodes/FormattedLiteral.ts';
import Node from '#nodes/Node.ts';
import TextLiteral from '#nodes/TextLiteral.ts';
import type Translation from '#nodes/Translation.ts';

/** The node closest to the caret — for ancestor walks. */
function caretAnchor(caret: Caret): Node | undefined {
    if (caret.position instanceof Node) return caret.position;
    if (typeof caret.position === 'number')
        return caret.tokenIncludingSpace ?? caret.tokenExcludingSpace;
    return caret.source.getTokenAt(caret.position[0]);
}

/** Whether the whole caret sits between a translation's delimiters. */
function isInside(caret: Caret, translation: Translation): boolean {
    if (caret.position instanceof Node) return false;
    const [from, to] =
        typeof caret.position === 'number'
            ? [caret.position, caret.position]
            : [Math.min(...caret.position), Math.max(...caret.position)];
    const start = caret.source.getTokenLastPosition(translation.open);
    const end =
        translation.close === undefined
            ? caret.source.getNodeLastPosition(translation)
            : caret.source.getTokenTextPosition(translation.close);
    return (
        start !== undefined && end !== undefined && from >= start && to <= end
    );
}

/**
 * Where a custom character reference like `@amy/cat` goes, and what is typed
 * there, for a caret anywhere in a program.
 *
 * Text holds a custom character as well as formatted text does (#773), so a
 * text literal keeps its own quotes. It used to be replaced with a backticked
 * formatted literal, which is a different type: in a field declared as text
 * that is a conflict, and nothing showed on stage until the quotes were typed
 * back.
 */
export function characterInsertion(
    caret: Caret,
    reference: string,
): { target: Caret; payload: string } {
    const anchor = caretAnchor(caret);
    const literal = anchor
        ? [anchor, ...caret.source.root.getAncestors(anchor)].find(
              (n): n is TextLiteral | FormattedLiteral =>
                  n instanceof TextLiteral || n instanceof FormattedLiteral,
          )
        : undefined;

    // Outside any text: a new formatted literal holding only the character.
    const fresh = { target: caret, payload: `\`${reference}\`` };
    if (literal === undefined) return fresh;

    // The whole literal selected as a node is an explicit "replace this", so it
    // is replaced by one of its own kind, keeping its first language tag.
    if (caret.position === literal) {
        const language = literal.texts[0]?.language?.toWordplay() ?? '';
        const first =
            literal instanceof TextLiteral ? literal.texts[0] : undefined;
        const open = first?.open.getText() ?? '`';
        const close =
            first === undefined ? '`' : (first.close?.getText() ?? open);
        return {
            target: caret,
            payload: `${open}${reference}${close}${language}`,
        };
    }

    // Formatted text takes the reference wherever the caret is in its markup.
    if (literal instanceof FormattedLiteral)
        return { target: caret, payload: reference };

    // Inside a text's quotes, the reference joins whatever is already there.
    // On its edge, it is a new literal beside it rather than a guess at which
    // side of the quote was meant.
    return literal.texts.some((text) => isInside(caret, text))
        ? { target: caret, payload: reference }
        : fresh;
}
