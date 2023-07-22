import type { Edit } from '../components/editor/util/Commands';
import type Node from '@nodes/Node';
import type LanguageCode from '@locale/LanguageCode';
import type Context from '@nodes/Context';
import type Source from '@nodes/Source';
import type Spaces from '@parser/Spaces';
import type Locale from '@locale/Locale';
import type Markup from '../nodes/Markup';

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
    abstract isCompletion(): boolean;

    /** Create the edit to be processed by Editor. */
    abstract getEdit(lang: LanguageCode[]): Edit | undefined;

    abstract getDescription(translation: Locale): Markup;

    /** Gets the node to be added, removed, inserted, etc. */
    abstract getNewNode(lang: LanguageCode[]): Node | undefined;

    /** Gets the added or removed node, and the revised node, which incorporates the new node. May be the same node. Used for the actual edit, but also for previews. */
    abstract getEditedNode(lang: LanguageCode[]): [Node, Node];

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
