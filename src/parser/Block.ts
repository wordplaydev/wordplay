import Expression from "./Expression";
import type { Token } from "./Token";
import type Unparsable from "./Unparsable";


export default class Block extends Expression {

    readonly open?: Token | Unparsable;
    readonly statements: (Expression|Unparsable)[];
    readonly close?: Token | Unparsable;
    readonly docs?: Token;

    constructor(statements: Expression[], open?: Token | Unparsable, close?: Token | Unparsable, docs?: Token) {
        super();

        this.open = open;
        this.statements = statements.slice();
        this.close = close;
        this.docs = docs;
    }

    getChildren() {
        return [ ...(this.docs ? [ this.docs] : []), ...(this.open ? [ this.open ] : []), ...this.statements, ...(this.close ? [ this.close ] : [])];
    }
    
}