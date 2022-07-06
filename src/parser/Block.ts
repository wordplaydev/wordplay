import Expression from "./Expression";
import type { Token } from "./Token";
import type Unparsable from "./Unparsable";


export default class Block extends Expression {

    readonly open?: Token | Unparsable;
    readonly statements: (Expression|Unparsable)[];
    readonly close?: Token | Unparsable;

    constructor(statements: Expression[], open?: Token | Unparsable, close?: Token | Unparsable) {
        super();

        this.open = open;
        this.statements = statements.slice();
        this.close = close;
    }

    getChildren() {
        return [ ...(this.open ? [ this.open ] : []), ...this.statements, ...(this.close ? [ this.close ] : [])];
    }

    toWordplay(): string {
        return `${this.open ? this.open.toWordplay() : ""}${this.statements.map(s => s.toWordplay()).join('\n')}${this.close ? this.close.toWordplay() : ""}`;
    }

}