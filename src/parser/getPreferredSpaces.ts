/** Functions and helper functions for formatting the preceding space of tokens (aka "pretty printing"). */
import Block from '@nodes/Block';
import Node from '@nodes/Node';
import Root from '@nodes/Root';
import Source from '@nodes/Source';
import type Token from '@nodes/Token';
import Spaces, { MAX_LINE_LENGTH, TAB_WIDTH } from '@parser/Spaces';
import TokenList from '@parser/TokenList';

/** What the spacing decision needs from the tree, resolved once per token so the
 * measuring pass and the spacing pass agree and neither walks the tree twice. */
type TokenContext = {
    token: Token;
    /** The node whose grammar field holds the token's space root. */
    parent: Node | undefined;
    /** The grammar field of the highest ancestor whose first leaf is this token. */
    field: ReturnType<Node['getFieldOfChild']>;
    /** True when this is the very first statement of a root block. */
    firstInRootBlock: boolean;
    /** Indentation depth, in tabs. */
    depth: number;
    /** The space this token gets with no line breaking at all: '' or ' '. */
    flatSpace: string;
};

/** How far a space string advances the column, with tabs counted at TAB_WIDTH. A
 *  newline resets the column, so only the tail after the last one matters. Space
 *  strings are only ever spaces, tabs, and newlines, so code units are exact. */
function advanceSpace(text: string, from: number): number {
    const lastBreak = text.lastIndexOf('\n');
    let column = lastBreak === -1 ? from : 0;
    for (let i = lastBreak + 1; i < text.length; i++)
        column += text[i] === '\t' ? TAB_WIDTH : 1;
    return column;
}

/** How far a token advances the column. Measured in graphemes, to match the widths
 *  the wrap decision compares against — a token's text is arbitrary content, and an
 *  emoji is one column, not two. A token that spans lines (a multi-line text literal
 *  or doc) resets the column to whatever follows its last newline. */
function advanceToken(token: Token, from: number): number {
    const text = token.getText();
    const lastBreak = text.lastIndexOf('\n');
    return lastBreak === -1
        ? from + token.getTextLength()
        : [...text.slice(lastBreak + 1)].length;
}

/**
 * Given a node, and optional root for the node, and optional current spacing for the node and its children,
 * return a revised Spaces that formats the node's spacing according to the nodes' formatting rules.
 *
 * Spacing is decided in three passes over the token list. The first resolves each
 * token's grammar field and the space it would get if nothing wrapped. The second
 * measures how wide each node that *can* wrap would be laid out flat. The third
 * walks the tokens in order tracking the current column, breaking a wrappable node
 * open when it wouldn't fit, and writing each token's space.
 *
 * Two invariants hold throughout. Formatting only ever ADDS newlines — a line break
 * the creator typed always survives (and forces its containers open, since no width
 * argument can put it back on one line). And indentation is never stored: it is
 * recomputed from tree depth every run, so a node's indentation is always correct
 * for where it currently sits.
 *
 * @param root The root node, or Root to format
 * @param space The current spacing, or possibly none
 */
export default function getPreferredSpaces(
    node: Root | Node,
    spaces?: Spaces,
): Spaces {
    // If the node is not a root, make a root, so we can track parents.
    const root = node instanceof Root ? node : new Root(node);

    // Grab the spaces in the source, if the node is a source.
    if (node instanceof Source) spaces = node.spaces;

    // Start with the spaces from the given spaces list, otherwise make an empty mapping.
    const preferredSpaces: Map<Token, string> = spaces
        ? spaces.getSpaces()
        : new Map();

    const leaves = root.root.leaves();

    // PASS 1 — each token's grammar context and its flat (unbroken) space.
    const contexts: TokenContext[] = leaves.map((token, index) => {
        const spaceRoot = root.getSpaceRoot(token);
        const parent = spaceRoot ? root.getParent(spaceRoot) : undefined;
        // A root block's first statement, when it really is at the document start,
        // never has a leading space. getSpaceRoot now attributes this statement's
        // space to the statement itself (so it renders/windows with it) rather than
        // to the Program; without this guard it would inherit the statements field's
        // leading newline and the formatter would insert a blank line before the
        // program. The index check is what makes "at the document start" literal:
        // when the program opens with docs, the first statement follows them and
        // must keep its newline, or the code is pulled up onto the doc's last line.
        const firstInRootBlock =
            index === 0 &&
            parent instanceof Block &&
            parent.isRoot() &&
            parent.statements[0] === spaceRoot;
        const field =
            spaceRoot && !firstInRootBlock
                ? parent?.getFieldOfChild(spaceRoot)
                : undefined;

        let flatSpace = '';
        if (field && spaceRoot) {
            const list = parent?.getField(field.name);
            const isFirstInList = Array.isArray(list) && list[0] === spaceRoot;
            if (
                (field.space === true ||
                    (field.space instanceof Function && field.space(token))) &&
                !isFirstInList
            )
                flatSpace = ' ';
        }

        return {
            token,
            parent,
            field,
            firstInRootBlock,
            depth: root.getDepth(token),
            flatSpace,
        };
    });

    // PASS 2 — the flat width of every node that can wrap, as a leaf-index span.
    // Prefix sums over (flat space + token width) make each span an O(1)
    // subtraction, and the ancestor walk is bounded by tree depth. Nothing calls
    // toWordplay(): the heuristic this replaces did, once per value, which made
    // measuring a long literal quadratic in its own size.
    const prefix = new Array<number>(contexts.length + 1);
    prefix[0] = 0;
    for (let i = 0; i < contexts.length; i++)
        prefix[i + 1] =
            prefix[i] +
            contexts[i].flatSpace.length +
            contexts[i].token.getTextLength();

    type Span = { first: number; last: number; open: boolean };
    const spans = new Map<Node, Span>();
    /** The wrappable nodes whose first leaf is index i, outermost first. */
    const startingAt: Node[][] = contexts.map(() => []);
    for (let i = 0; i < contexts.length; i++) {
        const token = contexts[i].token;
        // A newline the creator typed, or a token that spans lines itself (a
        // multi-line text literal or doc), can't be undone by a width argument.
        const carriesBreak =
            (preferredSpaces.get(token) ?? '').includes('\n') ||
            token.getText().includes('\n');
        let ancestor = root.getParent(token);
        while (ancestor !== undefined) {
            if (ancestor.getGrammar().some((f) => f.wrap === true)) {
                const span = spans.get(ancestor);
                if (span === undefined) {
                    spans.set(ancestor, { first: i, last: i, open: false });
                    startingAt[i].push(ancestor);
                } else {
                    span.last = i;
                    // The container's own leading space belongs to whatever
                    // precedes it, so only a break INSIDE it opens it.
                    if (carriesBreak) span.open = true;
                }
            }
            ancestor = root.getParent(ancestor);
        }
    }
    // The ancestor walk collects innermost-first; deciding breaks needs the reverse.
    for (const nodes of startingAt) nodes.reverse();

    // PASS 3 — walk the tokens in order, tracking the column, breaking wrappable
    // containers that don't fit, and writing each token's space.
    const broken = new Set<Node>();
    // A subtree reformatted on its own starts wherever it sits in its parent.
    let column = (contexts[0]?.depth ?? 0) * TAB_WIDTH;

    for (let i = 0; i < contexts.length; i++) {
        const { token, parent, field, firstInRootBlock, depth, flatSpace } =
            contexts[i];

        let revisedSpace = preferredSpaces.get(token) ?? '';

        if (firstInRootBlock) {
            revisedSpace = '';
            preferredSpaces.set(token, revisedSpace);
        } else if (field) {
            const newlinesIncluded = revisedSpace.split('\n').length - 1;
            // Break either because the field always does (`newline`), or because
            // it's a `wrap` field whose container was found not to fit — decided
            // below, when that container's first token was reached.
            const wraps =
                field.wrap === true &&
                parent !== undefined &&
                broken.has(parent);
            const newlinesNeeded = field.double
                ? 2
                : field.newline || wraps
                  ? 1
                  : 0;
            const indentsNeeded =
                newlinesNeeded === 0 && newlinesIncluded === 0 ? 0 : depth;

            revisedSpace =
                newlinesNeeded > 0 || newlinesIncluded > 0
                    ? // Keep any extra newlines
                      '\n'.repeat(Math.max(newlinesNeeded, newlinesIncluded)) +
                      '\t'.repeat(indentsNeeded)
                    : flatSpace;

            preferredSpaces.set(token, revisedSpace);
        }

        column = advanceSpace(revisedSpace, column);

        // The column where this token's text begins is now known, so decide which
        // containers starting here fit. Outermost first: an outer container that
        // breaks does not move THIS token (its leading space is its own parent's
        // business), so every container starting here is judged at this same
        // column, and an inner one that still doesn't fit breaks too.
        for (const container of startingAt[i]) {
            const span = spans.get(container);
            if (span === undefined) continue;
            const width = prefix[span.last + 1] - prefix[span.first];
            if (span.open || column + width > MAX_LINE_LENGTH)
                broken.add(container);
        }

        column = advanceToken(token, column);
    }

    // Return a spaces object with the preferred spaces
    return spaces
        ? new Spaces(spaces.root, preferredSpaces)
        : new TokenList(root.root.nodes(), preferredSpaces).getSpaces();
}

export function getFormattedWordplay(node: Node) {
    return node.toWordplay(getPreferredSpaces(node));
}
