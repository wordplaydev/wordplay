import type Conflict from '@conflicts/Conflict';
import Expression, { ExpressionKind, type GuardContext } from './Expression';
import type Token from './Token';
import type Type from './Type';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@values/Value';
import type Step from '@runtime/Step';
import Jump from '@runtime/Jump';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Context from './Context';
import UnionType from './UnionType';
import type TypeSet from './TypeSet';
import ExceptionValue from '@values/ExceptionValue';
import { node, type Grammar, type Replacement } from './Node';
import BooleanType from './BooleanType';
import ExpectedBooleanCondition from '../conflicts/ExpectedBooleanCondition';
import Check from '@runtime/Check';
import BoolValue from '@values/BoolValue';
import ValueException from '../values/ValueException';
import TypeException from '../values/TypeException';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import type { BasisTypeName } from '../basis/BasisConstants';
import StreamToken from './StreamToken';
import ExpectedStream from '../conflicts/ExpectedStream';
import Sym from './Sym';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import UnknownType from './UnknownType';
import type Locales from '../locale/Locales';
import type EditContext from '@edit/EditContext';
import StreamType from './StreamType';
import Changed from './Changed';
import Bind from './Bind';

export default class Reaction extends Expression {
    readonly initial: Expression;
    readonly dots: Token;
    readonly condition: Expression;
    readonly nextdots: Token | undefined;
    readonly next: Expression;

    constructor(
        initial: Expression,
        dots: Token,
        condition: Expression,
        nextdots: Token | undefined,
        next: Expression,
    ) {
        super();

        this.initial = initial;
        this.dots = dots;
        this.condition = condition;
        this.nextdots = nextdots;
        this.next = next;

        this.computeChildren();
    }

    static make(initial: Expression, condition: Expression, next: Expression) {
        return new Reaction(
            initial,
            new StreamToken(),
            condition,
            new StreamToken(),
            next,
        );
    }

    static getPossibleReplacements({ node }: EditContext) {
        return node instanceof Expression
            ? [
                  Reaction.make(
                      node,
                      Changed.make(
                          ExpressionPlaceholder.make(StreamType.make()),
                      ),
                      ExpressionPlaceholder.make(),
                  ),
              ]
            : [];
    }

    static getPossibleAppends() {
        return Reaction.make(
            ExpressionPlaceholder.make(),
            Changed.make(ExpressionPlaceholder.make(StreamType.make())),
            ExpressionPlaceholder.make(),
        );
    }

    getDescriptor() {
        return 'Reaction';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'initial',
                kind: node(Expression),
                label: (locales: Locales) =>
                    locales.get((l) => l.node.Reaction.initial),
            },
            { name: 'dots', kind: node(Sym.Stream), space: true },
            {
                name: 'condition',
                kind: node(Expression),
                space: true,
                label: (locales: Locales) =>
                    locales.get((l) => l.node.Reaction.condition),
                getType: () => BooleanType.make(),
            },
            {
                name: 'nextdots',
                kind: node(Sym.Stream),
                space: true,
                indent: true,
            },
            {
                name: 'next',
                kind: node(Expression),
                label: (locales: Locales) =>
                    locales.get((l) => l.node.Reaction.next),
                space: true,
                indent: true,
            },
        ];
    }

    clone(replace?: Replacement) {
        return new Reaction(
            this.replaceChild('initial', this.initial, replace),
            this.replaceChild('dots', this.dots, replace),
            this.replaceChild('condition', this.condition, replace),
            this.replaceChild<Token | undefined>(
                'nextdots',
                this.nextdots,
                replace,
            ),
            this.replaceChild<Expression>('next', this.next, replace),
        ) as this;
    }

    getPurpose() {
        return Purpose.Input;
    }

    getAffiliatedType(): BasisTypeName | undefined {
        return 'stream';
    }

    computeConflicts(context: Context): Conflict[] {
        const conflicts: Conflict[] = [];

        // The condition must be boolean valued.
        const conditionType = this.condition.getType(context);
        if (!(conditionType instanceof BooleanType))
            conflicts.push(new ExpectedBooleanCondition(this, conditionType));

        if (
            !Array.from(this.condition.getAllDependencies(context)).some(
                (node) =>
                    context.getStreamType(node.getType(context)) !== undefined,
            )
        )
            conflicts.push(new ExpectedStream(this));

        return conflicts;
    }

    computeType(context: Context): Type {
        const type = UnionType.getPossibleUnion(context, [
            this.initial.getType(context),
            this.next.getType(context),
        ]).generalize(context);

        // If the type includes an unknown type because of a cycle or some other unknown type, remove the unknown, since the rest of the type defines the possible values.
        const types = type.getTypeSet(context).list();
        const cycle = types.findIndex((type) => type instanceof UnknownType);
        if (cycle >= 0) {
            types.splice(cycle, 1);
            return UnionType.getPossibleUnion(context, types);
        } else return type;
    }

    getDependencies(): Expression[] {
        return [this.condition, this.initial, this.next];
    }

    compile(evaluator: Evaluator, context: Context): Step[] {
        const initialSteps = this.initial.compile(evaluator, context);
        const conditionSteps = this.condition.compile(evaluator, context);
        const nextSteps = this.next.compile(evaluator, context);

        return [
            // Start by setting up the reaction state and deciding whether to evaluate the initial value expression.
            new Start(this, (evaluator) => {
                // Start tracking dependencies so that we can decide which value to use.
                evaluator.reactionDependencies.push({
                    reaction: this,
                    streams: new Set(),
                });

                // Notify the evaluator that we're evaluating a stream so it can keep
                // track of the number of types the node has evaluated, identifying individual streams.
                evaluator.incrementStreamEvaluationCount(this);

                // Note that we're evaluating a reaction so we don't reuse memoized values.
                evaluator.startEvaluatingReaction();

                // If this wasn't the initial evaluation, then jump straight to the condition steps.
                if (evaluator.getStreamFor(this) !== undefined)
                    evaluator.jump(initialSteps.length + 1);

                return undefined;
            }),
            // If it has not, evaluate the initial value...
            ...initialSteps,
            new Check(this, (evaluator) => {
                // What's the initial value we got? We need it in order to create the initial stream.
                // We take it off the stack because after the condition check, we'll push it back on if there was no change,
                // and if there was, we'll evaluate the next expression to get this reaction's value.
                const initialValue = evaluator.popValue(this);
                if (initialValue === undefined)
                    return new ValueException(evaluator, this);

                // Create the initial stream so we can refer to it by "." in the condition
                evaluator.createReactionStream(this, initialValue);

                // If this reaction is bound, bind the name to the initial value in the evaluation in which the bind is happening,
                // so the condition to refer to it.
                const bind = evaluator
                    .getCurrentEvaluation()
                    ?.getSource()
                    ?.root.getAncestors(this)
                    .find((ancestor) => ancestor instanceof Bind);
                if (bind) {
                    // Find the evaluation that has a step that evaluates this bind.
                    const evaluation = evaluator
                        .getEvaluations()
                        .find((evaluation) =>
                            evaluation.getStepThat(
                                (step) => step.node === bind,
                            ),
                        );
                    if (evaluation) evaluation.bind(bind.names, initialValue);
                }

                return undefined;
            }),
            // Now that we're done with the initial value, run the condition so we can capture the stream dependencies,
            ...conditionSteps,
            new Check(this, (evaluator) => {
                // Get the result of the condition evaluation.
                const value = evaluator.popValue(this);
                if (value === undefined)
                    return new ValueException(evaluator, this);
                else if (!(value instanceof BoolValue))
                    return new TypeException(
                        this,
                        evaluator,
                        BooleanType.make(),
                        value,
                    );

                // There should be a stream created for this.
                const stream = evaluator.getStreamFor(this);

                // If this reaction already has a stream, see if the change expression was true, and if
                // so evaluate the next step.
                if (stream) {
                    if (!value.bool) {
                        // If the change condition was false, push the most recent reaction value onto the stack and skip the next value expression.

                        const latest = stream.latest();
                        if (latest === undefined)
                            return new ValueException(evaluator, this);
                        evaluator.pushValue(latest);
                        evaluator.jump(nextSteps.length);
                    }
                    // if the change condition was true, we just advance to the next step (which Evaluator does for us).
                } else {
                    console.error('Expected stream to exist');
                }

                return undefined;
            }),
            // Otherwise, compute the new value.
            ...nextSteps,
            // Finish by getting the final value, adding it to the reaction stream, then push it back on the stack for others to use.
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, value: Value | undefined): Value {
        // Get the new value, or if given a memoized value, use that.
        const streamValue = value ?? evaluator.popValue(this);

        // Unset the reaction tracking.
        evaluator.stopEvaluatingReaction();

        // At this point in the compiled steps above, we should have a value on the stack
        // that is either the initial value for this reaction's stream or a new value.
        if (streamValue instanceof ExceptionValue) return streamValue;

        // Let's find the stream corresponding to this reaction, if there is one.
        const stream = evaluator.getStreamFor(this);

        // If we found one...
        if (stream) {
            // Find the stream's latest value.
            const latest = stream.latest();
            // If the stream's value is different from the latest value, that means that the change expression was true, and we have a new value.
            // We'll add the new value to the existing stream, silently.
            if (latest !== streamValue) {
                stream.add(streamValue, null, true);
            }
        }
        // If we didn't find one, there's a defect in this whole thing, because we should have created a stream for this reaction
        // after getting the initial value.
        else {
            console.log(
                "Why isn't there a stream alredy? It should have been created with the initial value.",
            );
        }

        // Return the value we computed.
        return streamValue;
    }

    evaluateTypeGuards(current: TypeSet, guard: GuardContext) {
        if (this.initial instanceof Expression)
            this.initial.evaluateTypeGuards(current, guard);
        if (this.next instanceof Expression)
            this.next.evaluateTypeGuards(current, guard);
        return current;
    }

    getStart() {
        return this.initial;
    }

    getFinish() {
        return this.dots;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.Reaction);
    }

    getStartExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.Reaction.start);
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return locales.concretize(
            (l) => l.node.Reaction.finish,
            this.getValueIfDefined(locales, context, evaluator),
        );
    }

    getGlyphs() {
        return Glyphs.Stream;
    }

    getKind() {
        return ExpressionKind.Evaluate;
    }
}
