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
import concretize from '../locale/concretize';
import ExpectedStream from '../conflicts/ExpectedStream';
import Sym from './Sym';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import type Node from './Node';
import UnknownType from './UnknownType';
import type Locales from '../locale/Locales';

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

    static getPossibleNodes(
        type: Type | undefined,
        node: Node | undefined,
        selected: boolean,
    ) {
        return [
            node instanceof Expression && selected
                ? Reaction.make(
                      node,
                      ExpressionPlaceholder.make(BooleanType.make()),
                      ExpressionPlaceholder.make(),
                  )
                : Reaction.make(
                      ExpressionPlaceholder.make(),
                      ExpressionPlaceholder.make(BooleanType.make()),
                      ExpressionPlaceholder.make(),
                  ),
        ];
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
            // Start by binding the previous value, if there is one.
            new Start(this, (evaluator) => {
                // Start tracking dependencies so that we can decide which value to use.
                evaluator.reactionDependencies.push({
                    reaction: this,
                    streams: new Set(),
                });

                // Notify the evaluator that we're evaluating a stream so it can keep
                // track of the number of types the node has evaluated, identifying individual streams.
                evaluator.incrementStreamEvaluationCount(this);

                return undefined;
            }),
            // Then evaluate the condition.
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

                // See if there's a stream created for this.
                const stream = evaluator.getStreamFor(this);

                // If this reaction already has a stream, see if the change expression was true, and if
                // so evaluate the next step.
                if (stream) {
                    // if the condition was true and a dependency changed, jump to the next step.
                    if (value.bool) evaluator.jump(initialSteps.length + 1);
                    // If it was false, push the last reaction value and skip the rest.
                    else {
                        const latest = stream.latest();
                        if (latest === undefined)
                            return new ValueException(evaluator, this);
                        evaluator.pushValue(latest);
                        evaluator.jump(
                            initialSteps.length + 1 + nextSteps.length + 1,
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
        // If we didn't find one, we'll create a reaction stream with the initial value.
        else {
            evaluator.createReactionStream(this, streamValue);
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
        return concretize(
            locales,
            locales.get((l) => l.node.Reaction.start),
        );
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return concretize(
            locales,
            locales.get((l) => l.node.Reaction.finish),
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
