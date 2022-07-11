import type Bind from "./Bind";
import Block from "./Block";
import Conflict from "./Conflict";
import CustomType from "./CustomType";
import Expression from "./Expression";
import Function from "./Function";
import type Program from "./Program";
import { SemanticConflict } from "./SemanticConflict";
import type Share from "./Share";
import type { Token } from "./Token";
import type Type from "./Type";
import UnknownType from "./UnknownType";

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
        return program.getBindingEnclosureOf(this)?.getDefinition(program, this, this.name.text);

    }

    getType(program: Program): Type {
        // The type is the type of the bind.
        const bind = this.getBind(program);
        if(bind === undefined) return new UnknownType(this);
        else return bind.getType(program);        
    }

}