import Expression from "./Expression";
import type KeyValue from "./KeyValue";
import type { Token } from "./Token";

export default class Set extends Expression {

    readonly open: Token;
    readonly values: Expression[] | KeyValue[];
    readonly close: Token;

    constructor(open: Token, values: Expression[] | KeyValue[], close: Token) {
        super();

        this.open = open;
        this.values = values.slice();
        this.close = close;
    }

    getChildren() {
        return [ this.open, ...this.values, this.close ];
    }

    toWordplay(): string {
        return `${this.open.toWordplay()}${this.values.map(s => s.toWordplay()).join(' ')}${this.close.toWordplay()}`;
    }

}