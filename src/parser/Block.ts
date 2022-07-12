import type Node from "./Node";
import Bind from "./Bind";
import Conflict from "./Conflict";
import type Docs from "./Docs";
import Expression from "./Expression";
import type Program from "./Program";
import { SemanticConflict } from "./SemanticConflict";
import Share from "./Share";
import type { Token } from "./Token";
import type Type from "./Type";
import UnknownType from "./UnknownType";
import type Unparsable from "./Unparsable";
import { docsAreUnique } from "./util";
import type TypeVariable from "./TypeVariable";

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

    getConflicts(program: Program): Conflict[] {

        const conflicts = [];

        // Blocks can't be empty
        if(this.statements.length === 0)
            conflicts.push(new Conflict(this, SemanticConflict.EXPECTED_BLOCK_EXPRESSION));
        // And if they aren't empty, the last statement must be an expression.
        else if(!(this.statements[this.statements.length  - 1] instanceof Expression))
            conflicts.push(new Conflict(this, SemanticConflict.EXPECTED_BLOCK_LAST_EXPRESSION));

        // The only expression allowed is the last one.
        this.statements
            .slice(0, this.statements.length - 1)
            .filter(s => s instanceof Expression)
            .forEach(s => conflicts.push(new Conflict(s, SemanticConflict.IGNORED_BLOCK_EXPRESSION)));

        // Docs must be unique.
        if(!docsAreUnique(this.docs))
            conflicts.push(new Conflict(this, SemanticConflict.DOC_LANGUAGES_ARENT_UNIQUE))

        // All binds must have values.
        if(!this.statements.every(s => !(s instanceof Bind) || s.value !== undefined))
            conflicts.push(new Conflict(this, SemanticConflict.BINDS_MISSING_VALUES))

        return conflicts;
        
    }

    /** Given the index in this block and the given name, binds the bind that declares it, if there is one. */
    getDefinition(program: Program, node: Node, name: string): Bind | TypeVariable | undefined {

        const containingStatement = this.statements.find(s => s.contains(node));
        if(containingStatement === undefined) return;
        const index = this.statements.indexOf(containingStatement);
        if(index < 0) return;

        // Do any of the binds declare it?
        const localBind = this.statements.find((s, i)  => 
            (s instanceof Bind && i < index && s.names.find(n => n.name.text == name) !== undefined) ||
            (s instanceof Share && i < index && s.bind instanceof Bind && s.bind.names.find(n => n.name.text == name) !== undefined)
        ) as Bind;
        if(localBind !== undefined) return localBind;

        // Is there an enclosing function or block?
        return program.getBindingEnclosureOf(this)?.getDefinition(program, node, name);
        
    }
 
    getType(program: Program): Type {
        // The type of the last expression.
        const lastExpression = this.statements.slice().reverse().find(s => s instanceof Expression) as Expression | undefined;
        return lastExpression === undefined ? new UnknownType(this) : lastExpression.getType(program);
    }

}