import type Bind from "./Bind";
import Block from "./Block";
import Conflict from "./Conflict";
import CustomType from "./CustomType";
import Expression from "./Expression";
import Function from "./Function";
import type Program from "./Program";
import { SemanticConflict } from "./SemanticConflict";
import type { Token } from "./Token";

export default class Name extends Expression {
    
    readonly name: Token;

    constructor(name: Token) {
        super();
        this.name = name;
    }

    getChildren() { return [ this.name ]; }

    getConflicts(program: Program): Conflict[] { 

        const bind = this.getBind(program);
        return bind === undefined ? [ new Conflict(this, SemanticConflict.UNDEFINED_NAME )] : [];
        
    }

    getBind(program: Program): Bind | undefined {

        // Ask the enclosing block for any matching names. It will recursively check the ancestors.
        const enclosure = program.getBindingEnclosureOf(this);
        if(enclosure instanceof Function)
            return enclosure.getDefinition(program, this.name.text);
        else if(enclosure instanceof Block) {
            const ancestors = program.getAncestorsOf(this);
            if(ancestors) {
                const enclosingBlockIndex = ancestors.indexOf(enclosure);
                const statement = enclosingBlockIndex === 0 ? this: ancestors[enclosingBlockIndex - 1];
                const index = enclosure.statements.indexOf(statement);
                return enclosure.getDefinition(program, index, this.name.text);
            }
        }
        else if(enclosure instanceof CustomType)
            return enclosure.getDefinition(program, this.name.text);

    }

}