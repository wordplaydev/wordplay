import { BOOLEAN_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import type BinaryOperation from "../nodes/BinaryOperation";
import BooleanType from "../nodes/BooleanType";
import type UnaryOperation from "../nodes/UnaryOperation";
import { AND_SYMBOL, FALSE_SYMBOL, NOT_SYMBOL, OR_SYMBOL, TRUE_SYMBOL } from "../parser/Tokenizer";
import Exception, { ExceptionKind } from "./Exception";
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

    evaluatePrefix(op: UnaryOperation): Value {

        switch(op.getOperator()) {
            case "~":
            case NOT_SYMBOL: return new Bool(!this.bool)
            default: return new Exception(op, ExceptionKind.UNKNOWN_OPERATOR);
        }

    }

    evaluateInfix(op: BinaryOperation, operand: Value): Value {

        if(!(operand instanceof Bool))
            return new Exception(op, ExceptionKind.EXPECTED_TYPE);

        switch(op.getOperator()) {
            case AND_SYMBOL: return new Bool(this.bool && operand.bool);
            case OR_SYMBOL: return new Bool(this.bool || operand.bool);
            default: return new Exception(op, ExceptionKind.UNKNOWN_OPERATOR);
        }

    }

}