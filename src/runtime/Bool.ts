import { BOOLEAN_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import BooleanType from "../nodes/BooleanType";
import type UnaryOperation from "../nodes/UnaryOperation";
import { FALSE_SYMBOL, NOT_SYMBOL, TRUE_SYMBOL } from "../parser/Tokenizer";
import type Evaluator from "./Evaluator";
import FunctionException from "./FunctionException";
import Primitive from "./Primitive";
import type Value from "./Value";
import type Node from "../nodes/Node";

export default class Bool extends Primitive {

    readonly bool: boolean;

    constructor(creator: Node, bool: boolean) {
        super(creator);

        this.bool = bool;
    }

    toString() { return this.bool ? TRUE_SYMBOL : FALSE_SYMBOL; }

    getType() { return new BooleanType(); }
    
    getNativeTypeName(): string { return BOOLEAN_NATIVE_TYPE_NAME }

    and(requestor: Node, value: Bool) { return new Bool(requestor, this.bool && value.bool); }
    or(requestor: Node, value: Bool) { return new Bool(requestor, this.bool || value.bool); }
    not(requestor: Node) { return new Bool(requestor, !this.bool); }

    evaluatePrefix(requestor: Node, evaluator: Evaluator, op: UnaryOperation): Value {

        switch(op.getOperator()) {
            case "~":
            case NOT_SYMBOL: return this.not(requestor);
            default: return new FunctionException(evaluator, op, this, op.getOperator());
        }

    }

    isEqualTo(val: Value) { return val instanceof Bool && this.bool === val.bool; }

}