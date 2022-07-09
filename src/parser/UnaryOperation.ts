import type Conflict from "./Conflict";
import Expression from "./Expression";
import type Program from "./Program";
import type { Token } from "./Token";

export default class UnaryOperation extends Expression {

    readonly operator: Token;
    readonly value: Expression;

    constructor(operator: Token, value: Expression) {
        super();

        this.operator = operator;
        this.value = value;
    }

    getChildren() {
        return [ this.operator, this.value ];
    }

    getConflicts(program: Program): Conflict[] { return []; }

}