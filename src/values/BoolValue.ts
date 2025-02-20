import BooleanType from '@nodes/BooleanType';
import type UnaryEvaluate from '@nodes/UnaryEvaluate';
import { FALSE_SYMBOL, NOT_SYMBOL, TRUE_SYMBOL } from '@parser/Symbols';
import type Evaluator from '@runtime/Evaluator';
import type { BasisTypeName } from '../basis/BasisConstants';
import type Locales from '../locale/Locales';
import type Expression from '../nodes/Expression';
import type Value from '../values/Value';
import FunctionException from './FunctionException';
import SimpleValue from './SimpleValue';

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

    getDescription(locales: Locales) {
        return locales.concretize((l) => l.term.boolean);
    }

    getRepresentativeText() {
        return this.toWordplay();
    }

    getSize() {
        return 1;
    }
}
