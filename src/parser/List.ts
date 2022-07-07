import Expression from "./Expression";
import type { Token } from "./Token";

export default class List extends Expression {

    readonly open: Token;
    readonly values: Expression[];
    readonly close: Token;

    constructor(open: Token, values: Expression[], close: Token) {
        super();

        this.open = open;
        this.values = values.slice();
        this.close = close;
    }

    getChildren() {
        return [ this.open, ...this.values, this.close ];
    }

}