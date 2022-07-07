import Expression from "./Expression";
import type { Token } from "./Token";

export class Conditional extends Expression {
    
    readonly condition: Expression;
    readonly conditional: Token;
    readonly yes: Expression;
    readonly no: Expression;

    constructor(condition: Expression, conditional: Token, yes: Expression, no: Expression) {
        super();

        this.condition = condition;
        this.conditional = conditional;
        this.yes = yes;
        this.no = no;

    }

    getChildren() { return [ this.condition, this.conditional, this.yes, this.no ]; }

}