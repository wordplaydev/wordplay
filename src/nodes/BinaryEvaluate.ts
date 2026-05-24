import type Conflict from '@conflicts/Conflict';
import IncompatibleInput from '@conflicts/IncompatibleInput';
import MissingInput from '@conflicts/MissingInput';
import OrderOfOperations from '@conflicts/OrderOfOperations';
import UnexpectedInput from '@conflicts/UnexpectedInput';
import type { LocaleText } from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type { NodeDescriptor } from '@locale/NodeTexts';
import {
    AND_SYMBOL,
    EQUALS_SYMBOL,
    NOT_EQUALS_SYMBOL,
    OR_SYMBOL,
} from '@parser/Symbols';
import Evaluation from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import StartEvaluation from '@runtime/StartEvaluation';
import type Step from '@runtime/Step';
import FunctionException from '@values/FunctionException';
import type Value from '@values/Value';
import { Purpose } from '@concepts/Purpose';
import type Locales from '@locale/Locales';
import Characters from '../lore/BasisCharacters';
import { Emotion } from '../lore/Emotion';
import JumpIfEqual from '@runtime/JumpIf';
import FunctionValue from '@values/FunctionValue';
import ValueException from '@values/ValueException';
import AnyType from '@nodes/AnyType';
import Bind from '@nodes/Bind';
import BooleanType from '@nodes/BooleanType';
import type Context from '@nodes/Context';
import type Definition from '@nodes/Definition';
import Expression, { type GuardContext } from '@nodes/Expression';
import FunctionDefinition from '@nodes/FunctionDefinition';
import FunctionType from '@nodes/FunctionType';
import getConcreteExpectedType from '@nodes/Generics';
import NeverType from '@nodes/NeverType';
import type Node from '@nodes/Node';
import { node, type Grammar, type Replacement } from '@nodes/Node';
import NoneLiteral from '@nodes/NoneLiteral';
import NoneType from '@nodes/NoneType';
import NumberLiteral from '@nodes/NumberLiteral';
import NumberType from '@nodes/NumberType';
import Reference from '@nodes/Reference';
import TextLiteral from '@nodes/TextLiteral';
import TextType from '@nodes/TextType';
import Token from '@nodes/Token';
import type Type from '@nodes/Type';
import TypeSet from '@nodes/TypeSet';
import UnknownNameType from '@nodes/UnknownNameType';

export default class BinaryEvaluate extends Expression {
    readonly left: Expression;
    readonly fun: Reference;
    readonly right: Expression;

    constructor(left: Expression, operator: Reference, right: Expression) {
        super();

        this.left = left;
        this.fun = operator;
        this.right = right;

        this.computeChildren();
    }

    /** Note: we don't generate any possibilities here because Evaluate generates them. */
    static getPossibleReplacements() {
        return [];
    }

    static getPossibleInsertions() {
        return [];
    }

    isUndelimited() {
        return true;
    }

    getDescriptor(): NodeDescriptor {
        return 'BinaryEvaluate';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'left',
                kind: node(Expression),
                // The label comes from the type of left, or the default label from the translation.
                label: (locales: Locales, context: Context) => () =>
                    this.left.getType(context).getLabel(locales),
                getType: (context) => this.left.getType(context),
            },
            {
                name: 'fun',
                kind: node(Reference),
                label: () => (l) => l.node.BinaryEvaluate.label.operator,
                space: true,
                indent: true,
                getDefinitions: (context: Context): Definition[] => {
                    return this.getFunctions(context);
                },
                /**
                 * The expected function type of this binary evaluate is whether function it resolves to, but
                 * concretized with the actual types of the left and right inputs, as that determines what it could be replaced with.
                 */
                getType: (context) => {
                    const type = this.getFunction(context)?.getType(context);
                    if (
                        type instanceof FunctionType &&
                        type.inputs.length === 1
                    ) {
                        const newType = FunctionType.make(
                            type.types,
                            [
                                type.inputs[0].withType(
                                    this.right
                                        .getType(context)
                                        .generalize(context),
                                ),
                            ],
                            type.output,
                            type.definition,
                        );
                        return newType;
                    }
                    return type ?? new AnyType();
                },
            },
            {
                name: 'right',
                kind: node(Expression),
                // The name of the input from the function, or the translation default
                label: (locales: Locales, context: Context) => {
                    const fun = this.getFunction(context);
                    return fun
                        ? (_) => locales.getName(fun.inputs[0].names)
                        : (l: LocaleText) => l.node.BinaryEvaluate.right;
                },
                space: true,
                indent: true,
                // The type of the right should be the type of the single input to the function corresponding to the operator.
                getType: (context: Context) => {
                    // For equality operators, mirror the left's actual type
                    // instead of the basis function's generic input type. This
                    // lets autocomplete on a placeholder right-hand side surface
                    // the literal arms of a union-typed left (e.g., `Key() = _`
                    // suggests each named key in the active locale).
                    const op = this.getOperator();
                    if (op === EQUALS_SYMBOL || op === NOT_EQUALS_SYMBOL)
                        return this.left.getType(context);
                    const fun = this.getFunction(context);
                    if (fun === undefined || fun.inputs.length === 0)
                        return new NeverType();
                    const type = fun.inputs[0].getType(context);
                    // If this is a measurement type, pass along this binary op so that we can infer units.
                    return type instanceof NumberType
                        ? type.withOp(this)
                        : type;
                },
            },
        ];
    }

    hasBranch(expr: Expression) {
        return this.left === expr || this.right === expr;
    }

    getPurpose() {
        return Purpose.Advanced;
    }

    clone(replace?: Replacement) {
        return new BinaryEvaluate(
            this.replaceChild('left', this.left, replace),
            this.replaceChild('fun', this.fun, replace),
            this.replaceChild('right', this.right, replace),
        ) as this;
    }

    getOperator() {
        return this.fun.getName();
    }

    getLeftType(context: Context) {
        return this.left.getType(context);
    }

    getFunctions(context: Context) {
        return this.getType(context)
            .getDefinitions(this, context)
            .filter(
                (def) => def instanceof FunctionDefinition && def.isBinary(),
            );
    }

    getFunction(context: Context): FunctionDefinition | undefined {
        // Find the function on the left's type.
        const leftType = this.getLeftType(context);
        const fun = leftType.getDefinitionOfNameInScope(
            this.getOperator(),
            context,
        );
        return fun instanceof FunctionDefinition ? fun : undefined;
    }

    getScopeOfChild(child: Node, context: Context): Node | undefined {
        // The name's scope is the structure referred to in the subject expression.
        // The subject expression's scope is this property reference's parent.
        if (child === this.fun) return this.getLeftType(context);
        else return this.getParent(context);
    }

    computeConflicts(context: Context): Conflict[] {
        const conflicts = [];

        // Warn on sequences of different operators about evaluation order.
        if (
            this.left instanceof BinaryEvaluate &&
            this.getOperator() !== this.left.getOperator()
        )
            conflicts.push(new OrderOfOperations(this.left, this));

        // Get the types
        const rightType = this.right.getType(context);

        // Find the function on the left's type.
        const fun = this.getFunction(context);

        // Did we find nothing?
        // if (fun === undefined)
        //     return [
        //         new IncompatibleInput(
        //             this.fun,
        //             this.left.getType(context),
        //             FunctionType.make(undefined, [], new AnyType()),
        //         ),
        //     ];

        // If it is a function, does the right match the expected input?
        if (fun instanceof FunctionDefinition) {
            // Are there too many inputs?
            if (fun.inputs.length === 0)
                conflicts.push(new UnexpectedInput(fun, this, this.right));
            // Are there too few inputs?
            else if (fun.inputs.length > 1) {
                const secondInput = fun.inputs[1];
                if (secondInput instanceof Bind)
                    conflicts.push(
                        new MissingInput(fun, this, this.fun, secondInput),
                    );
            }
            // Is the right operand the correct type?
            else {
                const firstInput = fun.inputs[0];
                if (firstInput instanceof Bind) {
                    const expectedType = getConcreteExpectedType(
                        fun,
                        firstInput,
                        this,
                        context,
                    );

                    // Pass this binary operation to the measurement type so it can reason about units correctly.
                    if (!expectedType.accepts(rightType, context))
                        conflicts.push(
                            new IncompatibleInput(
                                this.right,
                                rightType,
                                expectedType,
                            ),
                        );
                }
            }
        }

        return conflicts;
    }

    computeType(context: Context): Type {
        // The type of the expression is whatever the function definition says it is.
        const fun = this.getFunction(context);
        return fun !== undefined
            ? getConcreteExpectedType(fun, undefined, this, context)
            : new UnknownNameType(
                  this,
                  this.fun.name,
                  this.left.getType(context),
              );
    }

    getDependencies(context: Context): Expression[] {
        const fun = this.getFunction(context);
        return [
            this.left,
            this.right,
            ...(fun === undefined || fun.expression === undefined
                ? []
                : [fun.expression]),
        ];
    }

    isLogicalOperator(context: Context) {
        return (
            this.left.getType(context) instanceof BooleanType &&
            (this.fun.name.getText() === AND_SYMBOL ||
                this.fun.name.getText() === OR_SYMBOL)
        );
    }

    compile(evaluator: Evaluator, context: Context): Step[] {
        const left = this.left.compile(evaluator, context);
        const right = this.right.compile(evaluator, context);

        // Logical and is short circuited: if the left is false, we do not evaluate the right.
        // We do not short circuit if we are evaluating a reaction, as we need to capture reaction dependencies.
        if (
            this.isLogicalOperator(context) &&
            !evaluator.isEvaluatingReaction()
        ) {
            if (this.fun.name.getText() === AND_SYMBOL) {
                return [
                    new Start(this),
                    ...left,
                    // Jump past the right's instructions if false and just push a false on the stack.
                    new JumpIfEqual(right.length + 1, true, false, this),
                    ...right,
                    new StartEvaluation(this),
                    new Finish(this),
                ];
            }
            // Logical OR is short circuited: if the left is true, we do not evaluate the right.
            else if (this.fun.name.getText() === OR_SYMBOL) {
                return [
                    new Start(this),
                    ...left,
                    // Jump past the right's instructions if true and just push a true on the stack.
                    new JumpIfEqual(right.length + 1, true, true, this),
                    ...right,
                    new StartEvaluation(this),
                    new Finish(this),
                ];
            }
        }

        return [
            new Start(this),
            ...left,
            ...right,
            new StartEvaluation(this),
            new Finish(this),
        ];
    }

    startEvaluation(evaluator: Evaluator) {
        const right = evaluator.popValue(this);
        const left = evaluator.popValue(this);

        // Resolve the function on the value.
        const functionValue = left.resolve(this.getOperator(), evaluator);

        // Verify that it's a function.
        if (
            !(functionValue instanceof FunctionValue) ||
            !(functionValue.definition.expression !== undefined)
        )
            return new FunctionException(evaluator, this, left, this.fun);

        const fun = functionValue.definition;

        const operand = fun.inputs[0];

        // No operand? Exception.
        if (operand === undefined) return new ValueException(evaluator, this);

        // Start the function's expression. Pass the source of the function.
        evaluator.startEvaluation(
            new Evaluation(
                evaluator,
                this,
                fun,
                left,
                new Map().set(operand.names, right),
            ),
        );
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        // Return whatever was computed.
        return evaluator.popValue(this);
    }

    /**
     * Type checks narrow the set to the specified type, if contained in the set and if the check is on the same bind.
     * */
    evaluateTypeGuards(current: TypeSet, guard: GuardContext) {
        // If conjunction, then we compute the intersection of the left and right's possible types.
        // Note that we pass the left's possible types because we don't evaluate the right if the left isn't true.
        if (this.getOperator() === AND_SYMBOL) {
            const left = this.left.evaluateTypeGuards(current, guard);
            const right = this.right.evaluateTypeGuards(left, guard);
            return left.intersection(right, guard.context);
        }
        // If disjunction of type checks, then we return the union.
        // Note that we pass the left's possible types because we don't evaluate the right if the left is true.
        else if (this.getOperator() === OR_SYMBOL) {
            const left = this.left.evaluateTypeGuards(current, guard);
            const right = this.right.evaluateTypeGuards(current, guard);
            return left.union(right, guard.context);
        }
        // If it's an equals check and one side is a number, text, or none literal, then reduce to the set to the literal checked
        else if (
            this.getOperator() === EQUALS_SYMBOL ||
            this.getOperator() === NOT_EQUALS_SYMBOL
        ) {
            const equals = this.getOperator() === EQUALS_SYMBOL;

            // Only narrow the guarded binding's TypeSet when the *other*
            // side of the equality is a reference to that binding. Without
            // this gate, an unrelated equality like `key.length() = 1` would
            // intersect `key`'s text-union with `{# value}` and collapse it
            // to NeverType, which then poisons any later use of `key`.
            const guardSide = this.left.isGuardMatch(guard)
                ? this.left
                : this.right.isGuardMatch(guard)
                  ? this.right
                  : undefined;
            const otherSide =
                guardSide === this.left
                    ? this.right
                    : guardSide === this.right
                      ? this.left
                      : undefined;

            let set: TypeSet | undefined = undefined;

            if (guardSide !== undefined && otherSide instanceof TextLiteral) {
                // Find all of the single token translations, turn them into literal text types, and find the intersection between them and the current set.
                const types: TextType[] = [];
                for (const translation of otherSide.texts)
                    if (
                        translation.segments.length === 1 &&
                        translation.segments[0] instanceof Token
                    )
                        types.push(
                            TextType.make(translation.segments[0].getText()),
                        );
                set = new TypeSet(types, guard.context);
            }

            if (guardSide !== undefined && otherSide instanceof NoneLiteral) {
                set = new TypeSet([NoneType.make()], guard.context);
            }

            if (guardSide !== undefined && otherSide instanceof NumberLiteral) {
                set = new TypeSet(
                    [new NumberType(otherSide.number, otherSide.unit)],
                    guard.context,
                );
            }

            if (set)
                return equals
                    ? current.intersection(set, guard.context)
                    : current.difference(set, guard.context);
        }

        // Otherwise, just pass the types down and return the original types.
        this.left.evaluateTypeGuards(current, guard);
        this.right.evaluateTypeGuards(current, guard);
        return current;
    }

    guardsTypes() {
        return true;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.BinaryEvaluate;
    getLocalePath() {
        return BinaryEvaluate.LocalePath;
    }

    getStart() {
        return this.fun;
    }
    getFinish() {
        return this.fun;
    }

    getStartExplanations(locales: Locales, context: Context) {
        return locales.concretize(
            (l) => l.node.BinaryEvaluate.start,
            {
                left: new NodeRef(this.left, locales, context),
            },
        );
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return locales.concretize(
            (l) => l.node.BinaryEvaluate.finish,
            {
                value: this.getValueIfDefined(locales, context, evaluator),
            },
        );
    }

    getCharacter() {
        return {
            symbols: Characters.BinaryEvaluate.symbols,
            emotion: Emotion.kind,
        };
    }

    getDescriptionInputs(locale: Locales, context: Context) {
        return {
            operator: new NodeRef(this.fun, locale, context),
        };
    }
}
