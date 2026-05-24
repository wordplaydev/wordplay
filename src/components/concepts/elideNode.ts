import type Locales from '@locale/Locales';
import type Markup from '@nodes/Markup';
import type Node from '@nodes/Node';
import type Type from '@nodes/Type';
import UnionType from '@nodes/UnionType';

/**
 * A truncated form of a Node plus a localized phrase to render after it
 * (e.g. "or 57 other options"). Callers receive `null` when no elision
 * applies and should render the original Node directly.
 */
export type Elision = { preview: Node; suffix: Markup };

/**
 * Decide whether `node` is "too long" to render in full inside a description,
 * conflict explanation, autocomplete tooltip, or resolution text, and if so,
 * return a shorter preview Node plus a localized suffix to render after it.
 *
 * Dispatched on Node subclass. Returns `null` when no elision applies.
 *
 * # Extending
 *
 * Each per-class strategy is a `(node, locales) => Elision | null` helper that:
 *   1. Inspects a Node's structural payload (member count, statement count, …).
 *   2. Returns null when the payload is under its threshold.
 *   3. Otherwise builds a smaller Node of the same kind (using the type's
 *      existing `.make(...)` static) and a Markup suffix concretized from a
 *      locale template whose key follows the convention
 *      `node.<TypeName>.elidedSuffix`.
 *
 * Candidates that would slot in cleanly if they ever appear as long NodeRefs:
 *   - Block with many statements
 *   - ListLiteral / SetLiteral / MapLiteral / TableLiteral with many items
 *   - StructureDefinition / FunctionDefinition with many definitions
 *
 * These are NOT implemented today — none of them currently embed their
 * children directly in `getDescription` output (all use counts/names in
 * locale templates), so they don't produce the kind of explosion UnionType
 * does. Add them only when a real long-render hotspot appears.
 */
export default function elideNode(
    node: Node,
    locales: Locales,
): Elision | null {
    if (node instanceof UnionType) return elideUnion(node, locales);
    return null;
}

// ---- UnionType strategy ----------------------------------------------------

export const UNION_ELISION_THRESHOLD = 5;
export const UNION_ELISION_PREVIEW_COUNT = 3;

function elideUnion(union: UnionType, locales: Locales): Elision | null {
    const members = flattenUnionMembers(union);
    if (members.length <= UNION_ELISION_THRESHOLD) return null;

    const preview = buildUnion(members.slice(0, UNION_ELISION_PREVIEW_COUNT));
    const suffix = locales.concretize(
        (l) => l.node.UnionType.elidedSuffix,
        { omitted: members.length - UNION_ELISION_PREVIEW_COUNT },
    );
    return { preview, suffix };
}

/** Flatten a UnionType's binary `left | right` tree to its leaf members. */
function flattenUnionMembers(union: UnionType): Type[] {
    const out: Type[] = [];
    const walk = (t: Type) => {
        if (t instanceof UnionType) {
            walk(t.left);
            walk(t.right);
        } else out.push(t);
    };
    walk(union);
    return out;
}

/** Right-fold members into a binary UnionType: A, B, C → A | (B | C). */
function buildUnion(members: Type[]): UnionType {
    let result: Type = members[members.length - 1];
    for (let i = members.length - 2; i >= 0; i--) {
        result = UnionType.make(members[i], result);
    }
    return result instanceof UnionType
        ? result
        : UnionType.make(result, result);
}
