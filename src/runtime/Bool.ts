import Exception, { ExceptionType } from "./Exception";
import Value from "./Value";

export default class Bool extends Value {

    readonly bool: boolean;

    constructor(bool: boolean) {
        super();

        this.bool = bool;
    }

    toString() { return this.bool ? "⊤" : "⊥"; }

    evaluatePrefix(operator: string): Value {

        switch(operator) {
            case "¬": return new Bool(!this.bool)
            default: return new Exception(ExceptionType.UNKNOWN_OPERATOR);
        }

    }

    evaluateInfix(operator: string, operand: Value): Value {

        if(!(operand instanceof Bool))
            return new Exception(ExceptionType.INCOMPATIBLE_TYPE);

        switch(operator) {
            case "∧": return new Bool(this.bool && operand.bool);
            case "∨": return new Bool(this.bool || operand.bool);
            default: return new Exception(ExceptionType.UNKNOWN_OPERATOR);
        }

    }

}