import FunctionType from '#nodes/FunctionType.ts';
import NameType from '#nodes/NameType.ts';
import type Context from '#nodes/Context.ts';
import ListType from '#nodes/ListType.ts';
import MapType from '#nodes/MapType.ts';
import type Node from '#nodes/Node.ts';
import SetType from '#nodes/SetType.ts';
import type Type from '#nodes/Type.ts';
import UnionType from '#nodes/UnionType.ts';
import UnknownType from '#nodes/UnknownType.ts';
import UnparsableExpression from '#nodes/UnparsableExpression.ts';
import UnparsableType from '#nodes/UnparsableType.ts';

/**
 * How one mistake is kept from being reported as many.
 *
 * A conflict that follows from another says nothing its cause didn't, and a creator who
 * sees thirty conflicts for one missing character can't tell which one to fix. So a check
 * that would judge code by something already known to be wrong asks here first, and stays
 * quiet when what it would judge is damaged, leaving the one conflict that names the cause.
 */

/**
 * True if a type is unknown, or is built from one that is. A list of things one of which
 * couldn't be parsed has no item type worth holding its uses to.
 */
export function isUnknowable(
    type: Type | undefined,
    context?: Context,
): boolean {
    if (type === undefined) return false;
    if (type instanceof UnknownType || type instanceof UnparsableType)
        return true;
    // A name for a type that isn't defined, which only a context can say.
    if (type instanceof NameType)
        return context !== undefined && type.resolve(context) === undefined;
    if (type instanceof UnionType)
        return (
            isUnknowable(type.left, context) ||
            isUnknowable(type.right, context)
        );
    // A function that takes or gives something unknown.
    if (type instanceof FunctionType)
        return (
            isUnknowable(type.output, context) ||
            type.inputs.some((input) => isUnknowable(input.type, context))
        );
    if (type instanceof ListType)
        return type.types.some((item) => isUnknowable(item, context));
    if (type instanceof SetType) return isUnknowable(type.key, context);
    if (type instanceof MapType)
        return (
            isUnknowable(type.key, context) || isUnknowable(type.value, context)
        );
    return false;
}

const damaged = new WeakMap<Node, boolean>();

/**
 * True if code holds something that couldn't be parsed or was never closed, which means
 * where its parts begin and end was a guess. Remembered per node, since nodes never change
 * and every use of a damaged definition asks.
 */
export function isDamaged(node: Node): boolean {
    let answer = damaged.get(node);
    if (answer === undefined) {
        answer = node
            .nodes()
            .some(
                (part) =>
                    part instanceof UnparsableExpression ||
                    part instanceof UnparsableType ||
                    ('open' in part &&
                        'close' in part &&
                        part.open !== undefined &&
                        part.close === undefined),
            );
        damaged.set(node, answer);
    }
    return answer;
}
