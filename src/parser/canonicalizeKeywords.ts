import BinaryEvaluate from '@nodes/BinaryEvaluate';
import Name from '@nodes/Name';
import type Node from '@nodes/Node';
import Reference from '@nodes/Reference';
import Root from '@nodes/Root';
import Token from '@nodes/Token';
import UnaryEvaluate from '@nodes/UnaryEvaluate';
import type { KeywordIndex } from '@parser/Keywords';
import type Spaces from '@parser/Spaces';

/**
 * Serialize a node to Wordplay text, but rewrite each localized-keyword word that is used as a
 * CONSTRUCT to its canonical symbol — so copied code is locale-neutral and pastes correctly into any
 * project (symbols re-tokenize identically everywhere and render in the reader's words). A keyword
 * word used as a NAME (a shadow — e.g. a variable spelled `número`) is left as-is, since rewriting it
 * to the symbol would change a name into a construct. See LANGUAGE.md.
 *
 * Equivalent to {@link Node.toWordplay} (concatenating each leaf's preceding space and text) with the
 * one substitution; falls back to the typed text whenever no keyword index applies.
 */
export default function canonicalizeKeywords(
    node: Node,
    spaces: Spaces,
    keywords: KeywordIndex,
): string {
    const root = new Root(node);
    let out = '';
    for (const leaf of node.leaves()) {
        if (!(leaf instanceof Token)) continue;
        out += spaces.getSpace(leaf);
        out += getCanonicalGlyph(leaf, root, keywords) ?? leaf.getText();
    }
    return out;
}

/**
 * The canonical glyph for a token that is a localized keyword word used as a CONSTRUCT (not a shadow
 * name), or undefined to keep the token's text. Used both to canonicalize on copy and to render a
 * word-typed keyword as its symbol in symbols-display mode. The role check is purely structural.
 */
export function getCanonicalGlyph(
    token: Token,
    root: Root,
    keywords: KeywordIndex,
): string | undefined {
    // Only keyword words (in code or pattern context) are candidates.
    const entry =
        keywords.code.get(token.getText()) ??
        keywords.pattern.get(token.getText());
    if (entry === undefined) return undefined;

    const parent = root.getParent(token);
    // A definition name (Bind/function/structure name) is a shadow — keep the typed word.
    if (parent instanceof Name) return undefined;
    // A Reference is a name UNLESS it's the operator of a Binary/UnaryEvaluate; only then canonicalize.
    if (parent instanceof Reference) {
        const grandparent = root.getParent(parent);
        const asOperator =
            (grandparent instanceof BinaryEvaluate ||
                grandparent instanceof UnaryEvaluate) &&
            grandparent.fun === parent;
        if (!asOperator) return undefined;
    }
    // Otherwise the token is a structural/atomic keyword token used as its construct → canonicalize.
    return entry.symbol;
}
