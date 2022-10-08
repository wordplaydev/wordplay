import { BOOLEAN_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import BooleanType from "../nodes/BooleanType";
import type UnaryOperation from "../nodes/UnaryOperation";
import { FALSE_SYMBOL, NOT_SYMBOL, TRUE_SYMBOL } from "../parser/Tokenizer";
import type Evaluator from "./Evaluator";
import FunctionException from "./FunctionException";
import Primitive from "./Primitive";
import type Value from "./Value";

export default class Bool extends Primitive {

    readonly bool: boolean;

    constructor(bool: boolean) {
        super();

        this.bool = bool;
    }

    toString() { return this.bool ? TRUE_SYMBOL : FALSE_SYMBOL; }

    getType() { return new BooleanType(); }
    
    getNativeTypeName(): string { return BOOLEAN_NATIVE_TYPE_NAME }

    and(value: Bool) { return new Bool(this.bool && value.bool); }
    or(value: Bool) { return new Bool(this.bool || value.bool); }
    not() { return new Bool(!this.bool); }

    evaluatePrefix(evaluator: Evaluator, op: UnaryOperation): Value {

        switch(op.getOperator()) {
            case "~":
            case NOT_SYMBOL: return this.not();
            default: return new FunctionException(evaluator, op, this, op.getOperator());
        }

    }

    isEqualTo(val: Value) { return val instanceof Bool && this.bool === val.bool; }

}