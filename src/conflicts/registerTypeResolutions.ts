/**
 * Registers type-mismatch conflict resolvers in the shared registry on
 * `Conflict`. This file is loaded as a top-level side effect:
 *
 * - Tests: imported by `vitest.config.ts` via `setupFiles`.
 * - App: side-effect-imported by `src/routes/+layout.svelte`.
 *
 * Loading order matters: this file imports a slew of node classes that
 * themselves import the conflict classes. Routing resolution through the
 * registry instead of having each conflict file import resolution code
 * directly breaks the conflict↔node module cycle.
 *
 * No code anywhere else should import this file.
 */

import BooleanType from '@nodes/BooleanType';
import Evaluate from '@nodes/Evaluate';
import Expression from '@nodes/Expression';
import Input from '@nodes/Input';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import { registerResolver } from '@conflicts/Conflict';
import { makeTypeResolutions } from '@conflicts/TypeResolutions';
import IncompatibleType from '@conflicts/IncompatibleType';
import IncompatibleInput from '@conflicts/IncompatibleInput';
import { IncompatibleKey } from '@conflicts/IncompatibleKey';
import IncompatibleCellType from '@conflicts/IncompatibleCellType';
import ExpectedBooleanCondition from '@conflicts/ExpectedBooleanCondition';
import MissingInput from '@conflicts/MissingInput';
import NodeRef from '@locale/NodeRef';

registerResolver(IncompatibleType, (c, context) =>
    makeTypeResolutions(
        c.expression,
        c.givenType,
        c.expectedType,
        context,
        IncompatibleType.LocalePath,
    ),
);

registerResolver(IncompatibleInput, (c, context) => {
    // The conflict's `givenNode` may be an `Input` wrapping the actual value
    // expression; unwrap to reach the expression for the type-source walk.
    const expr =
        c.givenNode instanceof Input
            ? c.givenNode.value
            : c.givenNode instanceof Expression
              ? c.givenNode
              : undefined;
    if (expr === undefined) return [];
    return makeTypeResolutions(
        expr,
        c.givenType,
        c.expectedType,
        context,
        IncompatibleInput.LocalePath,
    );
});

registerResolver(IncompatibleKey, (c, context) =>
    makeTypeResolutions(
        c.access.key,
        c.received,
        c.expected,
        context,
        IncompatibleKey.LocalePath,
    ),
);

registerResolver(IncompatibleCellType, (c, context) => {
    if (!(c.cell instanceof Expression)) return [];
    return makeTypeResolutions(
        c.cell,
        c.received,
        c.expected,
        context,
        IncompatibleCellType.LocalePath,
    );
});

registerResolver(ExpectedBooleanCondition, (c, context) =>
    makeTypeResolutions(
        c.conditional.condition,
        c.type,
        BooleanType.make(),
        context,
        ExpectedBooleanCondition.LocalePath,
    ),
);

/**
 * Add-missing-required-input resolver for `MissingInput`. Inserts the missing
 * input — using the bind's default `value` if present, else the expected
 * type's default expression, else an `ExpressionPlaceholder` — into a new
 * Evaluate that re-uses the existing tokens (`fun`, `types`, `open`, `close`).
 */
registerResolver(MissingInput, (c, context) => {
    const evaluate = c.evaluate;
    if (!(evaluate instanceof Evaluate)) return [];

    const inputBind = c.input;
    const missingDefault =
        inputBind.value ??
        inputBind.type?.getDefaultExpression?.(context) ??
        ExpressionPlaceholder.make();

    // Append the missing input. Existing inputs preserve their `Input` wrappers
    // (named-input form) if any — we just add the missing one as a positional.
    const appendedInputs: (Expression | Input)[] = [
        ...evaluate.inputs,
        missingDefault,
    ];
    const revisedEvaluate = new Evaluate(
        evaluate.fun,
        evaluate.types,
        evaluate.open,
        appendedInputs,
        evaluate.close,
    );

    const placeheldInputs: (Expression | Input)[] = [
        ...evaluate.inputs,
        ExpressionPlaceholder.make(),
    ];
    const placeheldEvaluate = new Evaluate(
        evaluate.fun,
        evaluate.types,
        evaluate.open,
        placeheldInputs,
        evaluate.close,
    );

    return [
        {
            description: (locales, ctx) =>
                locales.concretize(
                    (l) => MissingInput.LocalePath(l).resolutionAddInput,
                    {
                        input: new NodeRef(inputBind, locales, ctx),
                    },
                ),
            mediator: (ctx) => ({
                newProject: ctx.project.withRevisedNodes([
                    [evaluate, revisedEvaluate],
                ]),
                newNode: revisedEvaluate,
            }),
        },
        {
            description: (locales, ctx) =>
                locales.concretize(
                    (l) => MissingInput.LocalePath(l).resolutionPlaceholder,
                    {
                        input: new NodeRef(inputBind, locales, ctx),
                    },
                ),
            mediator: (ctx) => ({
                newProject: ctx.project.withRevisedNodes([
                    [evaluate, placeheldEvaluate],
                ]),
                newNode: placeheldEvaluate,
            }),
        },
    ];
});
