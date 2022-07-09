import type Bind from "./Bind";
import Conflict from "./Conflict";
import type Docs from "./Docs";
import Expression from "./Expression";
import { SemanticConflict } from "./SemanticConflict";
import type Share from "./Share";
import type { Token } from "./Token";
import type Unparsable from "./Unparsable";

export default class Block extends Expression {

    readonly open?: Token | Unparsable;
    readonly statements: (Expression | Unparsable | Share | Bind)[];
    readonly close?: Token | Unparsable;
    readonly docs: Docs[];

    constructor(docs: Docs[], statements: (Expression | Unparsable | Share | Bind)[], open?: Token | Unparsable, close?: Token | Unparsable) {
        super();

        this.open = open;
        this.statements = statements.slice();
        this.close = close;
        this.docs = docs;
    }

    getChildren() {
        return [ ...this.docs, ...(this.open ? [ this.open ] : []), ...this.statements, ...(this.close ? [ this.close ] : [])];
    }

    getConflicts(): Conflict[] {

        // Blocks can't be empty
        if(this.statements.length === 0)
            return [ new Conflict(this, SemanticConflict.EXPECTED_BLOCK_EXPRESSION) ];

        // The last statement must be an expression.
        if(!(this.statements[this.statements.length  - 1] instanceof Expression))
            return [ new Conflict(this, SemanticConflict.EXPECTED_BLOCK_LAST_EXPRESSION) ];

        // None of the statements prior can be expressions.
        const ignoredExpression = this.statements.slice(0, this.statements.length - 1).find(s => s instanceof Expression);
        if(ignoredExpression !== undefined)
            return [ new Conflict(this, SemanticConflict.IGNORED_BLOCK_EXPRESSION) ];

        return [];
        
    }
    
}