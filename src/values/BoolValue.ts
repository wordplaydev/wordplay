import type LocaleText from '#locale/LocaleText.ts';
import getConceptName from '#locale/getConceptName.ts';
import BooleanType from '#nodes/BooleanType.ts';
import type UnaryEvaluate from '#nodes/UnaryEvaluate.ts';
import { FALSE_SYMBOL, NOT_SYMBOL, TRUE_SYMBOL } from '#parser/Symbols.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import type { BasisTypeName } from '#basis/BasisConstants.ts';
import type Expression from '#nodes/Expression.ts';
import type Value from '#values/Value.ts';
import FunctionException from '#values/FunctionException.ts';
import SimpleValue from '#values/SimpleValue.ts';

export default class BoolValue extends SimpleValue {
    readonly bool: boolean;

    constructor(creator: Expression, bool: boolean) {
        super(creator);

        this.bool = bool;
    }

    toWordplay() {
        return this.bool ? TRUE_SYMBOL : FALSE_SYMBOL;
    }

    getType() {
        return BooleanType.make();
    }

    getBasisTypeName(): BasisTypeName {
        return 'boolean';
    }

    and(requestor: Expression, value: BoolValue) {
        return new BoolValue(requestor, this.bool && value.bool);
    }
    or(requestor: Expression, value: BoolValue) {
        return new BoolValue(requestor, this.bool || value.bool);
    }
    not(requestor: Expression) {
        return new BoolValue(requestor, !this.bool);
    }

    evaluatePrefix(
        requestor: Expression,
        evaluator: Evaluator,
        op: UnaryEvaluate,
    ): Value {
        switch (op.getOperator()) {
            case '~':
            case NOT_SYMBOL:
                return this.not(requestor);
            default:
                return new FunctionException(evaluator, op, this, op.fun);
        }
    }

    isEqualTo(val: Value) {
        return val instanceof BoolValue && this.bool === val.bool;
    }

    getDescription() {
        return (l: LocaleText) => getConceptName(l, 'boolean');
    }

    getRepresentativeText() {
        return this.toWordplay();
    }

    getSize() {
        return 1;
    }
}
