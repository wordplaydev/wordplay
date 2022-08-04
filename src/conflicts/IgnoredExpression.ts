import type Expression from "../nodes/Expression";
import Conflict from "./Conflict";


export class IgnoredExpression extends Conflict {
    readonly expr: Expression;
    constructor(expr: Expression) {
        super(false);
        this.expr = expr;
    }
}
