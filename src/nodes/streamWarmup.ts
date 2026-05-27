import type Context from '@nodes/Context';
import Evaluate from '@nodes/Evaluate';
import type Expression from '@nodes/Expression';
import StreamDefinition from '@nodes/StreamDefinition';
import type Evaluator from '@runtime/Evaluator';
import Initialize from '@runtime/Initialize';
import type Step from '@runtime/Step';

/**
 * Compile steps that pre-evaluate every stream-creating call found inside
 * the given subtrees, popping each value off the stack. Used by Match and
 * Conditional so that streams referenced in branches that aren't chosen on
 * first evaluation are still instantiated — otherwise short-circuiting
 * bytecode would leave them uncreated and the program would have nothing
 * to react to. Stream creators are idempotent: see Evaluate.evaluate() for
 * the StreamDefinitionValue path. Nested branching may emit warmup for the
 * same creator more than once, which is wasteful but harmless.
 */
export default function compileStreamWarmup(
    owner: Expression,
    evaluator: Evaluator,
    context: Context,
    subtrees: Expression[],
): Step[] {
    const seen = new Set<Evaluate>();
    const creators: Evaluate[] = [];
    for (const subtree of subtrees) {
        for (const n of subtree.nodes()) {
            if (
                n instanceof Evaluate &&
                !seen.has(n) &&
                n.getFunction(context) instanceof StreamDefinition
            ) {
                seen.add(n);
                creators.push(n);
            }
        }
    }
    return creators.flatMap((e) => [
        ...e.compile(evaluator, context),
        new Initialize(owner, (ev) => {
            ev.popValue(owner);
            return undefined;
        }),
    ]);
}
