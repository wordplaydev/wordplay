import type Expression from "../nodes/Expression";
import type Type from "../nodes/Type";
import Conflict from "./Conflict";


export class UnknownConversion extends Conflict {
    readonly expr: Expression;
    readonly expectedType: Type;
    constructor(expr: Expression, expectedType: Type) {
        super(false);
        this.expr = expr;
        this.expectedType = expectedType;
    }
}
