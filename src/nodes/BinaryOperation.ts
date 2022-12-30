import type Conflict from '../conflicts/Conflict';
import Expression from './Expression';
import Token from './Token';
import type Type from './Type';
import type Evaluator from 'src/runtime/Evaluator';
import type Step from '../runtime/Step';
import Finish from '../runtime/Finish';
import Start from '../runtime/Start';
import type Context from './Context';
import type Node from './Node';
import { AND_SYMBOL, OR_SYMBOL } from '../parser/Tokenizer';
import OrderOfOperations from '../conflicts/OrderOfOperations';
import Bind from './Bind';
import type TypeSet from './TypeSet';
import FunctionException from '../runtime/FunctionException';
import JumpIf from '../runtime/JumpIf';
import FunctionDefinition from './FunctionDefinition';
import UnexpectedInputs from '../conflicts/UnexpectedInputs';
import MissingInput from '../conflicts/MissingInput';
import IncompatibleInput from '../conflicts/IncompatibleInput';
import Evaluation from '../runtime/Evaluation';
import UnparsableException from '../runtime/UnparsableException';
import NotAFunction from '../conflicts/NotAFunction';
import type Translations from './Translations';
import { TRANSLATE, WRITE } from './Translations';
import type LanguageCode from './LanguageCode';
import getConcreteExpectedType from './Generics';
import type Value from '../runtime/Value';
import UnknownNameType from './UnknownNameType';
import Action from '../runtime/Action';
import NeverType from './NeverType';
import type Definition from './Definition';
import TokenType from './TokenType';
import MeasurementType from './MeasurementType';
import type { Replacement } from './Node';

export default class BinaryOperation extends Expression {
    readonly left: Expression;
    readonly operator: Token;
    readonly right: Expression;

    constructor(left: Expression, operator: Token, right: Expression) {
        super();

        this.left = left;
        this.operator = operator;
        this.right = right;

        this.computeChildren();
    }

    getGrammar() {
        return [
            { name: 'left', types: [Expression] },
            {
                name: 'operator',
                types: [Token],
                space: true,
                indent: true,
                // The operators should be all those that exist on the type on the left.
                getToken: (text?: string, op?: string): Token =>
                    new Token(op ?? text ?? '_', TokenType.BINARY_OP),
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
                types: [Expression],
                space: true,
                indent: true,
                // The type of the right should be the type of the single input to the function corresponding to the operator.
                getType: (context: Context) => {
                    const fun = this.getFunction(context);
                    if (fun === undefined || fun.inputs.length === 0)
                        return new NeverType();
                    const type = fun.inputs[0].getType(context);
                    // If this is a measurement type, pass along this binary op so that we can infer units.
                    return type instanceof MeasurementType
                        ? type.withOp(this)
                        : type;
                },
            },
        ];
    }

    clone(replace?: Replacement) {
        return new BinaryOperation(
            this.replaceChild('left', this.left, replace),
            this.replaceChild('operator', this.operator, replace),
            this.replaceChild('right', this.right, replace)
        ) as this;
    }

    getOperator() {
        return this.operator.text.toString();
    }

    getFunction(context: Context): FunctionDefinition | undefined {
        // Find the function on the left's type.
        const leftType =
            this.left instanceof Expression
                ? this.left.getType(context)
                : undefined;
        const fun = leftType?.getDefinitionOfNameInScope(
            this.getOperator(),
            context
        );
        return fun instanceof FunctionDefinition ? fun : undefined;
    }

    computeConflicts(context: Context): Conflict[] {
        const conflicts = [];

        // Warn on sequences of different operators about evaluation order.
        if (
            this.left instanceof BinaryOperation &&
            this.operator.getText() !== this.left.operator.getText()
        )
            conflicts.push(new OrderOfOperations(this.left, this));

        // Get the types
        const rightType = this.right.getType(context);

        // Find the function on the left's type.
        const fun = this.getFunction(context);

        // Did we find nothing?
        if (fun === undefined)
            return [
                new NotAFunction(
                    this,
                    this.operator,
                    this.left.getType(context)
                ),
            ];

        // If it is a function, does the right match the expected input?
        if (fun instanceof FunctionDefinition) {
            // Are there too many inputs?
            if (fun.inputs.length === 0)
                conflicts.push(new UnexpectedInputs(fun, this, [this.right]));
            // Are there too few inputs?
            else if (fun.inputs.length > 1) {
                const secondInput = fun.inputs[1];
                if (secondInput instanceof Bind)
                    conflicts.push(
                        new MissingInput(fun, this, this.operator, secondInput)
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
                        context
                    );

                    // Pass this binary operation to the measurement type so it can reason about units correctly.
                    if (!expectedType.accepts(rightType, context))
                        conflicts.push(
                            new IncompatibleInput(
                                fun,
                                this,
                                this.right,
                                rightType,
                                expectedType
                            )
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
                  this.operator,
                  this.left.getType(context)
              );
    }

    getDependencies(context: Context): Expression[] {
        const fun = this.getFunction(context);
        return [
            this.left,
            this.right,
            ...(fun === undefined || !(fun.expression instanceof Expression)
                ? []
                : [fun.expression]),
        ];
    }

    compile(context: Context): Step[] {
        const left = this.left.compile(context);
        const right = this.right.compile(context);

        // Logical and is short circuited: if the left is false, we do not evaluate the right.
        if (this.operator.getText() === AND_SYMBOL) {
            return [
                new Start(this),
                ...left,
                // Jump past the right's instructions if false and just push a false on the stack.
                new JumpIf(right.length + 1, true, false, this),
                ...right,
                new Action(
                    this,
                    {
                        eng: 'Start the operation!',
                        '😀': WRITE,
                    },
                    (evaluator) => this.startEvaluate(evaluator)
                ),
                new Finish(this),
            ];
        }
        // Logical OR is short circuited: if the left is true, we do not evaluate the right.
        else if (this.operator.getText() === OR_SYMBOL) {
            return [
                new Start(this),
                ...left,
                // Jump past the right's instructions if true and just push a true on the stack.
                new JumpIf(right.length + 1, true, true, this),
                ...right,
                new Action(
                    this,
                    {
                        eng: 'Start the operation!',
                        '😀': WRITE,
                    },
                    (evaluator) => this.startEvaluate(evaluator)
                ),
                new Finish(this),
            ];
        } else {
            return [
                new Start(this),
                ...left,
                ...right,
                new Action(
                    this,
                    {
                        eng: 'Start the operation!',
                        '😀': WRITE,
                    },
                    (evaluator) => this.startEvaluate(evaluator)
                ),
                new Finish(this),
            ];
        }
    }

    startEvaluate(evaluator: Evaluator) {
        const context = evaluator.getCurrentContext();

        const right = evaluator.popValue(undefined);
        const left = evaluator.popValue(undefined);

        const fun = left
            .getType(context)
            .getDefinitionOfNameInScope(this.getOperator(), context);
        if (
            !(fun instanceof FunctionDefinition) ||
            !(fun.expression instanceof Expression)
        )
            return new FunctionException(
                evaluator,
                this,
                left,
                this.getOperator()
            );

        const operand = fun.inputs[0];
        if (!(operand instanceof Bind))
            return new UnparsableException(evaluator, operand);

        // Start the function's expression. Pass the source of the function.
        evaluator.startEvaluation(
            new Evaluation(
                evaluator,
                this,
                fun,
                left,
                new Map().set(operand.names, right)
            )
        );
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        // Return whatever was computed.
        return evaluator.popValue(undefined);
    }

    /**
     * Type checks narrow the set to the specified type, if contained in the set and if the check is on the same bind.
     * */
    evaluateTypeSet(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        // If conjunction, then we compute the intersection of the left and right's possible types.
        // Note that we pass the left's possible types because we don't evaluate the right if the left isn't true.
        if (this.operator.getText() === AND_SYMBOL) {
            const left = this.left.evaluateTypeSet(
                bind,
                original,
                current,
                context
            );
            const right = this.right.evaluateTypeSet(
                bind,
                original,
                left,
                context
            );
            return left.intersection(right, context);
        }
        // If disjunction of type checks, then we return the union.
        // Note that we pass the left's possible types because we don't evaluate the right if the left is true.
        else if (this.operator.getText() === OR_SYMBOL) {
            const left = this.left.evaluateTypeSet(
                bind,
                original,
                current,
                context
            );
            const right = this.right.evaluateTypeSet(
                bind,
                original,
                left,
                context
            );
            return left.union(right, context);
        }
        // Otherwise, just pass the types down and return the original types.
        else {
            this.left.evaluateTypeSet(bind, original, current, context);
            this.right.evaluateTypeSet(bind, original, current, context);
            return current;
        }
    }

    getChildPlaceholderLabel(
        child: Node,
        context: Context
    ): Translations | undefined {
        if (child === this.operator)
            return {
                '😀': TRANSLATE,
                eng: 'operator',
            };
        // If it's the right, find the name of the input.
        else if (child === this.right) {
            const fun = this.getFunction(context);
            if (fun) {
                const firstInput = fun.inputs[0];
                if (firstInput instanceof Bind)
                    return firstInput.names.getTranslations();
            }
        }
    }

    getDescriptions(context: Context): Translations {
        const descriptions: Translations = {
            '😀': TRANSLATE,
            eng: 'Evaluate an unknown function with two inputs.',
        };

        // Find the function on the left's type.
        const fun = this.getFunction(context);
        if (fun !== undefined && fun.docs) {
            for (const doc of fun.docs.docs) {
                const lang = doc.getLanguage();
                if (lang !== undefined)
                    descriptions[lang as LanguageCode] = doc.docs.getText();
            }
        }

        return descriptions;
    }

    getStart() {
        return this.operator;
    }
    getFinish() {
        return this.operator;
    }

    getStartExplanations(): Translations {
        return {
            '😀': TRANSLATE,
            eng: 'We first evaluate the left and right.',
        };
    }

    getFinishExplanations(): Translations {
        return {
            '😀': TRANSLATE,
            eng: 'We end by performing the operation on the left and right.',
        };
    }
}
