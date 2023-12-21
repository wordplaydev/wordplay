import Purpose from '../concepts/Purpose';
import concretize from '../locale/concretize';
import Glyphs from '../lore/Glyphs';
import AnyType from '../nodes/AnyType';
import type Context from '../nodes/Context';
import Expression from '../nodes/Expression';
import FunctionDefinition from '../nodes/FunctionDefinition';
import FunctionType from '../nodes/FunctionType';
import type Names from '../nodes/Names';
import type { Grammar } from '../nodes/Node';
import type Type from '../nodes/Type';
import type TypeSet from '../nodes/TypeSet';
import Check from '@runtime/Check';
import Evaluation from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import FunctionValue from '../values/FunctionValue';
import Initialize from '@runtime/Initialize';
import Internal from '@runtime/Internal';
import Next from '@runtime/Next';
import Start from '@runtime/Start';
import type Step from '@runtime/Step';
import Value from '../values/Value';
import type Locales from '../locale/Locales';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class Iteration<State = any> extends Expression {
    readonly output: Type;
    readonly initialize: (
        evaluator: Evaluator,
        expression: Iteration<State>,
    ) => State | Value;
    readonly check: CheckHandler<State, Iteration<State>>;
    readonly next: NextHandler<State, Iteration<State>>;
    readonly finish: FinishHandler<State, Iteration<State>>;

    constructor(
        output: Type,
        initial: (
            evaluator: Evaluator,
            expression: Iteration<State>,
        ) => State | Value,
        next: CheckHandler<State, Iteration<State>>,
        check: NextHandler<State, Iteration<State>>,
        finish: FinishHandler<State, Iteration<State>>,
    ) {
        super();

        this.output = output;
        this.initialize = initial;
        this.check = next;
        this.next = check;
        this.finish = finish;
    }

    getDescriptor() {
        return 'Iteration';
    }

    getGrammar(): Grammar {
        return [];
    }

    getPurpose(): Purpose {
        return Purpose.Evaluate;
    }

    computeType() {
        return this.output;
    }

    compile(): Step[] {
        return [
            new Start(this),
            ...getIteration(this, this.initialize, this.check, this.next),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;
        // Get the resulting state and pass it.
        const state = getIterationResult<State>(evaluator);
        // Do whatever we were requested to do with the resulting state.
        const value = this.finish(evaluator, state, this);
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
        const inputs = this.getInputBinds(evaluator);
        if (inputs === undefined) return undefined;
        const names = inputs[index].names;
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
                    ? currentFunction.inputs[input].type
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
        return;
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

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.Iteration);
    }

    getStartExplanations(locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.node.Iteration.start),
        );
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return concretize(
            locales,
            locales.get((l) => l.node.Iteration.finish),
            this.getValueIfDefined(locales, context, evaluator),
        );
    }

    getGlyphs() {
        return Glyphs.Function;
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
            const tracking = evaluator.resolve(
                IterationState,
            ) as Internal<Kind>;
            // Handle the next
            const result = check(evaluator, tracking.value, expression);
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
            const tracking = evaluator.resolve(
                IterationState,
            ) as Internal<Kind>;
            // Handle the check
            const value = next(evaluator, tracking.value, expression);
            if (value instanceof Value) return value;
            // Return to next if we're not done.
            if (value === undefined) evaluator.jump(-2);
            // Return a value if there was one.
            return undefined;
        }),
    ];
}

export function getIterationResult<Kind>(evaluator: Evaluator) {
    const state = evaluator.resolve(IterationState) as Internal<Kind>;
    evaluator.getCurrentEvaluation()?.unscope();
    return state.value;
}
