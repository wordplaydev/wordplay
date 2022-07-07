import type Bind from "./Bind";
import Expression from "./Expression";
import type { Token } from "./Token";

export default class Evaluate extends Expression {

    readonly open: Token;
    readonly func: Expression;
    readonly values: (Bind|Expression)[];
    readonly close: Token;

    constructor(open: Token, subject: Expression, values: (Bind|Expression)[], close: Token) {
        super();

        this.open = open;
        this.func = subject;
        this.values = values.slice();
        this.close = close;
    }

    getChildren() {
        return [ this.func, this.open, ...this.values, this.close ];
    }

}