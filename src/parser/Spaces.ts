import Token from '../nodes/Token';
import type Node from '../nodes/Node';
import type Root from './Root';
import type Tree from '../nodes/Tree';
import type Source from '../models/Source';

export const TAB_WIDTH = 2;
export const SPACE_HTML = '&middot;';
export const TAB_HTML = '&nbsp;'.repeat(TAB_WIDTH - 1) + '→';

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
    readonly root: Root;

    /**
     * An immutable, private mapping between tokens and preceding space.
     * If a token isn't present, there is no space preceding it.
     * In that sense, this is a sparse representation of non-empty space in a program.
     * */
    readonly #spaces: Map<Token, string>;

    constructor(root: Root, mapping: Map<Token, string>) {
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
        let preferredSpaceChars = preferredSpace.split('');
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
        currentPrecedingSpace: string,
        leafTree: Tree
    ): string {
        // Start from this node, walking up the ancestor tree
        const leaf: Node = leafTree.node;
        const depth = leafTree.getDepth();
        let child: Tree = leafTree;
        let parent = leafTree.parent;
        let preferredSpace = '';
        while (parent) {
            // If the current child's first token is still this, prepend some more space.
            if (child.node.getFirstLeaf() === leaf) {
                // See what space the parent would prefer based on the current space in place.
                preferredSpace =
                    parent.node.getPreferredPrecedingSpace(
                        child.node,
                        currentPrecedingSpace,
                        depth
                    ) + preferredSpace;
                child = parent;
                parent = parent.parent;
            }
            // Otherwise, the child was the last parent that could influence space.
            else break;
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

        // Find the first leaf of the replacement, or if it's being removed (i.e., replacement is undefined), the token after the replaced node.
        const replacementToken =
            replacedToken === undefined
                ? undefined
                : ((replacement
                      ? replacement.getFirstLeaf()
                      : this.root.getNextToken(replacedToken, 1)) as
                      | Token
                      | undefined);

        // Get the space prior to the replaced token.
        const space =
            replacedToken !== undefined
                ? this.#spaces.get(replacedToken)
                : undefined;

        // If we found all of the above, then construct new spaces with the replacement.
        if (replacedToken && replacementToken && space !== undefined) {
            const newSpaces = new Map(this.#spaces);
            newSpaces.set(replacementToken, space);
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
            const tree = source.get(token);
            const currentSpace = newSpace.getSpace(token);
            const preferred = tree
                ? Spaces.getPreferredPrecedingSpace(currentSpace, tree)
                : currentSpace;
            newSpace.#spaces.set(
                token,
                currentSpace + this.getAdditionalSpace(token, preferred)
            );
        }
        return newSpace;
    }

    replace(existing: Token, replacement: Token) {
        const space = this.#spaces.get(existing);
        if (space) {
            this.#spaces.set(replacement, space);
            this.#spaces.delete(existing);
        }
    }

    withRoot(root: Root) {
        return new Spaces(root, this.#spaces);
    }
}
