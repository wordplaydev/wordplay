import type Conflict from '@conflicts/Conflict';
import Expression from './Expression';
import Token from './Token';
import type Type from './Type';
import type Evaluator from '@runtime/Evaluator';
import type Step from '@runtime/Step';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Context from './Context';
import type Bind from './Bind';
import { NEGATE_SYMBOL, NOT_SYMBOL } from '@parser/Symbols';
import type TypeSet from './TypeSet';
import FunctionException from '@runtime/FunctionException';
import FunctionDefinition from './FunctionDefinition';
import Evaluation from '@runtime/Evaluation';
import getConcreteExpectedType from './Generics';
import type Value from '@runtime/Value';
import UnknownNameType from './UnknownNameType';
import type { Replacement } from './Node';
import type Locale from '@locale/Locale';
import StartEvaluation from '@runtime/StartEvaluation';
import NodeRef from '@locale/NodeRef';
import Emotion from '../lore/Emotion';
import FunctionValue from '../runtime/FunctionValue';
import IncompatibleInput from '../conflicts/IncompatibleInput';
import AnyType from './AnyType';
import FunctionType from './FunctionType';
import concretize from '../locale/concretize';

export default class UnaryEvaluate extends Expression {
    readonly operator: Token;
    readonly operand: Expression;

    constructor(operator: Token, operand: Expression) {
        super();

        this.operator = operator;
        this.operand = operand;

        this.computeChildren();
    }

    getGrammar() {
        return [
            { name: 'operator', types: [Token] },
            { name: 'operand', types: [Expression] },
        ];
    }

    clone(replace?: Replacement) {
        return new UnaryEvaluate(
            this.replaceChild('operator', this.operator, replace),
            this.replaceChild('operand', this.operand, replace)
        ) as this;
    }

    getOperator() {
        return this.operator.text.toString();
    }

    isNegation() {
        return this.getOperator() === NEGATE_SYMBOL;
    }

    getFunction(context: Context) {
        // Find the function on the left's type.
        const expressionType =
            this.operand instanceof Expression
                ? this.operand.getType(context)
                : undefined;
        const fun = expressionType?.getDefinitionOfNameInScope(
            this.getOperator(),
            context
        );
        return fun instanceof FunctionDefinition ? fun : undefined;
    }

    computeConflicts(context: Context): Conflict[] {
        const conflicts = [];

        // Find the function on the left's type.
        const fun = this.getFunction(context);

        // Did we find nothing?
        if (fun === undefined)
            conflicts.push(
                new IncompatibleInput(
                    this.operator,
                    this.operand.getType(context),
                    FunctionType.make(undefined, [], new AnyType())
                )
            );

        return conflicts;
    }

    computeType(context: Context): Type {
        const fun = this.getFunction(context);
        return fun !== undefined
            ? getConcreteExpectedType(fun, undefined, this, context)
            : new UnknownNameType(
                  this,
                  this.operator,
                  this.operand.getType(context)
              );
    }

    getDependencies(context: Context): Expression[] {
        const fun = this.getFunction(context);
        return [
            this.operand,
            ...(fun === undefined || fun.expression === undefined
                ? []
                : [fun.expression]),
        ];
    }

    compile(context: Context): Step[] {
        return [
            new Start(this),
            ...this.operand.compile(context),
            new StartEvaluation(this),
            new Finish(this),
        ];
    }

    startEvaluation(evaluator: Evaluator) {
        // Get the value of the operand.
        const value = evaluator.popValue(this);

        // Resolve the function on the value.
        const fun = value.resolve(this.getOperator(), evaluator);

        if (
            !(fun instanceof FunctionValue) ||
            fun.definition.expression === undefined
        )
            return new FunctionException(evaluator, this, value, this.operator);

        // Start the function's expression.
        evaluator.startEvaluation(
            new Evaluation(evaluator, this, fun.definition, value, new Map())
        );
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        // Return the value computed
        return evaluator.popValue(this);
    }

    /**
     * Logical negations take the set complement of the current set from the original.
     * */
    evaluateTypeSet(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        // We only manipulate possible types for logical negation operators.
        if (this.operator.getText() !== NOT_SYMBOL) return current;

        // Get the possible types of the operand.
        const possible = this.operand.evaluateTypeSet(
            bind,
            original,
            current,
            context
        );

        // Return the difference between the original types and the possible types,
        return original.difference(possible, context);
    }

    getStart() {
        return this.operator;
    }
    getFinish() {
        return this.operator;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.UnaryEvaluate;
    }

    getStartExplanations(locale: Locale, context: Context) {
        return concretize(
            locale,
            locale.node.UnaryEvaluate.start,
            new NodeRef(this.operand, locale, context)
        );
    }

    getFinishExplanations(
        locale: Locale,
        context: Context,
        evaluator: Evaluator
    ) {
        return concretize(
            locale,
            locale.node.UnaryEvaluate.finish,
            this.getValueIfDefined(locale, context, evaluator)
        );
    }

    getGlyphs() {
        return {
            symbols: this.operator.getText(),
            emotion: Emotion.kind,
        };
    }
}
