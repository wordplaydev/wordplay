import Bind from "./Bind";
import Conflict from "./Conflict";
import CustomType from "./CustomType";
import type Docs from "./Docs";
import Expression from "./Expression";
import Function from "./Function";
import type Program from "./Program";
import { SemanticConflict } from "./SemanticConflict";
import Share from "./Share";
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

        const conflicts = [];

        // Blocks can't be empty
        if(this.statements.length === 0)
            conflicts.push(new Conflict(this, SemanticConflict.EXPECTED_BLOCK_EXPRESSION));
        // The last statement must be an expression.
        else if(!(this.statements[this.statements.length  - 1] instanceof Expression))
            conflicts.push(new Conflict(this, SemanticConflict.EXPECTED_BLOCK_LAST_EXPRESSION));

        // None of the statements prior can be expressions.
        this.statements
            .slice(0, this.statements.length - 1)
            .filter(s => s instanceof Expression)
            .forEach(s => conflicts.push(new Conflict(s, SemanticConflict.IGNORED_BLOCK_EXPRESSION)));

        // Docs must be unique.
        if(!this.docs.every(d1 => this.docs.find(d2 => d1 !== d2 && d1.lang?.text === d2.lang?.text) === undefined))
            conflicts.push(new Conflict(this, SemanticConflict.DOC_LANGUAGES_ARENT_UNIQUE))

        return conflicts;
        
    }

    /** Given the index in this block and the given name, binds the bind that declares it, if there is one. */
    getDefinition(program: Program, index: number, name: string): Bind | undefined {

        // Do any of the binds declare it?
        const localBind = this.statements.find((s, i)  => 
            (s instanceof Bind && i < index && s.names.find(n => n.name.text == name) !== undefined) ||
            (s instanceof Share && i < index && s.bind instanceof Bind && s.bind.names.find(n => n.name.text == name) !== undefined)
        ) as Bind;
        if(localBind !== undefined) return localBind;

        // Is there an enclosing function or block?
        const enclosure = program.getAncestorsOf(this)?.find(a => a instanceof Block || a instanceof Function || a instanceof CustomType) as Block | Function | CustomType;
        if(enclosure instanceof Function) 
            return enclosure.getDefinition(program, name);
        else if(enclosure instanceof Block) {
            const ancestors = program.getAncestorsOf(this);
            if(ancestors) {
                const enclosingBlockIndex = ancestors.indexOf(enclosure);
                const statement = enclosingBlockIndex === 0 ? this: ancestors[enclosingBlockIndex - 1];
                const index = enclosure.statements.indexOf(statement);
                return enclosure.getDefinition(program, index, name);
            }
            return enclosure.getDefinition(program, enclosure.statements.length, name);
        }
        else if(enclosure instanceof CustomType)
            return enclosure.getDefinition(program, name);
        
    }
    
}