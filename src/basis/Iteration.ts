import type LocaleText from '@locale/LocaleText';
import ValueException from '@values/ValueException';
import type { NodeDescriptor } from '@locale/NodeTexts';
import Check from '@runtime/Check';
import Evaluation from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import Initialize from '@runtime/Initialize';
import Internal from '@runtime/Internal';
import Next from '@runtime/Next';
import Start from '@runtime/Start';
import type Step from '@runtime/Step';
import { Purpose } from '@concepts/Purpose';
import type Locales from '@locale/Locales';
import Characters from '../lore/BasisCharacters';
import AnyType from '@nodes/AnyType';
import type Context from '@nodes/Context';
import Expression from '@nodes/Expression';
import FunctionDefinition from '@nodes/FunctionDefinition';
import FunctionType from '@nodes/FunctionType';
import type Names from '@nodes/Names';
import type { Grammar } from '@nodes/Node';
import type Type from '@nodes/Type';
import type TypeSet from '@nodes/TypeSet';
import FunctionValue from '@values/FunctionValue';
import Value from '@values/Value';

const IterationState = 'state';

type CheckHandler<State, ExpressionKind extends Expression> = (
    evaluator: Evaluator,
    tracking: State,
    expression: ExpressionKind,
) => Value | boolean;

type NextHandler<Kind, ExpressionKind extends Expression> = (
    evaluator: Evaluator,
    tracking: Kind,
    expression: ExpressionKind,
) => Value | boolean | undefined;

type FinishHandler<Kind, ExpressionKind extends Expression> = (
    evaluator: Evaluator,
    tracking: Kind,
    expression: ExpressionKind,
) => Value;

/**
 * What an iteration does at each step. Declared as methods on purpose: method
 * parameters compare bivariantly, so an `Iteration<State>` is assignable to
 * the `Iteration<unknown>` that the evaluator's node unions name, without the
 * state type having to be `any`.
 */
export type IterationHandlers<State> = {
    /** The initial tracking state, or an exception value to halt with. */
    initialize(
        evaluator: Evaluator,
        expression: Iteration<State>,
    ): State | Value;
    check(
        evaluator: Evaluator,
        tracking: State,
        expression: Iteration<State>,
    ): Value | boolean;
    next(
        evaluator: Evaluator,
        tracking: State,
        expression: Iteration<State>,
    ): Value | boolean | undefined;
    finish(
        evaluator: Evaluator,
        tracking: State,
        expression: Iteration<State>,
    ): Value;
};

export class Iteration<State = unknown> extends Expression {
    readonly output: Type;
    readonly handlers: IterationHandlers<State>;

    constructor(
        output: Type,
        initialize: (
            evaluator: Evaluator,
            expression: Iteration<State>,
        ) => State | Value,
        check: CheckHandler<State, Iteration<State>>,
        next: NextHandler<State, Iteration<State>>,
        finish: FinishHandler<State, Iteration<State>>,
    ) {
        super();

        this.output = output;
        this.handlers = { initialize, check, next, finish };
    }

    isInternal() {
        return true;
    }

    getDescriptor(): NodeDescriptor {
        return 'Iteration';
    }

    getGrammar(): Grammar {
        return [];
    }

    getPurpose() {
        return Purpose.Hidden;
    }

    computeType() {
        return this.output;
    }

    compile(): Step[] {
        return [
            new Start(this),
            ...getIteration(
                this,
                this.handlers.initialize,
                this.handlers.check,
                this.handlers.next,
            ),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;
        // Get the resulting state and pass it.
        const state = getIterationResult<State>(evaluator);
        if (state === undefined) return new ValueException(evaluator, this);
        // Do whatever we were requested to do with the resulting state.
        const value = this.handlers.finish(evaluator, state, this);
        // Return the value returned by the finisher.
        return value;
    }

    /** Create bindings for a function evaluation. If a value is undefined, it's not set. */
    createBinds(pairs: [Names | undefined, Value | undefined][]) {
        const bindings = new Map<Names, Value>();
        for (const [names, value] of pairs)
            if (names !== undefined && value !== undefined)
                bindings.set(names, value);
        return bindings;
    }

    /** Given an evaluator, get the binds of the inputs passed into the function. */
    getInputBinds(evaluator: Evaluator) {
        const fun = evaluator.getCurrentEvaluation()?.getDefinition();
        return fun instanceof FunctionDefinition ? fun.inputs : undefined;
    }

    /** Get the value of an input by index */
    getInput(index: number, evaluator: Evaluator) {
        const names = this.getInputBinds(evaluator)?.[index]?.names;
        if (names === undefined) return undefined;
        return evaluator.resolve(names);
    }

    getFunctionInput(
        index: number,
        evaluator: Evaluator,
    ): [FunctionValue, FunctionDefinition] | [undefined, undefined] {
        const fun = this.getInput(index, evaluator);
        return fun instanceof FunctionValue
            ? [fun, fun.definition]
            : [undefined, undefined];
    }

    evaluateFunctionInput(
        evaluator: Evaluator,
        input: number,
        values: Value[],
        fallback?: FunctionDefinition,
    ) {
        let [funVal, fun] = this.getFunctionInput(input, evaluator);
        if (fun === undefined) {
            fun = fallback;
            funVal = undefined;
        }
        if (fun === undefined || fun.expression === undefined) {
            const currentFunction = evaluator
                .getCurrentEvaluation()
                ?.getDefinition();
            return evaluator.getValueOrTypeException(
                this,
                (currentFunction instanceof FunctionDefinition
                    ? currentFunction.inputs[input]?.type
                    : undefined) ??
                    FunctionType.make(undefined, [], new AnyType()),
                funVal,
            );
        }
        // Apply the translator function to the value
        evaluator.startEvaluation(
            new Evaluation(
                evaluator,
                this,
                fun,
                funVal?.context,
                this.createBinds(
                    fun.inputs.map((input, index) => {
                        return [input.names, values[index]];
                    }),
                ),
            ),
        );
        return true;
    }

    computeConflicts() {
        return [];
    }

    // We don't clone these, we just erase their parent, since there's only one of them.
    clone() {
        return this;
    }

    evaluateTypeGuards(current: TypeSet) {
        return current;
    }

    getDependencies(context: Context): Expression[] {
        // Higher order functions expressions depend on the inputs of their FunctionDefinitions.
        const parent = this.getParent(context);
        return parent instanceof FunctionDefinition ? parent.inputs : [];
    }

    isConstant() {
        return false;
    }

    getStart() {
        return this;
    }

    getFinish() {
        return this;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Iteration;
    getLocalePath() {
        return Iteration.LocalePath;
    }

    getStartExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.Iteration.start);
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return locales.concretize((l) => l.node.Iteration.finish, {
            value: this.getValueIfDefined(locales, context, evaluator),
        });
    }

    getCharacter() {
        return Characters.FunctionDefinition;
    }
}

export function getIteration<Kind, ExpressionKind extends Expression>(
    expression: ExpressionKind,
    initialize: (
        evaluator: Evaluator,
        expression: ExpressionKind,
    ) => Kind | Value,
    check: CheckHandler<Kind, ExpressionKind>,
    next: NextHandler<Kind, ExpressionKind>,
) {
    return [
        // Initialize a keep list and a counter as we iterate through the rows.
        new Initialize(expression, (evaluator) => {
            // Start a new scope for the local values we track.
            evaluator.getCurrentEvaluation()?.scope();
            // Get the initial tracking state
            const state = initialize(evaluator, expression);
            // If there was an exception, return it.
            if (state instanceof Value) return state;
            // Otherwise, set it, and return nothing, so the evaluator continues.
            evaluator.bind(IterationState, new Internal(expression, state));
        }),
        // See if we should handle a next value or skip to the end.
        new Check(expression, (evaluator) => {
            // Get the tracking value.
            const tracking = evaluator.resolve(IterationState);
            if (!(tracking instanceof Internal))
                return new ValueException(evaluator, expression);
            // sound: the binding was made by this iteration's own Initialize.
            const state = tracking.value as Kind;
            // Handle the next
            const result = check(evaluator, state, expression);
            // If the result is a value (likely an exception), return it
            if (result instanceof Value) return result;
            // Jump to finish if the check was false.
            if (result === false) evaluator.jump(1);
            // Return nothing, telling the evaluator to continue.
            return undefined;
        }),
        // Process the next value, then loop back to the check.
        new Next(expression, (evaluator) => {
            // Get the tracking value.
            const tracking = evaluator.resolve(IterationState);
            if (!(tracking instanceof Internal))
                return new ValueException(evaluator, expression);
            // sound: the binding was made by this iteration's own Initialize.
            const state = tracking.value as Kind;
            // Handle the check
            const value = next(evaluator, state, expression);
            if (value instanceof Value) return value;
            // Return to next if we're not done.
            if (value === undefined) evaluator.jump(-2);
            // Return a value if there was one.
            return undefined;
        }),
    ];
}

/** The iteration's tracked state, or undefined if none was bound. */
export function getIterationResult<Kind>(
    evaluator: Evaluator,
): Kind | undefined {
    const tracking = evaluator.resolve(IterationState);
    evaluator.getCurrentEvaluation()?.unscope();
    if (!(tracking instanceof Internal)) return undefined;
    // sound: the binding was made by this iteration's own Initialize.
    return tracking.value as Kind;
}
