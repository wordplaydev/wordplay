import type BinaryOperation from "../nodes/BinaryOperation";
import BooleanType from "../nodes/BooleanType";
import type UnaryOperation from "../nodes/UnaryOperation";
import Exception, { ExceptionKind } from "./Exception";
import Primitive from "./Primitive";
import type Value from "./Value";

export default class Bool extends Primitive {

    readonly bool: boolean;

    constructor(bool: boolean) {
        super();

        this.bool = bool;
    }

    toString() { return this.bool ? "⊤" : "⊥"; }

    getType() { return new BooleanType(); }
    getNativeTypeName(): string { return "boolean" }

    evaluatePrefix(op: UnaryOperation): Value {

        switch(op.getOperator()) {
            case "¬": return new Bool(!this.bool)
            default: return new Exception(op, ExceptionKind.UNKNOWN_OPERATOR);
        }

    }

    evaluateInfix(op: BinaryOperation, operand: Value): Value {

        if(!(operand instanceof Bool))
            return new Exception(op, ExceptionKind.EXPECTED_TYPE);

        switch(op.getOperator()) {
            case "∧": return new Bool(this.bool && operand.bool);
            case "∨": return new Bool(this.bool || operand.bool);
            default: return new Exception(op, ExceptionKind.UNKNOWN_OPERATOR);
        }

    }

}