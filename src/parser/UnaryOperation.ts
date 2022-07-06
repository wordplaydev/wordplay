import type Bind from "./Bind";
import Expression from "./Expression";
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

    toWordplay(): string {
        return `${this.operator.toWordplay()}${this.value.toWordplay()}`;
    }

}