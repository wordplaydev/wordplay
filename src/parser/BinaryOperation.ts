import Expression from "./Expression";
import type { Token } from "./Token";

export default class BinaryOperation extends Expression {

    readonly operator: Token;
    readonly left: Expression;
    readonly right: Expression;

    constructor(operator: Token, left: Expression, right: Expression) {
        super();

        this.operator = operator;
        this.left = left;
        this.right = right;
    }

    getChildren() {
        return [ this.left, this.operator, this.right ];
    }

    toWordplay(): string {
        return `${this.left.toWordplay()}${this.operator.toWordplay()}${this.right.toWordplay()}`;
    }

}