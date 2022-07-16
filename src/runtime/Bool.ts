import Exception, { ExceptionType } from "./Exception";
import Value from "./Value";

export default class Bool extends Value {

    readonly bool: boolean;

    constructor(bool: boolean) {
        super();

        this.bool = bool;
    }

    toString() { return this.bool ? "⊤" : "⊥"; }

    evaluate(operator: string, right: Value): Value {

        switch(operator) {
            case "∧":
                return right instanceof Bool ?
                    new Bool(this.bool && right.bool) :
                    new Exception(ExceptionType.INCOMPATIBLE_TYPE);
            case "∨":
                return right instanceof Bool ?
                    new Bool(this.bool || right.bool) :
                    new Exception(ExceptionType.INCOMPATIBLE_TYPE);
            default:
                return new Exception(ExceptionType.UNKNOWN_OPERATOR);
        }

    }

}