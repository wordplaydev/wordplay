/** Functions and helper functions for formatting the preceding space of tokens (aka "pretty printing"). */
import Node from '@nodes/Node';
import Root from '@nodes/Root';
import type Token from '@nodes/Token';
import Spaces from './Spaces';
import TokenList from './TokenList';
import Source from '@nodes/Source';

/**
 * Given a node, and optional root for the node, and optional current spacing for the node and its children,
 * return a revised Spaces that formats the node's spacing according to the nodes' formatting rules.
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

    // Go through each leave of the requested node and format its spacing according to its formatting preferences.
    for (const token of root.root.leaves()) {
        // Find the ancestor of the token that determines its spacing.
        const spaceRoot = root.getSpaceRoot(token);
        // Find the field of the ancestor to see what kind of spacing it wants.
        const field = spaceRoot
            ? root.getParent(spaceRoot)?.getFieldOfChild(spaceRoot)
            : undefined;
        if (field) {
            // Start with the current spacing, if it has any.
            let revisedSpace = preferredSpaces.get(token) ?? '';

            // Figure out the depth of the token, to determine indentation.
            const depth = root.getDepth(token);

            // To start, needs a newline and space if the field says so.
            const newlinesNeeded = field.double ? 2 : field.newline ? 1 : 0;
            const newlinesIncluded = revisedSpace.split('\n').length - 1;
            const indentsNeeded =
                newlinesNeeded === 0 && newlinesIncluded === 0 ? 0 : depth;

            const list = spaceRoot
                ? root.getParent(spaceRoot)?.getField(field.name)
                : undefined;
            const isFirstInList = Array.isArray(list) && list[0] === spaceRoot;
            const spacesNeeded =
                newlinesNeeded === 0 &&
                (field.space === true ||
                    (field.space instanceof Function && field.space(token))) &&
                !isFirstInList
                    ? 1
                    : 0;

            revisedSpace =
                newlinesNeeded > 0 || newlinesIncluded > 0
                    ? // Keep any extra newlines
                      '\n'.repeat(Math.max(newlinesNeeded, newlinesIncluded)) +
                      '\t'.repeat(indentsNeeded)
                    : ' '.repeat(spacesNeeded);

            // Set the revised space.
            preferredSpaces.set(token, revisedSpace);
        }
    }

    // Return a spaces object with the preferred spaces
    return spaces
        ? new Spaces(spaces.root, preferredSpaces)
        : new TokenList(root.root.nodes(), preferredSpaces).getSpaces();
}

export function getFormattedWordplay(node: Node) {
    return node.toWordplay(getPreferredSpaces(node));
}
