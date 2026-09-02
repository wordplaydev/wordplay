import Node, { ListOf } from '@nodes/Node';
import Program from '@nodes/Program';
import type Root from '@nodes/Root';
import type Source from '@nodes/Source';
import type Spaces from '@parser/Spaces';
import getPreferredSpaces from '@parser/getPreferredSpaces';

/**
 * A contiguous run of sibling nodes: two or more adjacent elements of one
 * list-valued field of one parent. This is the only shape a multiple node
 * selection can take, which is what makes every operation on one well-defined
 * (a run can be deleted, copied as one span of text, wrapped in one container,
 * and dropped into another list).
 */
export type SiblingRange = {
    parent: Node;
    field: string;
    /** The parent's live list, by identity — what `Node.replace` matches on. */
    list: Node[];
    /** Inclusive indices into `list`, always start <= end. */
    start: number;
    end: number;
};

/**
 * The run spanning two nodes, or undefined if they aren't siblings in the same
 * list field. The single place the multiple-selection invariant is defined;
 * everything that consumes a selection asks here rather than re-deriving it.
 */
export function getSiblingRange(
    root: Root,
    a: Node,
    b: Node,
): SiblingRange | undefined {
    const parent = root.getParent(a);
    if (parent === undefined || parent !== root.getParent(b)) return undefined;

    const field = root.getContainingParentList(a);
    if (field === undefined || field !== root.getContainingParentList(b))
        return undefined;

    const list = parent.getField(field);
    if (!Array.isArray(list)) return undefined;

    const first = list.indexOf(a);
    const second = list.indexOf(b);
    if (first < 0 || second < 0) return undefined;

    return {
        parent,
        field,
        list,
        start: Math.min(first, second),
        end: Math.max(first, second),
    };
}

/** The nodes a range covers, in document order. */
export function nodesInRange(range: SiblingRange): Node[] {
    return range.list.slice(range.start, range.end + 1);
}

/**
 * The node's neighbor in its list field, or undefined if it has none in that
 * direction (or isn't in a list at all). Model-based, so extending a selection
 * doesn't depend on anything being rendered.
 */
export function siblingOf(
    root: Root,
    node: Node,
    direction: -1 | 1,
): Node | undefined {
    const parent = root.getParent(node);
    const field = root.getContainingParentList(node);
    if (parent === undefined || field === undefined) return undefined;
    const list = parent.getField(field);
    if (!Array.isArray(list)) return undefined;
    const index = list.indexOf(node);
    if (index < 0) return undefined;
    return list[index + direction];
}

/**
 * The list kind governing the range's field, which says what may go in it.
 * A ListOf enumerates its ITEM kinds rather than itself, so it's checked directly
 * before enumerating to find a list inside a union of kinds.
 */
export function listKindOf(range: SiblingRange): ListOf | undefined {
    const kind = range.parent.getFieldOfChild(range.list[range.start])?.kind;
    if (kind === undefined) return undefined;
    if (kind instanceof ListOf) return kind;
    return kind
        .enumerateFieldKinds()
        .find((each): each is ListOf => each instanceof ListOf);
}

/** Whether removing the run would leave a list the grammar won't accept empty. */
export function rangeIsRemovable(range: SiblingRange): boolean {
    const kind = listKindOf(range);
    if (kind === undefined) return false;
    const remaining = range.list.length - (range.end - range.start + 1);
    return remaining > 0 || kind.allowsEmpty;
}

/**
 * A source without the run, in one clone of the parent rather than one per node.
 *
 * The space rule is the reason this exists: `Spaces.withReplacement` concatenates
 * the space before a removed node onto the space after it, so removing K nodes one
 * at a time accumulates K line breaks that `getPreferredSpaces` will never take
 * back (it only ever adds them). Here the node following the run simply inherits
 * the run's leading space, which is right whether the run was a set of statements
 * on their own lines or a few values inline.
 */
export function withoutRunIn(
    expression: Program,
    spaces: Spaces,
    range: SiblingRange,
): { expression: Program; spaces: Spaces; parent: Node } | undefined {
    const { parent, list, start, end } = range;
    const newList = [...list.slice(0, start), ...list.slice(end + 1)];

    const newParent = parent.replace(list, newList, 'silent');
    // A refused replacement returns the parent unchanged, which would silently
    // drop the edit rather than report it.
    if (newParent === parent) return undefined;

    // Replacing a node inside itself is a no-op, so when the run's parent IS the
    // program (e.g. removing borrows), the new parent is the new program.
    const newExpression =
        parent === expression && newParent instanceof Program
            ? newParent
            : expression.replace(parent, newParent);

    // Hand the run's leading space to whatever followed it, so the gap the run
    // occupied closes to exactly one gap.
    const following = list[end + 1];
    return {
        expression: newExpression,
        spaces:
            following === undefined
                ? spaces
                : spaces.withSpace(following, spaces.getSpace(list[start])),
        parent: newParent,
    };
}

export function withoutRun(
    source: Source,
    range: SiblingRange,
): { source: Source; position: number } | undefined {
    const { list, start, end } = range;
    const removed = withoutRunIn(source.expression, source.spaces, range);
    if (removed === undefined) return undefined;
    const newParent = removed.parent;

    let newSource = source.withProgram(removed.expression, removed.spaces);
    newSource = newSource.withSpaces(
        getPreferredSpaces(newParent, newSource.spaces),
    );

    // Where the caret belongs is measured in the NEW source: reformatting moves
    // every index, so the run's old start would land somewhere else. Surviving
    // siblings keep their identity through the splice, so they can be asked.
    const before = list[start - 1];
    const after = list[end + 1];
    const position =
        (before !== undefined
            ? newSource.getNodeLastPosition(before)
            : undefined) ??
        (after !== undefined
            ? newSource.getNodeFirstPosition(after)
            : undefined) ??
        newSource.getNodeFirstPosition(newParent) ??
        0;

    return { source: newSource, position };
}
