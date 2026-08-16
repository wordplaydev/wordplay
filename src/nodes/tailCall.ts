import Block from '@nodes/Block';
import Conditional from '@nodes/Conditional';
import type Context from '@nodes/Context';
import type Evaluate from '@nodes/Evaluate';
import FunctionDefinition from '@nodes/FunctionDefinition';
import type Node from '@nodes/Node';

/**
 * True if the call's value is necessarily the value of the nearest enclosing
 * function evaluation, so the evaluator may replace the function's frames with
 * the call's frame instead of growing the call stack. Decided statically from
 * the AST so that every evaluation — including time-travel replays, which
 * re-execute the program — makes the identical choice.
 */
export function isTailCall(call: Evaluate, context: Context): boolean {
    const root = context.getRoot(call);
    if (root === undefined) return false;

    let current: Node = call;
    let parent = root.getParent(current);
    while (parent !== undefined) {
        // The function's body: the call's value is the function's value.
        if (parent instanceof FunctionDefinition)
            return current === parent.expression;
        // A conditional's value is either branch's value, never the condition's.
        else if (parent instanceof Conditional) {
            if (current !== parent.yes && current !== parent.no) return false;
        }
        // A block's value is its last statement's value only when that statement
        // is the block's sole result; with multiple results, collect() builds a
        // list from all of them, so no single statement is in tail position.
        else if (parent instanceof Block) {
            const results = parent.getResultStatements();
            if (
                parent.statements[parent.statements.length - 1] !== current ||
                results.length !== 1 ||
                results[0] !== current
            )
                return false;
        }
        // Any other parent consumes or transforms the value; not a tail position.
        else return false;
        current = parent;
        parent = root.getParent(current);
    }
    return false;
}
