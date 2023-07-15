import type Conflict from '@conflicts/Conflict';
import Expression from './Expression';
import CycleType from './CycleType';
import Token from './Token';
import type Type from './Type';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@runtime/Value';
import type Step from '@runtime/Step';
import Jump from '@runtime/Jump';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Bind from './Bind';
import type Context from './Context';
import UnionType from './UnionType';
import type TypeSet from './TypeSet';
import Exception from '@runtime/Exception';
import type { Replacement } from './Node';
import type Locale from '@locale/Locale';
import BooleanType from './BooleanType';
import ExpectedBooleanCondition from '../conflicts/ExpectedBooleanCondition';
import Check from '../runtime/Check';
import Bool from '../runtime/Bool';
import ValueException from '../runtime/ValueException';
import TypeException from '../runtime/TypeException';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import type { NativeTypeName } from '../native/NativeConstants';
import StreamToken from './StreamToken';
import generalize from './generalize';
import concretize from '../locale/concretize';
import ExpectedStream from '../conflicts/ExpectedStream';

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
        next: Expression
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
            next
        );
    }

    getGrammar() {
        return [
            {
                name: 'initial',
                types: [Expression],
                label: (translation: Locale) =>
                    translation.node.Reaction.initial,
            },
            { name: 'dots', types: [Token], space: true },
            {
                name: 'condition',
                types: [Expression],
                space: true,
                label: (translation: Locale) =>
                    translation.node.Reaction.condition,
            },
            {
                name: 'nextdots',
                types: [Token, undefined],
                space: true,
                indent: true,
            },
            {
                name: 'next',
                types: [Expression],
                label: (translation: Locale) => translation.node.Reaction.next,
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
                replace
            ),
            this.replaceChild<Expression>('next', this.next, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.Decide;
    }

    getAffiliatedType(): NativeTypeName | undefined {
        return 'stream';
    }

    computeConflicts(context: Context): Conflict[] {
        const conflicts: Conflict[] = [];

        // The condition must be boolean valued.
        const conditionType = this.condition.getType(context);
        if (!(conditionType instanceof BooleanType))
            conflicts.push(new ExpectedBooleanCondition(this, conditionType));

        // The condition should reference a stream.
        if (
            !this.condition
                .nodes()
                .some(
                    (node) =>
                        node instanceof Expression &&
                        context.getStreamType(node.getType(context)) !==
                            undefined
                )
        )
            conflicts.push(new ExpectedStream(this));

        return conflicts;
    }

    computeType(context: Context): Type {
        const type = generalize(
            UnionType.getPossibleUnion(context, [
                this.initial.getType(context),
                this.next.getType(context),
            ]),
            context
        );

        // If the type includes an unknown type because of a cycle, remove the unknown, since the rest of the type defines the possible values.
        const types = type.getTypeSet(context).list();
        const cycle = types.findIndex((type) => type instanceof CycleType);
        if (cycle >= 0) {
            types.splice(cycle, 1);
            return UnionType.getPossibleUnion(context, types);
        } else return type;
    }

    getDependencies(): Expression[] {
        return [this.condition, this.initial, this.next];
    }

    compile(context: Context): Step[] {
        const initialSteps = this.initial.compile(context);
        const conditionSteps = this.condition.compile(context);
        const nextSteps = this.next.compile(context);

        return [
            // Start by binding the previous value, if there is one.
            new Start(this, (evaluator) => {
                // Start tracking dependencies so that we can decide which value to use.
                evaluator.reactionDependencies.push({
                    reaction: this,
                    streams: new Set(),
                });

                return undefined;
            }),
            // Then evaluate the condition.
            ...conditionSteps,
            new Check(this, (evaluator) => {
                // Get the result of the condition evaluation.
                const value = evaluator.popValue(this);
                if (value === undefined)
                    return new ValueException(evaluator, this);
                else if (!(value instanceof Bool))
                    return new TypeException(
                        this,
                        evaluator,
                        BooleanType.make(),
                        value
                    );

                // Did any of the streams cause the current evaluation?
                const dependencies = evaluator.reactionDependencies.pop();
                const streams = dependencies ? dependencies.streams : undefined;
                const changed =
                    streams === undefined
                        ? false
                        : Array.from(streams).some((stream) =>
                              evaluator.didStreamCauseReaction(stream)
                          );

                // If this reaction already has a stream
                if (evaluator.hasReactionStream(this)) {
                    // if the condition was true and a dependency changed, jump to the next step.
                    if (changed && value.bool)
                        evaluator.jump(initialSteps.length + 1);
                    // If it was false, push the last reaction value and skip the rest.
                    else {
                        const latest = evaluator.getReactionStreamLatest(this);
                        if (latest === undefined)
                            return new ValueException(evaluator, this);
                        evaluator.pushValue(latest);
                        evaluator.jump(
                            initialSteps.length + 1 + nextSteps.length + 1
                        );
                    }
                }
                // Otherwise, proceed to the initial steps.

                return undefined;
            }),
            // If it has not, evaluate the initial value...
            ...initialSteps,
            // ... then jump to finish to remember the stream value.
            new Jump(nextSteps.length, this),
            // Otherwise, compute the new value.
            ...nextSteps,
            // Finish by getting the final value, adding it to the reaction stream, then push it back on the stack for others to use.
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, value: Value | undefined): Value {
        // Get the new value.
        const streamValue = value ?? evaluator.popValue(this);

        // At this point in the compiled steps above, we should have a value on the stack
        // that is either the initial value for this reaction's stream or a new value.
        if (streamValue instanceof Exception) return streamValue;

        // If the stream's value is different from the latest value, add it.
        const latest = evaluator.getReactionStreamLatest(this);
        if (latest !== streamValue)
            evaluator.addToReactionStream(this, streamValue);

        // Return the value we computed.
        return streamValue;
    }

    evaluateTypeSet(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        if (this.initial instanceof Expression)
            this.initial.evaluateTypeSet(bind, original, current, context);
        if (this.next instanceof Expression)
            this.next.evaluateTypeSet(bind, original, current, context);
        return current;
    }

    getStart() {
        return this.initial;
    }

    getFinish() {
        return this.dots;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.Reaction;
    }

    getStartExplanations(locale: Locale) {
        return concretize(locale, locale.node.Reaction.start);
    }

    getFinishExplanations(
        locale: Locale,
        context: Context,
        evaluator: Evaluator
    ) {
        return concretize(
            locale,
            locale.node.Reaction.finish,
            this.getValueIfDefined(locale, context, evaluator)
        );
    }

    getGlyphs() {
        return Glyphs.Stream;
    }
}
