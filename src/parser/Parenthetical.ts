import type { Token } from "./Token";
import { ErrorMessage } from "./Parser"
import Expression from "./Expression";

export default class Parenthetical extends Expression {
    
    readonly open: Token;
    readonly value: Expression;
    readonly close: Token;

    constructor(open: Token, value: Expression, close: Token) {
        super();

        this.open = open;
        this.value = value;
        this.close = close;
    }

    getChildren() { return [ this.open, this.value, this.close ]; }

}