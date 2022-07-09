import type Docs from "./Docs";
import Expression from "./Expression";
import type { Token } from "./Token";
import type Unparsable from "./Unparsable";


export default class Block extends Expression {

    readonly open?: Token | Unparsable;
    readonly expressions: (Expression|Unparsable)[];
    readonly close?: Token | Unparsable;
    readonly docs: Docs[];

    constructor(docs: Docs[], expressions: Expression[], open?: Token | Unparsable, close?: Token | Unparsable) {
        super();

        this.open = open;
        this.expressions = expressions.slice();
        this.close = close;
        this.docs = docs;
    }

    getChildren() {
        return [ ...this.docs, ...(this.open ? [ this.open ] : []), ...this.expressions, ...(this.close ? [ this.close ] : [])];
    }
    
}