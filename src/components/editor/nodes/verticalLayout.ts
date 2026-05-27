import type Node from '@nodes/Node';
import type Spaces from '@parser/Spaces';

/** Source length (in characters of the compact representation) above which
    an item is treated as "wide" enough to justify a vertical layout. */
const VERTICAL_WIDTH_THRESHOLD = 40;

/** Decide whether a list of NodeSequenceView items should be laid out as a
    vertical column rather than an inline row. We go vertical if any item:
    - has a newline anywhere in its source (leading or internal — covers both
      explicit user-authored line breaks and items that are themselves
      vertically rendered, which would otherwise inflate the inline row), or
    - has a compact source longer than VERTICAL_WIDTH_THRESHOLD characters,
      which is a coarse stand-in for "would overflow the editor width."
*/
export function isVerticalList(
    items: Node[],
    spaces: Spaces | undefined,
): boolean {
    if (spaces === undefined) return false;
    return items.some(
        (item) =>
            item
                .leaves()
                .some((leaf) => spaces.getSpace(leaf).includes('\n')) ||
            item.toWordplay().length > VERTICAL_WIDTH_THRESHOLD,
    );
}
