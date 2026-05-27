import type Context from '@nodes/Context';
import Expression from '@nodes/Expression';
import type Type from '@nodes/Type';

/**
 * A candidate root for fixing a type error. Returned by {@link walkTypeSources}:
 * the offending expression itself first, then expressions it depends on (so a
 * `ListAccess` is followed by the `ListLiteral` it reads from, a `Reference` is
 * followed by the `Bind`'s value expression it resolves to, and so on).
 *
 * Used by {@link makeTypeResolutions} to try edits at each potential root,
 * since the right place to fix a type error is often deeper than the symptom
 * site — `Phrase('hi' face: ['Helvetica' 'Arial'][1])` reports the error on
 * the access, but the only edit that resolves it (`!`) lives on the inner list.
 */
export type TypeSource = { node: Expression; type: Type };

/** Bounded depth keeps the walk cheap on programs with deep dependency graphs. */
const MAX_DEPTH = 4;

/**
 * Walk an expression's type-source dependencies in BFS order, deduping by node
 * id. The walk follows `Expression.getDependencies(context)`, which for a
 * Reference returns its resolved Bind's value, for a ListAccess returns its
 * list and index, etc.
 */
export default function walkTypeSources(
    given: Expression,
    context: Context,
): TypeSource[] {
    const results: TypeSource[] = [];
    const visited = new Set<number>();
    const queue: Array<{ node: Expression; depth: number }> = [
        { node: given, depth: 0 },
    ];
    while (queue.length > 0) {
        const head = queue.shift();
        if (head === undefined) break;
        const { node, depth } = head;
        if (visited.has(node.id)) continue;
        visited.add(node.id);
        try {
            results.push({ node, type: node.getType(context) });
        } catch {
            // getType can throw on partially-constructed trees; skip those.
        }
        if (depth >= MAX_DEPTH) continue;
        for (const dep of node.getDependencies(context)) {
            if (dep instanceof Expression && !visited.has(dep.id))
                queue.push({ node: dep, depth: depth + 1 });
        }
    }
    return results;
}
