import Expression from "./Expression";
import type { Token } from "./Token";

export default class ListAccess extends Expression {

    readonly list: Expression;
    readonly open: Token;
    readonly index: Expression;
    readonly close: Token;

    constructor(list: Expression, open: Token, index: Expression, close: Token) {
        super();

        this.list = list;
        this.open = open;
        this.index = index;
        this.close = close;
    }

    getChildren() {
        return [ this.list, this.open, this.index, this.close ];
    }

    toWordplay(): string {
        return this.getChildren().map(c => c.toWordplay()).join("");
    }

}