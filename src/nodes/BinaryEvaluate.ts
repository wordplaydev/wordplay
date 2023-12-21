import type Conflict from '@conflicts/Conflict';
import Expression, { type GuardContext } from './Expression';
import type Type from './Type';
import type Evaluator from '@runtime/Evaluator';
import type Step from '@runtime/Step';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Context from './Context';
import type Node from './Node';
import {
    AND_SYMBOL,
    EQUALS_SYMBOL,
    NOT_EQUALS_SYMBOL,
    OR_SYMBOL,
} from '@parser/Symbols';
import OrderOfOperations from '@conflicts/OrderOfOperations';
import Bind from './Bind';
import TypeSet from './TypeSet';
import FunctionException from '@values/FunctionException';
import FunctionDefinition from './FunctionDefinition';
import UnexpectedInputs from '@conflicts/UnexpectedInput';
import MissingInput from '@conflicts/MissingInput';
import IncompatibleInput from '@conflicts/IncompatibleInput';
import Evaluation from '@runtime/Evaluation';
import getConcreteExpectedType from './Generics';
import type Value from '@values/Value';
import UnknownNameType from './UnknownNameType';
import NeverType from './NeverType';
import type Definition from './Definition';
import NumberType from './NumberType';
import { node, type Grammar, type Replacement } from './Node';
import type { Template } from '@locale/Locale';
import StartEvaluation from '@runtime/StartEvaluation';
import NodeRef from '@locale/NodeRef';
import Emotion from '../lore/Emotion';
import FunctionValue from '../values/FunctionValue';
import Glyphs from '../lore/Glyphs';
import FunctionType from './FunctionType';
import AnyType from './AnyType';
import concretize from '../locale/concretize';
import Reference from './Reference';
import ValueException from '../values/ValueException';
import Purpose from '../concepts/Purpose';
import type Locales from '../locale/Locales';
import TextLiteral from './TextLiteral';
import Token from './Token';
import TextType from './TextType';
import NoneLiteral from './NoneLiteral';
import NoneType from './NoneType';
import NumberLiteral from './NumberLiteral';
import JumpIf from '../runtime/JumpIf';
import BooleanType from './BooleanType';

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
    static getPossibleNodes() {
        return [];
    }

    getDescriptor() {
        return 'BinaryEvaluate';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'left',
                kind: node(Expression),
                // The label comes from the type of left, or the default label from the translation.
                label: (
                    locales: Locales,
                    _: Node,
                    context: Context,
                ): Template => this.left.getType(context).getLabel(locales),
                getType: (context) => this.left.getType(context),
            },
            {
                name: 'fun',
                kind: node(Reference),
                space: true,
                indent: true,
                getDefinitions: (context: Context): Definition[] => {
                    const leftType =
                        this.left instanceof Expression
                            ? this.left.getType(context)
                            : undefined;
                    return leftType?.getDefinitions(this, context) ?? [];
                },
            },
            {
                name: 'right',
                kind: node(Expression),
                // The name of the input from the function, or the translation default
                label: (
                    locales: Locales,
                    _: Node,
                    context: Context,
                ): Template => {
                    const fun = this.getFunction(context);
                    return fun
                        ? locales.getName(fun.inputs[0].names)
                        : locales.get((l) => l.node.BinaryEvaluate.right);
                },
                space: true,
                indent: true,
                // The type of the right should be the type of the single input to the function corresponding to the operator.
                getType: (context: Context) => {
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

    getPurpose() {
        return Purpose.Evaluate;
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
        if (fun === undefined)
            return [
                new IncompatibleInput(
                    this.fun,
                    this.left.getType(context),
                    FunctionType.make(undefined, [], new AnyType()),
                ),
            ];

        // If it is a function, does the right match the expected input?
        if (fun instanceof FunctionDefinition) {
            // Are there too many inputs?
            if (fun.inputs.length === 0)
                conflicts.push(new UnexpectedInputs(fun, this, this.right));
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
        if (this.isLogicalOperator(context)) {
            if (this.fun.name.getText() === AND_SYMBOL) {
                return [
                    new Start(this),
                    ...left,
                    // Jump past the right's instructions if false and just push a false on the stack.
                    new JumpIf(right.length + 1, true, false, this),
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
                    new JumpIf(right.length + 1, true, true, this),
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
            let set: TypeSet | undefined = undefined;

            const textLiteral =
                this.left instanceof TextLiteral
                    ? this.left
                    : this.right instanceof TextLiteral
                      ? this.right
                      : undefined;
            if (textLiteral) {
                // Find all of the single token translations, turn them into literal text types, and find the intersection between them and the current set.
                const types: TextType[] = [];
                for (const translation of textLiteral.texts)
                    if (
                        translation.segments.length === 1 &&
                        translation.segments[0] instanceof Token
                    )
                        types.push(
                            TextType.make(translation.segments[0].getText()),
                        );
                set = new TypeSet(types, guard.context);
            }

            // Is one of them a check for a none literal?
            const noneLiteral =
                this.left instanceof NoneLiteral
                    ? this.left
                    : this.right instanceof NoneLiteral
                      ? this.right
                      : undefined;
            if (noneLiteral) {
                set = new TypeSet([NoneType.make()], guard.context);
            }

            // Is one of them a check for a number?
            const numberLiteral =
                this.left instanceof NumberLiteral
                    ? this.left
                    : this.right instanceof NumberLiteral
                      ? this.right
                      : undefined;
            if (numberLiteral)
                set = new TypeSet(
                    [new NumberType(numberLiteral.number, numberLiteral.unit)],
                    guard.context,
                );

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

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.BinaryEvaluate);
    }

    getStart() {
        return this.fun;
    }
    getFinish() {
        return this.fun;
    }

    getStartExplanations(locales: Locales, context: Context) {
        return concretize(
            locales,
            locales.get((l) => l.node.BinaryEvaluate.start),
            new NodeRef(this.left, locales, context),
        );
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return concretize(
            locales,
            locales.get((l) => l.node.BinaryEvaluate.finish),
            this.getValueIfDefined(locales, context, evaluator),
        );
    }

    getGlyphs() {
        return {
            symbols: Glyphs.BinaryEvaluate.symbols,
            emotion: Emotion.kind,
        };
    }

    getDescriptionInputs(locale: Locales, context: Context) {
        return [new NodeRef(this.fun, locale, context)];
    }
}
