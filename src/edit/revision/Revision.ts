import type ConceptIndex from '@concepts/ConceptIndex';
import type Purpose from '@concepts/Purpose';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import Root from '@nodes/Root';
import type Source from '@nodes/Source';
import type Spaces from '@parser/Spaces';
import type { Edit } from '../../components/editor/commands/Commands';
import type Locales from '../../locale/Locales';
import type Markup from '../../nodes/Markup';

export default abstract class Revision {
    /** The node with a field being appended to */
    readonly parent: Node;
    readonly context: Context;

    constructor(parent: Node, context: Context) {
        this.parent = parent;
        this.context = context;
    }

    /** True if the revision will insert some named thing (e.g., a Refer) */
    abstract isReference(): boolean;

    /** True if the revision removes something */
    abstract isRemoval(): boolean;

    /** The list of nodes to be removed */
    abstract getRemoved(): Node[];

    /** True if the revision is a completion */
    abstract isCompletion(locales: Locales): boolean;

    /** Create the edit to be processed by Editor. */
    abstract getEdit(locales: Locales): Edit | undefined;

    abstract getDescription(locales: Locales): Markup;

    /** Gets the node to be added, removed, inserted, etc. */
    abstract getNewNode(locales: Locales): Node | undefined;

    /** Gets the added or removed node, and the revised node, which incorporates the new node. May be the same node. Used for the actual edit, but also for previews. */
    abstract getEditedNode(locales: Locales): [Node, Node];

    abstract equals(transform: Revision): boolean;

    /**
     * Get the node to represent the context of the removal and the list of nodes being removed in that context.
     * These are helpful for rendering a removal preview.
     */
    getRemovalContext(): [Node, Node[]] {
        const parent = this.parent;
        const parentCopy = parent.clone();
        // Not a removal? Return the parent and no removals.
        if (!this.isRemoval()) return [parentCopy, []];
        const removedNodes = this.getRemoved();
        // Not a removal? Return the parent and no removals.
        if (removedNodes.length === 0) return [parentCopy, []];
        // Just one removed node? Just return the node itself, no need to account for multiple nodes being removed.
        if (removedNodes.length === 1) {
            const removal = removedNodes[0].clone();
            return [removal, [removal]];
        }
        // Can't find the root for the parent? We need it to calculate paths, so fail by returning the parent.
        const root = this.context.getRoot(parent);
        if (root === undefined) return [parentCopy, []];
        // There are multiple nodes being removed, so we want to find their paths in the parent copy.
        // Find the paths of the removed nodes in the parent.
        const parentPath = root.getPath(parent);
        const removedPaths = removedNodes.map((n) =>
            root.getPath(n).slice(parentPath.length),
        );
        // Map them back to the copy.
        const parentRoot = new Root(parentCopy);
        const removedCopies = removedPaths
            .map((p) => parentRoot.resolvePath(p))
            .filter((n) => n !== undefined);
        return [parentCopy, removedCopies];
    }

    /** Given a concept index, find the purpose of this revision */
    getPurpose(concepts: ConceptIndex): Purpose | undefined {
        const node = this.getNewNode(concepts.locales);
        if (node) {
            const concept = concepts.getRelevantConcept(node);
            // If the node is an Evaluate, see if the function or structure it refers to has a concept in the concept index, and use it's purpose.
            return concept?.getPurpose() ?? node.getPurpose();
        } else return undefined;
    }

    static splitSpace(source: Source, position: number, newNode: Node): Spaces {
        const tokenAfter = source.getTokenAt(position);
        let newSpaces = source.spaces;
        if (tokenAfter !== undefined) {
            const indexAfter = source.getTokenSpacePosition(tokenAfter);
            if (indexAfter === undefined) return newSpaces;
            const spaceAfter = source.spaces.getSpace(tokenAfter);
            const spaceOffset = position - indexAfter;
            const newSpaceBefore = spaceAfter.substring(0, spaceOffset);
            const newSpaceAfter = spaceAfter.substring(spaceOffset);
            newSpaces = newSpaces
                .withSpace(newNode, newSpaceBefore)
                .withSpace(tokenAfter, newSpaceAfter);
        }
        return newSpaces;
    }
}
