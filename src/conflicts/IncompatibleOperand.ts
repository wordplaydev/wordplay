import type Expression from "../nodes/Expression";
import type Type from "../nodes/Type";
import Conflict from "./Conflict";


export class IncompatibleOperand extends Conflict {
    readonly expr: Expression;
    readonly receivedType: Type | undefined;
    readonly expectedType: Type;
    constructor(expr: Expression, receivedType: Type | undefined, expectedType: Type) {
        super(false);
        this.expr = expr;
        this.receivedType = receivedType;
        this.expectedType = expectedType;
    }

    toString() {
        return `${super.toString()} ${this.expr.toWordplay().trim()}: received ${this.receivedType?.toWordplay()}, expected ${this.expectedType.toWordplay()}`;
    }
}
