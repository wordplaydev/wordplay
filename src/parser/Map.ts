import type Bind from "./Bind";
import Expression from "./Expression";
import type { Token } from "./Token";
import type Unparsable from "./Unparsable";

export default class Map extends Expression {

    readonly open: Token;
    readonly bindings: (Unparsable|Bind)[];
    readonly close: Token;

    constructor(open: Token, bindings: (Unparsable|Bind)[], close: Token) {
        super();

        this.open = open;
        this.bindings = bindings.slice();
        this.close = close;
    }

    getChildren() {
        return [ this.open, ...this.bindings, this.close ];
    }

    toWordplay(): string {
        return `${this.open.toWordplay()}${this.open.toWordplay()}${this.bindings.map(b => b.toWordplay()).join(' ')}${this.close.toWordplay()}`;
    }

}