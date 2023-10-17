import type { Edit } from '../components/editor/util/Commands';
import type Node from '@nodes/Node';
import type Context from '@nodes/Context';
import type Source from '@nodes/Source';
import type Spaces from '@parser/Spaces';
import type Markup from '../nodes/Markup';
import type Locales from '../locale/Locales';

export default abstract class Revision {
    readonly context: Context;

    constructor(context: Context) {
        this.context = context;
    }

    /** True if the revision will insert some named thing (e.g., a Refer) */
    abstract isReference(): boolean;

    /** True if the revision removes something */
    abstract isRemoval(): boolean;

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
