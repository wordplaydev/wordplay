import type { Edit } from '../components/editor/util/Commands';
import type Node from '@nodes/Node';
import type LanguageCode from '@translation/LanguageCode';
import type Context from '@nodes/Context';
import type Source from '@nodes/Source';
import type Spaces from '../parser/Spaces';
import type Translation from '@translation/Translation';
import type { Description } from '@translation/Translation';

export default abstract class Transform {
    readonly context: Context;

    constructor(context: Context) {
        this.context = context;
    }

    abstract getEdit(lang: LanguageCode[]): Edit | undefined;
    abstract getDescription(translation: Translation): Description;

    /** Gets the node to be added, removed, inserted, etc. */
    abstract getNewNode(lang: LanguageCode[]): Node | undefined;

    /** Gets the added or removed node, and the revised node, which incorporates the new node. May be the same node. Used for the actual edit, but also for previews. */
    abstract getEditedNode(lang: LanguageCode[]): [Node | undefined, Node];

    abstract equals(transform: Transform): boolean;

    static splitSpace(source: Source, position: number, newNode: Node): Spaces {
        const tokenAfter = source.getTokenAt(position);
        let newSpaces = source.spaces;
        if (tokenAfter !== undefined) {
            const spaceAfter = source.spaces.getSpace(tokenAfter);
            const spaceOffset =
                position - source.getTokenSpacePosition(tokenAfter);
            const newSpaceBefore = spaceAfter.substring(0, spaceOffset);
            const newSpaceAfter = spaceAfter.substring(spaceOffset);
            newSpaces = newSpaces
                .withSpace(newNode, newSpaceBefore)
                .withSpace(tokenAfter, newSpaceAfter);
        }
        return newSpaces;
    }
}
