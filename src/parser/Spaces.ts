import Token from '@nodes/Token';
import type Node from '@nodes/Node';
import type Source from '@nodes/Source';
import type TokenList from './TokenList';
import type Root from '@nodes/Root';

export const TAB_WIDTH = 2;
export const SPACE_HTML = '&middot;';
export const TAB_HTML = '&nbsp;'.repeat(TAB_WIDTH - 1) + '→';
export const SPACE_TEXT = '\xa0';
export const TAB_TEXT = SPACE_TEXT.repeat(TAB_WIDTH);
export const EXPLICIT_TAB_TEXT = TAB_TEXT.replace(SPACE_TEXT, '→');

type Spacer = TokenList | Source;

/**
 * An immutable mapping from tokens to spaces that should appear before them.
 * Generally created in Tokenizer, and stored in Source,
 * but can also be created to represent different pretty printing options,
 * or stored outside of Source (e.g., during copy and paste).
 */
export default class Spaces {
    /**
     * A root that contains the tokens and spaces. Usually a Source, but
     * other things can implement the Root interface (e.g., for drag and drop, copy and paste, palettes).
     */
    readonly root: Spacer;

    /**
     * An immutable, private mapping between tokens and preceding space.
     * If a token isn't present, there is no space preceding it.
     * In that sense, this is a sparse representation of non-empty space in a program.
     * */
    readonly #spaces: Map<Token, string>;

    constructor(root: Spacer, mapping: Map<Token, string>) {
        this.root = root;
        this.#spaces = new Map(mapping);
    }

    count() {
        return this.#spaces.size;
    }
    getTokens() {
        return this.#spaces.keys();
    }
    hasSpace(token: Token) {
        return this.#spaces.has(token);
    }
    getSpace(node: Node): string {
        const token =
            node instanceof Token
                ? node
                : (node.getFirstLeaf() as Token | undefined);
        return token ? this.#spaces.get(token) ?? '' : '';
    }
    getSpaces() {
        return this.#spaces;
    }
    getLines(token: Token): string[] {
        return this.getSpace(token).split('\n');
    }
    getLineCount(token: Token): number {
        return this.getLines(token).length;
    }
    getLineBreakCount(token: Token): number {
        return this.getLines(token).length - 1;
    }
    getLastLine(token: Token): string {
        return this.getLines(token).at(-1) ?? '';
    }
    hasLineBreak(token: Token): boolean {
        return this.getLineBreakCount(token) > 0;
    }
    hasLineBreaks(node?: Node): boolean {
        // No node given? See if any preceding spaces include a newline.
        if (node === undefined) {
            return Array.from(this.#spaces.values()).some((s) =>
                s.includes('\n')
            );
        }
        // If a node is given, see if any of the tokens of the node have preceding newlines.
        else {
            return node
                .leaves()
                .some(
                    (token) =>
                        token instanceof Token &&
                        this.#spaces.get(token)?.includes('\n')
                );
        }
    }

    getLastLineSpaces(token: Token): number {
        return this.getLastLine(token).replaceAll('\t', ' '.repeat(TAB_WIDTH))
            .length;
    }
    /** Given some preferred space prior to a token, compute additional space to append to ensure preferred space. */
    getAdditionalSpace(token: Token, preferredSpace: string): string {
        if (preferredSpace.length === 0) return '';

        // Get the preceding space for the token.
        const precedingSpace = this.getSpace(token);

        // Now that we have preferred space, reconcile it with the actual space.
        // 1) iterate through the explicit space
        // 2) each time we find a preferred space character (a space, a new line, a tab), consume it
        // 3) append whatever we didn't find to the end.
        const preferredSpaceChars = preferredSpace.split('');
        let additionalSpace = '';
        let index = 0;
        while (index < precedingSpace.length) {
            let c = precedingSpace.charAt(index);

            const lastLine =
                precedingSpace.substring(index + 1).indexOf('\n') < 0;

            // If we expect a newline, space, or time, and we found one, remove it.
            if (c === preferredSpaceChars[0]) preferredSpaceChars.shift();

            // If we expect a tab, and the current character is a space, read enough
            // spaces to account for a tab, and insert ones as needed.
            if (lastLine && preferredSpaceChars[0] === '\t' && c === ' ') {
                let spacesRemaining = TAB_WIDTH;
                do {
                    spacesRemaining--;
                    index++;
                    c = precedingSpace.charAt(index);
                } while (c === ' ' && spacesRemaining > 0);
                // Add any spaces remaining that we didn't find to make up for a tab.
                additionalSpace += ' '.repeat(spacesRemaining);
                // Remove the tab.
                preferredSpaceChars.shift();
            } else index++;
        }
        // If we have any preferred space remaining, append it.
        additionalSpace += preferredSpaceChars.join('');
        return additionalSpace;
    }

    /** Recurse up the ancestors, constructing preferred preceding space. */
    static getPreferredPrecedingSpace(
        root: Root,
        currentPrecedingSpace: string,
        leaf: Node
    ): string {
        // Start from this node, walking up the ancestor tree
        const depth = root.getDepth(leaf);
        let child = leaf;
        let parent = root.getParent(leaf);
        let preferredSpace = '';
        while (parent) {
            const field = parent.getFieldOfChild(child);

            // Prepend space if the child's first leaf is the leaf we're analyzing.
            if (child.getFirstLeaf() === leaf) {
                preferredSpace =
                    parent.getPreferredPrecedingSpace(
                        child,
                        currentPrecedingSpace,
                        depth
                    ) + preferredSpace;
            }

            // Add a tab if there's a newline and the parent wishes the child indented.
            if (
                field &&
                (field.indent === true ||
                    (field.indent instanceof Function &&
                        field.indent(parent, child) === true)) &&
                currentPrecedingSpace.indexOf('\n') >= 0
            )
                preferredSpace = preferredSpace + '\t';

            // Move to the next parent.
            child = parent;
            parent = root.getParent(parent);
        }
        return preferredSpace;
    }

    /**
     * Creates a new set of spaces with the same mapping, but replacing the space for the first token of the
     * replaced node with the first token of the replacement node.
     */
    withReplacement(replaced: Node, replacement: Node | undefined) {
        // Find the first leaf of the replaced token
        const replacedToken = replaced.getFirstLeaf() as Token | undefined;

        // Get the next token after the replaced node.
        const lastTokenOfReplaced = replaced.leaves().at(-1) as
            | Token
            | undefined;
        const nextToken = lastTokenOfReplaced
            ? this.root.getNextToken(lastTokenOfReplaced, 1)
            : undefined;

        // Find the first leaf of the replacement, or if it's being removed (i.e., replacement is undefined), the token after the replaced node.
        const replacementToken =
            replacedToken === undefined
                ? undefined
                : replacement
                ? (replacement.getFirstLeaf() as Token | undefined)
                : nextToken;

        // Get the space prior to the replaced token.
        const space =
            replacedToken !== undefined
                ? this.#spaces.get(replacedToken)
                : undefined;

        // If replacing with nothing, get the space after the replacement so we can preserve it.
        const after =
            replacement !== undefined || nextToken === undefined
                ? undefined
                : this.#spaces.get(nextToken);

        // If we found all of the above, then construct new spaces with the replacement.
        if (replacedToken && replacementToken && space !== undefined) {
            const newSpaces = new Map(this.#spaces);
            newSpaces.set(replacementToken, space + (after ?? ''));
            if (replacedToken !== replacementToken)
                newSpaces.delete(replacedToken);

            return new Spaces(this.root, newSpaces);
        }
        // Otherwise, just return the space as is.
        else return this;
    }

    /** Create a new space mapping that sets the space before the given token to the specified space. */
    withSpace(token: Node, space: string) {
        // Find the first leaf of the given node (possiblity the node itself.)
        const firstToken = token.getFirstLeaf() as Token | undefined;

        // Silently fail if there is no first token.
        if (firstToken === undefined) return this;

        // Create a new mapping with space before the first token.
        const newSpaces = new Map(this.#spaces);
        newSpaces.set(firstToken, space);
        return new Spaces(this.root, newSpaces);
    }

    /** Create a version of space with preferred space for all tokens. (Pretty print). */
    withPreferredSpace(source: Source) {
        const newSpace = new Spaces(this.root, this.#spaces);
        for (const token of source.getTokens()) {
            newSpace.#spaces.set(
                token,
                this.getPreferredTokenSpace(source, token)
            );
        }
        return newSpace;
    }

    /** Create a version of this that pretty prints the given node */
    withPreferredSpaceForNode(source: Source, node: Node) {
        const newSpace = new Spaces(this.root, this.#spaces);
        for (const token of node
            .nodes()
            .filter((n): n is Token => n instanceof Token)) {
            newSpace.#spaces.set(
                token,
                this.getPreferredTokenSpace(source, token)
            );
        }
        return newSpace;
    }

    getPreferredTokenSpace(source: Source, token: Token) {
        const currentSpace = this.getSpace(token);
        const preferred = Spaces.getPreferredPrecedingSpace(
            source.root,
            currentSpace,
            token
        );
        return currentSpace + this.getAdditionalSpace(token, preferred);
    }

    replace(existing: Token, replacement: Token) {
        const space = this.#spaces.get(existing);
        if (space) {
            this.#spaces.set(replacement, space);
            if (existing !== replacement) this.#spaces.delete(existing);
        }
    }

    withRoot(root: Spacer) {
        return new Spaces(root, this.#spaces);
    }

    withSpaces(spaces: Spaces) {
        const newSpaces: Map<Token, string> = new Map(this.#spaces);
        for (const [token, space] of spaces.#spaces)
            newSpaces.set(token, space);

        return new Spaces(this.root, newSpaces);
    }
}
